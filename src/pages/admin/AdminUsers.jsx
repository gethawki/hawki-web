import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { ago, initials, num } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable, { Pager } from '../../components/ui/DataTable.jsx'
import { FilterSelect, SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState } from '../../components/ui/Feedback.jsx'

const PAGE = 50

export default function AdminUsers() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const status = params.get('status') || ''
  const role = params.get('role') || ''
  const offset = Number(params.get('offset') || 0)
  const query = new URLSearchParams({ q: params.get('q') || '', status, role, limit: PAGE, offset }).toString()
  const { data, error, loading, stale } = useApi(`/api/v1/admin/users?${query}`)

  function set(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'offset') p.delete('offset')
    setParams(p, { replace: true })
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Users" description="Every account on the platform. Open one to suspend it, reset its sign-in or see what it did."
        meta={data && <span className="tnum">{num(data.total)} {data.total === 1 ? 'user' : 'users'}</span>} />
      <Toolbar>
        <SearchInput id="user-q" className="w-full sm:w-80" value={q} onChange={setQ} onSubmit={() => set('q', q.trim())} placeholder="Email, name or ID" label="Search users" />
        <FilterSelect id="user-status" label="Status" value={status} onChange={(v) => set('status', v)}
          options={[{ value: '', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        <FilterSelect id="user-role" label="Role" value={role} onChange={(v) => set('role', v)}
          options={[{ value: '', label: 'Any role' }, { value: 'admin', label: 'Platform admin' }, { value: 'user', label: 'User' }]} />
      </Toolbar>
      {error && <ErrorState>{error}</ErrorState>}
      <Card flush>
        <DataTable rows={data?.users} loading={loading} stale={stale} rowHref={(u) => `/admin/users/${u.id}`}
          empty={<EmptyState icon={Users} title="No users match" />}
          columns={[
            {
              key: 'user', header: 'User', cell: (u) => (
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[0.7rem] font-semibold text-fg ring-1 ring-line-strong">{initials(u.name || u.email)}</span>
                  <div className="min-w-0">
                    <Link to={`/admin/users/${u.id}`} className="block truncate font-medium text-fg hover:underline">{u.name || u.email}</Link>
                    <div className="truncate text-xs text-fg-3">{u.email}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'status', header: 'Status', cell: (u) => (
                <div className="flex flex-wrap gap-1">
                  <Badge tone={u.status === 'active' ? 'good' : 'danger'} dot>{u.status === 'active' ? 'Active' : 'Suspended'}</Badge>
                  {u.role === 'admin' && <Badge tone="staff">Admin</Badge>}
                </div>
              ),
            },
            {
              key: 'security', header: 'Security', hide: 'md', cell: (u) => (
                <div className="flex flex-wrap gap-1">
                  <Badge tone={u.two_factor_enabled ? 'good' : 'neutral'}>{u.two_factor_enabled ? 'Two-factor' : 'Password only'}</Badge>
                  {!u.email_verified && <Badge tone="warning">Unconfirmed</Badge>}
                </div>
              ),
            },
            { key: 'orgs', header: 'Orgs', align: 'right', hide: 'sm', cell: (u) => u.organizations },
            { key: 'joined', header: 'Joined', align: 'right', hide: 'lg', cell: (u) => <span className="text-fg-3">{ago(u.created_at)}</span> },
            { key: 'seen', header: 'Last sign-in', align: 'right', cell: (u) => <span className="text-fg-3">{ago(u.last_login_at)}</span> },
          ]}
          footer={data && data.total > 0 && <Pager offset={offset} limit={PAGE} total={data.total} count={data.users.length} onChange={(o) => set('offset', String(o))} />} />
      </Card>
    </div>
  )
}
