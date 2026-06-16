import express from 'express'
import SymptomEntry from '../models/SymptomEntry.js'
import MedicationLog from '../models/MedicationLog.js'
import DoctorNote from '../models/DoctorNote.js'
import verifyToken from '../middleware/verifyToken.js'
import { detectPatterns } from '../services/patternDetection.js'

const router = express.Router()
router.use(verifyToken)

// GET /api/symptoms/doctor-notes
// Returns the doctor notes shared with this patient, grouped by entry id.
// Private notes (visibility: 'private') are never returned here.
router.get('/doctor-notes', async (req, res) => {
  try {
    const notes = await DoctorNote.find({
      patientId: req.user.id,
      visibility: 'shared',
    })
      .sort({ createdAt: -1 })
      .select('entryId doctorName note createdAt')

    const notesByEntry = {}
    notes.forEach((n) => {
      const key = n.entryId.toString()
      if (!notesByEntry[key]) notesByEntry[key] = []
      notesByEntry[key].push(n)
    })

    res.status(200).json({ notesByEntry })
  } catch (err) {
    console.error('Fetch doctor notes error:', err.message)
    res.status(500).json({ error: 'Failed to fetch doctor notes' })
  }
})

// POST /api/symptoms
router.post('/', async (req, res) => {
  try {
    const {
      bodyAreas,
      symptomTypes,
      severity,
      duration,
      triggers,
      medication,
      notes,
      mood,
    } = req.body

    if (!bodyAreas || bodyAreas.length === 0)
      return res
        .status(400)
        .json({ error: 'At least one body area is required' })
    if (!symptomTypes || symptomTypes.length === 0)
      return res
        .status(400)
        .json({ error: 'At least one symptom type is required' })
    if (!severity || severity < 1 || severity > 4)
      return res.status(400).json({ error: 'Severity must be between 1 and 4' })
    if (!duration)
      return res.status(400).json({ error: 'Duration is required' })

    const entry = await SymptomEntry.create({
      userId: req.user.id,
      bodyAreas,
      symptomTypes,
      severity,
      duration,
      triggers: triggers || [],
      medication: medication || '',
      notes: notes || '',
      mood: mood || '',
    })

    // If the user recorded a medication, also create a MedicationLog so it
    // shows up on the Medications page and feeds the effectiveness tracker.
    if (medication && medication.trim()) {
      try {
        await MedicationLog.create({
          userId: req.user.id,
          entryId: entry._id,
          medicationName: medication.trim(),
          severityBefore: severity,
        })
      } catch (medErr) {
        console.error('Medication log create failed:', medErr.message)
        // Non-fatal — the symptom entry itself still succeeded.
      }
    }

    res.status(201).json({ entry })

    // Run pattern detection asynchronously — doesn't block the response
    detectPatterns(req.user.id).catch((err) =>
      console.error('Pattern detection failed:', err.message),
    )
  } catch (err) {
    console.error('Create symptom error:', err.message)
    res.status(500).json({ error: 'Failed to save symptom entry' })
  }
})

// GET /api/symptoms
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit

    const filter = { userId: req.user.id, deletedAt: null }

    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to)
    }

    const [entries, total] = await Promise.all([
      SymptomEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SymptomEntry.countDocuments(filter),
    ])

    res
      .status(200)
      .json({ entries, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('Get symptoms error:', err.message)
    res.status(500).json({ error: 'Failed to fetch symptom entries' })
  }
})

// GET /api/symptoms/:id
router.get('/:id', async (req, res) => {
  try {
    const entry = await SymptomEntry.findOne({
      _id: req.params.id,
      deletedAt: null,
    })
    if (!entry) return res.status(404).json({ error: 'Entry not found' })
    if (entry.userId.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' })
    res.status(200).json({ entry })
  } catch (err) {
    console.error('Get symptom error:', err.message)
    res.status(500).json({ error: 'Failed to fetch entry' })
  }
})

// PATCH /api/symptoms/:id
router.patch('/:id', async (req, res) => {
  try {
    const entry = await SymptomEntry.findOne({
      _id: req.params.id,
      deletedAt: null,
    })
    if (!entry) return res.status(404).json({ error: 'Entry not found' })
    if (entry.userId.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' })

    const allowed = ['notes', 'mood', 'medication', 'triggers']
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) entry[field] = req.body[field]
    })

    await entry.save()
    res.status(200).json({ entry })
  } catch (err) {
    console.error('Update symptom error:', err.message)
    res.status(500).json({ error: 'Failed to update entry' })
  }
})

// DELETE /api/symptoms/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const entry = await SymptomEntry.findOne({
      _id: req.params.id,
      deletedAt: null,
    })
    if (!entry) return res.status(404).json({ error: 'Entry not found' })
    if (entry.userId.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' })

    entry.deletedAt = new Date()
    await entry.save()
    res.status(200).json({ message: 'Entry deleted' })
  } catch (err) {
    console.error('Delete symptom error:', err.message)
    res.status(500).json({ error: 'Failed to delete entry' })
  }
})

export default router
