import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import Alert from '../../components/common/Alert.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, Table, money, td, useAdmin, when } from '../../components/admin/bits.jsx'
import PaymentForm, { METHODS, STATUSES } from '../../components/admin/PaymentForm.jsx'

export default function AdminPayments() {
  const [params, setParams] = useSearchParams()
  const f = ['method', 'status', 'from', 'to'].reduce((o, k) => ({ ...o, [k]: params.get(k) || '' }), {})
  const { data, error, reload } = useAdmin(`/api/v1/admin/payments?${new URLSearchParams({ ...f, limit: 200 })}`)
  const orgs = useAdmin('/api/v1/admin/customers?limit=200&sort=name')

  function set(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }

  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Payments" description="Money received, from every source. Stripe payments appear here once it is connected." />
      <Panel title="Record a payment">
        {orgs.data ? <PaymentForm orgs={orgs.data.customers} onSaved={reload} /> : <Spinner />}
      </Panel>
      <div className="grid gap-3 sm:grid-cols-4">
        <SelectField id="payf-method" label="Method" value={f.method} onChange={(e) => set('method', e.target.value)}
          options={[{ value: '', label: 'Any' }, { value: 'stripe', label: 'Stripe' }, ...METHODS]} />
        <SelectField id="payf-status" label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} options={[{ value: '', label: 'Any' }, ...STATUSES]} />
        <Field id="payf-from" label="From" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
        <Field id="payf-to" label="To" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />
      </div>
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!data ? <Spinner /> : (
          <>
            <p className="mb-3 text-sm text-[#cfcfcf]">Received in this view: <span className="text-white">{money(data.succeeded_total_cents)}</span></p>
            {data.payments.length === 0 ? <p className="text-sm text-grey">No payments.</p> : (
              <Table head={['Date', 'Customer', 'Amount', 'Method', 'For', 'Status', 'Reference']}>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} whitespace-nowrap text-xs text-grey`}>{when(p.occurred_at)}</td>
                    <td className={td}><Link to={`/admin/customers/${p.org_id}`} className="text-white hover:text-steel-light">{p.org_name}</Link></td>
                    <td className={`${td} whitespace-nowrap text-white`}>{money(p.amount_cents, p.currency)}</td>
                    <td className={td}>{p.method.replace('_', ' ')}</td>
                    <td className={td}>{p.kind}{p.credits ? ` (${p.credits})` : ''}</td>
                    <td className={td}>
                      {p.method === 'stripe' ? <Badge>{p.status}</Badge> : (
                        <select aria-label="Payment status" value={p.status} className="rounded-lg bg-ink-soft border border-panel-border px-2 py-1 text-xs text-white"
                          onChange={async (e) => { await api(`/api/v1/admin/payments/${p.id}`, { method: 'PATCH', body: { status: e.target.value } }).catch(() => {}); reload() }}>
                          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className={`${td} text-xs text-grey`}>{p.reference}</td>
                  </tr>
                ))}
              </Table>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}
