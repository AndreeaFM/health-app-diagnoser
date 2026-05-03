import mongoose from 'mongoose'

const TriageSessionSchema = new mongoose.Schema(
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
      default: null,
    },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    urgencyLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', ''],
      default: '',
    },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('TriageSession', TriageSessionSchema)
