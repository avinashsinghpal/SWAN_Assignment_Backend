/**
 * LeadController
 * Thin controllers that delegate to LeadService and send the response.
 */

import * as leadService from '../services/lead.service.js';
import { asyncHandler } from '../utils/appError.js';
import { successResponse } from '../utils/helpers.js';

/**
 * GET /api/v1/leads
 */
export const listLeads = asyncHandler(async (req, res) => {
  const { leads, total, page, pageSize, totalPages } = await leadService.listLeads(
    req.user,
    req.query
  );
  res.status(200).json(successResponse(leads, { page, pageSize, total, totalPages }));
});

/**
 * GET /api/v1/leads/export
 * Streams CSV response.
 */
export const exportLeads = asyncHandler(async (req, res) => {
  const csv = await leadService.exportLeadsCsv(req.user, req.query);
  const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

/**
 * GET /api/v1/leads/:id
 */
export const getLead = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.id, req.user);
  res.status(200).json(successResponse(lead));
});

/**
 * POST /api/v1/leads
 */
export const createLead = asyncHandler(async (req, res) => {
  const result = await leadService.createLead(req.body, req.user);
  const response = successResponse(result.lead);
  if (result.isDuplicate) {
    response.warning = 'A lead with this email already exists in your scope.';
  }
  res.status(201).json(response);
});

/**
 * PUT /api/v1/leads/:id
 */
export const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.params.id, req.body, req.user);
  res.status(200).json(successResponse(lead));
});

/**
 * PATCH /api/v1/leads/:id/status
 */
export const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLeadStatus(req.params.id, req.body.status, req.user);
  res.status(200).json(successResponse(lead));
});

/**
 * DELETE /api/v1/leads/:id
 */
export const deleteLead = asyncHandler(async (req, res) => {
  await leadService.deleteLead(req.params.id, req.user);
  res.status(204).send();
});

/**
 * GET /api/v1/leads/:id/activities
 */
export const getLeadActivities = asyncHandler(async (req, res) => {
  const activities = await leadService.getLeadActivities(req.params.id, req.user);
  res.status(200).json(successResponse(activities));
});
