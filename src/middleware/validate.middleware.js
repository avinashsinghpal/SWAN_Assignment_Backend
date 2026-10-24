/**
 * Middleware factory that validates request data against a Zod schema.
 * Target can be 'body', 'query', or 'params'.
 * On success, replaces the target with the parsed (and transformed) value.
 * On failure, formats Zod issues into the standard API error shape.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} target
 * @returns {import('express').RequestHandler}
 */

import { ZodError } from 'zod';
import { AppError } from '../utils/appError.js';

export function validate(schema, target = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.errors.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError('Validation failed', 422, 'VALIDATION_ERROR', details));
    }
    // Replace target with parsed + transformed value
    req[target] = result.data;
    next();
  };
}
