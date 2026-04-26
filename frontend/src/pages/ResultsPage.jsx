import { useLocation, Link } from 'react-router-dom'
import { useDiagnostic } from '../context/DiagnosticContext'

function Icon({ name, filled = false, size = 'text-2xl', className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${size} ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}

export default function ResultsPage() {
  const { state } = useLocation()
  const { prediction: ctxPrediction, visits: ctxVisits } = useDiagnostic()

  // Context is primary; navigate state is fallback
  const prediction = ctxPrediction || state?.prediction
  const visits     = ctxVisits?.length ? ctxVisits : (state?.visits || [])

  if (!prediction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-on-background font-sans gap-6">
        <Icon name="error" size="text-5xl" className="text-outline" />
        <p className="text-headline-md text-on-surface">No results found.</p>
        <Link to="/upload" className="text-primary underline underline-offset-2 text-body-lg">
          ← Go back and upload a report
        </Link>
      </div>
    )
  }

  const { risk_probability, risk_label, shap_values, feature_values, creat_slope, n_visits } = prediction

  const riskStyle = {
    High:     { color: '#ffb4ab', bg: 'rgba(255,180,171,0.1)',  border: 'rgba(255,180,171,0.25)' },
    Moderate: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)'  },
    Low:      { color: '#94d3be', bg: 'rgba(148,211,190,0.1)',  border: 'rgba(148,211,190,0.25)' },
  }[risk_label] || { color: '#9dcee1', bg: 'rgba(157,206,225,0.1)', border: 'rgba(157,206,225,0.25)' }

  const shapEntries = Object.entries(shap_values || {})
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
  const maxShap = Math.max(...shapEntries.map(([, v]) => Math.abs(v)), 0.001)

  return (
    <div className="min-h-screen text-on-background font-sans flex flex-col items-center pt-24 pb-24 px-6">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(157,206,225,0.08)', border: '1px solid rgba(157,206,225,0.2)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#9dcee1' }} />
            <span className="text-label-sm text-primary">CKD Risk Assessment</span>
          </div>
          <h1 className="text-display-xl font-bold tracking-tighter text-on-surface glow-text-lavender">
            Risk Prediction
          </h1>
        </div>

        {/* ── Risk Score Hero ───────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4 mb-8">
          <div className="col-span-12 md:col-span-5 rounded-3xl p-8 flex flex-col items-center justify-center text-center"
            style={{ background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, backdropFilter: 'blur(20px)' }}>
            <div className="text-label-sm mb-4" style={{ color: riskStyle.color }}>CKD Risk Score</div>
            <div className="font-bold leading-none mb-3"
              style={{ fontSize: '80px', color: riskStyle.color, textShadow: `0 0 40px ${riskStyle.color}60` }}>
              {risk_probability}<span className="text-4xl">%</span>
            </div>
            <div className="px-6 py-2 rounded-full text-label-sm font-bold"
              style={{ background: riskStyle.border, color: riskStyle.color }}>
              {risk_label} Risk
            </div>
            <p className="text-body-md text-outline mt-4">
              Based on {n_visits} visit{n_visits > 1 ? 's' : ''}
              {creat_slope !== 0 && ` · Slope: ${creat_slope > 0 ? '+' : ''}${creat_slope?.toFixed(3)}`}
            </p>
          </div>

          {/* Biomarker summary */}
          <div className="col-span-12 md:col-span-7 glass-stroke-thin rounded-3xl p-8"
            style={{ background: 'rgba(26,32,36,0.6)', backdropFilter: 'blur(20px)' }}>
            <div className="text-label-sm text-outline mb-6">Biomarker Summary</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(feature_values || {})
                .filter(([k]) => k.startsWith('mean_val_'))
                .map(([key, val]) => {
                  const biomarker = key.replace('mean_val_', '')
                  const isAbnormal = feature_values[`ever_abnormal_${biomarker}`] === 1
                  return (
                    <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-body-md text-outline">{biomarker}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-body-md font-semibold text-on-surface">{val?.toFixed(2)}</span>
                        {isAbnormal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,180,171,0.15)', color: '#ffb4ab' }}>
                            Abnormal
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* ── SHAP Explanation ──────────────────────────────────────────── */}
        <div className="glass-stroke-thin rounded-3xl p-8 mb-8"
          style={{ background: 'rgba(26,32,36,0.6)', backdropFilter: 'blur(20px)' }}>
          <div className="text-label-sm text-outline mb-2">SHAP Feature Importance</div>
          <p className="text-body-md text-outline mb-6">
            Positive values push risk higher; negative values reduce it.
          </p>
          <div className="space-y-3">
            {shapEntries.map(([feature, value]) => {
              const isPos = value >= 0
              const barW  = (Math.abs(value) / maxShap) * 100
              const label = feature
                .replace(/^(mean_val_|max_val_|ever_abnormal_)/, '')
                .replace('creat_slope', 'Creatinine Slope')
              return (
                <div key={feature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body-md text-on-surface-variant">{label}</span>
                    <span className="text-label-sm font-semibold" style={{ color: isPos ? '#ffb4ab' : '#94d3be' }}>
                      {isPos ? '+' : ''}{value.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barW}%`,
                        background: isPos
                          ? 'linear-gradient(90deg,#ffb4ab,#ff6b6b)'
                          : 'linear-gradient(90deg,#94d3be,#9dcee1)',
                      }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Visit Timeline ────────────────────────────────────────────── */}
        {visits.length > 0 && (
          <div className="glass-stroke-thin rounded-3xl p-8 mb-8"
            style={{ background: 'rgba(26,32,36,0.6)', backdropFilter: 'blur(20px)' }}>
            <div className="text-label-sm text-outline mb-6">Visit Timeline</div>
            <div className="flex flex-col gap-4">
              {visits.map(({ visitDate, extractedData }, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full mt-1.5"
                      style={{ background: '#9dcee1', boxShadow: '0 0 8px rgba(157,206,225,0.5)' }} />
                    {i < visits.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ background: 'rgba(157,206,225,0.2)', minHeight: '24px' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-label-sm text-primary mb-2">Visit {i + 1} — {visitDate}</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(extractedData?.found || {}).map(([b, info]) => (
                        <span key={b} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(157,206,225,0.08)', border: '1px solid rgba(157,206,225,0.15)', color: '#c0c8cb' }}>
                          {b}: <strong style={{ color: '#dde3e9' }}>{info.value}</strong> {info.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
          style={{ background: 'rgba(203,190,251,0.06)', border: '1px solid rgba(203,190,251,0.2)' }}>
          <Icon name="info" size="text-lg" className="text-tertiary mt-0.5 flex-shrink-0" />
          <p className="text-body-md text-on-surface-variant">
            <span className="text-tertiary font-semibold">Research &amp; Educational Use Only. </span>
            Not a medical diagnosis. Consult a qualified nephrologist.
          </p>
        </div>

      </div>
    </div>
  )
}
