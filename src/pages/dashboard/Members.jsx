import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ROLE_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { UserPlus } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { initials } from '../../lib/format.js'
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
    <div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem] sm:items-end">
        <Field id="invite-email" label="Email" type="email" placeholder="Leave empty for a shareable link" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <SelectField id="invite-role" label="Role" value={form.role} options={roleOptions(callerRole)}
          onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <Button type="submit" busy={busy} className="sm:col-span-2 sm:justify-self-end">{form.email ? 'Send invite' : 'Create link'}</Button>
      </form>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {created && (
        <div className="mt-4 grid gap-2">
          <Alert tone="info">
            {created.email ? `Invitation emailed to ${created.email}.` : 'Share this link. Anyone with it can join until it expires or you revoke it.'}
          </Alert>
          <code className="block overflow-x-auto rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-fg-2">{created.url}</code>
        </div>
      )}
    </div>
  )
}

export default function Members() {
  const { currentOrg, user, can, reload } = useAuth()
  const navigate = useNavigate()
  const canManage = can('members:write')
  const [members, setMembers] = useState(null)
  const [invites, setInvites] = useState([])
  const [error, setError] = useState(null)
  const [inviting, setInviting] = useState(false)

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

  const roleCell = (m) => canManage && m.user_id !== user.id ? (
    <select value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role of ${m.email}`}
      className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-sm text-fg outline-none focus:border-accent/70">
      {roleOptions(currentOrg.role).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ) : <Badge tone={m.role === 'org_admin' ? 'accent' : 'neutral'}>{ROLE_LABELS[m.role]}</Badge>

  return (
    <div className="grid gap-6">
      <PageHeader title="Members" description={`People with access to ${currentOrg.name} and what they can do.`}
        meta={members && <span>{members.length} {members.length === 1 ? 'member' : 'members'}{invites.length ? `, ${invites.length} open ${invites.length === 1 ? 'invitation' : 'invitations'}` : ''}</span>}
        actions={canManage && <Button size="sm" onClick={() => setInviting(true)}><UserPlus size={14} /> Invite people</Button>} />
      {error && <Alert>{error}</Alert>}
      <Card flush>
        <DataTable rows={members} loading={!members} rowKey={(m) => m.user_id} columns={[
          {
            key: 'who', header: 'Member', cell: (m) => (
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[0.7rem] font-semibold text-fg ring-1 ring-line-strong">{initials(m.name || m.email)}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium text-fg">{m.name || m.email}{m.user_id === user.id && <span className="font-normal text-fg-3"> (you)</span>}</div>
                  <div className="truncate text-xs text-fg-3">{m.email}</div>
                </div>
              </div>
            ),
          },
          { key: 'role', header: 'Role', cell: roleCell },
          { key: 'joined', header: 'Joined', hide: 'md', cell: (m) => <span className="text-fg-3">{formatDate(m.created_at)}</span> },
          {
            key: 'act', header: '', align: 'right', cell: (m) => (canManage || m.user_id === user.id) && (
              <Button variant={m.user_id === user.id ? 'ghost' : 'danger'} size="sm" onClick={() => remove(m)}>{m.user_id === user.id ? 'Leave' : 'Remove'}</Button>
            ),
          },
        ]} />
      </Card>
      {invites.length > 0 && (
        <Card title="Open invitations" flush>
          <DataTable rows={invites} dense columns={[
            { key: 'to', header: 'Invited', cell: (inv) => <span className="text-fg">{inv.email || 'Shareable link'}</span> },
            { key: 'role', header: 'Role', cell: (inv) => <Badge>{ROLE_LABELS[inv.role]}</Badge> },
            { key: 'exp', header: 'Expires', hide: 'sm', cell: (inv) => <span className="text-fg-3">{formatDate(inv.expires_at)}</span> },
            { key: 'act', header: '', align: 'right', cell: (inv) => canManage && <Button variant="ghost" size="sm" onClick={() => revoke(inv)}>Revoke</Button> },
          ]} />
        </Card>
      )}
      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite people" description="Send an email invitation, or leave the email empty to create a link you can share.">
        <InviteForm orgId={currentOrg.id} callerRole={currentOrg.role} onCreated={load} />
      </Modal>
    </div>
  )
}
