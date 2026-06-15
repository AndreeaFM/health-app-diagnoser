import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

// Usage:
//   node scripts/setRole.js <email> <role>
// Examples:
//   node scripts/setRole.js you@example.com admin
//   node scripts/setRole.js doc@example.com doctor
//
// Use this once to bootstrap your first admin (the admin API is itself
// admin-protected, so there is no in-app way to create the very first one).
// After that, admins can manage roles from the Admin Panel.

const VALID_ROLES = ['patient', 'doctor', 'admin']

async function run() {
  const [email, role] = process.argv.slice(2)

  if (!email || !role) {
    console.error('Usage: node scripts/setRole.js <email> <role>')
    console.error(`Roles: ${VALID_ROLES.join(', ')}`)
    process.exit(1)
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(
      `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`,
    )
    process.exit(1)
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in your .env')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)

  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    console.error(
      `No user found with email "${email}". Register that account first.`,
    )
    await mongoose.disconnect()
    process.exit(1)
  }

  const previous = user.role
  user.role = role
  // If we're promoting to doctor, mark verification as approved for consistency.
  if (role === 'doctor') {
    user.doctorVerification.status = 'approved'
    user.doctorVerification.reviewedAt = new Date()
  }
  await user.save()

  console.log(`✓ ${user.name} <${user.email}>: ${previous} → ${role}`)
  console.log(
    'Note: the user must log out and log back in to refresh their token.',
  )

  await mongoose.disconnect()
  process.exit(0)
}

run().catch(async (err) => {
  console.error('Failed:', err.message)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})
