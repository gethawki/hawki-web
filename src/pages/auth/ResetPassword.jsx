import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import { MIN_PASSWORD, linkClass } from './shared.js'

export default function ResetPassword() {
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
      setError(err.code === 'invalid_token' ? 'This reset link has expired or was already used. Request a new one.' : errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <AuthLayout title="Choose a new password" footer={<Link to="/login" className={linkClass}>Back to sign in</Link>}>
      {done ? (
        <div className="grid gap-4">
          <Alert tone="info">Your password is updated and every other session was signed out.</Alert>
          <Button to="/login">Sign in</Button>
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
    </AuthLayout>
  )
}
