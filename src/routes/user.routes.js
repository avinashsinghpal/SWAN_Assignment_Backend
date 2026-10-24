/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (ADMIN only)
 */

import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, requireRole('ADMIN'));

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (ADMIN only)
 */
router.get('/', userController.listUsers);

export default router;
