import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDiagnostic } from '../context/DiagnosticContext'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Label
} from 'recharts'

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

  // 2. Trajectory Logic
  const currentGfr = latestFound['GFR']?.value || latestFound['eGFR']?.value || 90
  const decayRate = 0.03 + (risk_probability / 100) * 0.22
  
  const chartData = [
    { month: 0,  actual: currentGfr, projected: currentGfr },
    { month: 3,  projected: currentGfr * (1 - decayRate * 0.25) },
    { month: 6,  projected: currentGfr * (1 - decayRate * 0.5) },
    { month: 9,  projected: currentGfr * (1 - decayRate * 0.75) },
    { month: 12, projected: currentGfr * (1 - decayRate) },
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

                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false}>
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
