import { useEffect } from 'react'
import { classifyStatus, STATUS, Sparkline } from './analysisHelpers'

const BIO_ORDER = ['Creatinine','BUN','Potassium','Sodium','Hemoglobin','Bicarbonate','Calcium','Glucose']

function RangeBar({ value, refLow, refHigh, status, unit }) {
  if (refLow == null || refHigh == null) return (
    <p className="text-[11px] text-outline italic py-2">No reference range available in this report</p>
  )
  const span = refHigh - refLow
  const dMin = Math.max(0, refLow - span * 1.2), dMax = refHigh + span * 1.2, dRng = dMax - dMin
  const pct = v => Math.min(100, Math.max(0, ((v - dMin) / dRng) * 100))
  const lp = pct(refLow), hp = pct(refHigh), vp = pct(value)
  const c = STATUS[status]?.color || '#9dcee1'

  return (
    <div className="space-y-1.5">
      {/* Zone labels */}
      <div className="flex text-[9px] font-mono tracking-[0.18em] uppercase select-none">
        <div style={{ width:`${lp}%`, color:'rgba(255,180,171,0.5)', textAlign:'right', paddingRight:'6px' }}>
          {lp > 10 ? 'BELOW' : ''}
        </div>
        <div style={{ width:`${hp - lp}%`, color:'rgba(148,211,190,0.9)', textAlign:'center', fontWeight:700 }}>
          NORMAL RANGE
        </div>
        <div style={{ width:`${100 - hp}%`, color:'rgba(255,180,171,0.5)', textAlign:'left', paddingLeft:'6px' }}>
          {(100 - hp) > 10 ? 'ABOVE' : ''}
        </div>
      </div>

      {/* Bar */}
      <div className="relative" style={{ height:'52px' }}>
        <div className="absolute top-5 bottom-5 rounded-l-xl"
          style={{ left:0, width:`${lp}%`, background:'rgba(255,180,171,0.08)', border:'1px solid rgba(255,180,171,0.12)' }}/>
        <div className="absolute top-2 bottom-2 rounded-xl"
          style={{ left:`${lp}%`, width:`${hp-lp}%`, background:'rgba(148,211,190,0.14)', border:'1.5px solid rgba(148,211,190,0.4)', boxShadow:'inset 0 0 24px rgba(148,211,190,0.06)' }}/>
        <div className="absolute top-5 bottom-5 rounded-r-xl"
          style={{ left:`${hp}%`, right:0, background:'rgba(255,180,171,0.08)', border:'1px solid rgba(255,180,171,0.12)' }}/>
        <div className="absolute top-0 bottom-0 w-px" style={{ left:`${lp}%`, background:'rgba(148,211,190,0.5)' }}/>
        <div className="absolute top-0 bottom-0 w-px" style={{ left:`${hp}%`, background:'rgba(148,211,190,0.5)' }}/>
        <div className="absolute top-0 bottom-0 w-[3px] rounded-full"
          style={{ left:`${vp}%`, transform:'translateX(-50%)', background:c, boxShadow:`0 0 14px ${c}80` }}/>
        <div className="absolute w-3.5 h-3.5 rounded-sm"
          style={{ top:'-4px', left:`${vp}%`, transform:'translateX(-50%) rotate(45deg)', background:c, boxShadow:`0 0 10px ${c}` }}/>
      </div>

      {/* Value + scale */}
      <div className="relative h-5">
        <span className="absolute text-[10px] text-outline/35" style={{ left:0 }}>{dMin.toFixed(1)}</span>
        <span className="absolute text-[13px] font-bold -translate-x-1/2" style={{ left:`${vp}%`, color:c, textShadow:`0 0 12px ${c}` }}>{value}</span>
        <span className="absolute text-[10px] text-outline/35" style={{ right:0 }}>{dMax.toFixed(1)}</span>
      </div>

      {/* Ref labels — no arrows */}
      <div className="relative h-4">
        <span className="absolute text-[10px] -translate-x-1/2" style={{ left:`${lp}%`, color:'rgba(148,211,190,0.55)' }}>{refLow}</span>
        <span className="absolute text-[10px] -translate-x-1/2" style={{ left:`${hp}%`, color:'rgba(148,211,190,0.55)' }}>{refHigh}</span>
      </div>

      <div className="flex justify-center pt-1">
        <span className="text-[11px] px-3 py-1 rounded-full" style={{ background:'rgba(148,211,190,0.07)', color:'rgba(148,211,190,0.65)', border:'1px solid rgba(148,211,190,0.2)' }}>
          Normal range: {refLow} – {refHigh} {unit}
        </span>
      </div>
    </div>
  )
}

function Flashcard({ name, data }) {
  const status = data ? classifyStatus(data.value, data.ref_low, data.ref_high) : 'unknown'
  const cfg    = STATUS[status]
  const trend  = data?.trend
  const trendDir = trend?.length > 1 ? (trend[trend.length-1] > trend[0] ? 'rising' : 'falling') : null

  return (
    <div className="w-full max-w-2xl rounded-[2rem] p-8 flex flex-col gap-6"
      style={{ background:`linear-gradient(145deg,${cfg.bg},rgba(9,15,19,0.96))`, backdropFilter:'blur(28px)', border:`1px solid ${cfg.color}28`, boxShadow:`0 20px 80px ${cfg.glow}`, minHeight:'460px' }}>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-outline mb-1">Biomarker Analysis</p>
          <h2 className="text-4xl font-bold text-on-surface">{name}</h2>
        </div>
        <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
          style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
      </div>

      {data ? (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-7xl font-bold tabular-nums leading-none"
                style={{ color:cfg.color, textShadow:`0 0 40px ${cfg.color}60` }}>{data.value}</div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-lg text-outline">{data.unit}</span>
                {trendDir && <span className="text-sm" style={{ color:cfg.color }}>{trendDir === 'rising' ? '↑' : '↓'} {trendDir}</span>}
              </div>
            </div>
            {trend?.length > 1 && (
              <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] font-mono tracking-widest uppercase text-outline">Trajectory</p>
                <Sparkline values={trend} color={cfg.color} W={100} H={40} />
                <p className="text-[10px] text-outline">{trend.length} visit{trend.length > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] font-mono tracking-widest uppercase text-outline mb-4">Value vs Reference Range</p>
            <RangeBar value={data.value} refLow={data.ref_low} refHigh={data.ref_high} status={status} unit={data.unit} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
          <p className="text-lg text-outline">Not detected in uploaded reports</p>
          <p className="text-sm text-outline/50">This biomarker was not found in any uploaded PDF.</p>
        </div>
      )}
    </div>
  )
}

export default function FlashcardView({ biomarkerData, cardIdx, setCardIdx }) {
  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowLeft')  setCardIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setCardIdx(i => Math.min(BIO_ORDER.length - 1, i + 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setCardIdx])

  return (
    <div className="flex flex-col items-center gap-8">
      <Flashcard key={BIO_ORDER[cardIdx]} name={BIO_ORDER[cardIdx]} data={biomarkerData[BIO_ORDER[cardIdx]] || null} />

      <div className="flex items-center gap-6">
        <button onClick={() => setCardIdx(i => Math.max(0, i - 1))} disabled={cardIdx === 0}
          className="w-12 h-12 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-white/5 transition-all disabled:opacity-25 glass-stroke-thin"
          style={{ backdropFilter:'blur(12px)', background:'rgba(26,32,36,0.5)' }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="flex items-center gap-2">
          {BIO_ORDER.map((_, i) => (
            <button key={i} onClick={() => setCardIdx(i)} className="rounded-full transition-all duration-300"
              style={{ width: i === cardIdx ? '28px' : '8px', height:'8px', background: i === cardIdx ? '#9dcee1' : 'rgba(157,206,225,0.18)' }} />
          ))}
        </div>

        <button onClick={() => setCardIdx(i => Math.min(BIO_ORDER.length - 1, i + 1))} disabled={cardIdx === BIO_ORDER.length - 1}
          className="w-12 h-12 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-white/5 transition-all disabled:opacity-25 glass-stroke-thin"
          style={{ backdropFilter:'blur(12px)', background:'rgba(26,32,36,0.5)' }}>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      <p className="text-[11px] font-mono tracking-widest text-outline">
        {cardIdx + 1} / {BIO_ORDER.length} · ARROW KEYS TO NAVIGATE
      </p>
    </div>
  )
}
