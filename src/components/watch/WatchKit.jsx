import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { ErrorState } from '../ui/Feedback.jsx'

// Pieces the Watch pages share. Watch answers 402 when the plan does not
// include a part, the monitor limit is reached or the cost does not fit
// the cap; each shows as a state of the page.

export const monitorPath = (id) => `/dashboard/watch/monitors/${id}`
export const violationPath = (id) => `/dashboard/watch/violations/${id}`
export const requestPath = (id) => `/dashboard/watch/requests/${id}`

export const CHAINS = ['ethereum', 'base']
export const chainOptions = (all) => [...(all ? [{ value: '', label: 'All chains' }] : []), ...CHAINS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))]

const LEVELS = { none: 0, lite: 1, pro: 2, enterprise: 3 }
const NEEDS = { lite: 'Professional', pro: 'Security', enterprise: 'Enterprise' }

// useWatch loads a Watch endpoint of the current organization, or a full
// API path; a null path loads nothing.
export function useWatch(path) {
  const { currentOrg } = useAuth()
  const url = path && currentOrg ? (path.startsWith('/api/') ? path : `/api/v1/orgs/${currentOrg.id}/watch${path}`) : null
  const [state, setState] = useState({ data: null, error: null, status: 0, loading: Boolean(url) })
  const seq = useRef(0)
  const load = useCallback(async () => {
    if (!url) return
    const n = ++seq.current
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await api(url)
      if (n === seq.current) setState({ data, error: null, status: 200, loading: false })
    } catch (err) {
      if (n === seq.current) setState((s) => ({ data: s.data, error: errorMessage(err), status: err.status || 0, loading: false }))
    }
  }, [url])
  useEffect(() => {
    load()
  }, [load])
  const setData = useCallback((data) => setState((s) => ({ ...s, data, error: null })), [])
  return { ...state, reload: load, setData }
}

// useWatchAccess is what the organization's plan opens.
export function useWatchAccess() {
  const r = useWatch('/access')
  const level = LEVELS[r.data?.level] || 0
  return { ...r, access: r.data, lite: level >= 1, pro: level >= 2, enterprise: level >= 3 }
}

// watchCall sends a change to Watch; paid requests carry an idempotency
// key so a retried click is not charged twice.
export function watchCall(orgId, path, method, body, key) {
  return api(`/api/v1/orgs/${orgId}/watch${path}`, { method, body, headers: key ? { 'Idempotency-Key': key } : undefined })
}

export const newKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

// credits shows millicredits as credits, with up to three decimals.
export function credits(mc) {
  if (mc == null) return '-'
  const v = mc / 1000
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export function WatchAccessBadge({ access }) {
  if (!access) return null
  if (access.level === 'none') return <Badge>Not in your plan</Badge>
  const label = { lite: 'Watch Lite', pro: 'Watch Pro', enterprise: access.unlimited ? 'Watch, no limits' : 'Watch Enterprise' }[access.level] || access.level
  return <Badge tone={access.level === 'lite' ? 'accent' : 'good'} dot>{label}</Badge>
}

export function WatchLocked({ need = 'lite', what, compact }) {
  const { can } = useAuth()
  return (
    <div className={`grid justify-items-center gap-3 text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-2 text-fg-3"><Lock size={16} aria-hidden /></span>
      <div className="grid max-w-md gap-1">
        <p className="text-sm font-medium text-fg">{what ? `${what} needs` : 'This needs'} the {NEEDS[need]} plan or above</p>
        <p className="text-xs text-fg-3">{need === 'enterprise'
          ? 'Enterprise writes its own variables and invariants, has no invariant limit, its own prices and on-demand health reports.'
          : need === 'pro'
            ? 'Security and Enterprise include Watch Pro: any number of protocols, and the Full level with oracle, flash loan, liquidity, governance and MEV analyses.'
            : 'Professional and above include Watch: protocols checked at every block, with an alert and evidence when an invariant breaks.'}</p>
      </div>
      {can('billing:read') && <Button size="sm" to="/dashboard/billing">See plans</Button>}
    </div>
  )
}

export function WatchError({ status, error, onRetry, what }) {
  if (status === 402 && /plan/i.test(error || '') && !/limit|cap/i.test(error || '')) {
    return <WatchLocked what={what} need={/Enterprise/.test(error || '') ? 'enterprise' : /Security/.test(error || '') ? 'pro' : 'lite'} />
  }
  return <ErrorState onRetry={onRetry}>{error}</ErrorState>
}

const HEALTH = {
  healthy: ['good', 'Healthy'],
  degraded: ['warning', 'Degraded'],
  at_risk: ['danger', 'At risk'],
  critical: ['danger', 'Critical'],
}

export function HealthBadge({ health, pulse }) {
  const [tone, label] = HEALTH[health] || ['neutral', health || 'Unknown']
  return <Badge tone={tone} dot pulse={pulse && health !== 'healthy'}>{label}</Badge>
}

const STATUS = {
  open: ['danger', 'Open'],
  acknowledged: ['warning', 'Acknowledged'],
  suspected: ['neutral', 'Suspected false positive'],
  resolved: ['good', 'Resolved'],
  retracted: ['neutral', 'Retracted'],
}

export function EpisodeStatus({ status }) {
  const [tone, label] = STATUS[status] || ['neutral', status]
  return <Badge tone={tone}>{label}</Badge>
}

export function LevelBadge({ level }) {
  return <Badge tone={level === 'full' ? 'staff' : 'accent'}>{level === 'full' ? 'Full' : 'Standard'}</Badge>
}

export function BillingBadge({ billing }) {
  if (!billing || billing === 'active') return null
  return <Badge tone={billing === 'exempt' ? 'neutral' : billing === 'grace' ? 'warning' : 'danger'}>{billing === 'grace' ? 'In grace' : billing === 'paused' ? 'Paused, unpaid' : billing}</Badge>
}

export function MonitorLink({ id, name }) {
  return <Link to={monitorPath(id)} className="text-fg hover:underline">{name}</Link>
}

// bigValue shows a recorded value: large integers are grouped, addresses
// shortened in the middle.
export function bigValue(v) {
  if (v == null) return '-'
  const s = String(v)
  if (/^0x[0-9a-f]{40}$/i.test(s)) return `${s.slice(0, 8)}…${s.slice(-6)}`
  if (/^-?\d{4,}$/.test(s)) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return s
}

export const INVARIANT_TYPES = ['mathematical', 'range', 'relationship', 'temporal']
export const SEVERITIES = ['critical', 'high', 'medium', 'low']
