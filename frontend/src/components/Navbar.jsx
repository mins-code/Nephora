import { Link, useLocation } from 'react-router-dom'

function Icon({ name, size = 'text-xl', className = '' }) {
  return <span className={`material-symbols-outlined ${size} ${className}`}>{name}</span>
}

const TABS = [
  { label: 'Analysis',   path: '/analysis', icon: 'biotech'      },
  { label: 'Prediction', path: '/results',  icon: 'monitoring'   },
  { label: 'Nephora AI', path: '/ai',       icon: 'auto_awesome' },
]

// Auto-resolve the back destination from the current route
const BACK_MAP = {
  '/upload':   { to: '/',         label: 'Home'     },
  '/analysis': { to: '/upload',   label: 'Upload'   },
  '/results':  { to: '/analysis', label: 'Analysis' },
  '/ai':       { to: '/',         label: 'Home'     },
}

export default function Navbar() {
  const { pathname } = useLocation()
  const back = BACK_MAP[pathname] || { to: '/', label: 'Home' }

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-8 h-16"
      style={{
        background: 'rgba(9,15,19,0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Back button ────────────────────────────────────────────────── */}
      <Link
        to={back.to}
        className="group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 hover:bg-white/5"
      >
        <Icon name="arrow_back" className="text-outline group-hover:text-primary transition-colors" />
        <span className="text-label-sm text-outline group-hover:text-primary transition-colors hidden sm:block font-medium">
          {back.label}
        </span>
      </Link>

      {/* ── Logo + Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-8">
        <Link to="/" className="text-body-lg font-bold tracking-tighter text-primary glow-text-cyan">
          Nephora
        </Link>

        <nav className="flex items-center gap-1">
          {TABS.map(({ label, path, icon }) => {
            const active = pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-label-sm transition-all duration-200',
                  active
                    ? 'text-on-surface'
                    : 'text-outline hover:bg-white/5 hover:text-on-surface',
                ].join(' ')}
                style={active ? {
                  background: 'rgba(157,206,225,0.12)',
                  border: '1px solid rgba(157,206,225,0.2)',
                } : undefined}
              >
                <Icon name={icon} className={active ? 'text-primary' : ''} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ── Right icon ─────────────────────────────────────────────────── */}
      <button className="p-2 rounded-full text-outline hover:bg-white/5 transition-all">
        <Icon name="account_circle" />
      </button>
    </header>
  )
}
