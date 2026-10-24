/**
 * User model
 *
 * Collections: users
 *
 * Design notes:
 * - email is trimmed, lowercased, and has a unique index for fast lookups and duplicate prevention.
 * - password has select:false so it is never included in query results by default;
 *   it must be explicitly requested with .select('+password').
 * - role is an enum restricted to ADMIN and SALES.
 * - The first registered user receives the ADMIN role (handled in the service layer).
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Never returned by queries unless explicitly selected
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'SALES'],
        message: 'Role must be ADMIN or SALES',
      },
      default: 'SALES',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        // Ensure password is never serialised to JSON even if accidentally selected
        delete ret.password;
        return ret;
      },
    },
  }
);

const User = mongoose.model('User', userSchema);

export default User;
