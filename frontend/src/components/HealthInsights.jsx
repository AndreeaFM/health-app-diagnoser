import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const LEVEL_CONFIG = {
  urgent: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    title: 'text-red-800 dark:text-red-300',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="#dc2626"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    title: 'text-amber-800 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="#d97706"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    title: 'text-blue-800 dark:text-blue-300',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="1.5" />
        <path
          d="M12 16v-4m0-4h.01"
          stroke="#2563eb"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
}

const TRIGGER_LABELS = {
  recurring_7d: 'Frequent this week',
  recurring_14d: 'Recurring pattern',
  high_urgency: 'High urgency flagged',
  severity_4: 'Very severe',
  severity_worsening: 'Getting worse',
  no_improvement: 'No improvement',
  multi_symptom: 'Multiple symptoms',
}

function EvidenceDetail({ evidence, triggerType }) {
  if (!evidence) return null
  const items = []
  if (evidence.occurrences) items.push(`${evidence.occurrences} occurrences`)
  if (evidence.daysSpan) items.push(`over ${evidence.daysSpan} days`)
  if (evidence.avgSeverity) {
    const labels = { 1: 'mild', 2: 'moderate', 3: 'severe', 4: 'very severe' }
    items.push(
      `avg severity: ${labels[Math.round(evidence.avgSeverity)] ?? evidence.avgSeverity}`,
    )
  }
  if (evidence.severityTrend && evidence.severityTrend !== 'stable')
    items.push(`trend: ${evidence.severityTrend}`)
  if (!items.length) return null
  return <p className="text-xs opacity-75 mt-0.5">{items.join(' · ')}</p>
}

function InsightCard({ insight, onDismiss, onActedOn }) {
  const cfg = LEVEL_CONFIG[insight.level] || LEVEL_CONFIG.warning
  const [showDetail, setShowDetail] = useState(false)
  const [acting, setActing] = useState(false)
  const navigate = useNavigate()

  const handleShare = async () => {
    setActing(true)
    try {
      await api.patch(`/api/insights/${insight._id}/acted-on`, {})
      onActedOn(insight._id)
      navigate('/share')
    } catch {
      setActing(false)
    }
  }

  const handleDismiss = async () => {
    try {
      await api.patch(`/api/insights/${insight._id}/dismiss`, {})
      onDismiss(insight._id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}
            >
              {TRIGGER_LABELS[insight.triggerType] || insight.triggerType}
            </span>
            <span className={`text-xs font-medium ${cfg.title}`}>
              {insight.symptom}
            </span>
          </div>
          <p className={`text-sm ${cfg.text}`}>{insight.reason}</p>
          {showDetail && (
            <div className={`mt-2 text-xs ${cfg.text} space-y-1`}>
              <EvidenceDetail
                evidence={insight.evidence}
                triggerType={insight.triggerType}
              />
              <p className="font-medium mt-1">Why we flagged this:</p>
              <p>
                {insight.level === 'urgent'
                  ? 'This pattern warrants prompt medical attention. Your AI triage or severity score indicates something that should be reviewed by a professional.'
                  : 'Based on your logged history, this symptom has appeared frequently enough or severely enough that a medical opinion could be helpful.'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              onClick={handleShare}
              disabled={acting}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                insight.level === 'urgent'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-amber-600 text-white hover:bg-amber-700'
              } disabled:opacity-50`}
            >
              {acting ? 'Opening…' : 'Share with a doctor'}
            </button>
            <button
              onClick={() => setShowDetail((v) => !v)}
              className={`text-xs ${cfg.text} hover:underline`}
            >
              {showDetail ? 'Hide details' : 'Why flagged?'}
            </button>
            <button
              onClick={handleDismiss}
              className={`text-xs ${cfg.text} opacity-60 hover:opacity-100 ml-auto`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HealthInsights({
  insights: initial,
  onInsightsChange,
}) {
  const [insights, setInsights] = useState(initial || [])

  const handleDismiss = (id) => {
    const updated = insights.filter((i) => i._id !== id)
    setInsights(updated)
    onInsightsChange?.(updated)
  }

  const handleActedOn = (id) => {
    const updated = insights.filter((i) => i._id !== id)
    setInsights(updated)
    onInsightsChange?.(updated)
  }

  if (!insights.length) return null

  // Sort: urgent first
  const sorted = [...insights].sort((a, b) => {
    const order = { urgent: 0, warning: 1, info: 2 }
    return (order[a.level] ?? 2) - (order[b.level] ?? 2)
  })

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            stroke="#6b7280"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Health insights
        </span>
      </div>
      {sorted.map((insight) => (
        <InsightCard
          key={insight._id}
          insight={insight}
          onDismiss={handleDismiss}
          onActedOn={handleActedOn}
        />
      ))}
    </div>
  )
}
