import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import TriageResult from './TriageResult'

const BODY_AREAS = [
  'Head',
  'Eyes',
  'Ears',
  'Nose',
  'Mouth/Jaw',
  'Neck',
  'Throat',
  'Shoulders',
  'Chest',
  'Upper back',
  'Lower back',
  'Stomach',
  'Abdomen',
  'Pelvis',
  'Arms',
  'Hands',
  'Hips',
  'Legs',
  'Knees',
  'Feet',
  'Skin',
  'Whole body',
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
  'Other',
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
  'Other',
]
const MOODS = ['Good', 'Okay', 'Low', 'Anxious', 'Tired', 'Other']
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

const EMPTY = {
  bodyAreas: [],
  bodyAreaOther: '',
  symptomTypes: [],
  symptomTypeOther: '',
  severity: null,
  duration: null,
  triggers: [],
  triggerOther: '',
  medication: '',
  notes: '',
  mood: null,
  moodOther: '',
}

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

function OtherInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full mt-3 px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 placeholder-gray-400 rounded-xl focus:outline-none focus:border-blue-400 transition"
    />
  )
}

export default function SymptomLogForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [triaging, setTriaging] = useState(false)
  const [error, setError] = useState('')
  const [savedEntry, setSavedEntry] = useState(null)
  const [triage, setTriage] = useState(null)
  const [summary, setSummary] = useState('')
  const [fallback, setFallback] = useState(false)

  const toggle = (field) => (val) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter((v) => v !== val)
        : [...prev[field], val],
    }))

  const set = (field) => (val) => setForm((prev) => ({ ...prev, [field]: val }))

  const needsBodyOther = form.bodyAreas.includes('Other')
  const needsSymptomOther = form.symptomTypes.includes('Other')
  const needsTriggerOther = form.triggers.includes('Other')
  const needsMoodOther = form.mood === 'Other'

  // Replace the literal "Other" chip with the user-typed value so the saved
  // entry stores the real area/symptom/trigger instead of "Other".
  // For optional fields, pass dropIfEmpty so a blank "Other" is removed
  // rather than stored literally.
  const withOther = (list, customText, { dropIfEmpty = false } = {}) => {
    if (!list.includes('Other')) return list
    const custom = customText.trim()
    if (custom) return list.map((v) => (v === 'Other' ? custom : v))
    return dropIfEmpty ? list.filter((v) => v !== 'Other') : list
  }

  const isValid =
    form.bodyAreas.length > 0 &&
    form.symptomTypes.length > 0 &&
    form.severity &&
    form.duration &&
    (!needsBodyOther || form.bodyAreaOther.trim()) &&
    (!needsSymptomOther || form.symptomTypeOther.trim())

  const handleSubmit = async () => {
    if (!isValid) return
    setSaving(true)
    setError('')
    try {
      // Step 1: save the entry (swap "Other" for the typed custom value)
      const payload = {
        ...form,
        bodyAreas: withOther(form.bodyAreas, form.bodyAreaOther),
        symptomTypes: withOther(form.symptomTypes, form.symptomTypeOther),
        triggers: withOther(form.triggers, form.triggerOther, {
          dropIfEmpty: true,
        }),
        mood: form.mood === 'Other' ? form.moodOther.trim() || null : form.mood,
      }
      const { entry } = await api.post('/api/symptoms', payload)
      setSavedEntry(entry)

      // Step 2: call triage (non-blocking UI — show loading state)
      setSaving(false)
      setTriaging(true)
      try {
        const triageData = await api.post(`/api/triage/entry/${entry._id}`, {})
        setTriage(triageData.triage)
        setSummary(triageData.summary || '')
        setFallback(!!triageData.fallback)
      } catch {
        // If triage fails entirely, show fallback
        setTriage({
          urgency: 'low',
          recommendation:
            'AI triage is temporarily unavailable. Monitor your symptoms and consult a doctor if they worsen.',
          seekCareIf: [
            'Symptoms worsen significantly',
            'You develop a high fever',
          ],
        })
        setFallback(true)
      } finally {
        setTriaging(false)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm(EMPTY)
    setSavedEntry(null)
    setTriage(null)
    setSummary('')
    setFallback(false)
    setError('')
  }

  // ── Success state: show triage result ──
  if (savedEntry) {
    return (
      <div>
        {/* Success banner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl mb-4">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">
              Entry saved successfully
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {savedEntry.symptomTypes.join(', ')} · {savedEntry.duration} ·
              severity {savedEntry.severity}/4
            </p>
          </div>
        </div>

        {/* Triage loading */}
        {triaging && (
          <div className="flex items-center gap-3 px-4 py-4 bg-blue-50 border border-blue-200 rounded-2xl mb-4">
            <svg
              className="animate-spin w-5 h-5 text-blue-500 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-blue-700">
              AI is analysing your symptoms…
            </p>
          </div>
        )}

        {/* Triage result */}
        {triage && !triaging && (
          <TriageResult
            triage={triage}
            summary={summary}
            entryId={savedEntry._id}
            fallback={fallback}
          />
        )}

        {/* Actions */}
        {!triaging && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50 transition"
            >
              Log another
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex-1 py-2.5 text-sm bg-gray-900 text-white rounded-2xl hover:bg-gray-700 transition"
            >
              View history
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Form state ──
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
        {needsBodyOther && (
          <OtherInput
            value={form.bodyAreaOther}
            onChange={set('bodyAreaOther')}
            placeholder="Which body area? e.g. left wrist"
          />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <Label required>Symptom type</Label>
        <ChipGroup
          options={SYMPTOM_TYPES}
          selected={form.symptomTypes}
          onToggle={toggle('symptomTypes')}
        />
        {needsSymptomOther && (
          <OtherInput
            value={form.symptomTypeOther}
            onChange={set('symptomTypeOther')}
            placeholder="Describe the symptom… e.g. tingling"
          />
        )}
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
          {needsTriggerOther && (
            <OtherInput
              value={form.triggerOther}
              onChange={set('triggerOther')}
              placeholder="What triggered it? e.g. caffeine"
            />
          )}
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
          placeholder="Describe what you feel in your own words…"
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
        {needsMoodOther && (
          <OtherInput
            value={form.moodOther}
            onChange={set('moodOther')}
            placeholder="How are you feeling? e.g. irritable"
          />
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || saving}
        className={`w-full py-3 rounded-2xl text-sm font-medium transition-all ${
          isValid && !saving
            ? 'bg-gray-900 text-white hover:bg-gray-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saving ? 'Saving…' : 'Save entry + get AI triage'}
      </button>

      {!isValid && (
        <p className="text-xs text-center text-gray-400">
          {(needsBodyOther && !form.bodyAreaOther.trim()) ||
          (needsSymptomOther && !form.symptomTypeOther.trim())
            ? 'Please describe your "Other" selection above'
            : 'Body area, symptom type, severity and duration are required'}
        </p>
      )}
    </div>
  )
}
