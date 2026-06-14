import express from 'express'
import HealthInsight from '../models/HealthInsight.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

// GET /api/insights — active (non-dismissed) insights for current user
router.get('/', async (req, res) => {
  try {
    const insights = await HealthInsight.find({
      userId: req.user.id,
      dismissed: false,
    }).sort({ level: -1, createdAt: -1 }) // urgent first

    res.status(200).json({ insights })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch insights' })
  }
})

// PATCH /api/insights/:id/dismiss
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const insight = await HealthInsight.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
    if (!insight) return res.status(404).json({ error: 'Insight not found' })

    insight.dismissed = true
    insight.dismissedAt = new Date()
    await insight.save()

    res.status(200).json({ message: 'Dismissed' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss insight' })
  }
})

// PATCH /api/insights/:id/acted-on — mark as acted on (user shared with doctor)
router.patch('/:id/acted-on', async (req, res) => {
  try {
    const insight = await HealthInsight.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
    if (!insight) return res.status(404).json({ error: 'Insight not found' })

    insight.actedOn = true
    insight.actedOnAt = new Date()
    insight.dismissed = true
    insight.dismissedAt = new Date()
    await insight.save()

    res.status(200).json({ message: 'Marked as acted on' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update insight' })
  }
})

export default router
