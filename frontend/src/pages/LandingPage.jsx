import { Link } from 'react-router-dom'

/* ─── Shared helpers (could be extracted to src/components/ui later) ─────── */
export function Icon({ name, filled = false, size = 'text-2xl', className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${size} ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}

function NavLink({ label, active }) {
  return (
    <a
      href="#"
      className={[
        'text-label-sm transition-all duration-300',
        active
          ? 'text-primary pb-1 border-b-2 border-primary/50'
          : 'text-outline hover:text-on-surface hover:bg-white/5 px-2 py-1 rounded-lg',
      ].join(' ')}
    >
      {label}
    </a>
  )
}

function FeatureCard({ icon, title, body, accent = 'cyan' }) {
  const colors = {
    cyan:     { icon: 'text-primary',   bg: 'bg-primary/10'   },
    green:    { icon: 'text-secondary', bg: 'bg-secondary/10' },
    lavender: { icon: 'text-tertiary',  bg: 'bg-tertiary/10'  },
  }
  const c = colors[accent] || colors.cyan

  return (
    <div className="col-span-12 md:col-span-4 glass-card rounded-4xl p-8 flex flex-col gap-6 hover:bg-white/10 transition-all duration-300 group">
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
        <Icon name={icon} size="text-xl" className={c.icon} />
      </div>
      <h3 className="text-headline-md text-on-surface">{title}</h3>
      <p className="text-body-md text-outline">{body}</p>
    </div>
  )
}

/* ─── Landing page ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-on-background font-sans">

      {/* ══ TOP NAV ISLAND ═══════════════════════════════════════════════════ */}
      <header className="nav-island top-0">
        <div className="text-headline-md font-bold tracking-tighter text-primary glow-text-cyan">
          Nephora
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <NavLink label="Diagnostics" active />
          <NavLink label="Biometrics" />
          <NavLink label="Timeline" />
          <NavLink label="Reports" />
        </nav>
        <div className="flex items-center gap-1">
          {['settings_heart', 'query_stats', 'account_circle'].map(ic => (
            <button key={ic} className="p-2 rounded-full text-primary hover:bg-primary/10 transition-all duration-200">
              <Icon name={ic} size="text-xl" />
            </button>
          ))}
        </div>
      </header>

      {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
      <main className="relative min-h-screen pt-32 pb-48 overflow-hidden">

        {/* Volumetric background blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[130px]"
            style={{ background: 'rgba(157,206,225,0.10)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: 'rgba(148,211,190,0.10)' }} />
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full blur-[150px]"
            style={{ background: 'rgba(203,190,251,0.06)' }} />
          <div className="absolute inset-0 fog-gradient" />
        </div>

        {/* ── HERO GRID ──────────────────────────────────────────────────── */}
        <section className="relative z-10 max-w-7xl mx-auto px-8 grid grid-cols-12 gap-island-gap items-center">

          {/* Left: copy */}
          <div className="col-span-12 lg:col-span-6 flex flex-col items-start gap-8">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-stroke-thin"
              style={{ background: 'rgba(148,211,190,0.08)' }}>
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-label-sm text-secondary">Confidence 98.4%</span>
            </div>

            <h1
              className="font-bold tracking-tighter text-on-surface glow-text-lavender leading-none"
              style={{ fontSize: 'clamp(64px,10vw,120px)' }}
            >
              NEPHORA
            </h1>

            <p className="text-body-lg text-on-surface-variant max-w-lg">
              AI-powered Chronic Kidney Disease risk intelligence. Upload your blood
              reports, track creatinine slope and 7 other biomarkers over time, and
              receive SHAP-explained predictions — bridging raw lab data and early
              clinical action.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-6 mt-2">
              {/* ── "Initiate Diagnostics" → links to /upload ── */}
              <Link to="/upload" className="btn-primary group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <span className="relative text-amber-400 flex items-center gap-3 text-lg font-semibold tracking-wide">
                  Initiate Diagnostics <Icon name="rocket_launch" size="text-xl" />
                </span>
              </Link>

              <button className="text-body-md text-outline hover:text-on-surface transition-colors pb-1 border-b border-transparent hover:border-on-surface font-medium">
                How it works
              </button>
            </div>
          </div>

          {/* Right: holographic core */}
          <div className="col-span-12 lg:col-span-6 relative flex justify-center py-16">
            <div className="relative w-[480px] h-[480px] flex items-center justify-center animate-float">

              <div className="absolute inset-0 rounded-full border border-primary/10 animate-pulse-slow"
                style={{ background: 'linear-gradient(135deg,rgba(157,206,225,0.05),rgba(148,211,190,0.05))' }} />
              <div className="absolute inset-8 rounded-full border border-dashed border-primary/10 animate-spin-slow" />

              <div className="absolute inset-20 rounded-full border border-primary/20 flex items-center justify-center overflow-hidden"
                style={{ background: 'rgba(9,15,19,0.8)', backdropFilter: 'blur(20px)' }}>
                <div className="absolute w-28 h-28 rounded-full blur-2xl" style={{ background: 'rgba(157,206,225,0.2)' }} />
                <Icon name="biotech" filled size="text-7xl"
                  className="relative z-10 text-primary drop-shadow-[0_0_20px_rgba(157,206,225,0.7)]" />
              </div>

              {/* Risk Indicator card */}
              <div className="absolute -top-10 -right-6 w-52 p-4 rounded-2xl shadow-2xl glass-card glow-effect-cyan">
                <div className="h-0.5 w-full rounded-full mb-3"
                  style={{ background: 'linear-gradient(90deg,#9dcee1,#94d3be,transparent)' }} />
                <div className="text-label-sm text-primary mb-3">Risk Indicator</div>
                <div className="flex items-end gap-1.5 h-12">
                  {[40, 70, 50, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${h}%`,
                        background: i === 3 ? 'linear-gradient(180deg,#9dcee1,#94d3be)' : 'rgba(157,206,225,0.2)',
                        boxShadow: i === 3 ? '0 0 12px rgba(157,206,225,0.5)' : 'none',
                      }} />
                  ))}
                </div>
              </div>

              {/* SHAP card */}
              <div className="absolute -bottom-4 -left-14 w-60 p-4 rounded-2xl shadow-2xl glass-card glow-effect-green">
                <div className="h-0.5 w-full rounded-full mb-3"
                  style={{ background: 'linear-gradient(90deg,#94d3be,#9dcee1,transparent)' }} />
                <div className="text-label-sm text-secondary mb-3">SHAP Explainability</div>
                <div className="space-y-2.5">
                  {[
                    { w: 85, label: 'Creatinine', c: '#9dcee1' },
                    { w: 62, label: 'BUN',        c: '#94d3be' },
                    { w: 45, label: 'Hemoglobin', c: '#41484b' },
                  ].map(({ w, label, c }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-widest text-outline">{label}</span>
                        <span className="text-[10px] text-outline">{w}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ──────────────────────────────────────────────── */}
        <section className="relative z-10 max-w-7xl mx-auto px-8 mt-32">
          <div className="grid grid-cols-12 gap-island-gap">

            <FeatureCard icon="upload_file" title="Multi-Visit PDF Upload"
              body="Upload multiple blood test reports in PDF format. Our AI extractor identifies Creatinine, BUN, Potassium, Sodium, Hemoglobin, Bicarbonate, Calcium, and Glucose from any lab layout."
              accent="cyan" />

            <div className="col-span-12 md:col-span-8 relative overflow-hidden glass-card rounded-4xl p-8 flex items-center gap-12 group glass-stroke-thin">
              <div className="flex-1">
                <div className="text-label-sm text-tertiary mb-4">Clinical Precision</div>
                <h3 className="text-headline-lg text-on-surface mb-4">Biomarker Trajectory Analysis</h3>
                <p className="text-body-md text-outline max-w-md">
                  Track all 8 kidney biomarkers across multiple visits. Longitudinal slope
                  analysis — powered by <code className="text-primary bg-primary/10 px-1 py-0.5 rounded text-xs">np.polyfit</code> — reveals
                  kidney function decline a single snapshot would miss.
                </p>
              </div>
              <div className="hidden lg:flex flex-col gap-3 w-44 flex-shrink-0">
                {[
                  { label: 'Creatinine', w: 82, c: '#9dcee1' },
                  { label: 'BUN',        w: 58, c: '#94d3be' },
                  { label: 'Hemoglobin', w: 70, c: '#cbbefb' },
                  { label: 'Potassium',  w: 40, c: '#9dcee1' },
                ].map(({ label, w, c }) => (
                  <div key={label}>
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: '#8a9296' }}>{label}</span>
                    <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-7 glass-card rounded-4xl p-10 relative overflow-hidden glass-stroke-thin">
              <div className="absolute top-0 right-0 p-8 pointer-events-none">
                <Icon name="monitoring" size="text-8xl" className="opacity-5 text-secondary" />
              </div>
              <h3 className="text-headline-lg text-on-surface mb-2">Longitudinal Risk Intelligence</h3>
              <p className="text-body-md text-outline mb-8">Powered by XGBoost + SHAP — every prediction is explainable.</p>
              <div className="flex gap-4">
                {[
                  { val: '8',       label: 'Biomarkers',     color: '#94d3be' },
                  { val: 'XGBoost', label: 'ML Engine',      color: '#9dcee1' },
                  { val: 'SHAP',    label: 'Explainability', color: '#cbbefb' },
                ].map(({ val, label, color }) => (
                  <div key={label} className="flex-1 p-4 rounded-xl glass-stroke-thin" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-headline-md font-bold" style={{ color }}>{val}</div>
                    <div className="text-label-sm mt-1 text-outline-variant">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 rounded-4xl border border-primary/15 p-10 flex flex-col justify-between"
              style={{ background: 'linear-gradient(135deg,rgba(157,206,225,0.08) 0%,rgba(148,211,190,0.04) 50%,transparent 100%)' }}>
              <div className="h-0.5 w-16 rounded-full mb-6" style={{ background: 'linear-gradient(90deg,#9dcee1,#94d3be)' }} />
              <p className="text-body-lg text-on-surface/80 italic leading-relaxed">
                "Nephora flagged my patient's rising Creatinine slope two visits before
                our team would have escalated. Explainable AI done right for clinical
                decision support."
              </p>
              <div className="flex items-center gap-4 mt-8">
                <div className="w-10 h-10 rounded-full flex items-center justify-center glass-stroke-thin"
                  style={{ background: 'rgba(157,206,225,0.1)' }}>
                  <Icon name="person" size="text-base" className="text-primary" />
                </div>
                <div>
                  <div className="text-label-sm text-on-surface">DR. ANANYA KRISHNAN</div>
                  <div className="text-[10px] uppercase tracking-widest text-outline">Consultant Nephrologist</div>
                </div>
              </div>
            </div>

            <FeatureCard icon="science" title="Creatinine Slope Detection"
              body="np.polyfit-powered trend analysis across visits reveals accelerating kidney decline before levels hit critical thresholds."
              accent="green" />
            <FeatureCard icon="auto_awesome" title="SHAP Explainability"
              body="Every prediction includes a ranked breakdown of which biomarkers contributed most — no black-box decisions in clinical AI."
              accent="lavender" />
            <FeatureCard icon="health_metrics" title="Three-Tier Risk Labels"
              body="Low, Moderate, or High risk with probability %. Clinicians get clear, actionable output rather than opaque scores."
              accent="cyan" />

          </div>
        </section>
      </main>


    </div>
  )
}
