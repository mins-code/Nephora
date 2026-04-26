import { createContext, useContext, useState } from 'react'

const DiagnosticContext = createContext(null)

export function DiagnosticProvider({ children }) {
  const [visits, setVisits] = useState([])       // sorted extracted visits
  const [prediction, setPrediction] = useState(null)

  return (
    <DiagnosticContext.Provider value={{ visits, setVisits, prediction, setPrediction }}>
      {children}
    </DiagnosticContext.Provider>
  )
}

export const useDiagnostic = () => {
  const ctx = useContext(DiagnosticContext)
  if (!ctx) throw new Error('useDiagnostic must be used within DiagnosticProvider')
  return ctx
}
