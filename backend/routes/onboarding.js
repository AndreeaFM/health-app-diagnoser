import express from 'express'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

// GET /api/onboarding/status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'onboarding profileComplete name'
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.status(200).json({
      onboarding: user.onboarding,
      profileComplete: user.profileComplete,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch onboarding status' })
  }
})

// PATCH /api/onboarding/complete-step
// Called by frontend after each step is done
router.patch('/complete-step', async (req, res) => {
  try {
    const { step } = req.body
    // step can be: 'profileFilled' | 'firstEntryLogged' | 'completed'

    const validSteps = ['profileFilled', 'firstEntryLogged', 'completed']
    if (!validSteps.includes(step))
      return res.status(400).json({
        error: `Invalid step. Must be one of: ${validSteps.join(', ')}`,
      })

    const update = { [`onboarding.${step}`]: true }

    // Auto-mark completed if both prerequisite steps are done
    const user = await User.findById(req.user.id).select('onboarding')
    if (
      (step === 'firstEntryLogged' && user.onboarding.profileFilled) ||
      (step === 'profileFilled' && user.onboarding.firstEntryLogged)
    ) {
      update['onboarding.completed'] = true
    }
    if (step === 'completed') {
      update['onboarding.completed'] = true
    }

    const updated = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
    }).select('onboarding')

    res.status(200).json({ onboarding: updated.onboarding })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding step' })
  }
})

export default router
