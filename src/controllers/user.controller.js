/**
 * UsersController - ADMIN only endpoints
 */

import User from '../models/User.js';
import { asyncHandler } from '../utils/appError.js';
import { successResponse } from '../utils/helpers.js';

/**
 * GET /api/v1/users
 * Returns all users (ADMIN only). Password is never included.
 */
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  res.status(200).json(successResponse(users));
});
