/**
 * AuthController
 * Thin controllers that delegate to AuthService and send the response.
 */

import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/appError.js';
import { successResponse } from '../utils/helpers.js';

/**
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.cookie('token', token, authService.cookieOptions());
  res.status(201).json(successResponse(user));
});

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.cookie('token', token, authService.cookieOptions());
  res.status(200).json(successResponse(user));
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.status(200).json(successResponse({ message: 'Logged out successfully.' }));
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse(req.user));
});

/**
 * PATCH /api/v1/auth/password
 */
export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id.toString(), req.body);
  res.status(200).json(successResponse({ message: 'Password updated successfully.' }));
});

/**
 * PATCH /api/v1/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id.toString(), req.body);
  res.status(200).json(successResponse(user));
});
