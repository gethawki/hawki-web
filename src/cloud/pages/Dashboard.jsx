import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Alert, Button, messageFor } from '../ui.jsx'
import { LINKS } from '../../data/links.js'

const PLAN_LABELS = { community: 'Community', builder: 'Builder', professional: 'Professional', security: 'Security', enterprise: 'Enterprise' }
const ROLE_LABELS = { org_admin: 'Admin', member: 'Member', viewer: 'Viewer' }

function VerifyBanner() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  async function resend() {
    setState('sending')
    try {
      await api('/api/v1/auth/verify-email/resend', { method: 'POST' })
      setState('sent')
    } catch (err) {
      setError(messageFor(err))
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
          <Button variant="ghost" onClick={resend} busy={state === 'sending'} className="py-1.5">
            Resend link
          </Button>
        )}
      </div>
    </Alert>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel/60 px-5 py-4">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey">{label}</div>
      <div className="mt-1.5 text-lg text-white">{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, currentOrg } = useAuth()
  const firstName = (user.name || '').split(/\s+/)[0]

  return (
    <div className="max-w-5xl grid gap-8">
      {!user.email_verified && <VerifyBanner />}

      <div>
        <h1 className="font-display text-3xl text-white">{firstName ? `Welcome, ${firstName}` : 'Welcome'}</h1>
        <p className="mt-2 text-sm text-grey">
          This is your Hawk-i Cloud workspace. Hosted scans, findings and evidence arrive here as each part of the platform ships.
        </p>
      </div>

      {currentOrg && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Organization" value={currentOrg.name} />
          <Stat label="Plan" value={PLAN_LABELS[currentOrg.plan] || currentOrg.plan} />
          <Stat label="Your role" value={ROLE_LABELS[currentOrg.role] || currentOrg.role} />
        </div>
      )}

      <section className="rounded-2xl border border-panel-border bg-panel/50 p-6">
        <h2 className="text-white font-medium">Scan now with the open-source scanner</h2>
        <p className="mt-2 text-sm text-grey max-w-2xl">
          Hawk-i OSS runs the same rule engine locally, for free. Cloud scans will run it for you, keep every result and its evidence, and share them with your team.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-ink px-4 py-3 font-mono text-sm text-[#d9d9d9]">
          <span className="text-grey">$ </span>pip install hawki{'\n'}
          <span className="text-grey">$ </span>hawki scan ./contracts
        </pre>
        <a href={LINKS.github} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-steel hover:text-steel-light">
          Read the scanner docs on GitHub
        </a>
      </section>
    </div>
  )
}
