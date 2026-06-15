import express from 'express'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'
import { audit } from '../services/audit.js'

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
      { new: true, runValidators: true },
    ).select('-passwordHash')

    res.status(200).json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// POST /api/users/request-doctor
// A patient submits a request to be verified as a doctor. An admin then
// approves/rejects it via /api/admin/verification/:id/approve|reject.
router.post('/request-doctor', async (req, res) => {
  try {
    if (req.user.role === 'doctor')
      return res.status(400).json({ error: 'You are already a doctor' })
    if (req.user.role === 'admin')
      return res
        .status(400)
        .json({ error: 'Admins do not need doctor verification' })

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.doctorVerification?.status === 'pending')
      return res
        .status(400)
        .json({ error: 'You already have a pending verification request' })

    const { specialization, licenseNumber, hospital } = req.body
    if (!licenseNumber || !licenseNumber.trim())
      return res
        .status(400)
        .json({ error: 'A license number is required to request verification' })

    user.doctorInfo = {
      specialization: specialization || '',
      licenseNumber: licenseNumber.trim(),
      hospital: hospital || '',
    }
    user.doctorVerification.status = 'pending'
    user.doctorVerification.requestedAt = new Date()
    user.doctorVerification.rejectionReason = ''
    await user.save()

    audit(
      { id: req.user.id, name: user.name, role: req.user.role },
      'doctor_verification_requested',
      { id: user._id, name: user.name },
    )

    res.status(200).json({
      message: 'Verification request submitted',
      doctorVerification: user.doctorVerification,
    })
  } catch (err) {
    console.error('Request doctor error:', err.message)
    res.status(500).json({ error: 'Failed to submit verification request' })
  }
})

export default router
