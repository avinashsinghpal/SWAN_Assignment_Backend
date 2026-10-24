/**
 * DashboardController
 */

import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/appError.js';
import { successResponse } from '../utils/helpers.js';
import Lead from '../models/Lead.js';

/**
 * GET /api/v1/dashboard/stats
 */
export const getStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getStats(req.user);
  res.status(200).json(successResponse(data));
});

/**
 * GET /api/v1/dashboard/trends
 */
export const getTrends = asyncHandler(async (req, res) => {
  const data = await dashboardService.getTrends(req.user);
  res.status(200).json(successResponse(data));
});

/**
 * GET /api/v1/dashboard/services
 */
export const getServices = asyncHandler(async (req, res) => {
  const data = await dashboardService.getServiceBreakdown(req.user);
  res.status(200).json(successResponse(data));
});

/**
 * GET /api/v1/dashboard/follow-ups
 */
export const getFollowUps = asyncHandler(async (req, res) => {
  const data = await dashboardService.getFollowUps(req.user);
  res.status(200).json(successResponse(data));
});

/**
 * GET /api/v1/dashboard/recent-leads
 */
export const getRecentLeads = asyncHandler(async (req, res) => {
  const roleFilter =
    req.user.role === 'ADMIN'
      ? {}
      : { $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }] };

  const leads = await Lead.find(roleFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('createdBy', 'name')
    .populate('assignedTo', 'name')
    .lean();

  res.status(200).json(successResponse(leads));
});
