import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { Pager } from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton, Skeleton } from '../../components/ui/Feedback.jsx'
import { errorMessage } from '../../components/common/Alert.jsx'
import { IntelError, Locked, nodePath, short, useIntelAccess } from '../../components/intel/IntelKit.jsx'
import SearchBox from '../../components/intel/SearchBox.jsx'

// IntelSearch is the results page of Intel search: every entity type at
// once, filtered by facets. Builder searches addresses and names;
// Professional and above also free text with security terms, and facets.

export const TYPE = { contract: 'Contract', token: 'Token', address: 'Account', protocol: 'Protocol', exploit: 'Incident', proposal: 'Proposal', risk_event: 'Risk event' }
const BAND = { critical: 'danger', high: 'danger', medium: 'warning', low: 'neutral', none: 'neutral' }
const FACETS = [
  { key: 'type', param: 'type', title: 'Type', label: (v) => TYPE[v] || v },
  { key: 'chain', param: 'chain', title: 'Chain', label: (v) => v[0].toUpperCase() + v.slice(1) },
  { key: 'risk_band', param: 'risk_band', title: 'Risk', label: (v) => v[0].toUpperCase() + v.slice(1) },
  { key: 'verified', param: 'verified', title: 'Source', label: (v) => (v === 'true' || v === '1' ? 'Verified' : 'Not verified'), single: true },
]
const LIMIT = 20

function Facet({ facet, counts, params, set }) {
  const chosen = (params.get(facet.param) || '').split(',').filter(Boolean)
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  function toggle(v) {
    const value = facet.single ? (v === 'true' || v === '1' ? 'true' : 'false') : v
    const next = facet.single ? (chosen.includes(value) ? [] : [value]) : chosen.includes(value) ? chosen.filter((c) => c !== value) : [...chosen, value]
    set(facet.param, next.join(','))
  }
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 text-xs font-medium text-fg-2">{facet.title}</legend>
      {entries.map(([v, n]) => {
        const value = facet.single ? (v === 'true' || v === '1' ? 'true' : 'false') : v
        return (
          <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-fg-2 hover:bg-surface-2">
            <input type="checkbox" className="accent-[var(--color-accent)]" checked={chosen.includes(value)} onChange={() => toggle(v)} />
            <span className="flex-1 truncate">{facet.label(v)}</span>
            <span className="tnum text-fg-3">{num(n)}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

// highlight escapes a search snippet, then restores only the <em> marks
// the search engine puts around matches: indexed names are untrusted.
function highlight(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;(\/?)em&gt;/g, '<$1em>')
}

function Hit({ h }) {
  const to = nodePath(h.id)
  const name = h.name || h.symbol || (h.address ? short(h.address) : h.id)
  const chains = Array.isArray(h.chain) ? h.chain : h.chain ? [h.chain] : []
  const snippet = h.highlight?.text?.[0]
  return (
    <li className="grid gap-1 border-b border-line px-5 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{TYPE[h.type] || h.type}</Badge>
        {to ? <Link to={to} className="min-w-0 truncate text-sm font-medium text-fg hover:underline">{name}</Link> : <span className="text-sm font-medium text-fg">{name}</span>}
        {h.symbol && h.symbol !== h.name && <span className="text-xs text-fg-3">{h.symbol}</span>}
        {h.risk_band && h.risk_band !== 'none' && <Badge tone={BAND[h.risk_band]}>{h.risk_band} risk</Badge>}
        {h.verified && <Badge tone="good">Verified</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
        {h.address && <span className="break-all font-mono">{h.address}</span>}
        {chains.length > 0 && <span className="capitalize">{chains.slice(0, 4).join(', ')}{chains.length > 4 ? ` and ${chains.length - 4} more` : ''}</span>}
        {h.date && <span>{h.date.slice(0, 10)}</span>}
        {(h.labels || []).slice(0, 3).map((l) => <span key={l} className="text-fg-2">{l}</span>)}
        {(h.tags || []).slice(0, 5).map((t) => <span key={t} className="rounded bg-surface-3 px-1.5 py-px text-[0.65rem] text-fg-2">{t.replaceAll('_', ' ')}</span>)}
      </div>
      {snippet && <p className="text-xs text-fg-3 [&_em]:not-italic [&_em]:text-fg" dangerouslySetInnerHTML={{ __html: highlight(snippet) }} />}
    </li>
  )
}

export default function IntelSearch() {
  const { currentOrg } = useAuth()
  const navigate = useNavigate()
  const { access, basic, full, error: accessError, status: accessStatus, reload } = useIntelAccess()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const offset = Number(params.get('offset')) || 0
  const [state, setState] = useState({ data: null, failure: null, loading: false })
  const query = params.toString()

  useEffect(() => {
    if (!basic || q.trim().length < 2) { setState({ data: null, failure: null, loading: false }); return }
    let live = true
    setState((s) => ({ ...s, loading: true }))
    const p = new URLSearchParams(query)
    p.set('limit', String(LIMIT))
    api(`/api/v1/orgs/${currentOrg.id}/intel/search?${p}`)
      .then((data) => live && setState({ data, failure: null, loading: false }),
        (err) => live && setState({ data: null, failure: { status: err.status, error: errorMessage(err) }, loading: false }))
    return () => { live = false }
  }, [basic, currentOrg.id, query, q])

  function set(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    next.delete('offset')
    setParams(next, { replace: true })
  }
  function submit(term) {
    const t = term.trim()
    const next = new URLSearchParams()
    if (t) next.set('q', t)
    setParams(next)
  }

  const back = { to: '/dashboard/intel', label: 'Intel' }
  if (accessError) return <IntelError status={accessStatus} error={accessError} onRetry={reload} />
  if (!access) return <PageSkeleton cards={2} />
  if (!basic) return <><PageHeader back={back} title="Search Intel" /><Card><Locked need="basic" what="Intel search" /></Card></>

  const d = state.data
  const filtered = FACETS.some((f) => params.get(f.param))
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title="Search Intel" description="Contracts, tokens, accounts, protocols, incidents, proposals and risk events on every chain Intel follows." />
      <SearchBox initial={q} onSearch={submit} onPick={(s) => { const to = nodePath(s.id); if (to) navigate(to) }} autoFocus={!q} />
      {q.trim().length < 2 ? (
        <Card><EmptyState title="Search across Intel">Paste an address to find it on every chain, or type a name, a symbol{full ? ', or security terms such as "selfdestruct", "delegatecall" or "tx origin"' : ''}.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className={`grid gap-4 rounded-lg border border-line bg-surface p-4 ${full && d && !Object.values(d.facets || {}).some((f) => Object.keys(f).length) && !filtered ? 'hidden lg:block lg:invisible' : ''}`} aria-label="Filters">
            {!full && <p className="text-xs text-fg-3">Filters and free text search come with the Professional plan.</p>}
            {d?.facets && FACETS.map((f) => <Facet key={f.key} facet={f} counts={d.facets[f.key]} params={params} set={set} />)}
            {filtered && <button type="button" onClick={() => { const n = new URLSearchParams({ q }); setParams(n, { replace: true }) }} className="text-left text-xs text-accent hover:underline">Clear filters</button>}
            {!d && state.loading && <div className="grid gap-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-20" /></div>}
          </aside>
          <Card flush title={d ? `${num(d.total)} ${d.total === 1 ? 'result' : 'results'}` : 'Searching'}
            description={d?.engine === 'postgres' ? 'The search engine is unavailable: these are name and address matches only.' : undefined}>
            {state.failure ? <div className="px-5 pb-5"><IntelError {...state.failure} what="Intel search" /></div>
              : !d ? <div className="grid gap-3 px-5 pb-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                : d.hits.length === 0 ? <EmptyState compact title="Nothing found">Intel knows nothing by that name or address{filtered ? ' with these filters' : ''}.</EmptyState>
                  : (
                    <>
                      <ul className={state.loading ? 'opacity-60 transition' : ''}>{d.hits.map((h) => <Hit key={h.id} h={h} />)}</ul>
                      {d.total > LIMIT && (
                        <div className="border-t border-line px-5 py-3">
                          <Pager offset={offset} limit={LIMIT} total={Math.min(d.total, 10000)} count={d.hits.length}
                            onChange={(o) => { const n = new URLSearchParams(params); n.set('offset', String(o)); setParams(n) }} />
                        </div>
                      )}
                    </>
                  )}
          </Card>
        </div>
      )}
    </div>
  )
}
