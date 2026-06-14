import mongoose from 'mongoose'

// A patient generates a share token to give a doctor read-only access
// to their symptom history and dashboard
const ShareTokenSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The doctor who accepted this token (null until accepted)
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Random token string included in the share URL
    token: {
      type: String,
      required: true,
      unique: true,
    },
    // Optional label the patient gives this share
    label: { type: String, default: 'Shared with doctor' },

    // Expiry — default 30 days
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },

    // Whether the token is still valid
    active: { type: Boolean, default: true },
    // When the doctor first used the token
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export default mongoose.model('ShareToken', ShareTokenSchema)
