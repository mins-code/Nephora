import React, { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown Date'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

export default function SequenceMatrixPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  
  // Guard
  if (!state || !state.prediction || !state.visits) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-on-background font-sans gap-6" style={{ background: '#0e1418' }}>
        <span className="material-symbols-outlined text-6xl text-outline">error</span>
        <p className="text-xl text-on-surface">No sequence data found.</p>
        <button onClick={() => navigate(-1)} className="text-[#22d3ee] underline">Go back</button>
      </div>
    )
  }

  const { prediction, visits } = state
  const { inception_visit_index, top_3_biomarkers, visit_egfr_values } = prediction
  
  const [activeVisitIndex, setActiveVisitIndex] = useState(inception_visit_index ?? (visits.length - 1))

  // Derived data for the active node
  const activeVisit = visits[activeVisitIndex]
  const activeDate = formatDate(activeVisit?.visitDate)
  const activeEgfr = visit_egfr_values[activeVisitIndex]
  
  const inceptionDate = inception_visit_index !== null && inception_visit_index !== undefined 
    ? formatDate(visits[inception_visit_index]?.visitDate)
    : 'None'

  const top3String = top_3_biomarkers?.length ? top_3_biomarkers.join(', ') : 'key biomarkers'

  const chartData = visits.map((v, i) => {
    const dataPoint = {
      name: `Visit ${i + 1}`,
      eGFR: visit_egfr_values[i],
    }
    top_3_biomarkers?.forEach(bio => {
      const bioData = v?.extractedData?.found?.[bio] || v?.visitPayload?.[bio];
      let val = 0;
      if (typeof bioData === 'object' && bioData !== null) val = parseFloat(bioData.value);
      else if (bioData !== undefined) val = parseFloat(bioData);
      dataPoint[bio] = isNaN(val) ? 0 : val;
    })
    return dataPoint;
  })

  const lineColors = ['#f43f5e', '#a855f7', '#eab308']

  return (
    <div className="min-h-screen font-sans text-on-background pt-20 pb-32 px-6" style={{ background: '#0e1418' }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: 'linear-gradient(rgba(157,206,225,1) 1px,transparent 1px),linear-gradient(90deg,rgba(157,206,225,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,211,238,0.05), transparent)` }} />

      <div className="relative max-w-5xl mx-auto">
        
        {/* ── Back ──────────────────────────────────────────────────────── */}
        <button onClick={() => navigate('/results')}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-2xl text-sm text-outline transition-all duration-200 hover:text-on-surface"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Results
        </button>

        <div className="mb-10 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#22d3ee] mb-2">Diagnostic Deep-Dive</p>
          <h1 className="text-4xl font-bold text-on-surface mb-4 tracking-tight">Sequence Matrix</h1>
          <p className="text-outline max-w-2xl mx-auto">
            Analyze the chronological shifts in your top biomarker drivers to understand exactly how and when the risk vector evolved.
          </p>
        </div>

        {/* ── 4-Visit Chronological Track ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {visits.map((v, i) => {
            const isInception = i === inception_visit_index;
            const isActive = i === activeVisitIndex;
            
            return (
              <button 
                key={i}
                onClick={() => setActiveVisitIndex(i)}
                className="relative p-6 rounded-3xl flex flex-col items-center text-center transition-all duration-300 outline-none text-left"
                style={{ 
                  background: isActive ? 'rgba(34,211,238,0.1)' : 'rgba(20,28,33,0.6)', 
                  border: `1px solid ${isActive ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  transform: isActive ? 'translateY(-4px)' : 'none',
                  boxShadow: isActive ? '0 10px 30px rgba(34,211,238,0.1)' : 'none'
                }}>
                
                {isInception && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10">
                    <span className="material-symbols-outlined text-[10px] text-white animate-pulse">warning</span>
                    <span className="text-[8px] font-bold text-white uppercase tracking-widest whitespace-nowrap">Inception</span>
                  </div>
                )}
                
                <div className="text-[10px] text-outline tracking-[0.2em] uppercase font-bold mb-1">
                  Visit {i + 1}
                </div>
                <div className="text-sm font-medium text-on-surface mb-6">
                  {formatDate(v.visitDate)}
                </div>
                
                <div className="text-[10px] tracking-widest uppercase text-outline mb-1">eGFR</div>
                <div className="text-3xl font-black" style={{ color: isActive ? '#22d3ee' : '#fff' }}>
                  {visit_egfr_values[i]}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Interactive Biomarker Inspection ──────────────────────────── */}
        <div className="rounded-3xl p-8 mb-8"
          style={{ background: 'rgba(20,28,33,0.8)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#22d3ee] mb-1">Inspection Node</p>
              <h2 className="text-2xl font-bold text-on-surface">Visit {activeVisitIndex + 1} Matrix</h2>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-on-surface">{activeDate}</div>
              <div className="text-xs text-outline">eGFR: <span className="text-[#22d3ee] font-bold">{activeEgfr}</span> mL/min</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Top 3 Drivers */}
            <div>
              <h3 className="text-sm font-bold text-on-surface mb-4 tracking-wide">Top 3 Driving Biomarkers</h3>
              <div className="flex flex-col gap-4">
                {top_3_biomarkers?.map(bio => {
                  const bioData = activeVisit?.extractedData?.found?.[bio] || activeVisit?.visitPayload?.[bio];
                  let displayValue = "N/A";
                  if (typeof bioData === 'object' && bioData !== null) {
                    displayValue = `${bioData.value} ${bioData.unit || ''}`;
                  } else if (bioData !== undefined) {
                    displayValue = String(bioData);
                  }

                  return (
                    <div key={bio} className="flex justify-between items-center p-4 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="font-semibold text-on-surface">{bio}</div>
                      <div className="font-mono text-[#ff6b8a] font-bold">{displayValue}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Trajectory Chart */}
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-on-surface mb-4 tracking-wide">Multi-Biomarker Trajectory</h3>
              <div className="flex-1 min-h-[250px] w-full" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: '20px 20px 0 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                    
                    {/* Left Axis for eGFR */}
                    <YAxis yAxisId="left" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} domain={[0, 120]} />
                    
                    {/* Right Axis for Biomarkers */}
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.1)" fontSize={10} axisLine={false} tickLine={false} />
                    
                    <Tooltip 
                      contentStyle={{ background: '#141c21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#22d3ee' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    
                    <Line yAxisId="left" type="monotone" dataKey="eGFR" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#22d3ee' }} />
                    
                    {top_3_biomarkers?.map((bio, idx) => (
                      <Line key={bio} yAxisId="right" type="monotone" dataKey={bio} stroke={lineColors[idx]} strokeWidth={2} dot={{ r: 3, fill: lineColors[idx] }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Temporal Diagnostics Block ──────────────────────────────── */}
        <div className="rounded-2xl p-6 flex items-start gap-4 mb-8"
          style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)' }}>
          <span className="material-symbols-outlined shrink-0" style={{ color: '#22d3ee' }}>psychology</span>
          <p className="text-sm text-on-surface leading-relaxed">
            <span className="font-bold text-[#22d3ee]">AI Temporal Inception Diagnostics: </span>
            {inception_visit_index !== null && inception_visit_index !== undefined ? (
              <>
                Neural sequence evaluation confirms structural functional decline initialized during <strong className="text-white">{inceptionDate}</strong>. 
                At this junction, the sudden velocity shift in <strong className="text-white">{top3String}</strong> crossed homeostatic limits, driving the overall kidney trajectory downward.
              </>
            ) : (
              <>
                Neural sequence evaluation indicates a stable homeostatic profile. No pathological decline or critical velocity shifts were detected across the longitudinal tracking window.
              </>
            )}
          </p>
        </div>

      </div>
    </div>
  )
}
