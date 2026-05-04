import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import SeverityBadge from '../components/SeverityBadge'
import { useTheme } from '../context/ThemeContext'
import { api } from '../api'

const VITE_API = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const SYMPTOM_TYPES = [
  'Pain',
  'Fatigue',
  'Headache',
  'Nausea',
  'Fever',
  'Cough',
  'Dizziness',
  'Shortness of breath',
]
const SEVERITIES = [
  { v: 1, l: 'Mild' },
  { v: 2, l: 'Moderate' },
  { v: 3, l: 'Severe' },
  { v: 4, l: 'Very severe' },
]
const URGENCY_CFG = {
  low: {
    badge: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
    label: 'Low',
  },
  moderate: {
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    label: 'Moderate',
  },
  high: {
    badge: 'bg-red-100   dark:bg-red-950   text-red-700   dark:text-red-400',
    label: 'High',
  },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EntryCard({ entry, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const tri = entry.triage
  const urgCfg = tri?.urgency ? URGENCY_CFG[tri.urgency] : null

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setDeleting(true)
    try {
      await api.delete(`/api/symptoms/${entry._id}`)
      onDelete(entry._id)
    } catch (err) {
      alert('Failed to delete: ' + err.message)
      setDeleting(false)
      setConfirm(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-gray-200 dark:hover:border-gray-700 transition">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <SeverityBadge severity={entry.severity} />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {entry.symptomTypes.join(', ')}
              </span>
              {urgCfg && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgCfg.badge}`}
                >
                  AI: {urgCfg.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Area:
              </span>{' '}
              {entry.bodyAreas.join(', ')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                Duration:
              </span>{' '}
              {entry.duration}
            </p>
            {entry.triggers?.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  Triggers:
                </span>{' '}
                {entry.triggers.join(', ')}
              </p>
            )}
            {entry.medication && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  Medication:
                </span>{' '}
                {entry.medication}
              </p>
            )}
            {entry.notes && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic line-clamp-2">
                "{entry.notes}"
              </p>
            )}
            {entry.mood && (
              <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                Mood: {entry.mood}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(entry.createdAt)}
            </span>
            {tri?.urgency && (
              <button
                onClick={() => setExpanded((o) => !o)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {expanded ? 'Hide AI advice' : 'Show AI advice'}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                confirm
                  ? 'border-red-300 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {deleting ? 'Deleting…' : confirm ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {expanded && tri?.recommendation && (
        <div
          className={`px-5 py-4 border-t border-gray-100 dark:border-gray-800 ${
            tri.urgency === 'high'
              ? 'bg-red-50 dark:bg-red-950/30'
              : tri.urgency === 'moderate'
              ? 'bg-amber-50 dark:bg-amber-950/30'
              : 'bg-green-50 dark:bg-green-950/30'
          }`}
        >
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            AI Recommendation
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {tri.recommendation}
          </p>
          {tri.seekCareIf?.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Seek care if:
              </p>
              <ul className="space-y-0.5">
                {tri.seekCareIf.map((item, i) => (
                  <li
                    key={i}
                    className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5"
                  >
                    <span className="text-gray-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
            AI guidance only — not medical advice.
          </p>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const { dark } = useTheme()
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterSym, setFilterSym] = useState('')
  const [filterSev, setFilterSev] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const buildQuery = useCallback(
    (p = 1) => {
      const params = new URLSearchParams({ page: p, limit: 10 })
      if (filterFrom) params.set('from', filterFrom)
      if (filterTo) params.set('to', filterTo)
      return `/api/symptoms?${params}`
    },
    [filterFrom, filterTo]
  )

  const fetchEntries = useCallback(
    async (p = 1) => {
      setLoading(true)
      setError('')
      try {
        const data = await api.get(buildQuery(p))
        setEntries(data.entries)
        setTotal(data.total)
        setPage(data.page)
        setPages(data.pages)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [buildQuery]
  )

  useEffect(() => {
    fetchEntries(1)
  }, [fetchEntries])

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((e) => e._id !== id))
    setTotal((prev) => prev - 1)
  }

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filterFrom) params.set('from', filterFrom)
      if (filterTo) params.set('to', filterTo)
      const res = await fetch(`${VITE_API}/api/reports/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `symptom-report-${
        new Date().toISOString().split('T')[0]
      }.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PDF download failed: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  // Client-side filter by symptom type + severity + search text
  const filtered = entries.filter((e) => {
    if (filterSym && !e.symptomTypes.includes(filterSym)) return false
    if (filterSev && e.severity !== Number(filterSev)) return false
    if (search) {
      const q = search.toLowerCase()
      const inNotes = e.notes?.toLowerCase().includes(q)
      const inSymptoms = e.symptomTypes.some((s) => s.toLowerCase().includes(q))
      const inArea = e.bodyAreas.some((a) => a.toLowerCase().includes(q))
      if (!inNotes && !inSymptoms && !inArea) return false
    }
    return true
  })

  const hasActiveFilters =
    search || filterSym || filterSev || filterFrom || filterTo

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Symptom history
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {total} {total === 1 ? 'entry' : 'entries'} total
              {hasActiveFilters && ` · ${filtered.length} shown`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              disabled={downloading || total === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition text-gray-700 dark:text-gray-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {downloading ? 'Generating…' : 'Export PDF'}
            </button>
            <Link
              to="/log"
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-xl hover:bg-gray-700 dark:hover:bg-gray-300 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Log new
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search symptoms, notes, body areas…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
            />
          </div>
          <button
            onClick={() => setShowFilters((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition ${
              showFilters || hasActiveFilters
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 4h18M7 12h10M11 20h2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Filters {hasActiveFilters && '•'}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Symptom type
              </label>
              <select
                value={filterSym}
                onChange={(e) => setFilterSym(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
              >
                <option value="">All symptoms</option>
                {SYMPTOM_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Severity
              </label>
              <select
                value={filterSev}
                onChange={(e) => setFilterSev(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
              >
                <option value="">All severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                From date
              </label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                To date
              </label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                onClick={() => fetchEntries(1)}
                className="flex-1 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-300 transition"
              >
                Apply filters
              </button>
              <button
                onClick={() => {
                  setSearch('')
                  setFilterSym('')
                  setFilterSev('')
                  setFilterFrom('')
                  setFilterTo('')
                  fetchEntries(1)
                }}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {loading &&
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse mb-3"
            >
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
            </div>
          ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              {hasActiveFilters
                ? 'No entries match your filters'
                : 'No entries yet'}
            </p>
            {!hasActiveFilters && (
              <Link
                to="/log"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Log your first symptom
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <EntryCard
                key={entry._id}
                entry={entry}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => fetchEntries(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => fetchEntries(page + 1)}
              disabled={page >= pages}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
