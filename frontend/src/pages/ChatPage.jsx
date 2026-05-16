import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useDiagnostic } from '../context/DiagnosticContext'

function Icon({ name, filled = false, size = 'text-2xl', className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${size} ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}

/* Render AI message text — bold (**text**) and bullet points */
function MessageText({ text }) {
  const lines = text.split('\n')
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        // Render **bold**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        const rendered = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} className="text-on-surface font-semibold">{p.slice(2, -2)}</strong>
            : p
        )
        // Bullet point styling
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#cbbefb', marginTop: '6px' }} />
              <span className="text-body-md text-on-surface/90 leading-relaxed">{rendered}</span>
            </div>
          )
        }
        return <p key={i} className="text-body-md text-on-surface/90 leading-relaxed">{rendered}</p>
      })}
    </div>
  )
}

const SUGGESTED = [
  'Give me a summary of my kidney health',
  'Is my creatinine level concerning?',
  'What does my BUN value mean?',
  'Am I at risk for CKD?',
  'How has my kidney function changed over time?',
]

export default function ChatPage() {
  const { visits } = useDiagnostic()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState(null) // null | 'active' | 'inactive'
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const hasData = visits && visits.length > 0

  /* Check AI health on mount */
  useEffect(() => {
    axios.get('/health')
      .then(r => setAiStatus(r.data.nephora_ai === 'active' ? 'active' : 'inactive'))
      .catch(() => setAiStatus('inactive'))
  }, [])

  /* Auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Build the visit payload the backend expects */
  const buildVisitPayload = useCallback(() => {
    if (!visits?.length) return null
    return visits.map(v => v.visitPayload || v)
  }, [visits])

  /* Send a message */
  const sendMessage = useCallback(async (text) => {
    const query = text || input.trim()
    if (!query || loading) return
    setInput('')

    const userMsg = { role: 'user', content: query, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const visitPayload = buildVisitPayload()
      const { data } = await axios.post('/chat', {
        query,
        session_id: 'nephora_session',
        ...(visitPayload ? { visits: visitPayload } : {}),
      })
      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.answer,
        id: Date.now() + 1,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ Could not reach Nephora AI. Please ensure the backend is running.',
        id: Date.now() + 1,
        error: true,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, loading, buildVisitPayload])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="min-h-screen text-on-background font-sans flex flex-col pt-24 pb-0 px-6">
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
              style={{ background: 'rgba(203,190,251,0.08)', border: '1px solid rgba(203,190,251,0.2)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: aiStatus === 'active' ? '#94d3be' : '#cbbefb' }} />
              <span className="text-label-sm" style={{ color: aiStatus === 'active' ? '#94d3be' : '#cbbefb' }}>
                {aiStatus === 'active' ? 'Nephora AI · Online' : aiStatus === 'inactive' ? 'Nephora AI · Offline' : 'Nephora AI'}
              </span>
            </div>
            <h1 className="text-display-lg font-bold tracking-tighter text-on-surface glow-text-lavender">
              Neural Synapse Link
            </h1>
          </div>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-outline hover:text-on-surface hover:bg-white/5 transition-colors glass-stroke-thin"
              style={{ background: 'rgba(26,32,36,0.6)', backdropFilter: 'blur(20px)' }}
              title="Clear chat"
            >
              <Icon name="delete_sweep" size="text-lg" />
            </button>
          )}
        </div>

        {/* Chat Container */}
        <div className="flex-1 rounded-3xl glass-stroke-thin flex flex-col overflow-hidden"
          style={{ background: 'rgba(15,20,24,0.6)', backdropFilter: 'blur(24px)', minHeight: 0 }}>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                {/* AI orb */}
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-32 h-32 rounded-full animate-ping"
                    style={{ background: 'rgba(203,190,251,0.08)', animationDuration: '3s' }} />
                  <div className="absolute w-24 h-24 rounded-full animate-pulse"
                    style={{ background: 'rgba(157,206,225,0.08)', animationDuration: '2s' }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg,rgba(203,190,251,0.2),rgba(157,206,225,0.15))',
                      border: '1px solid rgba(203,190,251,0.3)',
                      boxShadow: '0 0 50px rgba(203,190,251,0.3)',
                    }}>
                    <Icon name="psychology" size="text-4xl" className="text-tertiary" />
                  </div>
                </div>

                <h2 className="text-headline-md text-on-surface font-semibold mb-2"
                  style={{ textShadow: '0 0 20px rgba(203,190,251,0.3)' }}>
                  Ask Nephora AI
                </h2>
                <p className="text-body-md text-outline max-w-sm mx-auto mb-8">
                  {hasData
                    ? 'Your reports are loaded. Ask anything about your kidney health.'
                    : 'Upload reports on the Upload page first, then come back to chat.'}
                </p>

                {/* Suggested prompts */}
                {hasData && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                    {SUGGESTED.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="px-4 py-2 rounded-full text-label-sm transition-all duration-200 hover:scale-105"
                        style={{
                          background: 'rgba(203,190,251,0.08)',
                          border: '1px solid rgba(203,190,251,0.2)',
                          color: '#cbbefb',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message thread */}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {/* AI avatar */}
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1"
                    style={{
                      background: 'linear-gradient(135deg,rgba(203,190,251,0.25),rgba(157,206,225,0.15))',
                      border: '1px solid rgba(203,190,251,0.3)',
                    }}>
                    <Icon name="psychology" size="text-sm" className="text-tertiary" />
                  </div>
                )}

                <div className={`max-w-[78%] px-5 py-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm'
                    : 'rounded-tl-sm'
                }`}
                  style={msg.role === 'user'
                    ? { background: 'rgba(157,206,225,0.12)', border: '1px solid rgba(157,206,225,0.2)' }
                    : msg.error
                      ? { background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)' }
                      : { background: 'rgba(203,190,251,0.06)', border: '1px solid rgba(203,190,251,0.15)' }
                  }>
                  {msg.role === 'user'
                    ? <p className="text-body-md text-on-surface/90 leading-relaxed">{msg.content}</p>
                    : <MessageText text={msg.content} />
                  }
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1"
                    style={{ background: 'rgba(157,206,225,0.15)', border: '1px solid rgba(157,206,225,0.25)' }}>
                    <Icon name="person" size="text-sm" className="text-primary" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1"
                  style={{
                    background: 'linear-gradient(135deg,rgba(203,190,251,0.25),rgba(157,206,225,0.15))',
                    border: '1px solid rgba(203,190,251,0.3)',
                  }}>
                  <Icon name="psychology" size="text-sm" className="text-tertiary" />
                </div>
                <div className="px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2"
                  style={{ background: 'rgba(203,190,251,0.06)', border: '1px solid rgba(203,190,251,0.15)' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: '#cbbefb', animationDelay: `${i * 0.15}s`, animationDuration: '1.2s' }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* No-data warning banner */}
          {!hasData && (
            <div className="mx-4 mb-3 px-4 py-3 rounded-2xl flex items-center gap-3"
              style={{ background: 'rgba(255,180,171,0.07)', border: '1px solid rgba(255,180,171,0.18)' }}>
              <Icon name="warning" size="text-base" className="flex-shrink-0" style={{ color: '#ffb4ab' }} />
              <p className="text-label-sm" style={{ color: '#ffb4ab' }}>
                No reports loaded. <a href="/upload" className="underline underline-offset-2 hover:opacity-80">Upload reports</a> first to unlock full AI analysis.
              </p>
            </div>
          )}

          {/* Input bar */}
          <div className="p-4 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-full flex items-end gap-3 px-4 py-3 rounded-2xl glass-stroke-thin transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={handleKey}
                placeholder={hasData ? 'Ask about your kidney health…' : 'Upload reports first to enable chat…'}
                className="flex-1 bg-transparent border-none outline-none text-body-md text-on-surface placeholder:text-outline/50 resize-none leading-relaxed"
                style={{ minHeight: '24px', maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg,rgba(203,190,251,0.35),rgba(157,206,225,0.25))'
                    : 'rgba(203,190,251,0.1)',
                  border: '1px solid rgba(203,190,251,0.3)',
                  color: input.trim() && !loading ? '#cbbefb' : 'rgba(203,190,251,0.35)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                <Icon name="arrow_upward" size="text-base" />
              </button>
            </div>
            <p className="text-center text-[10px] text-outline/50 mt-2">
              Nephora AI can make mistakes. Verify important clinical information with your doctor.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
