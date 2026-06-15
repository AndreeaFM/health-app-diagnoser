import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { api } from '../api'

const EFF = [
  {
    value: 'much_better',
    label: 'Much better',
    emoji: '😊',
    cls: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
  },
  {
    value: 'better',
    label: 'Better',
    emoji: '🙂',
    cls: 'bg-blue-100  dark:bg-blue-950  text-blue-800  dark:text-blue-300  border-blue-300  dark:border-blue-700',
  },
  {
    value: 'no_change',
    label: 'No change',
    emoji: '😐',
    cls: 'bg-gray-100  dark:bg-gray-800  text-gray-800  dark:text-gray-300  border-gray-300  dark:border-gray-600',
  },
  {
    value: 'worse',
    label: 'Worse',
    emoji: '😟',
    cls: 'bg-red-100   dark:bg-red-950   text-red-800   dark:text-red-300   border-red-300   dark:border-red-700',
  },
]
const SEV = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very severe' }

const EFF_LABEL = {
  much_better: 'Much better',
  better: 'Better',
  no_change: 'No change',
  worse: 'Worse',
}

// Compact row for the full medication history list.
function LoggedMedRow({ log }) {
  const taken = new Date(log.createdAt)
  const hoursAgo = (Date.now() - taken) / 3600000
  const prescribed = !!log.prescribedBy?.doctorId

  let status
  if (log.followedUp) {
    status = {
      text: log.effectiveness ? EFF_LABEL[log.effectiveness] : 'Followed up',
      cls: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    }
  } else if (hoursAgo >= 6) {
    status = {
      text: 'Follow-up ready',
      cls: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    }
  } else {
    const inHrs = Math.max(1, Math.ceil(6 - hoursAgo))
    status = {
      text: `Follow-up in ~${inHrs}h`,
      cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {log.medicationName}
          {log.dosage ? (
            <span className="text-gray-400 font-normal"> · {log.dosage}</span>
          ) : null}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {prescribed
            ? `Prescribed by ${log.prescribedBy.doctorName || 'doctor'} · `
            : ''}
          {taken.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
          {log.entryId?.symptomTypes?.length
            ? ` · for ${log.entryId.symptomTypes.join(', ')}`
            : ''}
        </p>
      </div>
      <span
        className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${status.cls}`}
      >
        {status.text}
      </span>
    </div>
  )
}

function FollowUpCard({ log, onDone }) {
  const [form, setForm] = useState({
    effectiveness: '',
    severityAfter: '',
    followUpNotes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.effectiveness) return
    setSaving(true)
    try {
      await api.patch(`/api/medications/${log._id}/followup`, {
        effectiveness: form.effectiveness,
        severityAfter: form.severityAfter
          ? Number(form.severityAfter)
          : undefined,
        followUpNotes: form.followUpNotes,
      })
      onDone(log._id)
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const entry = log.entryId
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {log.medicationName}
          </p>
          {log.dosage && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {log.dosage}
            </p>
          )}
          {entry && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              For: {entry.symptomTypes?.join(', ')} · sev {entry.severity}/4
            </p>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">
          Follow-up needed
        </span>
      </div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
        Did it help? (taken{' '}
        {Math.round((Date.now() - new Date(log.createdAt)) / 3600000)}h ago)
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {EFF.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setForm((p) => ({ ...p, effectiveness: opt.value }))}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              form.effectiveness === opt.value
                ? opt.cls
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
          >
            <span>{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setForm((p) => ({ ...p, severityAfter: s }))}
            className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
              Number(form.severityAfter) === s
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
          >
            {SEV[s].split(' ')[0]}
          </button>
        ))}
      </div>
      <textarea
        value={form.followUpNotes}
        onChange={(e) =>
          setForm((p) => ({ ...p, followUpNotes: e.target.value }))
        }
        placeholder="Any notes? (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:border-blue-400 mb-3"
      />
      <button
        onClick={handleSave}
        disabled={!form.effectiveness || saving}
        className={`w-full py-2 text-sm rounded-xl font-medium transition-all ${
          form.effectiveness && !saving
            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saving ? 'Saving…' : 'Save follow-up'}
      </button>
    </div>
  )
}

export default function Medications() {
  const [pending, setPending] = useState([])
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [p, l, s] = await Promise.all([
        api.get('/api/medications/pending'),
        api.get('/api/medications'),
        api.get('/api/medications/stats'),
      ])
      setPending(p.pending)
      setLogs(l.logs || [])
      setStats(s.stats)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Medication tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track whether your medications are actually helping.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {pending.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Awaiting follow-up ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((log) => (
                    <FollowUpCard
                      key={log._id}
                      log={log}
                      onDone={(id) => {
                        setPending((p) => p.filter((x) => x._id !== id))
                        load()
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-8">
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✓ No pending follow-ups
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                  Follow-ups appear 6h after logging a medication.
                </p>
              </div>
            )}

            {logs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Logged medications ({logs.length})
                </h2>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <LoggedMedRow key={log._id} log={log} />
                  ))}
                </div>
              </div>
            )}

            {stats.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Effectiveness summary
                </h2>
                <div className="space-y-4">
                  {stats.map((s) => (
                    <div
                      key={s.medication}
                      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {s.medication}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {s.total} follow-up{s.total !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {s.effectiveRate}%
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            effective
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-3">
                        {[
                          {
                            label: 'Much better',
                            v: s.muchBetter,
                            c: 'bg-green-500',
                          },
                          { label: 'Better', v: s.better, c: 'bg-blue-400' },
                          {
                            label: 'No change',
                            v: s.noChange,
                            c: 'bg-gray-400',
                          },
                          { label: 'Worse', v: s.worse, c: 'bg-red-400' },
                        ].map(({ label, v, c }) => (
                          <div key={label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                {label}
                              </span>
                              <span className="text-gray-400">
                                {v} (
                                {s.total > 0
                                  ? Math.round((v / s.total) * 100)
                                  : 0}
                                %)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                style={{
                                  width: `${
                                    s.total > 0
                                      ? Math.round((v / s.total) * 100)
                                      : 0
                                  }%`,
                                }}
                                className={`h-full rounded-full ${c}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {s.avgSevBefore && s.avgSevAfter && (
                        <div className="flex gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Before
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {SEV[Math.round(s.avgSevBefore)]}
                            </p>
                          </div>
                          <div className="self-center text-gray-300 dark:text-gray-600">
                            →
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              After
                            </p>
                            <p
                              className={`text-sm font-medium ${
                                s.avgSevAfter < s.avgSevBefore
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {SEV[Math.round(s.avgSevAfter)]}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.length === 0 &&
              pending.length === 0 &&
              logs.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No medication data yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Enter a medication when logging a symptom — follow-up
                    appears after 6h.
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </Layout>
  )
}
