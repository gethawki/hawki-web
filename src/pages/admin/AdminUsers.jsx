import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, Table, td, useAdmin, when } from '../../components/admin/bits.jsx'

const PAGE = 50

export default function AdminUsers() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const status = params.get('status') || ''
  const role = params.get('role') || ''
  const offset = Number(params.get('offset') || 0)
  const query = new URLSearchParams({ q: params.get('q') || '', status, role, limit: PAGE, offset }).toString()
  const { data, error } = useAdmin(`/api/v1/admin/users?${query}`)

  function set(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'offset') p.delete('offset')
    setParams(p, { replace: true })
  }

  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Users" description="Every account on the platform. Open one to manage it." />
      <form className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] items-end" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()) }}>
        <Field id="user-q" label="Search" placeholder="Email, name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <SelectField id="user-status" label="Status" value={status} onChange={(e) => set('status', e.target.value)}
          options={[{ value: '', label: 'Any' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        <SelectField id="user-role" label="Role" value={role} onChange={(e) => set('role', e.target.value)}
          options={[{ value: '', label: 'Any' }, { value: 'admin', label: 'Platform admin' }, { value: 'user', label: 'User' }]} />
        <Button type="submit" variant="ghost">Search</Button>
      </form>
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!data ? <Spinner /> : (
          <>
            <p className="mb-3 text-xs text-grey">{data.total} {data.total === 1 ? 'user' : 'users'}</p>
            <Table head={['User', 'Status', 'Security', 'Orgs', 'Joined', 'Last sign-in']}>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className={td}>
                    <Link to={`/admin/users/${u.id}`} className="text-white hover:text-steel-light">{u.name || u.email}</Link>
                    <div className="text-xs text-grey">{u.email}</div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={u.status === 'active' ? 'good' : 'bad'}>{u.status}</Badge>
                      {u.role === 'admin' && <Badge tone="good">admin</Badge>}
                    </div>
                  </td>
                  <td className={`${td} text-xs text-grey whitespace-nowrap`}>
                    {u.two_factor_enabled ? 'two-factor' : 'password'}{u.email_verified ? '' : ', unconfirmed'}
                  </td>
                  <td className={td}>{u.organizations}</td>
                  <td className={`${td} text-xs text-grey whitespace-nowrap`}>{when(u.created_at)}</td>
                  <td className={`${td} text-xs text-grey whitespace-nowrap`}>{when(u.last_login_at)}</td>
                </tr>
              ))}
            </Table>
            <div className="mt-4 flex gap-2">
              {offset > 0 && <Button variant="ghost" onClick={() => set('offset', String(Math.max(0, offset - PAGE)))}>Previous</Button>}
              {offset + PAGE < data.total && <Button variant="ghost" onClick={() => set('offset', String(offset + PAGE))}>Next</Button>}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
