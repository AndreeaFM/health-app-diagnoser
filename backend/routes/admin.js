import express from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import SymptomEntry from '../models/SymptomEntry.js'
import ShareToken from '../models/ShareToken.js'
import AuditLog from '../models/AuditLog.js'
import verifyToken, { requireAdmin } from '../middleware/verifyToken.js'
import { audit } from '../services/audit.js'

const router = express.Router()
router.use(verifyToken, requireAdmin)

// ── GET /api/admin/stats ──────────────────────────────────
// Platform-wide overview stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAdmins,
      totalEntries,
      activeShares,
      newUsersThisWeek,
      newEntriesThisWeek,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'admin' }),
      SymptomEntry.countDocuments({ deletedAt: null }),
      ShareToken.countDocuments({ active: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      SymptomEntry.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        deletedAt: null,
      }),
    ])

    // Top symptoms across all patients
    const topSymptoms = await SymptomEntry.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: '$symptomTypes' },
      { $group: { _id: '$symptomTypes', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ])

    // Entries per day last 14 days
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const activityOverTime = await SymptomEntry.aggregate([
      { $match: { deletedAt: null, createdAt: { $gte: twoWeeksAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ])

    res.status(200).json({
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAdmins,
      totalEntries,
      activeShares,
      newUsersThisWeek,
      newEntriesThisWeek,
      topSymptoms,
      activityOverTime,
    })
  } catch (err) {
    console.error('Admin stats error:', err.message)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})

// ── GET /api/admin/users ──────────────────────────────────
// List all users with pagination + search
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit
    const search = req.query.search || ''
    const role = req.query.role || ''

    const filter = {}
    if (search)
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    if (role) filter.role = role

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ])

    // Add entry count per user
    const userIds = users.map((u) => u._id)
    const entryCounts = await SymptomEntry.aggregate([
      { $match: { userId: { $in: userIds }, deletedAt: null } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ])
    const countMap = {}
    entryCounts.forEach((e) => {
      countMap[e._id.toString()] = e.count
    })

    const usersWithCounts = users.map((u) => ({
      ...u.toObject(),
      entryCount: countMap[u._id.toString()] || 0,
    }))

    res.status(200).json({
      users: usersWithCounts,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Admin list users error:', err.message)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// ── PATCH /api/admin/users/:id/role ──────────────────────
// Change a user's role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body
    if (!['patient', 'doctor', 'admin'].includes(role))
      return res
        .status(400)
        .json({ error: 'Invalid role. Must be patient, doctor, or admin' })

    // Prevent admin from removing their own admin role
    if (req.params.id === req.user.id && role !== 'admin')
      return res
        .status(400)
        .json({ error: 'You cannot remove your own admin role' })

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select('-passwordHash')

    if (!user) return res.status(404).json({ error: 'User not found' })

    audit(
      { id: req.user.id, name: req.user.name || 'Admin', role: 'admin' },
      'admin_role_changed',
      { id: user._id, name: user.name },
      { newRole: role },
    )

    res.status(200).json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' })
  }
})

// ── PATCH /api/admin/users/:id/status ────────────────────
// Activate / deactivate a user account
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body
    if (typeof isActive !== 'boolean')
      return res.status(400).json({ error: 'isActive must be true or false' })

    if (req.params.id === req.user.id)
      return res
        .status(400)
        .json({ error: 'You cannot deactivate your own account' })

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true },
    ).select('-passwordHash')

    if (!user) return res.status(404).json({ error: 'User not found' })
    res.status(200).json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' })
  }
})

// ── GET /api/admin/users/:id ──────────────────────────────
// Get full profile for a specific user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash')
    if (!user) return res.status(404).json({ error: 'User not found' })

    const entryCount = await SymptomEntry.countDocuments({
      userId: req.params.id,
      deletedAt: null,
    })
    const recentEntries = await SymptomEntry.find({
      userId: req.params.id,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(5)

    res
      .status(200)
      .json({ user: { ...user.toObject(), entryCount }, recentEntries })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// ── DELETE /api/admin/users/:id ───────────────────────────
// Hard delete a user and all their data (irreversible)
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res
        .status(400)
        .json({ error: 'You cannot delete your own account' })

    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      SymptomEntry.deleteMany({ userId: req.params.id }),
      ShareToken.deleteMany({
        $or: [{ patientId: req.params.id }, { doctorId: req.params.id }],
      }),
    ])

    res.status(200).json({ message: 'User and all associated data deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// ── GET /api/admin/verification/pending ──────────────────
// List users with pending doctor verification requests
router.get('/verification/pending', async (req, res) => {
  try {
    const pending = await User.find({
      'doctorVerification.status': 'pending',
    })
      .select('-passwordHash')
      .sort({ 'doctorVerification.requestedAt': 1 })

    res.status(200).json({ pending })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending verifications' })
  }
})

// ── PATCH /api/admin/verification/:id/approve ─────────────
router.patch('/verification/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.role = 'doctor'
    user.doctorVerification.status = 'approved'
    user.doctorVerification.reviewedAt = new Date()
    user.doctorVerification.reviewedBy = req.user.id
    await user.save()

    audit(
      { id: req.user.id, name: req.user.name || 'Admin', role: 'admin' },
      'doctor_verification_approved',
      { id: user._id, name: user.name },
    )

    res.status(200).json({ message: 'Doctor approved', user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve doctor' })
  }
})

// ── PATCH /api/admin/verification/:id/reject ──────────────
router.patch('/verification/:id/reject', async (req, res) => {
  try {
    const { reason = '' } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.doctorVerification.status = 'rejected'
    user.doctorVerification.reviewedAt = new Date()
    user.doctorVerification.reviewedBy = req.user.id
    user.doctorVerification.rejectionReason = reason
    await user.save()

    audit(
      { id: req.user.id, name: req.user.name || 'Admin', role: 'admin' },
      'doctor_verification_rejected',
      { id: user._id, name: user.name },
      { reason },
    )

    res.status(200).json({ message: 'Doctor rejected' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject doctor' })
  }
})

// ── GET /api/admin/audit-log ──────────────────────────────
router.get('/audit-log', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit
    const action = req.query.action || ''

    const filter = {}
    if (action) filter.action = action

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ])

    res.status(200).json({ logs, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log' })
  }
})

export default router
