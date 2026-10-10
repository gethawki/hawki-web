import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Alert, AuthCard, Spinner } from '../ui.jsx'

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

  const next = status === 'authed' ? '/app' : '/app/login'
  return (
    <AuthCard title="Confirm your email">
      {result === 'pending' && <Spinner label="Confirming" />}
      {result === 'ok' && (
        <div className="grid gap-4">
          <Alert tone="success">Your email address is confirmed.</Alert>
          <Link to={next} className="text-center rounded-lg bg-steel text-ink px-4 py-2.5 text-sm font-medium hover:bg-steel-light transition">
            {status === 'authed' ? 'Continue to Hawk-i Cloud' : 'Sign in'}
          </Link>
        </div>
      )}
      {result === 'invalid' && (
        <Alert>This link has expired or was already used. Sign in and send a new one from the dashboard.</Alert>
      )}
      {result === 'error' && <Alert>We could not confirm your email right now. Please try the link again.</Alert>}
    </AuthCard>
  )
}
