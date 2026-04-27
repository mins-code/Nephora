import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useDiagnostic } from '../context/DiagnosticContext'
import FlashcardView from './FlashcardView'
import NetworkView   from './NetworkView'

const API = 'http://localhost:8000'
const BIO_ORDER = ['Creatinine','BUN','Potassium','Sodium','Hemoglobin','Bicarbonate','Calcium','Glucose']

/* ── Scanning overlay ───────────────────────────────────────────────── */
function Scanner({ onDone }) {
  const [step, setStep] = useState(0)
  const steps = ['Parsing temporal blood data…','Computing biomarker deviations…','Building trajectory models…','Generating clinical narrative…']
  useEffect(() => {
    steps.forEach((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 600))
    setTimeout(onDone, steps.length * 600 + 500)
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans"
      style={{ background: 'rgba(9,15,19,0.97)', backdropFilter: 'blur(30px)' }}>
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(157,206,225,1) 1px,transparent 1px),linear-gradient(90deg,rgba(157,206,225,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="relative flex flex-col items-center gap-8 max-w-md w-full px-8 text-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full animate-ping" style={{ background: 'rgba(157,206,225,0.08)', animationDuration: '1.6s' }} />
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(157,206,225,0.2),rgba(148,211,190,0.15))', border: '1px solid rgba(157,206,225,0.3)', boxShadow: '0 0 50px rgba(157,206,225,0.4)' }}>
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>biotech</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-primary mb-2">Nephora Intelligence Engine</p>
          <h2 className="text-2xl font-bold text-on-surface">Analyzing Biomarker Trajectories</h2>
        </div>
        <div className="w-full space-y-2 text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3" style={{ opacity: step > i ? 1 : 0.2, transition: 'opacity 0.4s' }}>
              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: step > i ? 'rgba(148,211,190,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${step > i ? '#94d3be' : 'rgba(255,255,255,0.08)'}` }}>
                {step > i && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#94d3be' }} />}
              </div>
              <span className="text-[12px] font-mono" style={{ color: step > i ? '#94d3be' : '#41484b' }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="w-full h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full transition-all duration-500" style={{ width: `${(step / steps.length) * 100}%`, background: 'linear-gradient(90deg,#9dcee1,#94d3be)' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Page tab switcher ──────────────────────────────────────────────── */
function PageSwitcher({ page, setPage }) {
  return (
    <div className="flex items-center gap-2 p-1 rounded-2xl" style={{ background: 'rgba(26,32,36,0.6)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
      {[
        { n: 1, label: 'Biomarker Cards', icon: 'style' },
        { n: 2, label: 'Intelligence Map', icon: 'hub' },
      ].map(({ n, label, icon }) => (
        <button key={n} onClick={() => setPage(n)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-sm font-semibold transition-all duration-200"
          style={page === n
            ? { background: 'rgba(157,206,225,0.12)', color: '#9dcee1', border: '1px solid rgba(157,206,225,0.2)' }
            : { color: '#8a9296', border: '1px solid transparent' }}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────────── */
export default function AnalysisPage() {
  const { visits, prediction, setPrediction, scanSeen, setScanSeen } = useDiagnostic()
  const [scanning, setScanning] = useState(!scanSeen)  // skip if already seen once
  const [page, setPage]         = useState(1)
  const [cardIdx, setCardIdx]   = useState(0)
  const [predicting, setPredicting] = useState(false)
  const [error, setError]       = useState(null)
  const navigate = useNavigate()

  /* Aggregate biomarker data across visits */
  const biomarkerData = {}
  visits.forEach(v => Object.entries(v.extractedData?.found || {}).forEach(([b, info]) => {
    if (!biomarkerData[b]) biomarkerData[b] = { ...info, trend: [] }
    biomarkerData[b].trend.push(info.value)
    biomarkerData[b] = { ...info, trend: biomarkerData[b].trend }
  }))

  if (!visits.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 font-sans text-on-background">
      <span className="material-symbols-outlined text-6xl text-outline">upload_file</span>
      <button onClick={() => navigate('/upload')} className="text-primary underline text-body-lg">← Upload Reports First</button>
    </div>
  )

  const handlePredict = async () => {
    setPredicting(true); setError(null)
    try {
      const { data: pred } = await axios.post(`${API}/predict`, { visits: visits.map(v => v.visitPayload) })
      pred.n_visits = visits.length
      pred.creat_slope = pred.feature_values?.creat_slope ?? 0
      setPrediction(pred)
      navigate('/results')
    } catch (err) {
      const d = err?.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => x?.msg).join('; ') : 'Prediction failed. Is the backend running?')
      setPredicting(false)
    }
  }

  return (
    <div className="min-h-screen font-sans text-on-background pt-20 pb-36">
      {scanning && <Scanner onDone={() => { setScanSeen(true); setScanning(false) }} />}

      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="pt-8 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(157,206,225,0.08)', border: '1px solid rgba(157,206,225,0.2)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#9dcee1' }} />
            <span className="text-label-sm text-primary">{visits.length} Visit{visits.length > 1 ? 's' : ''} · {Object.keys(biomarkerData).length} Biomarkers Extracted</span>
          </div>
          <h1 className="text-display-xl font-bold tracking-tighter text-on-surface glow-text-lavender mb-2">Biomarker Intelligence</h1>
          <p className="text-body-lg text-outline">AI-revealed insights from your temporal blood biomarker data.</p>
        </div>

        {/* Page switcher */}
        <div className="flex justify-center mb-10">
          <PageSwitcher page={page} setPage={setPage} />
        </div>

        {/* Page 1: Flashcards */}
        {page === 1 && (
          <FlashcardView biomarkerData={biomarkerData} cardIdx={cardIdx} setCardIdx={setCardIdx} />
        )}

        {/* Page 2: Network visualization */}
        {page === 2 && (
          <NetworkView biomarkerData={biomarkerData} prediction={prediction} />
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)' }}>
            <span className="material-symbols-outlined text-error">error</span>
            <p className="text-body-md text-error">{error}</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <button onClick={handlePredict} disabled={predicting}
            className="group relative px-16 py-6 rounded-2xl overflow-hidden flex items-center gap-4 transition-all duration-300 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 50px rgba(245,158,11,0.3)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            {predicting ? (
              <span className="relative text-amber-400 text-xl font-bold flex items-center gap-3">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                Computing Risk Profile…
              </span>
            ) : (
              <span className="relative text-amber-400 text-xl font-bold tracking-wide flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                Calculate Clinical Risk
                <span className="material-symbols-outlined text-xl opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">arrow_forward</span>
              </span>
            )}
          </button>
          <p className="text-[11px] text-outline">Research &amp; Educational Use Only</p>
        </div>
      </div>
    </div>
  )
}
