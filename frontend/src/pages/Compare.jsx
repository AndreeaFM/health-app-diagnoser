import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import Layout from '../components/Layout'
import { api } from '../api'

const SEV_LABEL = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very severe' }

function StatDiff({ label, a, b, format = (v) => v, higherIsBad = true }) {
  if (a == null || b == null) return null
  const diff = b - a
  const pct = a === 0 ? null : Math.round((diff / a) * 100)
  const worse = higherIsBad ? diff > 0 : diff < 0
  const better = higherIsBad ? diff < 0 : diff > 0

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
            Period A
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {format(a)}
          </p>
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-medium pb-0.5 ${
            better
              ? 'text-green-600 dark:text-green-400'
              : worse
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400'
          }`}
        >
          {diff !== 0 && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d={
                  diff > 0
                    ? 'M12 19V5m0 0l-7 7m7-7l7 7'
                    : 'M12 5v14m0 0l-7-7m7 7l7-7'
                }
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {pct != null
            ? `${Math.abs(pct)}%`
            : diff === 0
            ? '='
            : diff > 0
            ? `+${format(Math.abs(diff))}`
            : `-${format(Math.abs(diff))}`}
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
            Period B
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {format(b)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Compare() {
  const [periodA, setPeriodA] = useState({ from: '', to: '' })
  const [periodB, setPeriodB] = useState({ from: '', to: '' })
  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compared, setCompared] = useState(false)

  const fetchStats = async (period) => {
    const params = new URLSearchParams({ days: 999 })
    if (period.from) params.set('from', period.from)
    if (period.to) params.set('to', period.to)
    return api.get(`/api/stats/summary?${params}`)
  }

  // Also fetch raw entries for the period to compute symptom breakdown
  const fetchEntries = async (period) => {
    const params = new URLSearchParams({ limit: 200 })
    if (period.from) params.set('from', period.from)
    if (period.to) params.set('to', period.to)
    return api.get(`/api/symptoms?${params}`)
  }

  const handleCompare = async () => {
    if (!periodA.from || !periodA.to || !periodB.from || !periodB.to) {
      setError('Please fill in all four dates.')
      return
    }
    setLoading(true)
    setError('')
    setCompared(false)
    try {
      const [statsA, statsB, entriesA, entriesB] = await Promise.all([
        fetchStats(periodA),
        fetchStats(periodB),
        fetchEntries(periodA),
        fetchEntries(periodB),
      ])
      setDataA({ ...statsA, entries: entriesA.entries })
      setDataB({ ...statsB, entries: entriesB.entries })
      setCompared(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Build symptom comparison chart data
  const buildSymptomChart = () => {
    if (!dataA || !dataB) return []
    const allSymptoms = new Set([
      ...(dataA.topSymptoms || []).map((s) => s.name),
      ...(dataB.topSymptoms || []).map((s) => s.name),
    ])
    return [...allSymptoms].map((name) => ({
      name,
      'Period A': dataA.topSymptoms?.find((s) => s.name === name)?.count || 0,
      'Period B': dataB.topSymptoms?.find((s) => s.name === name)?.count || 0,
    }))
  }

  const fmtSev = (v) => SEV_LABEL[Math.round(v)] || v
  const fmtNum = (v) => Math.round(v * 10) / 10

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Compare periods
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compare your health between two different date ranges.
          </p>
        </div>

        {/* Date pickers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            {
              label: 'Period A',
              period: periodA,
              set: setPeriodA,
              color: '#3B82F6',
            },
            {
              label: 'Period B',
              period: periodB,
              set: setPeriodB,
              color: '#8B5CF6',
            },
          ].map(({ label, period, set, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  style={{ background: color }}
                  className="w-3 h-3 rounded-full"
                />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {label}
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={period.from}
                    onChange={(e) =>
                      set((p) => ({ ...p, from: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={period.to}
                    onChange={(e) => set((p) => ({ ...p, to: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={loading}
          className={`w-full py-3 rounded-2xl text-sm font-medium transition-all mb-8 ${
            loading
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
          }`}
        >
          {loading ? 'Comparing…' : 'Compare periods'}
        </button>

        {/* Results */}
        {compared && dataA && dataB && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Comparison results
            </h2>

            {/* Quick verdict */}
            {(() => {
              const sevDiff =
                (dataB.avgSeverity || 0) - (dataA.avgSeverity || 0)
              const cntDiff =
                (dataB.totalEntries || 0) - (dataA.totalEntries || 0)
              const better = sevDiff < -0.3 || (sevDiff <= 0 && cntDiff < 0)
              const worse = sevDiff > 0.3 || (sevDiff >= 0 && cntDiff > 0)
              return (
                <div
                  className={`rounded-2xl border p-4 ${
                    better
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : worse
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      better
                        ? 'text-green-700 dark:text-green-400'
                        : worse
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {better
                      ? '✓ Your health improved in Period B'
                      : worse
                      ? '↑ Your symptoms were worse in Period B'
                      : '→ Your health was similar in both periods'}
                  </p>
                </div>
              )
            })()}

            {/* Stats diff */}
            <div className="grid grid-cols-2 gap-3">
              <StatDiff
                label="Total entries"
                a={dataA.totalEntries}
                b={dataB.totalEntries}
                format={(v) => `${v}`}
                higherIsBad={false}
              />
              <StatDiff
                label="Avg severity"
                a={dataA.avgSeverity}
                b={dataB.avgSeverity}
                format={fmtSev}
                higherIsBad={true}
              />
            </div>

            {/* Symptom comparison chart */}
            {buildSymptomChart().length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Symptom frequency comparison
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={buildSymptomChart()}
                    layout="vertical"
                    margin={{ right: 16, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={`#f3f4f6`}
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
                      tick={{ fontSize: 11, fill: '#374151' }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="Period A"
                      fill="#3B82F6"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="Period B"
                      fill="#8B5CF6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Trigger comparison */}
            {(dataA.topTriggers?.length > 0 ||
              dataB.topTriggers?.length > 0) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Top triggers
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: 'Period A',
                      data: dataA.topTriggers,
                      color: '#3B82F6',
                    },
                    {
                      label: 'Period B',
                      data: dataB.topTriggers,
                      color: '#8B5CF6',
                    },
                  ].map(({ label, data, color }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {label}
                      </p>
                      {data?.length > 0 ? (
                        data.slice(0, 3).map((t) => (
                          <div
                            key={t.name}
                            className="flex justify-between text-xs mb-1.5"
                          >
                            <span className="text-gray-700 dark:text-gray-300">
                              {t.name}
                            </span>
                            <span style={{ color }} className="font-medium">
                              {t.count}×
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400">No data</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
