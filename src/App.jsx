import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/layout/ScrollToTop.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Docs = lazy(() => import('./pages/Docs.jsx'))
const Changelog = lazy(() => import('./pages/Changelog.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0b]">
      <div className="flex items-center gap-3 text-[#77746C]">
        <span className="w-2 h-2 rounded-full bg-[#687F97] animate-pulse" />
        <span className="font-mono text-sm">loading…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<Docs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/changelog/:slug" element={<Changelog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
