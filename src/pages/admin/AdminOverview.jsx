import { Link } from 'react-router-dom'
import Alert from '../../components/common/Alert.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, Stat, money, useAdmin, when } from '../../components/admin/bits.jsx'
import { formatCredits } from '../../lib/credits.js'

const KIND_LINK = { scan: (i) => `/dashboard/scans/${i.ref_id}`, signup: (i) => `/admin/users/${i.ref_id}`, payment: () => '/admin/payments' }

// AdminOverview is the owner's view of the whole platform.
export default function AdminOverview() {
  const { data: o, error } = useAdmin('/api/v1/admin/overview')
  const { data: act } = useAdmin('/api/v1/admin/activity')
  if (error) return <div className="max-w-6xl"><Alert>{error}</Alert></div>
  if (!o) return <Spinner />
  const healthy = Object.values(o.health).every((s) => s === 'ok')
  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Platform overview" description="Everyone and everything on Hawk-i Cloud, live from the database." />
      {o.switches_on.length > 0 && (
        <Alert>
          Emergency switches on: {o.switches_on.map((s) => s.key.replace(/_/g, ' ')).join(', ')}.{' '}
          <Link to="/admin/switches" className="underline hover:text-white">Manage switches</Link>
        </Alert>
      )}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Users" value={o.users.total} note={`${o.users.new_24h} new today, ${o.users.new_7d} this week`} />
        <Stat label="Active this week" value={o.users.active_7d} note={`${o.users.two_factor} with two-factor`} />
        <Stat label="Organizations" value={o.organizations.total} note={`${o.organizations.exempt} exempt, ${o.organizations.suspended} suspended`} />
        <Stat label="Projects" value={o.projects} note={`${o.reports} reports`} />
        <Stat label="MRR" value={money(o.revenue.mrr_cents)} note={`ARR ${money(o.revenue.arr_cents)}`} />
        <Stat label="Paid, 30 days" value={money(o.revenue.paid_30d_cents)} note={`${o.revenue.paying_customers} paying customers`} />
        <Stat label="Credits spent, 30 days" value={formatCredits(o.revenue.credits_spent_30d_mc)} note={`${formatCredits(o.revenue.credits_granted_30d_mc)} granted`} />
        <Stat label="Suspended users" value={o.users.suspended} tone={o.users.suspended ? 'bad' : undefined} note={`${o.users.admins} platform admins`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Scans">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="All time" value={o.scans.total} />
            <Stat label="Running now" value={o.scans.running} note={`${o.scans.queued} queued`} />
            <Stat label="Last 24 hours" value={Object.values(o.scans.last_24h).reduce((a, b) => a + b, 0)} />
            <Stat label="Failed, 24 hours" value={o.scans.failed_24h} tone={o.scans.failed_24h ? 'bad' : undefined} />
          </div>
        </Panel>
        <Panel title="Alerts">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Open" value={o.alerts.open} />
            <Stat label="Waiting to send" value={o.alerts.pending_deliveries} />
            <Stat label="Failed sends, 24h" value={o.alerts.failed_deliveries_24h} tone={o.alerts.failed_deliveries_24h ? 'bad' : undefined} />
          </div>
        </Panel>
        <Panel title="System health">
          <ul className="grid gap-2 text-sm">
            {Object.entries(o.health).map(([name, status]) => (
              <li key={name} className="flex justify-between gap-3">
                <span className="text-[#cfcfcf]">{name.replace(/_/g, ' ')}</span>
                <Badge tone={status === 'ok' ? 'good' : 'bad'}>{status}</Badge>
              </li>
            ))}
          </ul>
          {!healthy && <p className="mt-3 text-xs text-copper">A dependency is failing; scans and sign-ins may be affected.</p>}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Latest activity">
          {!act ? <Spinner /> : (
            <ul className="divide-y divide-panel-border text-sm">
              {act.items.slice(0, 15).map((i) => (
                <li key={i.kind + i.ref_id} className="py-2 flex items-center gap-3">
                  <Badge>{i.kind}</Badge>
                  <Link to={KIND_LINK[i.kind](i)} className="flex-1 min-w-0 truncate text-[#cfcfcf] hover:text-white">
                    {i.title}{i.org_name ? <span className="text-grey"> · {i.org_name}</span> : null}
                  </Link>
                  <span className="text-xs text-grey whitespace-nowrap">{when(i.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Latest actions">
          <ul className="divide-y divide-panel-border text-sm">
            {o.recent_activity.map((a) => (
              <li key={a.id} className="py-2 flex items-center gap-3">
                <span className="font-mono text-xs text-white truncate">{a.action}</span>
                <span className="flex-1 min-w-0 truncate text-grey">{a.actor_email || a.actor_type}{a.org_name ? ` · ${a.org_name}` : ''}</span>
                <span className="text-xs text-grey whitespace-nowrap">{when(a.occurred_at)}</span>
              </li>
            ))}
          </ul>
          <Link to="/admin/audit" className="mt-3 inline-block text-sm text-steel hover:text-steel-light">Full platform audit</Link>
        </Panel>
      </div>
    </div>
  )
}
