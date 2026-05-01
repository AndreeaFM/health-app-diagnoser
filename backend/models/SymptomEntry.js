import mongoose from 'mongoose'

const SymptomEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bodyAreas: {
      type: [String],
      required: [true, 'At least one body area is required'],
    },
    symptomTypes: {
      type: [String],
      required: [true, 'At least one symptom type is required'],
    },
    severity: {
      type: Number,
      required: [true, 'Severity is required'],
      min: 1,
      max: 4,
    },
    duration: {
      type: String,
      enum: ['Under 1h', '1–6h', 'Half day', 'All day', 'Multi-day'],
      required: [true, 'Duration is required'],
    },
    triggers: { type: [String], default: [] },
    medication: { type: String, default: '' },
    notes: { type: String, default: '' },
    mood: {
      type: String,
      enum: ['Good', 'Okay', 'Low', 'Anxious', 'Tired', ''],
      default: '',
    },
    triage: {
      urgency: {
        type: String,
        enum: ['low', 'moderate', 'high', ''],
        default: '',
      },
      recommendation: { type: String, default: '' },
      seekCareIf: { type: [String], default: [] },
      generatedAt: { type: Date },
    },
    flags: {
      isRecurring: { type: Boolean, default: false },
      recurrenceNote: { type: String, default: '' },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

SymptomEntrySchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('SymptomEntry', SymptomEntrySchema)
