/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';
import rateLimit from 'express-rate-limit';
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS, NODE_ENV } from '../config/index.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: [],
    },
  },
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, confirmPassword]
 *             properties:
 *               name: { type: string, example: "Jane Smith" }
 *               email: { type: string, format: email, example: "jane@example.com" }
 *               password: { type: string, example: "SecurePass1" }
 *               confirmPassword: { type: string, example: "SecurePass1" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (clears auth cookie)
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /auth/password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change password
 */
router.patch(
  '/password',
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Update profile (name)
 */
router.patch(
  '/profile',
  protect,
  validate(updateProfileSchema),
  authController.updateProfile
);

export default router;
