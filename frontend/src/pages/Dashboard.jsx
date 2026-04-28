import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import SeverityBadge from '../components/SeverityBadge'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const SEVERITY_LABELS = {
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
  4: 'Very severe',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [recent, setRecent] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/symptoms?page=1&limit=3')
      .then((data) => {
        setRecent(data.entries)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const avgSeverity = recent.length
    ? Math.round(recent.reduce((a, e) => a + e.severity, 0) / recent.length)
    : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
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

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total entries" value={total} sub="all time" />
          <StatCard
            label="Avg severity"
            value={avgSeverity ? SEVERITY_LABELS[avgSeverity] : '—'}
            sub="last 3 entries"
          />
          <StatCard label="Charts" value="Week 3" sub="coming soon" />
        </div>

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

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent entries
          </h2>
          <Link to="/history" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse"
              >
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && recent.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-sm text-gray-500">No entries yet.</p>
            <Link
              to="/log"
              className="text-sm text-blue-600 hover:underline mt-1 inline-block"
            >
              Log your first symptom
            </Link>
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
