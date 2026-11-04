import { useState } from 'react'
import { Link } from 'react-router-dom'
import { num } from '../../lib/format.js'
import { formatCredits } from '../../lib/credits.js'
import { Badge, when } from './bits.jsx'

export const SERVICE_LABELS = {
  postgres: 'PostgreSQL', redis: 'Redis', nats: 'NATS queue', object_store: 'Object store', graph: 'Threat Graph', search: 'Search',
  hunt: 'Hunt Engine', watch: 'Watch Engine', mev: 'MEV Intelligence', intel: 'Intel Engine', scan_workers: 'Scan workers',
}
export const serviceLabel = (s) => SERVICE_LABELS[s] || s.replace(/_/g, ' ')

export const STATUS_TONE = { ok: 'good', degraded: 'warn', down: 'bad', unknown: 'muted' }
export const STATUS_TEXT = { ok: 'Up', degraded: 'Degraded', down: 'Down', unknown: 'Not checked' }

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'muted'}>{STATUS_TEXT[status] || status}</Badge>
}

export function bytes(n) {
  if (n == null) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

export const uptime = (r) => (r == null ? '-' : `${(r * 100).toFixed(r === 1 ? 0 : 2)}%`)

export const ms = (v) => (v == null ? '-' : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`)

export function span(fromIso, toIso) {
  const s = Math.max(0, (new Date(toIso || Date.now()) - new Date(fromIso)) / 1000)
  if (s < 90) return `${Math.round(s)} s`
  if (s < 5400) return `${Math.round(s / 60)} min`
  if (s < 172800) return `${(s / 3600).toFixed(1)} h`
  return `${Math.round(s / 86400)} days`
}

// ConfirmDelete asks for the exact text (an email or a slug) and a reason
// before a deletion that cannot be undone.
export function ConfirmDelete({ what, confirmText, onSubmit, idPrefix }) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = typed.trim() === confirmText && reason.trim().length >= 3
  const field = 'h-9 w-full min-w-0 rounded-lg bg-surface border border-line-strong px-3 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-critical/60'
  return (
    <form className="grid gap-2" onSubmit={async (e) => {
      e.preventDefault()
      if (!ready) return
      setBusy(true)
      await onSubmit(typed.trim(), reason.trim())
      setBusy(false)
    }}>
      <label htmlFor={`${idPrefix}-confirm`} className="text-xs text-fg-3">Type <span className="font-mono text-fg-2">{confirmText}</span> to confirm</label>
      <input id={`${idPrefix}-confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck="false" className={field} />
      <input id={`${idPrefix}-reason`} aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (kept in the audit log)" className={field} />
      <button type="submit" disabled={!ready || busy}
        className="h-9 rounded-lg border border-critical/50 px-3.5 text-sm text-bad transition hover:bg-critical hover:text-fg disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-bad">
        {busy ? 'Deleting' : `Delete ${what}`}
      </button>
    </form>
  )
}

const HEALTH_TONE = { healthy: 'good', degraded: 'warn', unhealthy: 'bad', paused: 'muted' }

function Figure({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs text-fg-3">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-fg tnum">{value}</div>
      {sub && <div className="truncate text-[0.7rem] text-fg-3">{sub}</div>}
    </div>
  )
}

// EngineUsage shows what an account or organization does with Hunt, Watch,
// MEV and scans, and where its credits went.
export function EngineUsage({ u, showOrg }) {
  const credits = Object.entries(u.credits.by_feature_30d_mc || {}).sort((a, b) => b[1] - a[1])
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Figure label="Scans" value={num(u.scans.total)} sub={`${num(u.scans.last_30d)} in 30 days`} />
        <Figure label="Hunt watchlist" value={num(u.hunt.watchlist)} sub={`${num(u.hunt.clusters_touching_watchlist)} clusters touch it`} />
        <Figure label="Watch monitors" value={`${num(u.watch.active)} / ${num(u.watch.monitors)}`} sub={`${num(u.watch.open_violations)} open violations`} />
        <Figure label="MEV targets" value={num(u.mev.targets)} sub={`${num(u.mev.predictions_30d)} predictions in 30 days`} />
        <Figure label="Hunt requests" value={num(u.hunt.requests_30d)} sub={u.hunt.last_at ? `last ${when(u.hunt.last_at)}` : 'none yet'} />
        <Figure label="Watch violations" value={num(u.watch.violations_30d)} sub="last 30 days" />
        <Figure label="MEV analyses" value={num(u.mev.requests_30d)} sub={u.mev.last_at ? `last ${when(u.mev.last_at)}` : 'none yet'} />
        <Figure label="Credits spent" value={formatCredits(u.credits.spent_30d_mc)} sub="last 30 days" />
      </div>
      {credits.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs text-fg-3">Credits by feature, 30 days</div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {credits.map(([k, v]) => <li key={k} className="rounded-md border border-line px-2 py-1 text-fg-2">{k.replace(/_/g, ' ')} <span className="tnum text-fg">{formatCredits(v)}</span></li>)}
          </ul>
        </div>
      )}
      {u.watch.list.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs text-fg-3">Watch monitors</div>
          <ul className="grid gap-1 text-sm">
            {u.watch.list.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-fg">{m.name}</span>
                <span className="text-xs capitalize text-fg-3">{m.chain}</span>
                {showOrg && <Link to={`/admin/customers/${m.org_id}`} className="text-xs text-fg-3 hover:text-fg">organization</Link>}
                <Badge tone={m.status === 'active' ? HEALTH_TONE[m.health] || 'muted' : 'muted'}>{m.status === 'active' ? m.health : m.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      {u.hunt.watched.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs text-fg-3">Hunt watchlist</div>
          <ul className="grid gap-1 text-sm">
            {u.hunt.watched.map((w) => (
              <li key={`${w.org_id}:${w.chain}:${w.address}`} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{w.address}</span>
                <span className="text-xs capitalize text-fg-3">{w.chain}</span>
                {w.label && <span className="truncate text-xs text-fg-2">{w.label}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
