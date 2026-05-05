import express from 'express'
import nodemailer from 'nodemailer'
import mongoose from 'mongoose'
import SymptomEntry from '../models/SymptomEntry.js'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })
}

// GET /api/notifications/settings
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'emergencyContact reminderEnabled'
    )
    res.status(200).json({
      emergencyContact: user.emergencyContact || {
        name: '',
        email: '',
        phone: '',
      },
      reminderEnabled: user.reminderEnabled || false,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PATCH /api/notifications/settings
router.patch('/settings', async (req, res) => {
  try {
    const { emergencyContact, reminderEnabled } = req.body
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (emergencyContact !== undefined) user.emergencyContact = emergencyContact
    if (reminderEnabled !== undefined) user.reminderEnabled = reminderEnabled
    await user.save()
    res.status(200).json({
      message: 'Settings saved',
      emergencyContact: user.emergencyContact,
      reminderEnabled: user.reminderEnabled,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// POST /api/notifications/emergency
router.post('/emergency', async (req, res) => {
  try {
    const { entryId } = req.body
    const user = await User.findById(req.user.id)
    if (!user.emergencyContact?.email)
      return res
        .status(200)
        .json({ sent: false, reason: 'No emergency contact configured' })
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      return res
        .status(200)
        .json({ sent: false, reason: 'Email not configured on server' })

    let entryDetails = ''
    if (entryId) {
      const entry = await SymptomEntry.findById(entryId)
      if (entry) {
        entryDetails = `
          <p><strong>Symptoms:</strong> ${entry.symptomTypes.join(', ')}</p>
          <p><strong>Body area:</strong> ${entry.bodyAreas.join(', ')}</p>
          <p><strong>Severity:</strong> ${entry.severity}/4</p>
          <p><strong>Duration:</strong> ${entry.duration}</p>
          ${entry.notes ? `<p><strong>Notes:</strong> ${entry.notes}</p>` : ''}
          ${
            entry.triage?.recommendation
              ? `<p><strong>AI advice:</strong> ${entry.triage.recommendation}</p>`
              : ''
          }
        `
      }
    }

    await getTransporter().sendMail({
      from: `"SymptomTracker" <${process.env.EMAIL_USER}>`,
      to: user.emergencyContact.email,
      subject: `⚠️ Health Alert — ${user.name} may need attention`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#dc2626">Health Alert</h2>
          <p>Hi ${user.emergencyContact.name},</p>
          <p><strong>${user.name}</strong> has logged a HIGH urgency symptom and may need your support or medical attention.</p>
          ${entryDetails}
          <p style="color:#6b7280;font-size:13px;margin-top:24px">This is an automated message from SymptomTracker.</p>
        </div>`,
    })
    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('Emergency email error:', err.message)
    res.status(500).json({ error: 'Failed to send emergency email' })
  }
})

// POST /api/notifications/reminder
router.post('/reminder', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user.reminderEnabled)
      return res.status(200).json({ sent: false, reason: 'Reminders disabled' })
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      return res
        .status(200)
        .json({ sent: false, reason: 'Email not configured' })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const todayLog = await SymptomEntry.findOne({
      userId,
      deletedAt: null,
      createdAt: { $gte: todayStart },
    })
    if (todayLog)
      return res
        .status(200)
        .json({ sent: false, reason: 'Already logged today' })

    await getTransporter().sendMail({
      from: `"SymptomTracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '💊 Daily reminder — log your symptoms today',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#3B82F6">Hi ${user.name},</h2>
          <p>You haven't logged your symptoms yet today. Tracking consistently helps the AI give better advice.</p>
          <a href="${process.env.CLIENT_URL}/log" style="display:inline-block;background:#111827;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;margin-top:16px;font-size:14px">
            Log symptoms now
          </a>
        </div>`,
    })
    res.status(200).json({ sent: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reminder' })
  }
})

// POST /api/notifications/test
router.post('/test', async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      return res
        .status(400)
        .json({ error: 'EMAIL_USER and EMAIL_PASS not set in .env' })
    const user = await User.findById(req.user.id)
    await getTransporter().sendMail({
      from: `"SymptomTracker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '✓ SymptomTracker email test',
      html: `<p>Hi ${user.name}, your email notifications are working correctly.</p>`,
    })
    res.status(200).json({ sent: true, to: user.email })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
