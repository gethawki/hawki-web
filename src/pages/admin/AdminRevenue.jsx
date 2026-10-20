import { Link } from 'react-router-dom'
import { Coins, DollarSign, Repeat, TrendingUp } from 'lucide-react'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import { formatCredits } from '../../lib/credits.js'
import { num, usd } from '../../lib/format.js'
import { useApi } from '../../lib/useApi.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import { BarList } from '../../components/charts/Small.jsx'

const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
const monthTitle = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function AdminRevenue() {
  const { data: r, error } = useApi('/api/v1/admin/revenue')
  if (error) return <ErrorState>{error}</ErrorState>
  if (!r) return <PageSkeleton />
  const monthly = r.monthly.map((m) => ({ label: monthLabel(m.month), title: monthTitle(m.month), paid: m.cents }))
  return (
    <div className="grid gap-4">
      <PageHeader title="Revenue" description="Recurring revenue at list price for active, non-exempt customers, and the money actually received." />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="MRR" icon={Repeat} value={usd(r.mrr_cents)} sub={`${num(r.paying_customers)} paying customers`} />
        <StatCard label="ARR" icon={TrendingUp} value={usd(r.arr_cents)} sub={`${num(r.active_customers)} active organizations`} />
        <StatCard label="Received, 30 days" icon={DollarSign} value={usd(r.paid_30d_cents)} sub={`${usd(r.paid_all_cents)} all time`} trend={r.monthly.map((m) => m.cents)} />
        <StatCard label="Credits used, 30 days" icon={Coins} value={formatCredits(r.credits_spent_30d_mc)} sub={`${formatCredits(r.credits_granted_30d_mc)} granted`} />
      </div>
      <Card title="Received per month" description="Succeeded payments over the last 12 months">
        <TimeChart kind="stacked" data={monthly} series={[{ key: 'paid', label: 'Received', color: 'var(--color-series-1)' }]} height={240}
          format={(v) => usd(v)} caption="Payments received per month" />
      </Card>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card title="By plan" flush>
          <DataTable rows={r.by_plan} rowKey={(p) => p.plan} dense columns={[
            { key: 'plan', header: 'Plan', cell: (p) => <Link to={`/admin/customers?plan=${p.plan}`} className="font-medium text-fg hover:underline">{PLAN_LABELS[p.plan] || p.plan}</Link> },
            { key: 'customers', header: 'Customers', align: 'right', cell: (p) => num(p.customers) },
            { key: 'mrr', header: 'MRR', align: 'right', cell: (p) => usd(p.mrr_cents) },
          ]} />
        </Card>
        <Card title="By payment method">
          <BarList format={(v) => usd(v)} empty="No payments yet."
            items={Object.entries(r.paid_by_method_cents).map(([m, c]) => ({ key: m, label: m.replace('_', ' ').replace(/^\w/, (x) => x.toUpperCase()), value: c }))} />
        </Card>
        <Card title="Top credit users" description="Last 30 days">
          <BarList format={formatCredits} empty="No credits used yet."
            items={r.top_consumers_30d.map((c) => ({ key: c.org_id, label: c.name, value: c.spent_mc, href: `/admin/customers/${c.org_id}` }))} />
        </Card>
      </div>
    </div>
  )
}
