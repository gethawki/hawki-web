import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, GitBranch, Search } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../dashboard/PageHeader.jsx'
import Card from '../ui/Card.jsx'
import StatCard from '../ui/Stat.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import Modal from '../ui/Modal.jsx'
import { FilterSelect, Toolbar } from '../ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import { errorMessage } from '../common/Alert.jsx'
import { ReasonForm } from './bits.jsx'
import { SeverityTag } from './intelBits.jsx'
import { height, useIntelCrumb } from './IntelOps.jsx'
import { KindBadge, PATTERN, Priority, RESOLUTION, STATUS, Subject } from '../intel/Insights.jsx'

// The Threat Graph, search and insight pages of the admin console. Graph
// and search operations are queued here and run by intel index within
// seconds; their progress shows in the operations table.

const OP = {
  graph_check: 'Integrity check',
  graph_repair: 'Check and repair',
  graph_rebuild: 'Rebuild',
  search_check: 'Consistency check',
  search_reindex: 'Reindex',
}
const OP_STATUS = { pending: ['neutral', 'Waiting'], running: ['accent', 'Running'], done: ['good', 'Done'], failed: ['danger', 'Failed'] }

// usePolled loads an admin endpoint and refreshes it every few seconds,
// faster while an operation waits or runs.
function usePolled(path) {
  const r = useApi(path)
  const busy = r.data?.requests?.some((q) => q.status === 'pending' || q.status === 'running')
  const { reload } = r
  useEffect(() => {
    const t = setInterval(reload, busy ? 3000 : 15000)
    return () => clearInterval(t)
  }, [reload, busy])
  return r
}

function Operations({ requests, kinds, configured, onDone }) {
  const [error, setError] = useState(null)
  const open = new Set(requests.filter((q) => q.status === 'pending' || q.status === 'running').map((q) => q.kind))
  async function ask(kind, reason = '') {
    setError(null)
    try {
      await api('/api/v1/admin/intel/ops', { method: 'POST', body: { kind, reason } })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  const light = kinds.filter((k) => !k.reason)
  const heavy = kinds.filter((k) => k.reason)
  return (
    <Card flush title="Operations" description="Run by intel index, one at a time; every request is audited.">
      <div className="grid gap-3 px-5 pb-4">
        {!configured && <p className="text-xs text-fg-3">Not configured in this deployment.</p>}
        <div className="flex flex-wrap gap-2">
          {light.map((k) => (
            <Button key={k.kind} size="sm" variant="ghost" disabled={!configured || open.has(k.kind)} onClick={() => ask(k.kind)}>
              {open.has(k.kind) ? `${OP[k.kind]} queued` : OP[k.kind]}
            </Button>
          ))}
        </div>
        {heavy.map((k) => (
          <div key={k.kind} className="grid gap-1.5">
            <span className="text-xs text-fg-2">{k.reason}</span>
            {configured && !open.has(k.kind) && <ReasonForm label={OP[k.kind]} danger onSubmit={(reason) => ask(k.kind, reason)} busyLabel="Queuing" />}
          </div>
        ))}
        {error && <p role="alert" className="text-xs text-bad">{error}</p>}
      </div>
      <DataTable rows={requests} dense rowKey={(q) => q.id} empty={<EmptyState compact title="No operation asked for yet" />} columns={[
        { key: 'k', header: 'Operation', cell: (q) => <span className="text-fg">{OP[q.kind] || q.kind}</span> },
        { key: 's', header: 'Status', cell: (q) => { const [tone, label] = OP_STATUS[q.status] || ['neutral', q.status]; return <Badge tone={tone} dot={q.status === 'running'} pulse={q.status === 'running'}>{label}</Badge> } },
        { key: 'r', header: 'Reason', hide: 'md', cell: (q) => <span className="text-xs text-fg-2">{q.reason}</span> },
        { key: 'o', header: 'Outcome', hide: 'sm', cell: (q) => <span className="text-xs text-fg-3">{q.error || outcome(q)}</span> },
        { key: 'w', header: 'Asked', align: 'right', cell: (q) => <span className="whitespace-nowrap text-xs text-fg-3" title={dateTime(q.requested_at)}>{ago(q.requested_at)}</span> },
      ]} />
    </Card>
  )
}

function outcome(q) {
  const r = q.result
  if (!r) return q.status === 'done' ? 'done' : ''
  if (r.drift != null) return r.drift === 0 ? 'matches Postgres' : `${num(r.drift)} differences`
  if (r.deleted_nodes != null) return `wiped ${num(r.deleted_nodes)} nodes; projecting again`
  if (r.docs != null) return `${num(r.docs)} documents in ${r.index}`
  return ''
}

function Watermarks({ list }) {
  return (
    <Card flush title="Postgres sync" description="How far each synced table has been projected">
      <DataTable rows={list} dense rowKey={(w) => w.name} empty={<EmptyState compact title="Nothing synced yet" />} columns={[
        { key: 'n', header: 'Table', cell: (w) => <span className="font-mono text-xs text-fg">{w.name}</span> },
        { key: 'a', header: 'Synced up to', align: 'right', cell: (w) => <span className="text-xs text-fg-3" title={dateTime(w.at)}>{w.at ? ago(w.at) : '-'}</span> },
      ]} />
    </Card>
  )
}

function Unreachable({ data, what }) {
  if (!data.configured) return <Card><EmptyState icon={Database} title={`${what} is not configured`}>Set its URL for the orchestrator and intel index to keep it.</EmptyState></Card>
  if (!data.reachable) return <ErrorState>{what} did not answer: {data.error}</ErrorState>
  return null
}

const sum = (m) => Object.values(m || {}).reduce((a, b) => a + b, 0)

export function AdminIntelGraph() {
  useIntelCrumb('Threat Graph')
  const r = usePolled('/api/v1/admin/intel/graph')
  if (!r.data) return r.error ? <ErrorState onRetry={r.reload}>{r.error}</ErrorState> : <PageSkeleton cards={4} />
  const d = r.data
  const last = d.checks[0]
  const counts = (m) => Object.entries(m || {}).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }))
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Threat Graph" description="Every Intel entity and relationship in Neo4j, projected from Postgres and kept reorg safe. Refreshes on its own." />
      <Unreachable data={d} what="Neo4j" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Nodes" value={d.counts ? num(sum(d.counts.nodes)) : '-'} icon={GitBranch} />
        <StatCard label="Relationships" value={d.counts ? num(sum(d.counts.relationships)) : '-'} />
        <StatCard label="Last integrity check" value={last ? (last.drift === 0 ? 'Clean' : `${num(last.drift)} off`) : 'Never'} sub={last ? ago(last.finished_at) : undefined} tone={last && last.drift > 0 ? 'danger' : undefined} />
        <StatCard label="Rebuild epoch" value={d.state.epoch} sub={d.state.rebuilt_at ? `rebuilt ${ago(d.state.rebuilt_at)}` : 'never rebuilt'} />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card flush title="Projector lag" description="Newest block projected against the newest canonical block">
          <DataTable rows={d.state.chains} dense rowKey={(c) => c.chain} empty={<EmptyState compact title="No chain enabled" />} columns={[
            { key: 'c', header: 'Chain', cell: (c) => <span className="capitalize text-fg">{c.chain}</span> },
            { key: 'p', header: 'Projected', align: 'right', cell: (c) => <span className="tnum text-xs">{height(c.projected)}</span> },
            { key: 'h', header: 'Head', align: 'right', hide: 'sm', cell: (c) => <span className="tnum text-xs text-fg-3">{height(c.head)}</span> },
            { key: 'b', header: 'Behind', align: 'right', cell: (c) => c.behind == null ? <span className="text-fg-3">-</span> : <Badge tone={c.behind > 100 ? 'warning' : 'good'}>{num(c.behind)} blocks</Badge> },
            { key: 'u', header: 'Updated', align: 'right', hide: 'md', cell: (c) => <span className="text-xs text-fg-3">{c.updated_at ? ago(c.updated_at) : '-'}</span> },
          ]} />
        </Card>
        <Operations requests={d.requests} configured={d.configured} onDone={r.reload} kinds={[
          { kind: 'graph_check' }, { kind: 'graph_repair' },
          { kind: 'graph_rebuild', reason: 'Rebuild wipes the graph; intel index projects it again from Postgres. Graph queries answer from a partial graph meanwhile.' },
        ]} />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card flush title="Nodes by label">
          <DataTable rows={counts(d.counts?.nodes)} dense rowKey={(x) => x.name} empty={<EmptyState compact title="No count" />} columns={[
            { key: 'n', header: 'Label', cell: (x) => <span className="text-fg">{x.name}</span> },
            { key: 'c', header: 'Count', align: 'right', cell: (x) => <span className="tnum">{num(x.n)}</span> },
          ]} />
        </Card>
        <Card flush title="Relationships by type">
          <DataTable rows={counts(d.counts?.relationships)} dense rowKey={(x) => x.name} empty={<EmptyState compact title="No count" />} columns={[
            { key: 'n', header: 'Type', cell: (x) => <span className="font-mono text-xs text-fg">{x.name}</span> },
            { key: 'c', header: 'Count', align: 'right', cell: (x) => <span className="tnum">{num(x.n)}</span> },
          ]} />
        </Card>
        <div className="grid gap-4">
          <Card title="Newest analytics run">
            {!d.analytics ? <p className="text-sm text-fg-2">No run yet.</p> : (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {[['Engine', d.analytics.engine], ['Components', num(d.analytics.components)], ['Communities', num(d.analytics.communities)],
                  ['Same-actor clusters', num(d.analytics.clusters)], ['Clustered contracts', num(d.analytics.clustered_contracts)], ['Finished', ago(d.analytics.finished_at)]].map(([k, v]) => (
                  <div key={k}><dt className="text-fg-3">{k}</dt><dd className="text-fg">{v}</dd></div>
                ))}
              </dl>
            )}
          </Card>
          <Watermarks list={d.state.watermarks} />
        </div>
      </div>
      <Card flush title="Integrity checks" description="Postgres facts against the graph, per kind">
        <DataTable rows={d.checks} dense rowKey={(c) => c.id} empty={<EmptyState compact title="No check yet" />} columns={[
          { key: 'w', header: 'Finished', cell: (c) => <span className="text-xs text-fg-2" title={dateTime(c.finished_at)}>{ago(c.finished_at)}</span> },
          { key: 'r', header: 'Mode', cell: (c) => <span className="text-xs text-fg-3">{c.repair ? 'repair' : 'check'}</span> },
          { key: 'd', header: 'Result', cell: (c) => c.drift === 0 ? <Badge tone="good">Matches Postgres</Badge> : <Badge tone="warning">{num(c.drift)} differences</Badge> },
          { key: 'k', header: 'Off kinds', hide: 'sm', cell: (c) => <span className="text-xs text-fg-3">{(c.result?.findings || []).filter((f) => f.missing || f.extra).map((f) => `${f.kind} (${f.missing} missing, ${f.extra} extra)`).join(', ') || '-'}</span> },
        ]} />
      </Card>
    </div>
  )
}

export function AdminIntelSearch() {
  useIntelCrumb('Search')
  const r = usePolled('/api/v1/admin/intel/search')
  if (!r.data) return r.error ? <ErrorState onRetry={r.reload}>{r.error}</ErrorState> : <PageSkeleton cards={4} />
  const d = r.data
  const last = d.checks[0]
  const docs = d.indexes.reduce((a, x) => a + x.docs, 0)
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Search" description="One OpenSearch index of every Intel entity, behind an alias so a reindex swaps in without downtime. Refreshes on its own." />
      <Unreachable data={d} what="OpenSearch" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Documents" value={d.reachable ? num(docs) : '-'} icon={Search} />
        <StatCard label="Index health" value={d.indexes[0]?.health || '-'} tone={d.indexes.some((x) => x.health === 'red') ? 'danger' : undefined} />
        <StatCard label="Last consistency check" value={last ? (last.drift === 0 ? 'Clean' : `${num(last.drift)} off`) : 'Never'} sub={last ? ago(last.finished_at) : undefined} tone={last && last.drift > 0 ? 'danger' : undefined} />
        <StatCard label="Reindex epoch" value={d.state.epoch} sub={d.state.rebuilt_at ? `reindexed ${ago(d.state.rebuilt_at)}` : 'never reindexed'} />
      </div>
      <Card flush title="Indexes">
        <DataTable rows={d.indexes} dense rowKey={(x) => x.name} empty={<EmptyState compact title="No index" />} columns={[
          { key: 'n', header: 'Alias', cell: (x) => <span className="font-mono text-xs text-fg">{x.alias}</span> },
          { key: 'i', header: 'Current index', hide: 'sm', cell: (x) => <span className="font-mono text-xs text-fg-3">{x.index || 'missing'}</span> },
          { key: 'v', header: 'Definition', cell: (x) => <span className="text-xs">v{x.version}{x.latest > x.version ? <Badge tone="warning" className="ml-2">v{x.latest} pending</Badge> : null}</span> },
          { key: 'h', header: 'Health', cell: (x) => <Badge tone={x.health === 'green' ? 'good' : x.health === 'yellow' ? 'warning' : 'danger'} dot>{x.health || 'unknown'}</Badge> },
          { key: 'd', header: 'Documents', align: 'right', cell: (x) => <span className="tnum">{num(x.docs)}</span> },
        ]} />
      </Card>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card flush title="Documents against Postgres" description={last ? `Consistency check ${ago(last.finished_at)}` : 'No check yet'}>
          <DataTable rows={last?.result?.findings || []} dense rowKey={(f) => f.type} empty={<EmptyState compact title="No check yet" />} columns={[
            { key: 't', header: 'Type', cell: (f) => <span className="text-fg">{f.type.replace('_', ' ')}</span> },
            { key: 'e', header: 'In Postgres', align: 'right', cell: (f) => <span className="tnum">{num(f.expected)}</span> },
            { key: 'i', header: 'Indexed', align: 'right', cell: (f) => <span className={`tnum ${f.indexed !== f.expected ? 'text-warn' : ''}`}>{num(f.indexed)}</span> },
          ]} />
        </Card>
        <Operations requests={d.requests} configured={d.configured} onDone={r.reload} kinds={[
          { kind: 'search_check' },
          { kind: 'search_reindex', reason: 'Reindex rebuilds every document from Postgres into a new index and swaps the alias when it is complete (about 7 minutes on the local dataset). Search keeps answering from the old index meanwhile.' },
        ]} />
      </div>
      <Watermarks list={d.state.watermarks} />
    </div>
  )
}

const KINDS = [{ value: '', label: 'All kinds' }, { value: 'pattern', label: 'Patterns' }, { value: 'relationship', label: 'Relationships' }, { value: 'anomaly', label: 'Anomalies' }, { value: 'risk', label: 'Risk rises' }]
const NEXT = { generated: ['reviewed', 'acted_on', 'resolved'], reviewed: ['acted_on', 'resolved'], acted_on: ['resolved'] }
const ACTION = { reviewed: 'Mark reviewed', acted_on: 'Mark acted on', resolved: 'Resolve' }

function StatusDialog({ insight, status, onClose, onSaved }) {
  const [resolution, setResolution] = useState('fixed')
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api(`/api/v1/admin/intel/insights/${insight.id}/status`, { method: 'PUT', body: { status, resolution: status === 'resolved' ? resolution : '', note } })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  return (
    <Modal open onClose={onClose} title={ACTION[status]} description={insight.title}>
      <form onSubmit={save} className="grid gap-3">
        {status === 'resolved' && (
          <FilterSelect id="ins-resolution" label="Resolution" value={resolution} onChange={setResolution}
            options={[{ value: 'fixed', label: 'Fixed' }, { value: 'accepted', label: 'Risk accepted' }, { value: 'false_positive', label: 'False positive' }]} />
        )}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Note for the record (optional)" aria-label="Note"
          className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70" />
        {error && <p role="alert" className="text-xs text-bad">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving' : ACTION[status]}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AdminIntelInsights() {
  useIntelCrumb('Insights')
  const [status, setStatus] = useState('open')
  const [kind, setKind] = useState('')
  const [dialog, setDialog] = useState(null)
  const params = new URLSearchParams({ sort: 'priority', limit: '100' })
  if (status) params.set('status', status)
  if (kind) params.set('kind', kind)
  const r = useApi(`/api/v1/admin/intel/insights?${params}`)
  if (!r.data) return r.error ? <ErrorState onRetry={r.reload}>{r.error}</ErrorState> : <PageSkeleton cards={3} />
  const d = r.data
  const by = (s) => d.stats.filter((x) => x.status === s).reduce((a, x) => a + x.count, 0)
  const bands = (entity) => d.scores.filter((x) => x.entity === entity)
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Insights" description="What the analysis layer concluded, by priority. Move each one along: reviewed, acted on, resolved. Customers see the status; resolving one resolves the alerts it raised." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="New" value={num(by('generated'))} />
        <StatCard label="Reviewed" value={num(by('reviewed'))} />
        <StatCard label="Acted on" value={num(by('acted_on'))} />
        <StatCard label="Resolved" value={num(by('resolved'))} />
      </div>
      <Card flush title="Queue">
        <div className="px-5 pb-4"><Toolbar>
          <FilterSelect id="adm-ins-status" label="Status" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open' }, { value: 'generated', label: 'New' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'acted_on', label: 'Acted on' }, { value: 'resolved', label: 'Resolved' }, { value: '', label: 'All' }]} />
          <FilterSelect id="adm-ins-kind" label="Kind" value={kind} onChange={setKind} options={KINDS} />
        </Toolbar></div>
        <DataTable rows={d.insights} stale={r.stale} rowKey={(i) => i.id} empty={<EmptyState compact title="Nothing in the queue" />} columns={[
          { key: 'p', header: 'Priority', className: 'w-28', cell: (i) => <Priority value={i.priority} /> },
          { key: 's', header: 'Severity', hide: 'sm', cell: (i) => <SeverityTag severity={i.severity} /> },
          { key: 't', header: 'Insight', cell: (i) => (
            <span className="grid gap-0.5">
              <span className="text-fg">{i.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-fg-3">
                <KindBadge kind={i.kind} /><span>{PATTERN[i.pattern] || i.pattern}</span><span>{Math.round(i.confidence * 100)}%</span><Subject insight={i} />
              </span>
            </span>
          ) },
          { key: 'st', header: 'Status', hide: 'md', cell: (i) => <span className="text-xs text-fg-2">{(STATUS[i.status] || ['', i.status])[1]}{i.resolution ? `, ${RESOLUTION[i.resolution] || i.resolution}` : ''}</span> },
          { key: 'a', header: '', align: 'right', cell: (i) => (
            <span className="flex flex-wrap justify-end gap-1.5">
              {(NEXT[i.status] || []).map((st) => <Button key={st} size="sm" variant={st === 'resolved' ? 'primary' : 'ghost'} onClick={() => setDialog({ insight: i, status: st })}>{ACTION[st].replace('Mark ', '')}</Button>)}
            </span>
          ) },
        ]} />
      </Card>
      <Card title="Stored risk scores" description="By entity and band, kept current by the score job in intel index">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {['contract', 'wallet', 'protocol'].map((e) => (
            <div key={e} className="grid gap-1 text-xs">
              <span className="font-medium capitalize text-fg-2">{e}s</span>
              {bands(e).length === 0 ? <span className="text-fg-3">None yet</span> : bands(e).map((b) => (
                <span key={b.band} className="flex justify-between"><span className="text-fg-3">{b.band}</span><span className="tnum text-fg">{num(b.count)}</span></span>
              ))}
            </div>
          ))}
        </div>
      </Card>
      {dialog && <StatusDialog {...dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); r.reload() }} />}
      <p className="text-xs text-fg-3">Customers see insights in <Link to="/dashboard/intel?tab=insights" className="text-accent hover:underline">Intel</Link>.</p>
    </div>
  )
}
