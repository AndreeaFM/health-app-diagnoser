import mongoose from 'mongoose'

const MedicationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SymptomEntry',
      required: true,
    },
    medicationName: { type: String, required: true },
    dosage: { type: String, default: '' },
    takenAt: { type: Date, default: Date.now },
    followedUp: { type: Boolean, default: false },
    followUpAt: { type: Date },
    effectiveness: {
      type: String,
      enum: ['much_better', 'better', 'no_change', 'worse', ''],
      default: '',
    },
    followUpNotes: { type: String, default: '' },
    severityBefore: { type: Number, min: 1, max: 4 },
    severityAfter: { type: Number, min: 1, max: 4 },

    // Set when a doctor prescribes this (not self-logged)
    prescribedBy: {
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      doctorName: { type: String, default: '' },
      notes: { type: String, default: '' },
      prescribedAt: { type: Date },
    },
  },
  { timestamps: true },
)

MedicationLogSchema.index({ userId: 1, createdAt: -1 })
export default mongoose.model('MedicationLog', MedicationLogSchema)
