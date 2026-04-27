import { useState, useEffect } from 'react'
import { classifyStatus, STATUS } from './analysisHelpers'

const BIO_ORDER = ['Creatinine','BUN','Potassium','Sodium','Hemoglobin','Bicarbonate','Calcium','Glucose']

// 900×540 viewBox
const VW=900, VH=540, CX=450, CY=265

const NODES = [
  { name:'Creatinine',  x:200, y:72,  lx:200, ly:15,  la:'middle' },
  { name:'BUN',         x:700, y:72,  lx:700, ly:15,  la:'middle' },
  { name:'Potassium',   x:62,  y:200, lx:116, ly:204, la:'start'  },
  { name:'Sodium',      x:62,  y:350, lx:116, ly:354, la:'start'  },
  { name:'Hemoglobin',  x:838, y:200, lx:784, ly:204, la:'end'    },
  { name:'Bicarbonate', x:838, y:350, lx:784, ly:354, la:'end'    },
  { name:'Calcium',     x:200, y:468, lx:200, ly:525, la:'middle' },
  { name:'Glucose',     x:700, y:468, lx:700, ly:525, la:'middle' },
]


export default function NetworkView({ biomarkerData, prediction }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { setTimeout(() => setDrawn(true), 200) }, [])

  const getStatus = n => { const d = biomarkerData[n]; return d ? classifyStatus(d.value, d.ref_low, d.ref_high) : 'unknown' }
  const getColor  = n => STATUS[getStatus(n)]?.color || '#41484b'
  const getBg     = n => STATUS[getStatus(n)]?.bg    || 'rgba(255,255,255,0.02)'

  const riskPct     = prediction?.risk_probability ?? null
  const pLabel      = riskPct != null ? (riskPct > 60 ? 'HIGH RISK' : riskPct > 30 ? 'MODERATE' : 'STABLE') : 'PENDING'
  const pColor      = riskPct != null ? (riskPct > 60 ? '#ffb4ab' : riskPct > 30 ? '#fbbf24' : '#94d3be') : '#9dcee1'

  const abnormals   = BIO_ORDER.filter(b => getStatus(b) === 'abnormal')
  const borderlines = BIO_ORDER.filter(b => getStatus(b) === 'borderline')
  const concerns    = [...abnormals, ...borderlines]
  const aiText      = concerns.length > 0
    ? `${abnormals.length} marker${abnormals.length !== 1 ? 's' : ''} outside reference range${abnormals.length ? ': ' + abnormals.join(', ') : ''}. ${borderlines.length ? borderlines.length + ' borderline: ' + borderlines.join(', ') + '.' : ''} ${riskPct != null ? 'CKD risk score: ' + riskPct + '%.' : ''} Clinical review recommended.`
    : `All primary renal biomarkers within reference ranges.${riskPct != null ? ' CKD risk score: ' + riskPct + '%.' : ''} No active progression signal detected.`

  return (
    <div className="flex flex-col rounded-3xl overflow-hidden"
      style={{ 
        background: 'radial-gradient(circle at 50% 50%, rgba(148,211,190,0.12) 0%, rgba(9,15,19,0.95) 75%)', 
        border:'1px solid rgba(149,212,191,0.1)', 
        backdropFilter:'blur(30px)' 
      }}>

      {/* ── SVG canvas ────────────────────────────────────────────── */}
      <div className="relative w-full">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full" style={{ background:'rgba(149,212,191,0.06)', filter:'blur(80px)' }}/>
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full" style={{ background:'rgba(204,191,251,0.06)', filter:'blur(80px)' }}/>
        </div>

        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ display:'block', minHeight:'340px' }}>
          <defs>
            <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(149,212,191,0.7)"/><stop offset="100%" stopColor="rgba(157,206,225,0.1)"/>
            </linearGradient>
            <linearGradient id="lg2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(204,191,251,0.7)"/><stop offset="100%" stopColor="rgba(149,212,191,0.1)"/>
            </linearGradient>
            <filter id="ng"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>

          {/* Rings */}
          <ellipse cx={CX} cy={CY} rx="78" ry="65" fill="none" stroke="rgba(149,212,191,0.07)" strokeWidth="1"/>
          <ellipse cx={CX} cy={CY} rx="195" ry="162" fill="none" stroke="rgba(149,212,191,0.04)" strokeWidth="1" strokeDasharray="5 8"/>

          {/* Connection lines */}
          {NODES.map((n, i) => {
            const dx = n.x - CX
            const dy = n.y - CY
            const dist = Math.hypot(dx, dy)
            const ux = dx / dist
            const uy = dy / dist
            
            // Start 56px away from center node, end 40px away from biomarker node
            const startX = CX + ux * 56
            const startY = CY + uy * 56
            const endX = n.x - ux * 40
            const endY = n.y - uy * 40

            const len  = dist * 1.5
            const qx   = (startX + endX) / 2 + (i % 2 === 0 ? -22 : 22)
            const qy   = (startY + endY) / 2 + (i < 4 ? -15 : 15)
            const notFound = !biomarkerData[n.name]
            return (
              <path key={'l'+n.name}
                d={`M${startX},${startY} Q${qx},${qy} ${endX},${endY}`}
                fill="none"
                stroke={notFound ? 'rgba(255,255,255,0.05)' : (i < 4 ? 'url(#lg1)' : 'url(#lg2)')}
                strokeWidth={notFound ? 1 : 1.5}
                strokeDasharray={notFound ? '4 6' : String(len)}
                strokeDashoffset={notFound ? 0 : (drawn ? 0 : len)}
                style={{ transition:`stroke-dashoffset 1.2s ease ${i*0.1}s`, filter:'drop-shadow(0 0 3px rgba(149,212,191,0.3))' }}
              />
            )
          })}

          {/* Biomarker nodes */}
          {NODES.map(n => {
            const d  = biomarkerData[n.name]
            const c  = getColor(n.name)
            const bg = getBg(n.name)
            const st = getStatus(n.name)
            // Truncate unit: first word, max 7 chars
            const unitDisplay = d ? (d.unit || '').split(' ')[0].slice(0,7) : ''

            return (
              <g key={n.name} filter="url(#ng)">
                {/* Glow halo for flagged markers */}
                {(st === 'abnormal' || st === 'borderline') && (
                  <circle cx={n.x} cy={n.y} r="46" fill="none" stroke={c} strokeWidth="0.8" opacity="0.4"/>
                )}

                {/* Main circle */}
                <circle cx={n.x} cy={n.y} r="38" fill={bg} stroke={c} strokeWidth="1.5"/>

                {/* Value */}
                {d ? (
                  <>
                    <text x={n.x} y={n.y - 5} textAnchor="middle"
                      fontSize="15" fontWeight="700" fontFamily="'Space Grotesk', monospace" fill={c}>
                      {d.value}
                    </text>
                    <text x={n.x} y={n.y + 13} textAnchor="middle"
                      fontSize="8.5" fontFamily="monospace" fill={c} opacity="0.65">
                      {unitDisplay}
                    </text>
                  </>
                ) : (
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="9" fill="#41484b" fontFamily="monospace">N/A</text>
                )}

                {/* Name label */}
                <text x={n.lx} y={n.ly} textAnchor={n.la}
                  fontSize="10.5" fontWeight="600" fontFamily="'Space Grotesk', sans-serif"
                  fill={d ? '#bfc9c4' : '#41484b'}>
                  {n.name.toUpperCase()}
                </text>
              </g>
            )
          })}

          {/* Central patient node */}
          <circle cx={CX} cy={CY} r="54" fill="rgba(14,20,24,0.95)" stroke="rgba(149,212,191,0.22)" strokeWidth="1.5"/>
          <circle cx={CX} cy={CY} r="54" fill="none" stroke={pColor} strokeWidth="0.8" opacity="0.3">
            <animate attributeName="r" values="50;57;50" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.08;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          <text x={CX} y={CY-15} textAnchor="middle" fontSize="8" fill="rgba(149,212,191,0.5)"
            fontFamily="'Space Grotesk'" fontWeight="700" letterSpacing="3">PATIENT</text>
          <text x={CX} y={CY+5}  textAnchor="middle" fontSize="13" fill="#e1e3e0"
            fontFamily="'Space Grotesk'" fontWeight="700">NEPHORA</text>
          <circle cx={CX-20} cy={CY+22} r="3.5" fill={pColor}/>
          <text x={CX-11} y={CY+27} fontSize="9.5" fill={pColor} fontFamily="'Space Grotesk'" fontWeight="600">{pLabel}</text>
        </svg>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{ height:'1px', background:'rgba(255,255,255,0.06)' }}/>

      {/* ── Pathway panel ───────────────────────────────────────── */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-sm" style={{ background:'#cbbefb' }}/>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-tertiary">Biomarker Pathway Analysis</p>
        </div>
        <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-2xl">{aiText}</p>
        {riskPct != null && (
          <div className="mt-4 inline-flex items-center gap-4 px-4 py-3 rounded-2xl"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-[10px] font-mono text-outline tracking-widest">CKD_RISK_SCORE</span>
            <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width:`${riskPct}%`, background:`linear-gradient(90deg,${pColor},${pColor}80)`, boxShadow:`0 0 8px ${pColor}60` }}/>
            </div>
            <span className="text-[14px] font-mono font-bold" style={{ color:pColor }}>{riskPct}%</span>
          </div>
        )}
      </div>

    </div>
  )
}
