/**
 * @swagger
 * tags:
 *   name: Leads
 *   description: Lead management endpoints
 */

import { Router } from 'express';
import * as leadController from '../controllers/lead.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createLeadSchema,
  updateLeadSchema,
  statusUpdateSchema,
  leadQuerySchema,
  objectIdParamSchema,
} from '../validators/lead.validator.js';

const router = Router();

// All lead routes require authentication
router.use(protect);

/**
 * @swagger
 * /leads/export:
 *   get:
 *     tags: [Leads]
 *     summary: Export filtered leads as CSV
 *     description: Respects role scoping. Supports the same filter params as GET /leads.
 */
// NOTE: /export must be declared BEFORE /:id to avoid matching "export" as an ObjectId param
router.get('/export', validate(leadQuerySchema, 'query'), leadController.exportLeads);

/**
 * @swagger
 * /leads:
 *   get:
 *     tags: [Leads]
 *     summary: List leads with search, filter, sort, and pagination
 *   post:
 *     tags: [Leads]
 *     summary: Create a new lead
 */
router
  .route('/')
  .get(validate(leadQuerySchema, 'query'), leadController.listLeads)
  .post(validate(createLeadSchema), leadController.createLead);

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     tags: [Leads]
 *     summary: Get a lead by ID
 *   put:
 *     tags: [Leads]
 *     summary: Update a lead
 *   delete:
 *     tags: [Leads]
 *     summary: Delete a lead
 */
router
  .route('/:id')
  .get(validate(objectIdParamSchema, 'params'), leadController.getLead)
  .put(
    validate(objectIdParamSchema, 'params'),
    validate(updateLeadSchema),
    leadController.updateLead
  )
  .delete(validate(objectIdParamSchema, 'params'), leadController.deleteLead);

/**
 * @swagger
 * /leads/{id}/status:
 *   patch:
 *     tags: [Leads]
 *     summary: Update lead status only
 */
router.patch(
  '/:id/status',
  validate(objectIdParamSchema, 'params'),
  validate(statusUpdateSchema),
  leadController.updateLeadStatus
);

/**
 * @swagger
 * /leads/{id}/activities:
 *   get:
 *     tags: [Leads]
 *     summary: Get activity timeline for a lead
 */
router.get(
  '/:id/activities',
  validate(objectIdParamSchema, 'params'),
  leadController.getLeadActivities
);

export default router;
