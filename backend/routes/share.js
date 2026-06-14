import express from 'express'
import crypto from 'crypto'
import mongoose from 'mongoose'
import ShareToken from '../models/ShareToken.js'
import SymptomEntry from '../models/SymptomEntry.js'
import User from '../models/User.js'
import verifyToken, { requireDoctor } from '../middleware/verifyToken.js'

const router = express.Router()

// ── PATIENT: generate a share token ──────────────────────
// POST /api/share/generate
router.post('/generate', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Only patients can generate share links' })
    }

    const { label } = req.body
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const shareToken = await ShareToken.create({
      patientId: req.user.id,
      token,
      label: label || 'Shared with doctor',
      expiresAt,
    })

    const shareUrl = `${process.env.CLIENT_URL}/doctor/view/${token}`
    res.status(201).json({ shareToken, shareUrl })
  } catch (err) {
    console.error('Generate share error:', err.message)
    res.status(500).json({ error: 'Failed to generate share link' })
  }
})

// ── PATIENT: list their active share tokens ───────────────
// GET /api/share/my-tokens
router.get('/my-tokens', verifyToken, async (req, res) => {
  try {
    const tokens = await ShareToken.find({
      patientId: req.user.id,
      active: true,
    })
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 })

    res.status(200).json({ tokens })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tokens' })
  }
})

// ── PATIENT: revoke a share token ────────────────────────
// DELETE /api/share/:tokenId
router.delete('/:tokenId', verifyToken, async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      _id: req.params.tokenId,
      patientId: req.user.id,
    })
    if (!shareToken) return res.status(404).json({ error: 'Token not found' })

    shareToken.active = false
    await shareToken.save()
    res.status(200).json({ message: 'Share link revoked' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke token' })
  }
})

// ── DOCTOR: validate a share token and get patient info ──
// GET /api/share/validate/:token
// Anyone can call this — it returns limited info before accepting
router.get('/validate/:token', async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      token: req.params.token,
      active: true,
    }).populate('patientId', 'name email')

    if (!shareToken)
      return res.status(404).json({ error: 'Invalid or expired share link' })
    if (shareToken.expiresAt < new Date()) {
      shareToken.active = false
      await shareToken.save()
      return res.status(410).json({ error: 'This share link has expired' })
    }

    res.status(200).json({
      valid: true,
      patient: {
        name: shareToken.patientId.name,
        email: shareToken.patientId.email,
      },
      expiresAt: shareToken.expiresAt,
      label: shareToken.label,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate token' })
  }
})

// ── DOCTOR: accept a share token (must be logged in as doctor) ──
// POST /api/share/accept/:token
router.post('/accept/:token', verifyToken, requireDoctor, async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      token: req.params.token,
      active: true,
    })

    if (!shareToken)
      return res.status(404).json({ error: 'Invalid or expired share link' })
    if (shareToken.expiresAt < new Date())
      return res.status(410).json({ error: 'Share link has expired' })

    // Link doctor to this share
    if (!shareToken.doctorId) {
      shareToken.doctorId = req.user.id
      shareToken.acceptedAt = new Date()
      await shareToken.save()
    }

    res
      .status(200)
      .json({ message: 'Access granted', patientId: shareToken.patientId })
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept token' })
  }
})

// ── DOCTOR: view shared patient data ─────────────────────
// GET /api/share/patient/:token  — full symptom history for this token
router.get('/patient/:token', verifyToken, requireDoctor, async (req, res) => {
  try {
    const shareToken = await ShareToken.findOne({
      token: req.params.token,
      active: true,
    })
    if (!shareToken)
      return res.status(404).json({ error: 'Invalid or revoked share link' })
    if (shareToken.expiresAt < new Date())
      return res.status(410).json({ error: 'Share link has expired' })

    const patientId = new mongoose.Types.ObjectId(shareToken.patientId)

    // Patient profile
    const patient = await User.findById(patientId).select(
      'name email dateOfBirth gender medicalHistory allergies',
    )

    // Last 90 days of symptom entries
    const from = new Date()
    from.setDate(from.getDate() - 90)
    const entries = await SymptomEntry.find({
      userId: patientId,
      deletedAt: null,
      createdAt: { $gte: from },
    }).sort({ createdAt: -1 })

    // Doctor notes for these entries (only this doctor's notes)
    const DoctorNote = (await import('../models/DoctorNote.js')).default
    const entryIds = entries.map((e) => e._id)
    const notes = await DoctorNote.find({
      entryId: { $in: entryIds },
      doctorId: req.user.id,
    })
    const notesByEntry = {}
    notes.forEach((n) => {
      notesByEntry[n.entryId.toString()] = n
    })

    // Basic stats
    const total = entries.length
    const avgSeverity = total
      ? Math.round((entries.reduce((a, e) => a + e.severity, 0) / total) * 10) /
        10
      : 0

    const highUrgency = entries.filter(
      (e) => e.triage?.urgency === 'high',
    ).length

    res.status(200).json({
      patient,
      entries,
      notesByEntry,
      stats: { total, avgSeverity, highUrgency },
      sharedAt: shareToken.createdAt,
      expiresAt: shareToken.expiresAt,
    })
  } catch (err) {
    console.error('Doctor view error:', err.message)
    res.status(500).json({ error: 'Failed to fetch patient data' })
  }
})

// ── DOCTOR: list patients who shared with them ───────────
// GET /api/share/my-patients
router.get('/my-patients', verifyToken, requireDoctor, async (req, res) => {
  try {
    const tokens = await ShareToken.find({
      doctorId: req.user.id,
      active: true,
    })
      .populate('patientId', 'name email')
      .sort({ acceptedAt: -1 })

    res.status(200).json({ patients: tokens })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patients' })
  }
})

export default router
