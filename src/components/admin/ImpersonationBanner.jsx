import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'

// ImpersonationBanner stays on screen while a platform admin views the app
// as a user: whose account it is, that nothing can be changed, the time left
// and the way back.
export default function ImpersonationBanner() {
  const { impersonating, stopImpersonation } = useAuth()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!impersonating) return
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [impersonating])
  if (!impersonating) return null
  const left = Math.max(0, Math.round((new Date(impersonating.expires_at).getTime() - now) / 60000))
  async function stop() {
    const id = await stopImpersonation()
    navigate(id ? `/admin/users/${id}` : '/admin/users')
  }
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-staff/40 bg-staff/[0.12] px-4 py-2 text-sm text-fg sm:px-6">
      <Eye size={16} className="shrink-0 text-staff" />
      <span className="min-w-0 flex-1">
        Viewing as <strong className="font-medium">{impersonating.user?.email}</strong>. Read only; nothing can be changed.
        <span className="text-fg-3"> Ends in {left} min.</span>
      </span>
      <button type="button" onClick={stop} className="h-8 rounded-lg border border-staff/60 px-3 text-xs font-medium text-fg transition hover:bg-staff/25">
        Stop viewing
      </button>
    </div>
  )
}
