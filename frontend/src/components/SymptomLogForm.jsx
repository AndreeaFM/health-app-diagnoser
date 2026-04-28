import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const BODY_AREAS = [
  'Head',
  'Chest',
  'Stomach',
  'Back',
  'Throat',
  'Limbs',
  'Skin',
  'Other',
]
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
const TRIGGERS = [
  'Stress',
  'Poor sleep',
  'Alcohol',
  'Food',
  'Screen time',
  'Weather',
  'Exercise',
  'Unknown',
]
const MOODS = ['Good', 'Okay', 'Low', 'Anxious', 'Tired']
const DURATIONS = ['Under 1h', '1–6h', 'Half day', 'All day', 'Multi-day']
const SEVERITIES = [
  {
    label: 'Mild',
    value: 1,
    active: 'bg-green-50  text-green-800  border-green-300',
  },
  {
    label: 'Moderate',
    value: 2,
    active: 'bg-amber-50  text-amber-800  border-amber-300',
  },
  {
    label: 'Severe',
    value: 3,
    active: 'bg-orange-50 text-orange-800 border-orange-300',
  },
  {
    label: 'Very severe',
    value: 4,
    active: 'bg-red-50    text-red-800    border-red-300',
  },
]

function Label({ children, required }) {
  return (
    <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </span>
  )
}

function ChipGroup({ options, selected, onToggle, multi = true }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = multi ? selected.includes(opt) : selected === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              isActive
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

const EMPTY = {
  bodyAreas: [],
  symptomTypes: [],
  severity: null,
  duration: null,
  triggers: [],
  medication: '',
  notes: '',
  mood: null,
}

export default function SymptomLogForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggle = (field) => (val) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter((v) => v !== val)
        : [...prev[field], val],
    }))

  const set = (field) => (val) => setForm((prev) => ({ ...prev, [field]: val }))

  const isValid =
    form.bodyAreas.length > 0 &&
    form.symptomTypes.length > 0 &&
    form.severity &&
    form.duration

  const handleSubmit = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      await api.post('/api/symptoms', form)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#16a34a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Entry saved!
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Your symptoms have been logged.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setDone(false)
              setForm(EMPTY)
            }}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Log another
          </button>
          <button
            onClick={() => navigate('/history')}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition"
          >
            View history
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label required>Body area</Label>
        <ChipGroup
          options={BODY_AREAS}
          selected={form.bodyAreas}
          onToggle={toggle('bodyAreas')}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label required>Symptom type</Label>
        <ChipGroup
          options={SYMPTOM_TYPES}
          selected={form.symptomTypes}
          onToggle={toggle('symptomTypes')}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label required>Severity</Label>
        <div className="grid grid-cols-4 gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set('severity')(s.value)}
              className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                form.severity === s.value
                  ? s.active
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label required>Duration</Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set('duration')(d)}
              className={`px-3 py-1.5 text-sm rounded-xl border transition-all ${
                form.duration === d
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <Label>Possible triggers</Label>
          <ChipGroup
            options={TRIGGERS}
            selected={form.triggers}
            onToggle={toggle('triggers')}
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <Label>Medication taken</Label>
          <input
            type="text"
            value={form.medication}
            onChange={(e) => set('medication')(e.target.value)}
            placeholder="e.g. ibuprofen 400mg"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label>Notes</Label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes')(e.target.value)}
          placeholder="Describe what you feel…"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label>Mood today</Label>
        <ChipGroup
          options={MOODS}
          selected={form.mood}
          onToggle={(val) => set('mood')(val === form.mood ? null : val)}
          multi={false}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className={`w-full py-3 rounded-2xl text-sm font-medium transition-all ${
          isValid && !loading
            ? 'bg-gray-900 text-white hover:bg-gray-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? 'Saving…' : 'Save entry'}
      </button>

      {!isValid && (
        <p className="text-xs text-center text-gray-400">
          Body area, symptom type, severity and duration are required
        </p>
      )}
    </div>
  )
}
