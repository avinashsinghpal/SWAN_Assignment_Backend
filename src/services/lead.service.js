/**
 * LeadService
 *
 * Business logic for lead management. All database access goes through here.
 * Controllers are thin wrappers that call these functions and send the response.
 */

import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import LeadActivity from '../models/LeadActivity.js';
import { AppError } from '../utils/appError.js';
import { escapeRegex, buildCsv } from '../utils/helpers.js';

/**
 * Build a base $match filter that scopes to the requesting user's role.
 * ADMIN sees all leads; SALES sees only leads they created or are assigned to.
 *
 * @param {object} user - req.user
 * @returns {object} Mongoose query filter
 */
function roleFilter(user) {
  if (user.role === 'ADMIN') return {};
  return {
    $or: [
      { createdBy: user._id },
      { assignedTo: user._id },
    ],
  };
}

/**
 * Build the filter object for listing leads from validated query params.
 *
 * @param {object} user - req.user
 * @param {object} query - validated query params
 * @returns {object}
 */
function buildFilter(user, query) {
  const filter = roleFilter(user);

  if (query.search) {
    const escaped = escapeRegex(query.search.toLowerCase());
    const re = new RegExp(escaped);
    const searchOr = [
      { searchName: re },
      { email: re },
      { phone: re },
    ];
    // Merge with existing $or if any
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  if (query.status) {
    const statuses = query.status.split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) filter.status = { $in: statuses };
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      // Include the entire "dateTo" day
      const to = new Date(query.dateTo);
      to.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  return filter;
}

/**
 * List leads with search, filter, sort, and pagination.
 *
 * @param {object} user
 * @param {object} query - validated query params
 * @returns {Promise<{ leads: object[], total: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function listLeads(user, query) {
  const filter = buildFilter(user, query);
  const { sortBy, order, page, pageSize } = query;

  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
  const skip = (page - 1) * pageSize;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return { leads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Get a single lead by ID, with role scoping.
 *
 * @param {string} leadId
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function getLeadById(leadId, user) {
  const filter = { _id: leadId, ...roleFilter(user) };
  // For SALES with $or, merge properly
  const lead = await Lead.findOne(filter)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .lean();

  if (!lead) {
    throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  }
  return lead;
}

/**
 * Create a new lead and write a CREATED activity.
 *
 * @param {object} data - validated body
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function createLead(data, user) {
  // Warn on duplicate email within the same owner scope (not a hard error)
  const existingFilter = {
    email: data.email,
    $or: [{ createdBy: user._id }, { assignedTo: user._id }],
  };
  if (user.role === 'ADMIN') delete existingFilter.$or;

  const duplicate = await Lead.findOne(existingFilter).lean();
  // We do not block creation; the warning is surfaced in the response
  const isDuplicate = !!duplicate;

  const lead = await Lead.create({
    ...data,
    createdBy: user._id,
    assignedTo: data.assignedTo || user._id,
  });

  await LeadActivity.create({
    lead: lead._id,
    user: user._id,
    type: 'CREATED',
    message: `Lead created by ${user.name}`,
    changes: {},
  });

  return { lead: await lead.populate('createdBy assignedTo', 'name email'), isDuplicate };
}

/**
 * Update a lead and write an UPDATED activity with a diff.
 *
 * @param {string} leadId
 * @param {object} data
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function updateLead(leadId, data, user) {
  const existing = await Lead.findOne({ _id: leadId, ...roleFilter(user) });
  if (!existing) {
    throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  }

  // Build a diff of changed fields for the activity record
  const changes = {};
  const trackFields = ['name', 'email', 'phone', 'company', 'serviceInterested', 'status', 'followUpDate', 'notes', 'assignedTo'];
  for (const field of trackFields) {
    if (data[field] !== undefined) {
      const oldVal = existing[field]?.toString?.() ?? existing[field];
      const newVal = data[field]?.toString?.() ?? data[field];
      if (oldVal !== newVal) {
        changes[field] = { old: existing[field], new: data[field] };
      }
    }
  }

  const wasStatusChanged = changes.status !== undefined;

  Object.assign(existing, data);
  await existing.save();

  const activityType = wasStatusChanged ? 'STATUS_CHANGED' : 'UPDATED';
  const message = wasStatusChanged
    ? `Status changed from ${changes.status.old} to ${changes.status.new} by ${user.name}`
    : `Lead updated by ${user.name}`;

  await LeadActivity.create({
    lead: existing._id,
    user: user._id,
    type: activityType,
    message,
    changes,
  });

  await existing.populate('createdBy assignedTo', 'name email');
  return existing;
}

/**
 * Update only the status of a lead.
 *
 * @param {string} leadId
 * @param {string} status
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function updateLeadStatus(leadId, status, user) {
  const existing = await Lead.findOne({ _id: leadId, ...roleFilter(user) });
  if (!existing) {
    throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  }

  const oldStatus = existing.status;
  existing.status = status;
  await existing.save();

  await LeadActivity.create({
    lead: existing._id,
    user: user._id,
    type: 'STATUS_CHANGED',
    message: `Status changed from ${oldStatus} to ${status} by ${user.name}`,
    changes: { status: { old: oldStatus, new: status } },
  });

  await existing.populate('createdBy assignedTo', 'name email');
  return existing;
}

/**
 * Delete a lead and its associated activity records.
 * Activities are deleted in the same call (explicitly, not via middleware)
 * so the deletion is visible and auditable in the service layer.
 *
 * @param {string} leadId
 * @param {object} user
 * @returns {Promise<void>}
 */
export async function deleteLead(leadId, user) {
  const lead = await Lead.findOne({ _id: leadId, ...roleFilter(user) });
  if (!lead) {
    throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  }

  // Write a DELETED activity before removing the lead
  await LeadActivity.create({
    lead: lead._id,
    user: user._id,
    type: 'DELETED',
    message: `Lead deleted by ${user.name}`,
    changes: { name: lead.name, email: lead.email },
  });

  // Delete the lead and its activities
  await Promise.all([
    Lead.deleteOne({ _id: leadId }),
    LeadActivity.deleteMany({ lead: leadId }),
  ]);
}

/**
 * Get activity timeline for a lead.
 *
 * @param {string} leadId
 * @param {object} user
 * @returns {Promise<object[]>}
 */
export async function getLeadActivities(leadId, user) {
  // Verify access first
  const lead = await Lead.findOne({ _id: leadId, ...roleFilter(user) }).lean();
  if (!lead) {
    throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  }

  return LeadActivity.find({ lead: leadId })
    .sort({ createdAt: -1 })
    .populate('user', 'name email')
    .lean();
}

/**
 * Export leads as a CSV string for the current filter.
 *
 * @param {object} user
 * @param {object} query
 * @returns {Promise<string>}
 */
export async function exportLeadsCsv(user, query) {
  const filter = buildFilter(user, query);

  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name')
    .populate('assignedTo', 'name')
    .lean();

  const headers = [
    'Name', 'Email', 'Phone', 'Company', 'Service Interested',
    'Status', 'Follow-up Date', 'Notes', 'Created By', 'Assigned To', 'Created At',
  ];

  const rows = leads.map((l) => [
    l.name,
    l.email,
    l.phone || '',
    l.company || '',
    l.serviceInterested,
    l.status,
    l.followUpDate ? new Date(l.followUpDate).toISOString().split('T')[0] : '',
    l.notes || '',
    l.createdBy?.name || '',
    l.assignedTo?.name || '',
    new Date(l.createdAt).toISOString().split('T')[0],
  ]);

  return buildCsv(headers, rows);
}
