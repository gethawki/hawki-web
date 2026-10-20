import { useState } from 'react'
import { api } from '../../lib/api.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, ReasonForm, useAdmin, when } from '../../components/admin/bits.jsx'

const WITH_MESSAGE = ['maintenance', 'banner']

function Switch({ s, onChanged }) {
  const [message, setMessage] = useState(s.message)
  const [error, setError] = useState(null)
  async function set(enabled, reason) {
    setError(null)
    try {
      await api(`/api/v1/admin/switches/${s.key}`, { method: 'PUT', body: { enabled, message, reason } })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <div className={`rounded-xl border px-4 py-4 grid gap-3 ${s.enabled ? 'border-copper/60 bg-copper/5' : 'border-panel-border'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-white">{s.label}</div>
          <p className="text-xs text-grey mt-0.5">{s.description}</p>
        </div>
        <Badge tone={s.enabled ? 'bad' : 'muted'}>{s.enabled ? 'on' : 'off'}</Badge>
      </div>
      {s.updated_by && <p className="text-xs text-grey">Last changed {when(s.updated_at)}: {s.reason}</p>}
      {error && <Alert>{error}</Alert>}
      {WITH_MESSAGE.includes(s.key) && (
        <input aria-label={`${s.label} message`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300}
          placeholder={s.key === 'banner' ? 'Message for every signed-in user' : 'Optional message shown during maintenance'}
          className="rounded-lg bg-ink-soft border border-panel-border px-3 py-2 text-sm text-white placeholder:text-grey outline-none focus:border-steel" />
      )}
      <ReasonForm label={s.enabled ? 'Turn off' : 'Turn on'} danger={!s.enabled} onSubmit={(reason) => set(!s.enabled, reason)} />
    </div>
  )
}

export default function AdminSwitches() {
  const { data, error, reload } = useAdmin('/api/v1/admin/switches')
  const [signedOut, setSignedOut] = useState(null)
  const [err2, setErr2] = useState(null)

  async function signOutEveryone(reason) {
    if (!window.confirm('Sign out every user on the platform (except you)?')) return
    setErr2(null)
    try {
      const d = await api('/api/v1/admin/sign-out-everyone', { method: 'POST', body: { reason } })
      setSignedOut(d.users)
    } catch (err) {
      setErr2(errorMessage(err))
    }
  }

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!data) return <Spinner />
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Emergency switches" description="Take the platform into a safe state in seconds. Every change needs a reason and is recorded in the platform audit. All servers apply it within 5 seconds." />
      <div className="grid gap-4 md:grid-cols-2">
        {data.switches.map((s) => <Switch key={s.key + s.updated_at} s={s} onChanged={reload} />)}
      </div>
      <Panel title="Sign everyone out">
        <div className="grid gap-3">
          <p className="text-sm text-grey">Ends every session on the platform except yours, for example after a suspected token leak. API keys are separate: turn them off above.</p>
          {signedOut != null && <Alert tone="info">Signed out {signedOut} users.</Alert>}
          {err2 && <Alert>{err2}</Alert>}
          <ReasonForm label="Sign everyone out" danger onSubmit={signOutEveryone} />
        </div>
      </Panel>
      <p className="text-xs text-grey">To lock a single account or organization instead, use <Button variant="ghost" to="/admin/users" className="py-1 px-2 text-xs">Users</Button> or <Button variant="ghost" to="/admin/customers" className="py-1 px-2 text-xs">Customers</Button>.</p>
    </div>
  )
}
