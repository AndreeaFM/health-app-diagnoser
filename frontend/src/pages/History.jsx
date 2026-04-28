import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import SeverityBadge from '../components/SeverityBadge'
import { api } from '../api'

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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity={entry.severity} />
            <span className="text-sm font-medium text-gray-900">
              {entry.symptomTypes.join(', ')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-600">Area:</span>{' '}
            {entry.bodyAreas.join(', ')}
          </p>
          <p className="text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-600">Duration:</span>{' '}
            {entry.duration}
          </p>
          {entry.triggers?.length > 0 && (
            <p className="text-xs text-gray-500 mb-1">
              <span className="font-medium text-gray-600">Triggers:</span>{' '}
              {entry.triggers.join(', ')}
            </p>
          )}
          {entry.medication && (
            <p className="text-xs text-gray-500 mb-1">
              <span className="font-medium text-gray-600">Medication:</span>{' '}
              {entry.medication}
            </p>
          )}
          {entry.notes && (
            <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">
              "{entry.notes}"
            </p>
          )}
          {entry.mood && (
            <div className="mt-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                Mood: {entry.mood}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <span className="text-xs text-gray-400">
            {formatDate(entry.createdAt)}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`text-xs px-2.5 py-1 rounded-lg border transition ${
              confirm
                ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {deleting ? 'Deleting…' : confirm ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function History() {
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEntries = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get(`/api/symptoms?page=${p}&limit=10`)
      setEntries(data.entries)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries(1)
  }, [fetchEntries])

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((e) => e._id !== id))
    setTotal((prev) => prev - 1)
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Symptom history
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} {total === 1 ? 'entry' : 'entries'} total
            </p>
          </div>
          <Link
            to="/log"
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 transition"
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

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm mb-2">No entries yet</p>
            <Link to="/log" className="text-sm text-blue-600 hover:underline">
              Log your first symptom
            </Link>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => (
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
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => fetchEntries(page + 1)}
              disabled={page >= pages}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
