import nodemailer from 'nodemailer'

// Returns a Gmail transporter, or null if credentials aren't configured.
export function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })
}

export function isEmailConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
}

/**
 * Send an email. Resolves to true if sent, false if email isn't configured.
 * Throws on actual send failure.
 */
export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter()
  if (!transporter) return false
  await transporter.sendMail({
    from: `"SymptomTracker" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  })
  return true
}
