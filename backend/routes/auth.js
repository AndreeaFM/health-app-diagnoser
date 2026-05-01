import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

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
    const user = await User.create({ name, email, passwordHash })
    const token = generateToken(user)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileComplete: user.profileComplete,
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
        profileComplete: user.profileComplete,
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
