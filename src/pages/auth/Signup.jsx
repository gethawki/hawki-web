import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import OAuthButtons from '../../components/auth/OAuthButtons.jsx'
import { safeNext } from '../../components/auth/RouteGuards.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import { MIN_PASSWORD, linkClass, withNext } from './shared.js'

export default function Signup() {
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
      else setError(err.code === 'email_taken' ? 'An account with this email already exists. Sign in instead.' : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free to start. The open-source scanner stays free and local, always."
      footer={<>Already have an account? <Link to={withNext('/login', next)} className={linkClass}>Sign in</Link></>}
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
    </AuthLayout>
  )
}
