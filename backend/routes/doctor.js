import express from 'express'
import mongoose from 'mongoose'
import DoctorNote from '../models/DoctorNote.js'
import ShareToken from '../models/ShareToken.js'
import SymptomEntry from '../models/SymptomEntry.js'
import MedicationLog from '../models/MedicationLog.js'
import User from '../models/User.js'
import verifyToken, { requireDoctor } from '../middleware/verifyToken.js'
import { audit } from '../services/audit.js'

const router = express.Router()
router.use(verifyToken, requireDoctor)

// GET /api/doctor/patients — all patients with active shares for this doctor
router.get('/patients', async (req, res) => {
  try {
    const shares = await ShareToken.find({
      doctorId: req.user.id,
      active: true,
    })
      .populate('patientId', 'name email dateOfBirth gender')
      .sort({ acceptedAt: -1 })

    // Enrich with last entry + stats per patient
    const patients = await Promise.all(
      shares.map(async (share) => {
        const patientId = new mongoose.Types.ObjectId(share.patientId._id)
        const from30 = new Date()
        from30.setDate(from30.getDate() - 30)

        const [lastEntry, recentEntries] = await Promise.all([
          SymptomEntry.findOne({ userId: patientId, deletedAt: null })
            .sort({ createdAt: -1 })
            .select('symptomTypes severity createdAt triage'),
          SymptomEntry.find({
            userId: patientId,
            deletedAt: null,
            createdAt: { $gte: from30 },
          }).select('severity triage'),
        ])

        const avgSeverity = recentEntries.length
          ? Math.round(
              (recentEntries.reduce((a, e) => a + e.severity, 0) /
                recentEntries.length) *
                10,
            ) / 10
          : null

        const highUrgency = recentEntries.filter(
          (e) => e.triage?.urgency === 'high',
        ).length

        return {
          shareId: share._id,
          token: share.token,
          patient: share.patientId,
          acceptedAt: share.acceptedAt,
          expiresAt: share.expiresAt,
          lastEntry,
          stats: {
            totalLast30: recentEntries.length,
            avgSeverity,
            highUrgency,
          },
        }
      }),
    )

    res.status(200).json({ patients })
  } catch (err) {
    console.error('Doctor patients error:', err.message)
    res.status(500).json({ error: 'Failed to fetch patients' })
  }
})

// POST /api/doctor/notes — add a note to a symptom entry
router.post('/notes', async (req, res) => {
  try {
    const { entryId, patientId, note, visibility = 'shared' } = req.body

    if (!entryId || !patientId || !note?.trim())
      return res
        .status(400)
        .json({ error: 'entryId, patientId and note are required' })

    // Verify this doctor has an active share with this patient
    const share = await ShareToken.findOne({
      doctorId: req.user.id,
      patientId,
      active: true,
    })
    if (!share)
      return res
        .status(403)
        .json({ error: 'You do not have access to this patient' })

    // Verify entry belongs to patient
    const entry = await SymptomEntry.findOne({
      _id: entryId,
      userId: patientId,
      deletedAt: null,
    })
    if (!entry) return res.status(404).json({ error: 'Entry not found' })

    const doctor = await User.findById(req.user.id).select('name')

    // Upsert — one note per doctor per entry
    const existing = await DoctorNote.findOne({
      entryId,
      doctorId: req.user.id,
    })

    if (existing) {
      existing.note = note.trim()
      existing.visibility = visibility
      await existing.save()
      return res.status(200).json({ note: existing })
    }

    const newNote = await DoctorNote.create({
      entryId,
      patientId,
      doctorId: req.user.id,
      doctorName: doctor.name,
      note: note.trim(),
      visibility,
    })

    audit(
      { id: req.user.id, name: doctor.name, role: 'doctor' },
      'doctor_added_note',
      { id: patientId },
      { entryId, visibility },
    )

    res.status(201).json({ note: newNote })
  } catch (err) {
    console.error('Doctor note error:', err.message)
    res.status(500).json({ error: 'Failed to save note' })
  }
})

// GET /api/doctor/notes/:entryId — get all notes for an entry (doctor sees all, patient sees only shared)
router.get('/notes/:entryId', async (req, res) => {
  try {
    const notes = await DoctorNote.find({
      entryId: req.params.entryId,
      doctorId: req.user.id,
    })
    res.status(200).json({ notes })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

// DELETE /api/doctor/notes/:noteId
router.delete('/notes/:noteId', async (req, res) => {
  try {
    const note = await DoctorNote.findOne({
      _id: req.params.noteId,
      doctorId: req.user.id,
    })
    if (!note) return res.status(404).json({ error: 'Note not found' })
    await note.deleteOne()
    res.status(200).json({ message: 'Note deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' })
  }
})

// POST /api/doctor/prescribe — prescribe a medication for a patient
// Creates a MedicationLog on behalf of the patient, flagged as prescribed
router.post('/prescribe', async (req, res) => {
  try {
    const { patientId, medicationName, dosage, notes } = req.body

    if (!patientId || !medicationName?.trim())
      return res
        .status(400)
        .json({ error: 'patientId and medicationName are required' })

    // Verify doctor has active share with this patient
    const share = await ShareToken.findOne({
      doctorId: req.user.id,
      patientId,
      active: true,
    })
    if (!share)
      return res
        .status(403)
        .json({ error: 'You do not have access to this patient' })

    const doctor = await User.findById(req.user.id).select('name')
    const patient = await User.findById(patientId).select('name')

    // Create a prescription record (MedicationLog with prescribedBy)
    const log = await MedicationLog.create({
      userId: patientId,
      entryId: new mongoose.Types.ObjectId(), // synthetic — not tied to specific entry
      medicationName: medicationName.trim(),
      dosage: dosage || '',
      prescribedBy: {
        doctorId: req.user.id,
        doctorName: doctor.name,
        notes: notes || '',
        prescribedAt: new Date(),
      },
    })

    audit(
      { id: req.user.id, name: doctor.name, role: 'doctor' },
      'doctor_prescribed_medication',
      { id: patientId, name: patient?.name || '' },
      { medicationName, dosage },
    )

    res.status(201).json({ log })
  } catch (err) {
    console.error('Prescribe error:', err.message)
    res.status(500).json({ error: 'Failed to prescribe medication' })
  }
})

// GET /api/doctor/prescriptions/:patientId — list prescriptions this doctor gave to a patient
router.get('/prescriptions/:patientId', async (req, res) => {
  try {
    const share = await ShareToken.findOne({
      doctorId: req.user.id,
      patientId: req.params.patientId,
      active: true,
    })
    if (!share)
      return res
        .status(403)
        .json({ error: 'No active share with this patient' })

    const prescriptions = await MedicationLog.find({
      userId: req.params.patientId,
      'prescribedBy.doctorId': req.user.id,
    }).sort({ createdAt: -1 })

    res.status(200).json({ prescriptions })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prescriptions' })
  }
})

export default router
