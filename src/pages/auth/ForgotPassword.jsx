import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import { linkClass } from './shared.js'

export default function ForgotPassword() {
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
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We will email you a link to choose a new one."
      footer={<Link to="/login" className={linkClass}>Back to sign in</Link>}>
      {sent ? (
        <Alert tone="info">If an account exists for {email}, a reset link is on its way. It works for one hour.</Alert>
      ) : (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Field id="email" label="Email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" busy={busy}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  )
}
