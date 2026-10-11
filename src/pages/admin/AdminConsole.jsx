import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { formatCredits } from '../../lib/credits.js'
import { PLAN_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { formatDate } from '../dashboard/roles.js'

const PLAN_OPTIONS = Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }))

// OrgBilling lets staff move an organization to a plan without payment
// (manual and enterprise contracts) and add or remove credits with a reason.
// Both actions land in the organization's audit log.
function OrgBilling({ org, onChanged }) {
  const [plan, setPlan] = useState(org.plan)
  const [credits, setCredits] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  async function act(kind, path, method, body, message) {
    setBusy(kind)
    setError(null)
    setDone(null)
    try {
      await api(path, { method, body })
      setDone(message)
      onChanged()
      if (kind === 'credits') {
        setCredits('')
        setReason('')
      }
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(null)
  }

  const amount = Number.parseInt(credits, 10)
  return (
    <div className="grid gap-4 pt-4">
      {error && <Alert>{error}</Alert>}
      {done && <Alert tone="info">{done}</Alert>}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
        <SelectField id={`plan-${org.org_id}`} label="Plan" options={PLAN_OPTIONS} value={plan} onChange={(e) => setPlan(e.target.value)}
          hint="Starts a new period now and grants the plan's credits." />
        <Button busy={busy === 'plan'} disabled={plan === org.plan}
          onClick={() => act('plan', `/api/v1/admin/orgs/${org.org_id}/plan`, 'PUT', { plan }, `Moved to ${PLAN_LABELS[plan]}.`)}>
          Set plan
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] items-end">
        <Field id={`credits-${org.org_id}`} label="Credits" inputMode="numeric" placeholder="100 or -50" value={credits}
          onChange={(e) => setCredits(e.target.value)} />
        <Field id={`reason-${org.org_id}`} label="Reason" placeholder="Shown in their credit history" value={reason}
          onChange={(e) => setReason(e.target.value)} />
        <Button variant="ghost" busy={busy === 'credits'} disabled={!amount || reason.trim().length < 3}
          onClick={() => act('credits', `/api/v1/admin/orgs/${org.org_id}/credits`, 'POST', { credits: amount, reason: reason.trim() },
            `${amount > 0 ? 'Added' : 'Removed'} ${formatCredits(Math.abs(amount) * 1000)} credits.`)}>
          Adjust credits
        </Button>
      </div>
    </div>
  )
}

function Organizations() {
  const [query, setQuery] = useState('')
  const [orgs, setOrgs] = useState(null)
  const [open, setOpen] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async (q) => {
    try {
      const d = await api(`/api/v1/admin/orgs?q=${encodeURIComponent(q)}`)
      setOrgs(d.organizations)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(query), 250)
    return () => clearTimeout(t)
  }, [query, load])

  return (
    <Panel title="Organizations">
      <Field id="org-search" label="Search" placeholder="Name or slug" value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {!orgs ? <Spinner /> : orgs.length === 0 ? (
        <p className="mt-4 text-sm text-grey">No organizations match.</p>
      ) : (
        <ul className="mt-4 divide-y divide-panel-border">
          {orgs.map((o) => (
            <li key={o.org_id} className="py-3">
              <button type="button" onClick={() => setOpen(open === o.org_id ? null : o.org_id)} aria-expanded={open === o.org_id}
                className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 text-left">
                <span className="flex-1 min-w-40 text-white">{o.name} <span className="text-grey font-mono text-xs">{o.slug}</span></span>
                <span className="text-sm text-[#cfcfcf]">{PLAN_LABELS[o.plan] || o.plan}</span>
                <span className="text-sm text-grey font-mono">{formatCredits(o.remaining_mc)} credits</span>
                <span className="text-xs text-grey">period ends {formatDate(o.period_end)}</span>
              </button>
              {open === o.org_id && <OrgBilling org={o} onChanged={() => load(query)} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// The platform admin dashboard. Only Hawk-i staff reach it; more management
// screens are added here as their APIs ship.
export default function AdminConsole() {
  const { user } = useAuth()
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Admin console" description="Platform administration for Hawk-i staff." />
      <Panel title="Your access">
        <p className="text-sm text-grey">
          Signed in as <span className="text-white">{user.email}</span> with the platform admin role. You can open any
          organization with admin rights, and every action is recorded in that organization&apos;s audit log.
        </p>
      </Panel>
      <Organizations />
      <Panel title="Coming next">
        <ul className="grid gap-1.5 text-sm text-grey list-disc pl-5">
          <li>Users: search and suspend</li>
          <li>System health for every engine and data store</li>
          <li>Platform metrics: signups, scans, revenue</li>
        </ul>
      </Panel>
    </div>
  )
}
