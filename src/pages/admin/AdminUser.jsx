import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, ReasonForm, Table, td, useAdmin, when } from '../../components/admin/bits.jsx'

const ERRORS = {
  last_platform_admin: 'The platform must keep at least one active admin.',
  two_factor_off: 'This user does not have two-factor sign-in on.',
}

export default function AdminUser() {
  const { userId } = useParams()
  const { user: me } = useAuth()
  const { data, error, reload } = useAdmin(`/api/v1/admin/users/${userId}`)
  const sessions = useAdmin(`/api/v1/admin/users/${userId}/sessions`)
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

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!data) return <Spinner />
  const u = data.user
  const self = u.id === me.id
  const base = `/api/v1/admin/users/${u.id}`
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title={u.name || u.email} description={`${u.email} · joined ${when(u.created_at)} · last sign-in ${when(u.last_login_at)}`}
        actions={<div className="flex flex-wrap gap-1">
          <Badge tone={u.status === 'active' ? 'good' : 'bad'}>{u.status}</Badge>
          {u.role === 'admin' && <Badge tone="good">platform admin</Badge>}
          <Badge>{u.two_factor_enabled ? 'two-factor on' : 'no two-factor'}</Badge>
          {!u.email_verified && <Badge tone="bad">email unconfirmed</Badge>}
        </div>} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Panel title="Account actions">
        <div className="grid gap-5">
          {!self && (u.status === 'active' ? (
            <div>
              <div className="text-sm text-white mb-2">Suspend</div>
              <p className="text-xs text-grey mb-2">Signs them out everywhere and blocks sign-in. They are told by email.</p>
              <ReasonForm label="Suspend account" danger onSubmit={(reason) => act(base, 'PATCH', { status: 'suspended', reason }, 'Account suspended.')} />
            </div>
          ) : (
            <div><Button onClick={() => act(base, 'PATCH', { status: 'active' }, 'Account restored.')}>Restore account</Button></div>
          ))}
          <div className="flex flex-wrap gap-2">
            {!self && u.role !== 'admin' && <Button variant="ghost" onClick={() => window.confirm(`Make ${u.email} a platform admin with full access?`) && act(base, 'PATCH', { role: 'admin' }, 'Now a platform admin.')}>Make platform admin</Button>}
            {!self && u.role === 'admin' && <Button variant="ghost" onClick={() => act(base, 'PATCH', { role: 'user' }, 'Platform admin removed.')}>Remove platform admin</Button>}
            <Button variant="ghost" onClick={() => act(`${base}/password-reset`, 'POST', undefined, 'Reset link sent and sessions ended.')}>Send password reset</Button>
            <Button variant="ghost" onClick={() => act(`${base}/sessions/revoke`, 'POST', undefined, 'Signed out everywhere.')}>Sign out everywhere</Button>
            {!u.email_verified && <Button variant="ghost" onClick={() => act(`${base}/verify-email`, 'POST', undefined, 'Email marked confirmed.')}>Confirm email</Button>}
          </div>
          {u.two_factor_enabled && (
            <div>
              <div className="text-sm text-white mb-2">Reset two-factor</div>
              <p className="text-xs text-grey mb-2">Only after you have confirmed who they are, for someone who lost their device and recovery codes.</p>
              <ReasonForm label="Reset two-factor" danger placeholder="How you confirmed their identity"
                onSubmit={(reason) => act(`${base}/two-factor/reset`, 'POST', { reason }, 'Two-factor turned off; they were told by email.')} />
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Organizations">
        {data.organizations.length === 0 ? <p className="text-sm text-grey">None.</p> : (
          <Table head={['Organization', 'Role', 'Plan', 'Status']}>
            {data.organizations.map((o) => (
              <tr key={o.id}>
                <td className={td}><Link to={`/admin/customers/${o.id}`} className="text-white hover:text-steel-light">{o.name}</Link></td>
                <td className={td}>{o.role.replace('org_', '')}</td>
                <td className={td}>{o.plan}{o.exempt ? ' (exempt)' : ''}</td>
                <td className={td}><Badge tone={o.status === 'active' ? 'good' : 'bad'}>{o.status}</Badge></td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="Signed in on">
        {!sessions.data ? <Spinner /> : sessions.data.sessions.length === 0 ? <p className="text-sm text-grey">No active sessions.</p> : (
          <ul className="divide-y divide-panel-border text-sm">
            {sessions.data.sessions.map((s) => (
              <li key={s.id} className="py-2">
                <div className="text-[#cfcfcf] truncate">{s.user_agent || 'Unknown device'}</div>
                <div className="text-xs text-grey">{s.ip} · since {when(s.created_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Activity">
        {data.activity.length === 0 ? <p className="text-sm text-grey">Nothing recorded.</p> : (
          <Table head={['When', 'Action', 'Organization', 'IP']}>
            {data.activity.map((a) => (
              <tr key={a.id}>
                <td className={`${td} text-xs text-grey whitespace-nowrap`}>{when(a.occurred_at)}</td>
                <td className={`${td} font-mono text-xs text-white`}>{a.action}</td>
                <td className={td}>{a.org_name}</td>
                <td className={`${td} text-xs text-grey`}>{a.ip}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  )
}
