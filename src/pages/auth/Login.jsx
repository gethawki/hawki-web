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

export default function Login() {
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
      setError(errorMessage(err))
      setBusy(false)
    }
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
