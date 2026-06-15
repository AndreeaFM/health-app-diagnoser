import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { api } from '../api'

function formatExpiry(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ShareManager() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [label, setLabel] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [copied, setCopied] = useState('')

  const DURATIONS = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
    { label: '1 year', value: 365 },
    { label: '10 years', value: 3650 },
  ]
  const durationLabel = (d) =>
    DURATIONS.find((o) => o.value === Number(d))?.label || `${d} days`

  const BASE =
    import.meta.env.VITE_API_URL?.replace(':5001', '') ||
    'http://localhost:5174'

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.get('/api/share/my-tokens')
      setTokens(d.tokens)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const d = await api.post('/api/share/generate', {
        label: label || 'Shared with doctor',
        expiresInDays: Number(expiresInDays),
      })
      // Build frontend URL
      const url = `${BASE}/doctor/view/${d.shareToken.token}`
      setNewUrl(url)
      setLabel('')
      load()
    } catch (err) {
      alert('Failed to generate: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const extend = async (tokenId, days) => {
    try {
      await api.patch(`/api/share/${tokenId}/extend`, { expiresInDays: days })
      load()
    } catch (err) {
      alert('Failed to extend: ' + err.message)
    }
  }

  const revoke = async (tokenId) => {
    if (!window.confirm('Revoke this share link? The doctor will lose access.'))
      return
    try {
      await api.delete(`/api/share/${tokenId}`)
      setTokens((prev) => prev.filter((t) => t._id !== tokenId))
      if (newUrl) setNewUrl('')
    } catch (err) {
      alert('Failed to revoke: ' + err.message)
    }
  }

  const copy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Share with a doctor
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate a secure link to give a doctor read-only access to your
            symptom history.
          </p>
        </div>

        {/* Generate new link */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Generate a new share link
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Dr. Ionescu – Cardiology)"
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
            />
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition shrink-0"
            >
              {DURATIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Valid {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={generate}
              disabled={generating}
              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all shrink-0 ${
                generating
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
              }`}
            >
              {generating ? 'Generating…' : 'Generate link'}
            </button>
          </div>

          {newUrl && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                ✓ Share link created — send this to your doctor:
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={newUrl}
                  className="flex-1 px-3 py-2 text-xs border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                />
                <button
                  onClick={() => copy(newUrl, 'new')}
                  className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shrink-0"
                >
                  {copied === 'new' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                Valid for {durationLabel(expiresInDays)}. The doctor needs a
                doctor account to access it.
              </p>
            </div>
          )}
        </div>

        {/* Existing tokens */}
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Active share links ({tokens.length})
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse"
              >
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No active share links
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Generate one above to share with a doctor.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((t) => {
              const url = `${BASE}/doctor/view/${t.token}`
              const expired = new Date(t.expiresAt) < new Date()
              return (
                <div
                  key={t._id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {expired
                          ? '⚠️ Expired'
                          : `Expires ${formatExpiry(t.expiresAt)}`}
                      </p>
                      {t.doctorId && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                          ✓ Accepted by {t.doctorId.name || 'a doctor'}
                        </p>
                      )}
                      {!t.doctorId && !expired && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Waiting for doctor to accept
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!expired && (
                        <button
                          onClick={() => copy(url, t._id)}
                          className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          {copied === t._id ? 'Copied!' : 'Copy link'}
                        </button>
                      )}
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            extend(t._id, Number(e.target.value))
                          e.target.value = ''
                        }}
                        className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition focus:outline-none"
                        title="Extend expiry"
                      >
                        <option value="">
                          {expired ? 'Reactivate…' : 'Extend…'}
                        </option>
                        {DURATIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label} from now
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => revoke(t._id)}
                        className="text-xs px-2.5 py-1.5 border border-red-200 dark:border-red-800 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            How it works
          </p>
          <ol className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <li>1. Generate a link and send it to your doctor</li>
            <li>
              2. The doctor signs in with a doctor account and accepts the link
            </li>
            <li>
              3. They get read-only access to your last 90 days of symptom
              history
            </li>
            <li>4. You can revoke access at any time</li>
          </ol>
        </div>
      </div>
    </Layout>
  )
}
