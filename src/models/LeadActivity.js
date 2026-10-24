/**
 * LeadActivity model
 *
 * Collection: leadactivities
 *
 * Design decision: LeadActivity is a separate collection rather than embedded
 * in the Lead document because activity logs are unbounded - a lead could
 * accumulate hundreds of activity records over its lifetime. Embedding would
 * cause the Lead document to grow without limit (MongoDB 16 MB document cap)
 * and would slow down lead reads with unnecessary data. A separate collection
 * allows efficient pagination and independent indexing.
 *
 * When a lead is deleted, its activity records are deleted in the same
 * service call (see LeadService.deleteLead). This is done explicitly rather
 * than with a Mongoose middleware hook so the deletion is clearly visible in
 * the service layer and easier to reason about during code review.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ACTIVITY_TYPES = [
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'NOTE',
  'DELETED',
];

const leadActivitySchema = new Schema(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'lead reference is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user reference is required'],
    },
    type: {
      type: String,
      enum: {
        values: ACTIVITY_TYPES,
        message: `Activity type must be one of: ${ACTIVITY_TYPES.join(', ')}`,
      },
      required: [true, 'Activity type is required'],
    },
    message: {
      type: String,
      required: [true, 'Activity message is required'],
      trim: true,
    },
    // Stores a snapshot of changed fields: { fieldName: { old: value, new: value } }
    changes: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Only createdAt is needed; activities are immutable once written
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Primary query: fetch all activities for a lead, newest first
leadActivitySchema.index({ lead: 1, createdAt: -1 });

const LeadActivity = mongoose.model('LeadActivity', leadActivitySchema);

export default LeadActivity;
