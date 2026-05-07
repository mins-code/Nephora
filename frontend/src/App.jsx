import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'

import { DiagnosticProvider } from './context/DiagnosticContext'
import Navbar       from './components/Navbar'
import LandingPage  from './pages/LandingPage'
import UploadPage   from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import ResultsPage  from './pages/ResultsPage'
import InsightPage  from './pages/InsightPage'
import ChatPage     from './pages/ChatPage'

/* Global background blobs — rendered once, behind everything */
function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ background: 'rgba(157,206,225,0.09)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
        style={{ background: 'rgba(148,211,190,0.09)' }} />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[150px]"
        style={{ background: 'rgba(203,190,251,0.05)' }} />
      <div className="absolute inset-0 fog-gradient" />
    </div>
  )
}


/* AppShell — lives inside Router so useLocation works */
function AppShell() {
  const { pathname } = useLocation()
  const showNavbar = pathname !== '/'

  return (
    <>
      <Background />
      {showNavbar && <Navbar />}
      <div className="relative z-10">
        <Routes>
          <Route path="/"        element={<LandingPage />}  />
          <Route path="/upload"  element={<UploadPage />}   />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/results" element={<ResultsPage />}  />
          <Route path="/insight" element={<InsightPage />}  />
          <Route path="/ai"      element={<ChatPage />}       />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DiagnosticProvider>
        <AppShell />
      </DiagnosticProvider>
    </BrowserRouter>
  )
}
