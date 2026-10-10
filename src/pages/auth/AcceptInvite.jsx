import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ROLE_LABELS } from '../../data/dashboardNav.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'

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
      .catch((err) => setError(err.code === 'invalid_token' ? 'This invitation has expired or was revoked.' : errorMessage(err)))
  }, [token])

  async function accept() {
    setBusy(true)
    setError(null)
    try {
      const org = await api('/api/v1/invites/accept', { method: 'POST', body: { token } })
      await reload()
      selectOrg(org.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.code === 'forbidden'
          ? `This invitation was sent to ${preview?.email}. Sign in with that address to accept it.`
          : err.code === 'already_member'
            ? 'You are already a member of this organization.'
            : errorMessage(err),
      )
      setBusy(false)
    }
  }

  const here = `/invite?token=${encodeURIComponent(token)}`
  return (
    <AuthLayout title="Join an organization">
      {error && <Alert>{error}</Alert>}
      {!error && !preview && <Spinner label="opening invitation" />}
      {preview && (
        <div className="grid gap-5 mt-1">
          <p className="text-sm text-[#cfcfcf]">
            You are invited to join <span className="text-white font-medium">{preview.org_name}</span> as{' '}
            {(ROLE_LABELS[preview.role] || preview.role).toLowerCase()}.
            {preview.email && <> The invitation is for <span className="text-white">{preview.email}</span>.</>}
          </p>
          {status === 'authed' ? (
            <>
              <p className="text-xs text-grey">Signed in as {user.email}.</p>
              <Button onClick={accept} busy={busy}>Accept invitation</Button>
            </>
          ) : status === 'anon' ? (
            <div className="grid gap-2.5">
              <Button to={`/login?next=${encodeURIComponent(here)}`}>Sign in to accept</Button>
              <Button to={`/signup?next=${encodeURIComponent(here)}`} variant="ghost">Create an account</Button>
            </div>
          ) : (
            <Spinner />
          )}
        </div>
      )}
    </AuthLayout>
  )
}
