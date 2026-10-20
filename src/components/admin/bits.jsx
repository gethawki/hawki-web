import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { errorMessage } from '../common/Alert.jsx'
import UIBadge from '../ui/Badge.jsx'

export const money = (cents, currency = 'usd') =>
  ((cents || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: (cents || 0) % 100 ? 2 : 0 })

export const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never')
export const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '')

export function Stat({ label, value, note, tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="text-xs text-fg-3 truncate">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold tracking-tight truncate ${tone === 'bad' ? 'text-[#ff8b8b]' : 'text-fg'}`}>{value}</div>
      {note && <div className="mt-0.5 text-xs text-fg-3 truncate">{note}</div>}
    </div>
  )
}

const TONES = { good: 'good', bad: 'danger', muted: 'neutral', staff: 'staff', warn: 'warning' }

export function Badge({ children, tone = 'muted' }) {
  return <UIBadge tone={TONES[tone] || 'neutral'}>{children}</UIBadge>
}

// Table keeps wide admin tables scrolling inside their card on phones.
export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto scrollbar-thin -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((h) => <th key={h} className="px-3 py-2.5 text-xs font-medium text-fg-3 whitespace-nowrap first:pl-5 last:pr-5">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&_td:first-child]:pl-5 [&_td:last-child]:pr-5">{children}</tbody>
      </table>
    </div>
  )
}

export const td = 'px-3 py-2.5 align-top text-fg-2'

// useAdmin loads an admin endpoint and reloads on demand.
export function useAdmin(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(async () => {
    try {
      setData(await api(path))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [path])
  useEffect(() => {
    load()
  }, [load])
  return { data, error, reload: load, setData }
}

// Reasoned runs a sensitive action that needs a written reason.
export function ReasonForm({ label, placeholder, onSubmit, danger, busyLabel }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="@container" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      await onSubmit(reason)
      setBusy(false)
      setReason('')
    }}>
      <div className="flex flex-col gap-2 @sm:flex-row">
        <input aria-label={`Reason: ${label}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder || 'Reason (kept in the audit log)'}
          className="h-9 flex-1 min-w-0 rounded-lg bg-surface border border-line-strong px-3 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70" />
        <button type="submit" disabled={busy || reason.trim().length < 3}
          className={`h-9 rounded-lg px-3.5 text-sm whitespace-nowrap transition disabled:opacity-50 ${danger ? 'border border-critical/50 text-[#ff8b8b] hover:bg-critical hover:text-fg' : 'bg-accent font-medium text-[#0b0d10] hover:bg-[#a7bdd4]'}`}>
          {busy ? busyLabel || 'Working' : label}
        </button>
      </div>
    </form>
  )
}
