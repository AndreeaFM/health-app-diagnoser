import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true },

    // ── Role-Based Access Control ─────────────────────────
    // patient  = regular user (default)
    // doctor   = can view shared patient histories (read-only)
    // admin    = full platform access, can manage users & roles
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },

    // Only relevant for doctor role
    doctorInfo: {
      specialization: { type: String, default: '' },
      licenseNumber: { type: String, default: '' },
      hospital: { type: String, default: '' },
    },

    // Doctor verification workflow
    doctorVerification: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      requestedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String, default: '' },
    },

    // Is the account active? Admins can deactivate users
    isActive: { type: Boolean, default: true },

    // Onboarding — track which steps are done
    onboarding: {
      completed: { type: Boolean, default: false },
      profileFilled: { type: Boolean, default: false },
      firstEntryLogged: { type: Boolean, default: false },
    },

    // Patient profile fields
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    medicalHistory: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    profileComplete: { type: Boolean, default: false },

    // Emergency contact & notifications
    emergencyContact: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    reminderEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export default mongoose.model('User', UserSchema)
