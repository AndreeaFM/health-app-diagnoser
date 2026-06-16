import 'dotenv/config'

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import symptomRoutes from './routes/symptoms.js'
import userRoutes from './routes/users.js'
import statsRoutes from './routes/stats.js'
import triageRoutes from './routes/triage.js'
import reportsRoutes from './routes/reports.js'
import notificationsRoutes from './routes/notifications.js'
import medicationsRoutes from './routes/medications.js'
import shareRoutes from './routes/share.js'
import adminRoutes from './routes/admin.js'
import onboardingRoutes from './routes/onboarding.js'
import insightsRoutes from './routes/insights.js'
import doctorRoutes from './routes/doctor.js'
import './models/AuditLog.js'
import './models/HealthInsight.js'
import './models/DoctorNote.js'

dotenv.config()

const app = express()

// Security headers
app.use(helmet())

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    credentials: true,
  }),
)
app.use(express.json())

// Rate limiting — a generous global cap, plus a strict cap on auth endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login/register attempts per IP per 15 min
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

app.get('/', (req, res) => res.json({ message: 'Symptom Tracker API ✓' }))

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/symptoms', symptomRoutes)
app.use('/api/users', userRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/triage', triageRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/medications', medicationsRoutes)
app.use('/api/share', shareRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/doctor', doctorRoutes)

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(process.env.PORT || 5001, () =>
      console.log(`Server running on port ${process.env.PORT || 5001}`),
    )
  })
  .catch((err) => {
    console.error('MongoDB error:', err.message)
    process.exit(1)
  })
