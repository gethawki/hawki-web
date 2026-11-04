import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
import { device } from '../../lib/format.js'
import { Badge, ReasonForm, useAdmin, when } from '../../components/admin/bits.jsx'
import { ConfirmDelete, EngineUsage } from '../../components/admin/platformBits.jsx'

const ERRORS = {
  last_platform_admin: 'The platform must keep at least one active admin.',
  owner_protected: "The platform owner's account cannot be deleted.",
  sole_org_admin: 'They are the only admin of an organization with other members. Make someone else an admin there first.',
  cannot_impersonate: 'Platform admins cannot be viewed as.',
  account_suspended: 'Restore the account before viewing as it.',
  two_factor_off: 'This user does not have two-factor sign-in on.',
}

export default function AdminUser() {
  const { userId } = useParams()
  const { user: me, startImpersonation } = useAuth()
  const navigate = useNavigate()
  const { data, error, reload } = useAdmin(`/api/v1/admin/users/${userId}`)
  const sessions = useAdmin(`/api/v1/admin/users/${userId}/sessions`)
  const usage = useAdmin(`/api/v1/admin/users/${userId}/usage`)
  const [msg, setMsg] = useState(null)

  async function act(path, method, body, done) {
    setMsg(null)
    try {
      await api(path, { method, body })
      setMsg({ tone: 'info', text: done })
      reload()
      sessions.reload()
    } catch (err) {
      setMsg({ tone: 'error', text: ERRORS[err.code] || errorMessage(err) })
    }
  }

  async function viewAs(reason) {
    setMsg(null)
    try {
      await startImpersonation(userId, reason)
      navigate('/dashboard')
    } catch (err) {
      setMsg({ tone: 'error', text: ERRORS[err.code] || errorMessage(err) })
    }
  }

  async function remove(confirm, reason) {
    setMsg(null)
    try {
      await api(`/api/v1/admin/users/${userId}/delete`, { method: 'POST', body: { confirm, reason } })
      navigate('/admin/users', { replace: true })
    } catch (err) {
      setMsg({ tone: 'error', text: ERRORS[err.code] || errorMessage(err) })
    }
  }

  if (error) return <div><Alert>{error}</Alert></div>
  if (!data) return <Spinner />
  const u = data.user
  const self = u.id === me.id
  const base = `/api/v1/admin/users/${u.id}`
  return (
    <div>
      <PageHeader back={{ to: '/admin/users', label: 'Users' }} title={u.name || u.email}
        meta={
          <>
            <Badge tone={u.status === 'active' ? 'good' : 'bad'}>{u.status === 'active' ? 'Active' : 'Suspended'}</Badge>
            {u.role === 'admin' && <Badge tone="staff">Platform admin</Badge>}
            <Badge tone={u.two_factor_enabled ? 'good' : 'muted'}>{u.two_factor_enabled ? 'Two-factor on' : 'No two-factor'}</Badge>
            {!u.email_verified && <Badge tone="warn">Email unconfirmed</Badge>}
            <span>{u.email}</span>
            <span>Joined {when(u.created_at)}</span>
            <span>Last sign-in {when(u.last_login_at)}</span>
          </>
        } />
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          <Card title="Organizations" flush>
            <DataTable rows={data.organizations} rowHref={(o) => `/admin/customers/${o.id}`} empty={<EmptyState compact title="Not in any organization" />} columns={[
              { key: 'name', header: 'Organization', cell: (o) => <Link to={`/admin/customers/${o.id}`} className="font-medium text-fg hover:underline">{o.name}</Link> },
              { key: 'role', header: 'Role', cell: (o) => <span className="text-fg-2">{o.role.replace('org_', '')}</span> },
              { key: 'plan', header: 'Plan', hide: 'sm', cell: (o) => <span className="capitalize text-fg-2">{o.plan}{o.exempt ? ' (exempt)' : ''}</span> },
              { key: 'status', header: 'Status', align: 'right', cell: (o) => <Badge tone={o.status === 'active' ? 'good' : 'bad'}>{o.status}</Badge> },
            ]} />
          </Card>
          <Card title="Engine usage" description="Across every organization they belong to">
            {usage.error ? <Alert>{usage.error}</Alert> : !usage.data ? <Spinner /> : <EngineUsage u={usage.data} showOrg />}
          </Card>
          <Card title="Activity" description="Most recent first" flush>
            <DataTable rows={data.activity} dense empty={<EmptyState compact title="Nothing recorded" />} columns={[
              { key: 'when', header: 'When', cell: (a) => <span className="whitespace-nowrap text-fg-3">{when(a.occurred_at)}</span> },
              { key: 'action', header: 'Action', cell: (a) => <span className={`font-mono text-xs ${a.action.startsWith('admin.') ? 'text-staff' : 'text-fg'}`}>{a.action}</span> },
              { key: 'org', header: 'Organization', hide: 'md', cell: (a) => <span className="text-fg-2">{a.org_name}</span> },
              { key: 'ip', header: 'IP', hide: 'sm', align: 'right', cell: (a) => <span className="font-mono text-xs text-fg-3">{a.ip}</span> },
            ]} />
          </Card>
        </div>
        <div className="grid gap-4">
      <Panel title="Account actions" description="Each action is audited; the user is told by email where it affects them.">
        <div className="grid gap-5">
          {!self && (u.status === 'active' ? (
            <div>
              <div className="text-sm text-fg mb-2">Suspend</div>
              <p className="text-xs text-fg-3 mb-2">Signs them out everywhere and blocks sign-in. They are told by email.</p>
              <ReasonForm label="Suspend account" danger onSubmit={(reason) => act(base, 'PATCH', { status: 'suspended', reason }, 'Account suspended.')} />
            </div>
          ) : (
            <div><Button size="sm" onClick={() => act(base, 'PATCH', { status: 'active' }, 'Account restored.')}>Restore account</Button></div>
          ))}
          <div className="flex flex-wrap gap-2">
            {!self && u.role !== 'admin' && <Button variant="ghost" size="sm" onClick={() => window.confirm(`Make ${u.email} a platform admin with full access?`) && act(base, 'PATCH', { role: 'admin' }, 'Now a platform admin.')}>Make platform admin</Button>}
            {!self && u.role === 'admin' && <Button variant="ghost" size="sm" onClick={() => act(base, 'PATCH', { role: 'user' }, 'Platform admin removed.')}>Remove platform admin</Button>}
            <Button variant="ghost" size="sm" onClick={() => act(`${base}/password-reset`, 'POST', undefined, 'Reset link sent and sessions ended.')}>Send password reset</Button>
            <Button variant="ghost" size="sm" onClick={() => act(`${base}/sessions/revoke`, 'POST', undefined, 'Signed out everywhere.')}>Sign out everywhere</Button>
            {!u.email_verified && <Button variant="ghost" size="sm" onClick={() => act(`${base}/verify-email`, 'POST', undefined, 'Email marked confirmed.')}>Confirm email</Button>}
          </div>
          {u.two_factor_enabled && (
            <div>
              <div className="text-sm text-fg mb-2">Reset two-factor</div>
              <p className="text-xs text-fg-3 mb-2">Only after you have confirmed who they are, for someone who lost their device and recovery codes.</p>
              <ReasonForm label="Reset two-factor" danger placeholder="How you confirmed their identity"
                onSubmit={(reason) => act(`${base}/two-factor/reset`, 'POST', { reason }, 'Two-factor turned off; they were told by email.')} />
            </div>
          )}
        </div>
      </Panel>

          {!self && u.role !== 'admin' && u.status === 'active' && (
            <Panel title="View as this user" description="See the app as they do for 30 minutes, read only. Starting and stopping are audited and the view is listed among their sessions.">
              <ReasonForm label="View as user" placeholder="Why, e.g. a support ticket" onSubmit={viewAs} />
            </Panel>
          )}

          <Panel title="Signed in on">
            {!sessions.data ? <Spinner /> : sessions.data.sessions.length === 0 ? <p className="text-sm text-fg-3">No active sessions.</p> : (
              <ul className="divide-y divide-line text-sm">
                {sessions.data.sessions.map((s) => (
                  <li key={s.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="truncate text-fg" title={s.user_agent}>{device(s.user_agent)}</div>
                    <div className="text-xs text-fg-3">{s.ip} · since {when(s.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {!self && (
            <Panel title="Delete account" description="Removes the account and the organizations only they belong to. This cannot be undone; they are told by email.">
              <ConfirmDelete what="account" confirmText={u.email} idPrefix="del-user" onSubmit={remove} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
