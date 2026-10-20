import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { formatCredits } from '../../lib/credits.js'
import { PLAN_LABELS, ROLE_LABELS } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Badge, ReasonForm, Stat, Table, money, td, useAdmin, when } from '../../components/admin/bits.jsx'
import PaymentForm, { STATUSES } from '../../components/admin/PaymentForm.jsx'

const PLAN_OPTIONS = Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }))

function PlanAndCredits({ c, billing, act }) {
  const [plan, setPlan] = useState(c.plan)
  const [credits, setCredits] = useState('')
  const [reason, setReason] = useState('')
  const amount = Number.parseInt(credits, 10)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
        <SelectField id="cust-plan-set" label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} options={PLAN_OPTIONS}
          hint="Starts a new period now and grants the plan's credits. For manual and enterprise billing." />
        <Button disabled={plan === c.plan} onClick={() => act(`/api/v1/admin/orgs/${c.org_id}/plan`, 'PUT', { plan }, `Moved to ${PLAN_LABELS[plan]}.`)}>Set plan</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] items-end">
        <Field id="cust-credits" label="Credits" inputMode="numeric" placeholder="100 or -50" value={credits} onChange={(e) => setCredits(e.target.value)} />
        <Field id="cust-credits-reason" label="Reason" placeholder="Shown in their credit history" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="ghost" disabled={!amount || reason.trim().length < 3}
          onClick={async () => {
            await act(`/api/v1/admin/orgs/${c.org_id}/credits`, 'POST', { credits: amount, reason: reason.trim() }, `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} credits.`)
            setCredits('')
            setReason('')
          }}>Adjust credits</Button>
      </div>
      <p className="text-xs text-grey">
        Period ends {when(billing.period_end)}. {formatCredits(billing.total_remaining_mc)} credits left
        ({formatCredits(billing.monthly_remaining_mc)} plan, {formatCredits(billing.purchased_remaining_mc)} bought or added),
        {' '}{formatCredits(billing.period_spent_mc)} used this period{billing.period_cap_mc != null ? ` of ${formatCredits(billing.period_cap_mc)}` : ', no limit'}.
      </p>
    </div>
  )
}

function Tags({ c, act }) {
  const [text, setText] = useState(c.tags.join(', '))
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
      <Field id="cust-tags" label="Tags" placeholder="lead, defi, partner" value={text} onChange={(e) => setText(e.target.value)} />
      <Button variant="ghost" onClick={() => act(`/api/v1/admin/customers/${c.org_id}/tags`, 'PUT', { tags: text.split(',') }, 'Tags saved.')}>Save tags</Button>
    </div>
  )
}

export default function AdminCustomer() {
  const { orgId } = useParams()
  const { data, error, reload } = useAdmin(`/api/v1/admin/customers/${orgId}`)
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

  if (error) return <div className="max-w-6xl"><Alert>{error}</Alert></div>
  if (!data) return <Spinner />
  const { customer: c, billing } = data
  const base = `/api/v1/admin/customers/${c.org_id}`
  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title={c.name} description={`${c.slug} · owner ${c.owner_email || 'none'} · since ${when(c.created_at)}`}
        actions={<div className="flex flex-wrap gap-1">
          <Badge tone={c.status === 'active' ? 'good' : 'bad'}>{c.status}</Badge>
          <Badge>{PLAN_LABELS[c.plan] || c.plan}</Badge>
          {c.exempt && <Badge tone="good">exempt</Badge>}
        </div>} />
      {c.status !== 'active' && <Alert>Suspended: {c.status_reason}</Alert>}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="MRR" value={money(c.mrr_cents)} note={c.exempt ? 'exempt from billing' : billing.status} />
        <Stat label="Paid in total" value={money(c.paid_cents)} note={`${data.payments.length} payments`} />
        <Stat label="Credits left" value={formatCredits(c.credits_mc)} />
        <Stat label="Usage" value={`${c.members} members`} note={`${c.projects} projects, last scan ${c.last_scan_at ? when(c.last_scan_at) : 'never'}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Plan and credits"><PlanAndCredits key={c.plan} c={c} billing={billing} act={act} /></Panel>
        <Panel title="Account">
          <div className="grid gap-5">
            <div>
              <div className="text-sm text-white mb-1">Payment exemption</div>
              <p className="text-xs text-grey mb-2">{c.exempt ? 'Never charged and never limited.' : 'Charged and limited by its plan.'}</p>
              {c.exempt
                ? <Button variant="ghost" onClick={() => act(`${base}/exempt`, 'PUT', { exempt: false }, 'Exemption removed.')}>Remove exemption</Button>
                : <ReasonForm label="Exempt from billing" placeholder="Why (partner, staff, comp)" onSubmit={(reason) => act(`${base}/exempt`, 'PUT', { exempt: true, reason }, 'Exempt from billing.')} />}
            </div>
            <div>
              <div className="text-sm text-white mb-1">Suspension</div>
              {c.status === 'active'
                ? <ReasonForm label="Suspend organization" danger onSubmit={(reason) => act(`${base}/status`, 'PUT', { status: 'suspended', reason }, 'Organization suspended.')} />
                : <Button onClick={() => act(`${base}/status`, 'PUT', { status: 'active' }, 'Organization restored.')}>Restore organization</Button>}
            </div>
            <Tags key={c.tags.join()} c={c} act={act} />
          </div>
        </Panel>
      </div>

      <Panel title="Notes">
        <form className="grid gap-3 mb-4" onSubmit={async (e) => {
          e.preventDefault()
          await act(`${base}/notes`, 'POST', { body: note }, 'Note added.')
          setNote('')
        }}>
          <textarea aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Calls, promises, context for the next person"
            className="w-full rounded-lg bg-ink-soft border border-panel-border px-3.5 py-2.5 text-sm text-white placeholder:text-grey outline-none focus:border-steel" />
          <div><Button type="submit" variant="ghost" disabled={!note.trim()}>Add note</Button></div>
        </form>
        <ul className="divide-y divide-panel-border">
          {data.notes.map((n) => (
            <li key={n.id} className="py-3 text-sm">
              <p className="text-[#cfcfcf] whitespace-pre-line">{n.body}</p>
              <div className="mt-1 flex gap-3 text-xs text-grey">
                <span>{n.author_email} · {when(n.created_at)}</span>
                <button type="button" className="hover:text-copper" onClick={() => act(`${base}/notes/${n.id}`, 'DELETE', undefined, 'Note deleted.')}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Payments">
        <PaymentForm orgId={c.org_id} onSaved={() => { setMsg({ tone: 'info', text: 'Payment recorded.' }); reload() }} />
        {data.payments.length > 0 && (
          <div className="mt-6">
            <Table head={['Date', 'Amount', 'Method', 'For', 'Status', 'Reference']}>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className={`${td} whitespace-nowrap text-xs text-grey`}>{when(p.occurred_at)}</td>
                  <td className={`${td} whitespace-nowrap text-white`}>{money(p.amount_cents, p.currency)}</td>
                  <td className={td}>{p.method.replace('_', ' ')}</td>
                  <td className={td}>{p.kind}{p.credits ? ` (${p.credits} credits)` : ''}</td>
                  <td className={td}>
                    {p.method === 'stripe' ? <Badge>{p.status}</Badge> : (
                      <select aria-label="Payment status" value={p.status} onChange={(e) => act(`/api/v1/admin/payments/${p.id}`, 'PATCH', { status: e.target.value }, 'Payment updated.')}
                        className="rounded-lg bg-ink-soft border border-panel-border px-2 py-1 text-xs text-white">
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td className={`${td} text-xs text-grey`}>{p.reference}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Members">
          <ul className="divide-y divide-panel-border text-sm">
            {data.members.map((m) => (
              <li key={m.user_id} className="py-2 flex items-center gap-3">
                <Link to={`/admin/users/${m.user_id}`} className="flex-1 min-w-0 truncate text-[#cfcfcf] hover:text-white">{m.name || m.email} <span className="text-grey">{m.email}</span></Link>
                <span className="text-xs text-grey">{ROLE_LABELS[m.role] || m.role}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Credit history">
          <ul className="divide-y divide-panel-border text-sm">
            {data.ledger.slice(0, 20).map((e) => (
              <li key={e.id} className="py-2 flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate text-[#cfcfcf]">{e.reason}</span>
                <span className={`font-mono text-xs ${e.amount_mc >= 0 ? 'text-steel-light' : 'text-grey'}`}>{e.amount_mc >= 0 ? '+' : '-'}{formatCredits(Math.abs(e.amount_mc))}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Audit">
        <Table head={['When', 'Action', 'By']}>
          {data.audit.map((a) => (
            <tr key={a.id}>
              <td className={`${td} whitespace-nowrap text-xs text-grey`}>{when(a.occurred_at)}</td>
              <td className={`${td} font-mono text-xs text-white`}>{a.action}</td>
              <td className={`${td} text-xs text-grey`}>{a.actor_email || a.actor_type}</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  )
}
