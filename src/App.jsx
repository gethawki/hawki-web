import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import { Helmet } from './components/common/Helmet.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Docs = lazy(() => import('./pages/Docs.jsx'))
const Changelog = lazy(() => import('./pages/Changelog.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
// The signed-in Cloud app is its own chunk; marketing pages never load it.
const CloudApp = lazy(() => import('./cloud/CloudApp.jsx'))

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
      <Helmet />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<Docs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/changelog/:slug" element={<Changelog />} />
          <Route path="/app/*" element={<CloudApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
