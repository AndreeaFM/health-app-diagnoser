import express from 'express'
import mongoose from 'mongoose'
import MedicationLog from '../models/MedicationLog.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

// POST /api/medications
router.post('/', async (req, res) => {
  try {
    const { entryId, medicationName, dosage, severityBefore } = req.body
    if (!medicationName)
      return res.status(400).json({ error: 'Medication name is required' })
    const log = await MedicationLog.create({
      userId: req.user.id,
      entryId,
      medicationName,
      dosage: dosage || '',
      severityBefore: severityBefore || null,
    })
    res.status(201).json({ log })
  } catch (err) {
    res.status(500).json({ error: 'Failed to log medication' })
  }
})

// PATCH /api/medications/:id/followup
router.patch('/:id/followup', async (req, res) => {
  try {
    const { effectiveness, followUpNotes, severityAfter } = req.body
    const log = await MedicationLog.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
    if (!log) return res.status(404).json({ error: 'Not found' })
    log.effectiveness = effectiveness || ''
    log.followUpNotes = followUpNotes || ''
    log.severityAfter = severityAfter || null
    log.followedUp = true
    log.followUpAt = new Date()
    await log.save()
    res.status(200).json({ log })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save follow-up' })
  }
})

// GET /api/medications
router.get('/', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const logs = await MedicationLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('entryId', 'symptomTypes severity createdAt')
    res.status(200).json({ logs })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// GET /api/medications/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const stats = await MedicationLog.aggregate([
      { $match: { userId, followedUp: true } },
      {
        $group: {
          _id: '$medicationName',
          total: { $sum: 1 },
          muchBetter: {
            $sum: { $cond: [{ $eq: ['$effectiveness', 'much_better'] }, 1, 0] },
          },
          better: {
            $sum: { $cond: [{ $eq: ['$effectiveness', 'better'] }, 1, 0] },
          },
          noChange: {
            $sum: { $cond: [{ $eq: ['$effectiveness', 'no_change'] }, 1, 0] },
          },
          worse: {
            $sum: { $cond: [{ $eq: ['$effectiveness', 'worse'] }, 1, 0] },
          },
          avgSevBefore: { $avg: '$severityBefore' },
          avgSevAfter: { $avg: '$severityAfter' },
        },
      },
      {
        $project: {
          medication: '$_id',
          total: 1,
          muchBetter: 1,
          better: 1,
          noChange: 1,
          worse: 1,
          effectiveRate: {
            $round: [
              {
                $multiply: [
                  { $divide: [{ $add: ['$muchBetter', '$better'] }, '$total'] },
                  100,
                ],
              },
              0,
            ],
          },
          avgSevBefore: { $round: ['$avgSevBefore', 1] },
          avgSevAfter: { $round: ['$avgSevAfter', 1] },
          _id: 0,
        },
      },
      { $sort: { effectiveRate: -1 } },
    ])
    res.status(200).json({ stats })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/medications/pending
router.get('/pending', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const sixHours = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const pending = await MedicationLog.find({
      userId,
      followedUp: false,
      createdAt: { $lt: sixHours },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('entryId', 'symptomTypes severity')
    res.status(200).json({ pending })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending' })
  }
})

export default router
