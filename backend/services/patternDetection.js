import mongoose from 'mongoose'
import SymptomEntry from '../models/SymptomEntry.js'
import HealthInsight from '../models/HealthInsight.js'

/**
 * Run full pattern detection for a user and upsert insights.
 * Called after every new symptom entry is saved.
 */
export async function detectPatterns(userId) {
  try {
    const uid = new mongoose.Types.ObjectId(userId)
    const now = new Date()

    const from14 = new Date(now)
    from14.setDate(from14.getDate() - 14)

    const from30 = new Date(now)
    from30.setDate(from30.getDate() - 30)

    const entries14 = await SymptomEntry.find({
      userId: uid,
      deletedAt: null,
      createdAt: { $gte: from14 },
    }).sort({ createdAt: 1 })

    const entries30 = await SymptomEntry.find({
      userId: uid,
      deletedAt: null,
      createdAt: { $gte: from30 },
    }).sort({ createdAt: 1 })

    const insights = []

    // ── 1. Immediate high urgency flag ──────────────────────
    const highUrgencyEntries = entries14.filter(
      (e) => e.triage?.urgency === 'high',
    )
    for (const e of highUrgencyEntries) {
      for (const symptom of e.symptomTypes) {
        insights.push({
          triggerType: 'high_urgency',
          symptom,
          level: 'urgent',
          reason: `AI flagged ${symptom} as high urgency`,
          evidence: {
            occurrences: 1,
            firstSeen: e.createdAt,
            lastSeen: e.createdAt,
            avgSeverity: e.severity,
          },
        })
      }
    }

    // ── 2. Severity 4 on first occurrence ───────────────────
    const severeEntries = entries14.filter((e) => e.severity === 4)
    for (const e of severeEntries) {
      for (const symptom of e.symptomTypes) {
        insights.push({
          triggerType: 'severity_4',
          symptom,
          level: 'urgent',
          reason: `${symptom} logged at maximum severity (very severe)`,
          evidence: {
            occurrences: 1,
            firstSeen: e.createdAt,
            lastSeen: e.createdAt,
            avgSeverity: 4,
          },
        })
      }
    }

    // ── 3. Group by symptom for pattern checks ──────────────
    const symptomMap = {}
    for (const entry of entries14) {
      for (const symptom of entry.symptomTypes) {
        if (!symptomMap[symptom]) symptomMap[symptom] = []
        symptomMap[symptom].push(entry)
      }
    }

    for (const [symptom, symEntries] of Object.entries(symptomMap)) {
      const count = symEntries.length
      const firstSeen = symEntries[0].createdAt
      const lastSeen = symEntries[symEntries.length - 1].createdAt
      const avgSeverity =
        Math.round(
          (symEntries.reduce((a, e) => a + e.severity, 0) / count) * 10,
        ) / 10

      // Unique days this symptom appeared
      const uniqueDays = new Set(
        symEntries.map((e) => e.createdAt.toISOString().slice(0, 10)),
      ).size

      // ── 3a. Recurring in 7 days (3+ entries) ────────────
      const last7 = new Date(now)
      last7.setDate(last7.getDate() - 7)
      const in7Days = symEntries.filter((e) => e.createdAt >= last7)
      if (in7Days.length >= 3) {
        insights.push({
          triggerType: 'recurring_7d',
          symptom,
          level: 'warning',
          reason: `${symptom} logged ${in7Days.length} times in the last 7 days`,
          evidence: {
            occurrences: in7Days.length,
            daysSpan: 7,
            avgSeverity,
            firstSeen,
            lastSeen,
          },
        })
      }

      // ── 3b. Recurring across 14 days (5+ different days) ─
      if (uniqueDays >= 5) {
        insights.push({
          triggerType: 'recurring_14d',
          symptom,
          level: 'warning',
          reason: `${symptom} appeared on ${uniqueDays} separate days over the last 2 weeks`,
          evidence: {
            occurrences: count,
            daysSpan: 14,
            avgSeverity,
            firstSeen,
            lastSeen,
          },
        })
      }

      // ── 3c. No improvement (5+ entries, severity not going down) ─
      if (count >= 5) {
        const firstHalf = symEntries.slice(0, Math.floor(count / 2))
        const secondHalf = symEntries.slice(Math.floor(count / 2))
        const avgFirst =
          firstHalf.reduce((a, e) => a + e.severity, 0) / firstHalf.length
        const avgSecond =
          secondHalf.reduce((a, e) => a + e.severity, 0) / secondHalf.length

        let trend = 'stable'
        if (avgSecond > avgFirst + 0.3) trend = 'worsening'
        else if (avgSecond < avgFirst - 0.3) trend = 'improving'

        if (trend === 'worsening') {
          insights.push({
            triggerType: 'severity_worsening',
            symptom,
            level: 'warning',
            reason: `${symptom} is getting worse — severity increased from avg ${avgFirst.toFixed(1)} to ${avgSecond.toFixed(1)}`,
            evidence: {
              occurrences: count,
              daysSpan: 14,
              avgSeverity,
              severityTrend: 'worsening',
              firstSeen,
              lastSeen,
            },
          })
        } else if (trend === 'stable' && avgSeverity >= 2) {
          insights.push({
            triggerType: 'no_improvement',
            symptom,
            level: 'warning',
            reason: `${symptom} has been logged ${count} times with no improvement`,
            evidence: {
              occurrences: count,
              daysSpan: 14,
              avgSeverity,
              severityTrend: 'stable',
              firstSeen,
              lastSeen,
            },
          })
        }
      }
    }

    // ── 4. Multi-symptom clusters (3+ different symptoms appearing same day 3+ times) ──
    const dayClusters = {}
    for (const entry of entries14) {
      const day = entry.createdAt.toISOString().slice(0, 10)
      if (!dayClusters[day]) dayClusters[day] = new Set()
      entry.symptomTypes.forEach((s) => dayClusters[day].add(s))
    }
    const daysWithMultiple = Object.values(dayClusters).filter(
      (s) => s.size >= 3,
    ).length
    if (daysWithMultiple >= 3) {
      const allSymptoms = [...new Set(entries14.flatMap((e) => e.symptomTypes))]
      insights.push({
        triggerType: 'multi_symptom',
        symptom: allSymptoms.slice(0, 3).join(', '),
        level: 'warning',
        reason: `Multiple symptoms (${allSymptoms.slice(0, 3).join(', ')}) appearing together repeatedly — may indicate a systemic pattern`,
        evidence: {
          occurrences: daysWithMultiple,
          daysSpan: 14,
        },
      })
    }

    // ── Upsert insights (avoid duplicates, don't overwrite dismissed ones) ──
    for (const insight of insights) {
      const existing = await HealthInsight.findOne({
        userId: uid,
        symptom: insight.symptom,
        triggerType: insight.triggerType,
        dismissed: false,
      })

      if (!existing) {
        await HealthInsight.create({ userId: uid, ...insight })
      } else {
        // Update evidence but keep dismissed state
        await HealthInsight.updateOne(
          { _id: existing._id },
          {
            $set: {
              reason: insight.reason,
              evidence: insight.evidence,
              level: insight.level,
            },
          },
        )
      }
    }
  } catch (err) {
    // Non-blocking — log but don't fail the symptom save
    console.error('Pattern detection error:', err.message)
  }
}
