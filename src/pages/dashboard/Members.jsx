import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ROLE_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { formatDate, roleOptions } from './roles.js'

function InviteForm({ orgId, callerRole, onCreated }) {
  const [form, setForm] = useState({ email: '', role: 'member' })
  const [created, setCreated] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const inv = await api(`/api/v1/orgs/${orgId}/invites`, { method: 'POST', body: form })
      setCreated(inv)
      setForm({ ...form, email: '' })
      onCreated()
    } catch (err) {
      setError(err.code === 'already_member' ? 'That person is already a member.' : errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Panel title="Invite people">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field id="invite-email" label="Email" type="email" placeholder="Leave empty for a shareable link" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <SelectField id="invite-role" label="Role" value={form.role} options={roleOptions(callerRole)}
          onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <Button type="submit" busy={busy}>{form.email ? 'Send invite' : 'Create link'}</Button>
      </form>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {created && (
        <div className="mt-4 grid gap-2">
          <Alert tone="info">
            {created.email ? `Invitation emailed to ${created.email}.` : 'Share this link. Anyone with it can join until it expires or you revoke it.'}
          </Alert>
          <code className="block overflow-x-auto rounded-lg border border-panel-border bg-ink px-3 py-2 font-mono text-xs text-[#d9d9d9]">{created.url}</code>
        </div>
      )}
    </Panel>
  )
}

export default function Members() {
  const { currentOrg, user, can, reload } = useAuth()
  const navigate = useNavigate()
  const canManage = can('members:write')
  const [members, setMembers] = useState(null)
  const [invites, setInvites] = useState([])
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const m = await api(`/api/v1/orgs/${currentOrg.id}/members`)
      setMembers(m.members)
      const i = await api(`/api/v1/orgs/${currentOrg.id}/invites`)
      setInvites(i.invites.filter((x) => !x.revoked_at && (!x.email || !x.accepted_at) && new Date(x.expires_at) > new Date()))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id])

  useEffect(() => {
    load()
  }, [load])

  async function act(fn) {
    setError(null)
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.code === 'last_org_admin' ? 'An organization needs at least one admin. Make someone else an admin first.' : errorMessage(err))
    }
  }

  const changeRole = (m, role) => act(() => api(`/api/v1/orgs/${currentOrg.id}/members/${m.user_id}`, { method: 'PATCH', body: { role } }))
  const remove = (m) =>
    act(async () => {
      await api(`/api/v1/orgs/${currentOrg.id}/members/${m.user_id}`, { method: 'DELETE' })
      if (m.user_id === user.id) {
        await reload()
        navigate('/dashboard')
      }
    })
  const revoke = (inv) => act(() => api(`/api/v1/orgs/${currentOrg.id}/invites/${inv.id}`, { method: 'DELETE' }))

  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Members" description={`People with access to ${currentOrg.name} and what they can do.`} />
      {error && <Alert>{error}</Alert>}
      {canManage && <InviteForm orgId={currentOrg.id} callerRole={currentOrg.role} onCreated={load} />}
      <Panel>
        {!members ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-panel-border">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{m.name || m.email}{m.user_id === user.id && <span className="text-grey"> (you)</span>}</div>
                  <div className="text-xs text-grey truncate">{m.email} · joined {formatDate(m.created_at)}</div>
                </div>
                {canManage && m.user_id !== user.id ? (
                  <select value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role of ${m.email}`}
                    className="rounded-lg bg-ink border border-panel-border px-3 py-1.5 text-sm text-white outline-none focus:border-steel">
                    {roleOptions(currentOrg.role).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="font-mono text-xs uppercase tracking-wider text-grey">{ROLE_LABELS[m.role]}</span>
                )}
                {(canManage || m.user_id === user.id) && (
                  <Button variant="danger" className="py-1.5" onClick={() => remove(m)}>
                    {m.user_id === user.id ? 'Leave' : 'Remove'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {invites.length > 0 && (
        <Panel title="Open invitations">
          <ul className="divide-y divide-panel-border">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0 text-sm">
                  <span className="text-white">{inv.email || 'Shareable link'}</span>
                  <span className="text-grey"> · {ROLE_LABELS[inv.role]} · expires {formatDate(inv.expires_at)}</span>
                </div>
                {canManage && <Button variant="ghost" className="py-1.5" onClick={() => revoke(inv)}>Revoke</Button>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
