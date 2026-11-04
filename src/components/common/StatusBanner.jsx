import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'

// StatusBanner shows the platform banner and the maintenance notice set by
// Hawk-i staff from the emergency switches.
export default function StatusBanner() {
  const { isPlatformAdmin } = useAuth()
  const [status, setStatus] = useState(null)
  useEffect(() => {
    const load = () => api('/api/v1/status', { auth: false }).then(setStatus).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])
  if (!status || (!status.banner && !status.maintenance)) return null
  return (
    <div className="no-print grid">
      {status.maintenance && (
        <div role="status" className="border-b border-warning/30 bg-warning/[0.08] px-4 py-2 text-sm text-warn sm:px-6">
          {isPlatformAdmin ? 'Maintenance mode is on: only platform admins can make changes. ' : ''}
          {status.maintenance_message || 'Hawk-i Cloud is in maintenance. You can look around, but changes are paused for a short while.'}
        </div>
      )}
      {status.banner && (
        <div role="status" className="border-b border-accent/25 bg-accent/[0.08] px-4 py-2 text-sm text-[#d3dde8] sm:px-6">{status.banner}</div>
      )}
    </div>
  )
}
