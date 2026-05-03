import express from 'express'
import OpenAI from 'openai'
import SymptomEntry from '../models/SymptomEntry.js'
import TriageSession from '../models/TriageSession.js'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()
router.use(verifyToken)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Prompt builder ────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a medical triage assistant. Your job is to assess symptom severity and give practical advice.

Rules:
- Always respond with a JSON object (no markdown, no backticks)
- The JSON must have exactly these fields:
  {
    "urgency": "low" | "moderate" | "high",
    "summary": "one sentence summary of what the user is experiencing",
    "recommendation": "2-3 sentences of practical advice",
    "seekCareIf": ["condition 1", "condition 2", "condition 3"]
  }
- urgency "low" = manageable at home, monitor symptoms
- urgency "moderate" = see a doctor within 24-48 hours
- urgency "high" = seek medical care today or call emergency services
- Never diagnose. Always recommend professional care for anything serious.
- Keep recommendation under 60 words.
- seekCareIf should have 2-4 short bullet points describing warning signs.`
}

function buildUserPrompt(user, entry, recentEntries) {
  const profile = []
  if (user.dateOfBirth) {
    const age = Math.floor(
      (Date.now() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)
    )
    profile.push(`Age: ${age}`)
  }
  if (user.gender) profile.push(`Gender: ${user.gender}`)
  if (user.medicalHistory?.length)
    profile.push(`Medical history: ${user.medicalHistory.join(', ')}`)
  if (user.allergies?.length)
    profile.push(`Allergies: ${user.allergies.join(', ')}`)

  const recentText =
    recentEntries.length > 0
      ? recentEntries
          .map((e, i) => {
            const date = new Date(e.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })
            return `  ${i + 1}. ${date}: ${e.symptomTypes.join(
              ', '
            )} in ${e.bodyAreas.join(', ')} — severity ${
              e.severity
            }/4, duration ${e.duration}${
              e.notes ? `, notes: "${e.notes}"` : ''
            }`
          })
          .join('\n')
      : '  No recent entries.'

  return `Patient profile:
${profile.length ? profile.join('\n') : 'No profile information provided.'}

Recent symptom history (last 7 days):
${recentText}

Current entry (just logged):
- Body areas: ${entry.bodyAreas.join(', ')}
- Symptoms: ${entry.symptomTypes.join(', ')}
- Severity: ${entry.severity}/4
- Duration: ${entry.duration}
- Triggers: ${
    entry.triggers?.length ? entry.triggers.join(', ') : 'none reported'
  }
- Medication taken: ${entry.medication || 'none'}
- Patient notes: "${entry.notes || 'none'}"
- Mood: ${entry.mood || 'not reported'}

Please assess this patient's condition and return a JSON triage response.`
}

// ── POST /api/triage/entry/:entryId ──────────────────────
// Called automatically after saving a symptom entry
router.post('/entry/:entryId', async (req, res) => {
  try {
    const entry = await SymptomEntry.findOne({
      _id: req.params.entryId,
      userId: req.user.id,
      deletedAt: null,
    })
    if (!entry) return res.status(404).json({ error: 'Entry not found' })

    // Get user profile for context
    const user = await User.findById(req.user.id).select('-passwordHash')

    // Get last 7 days of entries for context (excluding current)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentEntries = await SymptomEntry.find({
      userId: req.user.id,
      _id: { $ne: entry._id },
      deletedAt: null,
      createdAt: { $gte: weekAgo },
    })
      .sort({ createdAt: -1 })
      .limit(5)

    // Call GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(user, entry, recentEntries) },
      ],
    })

    const raw = completion.choices[0].message.content.trim()

    let triage
    try {
      triage = JSON.parse(raw)
    } catch {
      // If GPT returns markdown fences despite instructions, strip them
      const clean = raw.replace(/```json|```/g, '').trim()
      triage = JSON.parse(clean)
    }

    // Save triage result onto the entry
    entry.triage = {
      urgency: triage.urgency || 'low',
      recommendation: triage.recommendation || '',
      seekCareIf: triage.seekCareIf || [],
      generatedAt: new Date(),
    }
    await entry.save()

    res.status(200).json({
      triage: entry.triage,
      summary: triage.summary || '',
    })
  } catch (err) {
    console.error('Triage entry error:', err.message)
    // Don't fail the whole request if AI is down — return a safe fallback
    res.status(200).json({
      triage: {
        urgency: 'low',
        recommendation:
          'AI triage is temporarily unavailable. Monitor your symptoms and consult a doctor if they worsen.',
        seekCareIf: [
          'Symptoms worsen significantly',
          'You develop a high fever',
          'You feel you need urgent help',
        ],
        generatedAt: new Date(),
      },
      summary: 'AI triage unavailable — please monitor your symptoms.',
      fallback: true,
    })
  }
})

// ── POST /api/triage/chat ─────────────────────────────────
// Multi-turn chat with the AI triage assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, entryId } = req.body

    if (!message) return res.status(400).json({ error: 'Message is required' })

    // Load or create session
    let session
    if (sessionId) {
      session = await TriageSession.findOne({
        _id: sessionId,
        userId: req.user.id,
      })
    }
    if (!session) {
      session = new TriageSession({
        userId: req.user.id,
        entryId: entryId || null,
        messages: [],
      })
    }

    // Get context entry if linked
    let contextEntry = null
    if (session.entryId) {
      contextEntry = await SymptomEntry.findById(session.entryId)
    }

    // Add user message to session
    session.messages.push({ role: 'user', content: message })

    // Build messages for OpenAI
    const systemMsg = {
      role: 'system',
      content: `You are a helpful medical triage assistant. You answer follow-up questions about symptoms clearly and concisely. 
You never diagnose. You always recommend seeing a doctor for anything serious. 
Keep responses under 100 words. Be warm and reassuring but honest about when to seek care.
${
  contextEntry
    ? `\nThe patient recently logged: ${contextEntry.symptomTypes.join(
        ', '
      )} in ${contextEntry.bodyAreas.join(', ')}, severity ${
        contextEntry.severity
      }/4, duration ${contextEntry.duration}.`
    : ''
}`,
    }

    const chatMessages = [
      systemMsg,
      ...session.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 200,
      temperature: 0.5,
      messages: chatMessages,
    })

    const reply = completion.choices[0].message.content.trim()

    // Add assistant reply to session
    session.messages.push({ role: 'assistant', content: reply })
    await session.save()

    res.status(200).json({
      reply,
      sessionId: session._id,
    })
  } catch (err) {
    console.error('Triage chat error:', err.message)
    res
      .status(500)
      .json({ error: 'AI chat is temporarily unavailable. Please try again.' })
  }
})

// ── GET /api/triage/session/:sessionId ───────────────────
router.get('/session/:sessionId', async (req, res) => {
  try {
    const session = await TriageSession.findOne({
      _id: req.params.sessionId,
      userId: req.user.id,
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.status(200).json({ session })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

// ── POST /api/triage/session/:sessionId/resolve ──────────
router.post('/session/:sessionId/resolve', async (req, res) => {
  try {
    const session = await TriageSession.findOne({
      _id: req.params.sessionId,
      userId: req.user.id,
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    session.resolved = true
    await session.save()
    res.status(200).json({ message: 'Session resolved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve session' })
  }
})

export default router
