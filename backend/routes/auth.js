import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { audit } from '../services/audit.js'

const router = express.Router()

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role, // ← role is now in the JWT
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '777d' },
  )

// POST /api/auth/register
// Creates a patient account. If requestDoctor is true, the account is still a
// patient but flagged for doctor verification (an admin approves it later).
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, requestDoctor, licenseNumber } = req.body
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: 'Name, email and password are required' })
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' })

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing)
      return res
        .status(400)
        .json({ error: 'An account with this email already exists' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'patient',
      ...(requestDoctor
        ? {
            doctorInfo: { licenseNumber: licenseNumber || '' },
            doctorVerification: {
              status: 'pending',
              requestedAt: new Date(),
            },
          }
        : {}),
    })

    if (requestDoctor) {
      audit(
        { id: user._id, name: user.name, role: 'patient' },
        'doctor_verification_requested',
        { id: user._id, name: user.name },
      )
    }

    const token = generateToken(user)

    res.status(201).json({
      token,
      doctorRequested: !!requestDoctor,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileComplete: user.profileComplete,
        onboarding: user.onboarding,
        doctorVerification: user.doctorVerification,
      },
    })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ error: 'Server error during registration' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' })

    if (!user.isActive)
      return res
        .status(403)
        .json({ error: 'Account has been deactivated. Contact support.' })

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch)
      return res.status(401).json({ error: 'Invalid email or password' })

    const token = generateToken(user)
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileComplete: user.profileComplete,
        onboarding: user.onboarding,
      },
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Server error during login' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' })
})

export default router
