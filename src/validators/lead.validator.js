/**
 * Zod schemas for lead request validation.
 */

import { z } from 'zod';
import { LEAD_STATUSES, LEAD_SERVICES } from '../models/Lead.js';

export const createLeadSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name must be at most 150 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone must be at most 30 characters')
    .optional()
    .or(z.literal('')),
  company: z
    .string()
    .trim()
    .max(150, 'Company name must be at most 150 characters')
    .optional()
    .or(z.literal('')),
  serviceInterested: z.enum(LEAD_SERVICES, {
    required_error: 'Service interested is required',
    invalid_type_error: `Service must be one of: ${LEAD_SERVICES.join(', ')}`,
  }),
  status: z
    .enum(LEAD_STATUSES, {
      invalid_type_error: `Status must be one of: ${LEAD_STATUSES.join(', ')}`,
    })
    .optional()
    .default('New'),
  followUpDate: z
    .string()
    .datetime({ message: 'Follow-up date must be a valid ISO date' })
    .optional()
    .or(z.literal(''))
    .or(z.null())
    .transform((v) => (v ? new Date(v) : undefined)),
  notes: z
    .string()
    .max(5000, 'Notes must be at most 5000 characters')
    .optional()
    .or(z.literal('')),
  assignedTo: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'assignedTo must be a valid ObjectId')
    .optional()
    .or(z.literal(''))
    .or(z.null())
    .transform((v) => v || undefined),
});

export const updateLeadSchema = createLeadSchema.partial();

export const statusUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES, {
    required_error: 'Status is required',
    invalid_type_error: `Status must be one of: ${LEAD_STATUSES.join(', ')}`,
  }),
});

export const leadQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().optional(), // comma-separated statuses
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'name', 'followUpDate', 'updatedAt'])
    .optional()
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v || '1', 10))),
  pageSize: z
    .string()
    .optional()
    .transform((v) => {
      const size = parseInt(v || '10', 10);
      return [10, 25, 50].includes(size) ? size : 10;
    }),
});

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'id must be a valid ObjectId'),
});
