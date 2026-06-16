import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// ── Base token verification ───────────────────────────────
// Verifies the JWT, then confirms the account still exists and is active.
// Loading the user here means a deactivated or deleted account is rejected
// on every request, not just at login.
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const account = await User.findById(payload.id).select('isActive role')
    if (!account)
      return res.status(401).json({ error: 'Account no longer exists' })
    if (!account.isActive)
      return res
        .status(403)
        .json({ error: 'Account has been deactivated. Contact support.' })

    // Trust the live role from the DB over the (possibly stale) token role
    req.user = { ...payload, role: account.role }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res
        .status(401)
        .json({ error: 'Token expired, please login again' })
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Role guard middleware factories ──────────────────────
// Usage: router.get('/admin-only', verifyToken, requireRole('admin'), handler)

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(
          ' or ',
        )}. Your role: ${req.user.role}`,
      })
    }
    next()
  }

export const requireAdmin = requireRole('admin')
export const requireDoctor = requireRole('doctor', 'admin') // admins can do everything doctors can
export const requirePatient = requireRole('patient', 'admin') // admins can do everything patients can

// ── Account active check ─────────────────────────────────
// Kept for explicit use, though verifyToken already enforces active accounts.
export const requireActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('isActive')
    if (!user || !user.isActive) {
      return res
        .status(403)
        .json({ error: 'Account has been deactivated. Contact support.' })
    }
    next()
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify account status' })
  }
}

export default verifyToken
