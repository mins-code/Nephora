import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useDiagnostic } from '../context/DiagnosticContext'

const API_BASE = 'http://localhost:8000'

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

/* ── Each file entry shape ──────────────────────────────────────────────────
  {
    id: uuid,
    file: File,
    visitDate: 'YYYY-MM-DD' | '',
    autoExtracted: bool,        // date came from PDF scan
    extractedData: null | {},   // full /extract response
    status: 'idle'|'loading'|'done'|'error',
    errorMsg: null | string,
  }
─────────────────────────────────────────────────────────────────────────── */

export default function UploadPage() {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { setVisits } = useDiagnostic()

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const updateFile = (id, patch) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  /* ── POST /extract for a single file ─────────────────────────────────── */
  const extractFile = useCallback(async (id, file) => {
    updateFile(id, { status: 'loading' })
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('visit_date', '')           // placeholder; we override from extracted_date
      const { data } = await axios.post(`${API_BASE}/extract`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateFile(id, {
        status: 'done',
        extractedData: data,
        visitDate: data.extracted_date || '',
        autoExtracted: !!data.extracted_date,
      })
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d?.msg || JSON.stringify(d)).join('; ')
          : 'Extraction failed. Is the backend running?'
      updateFile(id, { status: 'error', errorMsg: msg })
    }
  }, [])  // eslint-disable-line

  /* ── Add files + immediately kick off extraction ─────────────────────── */
  const addFiles = useCallback((incoming) => {
    const pdfs = Array.from(incoming).filter(f => f.type === 'application/pdf')
    if (!pdfs.length) return
    const newEntries = pdfs.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      visitDate: '',
      autoExtracted: false,
      extractedData: null,
      status: 'idle',
      errorMsg: null,
    }))
    setFiles(prev => [...prev, ...newEntries])
    // Fire extraction immediately for each new file
    newEntries.forEach(entry => extractFile(entry.id, entry.file))
  }, [extractFile])

  const removeFile = id => setFiles(prev => prev.filter(f => f.id !== id))
  const setDate = (id, date) => updateFile(id, { visitDate: date, autoExtracted: false })

  /* ── Drag-and-drop ────────────────────────────────────────────────────── */
  const onDragOver = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }
  const onPickFile = e => addFiles(e.target.files)

  /* ── Derived state ───────────────────────────────────────────────────── */
  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const allDated = files.length > 0 && files.every(f => f.visitDate !== '')
  const canAnalyse = allDone && allDated

  /* ── Analyse: sort → store in context → navigate to /analysis ───────────── */
  const handleAnalyse = () => {
    setGlobalError(null)
    const sorted = [...files].sort((a, b) => a.visitDate.localeCompare(b.visitDate))
    const visits = sorted.map(({ visitDate, extractedData }) => {
      const visit = { visit_date: visitDate }
      if (extractedData?.found) {
        Object.entries(extractedData.found).forEach(([biomarker, info]) => {
          visit[biomarker] = info.value
          visit[`${biomarker}_ref_low`] = info.ref_low
          visit[`${biomarker}_ref_high`] = info.ref_high
        })
      }
      return visit
    })
    const sortedVisitsState = sorted.map((f, i) => ({
      visitDate: f.visitDate,
      extractedData: f.extractedData,
      visitPayload: visits[i],
    }))
    setVisits(sortedVisitsState)
    navigate('/analysis', { state: { visits: sortedVisitsState } })
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen text-on-background font-sans flex flex-col items-center justify-start pt-28 pb-24 px-6 relative">


      {/* Page heading */}
      <div className="w-full max-w-3xl mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(148,211,190,0.08)', border: '1px solid rgba(148,211,190,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-label-sm text-secondary">Step 1 of 2 — Upload Reports</span>
        </div>
        <h1 className="text-display-xl font-bold tracking-tighter text-on-surface glow-text-lavender mb-4">
          Upload Blood Reports
        </h1>
        <p className="text-body-lg text-outline max-w-xl mx-auto">
          Upload one or more PDF lab reports. Dates are auto-detected — review and confirm before analysing.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="w-full max-w-3xl mb-8 flex items-start gap-3 px-5 py-4 rounded-2xl"
        style={{ background: 'rgba(203,190,251,0.06)', border: '1px solid rgba(203,190,251,0.2)' }}>
        <Icon name="info" size="text-lg" className="text-tertiary mt-0.5 flex-shrink-0" />
        <p className="text-body-md text-on-surface-variant">
          <span className="text-tertiary font-semibold">Research &amp; Educational Use Only. </span>
          Not a substitute for professional medical advice. Always consult a qualified nephrologist.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={[
          'w-full max-w-3xl rounded-3xl p-10 flex flex-col items-center justify-center gap-4',
          'cursor-pointer transition-all duration-300',
          dragging ? 'glow-effect-cyan' : 'hover:bg-white/5',
        ].join(' ')}
        style={{
          background: dragging ? 'rgba(157,206,225,0.07)' : 'rgba(26,32,36,0.5)',
          border: dragging ? '1.5px dashed rgba(157,206,225,0.6)' : '1.5px dashed rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          minHeight: '180px',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={onPickFile} />
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{ background: dragging ? 'rgba(157,206,225,0.15)' : 'rgba(157,206,225,0.08)' }}>
          <Icon name={dragging ? 'file_download' : 'upload_file'} size="text-3xl" className="text-primary" />
        </div>
        <div className="text-center">
          <p className="text-body-lg text-on-surface font-medium">
            {dragging ? 'Drop your PDFs here' : 'Drag & drop PDF reports here'}
          </p>
          <p className="text-body-md text-outline mt-1">
            or <span className="text-primary underline underline-offset-2">click to browse</span> — dates auto-detected
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="w-full max-w-3xl mt-6 flex flex-col gap-3">
          <p className="text-label-sm text-outline mb-1">
            {files.length} report{files.length > 1 ? 's' : ''} — confirm or adjust visit dates
          </p>

          {files.map(({ id, file, visitDate, status, errorMsg, autoExtracted }) => (
            <div key={id}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl glass-stroke-thin transition-all duration-200"
              style={{ background: 'rgba(26,32,36,0.7)', backdropFilter: 'blur(16px)' }}>

              {/* PDF icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(157,206,225,0.1)' }}>
                {status === 'loading'
                  ? <svg className="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  : status === 'error'
                    ? <Icon name="error" size="text-lg" className="text-error" />
                    : <Icon name="picture_as_pdf" size="text-lg" className="text-primary" />
                }
              </div>

              {/* Filename + status */}
              <div className="flex-1 min-w-0">
                <p className="text-body-md text-on-surface truncate font-medium">{file.name}</p>
                <p className="text-label-sm mt-0.5" style={{
                  color: status === 'error' ? '#ffb4ab'
                    : status === 'loading' ? '#8a9296'
                      : status === 'done' ? '#94d3be'
                        : '#41484b'
                }}>
                  {status === 'loading' && 'Extracting biomarkers…'}
                  {status === 'error' && (errorMsg || 'Extraction failed')}
                  {status === 'done' && 'Extracted ✓'}
                  {status === 'idle' && 'Pending…'}
                </p>
              </div>

              {/* Date picker + auto badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {autoExtracted && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full"
                    style={{ background: 'rgba(148,211,190,0.12)', color: '#94d3be', border: '1px solid rgba(148,211,190,0.25)' }}>
                    <span>●</span> Auto-detected
                  </span>
                )}
                <input
                  type="date"
                  value={visitDate}
                  onChange={e => setDate(id, e.target.value)}
                  className="px-3 py-2 rounded-xl text-body-md text-on-surface outline-none transition-all duration-200"
                  style={{
                    background: visitDate ? 'rgba(157,206,225,0.1)' : 'rgba(255,255,255,0.04)',
                    border: visitDate ? '1px solid rgba(157,206,225,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Remove */}
              <button onClick={() => removeFile(id)}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-red-500/15 hover:text-red-400 text-outline"
                title="Remove file">
                <Icon name="close" size="text-base" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="w-full max-w-3xl mt-4 flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)' }}>
          <Icon name="error" size="text-lg" className="text-error flex-shrink-0" />
          <p className="text-body-md text-error">{globalError}</p>
        </div>
      )}

      {/* Analyse Button */}
      <div className="w-full max-w-3xl mt-8 flex flex-col items-start gap-4">
        <button
          onClick={handleAnalyse}
          disabled={!canAnalyse}
          className={[
            'group relative px-12 py-5 rounded-2xl overflow-hidden transition-all duration-300 flex items-center gap-4',
            canAnalyse
              ? 'cursor-pointer hover:border-amber-500/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.25)]'
              : 'cursor-not-allowed opacity-40',
          ].join(' ')}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <span className="relative text-amber-400 flex items-center gap-3 text-lg font-semibold tracking-wide">
            <Icon name="biotech" size="text-2xl" />
            Analyse Reports
            <Icon name="arrow_forward" size="text-xl" className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </span>
        </button>

        {files.length > 0 && !allDated && (
          <p className="text-body-md text-outline">Assign a date to every report to continue.</p>
        )}
        {files.length > 0 && allDated && !allDone && (
          <p className="text-body-md text-outline">Waiting for all extractions to finish…</p>
        )}
      </div>

    </div>
  )
}
