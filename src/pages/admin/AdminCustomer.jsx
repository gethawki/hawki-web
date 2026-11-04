import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { formatCredits } from '../../lib/credits.js'
import { PLAN_LABELS, ROLE_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ButtonTabs } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, ReasonForm, Stat, day, money, useAdmin, when } from '../../components/admin/bits.jsx'
import PaymentForm, { STATUSES } from '../../components/admin/PaymentForm.jsx'
import { ConfirmDelete, EngineUsage } from '../../components/admin/platformBits.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const PLAN_OPTIONS = Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }))

function PlanAndCredits({ c, billing, act }) {
  const [plan, setPlan] = useState(c.plan)
  const [credits, setCredits] = useState('')
  const [reason, setReason] = useState('')
  const amount = Number.parseInt(credits, 10)
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-end">
        <SelectField id="cust-plan-set" label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} options={PLAN_OPTIONS}
          hint="Starts a new period now and grants the plan's credits. For manual and enterprise billing." />
        <Button disabled={plan === c.plan} onClick={() => act(`/api/v1/admin/orgs/${c.org_id}/plan`, 'PUT', { plan }, `Moved to ${PLAN_LABELS[plan]}.`)}>Set plan</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr_auto] items-end">
        <Field id="cust-credits" label="Credits" inputMode="numeric" placeholder="100 or -50" value={credits} onChange={(e) => setCredits(e.target.value)} />
        <Field id="cust-credits-reason" label="Reason" placeholder="Shown in their credit history" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="ghost" disabled={!amount || reason.trim().length < 3}
          onClick={async () => {
            await act(`/api/v1/admin/orgs/${c.org_id}/credits`, 'POST', { credits: amount, reason: reason.trim() }, `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} credits.`)
            setCredits('')
            setReason('')
          }}>Adjust credits</Button>
      </div>
      <p className="text-xs text-fg-3">
        Period ends {when(billing.period_end)}. {formatCredits(billing.total_remaining_mc)} credits left
        ({formatCredits(billing.monthly_remaining_mc)} plan, {formatCredits(billing.purchased_remaining_mc)} bought or added),
        {' '}{formatCredits(billing.period_spent_mc)} used this period{billing.period_cap_mc != null ? ` of ${formatCredits(billing.period_cap_mc)}` : ', no limit'}.
      </p>
    </div>
  )
}

const DELETE_ERRORS = {
  org_has_payments: 'This organization has payments on record, so it is kept for the revenue records. Suspend it instead.',
  owner_protected: "The platform owner's organizations cannot be deleted.",
}

function Usage({ orgId }) {
  const u = useAdmin(`/api/v1/admin/customers/${orgId}/usage`)
  if (u.error) return <Alert>{u.error}</Alert>
  if (!u.data) return <Spinner />
  return <EngineUsage u={u.data} />
}

function Tags({ c, act }) {
  const [text, setText] = useState(c.tags.join(', '))
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-end">
      <Field id="cust-tags" label="Tags" placeholder="lead, defi, partner" value={text} onChange={(e) => setText(e.target.value)} />
      <Button variant="ghost" onClick={() => act(`/api/v1/admin/customers/${c.org_id}/tags`, 'PUT', { tags: text.split(',') }, 'Tags saved.')}>Save tags</Button>
    </div>
  )
}

export default function AdminCustomer() {
  const { orgId } = useParams()
  const { data, error, reload } = useAdmin(`/api/v1/admin/customers/${orgId}`)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [msg, setMsg] = useState(null)
  const [note, setNote] = useState('')

  async function act(path, method, body, done) {
    setMsg(null)
    try {
      await api(path, { method, body })
      setMsg({ tone: 'info', text: done })
      await reload()
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }

  if (error) return <ErrorState>{error}</ErrorState>
  if (!data) return <PageSkeleton />
  const { customer: c, billing } = data
  const base = `/api/v1/admin/customers/${c.org_id}`
  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'engines', label: 'Engines' },
    { value: 'payments', label: 'Payments', count: data.payments.length },
    { value: 'notes', label: 'Notes', count: data.notes.length },
    { value: 'members', label: 'Members', count: data.members.length },
    { value: 'credits', label: 'Credit history' },
    { value: 'audit', label: 'Audit' },
  ]
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview'
  return (
    <div>
      <PageHeader back={{ to: '/admin/customers', label: 'Customers' }} title={c.name}
        meta={
          <>
            <Badge tone={c.status === 'active' ? 'good' : 'bad'}>{c.status === 'active' ? 'Active' : 'Suspended'}</Badge>
            <Badge>{PLAN_LABELS[c.plan] || c.plan}</Badge>
            {c.exempt && <Badge tone="good">Exempt from billing</Badge>}
            <span>{c.slug}</span>
            <span>Owner {c.owner_email || 'none'}</span>
            <span>Customer since {day(c.created_at)}</span>
          </>
        }>
        <ButtonTabs tabs={tabs} value={tab} onChange={(v) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })} />
      </PageHeader>
      <div className="grid gap-4">
        {c.status !== 'active' && <Alert>Suspended: {c.status_reason}</Alert>}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="MRR" value={money(c.mrr_cents)} note={c.exempt ? 'Exempt from billing' : billing.status} />
              <Stat label="Paid in total" value={money(c.paid_cents)} note={`${data.payments.length} payments`} />
              <Stat label="Credits left" value={c.exempt ? 'Unlimited' : formatCredits(c.credits_mc)} />
              <Stat label="Usage" value={`${c.members} members`} note={`${c.projects} projects, last scan ${c.last_scan_at ? when(c.last_scan_at) : 'never'}`} />
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Plan and credits"><PlanAndCredits key={c.plan} c={c} billing={billing} act={act} /></Panel>
              <Panel title="Account controls" description="Every change is recorded in the platform audit.">
                <div className="grid gap-5">
                  <div>
                    <div className="mb-1 text-sm font-medium text-fg">Payment exemption</div>
                    <p className="mb-2 text-xs text-fg-3">{c.exempt ? 'Never charged and never limited.' : 'Charged and limited by its plan.'}</p>
                    {c.exempt
                      ? <Button variant="ghost" size="sm" onClick={() => act(`${base}/exempt`, 'PUT', { exempt: false }, 'Exemption removed.')}>Remove exemption</Button>
                      : <ReasonForm label="Exempt from billing" placeholder="Why (partner, staff, comp)" onSubmit={(reason) => act(`${base}/exempt`, 'PUT', { exempt: true, reason }, 'Exempt from billing.')} />}
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium text-fg">Suspension</div>
                    <p className="mb-2 text-xs text-fg-3">Shuts out every member and API key of this organization.</p>
                    {c.status === 'active'
                      ? <ReasonForm label="Suspend organization" danger onSubmit={(reason) => act(`${base}/status`, 'PUT', { status: 'suspended', reason }, 'Organization suspended.')} />
                      : <Button size="sm" onClick={() => act(`${base}/status`, 'PUT', { status: 'active' }, 'Organization restored.')}>Restore organization</Button>}
                  </div>
                  <Tags key={c.tags.join()} c={c} act={act} />
                </div>
              </Panel>
              <Panel title="Delete organization" description="Removes it with its projects, scans, monitors and members' access. Kept if it ever paid. This cannot be undone.">
                <ConfirmDelete what="organization" confirmText={c.slug} idPrefix="del-org" onSubmit={async (confirm, reason) => {
                  setMsg(null)
                  try {
                    await api(`${base}/delete`, { method: 'POST', body: { confirm, reason } })
                    navigate('/admin/customers', { replace: true })
                  } catch (err) {
                    setMsg({ tone: 'error', text: DELETE_ERRORS[err.code] || errorMessage(err) })
                  }
                }} />
              </Panel>
            </div>
          </>
        )}

        {tab === 'engines' && (
          <Panel title="Engine usage" description="Hunt, Watch, MEV and scans for this organization"><Usage orgId={c.org_id} /></Panel>
        )}

        {tab === 'notes' && (
          <Panel title="Notes" description="Private to Hawk-i staff.">
            <form className="mb-4 grid gap-3" onSubmit={async (e) => {
              e.preventDefault()
              await act(`${base}/notes`, 'POST', { body: note }, 'Note added.')
              setNote('')
            }}>
              <textarea aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Calls, promises, context for the next person"
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70" />
              <div><Button type="submit" size="sm" disabled={!note.trim()}>Add note</Button></div>
            </form>
            {data.notes.length === 0 ? <p className="text-sm text-fg-3">No notes yet.</p> : (
              <ul className="grid gap-3">
                {data.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-line bg-surface-2/40 px-4 py-3 text-sm">
                    <p className="whitespace-pre-line text-fg">{n.body}</p>
                    <div className="mt-2 flex gap-3 text-xs text-fg-3">
                      <span>{n.author_email} · {when(n.created_at)}</span>
                      <button type="button" className="hover:text-bad" onClick={() => act(`${base}/notes/${n.id}`, 'DELETE', undefined, 'Note deleted.')}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === 'payments' && (
          <>
            <Panel title="Record a payment"><PaymentForm orgId={c.org_id} onSaved={() => { setMsg({ tone: 'info', text: 'Payment recorded.' }); reload() }} /></Panel>
            <Card flush title="Payment history">
              <DataTable rows={data.payments} empty={<EmptyState compact title="No payments yet" />} columns={[
                { key: 'date', header: 'Date', cell: (p) => <span className="whitespace-nowrap text-fg-3">{when(p.occurred_at)}</span> },
                { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="text-fg">{money(p.amount_cents, p.currency)}</span> },
                { key: 'method', header: 'Method', hide: 'md', cell: (p) => <span className="capitalize text-fg-2">{p.method.replace('_', ' ')}</span> },
                { key: 'kind', header: 'For', hide: 'lg', cell: (p) => <span className="capitalize text-fg-2">{p.kind}{p.credits ? ` (${p.credits} credits)` : ''}</span> },
                {
                  key: 'status', header: 'Status', cell: (p) => p.method === 'stripe' ? <Badge>{p.status}</Badge> : (
                    <select aria-label="Payment status" value={p.status} onChange={(e) => act(`/api/v1/admin/payments/${p.id}`, 'PATCH', { status: e.target.value }, 'Payment updated.')}
                      className="h-7 rounded-md border border-line bg-surface px-1.5 text-xs text-fg">
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ),
                },
                { key: 'ref', header: 'Reference', hide: 'md', cell: (p) => <span className="font-mono text-xs text-fg-3">{p.reference}</span> },
              ]} />
            </Card>
          </>
        )}

        {tab === 'members' && (
          <Card flush>
            <DataTable rows={data.members} rowKey={(m) => m.user_id} rowHref={(m) => `/admin/users/${m.user_id}`} columns={[
              { key: 'who', header: 'Member', cell: (m) => <div><Link to={`/admin/users/${m.user_id}`} className="font-medium text-fg hover:underline">{m.name || m.email}</Link><div className="text-xs text-fg-3">{m.email}</div></div> },
              { key: 'role', header: 'Role', cell: (m) => <Badge>{ROLE_LABELS[m.role] || m.role}</Badge> },
            ]} />
          </Card>
        )}

        {tab === 'credits' && (
          <Card flush>
            <DataTable rows={data.ledger} dense empty={<EmptyState compact title="No credit activity" />} columns={[
              { key: 'when', header: 'When', cell: (e) => <span className="whitespace-nowrap text-fg-3">{when(e.occurred_at)}</span> },
              { key: 'reason', header: 'Details', cell: (e) => <span className="text-fg-2">{e.reason}</span> },
              { key: 'amount', header: 'Credits', align: 'right', cell: (e) => <span className={e.amount_mc > 0 ? 'text-ok' : 'text-fg'}>{e.amount_mc >= 0 ? '+' : '-'}{formatCredits(Math.abs(e.amount_mc))}</span> },
            ]} />
          </Card>
        )}

        {tab === 'audit' && (
          <Card flush>
            <DataTable rows={data.audit} dense empty={<EmptyState compact title="Nothing recorded" />} columns={[
              { key: 'when', header: 'When', cell: (a) => <span className="whitespace-nowrap text-fg-3">{when(a.occurred_at)}</span> },
              { key: 'action', header: 'Action', cell: (a) => <span className={`font-mono text-xs ${a.action.startsWith('admin.') ? 'text-staff' : 'text-fg'}`}>{a.action}</span> },
              { key: 'by', header: 'By', cell: (a) => <span className="text-fg-2">{a.actor_email || a.actor_type}</span> },
            ]} />
          </Card>
        )}
      </div>
    </div>
  )
}
