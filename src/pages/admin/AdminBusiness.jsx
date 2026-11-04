import { useState } from 'react'
import { download, openFile } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { day, num, pct, usd } from '../../lib/format.js'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import { BarList } from '../../components/charts/Small.jsx'
import { Stat } from '../../components/admin/bits.jsx'

const month = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })

const FEATURES = { scans: 'Scans', reports: 'Reports', alerts: 'Alerts', api_keys: 'API keys', hunt: 'Hunt', watch: 'Watch', mev: 'MEV' }

const TOTALS = [
  ['users', 'Users'], ['organizations', 'Organizations'], ['projects', 'Projects'], ['scans', 'Scans'], ['findings', 'Findings'],
  ['reports', 'Reports'], ['alerts', 'Alerts raised'], ['api_keys', 'API keys'], ['hunt_clusters', 'Hunt clusters'], ['hunt_watchlist', 'Hunt watchlist'],
  ['watch_monitors', 'Watch monitors'], ['watch_violations', 'Watch violations'], ['mev_predictions', 'MEV predictions'], ['mev_detections', 'MEV mined attacks'],
]

// Cell shades a retention share so the cohort table reads as a heat map.
function Cell({ v }) {
  if (v == null) return <td className="px-2 py-1.5" />
  return (
    <td className="px-2 py-1.5 text-right text-xs tnum text-fg" style={{ background: `color-mix(in oklab, var(--color-series-1) ${Math.round(v * 70)}%, transparent)` }}>
      {pct(v)}
    </td>
  )
}

export default function AdminBusiness() {
  const { data: b, error } = useApi('/api/v1/admin/business')
  const [msg, setMsg] = useState(null)
  if (error) return <ErrorState>{error}</ErrorState>
  if (!b) return <PageSkeleton cards={8} />

  const stamp = new Date().toISOString().slice(0, 10)
  async function exportCSV() {
    setMsg(null)
    try {
      await download('/api/v1/admin/business/export?format=csv', `hawki-business-${stamp}.csv`)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }
  async function report() {
    setMsg(null)
    try {
      await openFile('/api/v1/admin/business/export?format=html')
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }
  const last = b.monthly[b.monthly.length - 1]
  const churn = b.monthly.filter((m) => m.paying || m.churned)
  const avgChurn = churn.length ? churn.reduce((a, m) => a + m.churn_rate, 0) / churn.length : 0
  return (
    <div className="grid gap-4">
      <PageHeader title="Business metrics" description="Subscriptions, revenue, churn, conversion, active users, retention and feature adoption. Exempt organizations are left out of revenue."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exportCSV}>Export CSV</Button>
            <Button variant="ghost" size="sm" onClick={report}>Print-ready report</Button>
          </div>
        } />
      {msg && <Alert>{msg}</Alert>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="MRR" value={usd(b.mrr_cents)} note={`ARR ${usd(b.arr_cents)}`} />
        <Stat label="Paying organizations" value={num(b.paying)} note={`${num(last.new_paying)} new this month`} />
        <Stat label="Monthly churn" value={pct(last.churn_rate, 1)} note={`${num(last.churned)} this month, ${pct(avgChurn, 1)} on average`} />
        <Stat label="Free to paid" value={pct(b.conversion.rate, 1)} note={`${num(b.conversion.ever_paid)} of ${num(b.conversion.organizations)}${b.conversion.avg_days_to_convert != null ? `, ${b.conversion.avg_days_to_convert.toFixed(1)} days on average` : ''}`} />
        <Stat label="Daily active users" value={num(b.active.dau)} note={`${pct(b.active.dau_mau)} of monthly`} />
        <Stat label="Weekly active" value={num(b.active.wau)} />
        <Stat label="Monthly active" value={num(b.active.mau)} />
        <Stat label="New users this month" value={num(last.signups)} note={`${num(last.new_organizations)} organizations`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Recurring revenue" description="MRR at the end of each month">
          <TimeChart kind="stacked" height={220} caption="MRR by month" format={(v) => usd(v)}
            data={b.monthly.map((m) => ({ label: month(m.month), mrr: m.mrr_cents }))} series={[{ key: 'mrr', label: 'MRR', color: 'var(--color-series-1)' }]} />
        </Card>
        <Card title="Paying organizations" description="New and churned in each month">
          <TimeChart kind="stacked" height={220} caption="New and churned paying organizations by month"
            data={b.monthly.map((m) => ({ label: month(m.month), new: m.new_paying, churned: m.churned }))}
            series={[{ key: 'new', label: 'New', color: 'var(--color-series-2)' }, { key: 'churned', label: 'Churned', color: 'var(--color-critical)' }]} />
        </Card>
        <Card title="Users" description="Sign-ups and distinct active users per month">
          <TimeChart height={220} caption="Sign-ups and active users by month"
            data={b.monthly.map((m) => ({ label: month(m.month), signups: m.signups, active: m.active_users }))}
            series={[{ key: 'signups', label: 'Sign-ups', color: 'var(--color-series-1)' }, { key: 'active', label: 'Active users', color: 'var(--color-series-2)' }]} />
        </Card>
        <Card title="Daily active users" description="Last 90 days">
          <TimeChart height={220} caption="Daily active users" area
            data={b.daily_active.map((d) => ({ label: day(d.date), users: d.count }))} series={[{ key: 'users', label: 'Active users', color: 'var(--color-series-1)' }]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card flush title="Subscriptions" description="Organizations by plan">
          <DataTable rows={b.subscriptions} rowKey={(s) => s.plan} dense columns={[
            { key: 'p', header: 'Plan', cell: (s) => <span className="text-fg">{PLAN_LABELS[s.plan] || s.plan}</span> },
            { key: 'o', header: 'Organizations', align: 'right', cell: (s) => num(s.organizations) },
            { key: 'n', header: 'Paying', align: 'right', cell: (s) => num(s.paying) },
            { key: 'm', header: 'MRR', align: 'right', cell: (s) => usd(s.mrr_cents) },
          ]} />
        </Card>
        <Card title="Feature adoption" description="Organizations using each feature in the last 30 days, as a share of those active">
          <BarList items={b.adoption.map((a) => ({ label: `${FEATURES[a.feature] || a.feature} (${num(a.organizations_30d)})`, value: a.share }))} format={(v) => pct(v)} />
        </Card>
      </div>

      <Card title="Retention" description="Share of each sign-up month's users active in the months after">
        {b.cohorts.length === 0 ? <p className="text-sm text-fg-3">No sign-ups in the last six months.</p> : (
          <div className="-mx-5 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-3">
                  <th className="px-2 py-2 pl-5 font-medium">Cohort</th><th className="px-2 py-2 text-right font-medium">Users</th>
                  {[0, 1, 2, 3, 4, 5].map((k) => <th key={k} className="px-2 py-2 text-right font-medium last:pr-5">Month {k}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {b.cohorts.map((c) => (
                  <tr key={c.month}>
                    <td className="px-2 py-1.5 pl-5 text-fg">{month(c.month)}</td>
                    <td className="px-2 py-1.5 text-right tnum text-fg-2">{num(c.users)}</td>
                    {[0, 1, 2, 3, 4, 5].map((k) => <Cell key={k} v={c.retention[k]} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card flush title="By month">
        <DataTable rows={[...b.monthly].reverse()} rowKey={(m) => m.month} dense columns={[
          { key: 'm', header: 'Month', cell: (m) => <span className="text-fg">{month(m.month)}</span> },
          { key: 'p', header: 'Paying', align: 'right', cell: (m) => num(m.paying) },
          { key: 'r', header: 'MRR', align: 'right', cell: (m) => usd(m.mrr_cents) },
          { key: 'c', header: 'Churn', align: 'right', hide: 'sm', cell: (m) => pct(m.churn_rate, 1) },
          { key: 'v', header: 'Conversions', align: 'right', hide: 'md', cell: (m) => num(m.conversions) },
          { key: 's', header: 'Sign-ups', align: 'right', hide: 'sm', cell: (m) => num(m.signups) },
          { key: 'a', header: 'Active', align: 'right', hide: 'md', cell: (m) => num(m.active_users) },
          { key: 'd', header: 'Received', align: 'right', hide: 'md', cell: (m) => usd(m.paid_cents) },
        ]} />
      </Card>

      <Card title="Platform totals">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:grid-cols-7">
          {TOTALS.map(([k, label]) => (
            <div key={k} className="min-w-0">
              <dt className="truncate text-xs text-fg-3">{label}</dt>
              <dd className="text-base font-semibold text-fg tnum">{num(b.totals[k])}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
