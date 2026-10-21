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

const NEEDS = { basic: 'Builder', full: 'Professional' }

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
  return { ...r, access: a, full: a?.level === 'full', basic: a?.level === 'basic' || a?.level === 'full' }
}

export function AccessBadge({ access }) {
  if (!access) return null
  if (access.level === 'none') return <Badge>Not in your plan</Badge>
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge tone={access.level === 'full' ? 'good' : 'accent'} dot>{access.level === 'full' ? 'Full Intel' : 'Basic Intel'}</Badge>
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
        <p className="text-xs text-fg-3">{need === 'full'
          ? 'Professional, Security and Enterprise include all of Intel: lookup, address profiles, protocols, upgrade and admin changes, governance, deployments and risk events.'
          : 'Builder includes similar contracts, the exploit database and vulnerability lookup. Professional and above include all of Intel.'}</p>
      </div>
      {can('billing:read') && <Button size="sm" to="/dashboard/billing">See plans</Button>}
    </div>
  )
}

// IntelError shows an Intel failure: a plan gate, the rate limit or an
// error to retry.
export function IntelError({ status, error, onRetry, what }) {
  if (status === 402) return <Locked what={what} need={/Builder/.test(error || '') ? 'basic' : 'full'} />
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
