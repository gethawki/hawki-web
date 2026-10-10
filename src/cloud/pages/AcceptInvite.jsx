import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Alert, AuthCard, Button, Spinner, messageFor } from '../ui.jsx'

const ROLE_LABELS = { org_admin: 'an admin', member: 'a member', viewer: 'a viewer' }

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { status, user, reload, selectOrg } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(token ? null : 'This invitation link is incomplete.')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    api(`/api/v1/invites/${encodeURIComponent(token)}`, { auth: false })
      .then(setPreview)
      .catch((err) => setError(err.code === 'invalid_token' ? 'This invitation has expired or was revoked.' : messageFor(err)))
  }, [token])

  async function accept() {
    setBusy(true)
    setError(null)
    try {
      const org = await api('/api/v1/invites/accept', { method: 'POST', body: { token } })
      await reload()
      selectOrg(org.id)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(
        err.code === 'forbidden'
          ? `This invitation was sent to ${preview?.email}. Sign in with that address to accept it.`
          : err.code === 'already_member'
            ? 'You are already a member of this organization.'
            : messageFor(err),
      )
      setBusy(false)
    }
  }

  const here = `/app/invite?token=${encodeURIComponent(token)}`
  return (
    <AuthCard title="Join an organization">
      {error && <Alert>{error}</Alert>}
      {!error && !preview && <Spinner label="Opening invitation" />}
      {preview && (
        <div className="grid gap-5">
          <p className="text-sm text-[#cfcfcf]">
            You are invited to join <span className="text-white font-medium">{preview.org_name}</span> as{' '}
            {ROLE_LABELS[preview.role] || preview.role}.
            {preview.email && <> The invitation is for <span className="text-white">{preview.email}</span>.</>}
          </p>
          {status === 'authed' ? (
            <>
              <p className="text-xs text-grey">Signed in as {user.email}.</p>
              <Button onClick={accept} busy={busy}>Accept invitation</Button>
            </>
          ) : status === 'anon' ? (
            <div className="grid gap-2.5">
              <Link to={`/app/login?next=${encodeURIComponent(here)}`} className="text-center rounded-lg bg-steel text-ink px-4 py-2.5 text-sm font-medium hover:bg-steel-light transition">
                Sign in to accept
              </Link>
              <Link to={`/app/signup?next=${encodeURIComponent(here)}`} className="text-center rounded-lg border border-panel-border px-4 py-2.5 text-sm text-[#e0e0e0] hover:border-steel transition">
                Create an account
              </Link>
            </div>
          ) : (
            <Spinner />
          )}
        </div>
      )}
    </AuthCard>
  )
}
