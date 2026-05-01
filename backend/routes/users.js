import express from 'express'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.status(200).json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// PATCH /api/users/me
router.patch('/me', async (req, res) => {
  try {
    const allowed = [
      'name',
      'dateOfBirth',
      'gender',
      'medicalHistory',
      'allergies',
    ]
    const updates = {}
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f]
    })

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No valid fields to update' })

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...updates, profileComplete: true },
      { new: true, runValidators: true }
    ).select('-passwordHash')

    res.status(200).json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
