import { createContext, useContext, useState } from 'react'

const DiagnosticContext = createContext(null)

export function DiagnosticProvider({ children }) {
  const [visits, setVisits] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [scanSeen, setScanSeen] = useState(false)   // scanner shown at most once

  return (
    <DiagnosticContext.Provider value={{ visits, setVisits, prediction, setPrediction, scanSeen, setScanSeen }}>
      {children}
    </DiagnosticContext.Provider>
  )
}

export const useDiagnostic = () => {
  const ctx = useContext(DiagnosticContext)
  if (!ctx) throw new Error('useDiagnostic must be used within DiagnosticProvider')
  return ctx
}
