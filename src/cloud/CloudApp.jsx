import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth.jsx'
import { FullPageSpinner } from './ui.jsx'
import AppShell from './AppShell.jsx'
import { Login, Signup, ForgotPassword, ResetPassword } from './pages/AuthPages.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import AcceptInvite from './pages/AcceptInvite.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AppNotFound from './pages/AppNotFound.jsx'

// safeNext keeps post-login navigation inside the app.
export function safeNext(next) {
  return next && next.startsWith('/app') && !next.startsWith('//') ? next : '/app'
}

function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anon') {
    const next = location.pathname + location.search
    return <Navigate to={`/app/login?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}

function GuestOnly({ children }) {
  const { status } = useAuth()
  const [params] = useSearchParams()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authed') return <Navigate to={safeNext(params.get('next'))} replace />
  return children
}

export default function CloudApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="invite" element={<AcceptInvite />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
