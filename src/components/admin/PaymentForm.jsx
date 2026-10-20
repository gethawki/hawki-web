import { useState } from 'react'
import { api } from '../../lib/api.js'
import Alert, { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Field, { SelectField } from '../common/Field.jsx'

export const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'card_manual', label: 'Card (taken manually)' },
  { value: 'other', label: 'Other' },
]
export const STATUSES = [
  { value: 'succeeded', label: 'Received' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]
const KINDS = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'credits', label: 'Credits' },
  { value: 'other', label: 'Other' },
]

// PaymentForm records money received outside the payment provider. A
// received credits payment grants its credits for 12 months.
export default function PaymentForm({ orgId, orgs, onSaved }) {
  const empty = { org_id: orgId || '', amount: '', currency: 'usd', method: 'bank_transfer', status: 'succeeded', kind: 'subscription',
    credits: '', reference: '', description: '', occurred_at: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/api/v1/admin/payments', {
        method: 'POST',
        body: {
          org_id: form.org_id, amount_cents: Math.round(Number(form.amount) * 100), currency: form.currency, method: form.method,
          status: form.status, kind: form.kind, credits: form.kind === 'credits' ? Number(form.credits || 0) : 0,
          reference: form.reference, description: form.description,
          ...(form.occurred_at ? { occurred_at: new Date(form.occurred_at).toISOString() } : {}),
        },
      })
      setForm({ ...empty, org_id: orgId || '' })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!orgId && (
          <div className="sm:col-span-2">
            <SelectField id="pay-org" label="Customer" value={form.org_id} onChange={set('org_id')}
              options={[{ value: '', label: 'Choose an organization' }, ...orgs.map((o) => ({ value: o.org_id, label: `${o.name} (${o.owner_email || o.slug})` }))]} />
          </div>
        )}
        <Field id="pay-amount" label="Amount" inputMode="decimal" placeholder="49.00" value={form.amount} onChange={set('amount')} />
        <Field id="pay-currency" label="Currency" value={form.currency} onChange={set('currency')} />
        <SelectField id="pay-method" label="Method" value={form.method} onChange={set('method')} options={METHODS} />
        <SelectField id="pay-status" label="Status" value={form.status} onChange={set('status')} options={STATUSES} />
        <SelectField id="pay-kind" label="For" value={form.kind} onChange={set('kind')} options={KINDS} />
        {form.kind === 'credits' && <Field id="pay-credits" label="Credits" inputMode="numeric" value={form.credits} onChange={set('credits')} />}
        <Field id="pay-ref" label="Reference" placeholder="Invoice or transaction" value={form.reference} onChange={set('reference')} />
        <Field id="pay-date" label="Received on" type="date" value={form.occurred_at} onChange={set('occurred_at')} />
        <div className="sm:col-span-2 lg:col-span-4">
          <Field id="pay-desc" label="Note" value={form.description} onChange={set('description')} />
        </div>
      </div>
      <div><Button type="submit" busy={busy} disabled={!form.org_id || !(Number(form.amount) > 0)}>Record payment</Button></div>
    </form>
  )
}
