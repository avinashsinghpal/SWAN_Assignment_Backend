/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard aggregation endpoints
 */

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/stats', dashboardController.getStats);
router.get('/trends', dashboardController.getTrends);
router.get('/services', dashboardController.getServices);
router.get('/follow-ups', dashboardController.getFollowUps);
router.get('/recent-leads', dashboardController.getRecentLeads);

export default router;
