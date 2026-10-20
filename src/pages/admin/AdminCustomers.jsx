import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import { formatCredits } from '../../lib/credits.js'
import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, Table, day, money, td, useAdmin } from '../../components/admin/bits.jsx'

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
  const { data, error } = useAdmin(`/api/v1/admin/customers?${query}`)

  function set(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'offset') p.delete('offset')
    setParams(p, { replace: true })
  }

  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Customers" description="Every organization with its plan, revenue, credits and usage." />
      <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 items-end" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()) }}>
        <div className="sm:col-span-3 lg:col-span-2"><Field id="cust-q" label="Search" placeholder="Name, slug or owner email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <SelectField id="cust-plan" label="Plan" value={f.plan} onChange={(e) => set('plan', e.target.value)} options={PLANS} />
        <SelectField id="cust-status" label="Status" value={f.status} onChange={(e) => set('status', e.target.value)}
          options={[{ value: '', label: 'Any' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        <SelectField id="cust-exempt" label="Billing" value={f.exempt} onChange={(e) => set('exempt', e.target.value)}
          options={[{ value: '', label: 'Any' }, { value: 'false', label: 'Paying or free' }, { value: 'true', label: 'Exempt' }]} />
        <SelectField id="cust-sort" label="Sort" value={f.sort || 'created'} onChange={(e) => set('sort', e.target.value)} options={SORTS} />
        <button type="submit" className="hidden">Search</button>
      </form>
      {f.tag && <p className="text-sm text-grey">Tagged <Badge>{f.tag}</Badge> <button className="ml-2 underline" onClick={() => set('tag', '')}>clear</button></p>}
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!data ? <Spinner /> : (
          <>
            <p className="mb-3 text-xs text-grey">{data.total} {data.total === 1 ? 'organization' : 'organizations'}</p>
            <Table head={['Organization', 'Plan', 'MRR', 'Paid', 'Credits', 'Members', 'Projects', 'Last scan']}>
              {data.customers.map((c) => (
                <tr key={c.org_id}>
                  <td className={td}>
                    <Link to={`/admin/customers/${c.org_id}`} className="text-white hover:text-steel-light">{c.name}</Link>
                    <div className="text-xs text-grey truncate max-w-[16rem]">{c.owner_email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.status !== 'active' && <Badge tone="bad">{c.status}</Badge>}
                      {c.tags.map((t) => <button key={t} type="button" onClick={() => set('tag', t)}><Badge>{t}</Badge></button>)}
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{PLAN_LABELS[c.plan] || c.plan}{c.exempt && <div><Badge tone="good">exempt</Badge></div>}</td>
                  <td className={`${td} whitespace-nowrap`}>{money(c.mrr_cents)}</td>
                  <td className={`${td} whitespace-nowrap`}>{money(c.paid_cents)}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatCredits(c.credits_mc)}</td>
                  <td className={td}>{c.members}</td>
                  <td className={td}>{c.projects}</td>
                  <td className={`${td} text-xs text-grey whitespace-nowrap`}>{c.last_scan_at ? day(c.last_scan_at) : 'never'}</td>
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
