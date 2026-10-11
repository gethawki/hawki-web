import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { creditsLabel, formatCredits, formatPrice } from '../../lib/credits.js'
import { SCAN_TYPES } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
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

function Figure({ label, value, note }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel/60 px-5 py-4 min-w-0">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey">{label}</div>
      <div className="mt-1.5 text-lg text-white truncate">{value}</div>
      {note && <div className="mt-0.5 text-xs text-grey">{note}</div>}
    </div>
  )
}

function SpendBar({ spent, cap }) {
  if (cap == null) return <p className="text-sm text-grey">{creditsLabel(spent)} used this period. Your plan has no monthly limit.</p>
  if (cap === 0) return <p className="text-sm text-grey">Your plan does not include cloud credits. The open-source scanner stays free on your own machine.</p>
  const pct = Math.min(100, Math.round((spent / cap) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-[#cfcfcf]">{creditsLabel(spent)} used this period</span>
        <span className="text-grey">limit {formatCredits(cap)}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-ink-soft overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Monthly credit limit used">
        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-copper' : 'bg-steel'}`} style={{ width: `${pct}%` }} />
      </div>
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

  if (error) return <Alert>{error}</Alert>
  if (!entries) return <Spinner />
  if (entries.length === 0) return <p className="text-sm text-grey">No credit activity yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[0.65rem] uppercase tracking-wider text-grey">
            <th className="pb-3 pr-4 font-normal">When</th>
            <th className="pb-3 pr-4 font-normal">Type</th>
            <th className="pb-3 pr-4 font-normal">Details</th>
            <th className="pb-3 font-normal text-right">Credits</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-panel-border">
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="py-2.5 pr-4 text-grey whitespace-nowrap">{formatDateTime(e.occurred_at)}</td>
              <td className="py-2.5 pr-4 text-[#cfcfcf] whitespace-nowrap">{LEDGER_LABELS[e.kind] || e.kind}</td>
              <td className="py-2.5 pr-4 text-grey min-w-48">{e.reason}</td>
              <td className={`py-2.5 text-right font-mono whitespace-nowrap ${e.amount_mc >= 0 ? 'text-steel-light' : 'text-[#cfcfcf]'}`}>
                {e.amount_mc >= 0 ? '+' : '-'}{formatCredits(Math.abs(e.amount_mc))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {more && (
        <div className="mt-4">
          <Button variant="ghost" onClick={() => load(entries[entries.length - 1].id)}>Load more</Button>
        </div>
      )}
    </div>
  )
}

function Plans({ catalog, current, paymentsEnabled }) {
  const limit = (v) => (v == null ? 'Unlimited' : v.toLocaleString())
  return (
    <Panel title="Plans">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.65rem] uppercase tracking-wider text-grey">
              <th className="pb-3 pr-4 font-normal">Plan</th>
              <th className="pb-3 pr-4 font-normal">Price</th>
              <th className="pb-3 pr-4 font-normal">Credits a month</th>
              <th className="pb-3 pr-4 font-normal">Monthly limit</th>
              <th className="pb-3 pr-4 font-normal">Members</th>
              <th className="pb-3 font-normal">Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {catalog.plans.map((p) => (
              <tr key={p.slug} className={p.slug === current ? 'text-white' : 'text-[#cfcfcf]'}>
                <td className="py-2.5 pr-4 whitespace-nowrap">
                  {p.name}
                  {p.slug === current && <span className="ml-2 rounded-full border border-steel/60 px-2 py-0.5 text-[0.65rem] text-steel-light">Current</span>}
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap">
                  {p.slug === 'enterprise' ? `From ${formatPrice(p.price_monthly_cents)}` : p.price_monthly_cents ? formatPrice(p.price_monthly_cents) : 'Free'}
                  {p.price_monthly_cents > 0 && <span className="text-grey"> / month</span>}
                </td>
                <td className="py-2.5 pr-4">{p.monthly_credits.toLocaleString()}</td>
                <td className="py-2.5 pr-4">{limit(p.max_monthly_credits)}</td>
                <td className="py-2.5 pr-4">{limit(p.max_users)}</td>
                <td className="py-2.5">{limit(p.max_projects)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-grey">
        <p>
          Scans cost {SCAN_TYPES.map((t) => `${t.label.toLowerCase()} ${formatCredits(catalog.scan_costs_mc[t.value])}`).join(', ')} credits.
          Plan credits reset each period; purchased credits last 12 months. Plan credits are used first. A scan that fails is refunded automatically.
        </p>
        <p>
          Extra credits on paid plans:{' '}
          {catalog.packs.map((pk) => `${pk.credits.toLocaleString()} for ${formatPrice(pk.price_cents)}`).join(', ')}.
        </p>
        {!paymentsEnabled && (
          <p className="text-[#cfcfcf]">Online checkout is not open yet. To change plan or buy credits, contact the Hawk-i team.</p>
        )}
      </div>
    </Panel>
  )
}

export default function Billing() {
  const { currentOrg } = useAuth()
  const [summary, setSummary] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api(`/api/v1/orgs/${currentOrg.id}/billing`), api('/api/v1/plans', { auth: false })])
      .then(([s, c]) => {
        setSummary(s)
        setCatalog(c)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [currentOrg.id])

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!summary || !catalog) return <Spinner />
  const purchasedLots = summary.lots.filter((l) => l.kind !== 'monthly')
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Billing" description="Your plan, credit balance and every credit your organization has received or spent." />
      {summary.status !== 'active' && (
        <Alert>Your subscription is {summary.status.replace('_', ' ')}. Cloud scans are paused until it is settled.</Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Figure label="Plan" value={summary.plan.name}
          note={summary.cancel_at_period_end ? `Ends ${formatDate(summary.period_end)}` : `Renews ${formatDate(summary.period_end)}`} />
        <Figure label="Credits available" value={formatCredits(summary.total_remaining_mc)} />
        <Figure label="Plan credits" value={formatCredits(summary.monthly_remaining_mc)}
          note={`Of ${summary.plan.monthly_credits.toLocaleString()}, reset ${formatDate(summary.period_end)}`} />
      </div>
      <Panel title="This period">
        <SpendBar spent={summary.period_spent_mc} cap={summary.period_cap_mc} />
        {purchasedLots.length > 0 && (
          <div className="mt-5">
            <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey mb-2">Purchased and added credits</div>
            <ul className="divide-y divide-panel-border text-sm">
              {purchasedLots.map((l) => (
                <li key={l.id} className="py-2 flex justify-between gap-4">
                  <span className="text-[#cfcfcf]">{formatCredits(l.remaining_mc)} of {formatCredits(l.granted_mc)} left</span>
                  <span className="text-grey">expires {formatDate(l.expires_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <Plans catalog={catalog} current={summary.plan.slug} paymentsEnabled={summary.payments_enabled} />
      <Panel title="Credit history">
        <Ledger orgId={currentOrg.id} />
      </Panel>
    </div>
  )
}
