import 'dotenv/config'

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import symptomRoutes from './routes/symptoms.js'
import userRoutes from './routes/users.js'
import statsRoutes from './routes/stats.js'
import triageRoutes from './routes/triage.js'
import reportsRoutes from './routes/reports.js'

dotenv.config()

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    credentials: true,
  })
)
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Symptom Tracker API is running ✓' })
})

app.use('/api/auth', authRoutes)
app.use('/api/symptoms', symptomRoutes)
app.use('/api/users', userRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/triage', triageRoutes)
app.use('/api/reports', reportsRoutes)

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(process.env.PORT || 5001, () => {
      console.log(`Server running on port ${process.env.PORT || 5001}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  })
