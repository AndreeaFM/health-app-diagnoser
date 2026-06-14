import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api'

// ── Step indicators ───────────────────────────────────────
function Steps({ current }) {
  const steps = [
    { n: 1, label: 'Profile' },
    { n: 2, label: 'First symptom' },
    { n: 3, label: 'Dashboard' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                s.n < current
                  ? 'bg-green-500 text-white'
                  : s.n === current
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}
            >
              {s.n < current ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span
              className={`text-xs mt-1 ${
                s.n === current
                  ? 'text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-16 mx-2 mb-4 transition-all ${
                s.n < current ? 'bg-green-500' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Profile ───────────────────────────────────────
const CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Heart disease',
  'Anxiety',
  'Depression',
  'Migraine',
]
const ALLERGIES = ['Penicillin', 'Aspirin', 'Ibuprofen', 'Peanuts', 'Shellfish']

function StepProfile({ onNext }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    dateOfBirth: '',
    gender: '',
    medicalHistory: [],
    allergies: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (field) => (val) =>
    setForm((p) => ({
      ...p,
      [field]: p[field].includes(val)
        ? p[field].filter((v) => v !== val)
        : [...p[field], val],
    }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.patch('/api/users/me', {
        name: form.name,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        medicalHistory: form.medicalHistory,
        allergies: form.allergies,
      })
      await api.patch('/api/onboarding/complete-step', {
        step: 'profileFilled',
      })
      onNext()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Tell us about yourself
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        This helps the AI give you more accurate triage. You can update it
        later.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Full name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Date of birth
            </label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) =>
                setForm((p) => ({ ...p, dateOfBirth: e.target.value }))
              }
              className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Gender
            </label>
            <select
              value={form.gender}
              onChange={(e) =>
                setForm((p) => ({ ...p, gender: e.target.value }))
              }
              className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Medical conditions (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle('medicalHistory')(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  form.medicalHistory.includes(c)
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Known allergies (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALLERGIES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggle('allergies')(a)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  form.allergies.includes(a)
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onNext}
          className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
            saving
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
          }`}
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Log first symptom ─────────────────────────────
const SYMPTOMS = ['Headache', 'Fatigue', 'Pain', 'Nausea', 'Cough', 'Dizziness']
const BODY_AREAS = ['Head', 'Chest', 'Stomach', 'Back', 'Throat', 'Limbs']
const SEVS = [
  { l: 'Mild', v: 1 },
  { l: 'Moderate', v: 2 },
  { l: 'Severe', v: 3 },
  { l: 'Very severe', v: 4 },
]
const DURS = ['Under 1h', '1–6h', 'Half day', 'All day']

function StepFirstEntry({ onNext }) {
  const [form, setForm] = useState({
    bodyAreas: [],
    symptomTypes: [],
    severity: null,
    duration: null,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (f) => (v) =>
    setForm((p) => ({
      ...p,
      [f]: p[f].includes(v) ? p[f].filter((x) => x !== v) : [...p[f], v],
    }))

  const isValid =
    form.bodyAreas.length > 0 &&
    form.symptomTypes.length > 0 &&
    form.severity &&
    form.duration

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError('')
    try {
      await api.post('/api/symptoms', form)
      await api.patch('/api/onboarding/complete-step', {
        step: 'firstEntryLogged',
      })
      onNext()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Log your first symptom
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Try logging how you feel right now — this unlocks the dashboard charts.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Body area <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {BODY_AREAS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggle('bodyAreas')(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  form.bodyAreas.includes(a)
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Symptom type <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle('symptomTypes')(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  form.symptomTypes.includes(s)
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Severity <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SEVS.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setForm((p) => ({ ...p, severity: s.v }))}
                className={`py-2.5 text-sm font-medium rounded-xl border transition-all ${
                  form.severity === s.v
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Duration <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DURS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((p) => ({ ...p, duration: d }))}
                className={`px-3 py-1.5 text-sm rounded-xl border transition-all ${
                  form.duration === d
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Notes (optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Describe how you feel…"
            rows={2}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:border-blue-400 transition"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onNext}
          className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
            isValid && !saving
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : 'Save entry'}
        </button>
      </div>
    </div>
  )
}

// ── Step 3: All done ──────────────────────────────────────
function StepDone({ onFinish }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-5">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        You're all set!
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
        Your account is ready. Log symptoms daily for the best insights — the AI
        gets smarter the more data you provide.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8 text-left">
        {[
          {
            icon: '📊',
            title: 'Dashboard',
            desc: 'View charts of your health trends',
          },
          {
            icon: '🩺',
            title: 'AI Triage',
            desc: 'Get instant advice after each log',
          },
          {
            icon: '📄',
            title: 'PDF Reports',
            desc: 'Export and share with your doctor',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
          >
            <p className="text-xl mb-1">{f.icon}</p>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {f.title}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-2xl hover:bg-gray-700 dark:hover:bg-gray-300 transition"
      >
        Go to my dashboard
      </button>
    </div>
  )
}

// ── Main Onboarding page ──────────────────────────────────
export default function Onboarding() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const { updateUser } = useAuth()

  const handleFinish = async () => {
    try {
      await api.patch('/api/onboarding/complete-step', { step: 'completed' })
      updateUser({
        onboarding: {
          completed: true,
          profileFilled: true,
          firstEntryLogged: true,
        },
      })
    } catch {}
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21C6.37 15.5 1 10.7 1 6.6 1 3.2 4.07 2 6.28 2c1.31 0 4.15.5 5.72 4.5C13.57 2.5 16.4 2 17.72 2 19.93 2 23 3.2 23 6.6 23 10.7 17.63 15.5 12 21z"
                  fill="#3B82F6"
                />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              SymptomTracker
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Let's get you set up in 2 minutes
          </p>
        </div>

        <Steps current={step} />

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          {step === 1 && <StepProfile onNext={() => setStep(2)} />}
          {step === 2 && <StepFirstEntry onNext={() => setStep(3)} />}
          {step === 3 && <StepDone onFinish={handleFinish} />}
        </div>
      </div>
    </div>
  )
}
