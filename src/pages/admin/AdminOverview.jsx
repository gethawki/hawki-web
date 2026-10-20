import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Building2, CreditCard, DollarSign, ScanLine, UserPlus, Users } from 'lucide-react'
import { useApi } from '../../lib/useApi.js'
import { ago, change, day, num, pct, usd } from '../../lib/format.js'
import { formatCredits } from '../../lib/credits.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { CardLink } from '../../components/ui/Card.jsx'
import StatCard, { Delta } from '../../components/ui/Stat.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { RANGES, Segmented } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import { BarList } from '../../components/charts/Small.jsx'

const KIND_LINK = { scan: (i) => `/dashboard/scans/${i.ref_id}`, signup: (i) => `/admin/users/${i.ref_id}`, payment: () => '/admin/payments' }

function Health({ o }) {
  const healthy = Object.values(o.health).every((s) => s === 'ok')
  return (
    <Card title="System" actions={<Badge tone={healthy ? 'good' : 'danger'} dot>{healthy ? 'All systems normal' : 'Degraded'}</Badge>}>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        {Object.entries(o.health).map(([name, status]) => (
          <li key={name} className="flex items-center justify-between gap-2">
            <span className="capitalize text-fg-2">{name.replace(/_/g, ' ')}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs ${status === 'ok' ? 'text-[#5fd35f]' : 'text-[#ff8b8b]'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />{status === 'ok' ? 'Up' : status}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
        {[['Running', o.scans.running], ['Queued', o.scans.queued], ['Alerts to send', o.alerts.pending_deliveries]].map(([l, v]) => (
          <div key={l}><div className="text-lg font-semibold text-fg tnum">{num(v)}</div><div className="text-[0.7rem] text-fg-3">{l}</div></div>
        ))}
      </div>
    </Card>
  )
}

export default function AdminOverview() {
  const [days, setDays] = useState(30)
  const { data: o, error } = useApi('/api/v1/admin/overview')
  const { data: a, stale } = useApi(`/api/v1/admin/analytics?days=${days}`)
  const { data: act } = useApi('/api/v1/admin/activity')
  if (error) return <ErrorState>{error}</ErrorState>
  if (!o || !a) return <PageSkeleton cards={8} />

  const c = a.current
  const p = a.previous
  const period = `previous ${days} days`
  const spark = (k) => a.daily.map((d) => d[k])
  const growth = a.daily.map((d) => ({ label: day(d.date), signups: d.signups, active: d.active_users }))
  const scans = a.daily.map((d) => ({ label: day(d.date), ok: d.scans - d.scans_failed, failed: d.scans_failed }))
  const revenue = a.daily.map((d) => ({ label: day(d.date), paid: d.paid_cents }))
  const failRate = c.scans ? c.scans_failed / c.scans : null

  return (
    <div>
      <PageHeader title="Platform overview" description="Growth, usage, revenue and health across every organization on Hawk-i Cloud."
        actions={<Segmented label="Time range" options={RANGES} value={days} onChange={setDays} />} />

      {o.switches_on.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/[0.07] px-4 py-3 text-sm text-[#f5dfae]">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">Emergency switches on: {o.switches_on.map((s) => s.key.replace(/_/g, ' ')).join(', ')}.</span>
          <Link to="/admin/switches" className="text-xs underline hover:text-fg">Manage</Link>
        </div>
      )}

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Sign-ups" icon={UserPlus} value={num(c.signups)} trend={spark('signups')} to="/admin/users"
            delta={<Delta value={change(c.signups, p.signups)} period={period} />} sub={`${num(o.users.total)} users in total`} />
          <StatCard label="Active users" icon={Users} value={num(c.active_users)} trend={spark('active_users')}
            delta={<Delta value={change(c.active_users, p.active_users)} period={period} />} sub={`${num(o.users.two_factor)} use two-factor`} />
          <StatCard label="Received" icon={DollarSign} value={usd(c.paid_cents)} trend={spark('paid_cents')} to="/admin/revenue"
            delta={<Delta value={change(c.paid_cents, p.paid_cents)} period={period} />} sub={`MRR ${usd(o.revenue.mrr_cents)}`} />
          <StatCard label="Scans" icon={ScanLine} value={num(c.scans)} trend={spark('scans')}
            delta={<Delta value={change(c.scans, p.scans)} period={period} />} sub={failRate == null ? 'None in this period' : `${pct(failRate, 1)} failed`} />
          <StatCard label="New organizations" icon={Building2} value={num(c.orgs)} trend={spark('orgs')} to="/admin/customers"
            delta={<Delta value={change(c.orgs, p.orgs)} period={period} />} sub={`${num(o.organizations.total)} in total, ${num(o.organizations.exempt)} exempt`} />
          <StatCard label="Credits spent" icon={CreditCard} value={formatCredits(c.credits_mc)} trend={spark('credits_mc')}
            delta={<Delta value={change(c.credits_mc, p.credits_mc)} period={period} />} sub={`${num(o.revenue.paying_customers)} paying customers`} />
          <StatCard label="Findings recorded" icon={Activity} value={num(c.findings)} trend={spark('findings')}
            delta={<Delta value={change(c.findings, p.findings)} period={period} />} sub={`${num(o.projects)} projects, ${num(o.reports)} reports`} />
          <StatCard label="Suspended" icon={AlertTriangle} value={num(o.users.suspended + o.organizations.suspended)} tone={o.users.suspended + o.organizations.suspended ? 'danger' : undefined}
            sub={`${num(o.users.suspended)} users, ${num(o.organizations.suspended)} organizations`} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="Growth" description="New accounts and distinct users signing in, per day">
            <TimeChart data={growth} series={[{ key: 'signups', label: 'Sign-ups', color: 'var(--color-series-1)' }, { key: 'active', label: 'Active users', color: 'var(--color-series-2)' }]}
              height={230} caption="Sign-ups and active users per day" stale={stale} />
          </Card>
          <Card title="Scans" description="Scans requested per day, by outcome">
            <TimeChart kind="stacked" data={scans} series={[{ key: 'ok', label: 'Completed or running', color: 'var(--color-series-1)' }, { key: 'failed', label: 'Failed', color: 'var(--color-critical)' }]}
              height={230} caption="Scans per day by outcome" stale={stale} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" title="Payments received" description="Succeeded payments per day" actions={<CardLink to="/admin/payments" />}>
            <TimeChart kind="stacked" data={revenue} series={[{ key: 'paid', label: 'Received', color: 'var(--color-series-1)' }]} height={200}
              format={(v) => usd(v)} caption="Payments received per day" stale={stale} />
          </Card>
          <Health o={o} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3" title="Most active organizations" description={`By scans in the last ${days} days`} actions={<CardLink to="/admin/customers" />} flush>
            <DataTable rows={a.top_orgs} stale={stale} rowHref={(r) => `/admin/customers/${r.id}`}
              empty={<EmptyState compact icon={Building2} title="No scans in this period" />}
              columns={[
                { key: 'name', header: 'Organization', cell: (r) => <Link to={`/admin/customers/${r.id}`} className="font-medium text-fg hover:underline">{r.name}</Link> },
                { key: 'scans', header: 'Scans', align: 'right', cell: (r) => num(r.scans) },
                { key: 'failed', header: 'Failed', align: 'right', cell: (r) => <span className={r.failed ? 'text-[#ff8b8b]' : 'text-fg-3'}>{num(r.failed)}</span> },
                { key: 'findings', header: 'Findings', align: 'right', hide: 'sm', cell: (r) => num(r.findings) },
              ]} />
          </Card>
          <Card className="xl:col-span-2" title="Why scans fail" description={`Most common errors in the last ${days} days`}>
            <BarList items={a.failures.map((f) => ({ label: f.error, value: f.count, color: 'var(--color-critical)' }))} empty="No failed scans in this period." />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="Latest activity" description="Sign-ups, scans and payments as they happen" flush>
            <ul className="divide-y divide-line border-t border-line">
              {(act?.items || []).slice(0, 10).map((i, n) => {
                const to = KIND_LINK[i.kind]?.(i)
                const body = (
                  <>
                    <Badge>{i.kind}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{i.title}{i.org_name ? <span className="text-fg-3"> · {i.org_name}</span> : null}</span>
                    <span className="shrink-0 text-xs text-fg-3">{ago(i.at)}</span>
                  </>
                )
                return <li key={n}>{to ? <Link to={to} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2/70">{body}</Link> : <div className="flex items-center gap-3 px-5 py-2.5">{body}</div>}</li>
              })}
              {act && (act.items || []).length === 0 && <li className="px-5 py-6 text-sm text-fg-3">Nothing yet.</li>}
            </ul>
          </Card>
          <Card title="Latest actions" description="Everything recorded in the audit log" actions={<CardLink to="/admin/audit">Full audit</CardLink>} flush>
            <ul className="divide-y divide-line border-t border-line">
              {o.recent_activity.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={`shrink-0 font-mono text-xs ${r.action.startsWith('admin.') ? 'text-staff' : 'text-fg'}`}>{r.action}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-fg-3">{r.actor_email || r.actor_type}</span>
                  <span className="shrink-0 text-xs text-fg-3">{ago(r.occurred_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
