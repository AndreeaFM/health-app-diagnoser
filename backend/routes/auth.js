import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import { audit } from '../services/audit.js'
import { sendEmail, isEmailConfigured } from '../services/email.js'

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
    const { name, email, password, requestDoctor, licenseNumber, consent } =
      req.body
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: 'Name, email and password are required' })
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' })
    if (!consent)
      return res.status(400).json({
        error:
          'You must agree to the processing of your health data to register',
      })

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
      consent: { accepted: true, acceptedAt: new Date() },
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

// POST /api/auth/forgot-password  { email }
// Always returns a generic success so the response doesn't reveal whether an
// account exists. Emails a reset link if the account is found.
router.post('/forgot-password', async (req, res) => {
  const generic = {
    message: 'If an account exists for that email, a reset link has been sent.',
  }
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(200).json(generic)

    // Raw token goes in the link; only its hash is stored.
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    user.resetPasswordToken = tokenHash
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`

    if (isEmailConfigured()) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your SymptomTracker password',
          text: `Reset your password using this link (valid for 1 hour): ${resetUrl}`,
          html: `<p>We received a request to reset your SymptomTracker password.</p>
                 <p><a href="${resetUrl}">Click here to choose a new password</a>. This link is valid for 1 hour.</p>
                 <p>If you didn't request this, you can ignore this email.</p>`,
        })
      } catch (mailErr) {
        console.error('Reset email failed:', mailErr.message)
      }
    } else {
      // Dev convenience: no email configured → log the link so it's testable.
      console.log(
        `[forgot-password] Email not configured. Reset link: ${resetUrl}`,
      )
    }

    res.status(200).json(generic)
  } catch (err) {
    console.error('Forgot password error:', err.message)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// POST /api/auth/reset-password/:token  { password }
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 6)
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' })

    const tokenHash = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex')

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    })
    if (!user)
      return res
        .status(400)
        .json({ error: 'This reset link is invalid or has expired' })

    user.passwordHash = await bcrypt.hash(password, 12)
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    res.status(200).json({ message: 'Password updated. You can now sign in.' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' })
})

export default router
