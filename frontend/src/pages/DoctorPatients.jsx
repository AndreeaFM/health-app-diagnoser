import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api'

const SEV_LABEL = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very severe' }
const SEV_COLOR = {
  1: 'text-green-600 dark:text-green-400',
  2: 'text-amber-600 dark:text-amber-400',
  3: 'text-orange-600 dark:text-orange-400',
  4: 'text-red-600 dark:text-red-400',
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default function DoctorPatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/api/doctor/patients')
      .then((d) => setPatients(d.patients || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            My patients
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Patients who have shared their symptom history with you
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && patients.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No patients yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Patients will appear here once they share their history with you
            </p>
          </div>
        )}

        {!loading && patients.length > 0 && (
          <div className="space-y-3">
            {patients.map((p) => {
              const avgSev = p.stats.avgSeverity
              const sevRounded = avgSev ? Math.round(avgSev) : null
              return (
                <div
                  key={p.shareId}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:border-gray-200 dark:hover:border-gray-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                        {p.patient.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {p.patient.name}
                          </p>
                          {p.stats.highUrgency > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-full font-medium">
                              {p.stats.highUrgency} high urgency
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {p.patient.email}
                        </p>

                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Last logged
                            </p>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {p.lastEntry
                                ? timeAgo(p.lastEntry.createdAt)
                                : 'No entries'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Entries (30d)
                            </p>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {p.stats.totalLast30}
                            </p>
                          </div>
                          {sevRounded && (
                            <div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Avg severity
                              </p>
                              <p
                                className={`text-xs font-medium ${SEV_COLOR[sevRounded]}`}
                              >
                                {SEV_LABEL[sevRounded]}
                              </p>
                            </div>
                          )}
                          {p.lastEntry?.symptomTypes?.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Latest
                              </p>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                                {p.lastEntry.symptomTypes.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/doctor/view/${p.token}`)}
                      className="shrink-0 px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-300 transition"
                    >
                      View records
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Sharing since{' '}
                      {new Date(p.acceptedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Expires{' '}
                      {new Date(p.expiresAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
