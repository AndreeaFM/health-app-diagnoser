import { useState } from 'react'
import { api } from '../api'

const URGENCY_CONFIG = {
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    icon: '✓',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    label: 'Low urgency',
  },
  moderate: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    icon: '!',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    label: 'Moderate urgency',
  },
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    icon: '!!',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    label: 'High urgency — seek care today',
  },
}

export default function TriageResult({ triage, summary, entryId, fallback }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [sending, setSending] = useState(false)
  const [resolved, setResolved] = useState(false)

  if (!triage) return null

  const cfg = URGENCY_CONFIG[triage.urgency] || URGENCY_CONFIG.low

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setSending(true)
    try {
      const data = await api.post('/api/triage/chat', {
        message: userMsg,
        sessionId: sessionId || undefined,
        entryId,
      })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ])
      setSessionId(data.sessionId)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not process that. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async () => {
    if (sessionId) {
      try {
        await api.post(`/api/triage/session/${sessionId}/resolve`)
      } catch {}
    }
    setResolved(true)
    setChatOpen(false)
  }

  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} p-5 mt-4`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-9 h-9 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0`}
        >
          <span className={`text-sm font-bold ${cfg.iconColor}`}>
            {cfg.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-gray-900">
              AI Triage Result
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            {fallback && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                offline mode
              </span>
            )}
          </div>
          {summary && <p className="text-sm text-gray-600">{summary}</p>}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Recommendation
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          {triage.recommendation}
        </p>
      </div>

      {/* Seek care if */}
      {triage.seekCareIf?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Seek care if
          </p>
          <ul className="space-y-1">
            {triage.seekCareIf.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 mb-4">
        This is AI-generated guidance only and is not a medical diagnosis.
        Always consult a healthcare professional.
      </p>

      {/* Chat toggle */}
      {!resolved && (
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl transition"
        >
          {chatOpen ? 'Close chat' : 'Ask a follow-up question'}
        </button>
      )}

      {resolved && (
        <p className="text-sm text-gray-400">Session closed. Stay well!</p>
      )}

      {/* Chat window */}
      {chatOpen && !resolved && (
        <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {/* Messages */}
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                Ask anything about your symptoms or the triage advice above.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-xl text-sm text-gray-400">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a question…"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="px-3 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 transition"
            >
              Send
            </button>
          </div>

          {/* Resolve */}
          <div className="border-t border-gray-100 px-3 py-2 flex justify-end">
            <button
              onClick={handleResolve}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Close this session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
