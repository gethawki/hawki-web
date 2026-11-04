import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num } from '../../lib/format.js'
import { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Badge, { SeverityBadge } from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState, ErrorState } from '../ui/Feedback.jsx'

// Pieces the MEV pages share. MEV answers 402 when the plan does not
// include it or a limit is reached.

export const predictionPath = (id) => `/dashboard/mev/predictions/${id}`
export const analysisPath = (id) => `/dashboard/mev/analyses/${id}`

export const MEV_CHAINS = ['ethereum', 'base', 'polygon', 'bnb', 'arbitrum', 'optimism', 'avalanche']

export const PATTERNS = {
  'sandwich-opportunity': 'Swap open to a sandwich',
  'sandwich-attack': 'Sandwich attack',
  'front-run': 'Front run',
  'back-run-arbitrage': 'Back run arbitrage',
  'oracle-manipulation': 'Oracle manipulation',
  liquidation: 'Liquidation race',
  'approval-drain': 'Approval to a drainer',
  'flagged-sender': 'Flagged account',
  'flash-loan-attack': 'Flash loan attack',
  'upgrade-attack': 'Upgrade from one key',
  'admin-takeover': 'Admin takeover',
  'governance-attack': 'Harmful governance',
  'exploit-signature': 'Known exploit',
}

export function useMev(path) {
  const { currentOrg } = useAuth()
  const url = path && currentOrg ? (path.startsWith('/api/') ? path : `/api/v1/orgs/${currentOrg.id}/mev${path}`) : null
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

export function useMevAccess() {
  const r = useMev('/access')
  const level = { none: 0, pro: 1, enterprise: 2 }[r.data?.level] || 0
  return { ...r, access: r.data, on: level >= 1, enterprise: level >= 2 }
}

export function mevCall(orgId, path, method, body, key) {
  return api(`/api/v1/orgs/${orgId}/mev${path}`, { method, body, headers: key ? { 'Idempotency-Key': key } : undefined })
}

export const newKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function MevAccessBadge({ access }) {
  if (!access) return null
  if (access.level === 'none') return <Badge>Not in your plan</Badge>
  return <Badge tone="good" dot>{access.level === 'enterprise' ? 'MEV Intelligence and threat prediction' : 'MEV Intelligence'}</Badge>
}

export function MevLocked({ need = 'security', what, compact }) {
  const { can } = useAuth()
  return (
    <div className={`grid justify-items-center gap-3 text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-2 text-fg-3"><Lock size={16} aria-hidden /></span>
      <div className="grid max-w-md gap-1">
        <p className="text-sm font-medium text-fg">{what ? `${what} needs` : 'This needs'} the {need === 'enterprise' ? 'Enterprise' : 'Security'} plan or above</p>
        <p className="text-xs text-fg-3">{need === 'enterprise'
          ? 'Enterprise adds threat prediction: flash loan exploits, upgrades, takeovers and harmful governance simulated before they land.'
          : 'Security and Enterprise include MEV Intelligence: pending transactions on your contracts read before they are mined, with sandwich, front run, oracle and liquidity attack detection.'}</p>
      </div>
      {can('billing:read') && <Button size="sm" to="/dashboard/billing">See plans</Button>}
    </div>
  )
}

export function MevError({ status, error, onRetry, what }) {
  if (status === 402 && /plan/i.test(error || '') && !/limit/i.test(error || '')) return <MevLocked what={what} />
  return <ErrorState onRetry={onRetry}>{error}</ErrorState>
}

const STATUS = {
  pending: ['accent', 'Pending'],
  confirmed: ['danger', 'Happened'],
  missed: ['neutral', 'Did not happen'],
  dropped: ['neutral', 'Dropped'],
  false_positive: ['good', 'False positive'],
}

export function PredictionStatus({ status }) {
  const [tone, label] = STATUS[status] || ['neutral', status]
  return <Badge tone={tone} dot={status === 'pending'} pulse={status === 'pending'}>{label}</Badge>
}

export const usdText = (v) => (v > 0 ? `$${num(Math.round(v))}` : '-')

export function PredictionTable({ rows, loading, empty }) {
  return (
    <DataTable rows={rows} loading={loading} rowKey={(p) => p.id} rowHref={(p) => predictionPath(p.id)}
      empty={empty || <EmptyState compact title="No prediction yet">Predictions appear as pending transactions touch your contracts.</EmptyState>}
      columns={[
        { key: 's', header: 'Severity', className: 'w-24', cell: (p) => <SeverityBadge value={p.severity} /> },
        { key: 't', header: 'Prediction', cell: (p) => (
          <span className="grid">
            <Link to={predictionPath(p.id)} className="text-fg hover:underline">{p.title}</Link>
            <span className="text-xs text-fg-3">{PATTERNS[p.pattern] || p.pattern}{p.tier === 'enterprise' ? ', threat prediction' : ''}</span>
          </span>
        ) },
        { key: 'c', header: 'Chain', hide: 'md', cell: (p) => <span className="capitalize">{p.chain}</span> },
        { key: 'r', header: 'Score', align: 'right', hide: 'sm', cell: (p) => <span className="tnum">{p.risk_score}</span> },
        { key: 'i', header: 'At stake', align: 'right', hide: 'lg', cell: (p) => <span className="tnum text-fg-2">{usdText(p.impact_usd)}</span> },
        { key: 'st', header: 'Outcome', hide: 'sm', cell: (p) => <PredictionStatus status={p.status} /> },
        { key: 'w', header: 'When', align: 'right', cell: (p) => <span className="whitespace-nowrap text-fg-3" title={dateTime(p.created_at)}>{ago(p.created_at)}</span> },
      ]} />
  )
}
