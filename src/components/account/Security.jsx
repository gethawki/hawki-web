import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Field from '../common/Field.jsx'
import { Panel } from '../dashboard/PageHeader.jsx'

const fieldError = (err) => (err?.field ? err.message.replace(/^\w+: /, '') : null)
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function RecoveryCodes({ codes }) {
  const text = codes.join('\n')
  return (
    <div className="grid gap-2">
      <Alert tone="info">Save these recovery codes somewhere safe. Each works once if you lose your device. They are shown only now.</Alert>
      <pre className="rounded-lg border border-panel-border bg-ink px-4 py-3 font-mono text-sm text-[#d9d9d9] grid grid-cols-2 gap-x-6">
        {codes.map((c) => <span key={c}>{c}</span>)}
      </pre>
      <div>
        <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(text)}>Copy codes</Button>
      </div>
    </div>
  )
}

export function EmailPanel({ security, onChanged }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [state, setState] = useState({ busy: false, error: null, field: {}, sent: false })

  async function submit(e) {
    e.preventDefault()
    setState({ busy: true, error: null, field: {}, sent: false })
    try {
      await api('/api/v1/me/email', { method: 'POST', body: form })
      setForm({ email: '', password: '' })
      setState({ busy: false, error: null, field: {}, sent: true })
      onChanged()
    } catch (err) {
      setState({ busy: false, error: err.field ? null : err.code === 'email_taken' ? 'Another account uses that email.' : errorMessage(err),
        field: err.field ? { [err.field]: fieldError(err) } : {}, sent: false })
    }
  }
  async function cancel() {
    await api('/api/v1/me/email', { method: 'DELETE' }).catch(() => {})
    onChanged()
  }

  return (
    <Panel title="Email">
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-grey">You sign in with <span className="text-white">{user.email}</span>. A new address is used only after you open the link we send to it.</p>
        {security?.pending_email && (
          <Alert tone="info">
            Waiting for confirmation of {security.pending_email}.{' '}
            <button type="button" onClick={cancel} className="underline hover:text-white">Cancel the change</button>
          </Alert>
        )}
        {state.sent && <Alert tone="info">Check the new inbox for the confirmation link. Your current address was told too.</Alert>}
        {state.error && <Alert>{state.error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email-new" label="New email" type="email" autoComplete="email" value={form.email} error={state.field.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {security?.has_password && (
            <Field id="email-password" label="Current password" type="password" autoComplete="current-password" value={form.password}
              error={state.field.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          )}
        </div>
        <div><Button type="submit" busy={state.busy} disabled={!form.email}>Change email</Button></div>
      </form>
    </Panel>
  )
}

export function TwoFactorPanel({ security, onChanged }) {
  const [password, setPassword] = useState('')
  const [setup, setSetup] = useState(null)
  const [qr, setQr] = useState(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null) // 'disable' | 'regenerate'

  useEffect(() => {
    if (!setup) return setQr(null)
    QRCode.toDataURL(setup.otpauth_url, { margin: 1, width: 200 }).then(setQr).catch(() => setQr(null))
  }, [setup])

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err.field ? fieldError(err) : errorMessage(err))
    }
    setBusy(false)
  }

  const start = () => run(async () => {
    setSetup(await api('/api/v1/me/2fa/setup', { method: 'POST', body: { password } }))
    setPassword('')
  })
  const enable = () => run(async () => {
    const d = await api('/api/v1/me/2fa/enable', { method: 'POST', body: { code } })
    setCodes(d.recovery_codes)
    setSetup(null)
    setCode('')
    onChanged()
  })
  const disable = () => run(async () => {
    await api('/api/v1/me/2fa/disable', { method: 'POST', body: { password, code } })
    setMode(null)
    setPassword('')
    setCode('')
    setCodes(null)
    onChanged()
  })
  const regenerate = () => run(async () => {
    const d = await api('/api/v1/me/2fa/recovery-codes', { method: 'POST', body: { password } })
    setCodes(d.recovery_codes)
    setMode(null)
    setPassword('')
    onChanged()
  })

  if (!security) return null
  const pw = security.has_password && (
    <Field id="tfa-password" label="Current password" type="password" autoComplete="current-password" value={password}
      onChange={(e) => setPassword(e.target.value)} />
  )
  return (
    <Panel title="Two-factor sign-in">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        {codes && <RecoveryCodes codes={codes} />}
        {security.two_factor_enabled ? (
          <>
            <p className="text-sm text-grey">
              On. Signing in needs a code from your authenticator app. {security.recovery_codes_left} recovery codes left.
            </p>
            {mode === null && (
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setMode('regenerate')}>New recovery codes</Button>
                <Button variant="danger" onClick={() => setMode('disable')}>Turn off</Button>
              </div>
            )}
            {mode && (
              <div className="grid gap-4 sm:grid-cols-2 items-end">
                {pw}
                {mode === 'disable' && (
                  <Field id="tfa-off-code" label="Code or recovery code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
                )}
                <div className="flex gap-2 sm:col-span-2">
                  <Button busy={busy} variant={mode === 'disable' ? 'danger' : 'primary'} onClick={mode === 'disable' ? disable : regenerate}>
                    {mode === 'disable' ? 'Turn off two-factor' : 'Make new codes'}
                  </Button>
                  <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        ) : setup ? (
          <div className="grid gap-4 sm:grid-cols-[200px_1fr] items-start">
            {qr ? <img src={qr} alt="QR code to add Hawk-i to your authenticator app" width="200" height="200" className="rounded-lg bg-white" />
              : <div className="h-[200px] w-[200px] rounded-lg border border-panel-border" />}
            <div className="grid gap-3 min-w-0">
              <p className="text-sm text-grey">Scan the code with an authenticator app (1Password, Google Authenticator, Authy), or enter this key:</p>
              <code className="block break-all rounded-lg border border-panel-border bg-ink px-3 py-2 font-mono text-xs text-[#d9d9d9]">{setup.secret}</code>
              <Field id="tfa-code" label="Code from the app" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              <div className="flex gap-2">
                <Button busy={busy} onClick={enable} disabled={code.trim().length < 6}>Turn on</Button>
                <Button variant="ghost" onClick={() => setSetup(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-grey">Off. Add a second step to sign-in with a code from an authenticator app. Strongly recommended for admins.</p>
            <div className="grid gap-4 sm:grid-cols-2 items-end">
              {pw}
              <div><Button busy={busy} onClick={start} disabled={security.has_password && !password}>Set up two-factor</Button></div>
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

export function SessionsPanel() {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => {
    api('/api/v1/me/sessions').then((d) => setSessions(d.sessions)).catch((err) => setError(errorMessage(err)))
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function act(path, method) {
    try {
      await api(path, { method })
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!sessions) return null
  return (
    <Panel title="Where you are signed in">
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <ul className="divide-y divide-panel-border">
        {sessions.map((s) => (
          <li key={s.id} className="py-3 first:pt-0 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{s.user_agent || 'Unknown device'}{s.current && <span className="ml-2 text-xs text-steel">this device</span>}</div>
              <div className="text-xs text-grey">{s.ip || 'unknown address'} · signed in {fmt(s.created_at)}</div>
            </div>
            {!s.current && <Button variant="ghost" className="py-1.5" onClick={() => act(`/api/v1/me/sessions/${s.id}`, 'DELETE')}>Sign out</Button>}
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <div className="mt-4"><Button variant="ghost" onClick={() => act('/api/v1/me/sessions/revoke-others', 'POST')}>Sign out everywhere else</Button></div>
      )}
    </Panel>
  )
}

export function DeleteAccountPanel({ security }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await api('/api/v1/me', { method: 'DELETE', body: form })
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.code === 'sole_org_admin' ? 'You are the only admin of an organization with other members. Make someone else an admin first.'
        : err.code === 'last_platform_admin' ? 'You are the last platform admin; the platform needs at least one.'
          : err.field ? fieldError(err) : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Panel title="Delete account">
      <div className="grid gap-4">
        <p className="text-sm text-grey">Deletes your account and every organization where you are the only member, with their projects, scans and reports. This cannot be undone.</p>
        {error && <Alert>{error}</Alert>}
        {!open ? (
          <div><Button variant="danger" onClick={() => setOpen(true)}>Delete my account</Button></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 items-end">
            {security?.has_password && (
              <Field id="del-password" label="Current password" type="password" autoComplete="current-password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            )}
            <Field id="del-confirm" label={`Type ${user.email} to confirm`} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button variant="danger" busy={busy} onClick={remove} disabled={form.confirm.toLowerCase() !== user.email.toLowerCase()}>Delete forever</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

// useSecurity loads the account's security state.
export function useSecurity() {
  const [security, setSecurity] = useState(null)
  const load = useCallback(() => {
    api('/api/v1/me/security').then(setSecurity).catch(() => setSecurity(null))
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return [security, load]
}
