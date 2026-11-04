import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, BarChart3, Bell, Building2, CreditCard, DollarSign, HeartPulse, History, Power, ScanLine, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useApi } from '../../lib/useApi.js'
import { ago, change, day, num, pct, usd } from '../../lib/format.js'
import { formatCredits } from '../../lib/credits.js'
import PageHeader, { KpiStrip } from '../../components/dashboard/PageHeader.jsx'
import { ScoreRing, SummaryList } from '../../components/ui/Viz.jsx'
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
            <span className={`inline-flex items-center gap-1.5 text-xs ${status === 'ok' ? 'text-ok' : 'text-bad'}`}>
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

// IntelSummary is the Intel Engine at a glance; problems link to the
// operations view.
function IntelSummary({ i }) {
  const healthy = i.chains > 0 && i.chains_healthy === i.chains && i.dead_letters === 0
  const blocks = (n) => (n == null ? '-' : `${num(n)} blocks`)
  const figures = [
    ['Chains healthy', `${i.chains_healthy} / ${i.chains}`, i.chains_healthy < i.chains, i.chains_paused ? `${i.chains_paused} paused` : 'followed'],
    ['Endpoints up', `${i.endpoints_up} / ${i.endpoints}`, i.endpoints_up < i.endpoints, 'RPC'],
    ['Ingestion lag', blocks(i.ingest_lag), false, 'worst chain'],
    ['Indexer lag', blocks(i.indexer_lag), i.indexer_lag > 100, 'worst indexer'],
    ['Dead letters', num(i.dead_letters), i.dead_letters > 0, i.repairs_pending ? `${i.repairs_pending} repairs running` : 'open'],
    ['Contracts 24h', num(i.contracts_24h), false, 'deployed'],
    ['Risk events 24h', num(i.risk_events_24h), false, `${num(i.high_risk_24h)} high or critical`],
    ['Exploits recorded', num(i.exploits), false, `${num(i.protocols)} protocols`],
  ]
  return (
    <Card title="Intel Engine" description="Chain ingestion, indexing and what Intel found in the last day"
      actions={<><Badge tone={healthy ? 'good' : 'warning'} dot>{i.chains === 0 ? 'Not started' : healthy ? 'Healthy' : 'Needs attention'}</Badge><CardLink to="/admin/intel">Operations</CardLink></>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {figures.map(([label, value, bad, sub]) => (
          <div key={label} className="min-w-0">
            <div className="truncate text-xs text-fg-3">{label}</div>
            <div className={`mt-1 text-lg font-semibold tnum ${bad ? 'text-warn' : 'text-fg'}`}>{value}</div>
            <div className="truncate text-[0.7rem] text-fg-3">{sub}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Figures({ title, to, items }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">{title}</span>
        {to && <Link to={to} className="text-xs text-fg-3 hover:text-fg">Open</Link>}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {items.map(([label, value, sub, bad]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-[0.7rem] text-fg-3">{label}</dt>
            <dd className={`text-base font-semibold tnum ${bad ? 'text-warn' : 'text-fg'}`}>{value}</dd>
            {sub && <dd className="truncate text-[0.68rem] text-fg-3">{sub}</dd>}
          </div>
        ))}
      </dl>
    </div>
  )
}

// Engines is Hunt, Watch and MEV at a glance, with the findings scans
// produce.
function Engines({ e }) {
  const s = e.summary
  const unhealthy = (s.watch.monitors || 0) - (s.watch.by_health?.healthy || 0)
  return (
    <Card title="Engines" description="What scans, Hunt, Watch and MEV found">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Figures title="Findings" items={[
          ['Recorded', num(s.findings.total), `${num(s.findings.last_7d)} this week`],
          ['Last 24 hours', num(s.findings.last_24h)],
          ['Critical', num(s.findings.by_severity?.critical || 0), null, (s.findings.by_severity?.critical || 0) > 0],
          ['High', num(s.findings.by_severity?.high || 0)],
        ]} />
        <Figures title="Hunt" to="/admin/hunt" items={[
          ['Active clusters', num(s.hunt.clusters), `${num(s.hunt.formed_7d)} formed this week`],
          ['Formed 24h', num(s.hunt.formed_24h)],
          ['Genesis traces', num(s.hunt.traces), `${num(s.hunt.traces_24h)} in 24h`],
          ['Watchlist', num(s.hunt.watchlist), `${num(s.hunt.requests_7d)} requests this week`],
        ]} />
        <Figures title="Watch" to="/admin/watch" items={[
          ['Monitors', num(s.watch.monitors), `${num(s.watch.organizations)} organizations`],
          ['Not healthy', num(unhealthy), null, unhealthy > 0],
          ['Open violations', num(s.watch.open_violations), null, s.watch.open_violations > 0],
          ['Violations 24h', num(s.watch.violations_24h), `${num(s.watch.violations_7d)} this week`],
        ]} />
        <Figures title="MEV" to="/admin/mev" items={[
          ['Predictions 24h', num(s.mev.predictions_24h), `${num(s.mev.predictions_7d)} this week`],
          ['Pending now', num(s.mev.pending)],
          ['Mined attacks 24h', num(s.mev.detections_24h)],
          ['Confirmed this week', num(s.mev.confirmed_7d), `${num(s.mev.targets)} targets watched`],
        ]} />
      </div>
    </Card>
  )
}

const QUICK_ACTIONS = [
  { to: '/admin/users', label: 'Invite an admin or find a user', icon: UserPlus },
  { to: '/admin/health', label: 'System health', icon: HeartPulse },
  { to: '/admin/alerts', label: 'Platform alerts', icon: Bell },
  { to: '/admin/business', label: 'Business metrics', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit and export', icon: History },
  { to: '/admin/switches', label: 'Emergency switches', icon: Power },
]

function QuickActions() {
  return (
    <Card title="Quick actions">
      <ul className="grid gap-1">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
          <li key={to}><Link to={to} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-fg-2 transition hover:bg-surface-2 hover:text-fg"><Icon size={15} className="shrink-0 text-fg-3" />{label}</Link></li>
        ))}
      </ul>
    </Card>
  )
}

// PlatformPanel is the reference's top panel for the whole platform: the
// estate, the share of services up as a ring, users, organizations and
// the system's state at a glance.
function PlatformPanel({ o }) {
  const health = Object.values(o.health)
  const up = health.filter((x) => x === 'ok').length
  const ok = up === health.length
  const plans = Object.entries(o.organizations.by_plan || {}).sort((a, b) => b[1] - a[1]).slice(0, 4)
  return (
    <section className="app-card grid grid-cols-1 divide-y divide-line rounded-2xl border border-line md:grid-cols-2 md:divide-y-0 xl:grid-cols-[1.2fr_auto_1fr_1fr_1fr] xl:divide-x">
      <div className="grid content-start gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold text-fg">Hawk-i Cloud</span><Badge tone="staff">Platform</Badge></div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-fg-3">Users</dt><dd className="text-fg tnum">{num(o.users.total)}</dd>
          <dt className="text-fg-3">Organizations</dt><dd className="text-fg tnum">{num(o.organizations.total)}</dd>
          <dt className="text-fg-3">Projects</dt><dd className="text-fg tnum">{num(o.projects)}</dd>
          <dt className="text-fg-3">Reports</dt><dd className="text-fg tnum">{num(o.reports)}</dd>
        </dl>
      </div>
      <div className="grid place-items-center p-5">
        <ScoreRing value={health.length ? up : null} max={health.length || 1} label="Services up" sub={ok ? 'All up' : `${health.length - up} down`} />
      </div>
      <div className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg">Users</h3>
        <SummaryList items={[
          { label: 'Active, 7 days', value: num(o.users.active_7d), tone: 'good' },
          { label: 'New, 7 days', value: num(o.users.new_7d) },
          { label: 'Two-factor on', value: num(o.users.two_factor) },
          { label: 'Suspended', value: num(o.users.suspended), tone: o.users.suspended ? 'bad' : undefined },
        ]} />
      </div>
      <div className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg">Organizations by plan</h3>
        <SummaryList items={plans.map(([plan, n]) => ({ label: plan.charAt(0).toUpperCase() + plan.slice(1), value: num(n) }))
          .concat([{ label: 'Exempt', value: num(o.organizations.exempt) }])} />
      </div>
      <div className="grid content-start justify-items-center gap-2 p-5 text-center">
        <h3 className="justify-self-stretch text-left text-sm font-semibold text-fg">System status</h3>
        {ok ? <ShieldCheck size={36} className="text-good" /> : <AlertTriangle size={36} className="text-critical" />}
        <Badge tone={ok ? 'good' : 'danger'} dot>{ok ? 'All systems normal' : 'Degraded'}</Badge>
        <span className="text-xs text-fg-3">{num(o.scans.running)} scans running, {num(o.scans.queued)} queued</span>
        <Link to="/admin/health" className="text-xs text-accent hover:underline">System health</Link>
      </div>
    </section>
  )
}

export default function AdminOverview() {
  const [days, setDays] = useState(30)
  const { data: o, error } = useApi('/api/v1/admin/overview')
  const { data: a, stale } = useApi(`/api/v1/admin/analytics?days=${days}`)
  const { data: act } = useApi('/api/v1/admin/activity')
  const { data: eng } = useApi(`/api/v1/admin/engines?days=${days}`)
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
      <PageHeader title="Platform overview" icon={Activity} description="Growth, usage, revenue and health across every organization on Hawk-i Cloud."
        actions={<Segmented label="Time range" options={RANGES} value={days} onChange={setDays} />} />

      {o.switches_on.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/[0.07] px-4 py-3 text-sm text-warn">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">Emergency switches on: {o.switches_on.map((s) => s.key.replace(/_/g, ' ')).join(', ')}.</span>
          <Link to="/admin/switches" className="text-xs underline hover:text-fg">Manage</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <KpiStrip items={[
          { label: 'Users', value: num(o.users.total), note: `${num(o.users.new_24h)} new today` },
          { label: 'Organizations', value: num(o.organizations.total), note: `${num(o.revenue.paying_customers)} paying` },
          { label: 'MRR', value: usd(o.revenue.mrr_cents), note: `ARR ${usd(o.revenue.arr_cents)}` },
          { label: 'Scans, 24h', value: num(Object.values(o.scans.last_24h || {}).reduce((x, y) => x + y, 0)), note: `${num(o.scans.failed_24h)} failed`, tone: o.scans.failed_24h ? 'warn' : undefined },
          { label: 'Open alerts', value: num(o.alerts.open), note: `${num(o.alerts.failed_deliveries_24h)} deliveries failed`, tone: o.alerts.open ? 'warn' : undefined },
          { label: 'Switches on', value: num(o.switches_on.length), tone: o.switches_on.length ? 'bad' : 'good' },
        ]} />
        <PlatformPanel o={o} />
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
          <div className="grid gap-4">
            <Health o={o} />
            <QuickActions />
          </div>
        </div>

        {o.intel && <IntelSummary i={o.intel} />}

        {eng && <Engines e={eng} />}
        {eng && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card title="Findings and Hunt" description="Findings recorded and Hunt clusters formed, per day">
              <TimeChart data={eng.daily.map((d) => ({ label: day(d.date), findings: d.findings, clusters: d.clusters }))}
                series={[{ key: 'findings', label: 'Findings', color: 'var(--color-series-1)' }, { key: 'clusters', label: 'Clusters', color: 'var(--color-series-2)' }]}
                height={220} caption="Findings and Hunt clusters per day" />
            </Card>
            <Card title="Watch" description="Violations opened and monitors leaving healthy, per day">
              <TimeChart kind="stacked" data={eng.daily.map((d) => ({ label: day(d.date), violations: d.violations, health: d.health_changes }))}
                series={[{ key: 'violations', label: 'Violations', color: 'var(--color-critical)' }, { key: 'health', label: 'Health changes', color: 'var(--color-series-2)' }]}
                height={220} caption="Watch violations and health changes per day" />
            </Card>
            <Card title="MEV" description="Predictions made and attacks found in mined blocks, per day">
              <TimeChart data={eng.daily.map((d) => ({ label: day(d.date), predictions: d.predictions, detections: d.detections }))}
                series={[{ key: 'predictions', label: 'Predictions', color: 'var(--color-series-1)' }, { key: 'detections', label: 'Mined attacks', color: 'var(--color-series-3)' }]}
                height={220} caption="MEV predictions and mined attacks per day" />
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3" title="Most active organizations" description={`By scans in the last ${days} days`} actions={<CardLink to="/admin/customers" />} flush>
            <DataTable rows={a.top_orgs} stale={stale} rowHref={(r) => `/admin/customers/${r.id}`}
              empty={<EmptyState compact icon={Building2} title="No scans in this period" />}
              columns={[
                { key: 'name', header: 'Organization', cell: (r) => <Link to={`/admin/customers/${r.id}`} className="font-medium text-fg hover:underline">{r.name}</Link> },
                { key: 'scans', header: 'Scans', align: 'right', cell: (r) => num(r.scans) },
                { key: 'failed', header: 'Failed', align: 'right', cell: (r) => <span className={r.failed ? 'text-bad' : 'text-fg-3'}>{num(r.failed)}</span> },
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
