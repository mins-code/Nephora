// Shared helpers for AnalysisPage

export function classifyStatus(value, refLow, refHigh) {
  if (refLow == null || refHigh == null) return 'unknown'
  if (value >= refLow && value <= refHigh) return 'normal'
  const z = (refHigh - refLow) * 0.15
  if ((value < refLow && value >= refLow - z) || (value > refHigh && value <= refHigh + z)) return 'borderline'
  return 'abnormal'
}

export const STATUS = {
  normal:    { label:'Normal',     color:'#94d3be', glow:'rgba(148,211,190,0.3)', bg:'rgba(148,211,190,0.08)', border:'rgba(148,211,190,0.2)'  },
  borderline:{ label:'Borderline', color:'#fbbf24', glow:'rgba(251,191,36,0.3)',  bg:'rgba(251,191,36,0.08)',  border:'rgba(251,191,36,0.2)'   },
  abnormal:  { label:'Abnormal',   color:'#ffb4ab', glow:'rgba(255,180,171,0.3)', bg:'rgba(255,180,171,0.08)', border:'rgba(255,180,171,0.2)'  },
  unknown:   { label:'—',          color:'#8a9296', glow:'transparent',            bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.08)' },
}

const INSIGHTS = {
  Creatinine: { abnormal:'Glomerular filtration compromised. Primary CKD progression marker.', borderline:'Approaching clinical threshold. Early renal stress detected.', normal:'Renal clearance within expected parameters.', unknown:'No reference data.' },
  BUN:        { abnormal:'Urea nitrogen excretion impaired. Renal function reduced.', borderline:'Nitrogen load near boundary. Assess hydration.', normal:'Urea clearance functioning normally.', unknown:'No reference data.' },
  Potassium:  { abnormal:'Hyperkalemia — cardiac arrhythmia risk. Immediate review.', borderline:'Electrolyte regulation under stress.', normal:'Potassium homeostasis maintained.', unknown:'No reference data.' },
  Sodium:     { abnormal:'Sodium dysregulation. Renal osmoregulation disrupted.', borderline:'Approaching reference boundary.', normal:'Fluid balance intact.', unknown:'No reference data.' },
  Hemoglobin: { abnormal:'Anemia of CKD pattern. Likely EPO production deficit.', borderline:'Early anemic signal. Monitor trajectory.', normal:'No anemia detected.', unknown:'No reference data.' },
  Bicarbonate:{ abnormal:'Metabolic acidosis. Renal acid buffering impaired.', borderline:'Early acid-base imbalance signal.', normal:'Acid-base balance maintained.', unknown:'No reference data.' },
  Calcium:    { abnormal:'Mineral metabolism disrupted. Check PTH and Vitamin D.', borderline:'Calcium at reference boundary.', normal:'Calcium homeostasis maintained.', unknown:'No reference data.' },
  Glucose:    { abnormal:'Hyperglycemia — diabetic nephropathy risk elevated.', borderline:'Pre-diabetic pattern. May accelerate CKD.', normal:'No hyperglycemic stress detected.', unknown:'No reference data.' },
}

export function getInsight(name, status, trend) {
  const t = trend?.length > 1 ? (trend[trend.length-1] > trend[0] ? ' Rising trajectory.' : ' Declining trajectory.') : ''
  return (INSIGHTS[name]?.[status] || `${name} analysis complete.`) + t
}

export function Sparkline({ values, color, W=80, H=28 }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values), rng = max - min || 1
  const pts = values.map((v, i) => ({ x: (i/(values.length-1))*W, y: H-((v-min)/rng)*(H-4)-2 }))
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x+pts[i].x)/2
    d += ` C${cx} ${pts[i-1].y},${cx} ${pts[i].y},${pts[i].x} ${pts[i].y}`
  }
  const id = `sg${color.replace('#','')}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={`${d} L${pts[pts.length-1].x} ${H} L0 ${H} Z`} fill={`url(#${id})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2.5" fill={color}/>
    </svg>
  )
}

export function RangeBar({ value, refLow, refHigh, status }) {
  if (refLow == null || refHigh == null) return null
  const span = refHigh - refLow, pad = span * 1.2
  const dMin = Math.max(0, refLow-pad), dMax = refHigh+pad, dRng = dMax-dMin
  const pct = v => Math.min(100, Math.max(0, ((v-dMin)/dRng)*100))
  const c = STATUS[status]?.color || '#9dcee1'
  return (
    <div className="relative h-4">
      <div className="absolute inset-y-1 inset-x-0 rounded-full" style={{background:'rgba(255,255,255,0.05)'}}/>
      <div className="absolute inset-y-1 rounded-full" style={{left:`${pct(refLow)}%`,width:`${pct(refHigh)-pct(refLow)}%`,background:'rgba(148,211,190,0.15)',border:'1px solid rgba(148,211,190,0.25)'}}/>
      <div className="absolute top-0 h-4 w-[2px] rounded-full -translate-x-1/2" style={{left:`${pct(value)}%`,background:c,boxShadow:`0 0 6px ${c}`}}/>
    </div>
  )
}
