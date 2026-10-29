import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Activity, Boxes, FileCode2, Gauge, GitBranch, History, Inbox, Landmark, Lightbulb, Network, Plug, Search, ShieldAlert, Coins, Skull } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { useDetailCrumb } from '../../lib/crumbs.jsx'
import { ago, dateTime, num } from '../../lib/format.js'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import { errorMessage } from '../common/Alert.jsx'
import { ReasonForm } from './bits.jsx'
import { Meter } from '../charts/Small.jsx'

// The Intel Engine section of the admin console: a layout with its own
// navigation, and the pieces its operations pages share.

const SECTIONS = [
  {
    title: 'Operations',
    links: [
      { to: '/admin/intel', label: 'Overview', icon: Gauge, end: true },
      { to: '/admin/intel/chains', label: 'Chains', icon: Network },
      { to: '/admin/intel/indexing', label: 'Indexing', icon: Inbox },
      { to: '/admin/intel/sources', label: 'Data sources', icon: Plug },
      { to: '/admin/intel/audit', label: 'Audit', icon: History },
    ],
  },
  {
    title: 'Graph and search',
    links: [
      { to: '/admin/intel/graph', label: 'Threat Graph', icon: GitBranch },
      { to: '/admin/intel/search', label: 'Search', icon: Search },
      { to: '/admin/intel/insights', label: 'Insights', icon: Lightbulb },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { to: '/admin/intel/contracts', label: 'Contracts', icon: FileCode2 },
      { to: '/admin/intel/tokens', label: 'Wallets and tokens', icon: Coins },
      { to: '/admin/intel/control', label: 'Upgrades and admin', icon: ShieldAlert },
      { to: '/admin/intel/governance', label: 'Governance', icon: Landmark },
      { to: '/admin/intel/protocols', label: 'Protocols', icon: Boxes },
      { to: '/admin/intel/risk', label: 'Risk and exploits', icon: Skull },
    ],
  },
]

// IntelLayout puts the section navigation beside the page: a column on wide
// screens, a scrolling row on phones.
export function IntelLayout() {
  const link = ({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${isActive ? 'bg-surface-3 text-fg' : 'text-fg-3 hover:bg-surface-2 hover:text-fg'}`
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
      <nav aria-label="Intel Engine" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="mb-3 hidden items-center gap-2 px-2.5 text-xs font-medium uppercase tracking-wide text-fg-3 lg:flex"><Activity size={13} aria-hidden />Intel Engine</div>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 scrollbar-thin lg:mx-0 lg:grid lg:gap-4 lg:overflow-visible lg:px-0">
          {SECTIONS.map((s) => (
            <div key={s.title} className="flex shrink-0 gap-1 lg:grid lg:gap-0.5">
              <div className="hidden px-2.5 pb-1 text-[0.7rem] text-fg-3 lg:block">{s.title}</div>
              {s.links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={link}>
                  <l.icon size={14} aria-hidden className="shrink-0" />{l.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0"><Suspense fallback={<PageSkeleton cards={4} />}><Outlet /></Suspense></div>
    </div>
  )
}

// useIntelStatus loads the parts of the Intel status a page shows and
// refreshes them every 10 seconds. query is what changes send along so
// their answer carries the same parts.
export function useIntelStatus(parts, { chain = '', auditLimit = 0, every = 10000 } = {}) {
  const params = new URLSearchParams({ parts: parts.join(',') })
  if (chain) params.set('chain', chain)
  if (auditLimit) params.set('audit_limit', String(auditLimit))
  const query = `?${params}`
  const r = useApi(`/api/v1/admin/intel${query}`)
  const { reload } = r
  useEffect(() => {
    if (!every) return
    const t = setInterval(reload, every)
    return () => clearInterval(t)
  }, [reload, every])
  // Reprocessing answers 202 without a body; the next load shows it.
  const changed = (st) => (st ? r.setData(st) : reload())
  return { ...r, query, changed }
}

// useIntelCrumb names a page of the section in the breadcrumb.
export function useIntelCrumb(label) {
  useDetailCrumb(label)
}

const STATUS = {
  ok: ['good', 'Healthy'],
  degraded: ['warning', 'Degraded'],
  down: ['danger', 'Down'],
  mismatch: ['danger', 'Wrong chain'],
  pending: ['neutral', 'Starting'],
  disabled: ['neutral', 'Disabled'],
}

export function ChainStatus({ status }) {
  const [tone, label] = STATUS[status] || ['neutral', status]
  return <Badge tone={tone} dot>{label}</Badge>
}

// Block heights are shown in full: operators compare them digit by digit.
export const height = (n) => (n != null ? n.toLocaleString('en') : '-')
export const blockTime = (ms) => (ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`)

// chainHead is the best head we know: the probe samples it every few
// seconds while ingestion moves on continuously.
export function chainHead(c) {
  return c.head_number != null && c.ingested_number != null ? Math.max(c.head_number, c.ingested_number) : c.head_number
}

export function chainLag(c) {
  const head = chainHead(c)
  return head != null && c.ingested_number != null ? head - c.ingested_number : null
}

export const lagIsHigh = (c) => {
  const lag = chainLag(c)
  return lag != null && lag > c.confirmations + 50
}

// Ingestion pauses and resumes from here; the Intel service picks the
// change up on its next step.
export function PauseControl({ c, query, onChanged }) {
  const [error, setError] = useState(null)
  async function set(paused, reason = '') {
    setError(null)
    try {
      onChanged(await api(`/api/v1/admin/intel/chains/${c.name}/pause${query}`, { method: 'PUT', body: { paused, reason } }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <div className="grid gap-2">
      <div className="text-xs text-fg-3">Ingestion</div>
      {c.paused
        ? <div className="flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => set(false)}>Resume ingestion</Button><span className="text-xs text-fg-3">Paused: {c.paused_reason}</span></div>
        : <ReasonForm label="Pause ingestion" danger placeholder="Why (kept in the Intel and platform audit)" onSubmit={(reason) => set(true, reason)} />}
      {error && <p className="text-xs text-[#ff8b8b]">{error}</p>}
    </div>
  )
}

const inputCls = 'h-9 min-w-0 rounded-lg bg-surface border border-line-strong px-3 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70'

// Reprocessing fetches a range again, replaces any stored block that differs
// from the chain and sends every block to the indexers once more.
export function ReprocessForm({ c, query, onChanged }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const valid = /^\d+$/.test(from) && /^\d+$/.test(to) && Number(to) >= Number(from) && reason.trim().length >= 3
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onChanged(await api(`/api/v1/admin/intel/chains/${c.name}/reprocess${query}`, { method: 'POST', body: { from: Number(from), to: Number(to), reason } }))
      setFrom('')
      setTo('')
      setReason('')
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  return (
    <form className="grid gap-2" onSubmit={submit}>
      <div className="text-xs text-fg-3">Reprocess blocks (up to 100,000, at or below block {height(c.ingested_number)})</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_8rem_1fr_auto]">
        <input aria-label={`${c.name} reprocess from block`} inputMode="numeric" placeholder="From block" value={from} onChange={(e) => setFrom(e.target.value.trim())} className={inputCls} />
        <input aria-label={`${c.name} reprocess to block`} inputMode="numeric" placeholder="To block" value={to} onChange={(e) => setTo(e.target.value.trim())} className={inputCls} />
        <input aria-label={`${c.name} reprocess reason`} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} col-span-2 sm:col-span-1`} />
        <Button size="sm" type="submit" disabled={busy || !valid} className="col-span-2 sm:col-span-1">{busy ? 'Queueing' : 'Reprocess'}</Button>
      </div>
      {error && <p className="text-xs text-[#ff8b8b]">{error}</p>}
    </form>
  )
}

// Integrity: how far stored blocks have been re-checked for gaps and broken
// parent links, and what was found.
export function Integrity({ c }) {
  const i = c.integrity
  const found = i ? i.gaps_found + i.breaks_found : 0
  if (!i) return <p className="text-sm text-fg-2">Not checked yet.</p>
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {found > 0 ? <Badge tone="warning" dot>Problems found and repaired</Badge> : <Badge tone="good" dot>No problems found</Badge>}
        <span className="text-xs text-fg-3">checked {ago(i.last_run_at)}</span>
      </div>
      <div className="text-fg-2">Verified through block <span className="text-fg tnum">{height(i.checked_through)}</span></div>
      <div className="text-fg-2"><span className="text-fg tnum">{num(i.gaps_found)}</span> missing blocks and <span className="text-fg tnum">{num(i.breaks_found)}</span> broken links found{found > 0 && i.last_problem_at ? `, the last ${ago(i.last_problem_at)}` : ''}</div>
    </div>
  )
}

export function Backfill({ c }) {
  if (c.backfill_next == null) return <p className="text-sm text-fg-2">No backfill: the chain started at its head.</p>
  const total = c.backfill_target - c.backfill_start
  const done = c.backfill_next - c.backfill_start
  const finished = c.backfill_next >= c.backfill_target
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-fg-2">From block {height(c.backfill_start)} to {height(c.backfill_target)}</span>
        <span className="text-fg tnum">{finished ? 'Finished' : `${total > 0 ? Math.floor((done / total) * 100) : 100}% · ${height(Math.max(0, c.backfill_target - c.backfill_next))} blocks left`}</span>
      </div>
      <Meter value={done} max={Math.max(1, total)} label={`${c.name} backfill progress`} />
    </div>
  )
}

export function EndpointsTable({ endpoints }) {
  return (
    <DataTable rows={endpoints} rowKey={(e) => e.label} dense
      empty={<EmptyState compact title="No endpoints probed yet" />}
      columns={[
        { key: 'label', header: 'Endpoint', cell: (e) => <span className="break-all font-mono text-xs text-fg">{e.label}</span> },
        { key: 'p', header: 'Priority', align: 'right', hide: 'sm', cell: (e) => <span className="text-fg-3">{e.priority}</span> },
        { key: 'up', header: 'Status', cell: (e) => <Badge tone={e.healthy ? 'good' : 'danger'} dot>{e.healthy ? 'Up' : 'Down'}</Badge> },
        { key: 'head', header: 'Head', align: 'right', hide: 'sm', cell: (e) => height(e.head_number) },
        { key: 'lat', header: 'Latency', align: 'right', cell: (e) => <span className="whitespace-nowrap">{e.latency_ms != null ? `${e.latency_ms} ms` : '-'}</span> },
        { key: 'err', header: 'Last error', hide: 'md', cell: (e) => <span className="text-xs text-fg-3">{e.last_error || '-'}</span> },
        { key: 'at', header: 'Checked', align: 'right', hide: 'lg', cell: (e) => <span className="whitespace-nowrap text-fg-3">{ago(e.checked_at)}</span> },
      ]} />
  )
}

export function IndexersTable({ rows, showChain = true }) {
  return (
    <DataTable rows={rows} rowKey={(x) => `${x.indexer}:${x.chain}`} dense
      empty={<EmptyState compact title="No indexer has run yet">Start <code className="font-mono">intel index</code>.</EmptyState>}
      columns={[
        { key: 'name', header: 'Indexer', cell: (x) => <span className="font-mono text-xs text-fg">{x.indexer}</span> },
        showChain && { key: 'chain', header: 'Chain', cell: (x) => x.chain ? <Link to={`/admin/intel/chains/${x.chain}`} className="capitalize text-fg-2 hover:underline">{x.chain}</Link> : '-' },
        { key: 'num', header: 'Indexed', align: 'right', cell: (x) => <span className="tnum">{height(x.number)}</span> },
        { key: 'lag', header: 'Behind', align: 'right', cell: (x) => <span className={`whitespace-nowrap tnum ${x.lag > 100 ? 'text-[#f5dfae]' : ''}`}>{x.lag != null ? `${height(x.lag)} blocks` : '-'}</span> },
        { key: 'dl', header: 'Dead letters', align: 'right', cell: (x) => x.dead_letters > 0 ? <Badge tone="danger">{num(x.dead_letters)}</Badge> : <span className="text-fg-3">0</span> },
        { key: 'at', header: 'Updated', align: 'right', hide: 'sm', cell: (x) => <span className="whitespace-nowrap text-fg-3">{x.updated_at ? ago(x.updated_at) : '-'}</span> },
      ].filter(Boolean)} />
  )
}

const REPAIR = { pending: ['warning', 'Running'], done: ['good', 'Done'], failed: ['danger', 'Failed'] }

export function RepairsTable({ rows, showChain = true }) {
  return (
    <DataTable rows={rows} rowKey={(r) => r.id} dense empty={<EmptyState compact title="No repairs yet" />} columns={[
      { key: 'when', header: 'Queued', cell: (r) => <span className="whitespace-nowrap text-fg-3" title={dateTime(r.created_at)}>{ago(r.created_at)}</span> },
      showChain && { key: 'chain', header: 'Chain', cell: (r) => <span className="capitalize text-fg-2">{r.chain}</span> },
      { key: 'kind', header: 'Kind', cell: (r) => <span className="font-mono text-xs text-fg">{r.kind}</span> },
      { key: 'range', header: 'Blocks', cell: (r) => <span className="whitespace-nowrap tnum">{r.from === r.to ? height(r.from) : `${height(r.from)} to ${height(r.to)}`}</span> },
      { key: 'status', header: 'Status', cell: (r) => {
        const [tone, label] = REPAIR[r.status] || ['neutral', r.status]
        const total = r.to - r.from + 1
        return <span className="flex items-center gap-2"><Badge tone={tone} dot>{label}</Badge>{r.status === 'pending' && <span className="text-xs text-fg-3 tnum">{Math.floor(((r.next - r.from) / total) * 100)}%</span>}</span>
      } },
      { key: 'fix', header: 'Fixed', align: 'right', hide: 'sm', cell: (r) => <span className="whitespace-nowrap text-fg-2">{r.filled} filled · {r.replaced} replaced</span> },
      { key: 'reason', header: 'Reason', hide: 'md', cell: (r) => <span className="text-fg-2">{r.error ? <span className="text-[#ff8b8b]">{r.error}</span> : r.reason}</span> },
    ].filter(Boolean)} />
  )
}

export function AuditTable({ rows, showChain = true }) {
  return (
    <DataTable rows={rows} rowKey={(a) => a.id} dense empty={<EmptyState compact title="Nothing recorded yet" />} columns={[
      { key: 'when', header: 'When', cell: (a) => <span className="whitespace-nowrap text-fg-3" title={dateTime(a.occurred_at)}>{ago(a.occurred_at)}</span> },
      showChain && { key: 'chain', header: 'Chain', cell: (a) => <span className="capitalize text-fg-2">{a.chain || '-'}</span> },
      { key: 'action', header: 'Action', cell: (a) => <span className="font-mono text-xs text-fg">{a.action}</span> },
      { key: 'reason', header: 'Reason', hide: 'sm', cell: (a) => <span className="text-fg-2">{a.reason}</span> },
      { key: 'actor', header: 'By', align: 'right', hide: 'md', cell: (a) => <span className="text-fg-3">{a.actor_email || a.actor}</span> },
    ].filter(Boolean)} />
  )
}
