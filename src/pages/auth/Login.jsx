import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { OAUTH_ERRORS } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import OAuthButtons from '../../components/auth/OAuthButtons.jsx'
import { safeNext } from '../../components/auth/RouteGuards.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import { linkClass, withNext } from './shared.js'

// SecondFactor asks for the authenticator code (or a recovery code) after a
// correct password or provider sign-in on an account with two-factor on.
function SecondFactor({ token, next, onRestart }) {
  const { completeMFA } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await completeMFA(token, code)
      navigate(next, { replace: true })
    } catch (err) {
      if (err.code === 'invalid_token') {
        setError('This sign-in took too long. Start again.')
      } else {
        setError(err.field === 'code' ? 'That code is not valid. Try the newest one from your app.' : errorMessage(err))
      }
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Two-factor sign-in" subtitle={recovery ? 'Enter one of your recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field id="mfa-code" label={recovery ? 'Recovery code' : 'Code'} autoComplete="one-time-code" autoFocus
          inputMode={recovery ? 'text' : 'numeric'} placeholder={recovery ? 'abcde-fghij' : '123456'} value={code}
          onChange={(e) => setCode(e.target.value)} />
        <Button type="submit" busy={busy} disabled={!code.trim()}>Verify</Button>
        <div className="flex justify-between text-xs">
          <button type="button" className="text-grey hover:text-white" onClick={() => { setRecovery((v) => !v); setCode('') }}>
            {recovery ? 'Use the authenticator app' : 'Use a recovery code'}
          </button>
          <button type="button" className="text-grey hover:text-white" onClick={onRestart}>Start again</button>
        </div>
      </form>
    </AuthLayout>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(OAUTH_ERRORS[params.get('error')] || null)
  const [busy, setBusy] = useState(false)
  // A provider sign-in that needs the second factor comes back with the
  // challenge in the URL.
  const [mfaToken, setMfaToken] = useState(params.get('mfa_token'))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await login(form.email, form.password)
      if (res?.mfaToken) {
        setMfaToken(res.mfaToken)
        setBusy(false)
        return
      }
      navigate(next, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (mfaToken) {
    return <SecondFactor token={mfaToken} next={next} onRestart={() => {
      setMfaToken(null)
      setForm({ email: form.email, password: '' })
      const p = new URLSearchParams(params)
      p.delete('mfa_token')
      setParams(p, { replace: true })
    }} />
  }

  return (
    <AuthLayout
      title="Sign in to Hawk-i Cloud"
      subtitle="Hosted scans, evidence and your team, on top of the open-source scanner."
      footer={<>New here? <Link to={withNext('/signup', next)} className={linkClass}>Create an account</Link></>}
    >
      <OAuthButtons next={next} />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field id="email" label="Email" type="email" autoComplete="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-xs text-grey hover:text-white">Forgot your password?</Link>
        </div>
        <Button type="submit" busy={busy}>Sign in</Button>
      </form>
    </AuthLayout>
  )
}
