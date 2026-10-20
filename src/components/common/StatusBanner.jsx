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
        <div role="status" className="bg-copper/20 border-b border-copper/50 px-4 sm:px-6 py-2 text-sm text-[#f0d6d1]">
          {isPlatformAdmin ? 'Maintenance mode is on: only platform admins can make changes. ' : ''}
          {status.maintenance_message || 'Hawk-i Cloud is in maintenance. You can look around, but changes are paused for a short while.'}
        </div>
      )}
      {status.banner && (
        <div role="status" className="bg-steel/15 border-b border-steel/40 px-4 sm:px-6 py-2 text-sm text-[#d3dde8]">{status.banner}</div>
      )}
    </div>
  )
}
