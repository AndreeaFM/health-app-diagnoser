import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
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

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {subtitle}
        </p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

function Input({ value, onChange, type = 'text', placeholder, ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition"
    />
  )
}

function DoctorRequestFields({ docForm, setDocForm, onSubmit, submitting }) {
  const set = (field) => (e) =>
    setDocForm((p) => ({ ...p, [field]: e.target.value }))
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>License number *</FieldLabel>
        <Input
          value={docForm.licenseNumber}
          onChange={set('licenseNumber')}
          placeholder="e.g. RO-123456"
        />
      </div>
      <div>
        <FieldLabel>Specialization</FieldLabel>
        <Input
          value={docForm.specialization}
          onChange={set('specialization')}
          placeholder="e.g. General practice"
        />
      </div>
      <div>
        <FieldLabel>Hospital / clinic</FieldLabel>
        <Input
          value={docForm.hospital}
          onChange={set('hospital')}
          placeholder="e.g. County Hospital"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={submitting || !docForm.licenseNumber.trim()}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
          submitting || !docForm.licenseNumber.trim()
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
        }`}
      >
        {submitting ? 'Submitting…' : 'Request doctor access'}
      </button>
    </div>
  )
}

function TagToggle({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
            selected.includes(opt)
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
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
  const [notifSettings, setNotifSettings] = useState({
    emergencyContact: { name: '', email: '', phone: '' },
    reminderEnabled: false,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [verification, setVerification] = useState({ status: 'none' })
  const [docForm, setDocForm] = useState({
    specialization: '',
    licenseNumber: '',
    hospital: '',
  })
  const [requestingDoctor, setRequestingDoctor] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/users/me'),
      api.get('/api/notifications/settings'),
    ])
      .then(([{ user: u }, notif]) => {
        setForm({
          name: u.name || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
          gender: u.gender || '',
          medicalHistory: u.medicalHistory || [],
          allergies: u.allergies || [],
        })
        setNotifSettings({
          emergencyContact: notif.emergencyContact || {
            name: '',
            email: '',
            phone: '',
          },
          reminderEnabled: notif.reminderEnabled || false,
        })
        setVerification(u.doctorVerification || { status: 'none' })
        setDocForm({
          specialization: u.doctorInfo?.specialization || '',
          licenseNumber: u.doctorInfo?.licenseNumber || '',
          hospital: u.doctorInfo?.hospital || '',
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
    setSuccess('')
    try {
      const { user: updated } = await api.patch('/api/users/me', {
        name: form.name,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        medicalHistory: form.medicalHistory,
        allergies: form.allergies,
      })
      login(token, { ...user, name: updated.name })
      setSuccess('profile')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotif = async () => {
    setSavingNotif(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/api/notifications/settings', notifSettings)
      setSuccess('notif')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingNotif(false)
    }
  }

  const handleRequestDoctor = async () => {
    if (!docForm.licenseNumber.trim()) {
      setError('A license number is required to request doctor access')
      return
    }
    setRequestingDoctor(true)
    setError('')
    try {
      const { doctorVerification } = await api.post(
        '/api/users/request-doctor',
        docForm,
      )
      setVerification(doctorVerification)
    } catch (err) {
      setError(err.message)
    } finally {
      setRequestingDoctor(false)
    }
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    try {
      const data = await api.post('/api/notifications/test', {})
      alert(
        data.sent
          ? `Test email sent to ${data.to}`
          : `Not sent: ${data.reason}`,
      )
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-6 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 animate-pulse"
            >
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-full" />
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Your profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This information helps the AI give you more accurate triage advice.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success === 'profile' && (
          <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Profile saved
          </div>
        )}
        {success === 'notif' && (
          <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Notification settings saved
          </div>
        )}

        {/* Basic info */}
        <Section title="Basic information">
          <div className="space-y-4">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <FieldLabel>Date of birth</FieldLabel>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                }
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
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
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
        <Section
          title="Medical history"
          subtitle="Select conditions you have been diagnosed with."
        >
          <TagToggle
            options={COMMON_CONDITIONS}
            selected={form.medicalHistory}
            onToggle={toggleArray('medicalHistory')}
          />
          <div className="mt-3">
            <FieldLabel>Other (comma-separated)</FieldLabel>
            <Input
              placeholder="e.g. Celiac disease, Lupus"
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
        <Section
          title="Allergies"
          subtitle="Select known allergies, especially to medications."
        >
          <TagToggle
            options={COMMON_ALLERGIES}
            selected={form.allergies}
            onToggle={toggleArray('allergies')}
          />
          <div className="mt-3">
            <FieldLabel>Other (comma-separated)</FieldLabel>
            <Input
              placeholder="e.g. Codeine, Sulfa drugs"
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

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-2xl text-sm font-medium transition-all mb-6 ${
            saving
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
          }`}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>

        {/* Emergency contact */}
        <Section
          title="Emergency contact"
          subtitle="If a HIGH urgency triage result is detected, an alert email will be sent to this person."
        >
          <div className="space-y-3">
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={notifSettings.emergencyContact.name}
                onChange={(e) =>
                  setNotifSettings((p) => ({
                    ...p,
                    emergencyContact: {
                      ...p.emergencyContact,
                      name: e.target.value,
                    },
                  }))
                }
                placeholder="e.g. Maria Popescu"
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                value={notifSettings.emergencyContact.email}
                onChange={(e) =>
                  setNotifSettings((p) => ({
                    ...p,
                    emergencyContact: {
                      ...p.emergencyContact,
                      email: e.target.value,
                    },
                  }))
                }
                placeholder="maria@example.com"
              />
            </div>
            <div>
              <FieldLabel>Phone (optional)</FieldLabel>
              <Input
                value={notifSettings.emergencyContact.phone}
                onChange={(e) =>
                  setNotifSettings((p) => ({
                    ...p,
                    emergencyContact: {
                      ...p.emergencyContact,
                      phone: e.target.value,
                    },
                  }))
                }
                placeholder="+40 700 000 000"
              />
            </div>
          </div>
        </Section>

        {/* Daily reminders */}
        <Section
          title="Daily reminders"
          subtitle="Get an email reminder if you haven't logged your symptoms by 8pm."
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Email reminders
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Sent to {user?.email}
              </p>
            </div>
            <button
              onClick={() =>
                setNotifSettings((p) => ({
                  ...p,
                  reminderEnabled: !p.reminderEnabled,
                }))
              }
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                notifSettings.reminderEnabled
                  ? 'bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  notifSettings.reminderEnabled
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="flex-1 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition disabled:opacity-40"
            >
              {testingEmail ? 'Sending…' : 'Send test email'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Requires EMAIL_USER and EMAIL_PASS set in backend .env (Gmail app
            password).
          </p>
        </Section>

        <button
          onClick={handleSaveNotif}
          disabled={savingNotif}
          className={`w-full py-3 rounded-2xl text-sm font-medium transition-all ${
            savingNotif
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
          }`}
        >
          {savingNotif ? 'Saving…' : 'Save notification settings'}
        </button>

        {/* Doctor access — only relevant for patient accounts */}
        {user?.role === 'patient' && (
          <div className="mt-4">
            <Section
              title="Doctor access"
              subtitle="Are you a clinician? Request a verified doctor account to view patients who share their records with you."
            >
              {verification.status === 'pending' ? (
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                  Your request is pending review by an administrator.
                </div>
              ) : verification.status === 'rejected' ? (
                <div className="space-y-3">
                  <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                    Your previous request was rejected
                    {verification.rejectionReason
                      ? `: ${verification.rejectionReason}`
                      : '.'}{' '}
                    You can update your details and request again.
                  </div>
                  <DoctorRequestFields
                    docForm={docForm}
                    setDocForm={setDocForm}
                    onSubmit={handleRequestDoctor}
                    submitting={requestingDoctor}
                  />
                </div>
              ) : (
                <DoctorRequestFields
                  docForm={docForm}
                  setDocForm={setDocForm}
                  onSubmit={handleRequestDoctor}
                  submitting={requestingDoctor}
                />
              )}
            </Section>
          </div>
        )}
      </div>
    </Layout>
  )
}
