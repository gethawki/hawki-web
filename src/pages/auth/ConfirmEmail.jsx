import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'

// ConfirmEmail applies an email change from the link sent to the new
// address. The change signs the account out everywhere.
export default function ConfirmEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { status, logout } = useAuth()
  const [result, setResult] = useState(token ? 'pending' : 'invalid')
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    api('/api/v1/auth/email/confirm', { method: 'POST', body: { token }, auth: false })
      .then(() => setResult('ok'))
      .catch((err) => setResult(err.code === 'invalid_token' ? 'invalid' : err.code === 'email_taken' ? 'taken' : 'error'))
  }, [token])

  useEffect(() => {
    if (result === 'ok' && status === 'authed') logout()
  }, [result, status, logout])

  return (
    <AuthLayout title="Confirm your new email">
      {result === 'pending' && <Spinner label="confirming" />}
      {result === 'ok' && (
        <div className="grid gap-4">
          <Alert tone="info">Your email address is changed. Sign in with the new one; every device was signed out.</Alert>
          <Button to="/login">Sign in</Button>
        </div>
      )}
      {result === 'invalid' && <Alert>This link has expired or was already used. Ask for the change again from your account page.</Alert>}
      {result === 'taken' && <Alert>Another account uses this email now, so the change was not made.</Alert>}
      {result === 'error' && <Alert>We could not confirm the change right now. Please try the link again.</Alert>}
    </AuthLayout>
  )
}
