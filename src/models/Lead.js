/**
 * Lead model
 *
 * Collection: leads
 *
 * Design notes:
 * - createdBy and assignedTo reference User documents (not embedded) so that
 *   user data stays consistent when a user's name changes, and because users
 *   can be shared across many leads.
 * - Flat denormalised fields (name, email, phone, company, etc.) are kept on the
 *   lead itself for fast reads without joins.
 * - Indexes are declared explicitly and documented in README.md.
 * - searchName and searchEmail are lowercase copies used for case-insensitive
 *   regex queries, avoiding collation complexity in aggregations.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];

export const LEAD_SERVICES = [
  'Web Development',
  'Mobile App Development',
  'SEO',
  'Social Media Marketing',
  'Performance Marketing',
  'UI/UX Design',
  'Custom Software',
  'Other',
];

const leadSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      maxlength: [150, 'Name must be at most 150 characters'],
    },
    // Lowercase copy used for case-insensitive search queries
    searchName: {
      type: String,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone must be at most 30 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [150, 'Company name must be at most 150 characters'],
    },
    serviceInterested: {
      type: String,
      enum: {
        values: LEAD_SERVICES,
        message: `Service must be one of: ${LEAD_SERVICES.join(', ')}`,
      },
      required: [true, 'Service interested is required'],
    },
    status: {
      type: String,
      enum: {
        values: LEAD_STATUSES,
        message: `Status must be one of: ${LEAD_STATUSES.join(', ')}`,
      },
      default: 'New',
    },
    followUpDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [5000, 'Notes must be at most 5000 characters'],
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Populate searchName automatically before save
leadSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.searchName = this.name.toLowerCase();
  }
  next();
});

// Also handle findOneAndUpdate
leadSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.name) {
    update.searchName = update.name.toLowerCase();
  }
  next();
});

// ─── Indexes (documented in README.md) ───────────────────────────────────────

// Fast status filtering (very common query)
leadSchema.index({ status: 1 });

// Chronological listing (newest first is the default sort)
leadSchema.index({ createdAt: -1 });

// Follow-up reminder queries (dashboard follow-ups panel)
leadSchema.index({ followUpDate: 1 });

// Role-scoped listing: SALES users see only their own leads
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdBy: 1 });

// Compound index for the most common filtered list query (role-scoped + status + date)
leadSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
leadSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

// Text search on normalised fields
leadSchema.index({ searchName: 1 });
leadSchema.index({ email: 1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
