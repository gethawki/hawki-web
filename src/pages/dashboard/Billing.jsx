import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useRefresh } from '../../lib/live.jsx'
import { creditsLabel, formatCredits, formatPrice } from '../../lib/credits.js'
import { SCAN_TYPES } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { BadgeCheck, Coins, CreditCard, RefreshCw } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import { Meter } from '../../components/charts/Small.jsx'
import { useApi } from '../../lib/useApi.js'
import { day } from '../../lib/format.js'
import { formatDate, formatDateTime } from './roles.js'

const PAGE = 50

const LEDGER_LABELS = {
  grant: 'Plan credits',
  purchase: 'Purchase',
  charge: 'Charge',
  refund: 'Refund',
  expire: 'Expired',
  adjust: 'Adjustment',
}

function SpendBar({ spent, cap }) {
  if (cap == null) return <p className="text-sm text-fg-2">{creditsLabel(spent)} used this period. Your plan has no monthly limit.</p>
  if (cap === 0) return <p className="text-sm text-fg-2">Your plan does not include cloud credits. The open-source scanner stays free on your own machine.</p>
  const pct = Math.min(100, Math.round((spent / cap) * 100))
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-fg">{creditsLabel(spent)} used this period</span>
        <span className="text-fg-3 tnum">{pct}% of the {formatCredits(cap)} limit</span>
      </div>
      <Meter value={spent} max={cap} label="Monthly credit limit used" />
    </div>
  )
}

function Usage({ label, used, max, exempt }) {
  const limited = max != null && !exempt
  const full = limited && used >= max
  return (
    <div className="grid gap-2 rounded-lg border border-line px-4 py-3 text-sm">
      <div className="flex justify-between gap-4">
        <span className="text-fg-2">{label}</span>
        <span className={`tnum ${full ? 'text-[#ff8b8b]' : 'text-fg'}`}>
          {used} of {limited ? max : 'unlimited'}{full ? ', plan limit reached' : ''}
        </span>
      </div>
      {limited && <Meter value={used} max={max} label={`${label} used`} />}
    </div>
  )
}

function Ledger({ orgId }) {
  const [entries, setEntries] = useState(null)
  const [more, setMore] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(
    async (before = 0) => {
      try {
        const page = await api(`/api/v1/orgs/${orgId}/billing/ledger?limit=${PAGE}${before ? `&before=${before}` : ''}`)
        setEntries((prev) => (before ? [...(prev || []), ...page.entries] : page.entries))
        setMore(page.entries.length === PAGE)
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [orgId],
  )
  useEffect(() => {
    load()
  }, [load])

  if (error) return <div className="p-5"><Alert>{error}</Alert></div>
  if (!entries) return <Spinner />
  if (entries.length === 0) return <EmptyState compact title="No credit activity yet" />
  return (
    <div>
      <DataTable rows={entries} rowKey={(e) => e.id} dense columns={[
        { key: 'when', header: 'When', cell: (e) => <span className="whitespace-nowrap text-fg-3">{formatDateTime(e.occurred_at)}</span> },
        { key: 'kind', header: 'Type', cell: (e) => <Badge tone={e.kind === 'charge' ? 'neutral' : e.kind === 'refund' || e.kind === 'grant' || e.kind === 'purchase' ? 'good' : 'accent'}>{LEDGER_LABELS[e.kind] || e.kind}</Badge> },
        { key: 'reason', header: 'Details', hide: 'sm', cell: (e) => <span className="text-fg-2">{e.reason}</span> },
        { key: 'amount', header: 'Credits', align: 'right', cell: (e) => <span className={e.amount_mc > 0 ? 'text-[#5fd35f]' : 'text-fg'}>{e.amount_mc >= 0 ? '+' : '-'}{formatCredits(Math.abs(e.amount_mc))}</span> },
      ]} />
      {more && (
        <div className="border-t border-line px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => load(entries[entries.length - 1].id)}>Load more</Button>
        </div>
      )}
    </div>
  )
}

function Plans({ catalog, current, paymentsEnabled }) {
  const limit = (v) => (v == null ? 'Unlimited' : v.toLocaleString())
  return (
    <Card title="Plans" description="Credits pay for cloud scans; the open-source scanner is always free." flush>
      <DataTable rows={catalog.plans} rowKey={(p) => p.slug} columns={[
        { key: 'name', header: 'Plan', cell: (p) => <span className="whitespace-nowrap font-medium text-fg">{p.name}{p.slug === current && <Badge tone="accent" className="ml-2">Current</Badge>}</span> },
        { key: 'price', header: 'Price', cell: (p) => <span className="whitespace-nowrap text-fg-2">{p.slug === 'enterprise' ? `From ${formatPrice(p.price_monthly_cents)}` : p.price_monthly_cents ? formatPrice(p.price_monthly_cents) : 'Free'}{p.price_monthly_cents > 0 && <span className="text-fg-3"> / month</span>}</span> },
        { key: 'credits', header: 'Credits a month', align: 'right', cell: (p) => p.monthly_credits.toLocaleString() },
        { key: 'cap', header: 'Monthly limit', align: 'right', hide: 'md', cell: (p) => limit(p.max_monthly_credits) },
        { key: 'users', header: 'Members', align: 'right', hide: 'sm', cell: (p) => limit(p.max_users) },
        { key: 'projects', header: 'Projects', align: 'right', hide: 'sm', cell: (p) => limit(p.max_projects) },
      ]} />
      <div className="grid gap-2 border-t border-line px-5 py-4 text-xs text-fg-3">
        <p>
          Scans cost {SCAN_TYPES.map((t) => `${t.label.toLowerCase()} ${formatCredits(catalog.scan_costs_mc[t.value])}`).join(', ')} credits.
          Plan credits reset each period; purchased credits last 12 months. Plan credits are used first. A scan that fails is refunded automatically.
        </p>
        <p>
          Extra credits on paid plans:{' '}
          {catalog.packs.map((pk) => `${pk.credits.toLocaleString()} for ${formatPrice(pk.price_cents)}`).join(', ')}.
        </p>
        {!paymentsEnabled && (
          <p className="text-fg-2">Online checkout is not open yet. To change plan or buy credits, contact the Hawk-i team.</p>
        )}
      </div>
    </Card>
  )
}

export default function Billing() {
  const { currentOrg, can } = useAuth()
  const { data: usage } = useApi(can('findings:read') ? `/api/v1/orgs/${currentOrg.id}/analytics?days=30` : null)
  const [summary, setSummary] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState(null)

  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  useRefresh(['billing.updated'], reload)

  useEffect(() => {
    Promise.all([api(`/api/v1/orgs/${currentOrg.id}/billing`), api('/api/v1/plans', { auth: false })])
      .then(([s, c]) => {
        setSummary(s)
        setCatalog(c)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [currentOrg.id, version])

  if (error) return <ErrorState>{error}</ErrorState>
  if (!summary || !catalog) return <PageSkeleton cards={3} />
  const purchasedLots = summary.lots.filter((l) => l.kind !== 'monthly')
  const exempt = summary.exempt
  return (
    <div>
      <PageHeader title="Billing" description="Your plan, credit balance and every credit your organization has received or spent." />
      <div className="grid gap-4">
        {exempt && (
          <div className="flex items-start gap-3 rounded-xl border border-good/30 bg-good/[0.06] px-4 py-3 text-sm text-[#bfe8bf]">
            <BadgeCheck size={18} className="mt-0.5 shrink-0" />
            <span>This organization is exempt from billing. Scans are never charged and plan limits on credits, members and projects do not apply.</span>
          </div>
        )}
        {!exempt && summary.status !== 'active' && (
          <Alert>Your subscription is {summary.status.replace('_', ' ')}. Cloud scans are paused until it is settled.</Alert>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Plan" icon={CreditCard} value={summary.plan.name}
            sub={exempt ? 'Exempt from billing' : summary.cancel_at_period_end ? `Ends ${formatDate(summary.period_end)}` : `Renews ${formatDate(summary.period_end)}`} />
          <StatCard label="Credits available" icon={Coins} value={exempt ? 'Unlimited' : formatCredits(summary.total_remaining_mc)}
            sub={exempt ? 'Scans are free' : `${formatCredits(summary.purchased_remaining_mc)} bought or added`} />
          <StatCard label="Plan credits left" icon={RefreshCw} value={exempt ? '-' : formatCredits(summary.monthly_remaining_mc)}
            sub={exempt ? 'Not used while exempt' : `Of ${summary.plan.monthly_credits.toLocaleString()}, resets ${formatDate(summary.period_end)}`} />
        </div>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" title="Credit usage" description="Credits spent per day over the last 30 days">
            {usage ? <TimeChart kind="stacked" data={usage.daily.map((d) => ({ label: day(d.date), credits: d.credits_mc / 1000 }))}
              series={[{ key: 'credits', label: 'Credits', color: 'var(--color-series-1)' }]} height={200} caption="Credits spent per day" /> : <div className="h-[200px]" />}
          </Card>
          <Card title="This period">
            {exempt ? <p className="text-sm text-fg-2">{creditsLabel(summary.period_spent_mc)} charged this period. No limit applies.</p>
              : <SpendBar spent={summary.period_spent_mc} cap={summary.period_cap_mc} />}
            <div className="mt-4 grid gap-3">
              <Usage label="Members" used={summary.members} max={summary.plan.max_users} exempt={exempt} />
              <Usage label="Projects" used={summary.projects} max={summary.plan.max_projects} exempt={exempt} />
            </div>
            {purchasedLots.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-xs font-medium text-fg-3">Purchased and added credits</div>
                <ul className="divide-y divide-line text-sm">
                  {purchasedLots.map((l) => (
                    <li key={l.id} className="flex justify-between gap-4 py-2">
                      <span className="text-fg-2">{formatCredits(l.remaining_mc)} of {formatCredits(l.granted_mc)} left</span>
                      <span className="text-fg-3">expires {formatDate(l.expires_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
        <Plans catalog={catalog} current={summary.plan.slug} paymentsEnabled={summary.payments_enabled} />
        <Card title="Credit history" flush>
          <Ledger key={version} orgId={currentOrg.id} />
        </Card>
      </div>
    </div>
  )
}
