import express from 'express'
import SymptomEntry from '../models/SymptomEntry.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

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

    res.status(201).json({ entry })
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
