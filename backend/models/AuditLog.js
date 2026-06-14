import mongoose from 'mongoose'

const AuditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },

    // What they did
    action: {
      type: String,
      enum: [
        'doctor_viewed_patient',
        'doctor_added_note',
        'doctor_prescribed_medication',
        'share_created',
        'share_revoked',
        'share_accepted',
        'admin_role_changed',
        'admin_user_deactivated',
        'admin_user_activated',
        'admin_user_deleted',
        'doctor_verification_requested',
        'doctor_verification_approved',
        'doctor_verification_rejected',
        'insight_dismissed',
        'insight_acted_on',
      ],
      required: true,
    },

    // Who was affected (optional)
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetName: { type: String, default: '' },

    // Extra context
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

AuditLogSchema.index({ actorId: 1, createdAt: -1 })
AuditLogSchema.index({ targetId: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })

export default mongoose.model('AuditLog', AuditLogSchema)
