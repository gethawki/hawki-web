import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { ErrorState } from '../ui/Feedback.jsx'

// Pieces the workspace Intel pages share. Intel answers 402 when the plan
// does not include a part and 429 when the organization used its minute;
// both are shown as states of the page, not as errors.

export const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
export const isAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(a)
export const addressPath = (chain, address) => `/dashboard/intel/address/${chain}/${address.toLowerCase()}`

const NEEDS = { basic: 'Builder', full: 'Professional', graph: 'Security' }

// nodePath is the page of a Threat Graph node or search document ID:
// address:<chain>:<0x>, protocol:<slug>, exploit:<id>,
// proposal:<chain>:<governor>:<id>. Others have no page.
export function nodePath(id) {
  const [kind, ...rest] = (id || '').split(':')
  if (kind === 'address' && rest.length === 2 && rest[0]) return addressPath(rest[0], rest[1])
  if (kind === 'protocol') return `/dashboard/intel/protocols/${encodeURIComponent(rest.join(':'))}`
  if (kind === 'exploit') return `/dashboard/intel/exploits/${rest[0]}`
  if (kind === 'proposal' && rest.length === 3) return `/dashboard/intel/proposals/${rest[0]}/${rest[1]}/${rest[2]}`
  return null
}

const LEVELS = { none: 0, basic: 1, full: 2, graph: 3 }

// useIntel loads an Intel endpoint of the current organization. A null
// path loads nothing.
export function useIntel(path) {
  const { currentOrg } = useAuth()
  const url = path && currentOrg ? `/api/v1/orgs/${currentOrg.id}/intel${path}` : null
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

// useIntelAccess is what the organization's plan opens.
export function useIntelAccess() {
  const r = useIntel('/access')
  const a = r.data
  const level = LEVELS[a?.level] || 0
  return { ...r, access: a, basic: level >= 1, full: level >= 2, graph: level >= 3 }
}

export function AccessBadge({ access }) {
  if (!access) return null
  if (access.level === 'none') return <Badge>Not in your plan</Badge>
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge tone={access.level === 'basic' ? 'accent' : 'good'} dot>{{ basic: 'Basic Intel', full: 'Full Intel', graph: 'Full Intel and Threat Graph' }[access.level] || access.level}</Badge>
      <span>{access.unlimited ? 'No request limit' : `${access.per_minute} requests a minute`}</span>
    </span>
  )
}

// Locked explains what a plan needs to open a part of Intel.
export function Locked({ need = 'full', what, compact }) {
  const { can } = useAuth()
  return (
    <div className={`grid justify-items-center gap-3 text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface-2 text-fg-3"><Lock size={16} aria-hidden /></span>
      <div className="grid max-w-md gap-1">
        <p className="text-sm font-medium text-fg">{what ? `${what} needs` : 'This needs'} the {NEEDS[need]} plan or above</p>
        <p className="text-xs text-fg-3">{need === 'graph'
          ? 'Security and Enterprise include the Threat Graph: how addresses, contracts, protocols and incidents connect, paths between two addresses and same-actor clusters.'
          : need === 'full'
            ? 'Professional, Security and Enterprise include all of Intel: full search, address profiles, insights, protocols, upgrade and admin changes, governance, deployments and risk events.'
            : 'Builder includes search by address and name, similar contracts, the exploit database and vulnerability lookup. Professional and above include all of Intel.'}</p>
      </div>
      {can('billing:read') && <Button size="sm" to="/dashboard/billing">See plans</Button>}
    </div>
  )
}

// IntelError shows an Intel failure: a plan gate, the rate limit or an
// error to retry.
export function IntelError({ status, error, onRetry, what }) {
  if (status === 402) return <Locked what={what} need={/Builder/.test(error || '') ? 'basic' : /Security|graph/i.test(error || '') ? 'graph' : 'full'} />
  if (status === 429) return <ErrorState onRetry={onRetry}>Your organization used its Intel requests for this minute. Try again in a moment.</ErrorState>
  return <ErrorState onRetry={onRetry}>{error}</ErrorState>
}

export function AddressLink({ chain, address, label, className = '' }) {
  if (!address) return <span className="text-fg-3">-</span>
  return (
    <Link to={addressPath(chain, address)} className={`font-mono text-xs text-fg hover:underline ${className}`} title={address}>
      {short(address)}{label && <span className="ml-2 font-sans text-fg-2">{label}</span>}
    </Link>
  )
}

export function ChainName({ chain }) {
  return <span className="capitalize text-fg-2">{chain || '-'}</span>
}
