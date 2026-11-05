import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { API_URL } from '../../lib/api.js'
import AuthLayout from '../auth/AuthLayout.jsx'
import Spinner from './Spinner.jsx'

// ApiGate stands in front of the Cloud pages (sign-in, dashboards, shared
// reports). Until Hawk-i Cloud's API answers, visitors see a coming soon
// page instead of forms that cannot work. Once this browser has reached the
// API it is remembered, so a later outage shows the app's own errors and
// never brings the coming soon page back.

const SEEN_KEY = 'hawki.cloud.available'

function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

async function reachable() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await fetch(`${API_URL}/api/v1/status`, { signal: ctrl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

export function ComingSoon() {
  return (
    <AuthLayout title="Hawk-i Cloud is coming soon"
      subtitle="Hosted scans, Intel, Hunt, Watch and MEV Intelligence for your team. Sign-in opens when the platform launches."
      footer={<Link to="/" className="text-steel hover:text-white">Back to gethawki.com</Link>}>
      <div className="grid gap-4 text-sm text-[#cfcfcf]">
        <p>Until then, the open source scanner runs on your own machine:</p>
        <pre className="overflow-x-auto rounded-lg border border-panel-border bg-ink px-4 py-3 font-mono text-xs text-white">pip install hawki{'\n'}hawki scan .</pre>
        <p>
          Read the <Link to="/docs" className="text-steel underline hover:text-white">documentation</Link> or
          follow the <Link to="/changelog" className="text-steel underline hover:text-white">changelog</Link> for the launch.
        </p>
      </div>
    </AuthLayout>
  )
}

export default function ApiGate() {
  const [state, setState] = useState(() => (typeof window !== 'undefined' && seen() ? 'up' : 'checking'))
  useEffect(() => {
    if (state !== 'checking') return
    let live = true
    reachable().then((ok) => {
      if (!live) return
      if (ok) {
        try {
          localStorage.setItem(SEEN_KEY, '1')
        } catch {
          // without storage the check simply runs again next visit
        }
      }
      setState(ok ? 'up' : 'down')
    })
    return () => {
      live = false
    }
  }, [state])
  if (state === 'checking') return <Spinner fullPage />
  if (state === 'down') return <ComingSoon />
  return <Outlet />
}
