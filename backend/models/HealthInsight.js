import mongoose from 'mongoose'

const HealthInsightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // What triggered this insight
    triggerType: {
      type: String,
      enum: [
        'recurring_7d', // same symptom 3+ times in 7 days
        'recurring_14d', // same symptom logged on 5+ days in 14 days
        'high_urgency', // AI triage returned high urgency
        'severity_4', // first entry already severity 4
        'severity_worsening', // avg severity increasing over time
        'no_improvement', // same symptom 5+ times, severity not improving
        'multi_symptom', // 3+ different symptoms appearing together repeatedly
      ],
      required: true,
    },
    symptom: { type: String, required: true },
    // Human-readable explanation of why this was flagged
    reason: { type: String, required: true },
    // Supporting data for "why flagged" detail view
    evidence: {
      occurrences: { type: Number },
      daysSpan: { type: Number },
      avgSeverity: { type: Number },
      severityTrend: {
        type: String,
        enum: ['improving', 'worsening', 'stable', ''],
        default: '',
      },
      firstSeen: { type: Date },
      lastSeen: { type: Date },
    },
    // How urgent is this insight
    level: {
      type: String,
      enum: ['info', 'warning', 'urgent'],
      default: 'warning',
    },
    // Has user dismissed/acknowledged it
    dismissed: { type: Boolean, default: false },
    dismissedAt: { type: Date, default: null },
    // Has the user acted on it (shared with doctor)
    actedOn: { type: Boolean, default: false },
    actedOnAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// Compound index — one active insight per user+symptom+triggerType
HealthInsightSchema.index({
  userId: 1,
  symptom: 1,
  triggerType: 1,
  dismissed: 1,
})

export default mongoose.model('HealthInsight', HealthInsightSchema)
