import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import SeverityBadge from '../components/SeverityBadge'
import PrescribeForm from '../components/PrescribeForm'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const BAR_COLORS = [
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
]
const SEV_LABEL = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very severe' }
const URGENCY = {
  low: 'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100   text-red-700',
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

// ── Doctor note widget per entry ──────────────────────────
function DoctorNoteWidget({ entry, patientId, existingNote }) {
  const [saved, setSaved] = useState(existingNote || null)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(existingNote?.note || '')
  const [visibility, setVisibility] = useState(
    existingNote?.visibility || 'shared',
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await api.post('/api/doctor/notes', {
        entryId: entry._id,
        patientId,
        note: note.trim(),
        visibility,
      })
      setSaved({ note: note.trim(), visibility })
      setEditing(false)
    } catch (err) {
      alert('Failed to save note: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Display mode: a saved note exists and we're not editing ──
  if (saved && !editing) {
    return (
      <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Your clinical note
          </p>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              saved.visibility === 'shared'
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            {saved.visibility === 'shared' ? 'Visible to patient' : 'Private'}
          </span>
        </div>
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {saved.note}
        </p>
        <button
          onClick={() => {
            setNote(saved.note)
            setVisibility(saved.visibility)
            setEditing(true)
          }}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Edit note
        </button>
      </div>
    )
  }

  // ── No note yet and not editing → "Add" button ──
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Add clinical note
      </button>
    )
  }

  // ── Editing mode ──
  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Your clinical note
        </p>
        <div className="flex items-center gap-2">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none"
          >
            <option value="shared">Visible to patient</option>
            <option value="private">Private (doctor only)</option>
          </select>
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Write your clinical assessment or recommendation for this entry…"
        className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none transition"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={saving || !note.trim()}
          className="text-xs px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition"
        >
          {saving ? 'Saving…' : 'Save note'}
        </button>
        <button
          onClick={() => {
            setEditing(false)
            setNote(saved?.note || '')
            setVisibility(saved?.visibility || 'shared')
          }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          Cancel
        </button>
        {visibility === 'shared' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            Patient will see this note
          </p>
        )}
      </div>
    </div>
  )
}

// ── Accept token page (for guests / not-yet-logged-in doctors) ──
function AcceptView({ token }) {
  const navigate = useNavigate()
  const { isAuthenticated, isDoctor, isAdmin } = useAuth()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    api
      .get(`/api/share/validate/${token}`)
      .then((d) => setInfo(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login, then come back
      navigate(`/login?redirect=/doctor/view/${token}`)
      return
    }
    if (!isDoctor && !isAdmin) {
      setError(
        'Only doctor accounts can accept share links. Ask an admin to change your role.',
      )
      return
    }
    setAccepting(true)
    try {
      await api.post(`/api/share/accept/${token}`, {})
      navigate(`/doctor/view/${token}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-8 max-w-sm w-full text-center">
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:underline"
          >
            Go home
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Patient health record shared
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {info?.patient?.name}
          </span>{' '}
          has shared their symptom history with you.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          Expires{' '}
          {new Date(info?.expiresAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className={`w-full py-3 text-sm font-medium rounded-xl transition-all ${
            accepting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700'
          }`}
        >
          {accepting
            ? 'Accepting…'
            : isAuthenticated
              ? 'View patient records'
              : 'Sign in to view records'}
        </button>
      </div>
    </div>
  )
}

// ── Main doctor view ──────────────────────────────────────
export default function DoctorView() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, logout, isDoctor, isAdmin, isAuthenticated } = useAuth()
  const [data, setData] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)

  const loadPrescriptions = (patientId) => {
    api
      .get(`/api/doctor/prescriptions/${patientId}`)
      .then((d) => setPrescriptions(d.prescriptions || []))
      .catch(() => {})
  }

  useEffect(() => {
    if (!isAuthenticated || (!isDoctor && !isAdmin)) {
      setLoading(false)
      return
    }
    api
      .get(`/api/share/patient/${token}`)
      .then((d) => {
        setData(d)
        setAccepted(true)
        if (d.patient?._id) loadPrescriptions(d.patient._id)
      })
      .catch((err) => {
        if (err.message.includes('404') || err.message.includes('revoked')) {
          setAccepted(false)
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [token, isAuthenticated, isDoctor, isAdmin])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-400">Loading patient data…</p>
      </div>
    )

  if (!accepted || !isAuthenticated || (!isDoctor && !isAdmin)) {
    return <AcceptView token={token} />
  }

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 p-8 max-w-sm w-full text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )

  const { patient, entries, stats, notesByEntry = {} } = data

  // Build top symptoms for chart
  const symCount = {}
  entries.forEach((e) =>
    e.symptomTypes.forEach((s) => {
      symCount[s] = (symCount[s] || 0) + 1
    }),
  )
  const topSymptoms = Object.entries(symCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Doctor nav bar — identity + navigation (this page has no sidebar) */}
      <div className="bg-gray-900 dark:bg-gray-950 border-b border-gray-800 px-6 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/doctor/patients"
            className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            My patients
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Signed in as{' '}
              <span className="text-gray-200 font-medium">
                {user?.name || user?.email}
              </span>
              {user?.role ? ` · ${user.role}` : ''}
            </span>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="text-xs text-gray-300 hover:text-white border border-gray-700 rounded-lg px-2.5 py-1 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
              {patient?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {patient?.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {patient?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-full font-medium">
              Read-only view
            </span>
            <span className="text-xs text-gray-400">
              Expires{' '}
              {new Date(data.expiresAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Patient info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Patient profile
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {patient?.dateOfBirth && (
              <div>
                <p className="text-xs text-gray-400">Age</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  {Math.floor(
                    (Date.now() - new Date(patient.dateOfBirth)) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )}{' '}
                  years
                </p>
              </div>
            )}
            {patient?.gender && (
              <div>
                <p className="text-xs text-gray-400">Gender</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">
                  {patient.gender.replace('_', ' ')}
                </p>
              </div>
            )}
            {patient?.medicalHistory?.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Medical history</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.medicalHistory.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {patient?.allergies?.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <span
                      key={a}
                      className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-full"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Doctor actions */}
        <PrescribeForm
          patientId={patient._id}
          patientName={patient.name}
          onPrescribed={() => loadPrescriptions(patient._id)}
        />

        {/* Prescriptions this doctor has given */}
        {prescriptions.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Your prescriptions ({prescriptions.length})
            </h2>
            <div className="space-y-2">
              {prescriptions.map((p) => (
                <div
                  key={p._id}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {p.medicationName}
                      {p.dosage ? (
                        <span className="text-gray-400 font-normal">
                          {' '}
                          · {p.dosage}
                        </span>
                      ) : null}
                    </p>
                    {p.prescribedBy?.notes ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {p.prescribedBy.notes}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(
                      p.prescribedBy?.prescribedAt || p.createdAt,
                    ).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Entries (90d)', value: stats.total },
            {
              label: 'Avg severity',
              value: stats.avgSeverity
                ? SEV_LABEL[Math.round(stats.avgSeverity)]
                : '—',
            },
            {
              label: 'Severe entries',
              value: stats.severeCount ?? 0,
              highlight: (stats.severeCount ?? 0) > 0,
              sub: stats.highUrgency
                ? `${stats.highUrgency} flagged high by AI`
                : null,
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border p-4 ${
                s.highlight
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
              }`}
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {s.label}
              </p>
              <p
                className={`text-2xl font-semibold ${
                  s.highlight
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {s.value}
              </p>
              {s.sub && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {s.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Top symptoms chart */}
        {topSymptoms.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Most frequent symptoms
            </h2>
            <ResponsiveContainer
              width="100%"
              height={Math.max(120, topSymptoms.length * 36)}
            >
              <BarChart
                data={topSymptoms}
                layout="vertical"
                margin={{ right: 16, left: 0 }}
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
                  width={130}
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
                  {topSymptoms.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Symptom history */}
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Symptom history (last 90 days)
        </h2>
        {entries.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-400">No entries in this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry._id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <SeverityBadge severity={entry.severity} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.symptomTypes.join(', ')}
                      </span>
                      {entry.triage?.urgency && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            URGENCY[entry.triage.urgency] || ''
                          }`}
                        >
                          AI: {entry.triage.urgency}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {entry.bodyAreas.join(', ')} · {entry.duration}
                    </p>
                    {entry.triggers?.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Triggers: {entry.triggers.join(', ')}
                      </p>
                    )}
                    {entry.medication && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Medication: {entry.medication}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">
                        "{entry.notes}"
                      </p>
                    )}
                    {entry.triage?.recommendation && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5">
                        AI: {entry.triage.recommendation}
                      </p>
                    )}
                    <DoctorNoteWidget
                      entry={entry}
                      patientId={patient._id}
                      existingNote={notesByEntry[entry._id]}
                    />
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
