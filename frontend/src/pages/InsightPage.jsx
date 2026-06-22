import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDiagnostic } from '../context/DiagnosticContext'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Label
} from 'recharts'
import { motion } from 'framer-motion'

const ALL_STAGES = [
  { stage: "Stage 1", desc: "Normal or High Function", color: "#94d3be", threat: "Low Risk", minEgfr: 90, numericStage: 1 },
  { stage: "Stage 2", desc: "Mildly Decreased Function", color: "#aee6d1", threat: "Mild Risk", minEgfr: 60, numericStage: 2 },
  { stage: "Stage 3a", desc: "Mild-to-Moderate Decline", color: "#fbbf24", threat: "Moderate Risk", minEgfr: 45, numericStage: 3 },
  { stage: "Stage 3b", desc: "Moderate-to-Severe Decline", color: "#f59e0b", threat: "High Risk", minEgfr: 30, numericStage: 4 },
  { stage: "Stage 4", desc: "Severely Decreased Function", color: "#f87171", threat: "Severe Danger", minEgfr: 15, numericStage: 5 },
  { stage: "Stage 5", desc: "Kidney Failure (ESRD)", color: "#ffb4ab", threat: "Critical Terminal", minEgfr: -Infinity, numericStage: 6 }
];

function getCKDStage(egfr) {
  for (const st of ALL_STAGES) {
    if (egfr >= st.minEgfr) return st;
  }
  return ALL_STAGES[ALL_STAGES.length - 1];
}

function calculateEgfr(scr, age = 50, gender = 'Male') {
  if (!scr) return null;
  const isFemale = gender.toLowerCase() === 'female';
  const k = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const genderMultiplier = isFemale ? 1.012 : 1;
  const egfr = 142 * Math.pow(Math.min(scr / k, 1), alpha) * Math.pow(Math.max(scr / k, 1), -1.200) * Math.pow(0.9938, age) * genderMultiplier;
  return Math.round(egfr * 10) / 10;
}

/* ── Section label ───────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-outline mb-1">{children}</p>
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

const RISK_CFG = {
  High:     { color: '#ff6b8a', glow: 'rgba(255,107,138,0.45)', bg: 'rgba(255,107,138,0.1)', border: 'rgba(255,107,138,0.2)', label: 'CRITICAL' },
  Moderate: { color: '#f59e0b', glow: 'rgba(245,158,11,0.45)',  bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  label: 'MONITOR' },
  Low:      { color: '#22d3ee', glow: 'rgba(34,211,238,0.45)',  bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.2)',  label: 'OPTIMAL' },
}

export default function InsightPage() {
  const navigate = useNavigate()
  const { prediction, visits } = useDiagnostic()

  if (!prediction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-on-background font-sans gap-6">
        <span className="material-symbols-outlined text-6xl text-outline">insights</span>
        <p className="text-headline-md text-on-surface">No insight data available.</p>
        <Link to="/upload" className="text-primary underline underline-offset-2">← Start by uploading a report</Link>
      </div>
    )
  }

  const { risk_probability, risk_label, shap_values } = prediction
  const cfg = RISK_CFG[risk_label] || RISK_CFG.Low
  const latestFound = visits[visits.length - 1]?.extractedData?.found || {}

  // 1. Logic: Map SHAP to sentences
  const shapEntries = Object.entries(shap_values || {})
    .filter(([feature]) => feature.startsWith('mean_val_') || feature === 'creat_slope')
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6)

  const mapShapToSentence = (value) => {
    if (value > 0) return "This factor is significantly increasing your risk."
    if (value < 0) return "This factor is currently protecting your kidney health."
    return "This factor has a neutral impact on your current risk."
  }

  // 2. Trajectory & Historical Logic
  const latestDate = new Date(visits[visits.length - 1]?.visitDate || new Date());
  
  const historicalData = visits.map(v => {
    const vDate = new Date(v.visitDate || new Date());
    const monthDiff = (vDate.getFullYear() - latestDate.getFullYear()) * 12 + (vDate.getMonth() - latestDate.getMonth());
    
    let gfr = v.extractedData?.found?.['eGFR']?.value || v.extractedData?.found?.['GFR']?.value;
    
    if (gfr === undefined) {
      const scr = v.extractedData?.found?.['Creatinine']?.value || v.visitPayload?.['Creatinine'];
      if (scr !== undefined) {
        gfr = calculateEgfr(scr, 50, 'Male');
      } else {
        gfr = 90;
      }
    }
    
    return { month: monthDiff, actual: gfr };
  });

  const currentGfr = historicalData.length > 0 ? historicalData[historicalData.length - 1].actual : 90;
  const decayRate = 0.03 + (risk_probability / 100) * 0.22;
  
  const currentStage = getCKDStage(currentGfr);
  const projectedMonth12Gfr = currentGfr * (1 - decayRate);
  const month12Stage = getCKDStage(projectedMonth12Gfr);
  const hasBreach = month12Stage.numericStage > currentStage.numericStage;

  if (historicalData.length > 0) {
    historicalData[historicalData.length - 1].projected = currentGfr;
  }
  
  const chartData = [
    ...historicalData,
    { month: 3,  projected: currentGfr * (1 - decayRate * 0.25) },
    { month: 6,  projected: currentGfr * (1 - decayRate * 0.5) },
    { month: 9,  projected: currentGfr * (1 - decayRate * 0.75) },
    { month: 12, projected: projectedMonth12Gfr },
  ]

  const cleanLabel = (feature) => feature
    .replace('mean_val_', '').replace('max_val_', '').replace('ever_abnormal_', '')
    .replace('creat_slope', 'Creatinine Slope').replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="min-h-screen font-sans text-on-background pt-24 pb-32 px-6">
      <div className="relative max-w-4xl mx-auto">
        
        {/* ── Back ──────────────────────────────────────────────────────── */}
        <button onClick={() => navigate('/results')}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-2xl text-sm text-outline transition-all duration-200 hover:text-on-surface"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Results
        </button>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <SectionLabel>Neural Insight</SectionLabel>
          <h1 className="text-4xl font-bold text-on-surface mt-2 mb-4">Clinical Explainability</h1>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed">
            Neural Insight bridges the gap between raw AI probability and clinical actionability. 
            We analyze the underlying biometric features driving your risk profile.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* ── Trajectory Chart ─────────────────────────────────────────── */}
          <GlassCard className="flex flex-col h-full">
            <SectionLabel>Future Trajectory</SectionLabel>
            <h2 className="text-xl font-bold text-on-surface mb-8">GFR Predicted Trend (12M)</h2>
            
            <div className="flex-1 h-[300px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  
                  {/* Visual Zones */}
                  <ReferenceArea y1={90} y2={120} fill="rgba(34,211,238,0.05)" />
                  <ReferenceArea y1={60} y2={90}  fill="rgba(245,158,11,0.05)" />
                  <ReferenceArea y1={30} y2={60}  fill="rgba(255,170,0,0.05)" />
                  <ReferenceArea y1={0}  y2={30}  fill="rgba(255,107,138,0.05)" />

                  <XAxis dataKey="month" type="number" domain={['dataMin', 12]} stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false}>
                    <Label value="Months from Today" offset={-20} position="insideBottom" fill="rgba(255,255,255,0.4)" fontSize={10} />
                  </XAxis>
                  
                  <YAxis domain={[0, 120]} stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false}>
                    <Label value="eGFR (mL/min/1.73m²)" angle={-90} position="insideLeft" offset={0} fill="rgba(255,255,255,0.4)" fontSize={10} />
                  </YAxis>

                  <Tooltip 
                    contentStyle={{ background: '#141c21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#22d3ee' }}
                    formatter={(val) => [`${val.toFixed(1)} mL/min`, 'eGFR']}
                  />

                  {/* Projected Line (Dotted) */}
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#22d3ee" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />

                  {/* Actual Point at Month 0 */}
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#22d3ee" 
                    strokeWidth={4} 
                    dot={{ fill: '#22d3ee', r: 6, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22d3ee] opacity-20" /> <span className="text-[10px] text-outline">Normal (90+)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b] opacity-20" /> <span className="text-[10px] text-outline">Mild (60-89)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ffaa00] opacity-20" /> <span className="text-[10px] text-outline">Moderate (30-59)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ff6b8a] opacity-20" /> <span className="text-[10px] text-outline">Severe (&lt;30)</span></div>
            </div>
          </GlassCard>

          {/* ── Driver Analysis ──────────────────────────────────────────── */}
          <GlassCard>
            <SectionLabel>Top Risk Drivers</SectionLabel>
            <h2 className="text-xl font-bold text-on-surface mb-6">Feature Interpretations</h2>
            
            <div className="space-y-6">
              {shapEntries.map(([feature, value]) => (
                <div key={feature} className="border-l-2 pl-4 py-1" style={{ borderColor: value > 0 ? '#ff6b8a' : '#22d3ee' }}>
                  <p className="text-sm font-bold text-on-surface">{cleanLabel(feature)}</p>
                  <p className="text-xs text-outline mt-1">{mapShapToSentence(value)}</p>
                </div>
              ))}
            </div>
          </GlassCard>

        </div>

        {/* ── Clinical Classification Matrix ─────────────────────────────── */}
        <GlassCard className="mb-8">
          <SectionLabel>Clinical Classification Matrix</SectionLabel>
          <h2 className="text-xl font-bold text-on-surface mb-6">Current CKD Staging</h2>
          
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between w-full">
            {ALL_STAGES.map((st, i) => {
              const isActive = st.numericStage === currentStage.numericStage;
              const isPast = st.numericStage < currentStage.numericStage;
              
              return (
                <motion.div
                  key={st.stage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                  className={`relative flex-1 rounded-2xl p-4 flex flex-col gap-2 border transition-all duration-300
                    ${isActive ? 'bg-slate-900/60 opacity-100 z-10 scale-105' : 'bg-slate-900/20 opacity-40 hover:opacity-60'}
                  `}
                  style={{
                    borderColor: isActive ? st.color : 'rgba(255,255,255,0.05)',
                    boxShadow: isActive ? `0 0 20px -5px ${st.color}80, inset 0 0 10px -5px ${st.color}40` : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isActive && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: st.color }}></span>
                        <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: st.color }}></span>
                      </span>
                    )}
                    <span className="text-sm font-bold tracking-tight" style={{ color: isActive ? st.color : '#94a3b8' }}>
                      {st.stage}
                    </span>
                  </div>
                  
                  <div className="text-[11px] leading-tight text-outline flex-1">
                    {st.desc}
                  </div>
                  
                  {isActive && (
                    <div className="mt-2 text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full w-max border"
                      style={{ color: st.color, borderColor: `${st.color}40`, backgroundColor: `${st.color}10` }}>
                      {st.threat}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {hasBreach && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 rounded-2xl p-4 border flex items-center gap-4 bg-red-900/20 border-red-500/30"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20 text-red-400">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <p className="text-sm font-bold text-red-400 uppercase tracking-widest mb-0.5">Trajectory Stage Breach Alert</p>
                <p className="text-sm text-red-200/80">
                  Warning: Current velocity predicts evolution to <strong className="text-red-300">{month12Stage.stage}</strong> within 12 months if unmitigated.
                </p>
              </div>
            </motion.div>
          )}
        </GlassCard>

        {/* ── Conclusion ────────────────────────────────────────────────── */}
        <div className="rounded-2xl px-8 py-6 flex flex-col gap-2"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(157,206,225,0.05) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">Clinical Recommendation</p>
          <p className="text-lg text-on-surface leading-relaxed font-medium">
            Based on the analysis, {risk_label === 'High' ? 'urgent' : 'proactive'} monitoring of {cleanLabel(shapEntries[0][0])} is advised to stabilize the GFR trajectory.
          </p>
        </div>

      </div>
    </div>
  )
}
