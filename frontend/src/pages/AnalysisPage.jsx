import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useDiagnostic } from '../context/DiagnosticContext'

const API_BASE = 'http://localhost:8000'
const ALL_BIOMARKERS = ['Creatinine','BUN','Potassium','Sodium','Hemoglobin','Bicarbonate','Calcium','Glucose']

function Icon({ name, filled = false, size = 'text-xl', className = '' }) {
  return (
    <span className={`material-symbols-outlined ${size} ${className}`}
      style={filled ? { fontVariationSettings:"'FILL' 1" } : undefined}>{name}</span>
  )
}

/* ── Status classification ─────────────────────────────────────────────── */
function classifyStatus(value, refLow, refHigh) {
  if (refLow == null || refHigh == null) return 'unknown'
  if (value >= refLow && value <= refHigh) return 'normal'
  const zone = (refHigh - refLow) * 0.15
  if ((value < refLow && value >= refLow - zone) || (value > refHigh && value <= refHigh + zone)) return 'borderline'
  return 'abnormal'
}

const STATUS = {
  normal:    { label:'Normal',     color:'#94d3be', glow:'rgba(148,211,190,0.25)', bg:'rgba(148,211,190,0.07)',  border:'rgba(148,211,190,0.2)'  },
  borderline:{ label:'Borderline', color:'#fbbf24', glow:'rgba(251,191,36,0.25)',  bg:'rgba(251,191,36,0.07)',   border:'rgba(251,191,36,0.2)'   },
  abnormal:  { label:'Abnormal',   color:'#ffb4ab', glow:'rgba(255,180,171,0.25)', bg:'rgba(255,180,171,0.07)',  border:'rgba(255,180,171,0.2)'  },
  unknown:   { label:'—',          color:'#8a9296', glow:'transparent',             bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.08)' },
}

/* ── Sparkline SVG ─────────────────────────────────────────────────────── */
function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null
  const W = 64, H = 24
  const min = Math.min(...values), max = Math.max(...values)
  const rng = max - min || 1
  const pts = values.map((v, i) => ({ x: (i/(values.length-1))*W, y: H - ((v-min)/rng)*(H-4) - 2 }))
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2
    d += ` C${cx} ${pts[i-1].y},${cx} ${pts[i].y},${pts[i].x} ${pts[i].y}`
  }
  const rising = values[values.length-1] > values[0]
  return (
    <div className="flex items-center gap-1">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2.5" fill={color} />
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{rising ? '↑' : '↓'}</span>
    </div>
  )
}

/* ── Horizontal Range Bar ─────────────────────────────────────────────── */
function RangeBar({ value, refLow, refHigh, status }) {
  if (refLow == null || refHigh == null) return (
    <p className="text-[11px] text-outline italic mt-2">No reference range available</p>
  )
  const span = refHigh - refLow
  const pad = span * 1.2
  const domMin = Math.max(0, refLow - pad), domMax = refHigh + pad
  const domRng = domMax - domMin
  const pct = v => Math.min(100, Math.max(0, ((v - domMin) / domRng) * 100))
  const markerColor = STATUS[status]?.color || '#9dcee1'
  return (
    <div className="mt-3 space-y-1.5">
      <div className="relative h-5">
        <div className="absolute inset-y-1.5 inset-x-0 rounded-full" style={{ background:'rgba(255,255,255,0.05)' }} />
        <div className="absolute inset-y-1.5 rounded-full"
          style={{ left:`${pct(refLow)}%`, width:`${pct(refHigh)-pct(refLow)}%`, background:'rgba(148,211,190,0.18)', border:'1px solid rgba(148,211,190,0.3)' }} />
        <div className="absolute top-0 h-5 w-[3px] rounded-full -translate-x-1/2"
          style={{ left:`${pct(value)}%`, background:markerColor, boxShadow:`0 0 8px ${markerColor}` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span style={{ color:'rgba(157,206,225,0.45)' }}>{refLow}</span>
        <span className="font-bold" style={{ color:markerColor }}>{value}</span>
        <span style={{ color:'rgba(157,206,225,0.45)' }}>{refHigh}</span>
      </div>
    </div>
  )
}

/* ── Single Biomarker Card ────────────────────────────────────────────── */
function BiomarkerCard({ name, data }) {
  if (!data) return (
    <div className="rounded-3xl p-6 flex flex-col gap-3 glass-stroke-thin"
      style={{ background:'rgba(15,20,24,0.4)', backdropFilter:'blur(12px)', minHeight:'180px', opacity:0.45 }}>
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-semibold text-on-surface">{name}</span>
        <span className="text-[11px] text-outline px-2 py-0.5 rounded-lg" style={{ background:'rgba(255,255,255,0.04)' }}>Not detected</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Icon name="hide_source" size="text-3xl" className="text-outline" />
      </div>
    </div>
  )

  const { value, unit, ref_low, ref_high, trend } = data
  const status = classifyStatus(value, ref_low, ref_high)
  const cfg = STATUS[status]

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-1 transition-all duration-300 hover:scale-[1.02] cursor-default"
      style={{ background:`linear-gradient(135deg,${cfg.bg},rgba(9,15,19,0.9))`, backdropFilter:'blur(20px)', border:`1px solid ${cfg.border}`, boxShadow:`0 4px 40px ${cfg.glow}`, minHeight:'180px' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-label-sm font-bold text-on-surface">{name}</div>
          <div className="text-[11px] text-outline">{unit || 'unit'}</div>
        </div>
        <div className="flex items-center gap-2">
          {trend?.length > 1 && <Sparkline values={trend} color={cfg.color} />}
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Big value */}
      <div className="text-4xl font-bold tabular-nums leading-none"
        style={{ color:cfg.color, textShadow:`0 0 24px ${cfg.color}80` }}>
        {value}
        <span className="text-sm font-normal text-outline ml-1.5">{unit}</span>
      </div>

      {/* Range bar */}
      <RangeBar value={value} refLow={ref_low} refHigh={ref_high} status={status} />
    </div>
  )
}

/* ── Loading Overlay ──────────────────────────────────────────────────── */
function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backdropFilter:'blur(24px)', background:'rgba(9,15,19,0.85)' }}>
      <div className="relative flex items-center justify-center mb-10">
        <div className="absolute w-44 h-44 rounded-full animate-ping" style={{ background:'rgba(157,206,225,0.10)', animationDuration:'1.8s' }} />
        <div className="absolute w-32 h-32 rounded-full animate-ping" style={{ background:'rgba(148,211,190,0.10)', animationDuration:'2.2s', animationDelay:'0.3s' }} />
        <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background:'linear-gradient(135deg,rgba(157,206,225,0.15),rgba(148,211,190,0.1))', border:'1px solid rgba(157,206,225,0.25)', boxShadow:'0 0 60px rgba(157,206,225,0.35)' }}>
          <span className="material-symbols-outlined text-6xl text-primary animate-pulse" style={{ fontVariationSettings:"'FILL' 1" }}>monitoring</span>
        </div>
      </div>
      <p className="text-headline-md font-semibold text-on-surface mb-2" style={{ textShadow:'0 0 30px rgba(157,206,225,0.4)' }}>
        Computing Risk Profile
      </p>
      <p className="text-body-md text-outline mb-8">Running XGBoost + SHAP analysis…</p>
      <div className="flex items-center gap-2">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: i%2===0 ? '#9dcee1' : '#94d3be', animationDelay:`${i*0.12}s`, animationDuration:'0.9s' }} />
        ))}
      </div>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function AnalysisPage() {
  const { visits, setPrediction } = useDiagnostic()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  /* Aggregate: latest value + trend per biomarker across visits */
  const biomarkerData = {}
  visits.forEach(v => {
    Object.entries(v.extractedData?.found || {}).forEach(([b, info]) => {
      if (!biomarkerData[b]) biomarkerData[b] = { ...info, trend: [] }
      biomarkerData[b].trend.push(info.value)
      biomarkerData[b] = { ...info, trend: biomarkerData[b].trend }
    })
  })

  /* Stats */
  const vals = Object.values(biomarkerData)
  const abnormalCount   = vals.filter(d => classifyStatus(d.value, d.ref_low, d.ref_high) === 'abnormal').length
  const borderlineCount = vals.filter(d => classifyStatus(d.value, d.ref_low, d.ref_high) === 'borderline').length

  if (!visits.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-sans text-on-background">
      <Icon name="upload_file" size="text-6xl" className="text-outline" />
      <p className="text-headline-md text-on-surface">No reports uploaded yet.</p>
      <button onClick={() => navigate('/upload')} className="text-primary underline text-body-lg">← Go to Upload</button>
    </div>
  )

  const handlePredict = async () => {
    setLoading(true); setError(null)
    try {
      const { data: prediction } = await axios.post(`${API_BASE}/predict`, { visits: visits.map(v => v.visitPayload) })
      prediction.n_visits = visits.length
      prediction.creat_slope = prediction.feature_values?.creat_slope ?? 0
      setPrediction(prediction)
      navigate('/results')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d?.msg).join('; ') : 'Prediction failed. Is the backend running?')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-on-background font-sans pt-24 pb-36 px-6">
      {loading && <LoadingOverlay />}

      <div className="max-w-5xl mx-auto">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background:'rgba(157,206,225,0.08)', border:'1px solid rgba(157,206,225,0.2)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:'#9dcee1' }} />
            <span className="text-label-sm text-primary">Extraction Complete — {visits.length} Visit{visits.length > 1 ? 's' : ''}</span>
          </div>
          <h1 className="text-display-xl font-bold tracking-tighter text-on-surface glow-text-lavender mb-3">
            Biomarker Analysis
          </h1>
          <p className="text-body-lg text-outline">
            Review your extracted biomarker values relative to clinical reference ranges before calculating risk.
          </p>
        </div>

        {/* ── Summary stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { val: vals.length,      label: 'Detected',    color:'#9dcee1', icon:'biotech'         },
            { val: borderlineCount,  label: 'Borderline',  color:'#fbbf24', icon:'warning_amber'   },
            { val: abnormalCount,    label: 'Abnormal',    color: abnormalCount > 0 ? '#ffb4ab' : '#94d3be', icon:'error_med' },
          ].map(({ val, label, color, icon }) => (
            <div key={label} className="rounded-2xl p-5 flex items-center gap-4 glass-stroke-thin"
              style={{ background:'rgba(26,32,36,0.6)', backdropFilter:'blur(20px)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`${color}18` }}>
                <Icon name={icon} className="" style={{ color }} />
              </div>
              <div>
                <div className="text-headline-md font-bold" style={{ color }}>{val}</div>
                <div className="text-label-sm text-outline">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 2×4 Biomarker Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {ALL_BIOMARKERS.map(b => (
            <BiomarkerCard key={b} name={b} data={biomarkerData[b] || null} />
          ))}
        </div>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ background:'rgba(255,180,171,0.08)', border:'1px solid rgba(255,180,171,0.2)' }}>
            <Icon name="error" className="text-error flex-shrink-0" />
            <p className="text-body-md text-error">{error}</p>
          </div>
        )}

        {/* ── CTA button ──────────────────────────────────────────────── */}
        <div className="flex justify-center">
          <button onClick={handlePredict} disabled={loading}
            className="group relative px-16 py-6 rounded-2xl overflow-hidden transition-all duration-300 flex items-center gap-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.10)',
              backdropFilter:'blur(20px)',
              boxShadow:'0 0 0px transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 50px rgba(245,158,11,0.25)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow='0 0 0px transparent'}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="absolute inset-0 rounded-2xl transition-all duration-300 group-hover:border-amber-500/40"
              style={{ border:'1px solid transparent' }} />

            <span className="relative flex items-center gap-3 text-xl font-bold tracking-wide text-amber-400">
              <Icon name="emergency" filled size="text-2xl" />
              Calculate Clinical Risk
              <Icon name="arrow_forward" size="text-xl" className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
            </span>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-outline mt-6">
          Research & Educational Use Only — Not a substitute for professional medical advice.
        </p>

      </div>
    </div>
  )
}
