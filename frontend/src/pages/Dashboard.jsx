import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import Layout from '../components/Layout'
import SeverityBadge from '../components/SeverityBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const SEV_LABEL = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very severe' }
const BAR_COLORS = [
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
]

function shortDate(s) {
  return new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold ${
          highlight ? 'text-blue-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function PatternAlert({ flags }) {
  if (!flags?.length) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium text-amber-800">
          Recurring symptoms detected
        </span>
      </div>
      {flags.map((f, i) => (
        <p key={i} className="text-xs text-amber-700 mt-1">
          • {f.message}
        </p>
      ))}
    </div>
  )
}

function SevTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-500 mb-0.5">{shortDate(label)}</p>
      <p className="font-medium text-gray-900">
        {SEV_LABEL[Math.round(val)] || val} ({val})
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [flags, setFlags] = useState([])
  const [recent, setRecent] = useState([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get(`/api/stats/summary?days=${days}`),
      api.get('/api/stats/patterns'),
      api.get('/api/symptoms?page=1&limit=3'),
    ])
      .then(([s, p, r]) => {
        setStats(s)
        setFlags(p.flags || [])
        setRecent(r.entries || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [days])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header + filter */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Good {greeting}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                  days === d
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <PatternAlert flags={flags} />

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
              >
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-6 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total entries"
              value={stats?.totalEntries ?? 0}
              sub={`last ${days} days`}
            />
            <StatCard
              label="Avg severity"
              value={
                stats?.avgSeverity
                  ? SEV_LABEL[Math.round(stats.avgSeverity)]
                  : '—'
              }
              sub={
                stats?.avgSeverity ? `score ${stats.avgSeverity}` : 'no data'
              }
              highlight={stats?.avgSeverity >= 3}
            />
            <StatCard
              label="Recurring"
              value={flags.length > 0 ? `${flags.length} found` : 'None'}
              sub="last 7 days"
              highlight={flags.length > 0}
            />
          </div>
        )}

        {/* Log CTA */}
        <Link
          to="/log"
          className="flex items-center justify-between w-full p-5 bg-gray-900 text-white rounded-2xl hover:bg-gray-700 transition mb-8"
        >
          <div>
            <p className="font-medium text-sm">Log today's symptoms</p>
            <p className="text-xs text-gray-400 mt-0.5">Takes about 1 minute</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        {/* Charts */}
        {!loading && stats && stats.totalEntries > 0 && (
          <div className="space-y-6 mb-8">
            {/* Severity over time line chart */}
            {stats.severityOverTime?.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Severity over time
                </h2>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={stats.severityOverTime}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                    />
                    <YAxis
                      domain={[1, 4]}
                      ticks={[1, 2, 3, 4]}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                    />
                    <Tooltip content={<SevTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      strokeWidth={2}
                      stroke="#3B82F6"
                      dot={{ r: 3, fill: '#3B82F6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top symptoms bar chart */}
            {stats.topSymptoms?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Most frequent symptoms
                </h2>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(120, stats.topSymptoms.length * 36)}
                >
                  <BarChart
                    data={stats.topSymptoms}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f3f4f6"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <Tooltip
                      formatter={(v) => [v, 'occurrences']}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {stats.topSymptoms.map((_, i) => (
                        <Cell
                          key={i}
                          fill={BAR_COLORS[i % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top triggers progress bars */}
            {stats.topTriggers?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Most common triggers
                </h2>
                <div className="space-y-3">
                  {stats.topTriggers.map((t, i) => {
                    const pct = Math.round(
                      (t.count / stats.topTriggers[0].count) * 100
                    )
                    return (
                      <div key={t.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium">
                            {t.name}
                          </span>
                          <span className="text-gray-400">{t.count}×</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${pct}%`,
                              background: BAR_COLORS[i % BAR_COLORS.length],
                            }}
                            className="h-full rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && stats?.totalEntries === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 mb-8">
            <p className="text-sm text-gray-500 mb-2">
              No data yet for this period
            </p>
            <Link to="/log" className="text-sm text-blue-600 hover:underline">
              Log your first symptom
            </Link>
          </div>
        )}

        {/* Recent entries */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent entries
          </h2>
          <Link to="/history" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {!loading && recent.length === 0 && (
          <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
            <p className="text-sm text-gray-500">No entries yet.</p>
          </div>
        )}

        {!loading && recent.length > 0 && (
          <div className="space-y-3">
            {recent.map((entry) => (
              <div
                key={entry._id}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <SeverityBadge severity={entry.severity} />
                  <span className="text-sm font-medium text-gray-900">
                    {entry.symptomTypes.join(', ')}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {entry.bodyAreas.join(', ')} · {entry.duration} ·{' '}
                  {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
