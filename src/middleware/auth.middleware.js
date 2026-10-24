/**
 * Authentication middleware.
 * Reads the JWT from the httpOnly cookie, verifies it, loads the user,
 * and attaches it to req.user.
 *
 * A separate requireRole middleware enforces role-based access control.
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/appError.js';
import { JWT_SECRET } from '../config/index.js';

/**
 * Verify the JWT and load the authenticated user onto req.user.
 * Returns 401 if no token, invalid token, or user not found.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  // Read token from httpOnly cookie
  const token = req.cookies?.token;

  if (!token) {
    throw new AppError('Not authenticated. Please log in.', 401, 'UNAUTHENTICATED');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user || !user.isActive) {
    throw new AppError('User no longer exists or has been deactivated.', 401, 'UNAUTHENTICATED');
  }

  req.user = user;
  next();
});

/**
 * Role-based access control middleware.
 * Must be used after protect().
 *
 * @param {...string} roles - Allowed roles (e.g. 'ADMIN')
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
}
