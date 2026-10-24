/**
 * Custom application error class.
 * Extends the native Error so it can be thrown with an HTTP status code,
 * a machine-readable error code, and optional details (e.g., validation issues).
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable message sent to the client
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, ...)
   * @param {string} [code] - Machine-readable error code (e.g. VALIDATION_ERROR)
   * @param {unknown[]} [details] - Optional array of detail objects (e.g. Zod issues)
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Capture a clean stack trace excluding this constructor frame
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps an async route handler to forward any thrown errors to Express next().
 * Eliminates the need for repetitive try/catch in every controller.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>} fn
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
