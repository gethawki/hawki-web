import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, oauthStartURL, OAUTH_ERRORS } from '../api.js'
import { useAuth } from '../auth.jsx'
import { safeNext } from '../CloudApp.jsx'
import { Alert, AuthCard, Button, Field, messageFor } from '../ui.jsx'

const PROVIDER_LABELS = { google: 'Google', github: 'GitHub' }
const MIN_PASSWORD = 10

function useProviders() {
  const [providers, setProviders] = useState([])
  useEffect(() => {
    api('/api/v1/auth/providers', { auth: false })
      .then((d) => setProviders(d.providers || []))
      .catch(() => setProviders([]))
  }, [])
  return providers
}

function OAuthButtons({ next }) {
  const providers = useProviders()
  if (providers.length === 0) return null
  return (
    <>
      <div className="grid gap-2.5">
        {providers.map((p) => (
          <a
            key={p}
            href={oauthStartURL(p, next)}
            className="inline-flex items-center justify-center rounded-lg border border-panel-border px-4 py-2.5 text-sm text-[#e0e0e0] hover:border-steel hover:text-white transition"
          >
            Continue with {PROVIDER_LABELS[p] || p}
          </a>
        ))}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-grey">
        <span className="h-px flex-1 bg-panel-border" />
        or with email
        <span className="h-px flex-1 bg-panel-border" />
      </div>
    </>
  )
}

function withNext(path, next) {
  return next && next !== '/app' ? `${path}?next=${encodeURIComponent(next)}` : path
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(OAUTH_ERRORS[params.get('error')] || null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(form.email, form.password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Sign in to Hawk-i Cloud"
      subtitle="Hosted scans, evidence and your team, on top of the open-source scanner."
      footer={
        <>
          New here?{' '}
          <Link to={withNext('/app/signup', next)} className="text-steel hover:text-steel-light">
            Create an account
          </Link>
        </>
      }
    >
      <OAuthButtons next={next} />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field id="email" label="Email" type="email" autoComplete="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex justify-end -mt-1">
          <Link to="/app/forgot-password" className="text-xs text-grey hover:text-white">
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" busy={busy}>Sign in</Button>
      </form>
    </AuthCard>
  )
}

export function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD) {
      setFieldErrors({ password: `Use at least ${MIN_PASSWORD} characters.` })
      return
    }
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await signup(form.name, form.email, form.password)
      navigate(next, { replace: true })
    } catch (err) {
      if (err.field) setFieldErrors({ [err.field]: err.message.replace(/^\w+: /, '') })
      else setError(err.code === 'email_taken' ? 'An account with this email already exists. Sign in instead.' : messageFor(err))
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Free to start. The open-source scanner stays free and local, always."
      footer={
        <>
          Already have an account?{' '}
          <Link to={withNext('/app/login', next)} className="text-steel hover:text-steel-light">
            Sign in
          </Link>
        </>
      }
    >
      <OAuthButtons next={next} />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field id="name" label="Name" autoComplete="name" required value={form.name} error={fieldErrors.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field id="email" label="Work email" type="email" autoComplete="email" required value={form.email} error={fieldErrors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" required value={form.password}
          error={fieldErrors.password} hint={`At least ${MIN_PASSWORD} characters.`}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" busy={busy}>Create account</Button>
      </form>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/api/v1/auth/password/forgot', { method: 'POST', body: { email }, auth: false })
      setSent(true)
    } catch (err) {
      setError(messageFor(err))
    }
    setBusy(false)
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We will email you a link to choose a new one."
      footer={<Link to="/app/login" className="text-steel hover:text-steel-light">Back to sign in</Link>}
    >
      {sent ? (
        <Alert tone="success">If an account exists for {email}, a reset link is on its way. It works for one hour.</Alert>
      ) : (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field id="email" label="Email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" busy={busy}>Send reset link</Button>
        </form>
      )}
    </AuthCard>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [done, setDone] = useState(false)
  const [error, setError] = useState(token ? null : 'This reset link is incomplete. Request a new one.')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    if (form.password !== form.confirm) return setError('The passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await api('/api/v1/auth/password/reset', { method: 'POST', body: { token, password: form.password }, auth: false })
      setDone(true)
    } catch (err) {
      setError(err.code === 'invalid_token' ? 'This reset link has expired or was already used. Request a new one.' : messageFor(err))
    }
    setBusy(false)
  }

  return (
    <AuthCard title="Choose a new password" footer={<Link to="/app/login" className="text-steel hover:text-steel-light">Back to sign in</Link>}>
      {done ? (
        <div className="grid gap-4">
          <Alert tone="success">Your password is updated and every other session was signed out.</Alert>
          <Link to="/app/login" className="text-center rounded-lg bg-steel text-ink px-4 py-2.5 text-sm font-medium hover:bg-steel-light transition">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field id="password" label="New password" type="password" autoComplete="new-password" value={form.password}
            hint={`At least ${MIN_PASSWORD} characters.`} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Field id="confirm" label="Repeat new password" type="password" autoComplete="new-password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          <Button type="submit" busy={busy} disabled={!token}>Update password</Button>
        </form>
      )}
    </AuthCard>
  )
}
