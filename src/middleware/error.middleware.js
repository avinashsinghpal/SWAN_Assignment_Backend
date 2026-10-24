/**
 * Central error-handling middleware.
 *
 * Catches all errors forwarded via next(err) and maps them to the
 * standard API error response envelope:
 * { success: false, error: { code, message, details } }
 *
 * Handles:
 * - AppError (our custom class)
 * - Mongoose ValidationError  -> 422
 * - Mongoose CastError        -> 400 (invalid ObjectId)
 * - Mongoose duplicate key    -> 409
 * - JWT errors                -> 401
 * - Everything else           -> 500
 *
 * Stack traces are only included in development mode.
 */

import { AppError } from '../utils/appError.js';
import { IS_PRODUCTION } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, _next) {
  // Log the error with request context (no sensitive data - logger sanitises)
  logger.error(err.message, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    stack: IS_PRODUCTION ? undefined : err.stack,
  });

  // ── Mongoose ValidationError ───────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
  }

  // ── Mongoose CastError (invalid ObjectId) ─────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid value for field: ${err.path}`,
        details: [],
      },
    });
  }

  // ── MongoDB duplicate key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: `A record with this ${field} already exists.`,
        details: [],
      },
    });
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token.', details: [] },
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please log in again.', details: [] },
    });
  }

  // ── Our AppError ──────────────────────────────────────────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
      },
    });
  }

  // ── Unhandled / unexpected error ──────────────────────────────────────────
  const response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: IS_PRODUCTION ? 'An unexpected error occurred.' : err.message,
      details: [],
    },
  };
  if (!IS_PRODUCTION) {
    response.error.stack = err.stack;
  }
  return res.status(500).json(response);
}

/**
 * Catch-all for routes that don't match any defined route.
 * @type {import('express').RequestHandler}
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`,
      details: [],
    },
  });
}
