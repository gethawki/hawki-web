import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { status, reload } = useAuth()
  const [result, setResult] = useState(token ? 'pending' : 'invalid')
  const started = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; the token is single use.
    if (!token || started.current) return
    started.current = true
    api('/api/v1/auth/verify-email', { method: 'POST', body: { token }, auth: false })
      .then(() => setResult('ok'))
      .catch((err) => setResult(err.code === 'invalid_token' ? 'invalid' : 'error'))
  }, [token])

  useEffect(() => {
    if (result === 'ok' && status === 'authed') reload().catch(() => {})
  }, [result, status, reload])

  return (
    <AuthLayout title="Confirm your email">
      {result === 'pending' && <Spinner label="confirming" />}
      {result === 'ok' && (
        <div className="grid gap-4">
          <Alert tone="info">Your email address is confirmed.</Alert>
          <Button to={status === 'authed' ? '/dashboard' : '/login'}>
            {status === 'authed' ? 'Continue to your dashboard' : 'Sign in'}
          </Button>
        </div>
      )}
      {result === 'invalid' && <Alert>This link has expired or was already used. Sign in and send a new one from your dashboard.</Alert>}
      {result === 'error' && <Alert>We could not confirm your email right now. Please try the link again.</Alert>}
    </AuthLayout>
  )
}
