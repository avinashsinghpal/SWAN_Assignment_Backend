/**
 * AuthService
 *
 * Business logic for authentication. Controllers call this service;
 * the service interacts with models and returns plain data or throws AppError.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_SECURE,
  COOKIE_SAME_SITE,
  COOKIE_MAX_AGE_MS,
} from '../config/index.js';

const BCRYPT_ROUNDS = 12;

/**
 * Build the JWT cookie options object.
 * @returns {import('express').CookieOptions}
 */
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

/**
 * Sign a JWT for the given user id.
 * @param {string} userId
 * @returns {string}
 */
function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Register a new user.
 * The first registered user in the system receives the ADMIN role.
 *
 * @param {{ name: string, email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function register(data) {
  const { name, email, password } = data;

  // Check for existing user (duplicate email handled by unique index -> 409 in error handler,
  // but we check explicitly to give a cleaner message)
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
  }

  // The first user becomes ADMIN
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? 'ADMIN' : 'SALES';

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({ name, email, password: hashedPassword, role });

  const token = signToken(user._id.toString());
  return { user, token };
}

/**
 * Authenticate a user with email and password.
 *
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(data) {
  const { email, password } = data;

  // Load user with password (select:false requires explicit selection)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    // Use a generic message to avoid email enumeration attacks
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const token = signToken(user._id.toString());

  // Remove password from the returned user object
  const userObj = user.toJSON();

  return { user: userObj, token };
}

/**
 * Change a user's password after verifying the current one.
 *
 * @param {string} userId
 * @param {{ currentPassword: string, newPassword: string }} data
 * @returns {Promise<void>}
 */
export async function changePassword(userId, data) {
  const { currentPassword, newPassword } = data;

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
  }

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
}

/**
 * Update a user's profile (name only for now).
 *
 * @param {string} userId
 * @param {{ name?: string }} data
 * @returns {Promise<object>}
 */
export async function updateProfile(userId, data) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }
  return user;
}
