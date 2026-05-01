import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say']
const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
}

const COMMON_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Heart disease',
  'Thyroid disorder',
  'Anxiety',
  'Depression',
  'Migraine',
  'Arthritis',
]

const COMMON_ALLERGIES = [
  'Penicillin',
  'Aspirin',
  'Ibuprofen',
  'Peanuts',
  'Shellfish',
  'Latex',
  'Pollen',
  'Dust mites',
]

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

function TagToggle({ options, selected, onToggle, labelMap }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
              isActive
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {labelMap ? labelMap[opt] : opt}
          </button>
        )
      })}
    </div>
  )
}

export default function Profile() {
  const { user, login, token } = useAuth()

  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    medicalHistory: [],
    allergies: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Load current profile
  useEffect(() => {
    api
      .get('/api/users/me')
      .then(({ user: u }) => {
        setForm({
          name: u.name || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
          gender: u.gender || '',
          medicalHistory: u.medicalHistory || [],
          allergies: u.allergies || [],
        })
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const toggleArray = (field) => (val) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter((v) => v !== val)
        : [...prev[field], val],
    }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const { user: updated } = await api.patch('/api/users/me', {
        name: form.name,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        medicalHistory: form.medicalHistory,
        allergies: form.allergies,
      })
      // Update stored user name in context
      login(token, { ...user, name: updated.name })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-6 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
            >
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Your profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            This information helps the AI give you more accurate triage advice.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Profile saved successfully
          </div>
        )}

        {/* Basic info */}
        <Section title="Basic information">
          <div className="space-y-4">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
              />
            </div>
            <div>
              <FieldLabel>Date of birth</FieldLabel>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
              />
            </div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        gender: p.gender === g ? '' : g,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      form.gender === g
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {GENDER_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Medical history */}
        <Section title="Medical history">
          <p className="text-xs text-gray-400 mb-3">
            Select any conditions you have been diagnosed with.
          </p>
          <TagToggle
            options={COMMON_CONDITIONS}
            selected={form.medicalHistory}
            onToggle={toggleArray('medicalHistory')}
          />
          <div className="mt-3">
            <FieldLabel>Other (comma-separated)</FieldLabel>
            <input
              type="text"
              placeholder="e.g. Celiac disease, Lupus"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
              onBlur={(e) => {
                const extras = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                setForm((p) => ({
                  ...p,
                  medicalHistory: [
                    ...new Set([...p.medicalHistory, ...extras]),
                  ],
                }))
                e.target.value = ''
              }}
            />
          </div>
        </Section>

        {/* Allergies */}
        <Section title="Allergies">
          <p className="text-xs text-gray-400 mb-3">
            Select known allergies, especially to medications.
          </p>
          <TagToggle
            options={COMMON_ALLERGIES}
            selected={form.allergies}
            onToggle={toggleArray('allergies')}
          />
          <div className="mt-3">
            <FieldLabel>Other (comma-separated)</FieldLabel>
            <input
              type="text"
              placeholder="e.g. Codeine, Sulfa drugs"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
              onBlur={(e) => {
                const extras = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                setForm((p) => ({
                  ...p,
                  allergies: [...new Set([...p.allergies, ...extras])],
                }))
                e.target.value = ''
              }}
            />
          </div>
        </Section>

        {/* Account info (read-only) */}
        <Section title="Account">
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-700">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
        </Section>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-2xl text-sm font-medium transition-all ${
            saving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </Layout>
  )
}
