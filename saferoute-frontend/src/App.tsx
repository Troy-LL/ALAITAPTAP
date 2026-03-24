import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import HomePage from '@/pages/HomePage'
import MapPage from '@/pages/MapPage'
import AboutPage from '@/pages/AboutPage'

/**
 * On mobile (< 768px) redirect the landing page directly to the map so users
 * get to the core feature immediately without scrolling through the marketing page.
 * Uses synchronous matchMedia — no useState — to avoid any flash of the home page.
 */
function MobileHomeRedirect() {
  const isMobile = window.matchMedia('(max-width: 767px)').matches
  return isMobile ? <Navigate to="/map" replace /> : <HomePage />
}

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 pt-20">
        <Routes>
          <Route path="/" element={<MobileHomeRedirect />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
