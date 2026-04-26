import { Link } from 'react-router-dom'

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

export default function ChatPage() {
  return (
    <div className="min-h-screen text-on-background font-sans flex flex-col pt-24 pb-12 px-6">
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
              style={{ background: 'rgba(203,190,251,0.08)', border: '1px solid rgba(203,190,251,0.2)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#cbbefb' }} />
              <span className="text-label-sm text-tertiary">Nephora AI</span>
            </div>
            <h1 className="text-display-lg font-bold tracking-tighter text-on-surface glow-text-lavender">
              Neural Synapse Link
            </h1>
          </div>
          
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-outline hover:text-on-surface hover:bg-white/5 transition-colors glass-stroke-thin"
              style={{ background: 'rgba(26,32,36,0.6)', backdropFilter: 'blur(20px)' }}>
              <Icon name="history" size="text-lg" />
            </button>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-outline hover:text-on-surface hover:bg-white/5 transition-colors glass-stroke-thin"
              style={{ background: 'rgba(26,32,36,0.6)', backdropFilter: 'blur(20px)' }}>
              <Icon name="settings" size="text-lg" />
            </button>
          </div>
        </div>

        {/* Chat Area Container */}
        <div className="flex-1 rounded-3xl glass-stroke-thin flex flex-col overflow-hidden relative"
          style={{ background: 'rgba(15,20,24,0.6)', backdropFilter: 'blur(24px)' }}>
          
          {/* Main Content Area (Centered Placeholder) */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
            
            {/* Glowing AI Orb */}
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute w-32 h-32 rounded-full animate-ping"
                style={{ background: 'rgba(203,190,251,0.1)', animationDuration: '3s' }} />
              <div className="absolute w-24 h-24 rounded-full animate-pulse"
                style={{ background: 'rgba(157,206,225,0.1)', animationDuration: '2s' }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg,rgba(203,190,251,0.2),rgba(157,206,225,0.15))',
                  border: '1px solid rgba(203,190,251,0.3)',
                  boxShadow: '0 0 50px rgba(203,190,251,0.4)',
                }}>
                <Icon name="psychology" size="text-4xl" className="text-tertiary" />
              </div>
            </div>

            <h2 className="text-headline-md text-on-surface font-semibold mb-3"
              style={{ textShadow: '0 0 20px rgba(203,190,251,0.3)' }}>
              Neural Synapse Link initializing...
            </h2>
            
            <p className="text-body-lg text-outline max-w-md mx-auto mb-8">
              Nephora AI is currently learning your biometric history. Chat coming soon.
            </p>

            <div className="flex items-center gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#cbbefb', animationDelay: `${i * 0.2}s`, animationDuration: '1.5s' }} />
              ))}
            </div>
          </div>

          {/* Chat Input Placeholder */}
          <div className="p-4" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass-stroke-thin"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Icon name="add_circle" className="text-outline" />
              <input 
                type="text" 
                placeholder="Message Nephora AI..." 
                disabled
                className="flex-1 bg-transparent border-none outline-none text-body-md text-on-surface placeholder:text-outline/50 cursor-not-allowed"
              />
              <button disabled className="w-8 h-8 rounded-full flex items-center justify-center opacity-50 cursor-not-allowed"
                style={{ background: 'rgba(203,190,251,0.15)', color: '#cbbefb' }}>
                <Icon name="arrow_upward" size="text-sm" />
              </button>
            </div>
            <p className="text-center text-[10px] text-outline/60 mt-3">
              Nephora AI can make mistakes. Consider verifying important clinical information.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
