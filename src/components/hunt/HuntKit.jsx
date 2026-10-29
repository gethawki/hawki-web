import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { ErrorState } from '../ui/Feedback.jsx'
import { short } from '../intel/IntelKit.jsx'

// Pieces the Hunt pages share. Hunt answers 402 when the plan does not
// include a part (or credits ran out); both show as states of the page.

export const huntAddressPath = (chain, address) => `/dashboard/hunt/address/${chain}/${address.toLowerCase()}`
export const clusterPath = (code) => `/dashboard/hunt/clusters/${code}`

const LEVELS = { none: 0, lite: 1, pro: 2, enterprise: 3 }
const NEEDS = { lite: 'Builder', pro: 'Professional', enterprise: 'Enterprise' }

// useHunt loads a Hunt endpoint of the current organization, or a full
// API path; a null path loads nothing.
export function useHunt(path) {
  const { currentOrg } = useAuth()
  const url = path && currentOrg ? (path.startsWith('/api/') ? path : `/api/v1/orgs/${currentOrg.id}/hunt${path}`) : null
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
      if (n === seq.current) setState({ data: null, error: errorMessage(err), status: err.status || 0, loading: false })
    }
  }, [url])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: load }
}

// useHuntAccess is what the organization's plan opens.
export function useHuntAccess() {
  const r = useHunt('/access')
  const level = LEVELS[r.data?.level] || 0
  return { ...r, access: r.data, lite: level >= 1, pro: level >= 2, enterprise: level >= 3 }
}

// huntCall sends a change to Hunt; paid requests carry an idempotency key
// so a retried click is not charged twice.
export function huntCall(orgId, path, method, body, key) {
  return api(`/api/v1/orgs/${orgId}/hunt${path}`, { method, body, headers: key ? { 'Idempotency-Key': key } : undefined })
}

export const newKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function HuntAccessBadge({ access }) {
  if (!access) return null
  if (access.level === 'none') return <Badge>Not in your plan</Badge>
  return <Badge tone={access.level === 'lite' ? 'accent' : 'good'} dot>{{ lite: 'Hunt Lite', pro: 'Hunt Pro', enterprise: 'Hunt Pro with your own heuristics' }[access.level] || access.level}</Badge>
}

export function HuntLocked({ need = 'lite', what, compact }) {
  const { can } = useAuth()
  return (
    <div className={`grid justify-items-center gap-3 text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-2 text-fg-3"><Lock size={16} aria-hidden /></span>
      <div className="grid max-w-md gap-1">
        <p className="text-sm font-medium text-fg">{what ? `${what} needs` : 'This needs'} the {NEEDS[need]} plan or above</p>
        <p className="text-xs text-fg-3">{need === 'enterprise'
          ? 'Enterprise sets its own weights for the Hunt rules and sees clusters scored with them.'
          : need === 'pro'
            ? 'Professional, Security and Enterprise include Hunt Pro: cluster families across chains, fund traces, bridge alerts, every alert channel and weekly reports.'
            : 'Builder and above include Hunt: funding clusters, genesis traces, Digital Immune Scores, a watchlist and investigations.'}</p>
      </div>
      {can('billing:read') && <Button size="sm" to="/dashboard/billing">See plans</Button>}
    </div>
  )
}

export function HuntError({ status, error, onRetry, what }) {
  if (status === 402 && !/credit/i.test(error || '')) {
    return <HuntLocked what={what} need={/Enterprise/.test(error || '') ? 'enterprise' : /Professional|Pro\b/.test(error || '') ? 'pro' : 'lite'} />
  }
  return <ErrorState onRetry={onRetry}>{error}</ErrorState>
}

const BAND_TONE = { high: 'danger', medium: 'warning', low: 'accent', clean: 'neutral' }
const LABEL_TONE = { critical: 'danger', high: 'danger', medium: 'warning', low: 'accent', clean: 'good' }

export function BandBadge({ band, points }) {
  return <Badge tone={BAND_TONE[band] || 'neutral'}>{points != null ? `${points} points, ` : ''}{band}</Badge>
}

export function ScoreBadge({ score, label }) {
  if (score == null) return <span className="text-fg-3">Not scored</span>
  return <Badge tone={LABEL_TONE[label] || 'neutral'}>{score} {label}</Badge>
}

export const STATUS_TONE = { active: 'danger', inactive: 'neutral', archived: 'neutral', retracted: 'good' }

export function ClusterLink({ code }) {
  return <Link to={clusterPath(code)} className="font-mono text-xs text-fg hover:underline">{code}</Link>
}

export function HuntAddress({ chain, address, label }) {
  if (!address) return <span className="text-fg-3">-</span>
  return (
    <Link to={huntAddressPath(chain, address)} className="font-mono text-xs text-fg hover:underline" title={address}>
      {short(address)}{label && <span className="ml-2 font-sans text-fg-2">{label}</span>}
    </Link>
  )
}

export const RULES = {
  R1: 'Liquidity sweep',
  R2: 'Ownership renounced quickly',
  R3: 'Mass deployment',
  R4: 'Bridge hopper',
  R5: 'Unverified code',
  R6: 'Fresh wallet',
}

export function RuleTags({ rules }) {
  if (!rules?.length) return <span className="text-fg-3">None</span>
  return <span className="flex flex-wrap gap-1">{rules.map((r) => <Badge key={r} tone="warning"><span title={RULES[r]}>{r}</span></Badge>)}</span>
}

// traceGraph turns a fund trace into the graph explorer's shape.
export function traceGraph(t) {
  const id = (chain, address) => `address:${chain}:${address}`
  return {
    nodes: t.nodes.map((n) => ({
      id: id(n.chain, n.address), kind: 'address', chain: n.chain, address: n.address, name: n.labels?.[0],
      facts: {
        labels: n.labels || [], hops: n.depth, ...(n.clusters?.length ? { clusters: n.clusters } : {}),
        ...(n.source ? { source: n.cut ? 'as far as traced' : 'ultimate source' } : {}),
      },
    })),
    edges: t.edges.map((e) => ({ from: id(e.from_chain, e.from), to: id(e.to_chain, e.to), type: e.kind === 'bridged' ? 'BRIDGED' : 'FUNDED' })),
  }
}
