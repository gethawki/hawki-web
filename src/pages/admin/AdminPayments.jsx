import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Receipt } from 'lucide-react'
import { api } from '../../lib/api.js'
import { dateTime, num, usd } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { FilterSelect, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState } from '../../components/ui/Feedback.jsx'
import PaymentForm, { METHODS, STATUSES } from '../../components/admin/PaymentForm.jsx'

const STATUS_TONE = { succeeded: 'good', pending: 'warning', failed: 'danger', refunded: 'neutral' }
const dateInput = 'h-8 rounded-lg border border-line bg-surface px-2 text-sm text-fg outline-none focus:border-accent/60'

export default function AdminPayments() {
  const [params, setParams] = useSearchParams()
  const [recording, setRecording] = useState(false)
  const f = ['method', 'status', 'from', 'to'].reduce((o, k) => ({ ...o, [k]: params.get(k) || '' }), {})
  const { data, error, loading, stale, reload } = useApi(`/api/v1/admin/payments?${new URLSearchParams({ ...f, limit: 200 })}`)
  const orgs = useApi(recording ? '/api/v1/admin/customers?limit=200&sort=name' : null)

  function set(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }
  async function setStatus(p, status) {
    await api(`/api/v1/admin/payments/${p.id}`, { method: 'PATCH', body: { status } }).catch(() => {})
    reload()
  }
  const pending = data?.payments.filter((p) => p.status === 'pending') || []

  return (
    <div className="grid gap-4">
      <PageHeader title="Payments" description="Money received from every source. Manual payments are recorded here; Stripe payments will appear automatically once it is connected."
        actions={<Button size="sm" onClick={() => setRecording(true)}><Plus size={14} /> Record payment</Button>} />
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Received in this view" value={usd(data.succeeded_total_cents)} sub={`${num(data.payments.filter((p) => p.status === 'succeeded').length)} payments`} />
          <StatCard label="Pending" value={num(pending.length)} sub={usd(pending.reduce((a, p) => a + p.amount_cents, 0))} />
          <StatCard label="Payments shown" value={num(data.payments.length)} sub="Newest first, up to 200" />
        </div>
      )}
      <Toolbar>
        <FilterSelect id="payf-method" label="Method" value={f.method} onChange={(v) => set('method', v)}
          options={[{ value: '', label: 'Any method' }, { value: 'stripe', label: 'Stripe' }, ...METHODS]} />
        <FilterSelect id="payf-status" label="Status" value={f.status} onChange={(v) => set('status', v)} options={[{ value: '', label: 'Any status' }, ...STATUSES]} />
        <label className="inline-flex items-center gap-2 text-xs text-fg-3">From<input id="payf-from" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} className={dateInput} /></label>
        <label className="inline-flex items-center gap-2 text-xs text-fg-3">To<input id="payf-to" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} className={dateInput} /></label>
      </Toolbar>
      {error && <ErrorState>{error}</ErrorState>}
      <Card flush>
        <DataTable rows={data?.payments} loading={loading} stale={stale}
          empty={<EmptyState icon={Receipt} title="No payments" action={<Button size="sm" variant="ghost" onClick={() => setRecording(true)}>Record a payment</Button>} />}
          columns={[
            { key: 'date', header: 'Date', cell: (p) => <span className="whitespace-nowrap text-fg-3">{dateTime(p.occurred_at)}</span> },
            { key: 'org', header: 'Customer', cell: (p) => <Link to={`/admin/customers/${p.org_id}`} className="font-medium text-fg hover:underline">{p.org_name}</Link> },
            { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="text-fg">{usd(p.amount_cents, p.currency)}</span> },
            { key: 'method', header: 'Method', hide: 'md', cell: (p) => <span className="capitalize text-fg-2">{p.method.replace('_', ' ')}</span> },
            { key: 'kind', header: 'For', hide: 'lg', cell: (p) => <span className="capitalize text-fg-2">{p.kind}{p.credits ? ` (${p.credits} credits)` : ''}</span> },
            {
              key: 'status', header: 'Status', cell: (p) => p.method === 'stripe' ? <Badge tone={STATUS_TONE[p.status]} dot>{p.status}</Badge> : (
                <select aria-label="Payment status" value={p.status} onChange={(e) => setStatus(p, e.target.value)}
                  className="h-7 rounded-md border border-line bg-surface px-1.5 text-xs text-fg">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ),
            },
            { key: 'ref', header: 'Reference', hide: 'lg', cell: (p) => <span className="font-mono text-xs text-fg-3">{p.reference}</span> },
          ]} />
      </Card>
      <Modal open={recording} onClose={() => setRecording(false)} title="Record a payment" description="For bank transfers, crypto and other payments taken outside Stripe." width="max-w-2xl">
        {orgs.data ? <PaymentForm orgs={orgs.data.customers} onSaved={() => { setRecording(false); reload() }} /> : <div className="h-40" />}
      </Modal>
    </div>
  )
}
