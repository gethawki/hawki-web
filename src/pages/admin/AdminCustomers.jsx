import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, X } from 'lucide-react'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import { formatCredits } from '../../lib/credits.js'
import { ago, num, usd } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable, { Pager } from '../../components/ui/DataTable.jsx'
import { FilterSelect, SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState } from '../../components/ui/Feedback.jsx'

const PAGE = 50
const PLANS = [{ value: '', label: 'Any plan' }, ...Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }))]
const SORTS = [
  { value: 'created', label: 'Newest' }, { value: 'mrr', label: 'MRR' }, { value: 'paid', label: 'Total paid' },
  { value: 'credits', label: 'Credits left' }, { value: 'activity', label: 'Last scan' }, { value: 'name', label: 'Name' },
]

export default function AdminCustomers() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const f = ['plan', 'status', 'exempt', 'tag', 'sort'].reduce((o, k) => ({ ...o, [k]: params.get(k) || '' }), {})
  const offset = Number(params.get('offset') || 0)
  const query = new URLSearchParams({ q: params.get('q') || '', ...f, limit: PAGE, offset }).toString()
  const { data, error, loading, stale } = useApi(`/api/v1/admin/customers?${query}`)

  function set(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'offset') p.delete('offset')
    setParams(p, { replace: true })
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Customers" description="Every organization with its plan, revenue, credits and usage. Open one for notes, payments and controls."
        meta={data && <span className="tnum">{num(data.total)} {data.total === 1 ? 'organization' : 'organizations'}</span>} />
      <Toolbar right={<FilterSelect id="cust-sort" label="Sort" value={f.sort || 'created'} onChange={(v) => set('sort', v)} options={SORTS} />}>
        <SearchInput id="cust-q" className="w-full sm:w-72" value={q} onChange={setQ} onSubmit={() => set('q', q.trim())} placeholder="Name, slug or owner email" label="Search customers" />
        <FilterSelect id="cust-plan" label="Plan" value={f.plan} onChange={(v) => set('plan', v)} options={PLANS} />
        <FilterSelect id="cust-status" label="Status" value={f.status} onChange={(v) => set('status', v)}
          options={[{ value: '', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        <FilterSelect id="cust-exempt" label="Billing" value={f.exempt} onChange={(v) => set('exempt', v)}
          options={[{ value: '', label: 'Any billing' }, { value: 'false', label: 'Paying or free' }, { value: 'true', label: 'Exempt' }]} />
        {f.tag && (
          <button type="button" onClick={() => set('tag', '')} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-fg-2 hover:text-fg">
            Tag: {f.tag} <X size={12} />
          </button>
        )}
      </Toolbar>
      {error && <ErrorState>{error}</ErrorState>}
      <Card flush>
        <DataTable rows={data?.customers} loading={loading} stale={stale} rowKey={(c) => c.org_id} rowHref={(c) => `/admin/customers/${c.org_id}`}
          empty={<EmptyState icon={Building2} title="No customers match" />}
          columns={[
            {
              key: 'org', header: 'Organization', cell: (c) => (
                <div className="min-w-0">
                  <Link to={`/admin/customers/${c.org_id}`} className="font-medium text-fg hover:underline">{c.name}</Link>
                  <div className="max-w-[16rem] truncate text-xs text-fg-3">{c.owner_email}</div>
                  {(c.status !== 'active' || c.tags.length > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.status !== 'active' && <Badge tone="danger" dot>Suspended</Badge>}
                      {c.tags.map((t) => <button key={t} type="button" onClick={() => set('tag', t)}><Badge>{t}</Badge></button>)}
                    </div>
                  )}
                </div>
              ),
            },
            { key: 'plan', header: 'Plan', cell: (c) => <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap text-fg-2">{PLAN_LABELS[c.plan] || c.plan}{c.exempt && <Badge tone="good">Exempt</Badge>}</div> },
            { key: 'mrr', header: 'MRR', align: 'right', cell: (c) => usd(c.mrr_cents) },
            { key: 'paid', header: 'Paid', align: 'right', hide: 'sm', cell: (c) => usd(c.paid_cents) },
            { key: 'credits', header: 'Credits', align: 'right', hide: 'md', cell: (c) => c.exempt ? <span className="text-fg-3">Unlimited</span> : formatCredits(c.credits_mc) },
            { key: 'usage', header: 'Members / projects', align: 'right', hide: 'lg', cell: (c) => <span className="text-fg-2">{c.members} / {c.projects}</span> },
            { key: 'last', header: 'Last scan', align: 'right', hide: 'md', cell: (c) => <span className="text-fg-3">{c.last_scan_at ? ago(c.last_scan_at) : 'Never'}</span> },
          ]}
          footer={data && data.total > 0 && <Pager offset={offset} limit={PAGE} total={data.total} count={data.customers.length} onChange={(o) => set('offset', String(o))} />} />
      </Card>
    </div>
  )
}
