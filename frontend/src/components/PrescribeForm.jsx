import { useState } from 'react'
import { api } from '../api'

export default function PrescribeForm({
  patientId,
  patientName,
  onPrescribed,
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    medicationName: '',
    dosage: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.medicationName.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.post('/api/doctor/prescribe', {
        patientId,
        medicationName: form.medicationName.trim(),
        dosage: form.dosage.trim(),
        notes: form.notes.trim(),
      })
      setSaved(true)
      setForm({ medicationName: '', dosage: '', notes: '' })
      onPrescribed?.()
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950 transition"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M19.5 9.5l-7-7-9 9 7 7 9-9zM13 6l5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Prescribe medication
      </button>
    )
  }

  return (
    <div className="mt-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">
          Prescribe for {patientName}
        </p>
        <button
          onClick={() => setOpen(false)}
          className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 text-xs"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <input
          type="text"
          value={form.medicationName}
          onChange={(e) =>
            setForm((p) => ({ ...p, medicationName: e.target.value }))
          }
          placeholder="Medication name *"
          className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-purple-400 transition"
        />
        <input
          type="text"
          value={form.dosage}
          onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
          placeholder="Dosage (e.g. 500mg twice daily)"
          className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-purple-400 transition"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Instructions or notes for the patient (optional)"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-purple-400 resize-none transition"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.medicationName.trim()}
          className="px-4 py-2 text-sm font-medium bg-purple-700 text-white rounded-xl hover:bg-purple-800 disabled:opacity-40 transition"
        >
          {saving
            ? 'Prescribing…'
            : saved
              ? '✓ Prescribed'
              : 'Confirm prescription'}
        </button>
        <p className="text-xs text-purple-600 dark:text-purple-400">
          Patient will see this in their Medications page
        </p>
      </div>
    </div>
  )
}
