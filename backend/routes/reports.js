import express from 'express'
import PDFDocument from 'pdfkit'
import mongoose from 'mongoose'
import SymptomEntry from '../models/SymptomEntry.js'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

const SEV_LABEL = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Very severe' }
const URG_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High' }

// GET /api/reports/pdf?from=2025-01-01&to=2025-12-31
router.get('/pdf', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    const user = await User.findById(userId).select('-passwordHash')

    const filter = { userId, deletedAt: null }
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to)
    }

    const entries = await SymptomEntry.find(filter).sort({ createdAt: -1 })

    if (entries.length === 0) {
      return res
        .status(404)
        .json({ error: 'No entries found for this date range' })
    }

    // ── Build PDF ──────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="symptom-report-${Date.now()}.pdf"`
    )
    doc.pipe(res)

    const BLUE = '#3B82F6'
    const GRAY = '#6B7280'
    const LGRAY = '#E5E7EB'
    const BLACK = '#111827'

    // ── Cover ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 160).fill(BLUE)
    doc
      .fillColor('white')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Symptom Health Report', 50, 60)
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Generated for: ${user.name}`, 50, 95)
      .text(
        `Date: ${new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`,
        50,
        112
      )
      .text(`Entries included: ${entries.length}`, 50, 129)

    doc.moveDown(5)

    // ── Summary stats ──────────────────────────────────────
    doc.fillColor(BLACK).fontSize(14).font('Helvetica-Bold').text('Summary', 50)
    doc.moveDown(0.4)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(LGRAY).stroke()
    doc.moveDown(0.4)

    const avgSev = entries.reduce((a, e) => a + e.severity, 0) / entries.length
    const dates = entries.map((e) => new Date(e.createdAt))
    const oldest = new Date(Math.min(...dates)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const newest = new Date(Math.max(...dates)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    // Count top symptoms
    const symCount = {}
    entries.forEach((e) =>
      e.symptomTypes.forEach((s) => {
        symCount[s] = (symCount[s] || 0) + 1
      })
    )
    const topSym = Object.entries(symCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s)
      .join(', ')

    const highCount = entries.filter((e) => e.triage?.urgency === 'high').length
    const modCount = entries.filter(
      (e) => e.triage?.urgency === 'moderate'
    ).length

    const summaryRows = [
      ['Period covered', `${oldest} — ${newest}`],
      ['Total entries', `${entries.length}`],
      [
        'Average severity',
        `${SEV_LABEL[Math.round(avgSev)]} (${avgSev.toFixed(1)} / 4)`,
      ],
      ['Most frequent', topSym || 'N/A'],
      ['High urgency flags', `${highCount}`],
      ['Moderate urgency', `${modCount}`],
    ]

    summaryRows.forEach(([label, value]) => {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(GRAY)
        .text(label + ':', 50, doc.y, { continued: true, width: 160 })
      doc.font('Helvetica').fillColor(BLACK).text(value)
      doc.moveDown(0.3)
    })

    doc.moveDown(1)

    // ── Entries ────────────────────────────────────────────
    doc.fillColor(BLACK).fontSize(14).font('Helvetica-Bold').text('Symptom Log')
    doc.moveDown(0.4)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(LGRAY).stroke()
    doc.moveDown(0.6)

    entries.forEach((entry, idx) => {
      // Check if we need a new page
      if (doc.y > 680) doc.addPage()

      const date = new Date(entry.createdAt).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      // Entry header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(BLACK)
        .text(`${idx + 1}. ${entry.symptomTypes.join(', ')}`, 50, doc.y, {
          continued: true,
        })
      doc
        .font('Helvetica')
        .fillColor(GRAY)
        .text(`   ${date}`, { align: 'right' })

      // Entry details
      const details = [
        `Body area: ${entry.bodyAreas.join(', ')}`,
        `Severity: ${SEV_LABEL[entry.severity]}`,
        `Duration: ${entry.duration}`,
      ]
      if (entry.triggers?.length)
        details.push(`Triggers: ${entry.triggers.join(', ')}`)
      if (entry.medication) details.push(`Medication: ${entry.medication}`)
      if (entry.mood) details.push(`Mood: ${entry.mood}`)

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(GRAY)
        .text(details.join('   ·   '), 50, doc.y + 2, { width: 495 })

      if (entry.notes) {
        doc
          .fontSize(9)
          .fillColor('#9CA3AF')
          .font('Helvetica-Oblique')
          .text(`"${entry.notes}"`, 50, doc.y + 2, { width: 495 })
      }

      // Triage result
      if (entry.triage?.urgency) {
        const urgColor =
          entry.triage.urgency === 'high'
            ? '#DC2626'
            : entry.triage.urgency === 'moderate'
            ? '#D97706'
            : '#16A34A'

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(urgColor)
          .text(
            `AI Triage: ${
              URG_LABEL[entry.triage.urgency] || entry.triage.urgency
            } urgency`,
            50,
            doc.y + 3
          )

        if (entry.triage.recommendation) {
          doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor(GRAY)
            .text(entry.triage.recommendation, 50, doc.y + 1, { width: 495 })
        }
      }

      doc.moveDown(0.5)
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor(LGRAY)
        .lineWidth(0.5)
        .stroke()
      doc.moveDown(0.5)
    })

    // ── Footer ─────────────────────────────────────────────
    doc.moveDown(1)
    doc
      .fontSize(8)
      .fillColor(GRAY)
      .font('Helvetica')
      .text(
        'This report is generated by SymptomTracker and is for personal reference only. It does not constitute medical advice. Always consult a qualified healthcare professional for medical decisions.',
        50,
        doc.y,
        { width: 495, align: 'center' }
      )

    doc.end()
  } catch (err) {
    console.error('PDF report error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report' })
    }
  }
})

export default router
