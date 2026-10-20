import { Link } from 'react-router-dom'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import { formatCredits } from '../../lib/credits.js'
import Alert from '../../components/common/Alert.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Stat, Table, money, td, useAdmin } from '../../components/admin/bits.jsx'

function MonthlyBars({ months }) {
  const max = Math.max(1, ...months.map((m) => m.cents))
  return (
    <div>
      <div className="flex gap-1.5 h-40" role="img" aria-label="Payments received per month over the last 12 months">
        {months.map((m) => (
          <div key={m.month} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0">
            <div className="w-full rounded-t bg-steel/70" style={{ height: `${Math.max(2, (m.cents / max) * 100)}%` }} title={`${m.month}: ${money(m.cents)}`} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {months.map((m) => <div key={m.month} className="flex-1 text-center font-mono text-[0.55rem] text-grey truncate">{m.month.slice(5)}</div>)}
      </div>
    </div>
  )
}

export default function AdminRevenue() {
  const { data: r, error } = useAdmin('/api/v1/admin/revenue')
  if (error) return <div className="max-w-6xl"><Alert>{error}</Alert></div>
  if (!r) return <Spinner />
  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Revenue" description="Recurring revenue at list price for active, non-exempt customers, and money actually received." />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="MRR" value={money(r.mrr_cents)} note={`${r.paying_customers} paying customers`} />
        <Stat label="ARR" value={money(r.arr_cents)} note={`${r.active_customers} active organizations`} />
        <Stat label="Received, 30 days" value={money(r.paid_30d_cents)} note={`${money(r.paid_all_cents)} all time`} />
        <Stat label="Credits, 30 days" value={`${formatCredits(r.credits_spent_30d_mc)} used`} note={`${formatCredits(r.credits_granted_30d_mc)} granted`} />
      </div>
      <Panel title="Received per month"><MonthlyBars months={r.monthly} /></Panel>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="By plan">
          <Table head={['Plan', 'Customers', 'MRR']}>
            {r.by_plan.map((p) => (
              <tr key={p.plan}>
                <td className={td}><Link to={`/admin/customers?plan=${p.plan}`} className="text-white hover:text-steel-light">{PLAN_LABELS[p.plan] || p.plan}</Link></td>
                <td className={td}>{p.customers}</td>
                <td className={`${td} whitespace-nowrap`}>{money(p.mrr_cents)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="By method">
          {Object.keys(r.paid_by_method_cents).length === 0 ? <p className="text-sm text-grey">No payments yet.</p> : (
            <ul className="grid gap-2 text-sm">
              {Object.entries(r.paid_by_method_cents).map(([m, c]) => (
                <li key={m} className="flex justify-between"><span className="text-[#cfcfcf]">{m.replace('_', ' ')}</span><span className="text-white">{money(c)}</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Top credit users, 30 days">
          {r.top_consumers_30d.length === 0 ? <p className="text-sm text-grey">No credits used yet.</p> : (
            <ul className="grid gap-2 text-sm">
              {r.top_consumers_30d.map((c) => (
                <li key={c.org_id} className="flex justify-between gap-3">
                  <Link to={`/admin/customers/${c.org_id}`} className="truncate text-[#cfcfcf] hover:text-white">{c.name}</Link>
                  <span className="text-white">{formatCredits(c.spent_mc)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
