import jwt from 'jsonwebtoken'

// ── Base token verification ───────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
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
import User from '../models/User.js'

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
