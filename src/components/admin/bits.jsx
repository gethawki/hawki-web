import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { errorMessage } from '../common/Alert.jsx'

export const money = (cents, currency = 'usd') =>
  ((cents || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: (cents || 0) % 100 ? 2 : 0 })

export const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never')
export const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '')

export function Stat({ label, value, note, tone }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel/60 px-4 py-3 min-w-0">
      <div className="font-mono text-[0.62rem] uppercase tracking-wider text-grey">{label}</div>
      <div className={`mt-1 text-xl truncate ${tone === 'bad' ? 'text-copper' : 'text-white'}`}>{value}</div>
      {note && <div className="text-xs text-grey truncate">{note}</div>}
    </div>
  )
}

const TONES = {
  good: 'border-steel/60 text-steel-light',
  bad: 'border-copper/60 text-copper',
  muted: 'border-panel-border text-grey',
}

export function Badge({ children, tone = 'muted' }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider ${TONES[tone]}`}>{children}</span>
}

// Table keeps wide admin tables scrolling inside their panel on phones.
export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[0.62rem] uppercase tracking-wider text-grey">
            {head.map((h) => <th key={h} className="px-2 pb-3 font-normal whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-panel-border">{children}</tbody>
      </table>
    </div>
  )
}

export const td = 'px-2 py-2.5 align-top'

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
    <form className="flex flex-col sm:flex-row gap-2" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      await onSubmit(reason)
      setBusy(false)
      setReason('')
    }}>
      <input aria-label={`Reason: ${label}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder || 'Reason (kept in the audit log)'}
        className="flex-1 min-w-0 rounded-lg bg-ink-soft border border-panel-border px-3 py-2 text-sm text-white placeholder:text-grey outline-none focus:border-steel" />
      <button type="submit" disabled={busy || reason.trim().length < 3}
        className={`rounded-lg px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50 ${danger ? 'border border-copper/60 text-copper hover:bg-copper/10' : 'bg-steel text-ink hover:bg-steel-light'}`}>
        {busy ? busyLabel || 'Working' : label}
      </button>
    </form>
  )
}
