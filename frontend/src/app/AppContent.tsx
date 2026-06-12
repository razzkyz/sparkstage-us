import { BrowserRouter as Router } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { useIdleTabSessionRefresh } from '../hooks/useIdleTabSessionRefresh'
import { useSessionRefresh } from '../hooks/useSessionRefresh'
import ScrollToTop from '../components/ScrollToTop'
// import WhatsAppButton from '../components/WhatsAppButton'

export function AppContent() {
  useSessionRefresh()
  useIdleTabSessionRefresh()

  return (
    <Router>
      <ScrollToTop />
      <div className="bg-background-light text-text-light font-sans antialiased transition-colors duration-500 selection:bg-primary selection:text-white">
        <AppRoutes />
        {/* <WhatsAppButton /> */}
      </div>
    </Router>
  )
}
