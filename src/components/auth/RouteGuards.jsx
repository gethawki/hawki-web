import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { hasAccess } from '../../lib/access.js'
import Spinner from '../common/Spinner.jsx'
import Button from '../common/Button.jsx'

const SIGNED_IN_PREFIXES = ['/dashboard', '/admin', '/invite']

// safeNext keeps post-sign-in navigation inside the signed-in areas.
export function safeNext(next) {
  if (!next || next.startsWith('//')) return '/dashboard'
  return SIGNED_IN_PREFIXES.some((p) => next === p || next.startsWith(`${p}/`) || next.startsWith(`${p}?`)) ? next : '/dashboard'
}

// RequireAuth sends signed-out visitors to /login and brings them back after.
export function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Spinner fullPage />
  if (status === 'anon') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return children
}

// GuestOnly is for /login and /signup: signed-in users go straight on.
export function GuestOnly({ children }) {
  const { status } = useAuth()
  const [params] = useSearchParams()
  if (status === 'loading') return <Spinner fullPage />
  if (status === 'authed') return <Navigate to={safeNext(params.get('next'))} replace />
  return children
}

// RequireAccess guards one dashboard page with a dashboardNav access rule.
export function RequireAccess({ access, children }) {
  const auth = useAuth()
  if (!auth.permissionsReady) return <Spinner />
  if (hasAccess(auth, access)) return children
  return (
    <div className="max-w-lg">
      <Lock className="text-copper mb-4" size={28} strokeWidth={1.5} />
      <h1 className="font-display text-2xl text-white">You do not have access to this page</h1>
      <p className="mt-2 text-sm text-grey">
        {access?.platformAdmin
          ? 'This area is for Hawk-i platform administrators.'
          : `Your role in ${auth.currentOrg?.name || 'this organization'} does not include it. Ask an organization admin if you need it.`}
      </p>
      <Button to="/dashboard" variant="ghost" className="mt-5">
        Back to the overview
      </Button>
    </div>
  )
}
