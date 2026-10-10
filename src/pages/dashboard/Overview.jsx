import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { hasAccess } from '../../lib/access.js'
import { DASHBOARD_NAV, PLAN_LABELS, ROLE_LABELS } from '../../data/dashboardNav.js'
import { LINKS } from '../../data/links.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'

function VerifyBanner() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  async function resend() {
    setState('sending')
    try {
      await api('/api/v1/auth/verify-email/resend', { method: 'POST' })
      setState('sent')
    } catch (err) {
      setError(errorMessage(err))
      setState('idle')
    }
  }
  return (
    <Alert tone="info">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="flex-1">
          {state === 'sent' ? 'A new confirmation link is on its way.' : 'Confirm your email address to keep your account secure.'}
          {error && <span className="block text-copper mt-1">{error}</span>}
        </span>
        {state !== 'sent' && (
          <Button variant="ghost" onClick={resend} busy={state === 'sending'} className="py-1.5">Resend link</Button>
        )}
      </div>
    </Alert>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel/60 px-5 py-4">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey">{label}</div>
      <div className="mt-1.5 text-lg text-white truncate">{value}</div>
    </div>
  )
}

export default function Overview() {
  const auth = useAuth()
  const { user, currentOrg } = auth
  const firstName = (user.name || '').split(/\s+/)[0]
  // Shortcuts to the organization pages this user can open.
  const shortcuts = DASHBOARD_NAV.find((s) => s.title === 'Organization').links.filter((l) => hasAccess(auth, l.access))

  return (
    <div className="max-w-5xl grid gap-8">
      {!user.email_verified && <VerifyBanner />}
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : 'Welcome'}
        description="Your Hawk-i Cloud workspace. Hosted scans, findings and evidence arrive here as each part of the platform ships."
      />
      {currentOrg && (
        <div className="grid gap-3 sm:grid-cols-3 -mt-4">
          <Stat label="Organization" value={currentOrg.name} />
          <Stat label="Plan" value={PLAN_LABELS[currentOrg.plan] || currentOrg.plan} />
          <Stat label="Your role" value={ROLE_LABELS[currentOrg.role] || currentOrg.role} />
        </div>
      )}
      {shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="inline-flex items-center gap-2 rounded-lg border border-panel-border px-3.5 py-2 text-sm text-[#cfcfcf] hover:border-steel hover:text-white transition">
              <Icon size={15} /> {label}
            </Link>
          ))}
        </div>
      )}
      <Panel title="Scan now with the open-source scanner">
        <p className="text-sm text-grey max-w-2xl">
          Hawk-i OSS runs the same rule engine locally, for free. Cloud scans will run it for you, keep every result and its evidence, and share them with your team.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-ink px-4 py-3 font-mono text-sm text-[#d9d9d9]">
          <span className="text-grey">$ </span>pip install hawki{'\n'}<span className="text-grey">$ </span>hawki scan ./contracts
        </pre>
        <Link to="/docs" className="mt-4 inline-block text-sm text-steel hover:text-steel-light">Read the docs</Link>
        <span className="mx-2 text-panel-border">/</span>
        <a href={LINKS.github} target="_blank" rel="noreferrer" className="text-sm text-steel hover:text-steel-light">GitHub</a>
      </Panel>
    </div>
  )
}
