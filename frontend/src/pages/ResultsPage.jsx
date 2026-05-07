import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useDiagnostic } from '../context/DiagnosticContext'

/* ── Risk palette ─────────────────────────────────────────────────────────── */
const RISK_CFG = {
  High:     { color: '#ff6b8a', glow: 'rgba(255,107,138,0.45)', bg: 'rgba(255,107,138,0.08)', border: 'rgba(255,107,138,0.25)', label: 'HIGH RISK DETECTED'     },
  Moderate: { color: '#f59e0b', glow: 'rgba(245,158,11,0.45)',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  label: 'MODERATE RISK DETECTED' },
  Low:      { color: '#22d3ee', glow: 'rgba(34,211,238,0.45)',  bg: 'rgba(34,211,238,0.08)',  border: 'rgba(34,211,238,0.25)', label: 'LOW RISK DETECTED'      },
}

/* ── Biomarker normal ranges (reference) ─────────────────────────────────── */
const BIO_ORDER = ['Creatinine','BUN','Potassium','Sodium','Hemoglobin','Bicarbonate','Calcium','Glucose']

/* ── Circular gauge ──────────────────────────────────────────────────────── */
function CircularGauge({ pct, risk_label, risk_probability }) {
  const cfg = RISK_CFG[risk_label] || RISK_CFG.Low
  // Arc sits in upper portion — text flows below the opening
  const r = 90, cx = 150, cy = 105, sw = 12
  const circ = 2 * Math.PI * r
  const arcLen = circ * 0.75
  const offset = arcLen - (arcLen * Math.min(pct, 100)) / 100
  // Arc opening bottom points (at 45° and 135° from start of 270° arc)
  const openY = cy + r * Math.sin((Math.PI * 45) / 180) // ≈ cy + 63.6

  return (
    <div className="flex flex-col items-center" style={{ width: 300 }}>
      {/* Arc only — no text inside SVG */}
      <svg width="300" height={Math.ceil(openY) + 20} viewBox={`0 0 300 ${Math.ceil(openY) + 20}`}>
        <defs>
          <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={cfg.color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={cfg.color} />
          </linearGradient>
          <filter id="gGlow">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={sw} strokeDasharray={`${arcLen} ${circ}`}
          strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#gGrad)"
          strokeWidth={sw} strokeDasharray={`${arcLen} ${circ}`} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}
          filter="url(#gGlow)"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)' }} />
        {/* LOW / HIGH labels at arc endpoints */}
        <text x="30" y={openY + 16} fill="rgba(34,211,238,0.5)" fontSize="9"
          fontFamily="monospace" textAnchor="middle">LOW</text>
        <text x="270" y={openY + 16} fill="rgba(255,107,138,0.5)" fontSize="9"
          fontFamily="monospace" textAnchor="middle">HIGH</text>
      </svg>

      {/* Text below arc — zero overlap */}
      <div className="flex flex-col items-center -mt-2">
        <div className="font-black leading-none"
          style={{ fontSize: 68, color: cfg.color,
            textShadow: `0 0 50px ${cfg.glow}, 0 0 18px ${cfg.glow}` }}>
          {risk_probability}<span style={{ fontSize: 30 }}>%</span>
        </div>
        <div className="mt-3 text-xs font-bold tracking-[0.22em] uppercase px-5 py-1.5 rounded-full"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </div>
      </div>
    </div>
  )
}

/* ── Biomarker Health Map ─────────────────────────────────────────────────── */
function BiomarkerBar({ name, value, refLow, refHigh }) {
  if (value == null || refLow == null || refHigh == null) return null

  const margin = (refHigh - refLow) * 0.4
  const displayMin = refLow - margin
  const displayMax = refHigh + margin
  const range = displayMax - displayMin || 1

  const toP = v => Math.max(2, Math.min(98, ((v - displayMin) / range) * 100))

  const valPct  = toP(value)
  const lowPct  = toP(refLow)
  const highPct = toP(refHigh)

  const refRange = refHigh - refLow
  const isAbnormal  = value < refLow || value > refHigh
  const borderline  = !isAbnormal && (
    value < refLow + refRange * 0.1 || value > refHigh - refRange * 0.1
  )

  const statusColor = isAbnormal ? '#ff6b8a' : borderline ? '#f59e0b' : '#22d3ee'
  const statusLabel = isAbnormal ? 'Abnormal' : borderline ? 'Borderline' : 'Normal'

  return (
    <div className="py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Top row: name + value */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-on-surface">{name}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: statusColor }}>{statusLabel}</span>
          <span className="text-sm font-bold" style={{ color: statusColor }}>{value}</span>
          <span className="text-xs text-outline">({refLow}–{refHigh})</span>
        </div>
      </div>

      {/* Bar track — relative container, no absolute overlap issues */}
      <div className="relative w-full rounded-full overflow-hidden" style={{ height: 10 }}>
        {/* Gradient background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, rgba(255,107,138,0.7) 0%, rgba(34,211,238,0.55) 40%, rgba(34,211,238,0.55) 60%, rgba(255,107,138,0.7) 100%)',
        }} />
        {/* Normal zone highlight */}
        <div className="absolute top-0 bottom-0" style={{
          left: `${lowPct}%`, width: `${highPct - lowPct}%`,
          background: 'rgba(34,211,238,0.2)',
          borderLeft: '1.5px solid rgba(34,211,238,0.6)',
          borderRight: '1.5px solid rgba(34,211,238,0.6)',
        }} />
      </div>

      {/* Diamond indicator on its own row to avoid overlap */}
      <div className="relative w-full" style={{ height: 18, marginTop: -2 }}>
        <div style={{
          position: 'absolute',
          left: `calc(${valPct}% - 7px)`,
          top: 2,
          width: 14, height: 14,
          background: 'white',
          transform: 'rotate(45deg)',
          borderRadius: 2,
          boxShadow: `0 0 10px ${statusColor}, 0 0 3px ${statusColor}`,
          animation: (isAbnormal || borderline) ? 'pulse 1.4s ease-in-out infinite' : 'none',
        }} />
      </div>
    </div>
  )
}


/* ── SHAP diverging chart ────────────────────────────────────────────────── */
function ShapChart({ shapEntries, maxShap }) {
  return (
    <div className="w-full space-y-4">
      {shapEntries.map(([feature, value]) => {
        const isPos = value >= 0
        // barWidthPct is 0 to 100, representing percentage of the available half-width (50%)
        const barWidthPct = maxShap > 0 ? (Math.abs(value) / maxShap) * 100 : 0
        
        const label = feature
          .replace('mean_val_', '')
          .replace('max_val_', '')
          .replace('ever_abnormal_', '')
          .replace('creat_slope', 'Creatinine Slope')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())

        return (
          <div key={feature} className="flex items-center gap-4">
            {/* Label */}
            <div className="text-right shrink-0 text-sm text-on-surface-variant font-medium" style={{ width: 150 }}>
              {label}
            </div>

            {/* Bar Container */}
            <div className="flex-1 relative h-6 flex items-center">
              {/* Center Line (Zero) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px z-10" style={{ background: 'rgba(255,255,255,0.2)' }} />
              
              {/* The Bar */}
              {isPos ? (
                <div className="absolute left-1/2 top-0 bottom-0 flex items-center" 
                  style={{ width: `${barWidthPct / 2}%` }}>
                  <div style={{
                    width: '100%',
                    height: 20,
                    background: 'linear-gradient(90deg, rgba(255,107,138,0.3), #ff6b8a)',
                    borderRadius: '0 4px 4px 0',
                    boxShadow: '0 0 12px rgba(255,107,138,0.2)',
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }} />
                </div>
              ) : (
                <div className="absolute right-1/2 top-0 bottom-0 flex items-center justify-end" 
                  style={{ width: `${barWidthPct / 2}%` }}>
                  <div style={{
                    width: '100%',
                    height: 20,
                    background: 'linear-gradient(270deg, rgba(148,211,190,0.3), #94d3be)',
                    borderRadius: '4px 0 0 4px',
                    boxShadow: '0 0 12px rgba(148,211,190,0.2)',
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }} />
                </div>
              )}
            </div>

            {/* Value Indicator */}
            <div className="shrink-0 text-xs font-mono font-bold text-right" style={{ width: 60, color: isPos ? '#ff6b8a' : '#94d3be' }}>
              {isPos ? '+' : ''}{value.toFixed(3)}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 pt-6 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(148,211,190,0.3), #94d3be)' }} />
          <span className="text-xs font-medium text-outline">Reduces Risk</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(255,107,138,0.3), #ff6b8a)' }} />
          <span className="text-xs font-medium text-outline">Increases Risk</span>
        </div>
      </div>

    </div>
  )
}

/* ── Glass section wrapper ───────────────────────────────────────────────── */
function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-3xl p-8 ${className}`}
      style={{ background: 'rgba(20,28,33,0.8)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
      {children}
    </div>
  )
}

/* ── Section label ───────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-outline mb-1">{children}</p>
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function ResultsPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { prediction: ctxPrediction, visits: ctxVisits } = useDiagnostic()

  const prediction = ctxPrediction || state?.prediction
  const visits     = ctxVisits?.length ? ctxVisits : (state?.visits || [])

  if (!prediction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-on-background font-sans gap-6">
        <span className="material-symbols-outlined text-6xl text-outline">error</span>
        <p className="text-headline-md text-on-surface">No results found.</p>
        <Link to="/upload" className="text-primary underline underline-offset-2">← Upload a report first</Link>
      </div>
    )
  }

  const { risk_probability, risk_label, shap_values, feature_values, creat_slope, n_visits, top_driver } = prediction
  const cfg = RISK_CFG[risk_label] || RISK_CFG.Low

  const shapEntries = Object.entries(shap_values || {})
    // Deduplicate: filter to show only mean values or specific indicators like slope
    .filter(([feature]) => feature.startsWith('mean_val_') || feature === 'creat_slope')
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
  
  const maxShap = Math.max(...shapEntries.map(([, v]) => Math.abs(v)), 0.001)

  // Build biomarker map from the most recent visit's extractedData
  const latestFound = visits[visits.length - 1]?.extractedData?.found || {}

  return (
    <div className="min-h-screen font-sans text-on-background pt-20 pb-32 px-6" style={{ background: '#0e1418' }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(157,206,225,1) 1px,transparent 1px),linear-gradient(90deg,rgba(157,206,225,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${cfg.glow.replace('0.45','0.1')}, transparent)` }} />

      <div className="relative max-w-4xl mx-auto">

        {/* ── Back ──────────────────────────────────────────────────────── */}
        <button onClick={() => navigate('/analysis')}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-2xl text-sm text-outline transition-all duration-200 hover:text-on-surface"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Analysis
        </button>

        {/* ── Risk Hero Gauge ────────────────────────────────────────────── */}
        <div className="rounded-3xl p-8 mb-6 flex flex-col items-center text-center"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, backdropFilter: 'blur(24px)' }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.color }} />
            <span className="text-xs tracking-[0.2em] uppercase font-semibold" style={{ color: cfg.color }}>
              CKD Risk Assessment · {n_visits} Visit{n_visits > 1 ? 's' : ''}
            </span>
          </div>
          <CircularGauge pct={risk_probability} risk_label={risk_label} risk_probability={risk_probability} />
          <p className="text-sm text-outline mt-4">
            {creat_slope !== 0
              ? `Creatinine slope: ${creat_slope > 0 ? '+' : ''}${creat_slope?.toFixed(3)} mg/dL per visit`
              : 'Single visit · longitudinal slope not available'}
          </p>
        </div>

        {/* ── Biomarker Health Map ──────────────────────────────────────── */}
        <GlassCard className="mb-6">
          <SectionLabel>Biometric Health Map</SectionLabel>
          <h2 className="text-xl font-bold text-on-surface mb-1">Biomarker Proximity to Risk</h2>
          <p className="text-xs text-outline mb-6">Each bar shows your value (◆) relative to the clinical reference range. Pulsing indicator = borderline or abnormal.</p>

          <div>
            {BIO_ORDER.map(name => {
              const info = latestFound[name]
              if (!info) return null
              return (
                <BiomarkerBar
                  key={name}
                  name={name}
                  value={info.value}
                  refLow={info.ref_low}
                  refHigh={info.ref_high}
                />
              )
            })}
            {Object.keys(latestFound).length === 0 && (
              <p className="text-sm text-outline text-center py-6">No biomarker reference data available.</p>
            )}
          </div>
        </GlassCard>

        {/* ── Clinical Bridge ───────────────────────────────────────────── */}
        <div className="rounded-2xl px-6 py-4 mb-6 flex items-start gap-4"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <span className="material-symbols-outlined mt-0.5 shrink-0" style={{ color: cfg.color, fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
          <p className="text-sm text-on-surface leading-relaxed">
            <span className="font-bold" style={{ color: cfg.color }}>Clinical Interpretation: </span>
            Based on the 8 biomarkers mapped above, the AI identifies{' '}
            <span className="font-semibold text-on-surface">{top_driver || 'Creatinine'}</span>{' '}
            as the most significant contributor to your CKD risk profile.
          </p>
        </div>

        {/* ── SHAP Analysis ─────────────────────────────────────────────── */}
        <GlassCard className="mb-6">
          <SectionLabel>SHAP Impact Analysis</SectionLabel>
          <h2 className="text-xl font-bold text-on-surface mb-1">Why this risk score?</h2>
          <p className="text-xs text-outline mb-6">Factors pushing risk higher extend right (red). Protective factors extend left (cyan).</p>
          <ShapChart shapEntries={shapEntries} maxShap={maxShap} />
        </GlassCard>
        
        {/* ── Neural Insight CTA ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center py-10 mb-8 rounded-3xl relative overflow-hidden"
          style={{ background: 'rgba(20,28,33,0.8)', border: '1px solid rgba(34,211,238,0.15)', backdropFilter: 'blur(20px)' }}>
          {/* Subtle background pulse glow */}
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(circle at 50% 50%, #22d3ee 0%, transparent 70%)' }} />
          
          <SectionLabel>Advanced Explainability</SectionLabel>
          <h2 className="text-2xl font-bold text-on-surface mb-6 text-center">Want to see your 12-month trajectory?</h2>
          
          <Link to="/insight" 
            className="group relative flex items-center gap-3 px-12 py-4 rounded-2xl text-lg font-black tracking-tight transition-all duration-500 overflow-hidden"
            style={{ background: '#22d3ee', color: '#0e1418', boxShadow: '0 0 30px rgba(34,211,238,0.3)' }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 50px rgba(34,211,238,0.5)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}>
            Request Neural Insight
            <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1.5">arrow_forward</span>
          </Link>
          
          <p className="mt-4 text-[11px] text-outline uppercase tracking-widest font-bold">Powered by Nephora AI Explainer</p>
        </div>

        {/* ── Visit Timeline ─────────────────────────────────────────────── */}
        {visits.length > 0 && (
          <GlassCard className="mb-6">
            <SectionLabel>Visit Timeline</SectionLabel>
            <div className="flex flex-col gap-4 mt-4">
              {visits.map(({ visitDate, extractedData }, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full mt-1.5" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.glow}` }} />
                    {i < visits.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.08)', minHeight: 24 }} />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-xs font-semibold mb-2" style={{ color: cfg.color }}>Visit {i + 1} — {visitDate}</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(extractedData?.found || {}).map(([b, info]) => (
                        <span key={b} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#c0c8cb' }}>
                          {b}: <strong style={{ color: '#dde3e9' }}>{info.value}</strong> {info.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}


      </div>
    </div>
  )
}
