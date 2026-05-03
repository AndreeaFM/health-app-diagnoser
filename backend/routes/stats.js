import express from 'express'
import mongoose from 'mongoose'
import SymptomEntry from '../models/SymptomEntry.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

// GET /api/stats/summary?days=30
router.get('/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const from = new Date()
    from.setDate(from.getDate() - days)

    // Cast to ObjectId — this is the fix
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const filter = { userId, deletedAt: null, createdAt: { $gte: from } }

    const totalEntries = await SymptomEntry.countDocuments(filter)

    if (totalEntries === 0) {
      return res.status(200).json({
        totalEntries: 0,
        avgSeverity: 0,
        topSymptoms: [],
        topTriggers: [],
        severityOverTime: [],
        moodOverTime: [],
      })
    }

    const [avgResult] = await SymptomEntry.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: '$severity' } } },
    ])
    const avgSeverity = Math.round((avgResult?.avg || 0) * 10) / 10

    const topSymptoms = await SymptomEntry.aggregate([
      { $match: filter },
      { $unwind: '$symptomTypes' },
      { $group: { _id: '$symptomTypes', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ])

    const topTriggers = await SymptomEntry.aggregate([
      { $match: { ...filter, 'triggers.0': { $exists: true } } },
      { $unwind: '$triggers' },
      { $group: { _id: '$triggers', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ])

    const severityOverTime = await SymptomEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          avg: { $avg: '$severity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          avg: { $round: ['$avg', 1] },
          count: 1,
          _id: 0,
        },
      },
    ])

    const moodOverTime = await SymptomEntry.aggregate([
      { $match: { ...filter, mood: { $ne: '' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          mood: { $last: '$mood' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', mood: 1, _id: 0 } },
    ])

    res.status(200).json({
      totalEntries,
      avgSeverity,
      topSymptoms,
      topTriggers,
      severityOverTime,
      moodOverTime,
    })
  } catch (err) {
    console.error('Stats summary error:', err.message)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/stats/patterns
router.get('/patterns', async (req, res) => {
  try {
    const from = new Date()
    from.setDate(from.getDate() - 7)

    const userId = new mongoose.Types.ObjectId(req.user.id)
    const filter = { userId, deletedAt: null, createdAt: { $gte: from } }

    const frequent = await SymptomEntry.aggregate([
      { $match: filter },
      { $unwind: '$symptomTypes' },
      {
        $group: {
          _id: '$symptomTypes',
          count: { $sum: 1 },
          lastSeen: { $max: '$createdAt' },
        },
      },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $project: { symptom: '$_id', count: 1, lastSeen: 1, _id: 0 } },
    ])

    const flags = frequent.map((f) => ({
      symptom: f.symptom,
      count: f.count,
      lastSeen: f.lastSeen,
      message: `${f.symptom} has appeared ${f.count} times in the last 7 days`,
    }))

    res.status(200).json({ recurringSymptoms: frequent, flags })
  } catch (err) {
    console.error('Stats patterns error:', err.message)
    res.status(500).json({ error: 'Failed to fetch patterns' })
  }
})

export default router
