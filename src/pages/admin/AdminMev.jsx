import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Gauge, Inbox, Radar, Radio, Target, Zap } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num, pct } from '../../lib/format.js'
import { KpiStrip } from '../../components/dashboard/PageHeader.jsx'
import EngineLayout from '../../components/dashboard/EngineLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import { ContributorBars } from '../../components/ui/Viz.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { PATTERNS, PredictionStatus } from '../../components/mev/MevKit.jsx'

const SECTIONS = [
  {
    title: 'MEV Intelligence',
    links: [
      { to: '/admin/mev', label: 'Overview', icon: Gauge, end: true },
      { to: '/admin/mev?tab=sources', label: 'Sources', icon: Radio },
      { to: '/admin/mev?tab=predictions', label: 'Predictions', icon: Zap },
      { to: '/admin/mev?tab=detections', label: 'Mined attacks', icon: Radar },
      { to: '/admin/mev?tab=accuracy', label: 'Accuracy', icon: Target },
      { to: '/admin/mev?tab=dead', label: 'Dead letters', icon: Inbox },
    ],
  },
]

// AdminMev is MEV Intelligence as staff see it: processes and their
// mempool sources per chain, mined block heads, counts, accuracy, the
// latest predictions and mined attacks, and analyses that failed.
export default function AdminMev() {
  const r = useApi('/api/v1/admin/mev')
  const [msg, setMsg] = useState(null)
  const [params] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const frame = (body, status) => <EngineLayout name="MEV Intelligence" icon={Zap} sections={SECTIONS} status={status}
    description="Mempool sources, the prediction pipeline, simulations on warm forks, mined block detection and every pattern's track record.">{body}</EngineLayout>
  if (r.error) return frame(<ErrorState onRetry={r.reload}>{r.error}</ErrorState>)
  if (!r.data) return frame(<PageSkeleton cards={4} />)
  const s = r.data
  if (!s.installed) return frame(<Card><EmptyState title="MEV is not installed">Run mev migrate, then start mev.</EmptyState></Card>)
  const live = (s.instances || []).filter((i) => Date.now() - new Date(i.heartbeat_at) < 60000)
  const chains = []
  for (const i of live) for (const [name, st] of Object.entries(i.stats || {})) chains.push({ name, ...st })
  const heads = Object.fromEntries((s.heads || []).map((h) => [h.chain, h]))
  const c = s.counts || {}
  async function retry(id) {
    setMsg(null)
    try {
      await api(`/api/v1/admin/mev/requests/${id}/retry`, { method: 'POST' })
      setMsg({ tone: 'info', text: `Analysis ${id} is queued again.` })
      r.reload()
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }
  const status = <Badge tone={live.length ? 'good' : 'danger'} dot>{live.length ? `${live.length} running` : 'Not running'}</Badge>
  const acc = (s.accuracy || []).map((a) => ({ ...a, decided: (a.confirmed || 0) + (a.false_positive || 0) + (a.missed || 0) }))
  return frame(
    <div className="grid grid-cols-1 gap-4">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {tab === 'overview' && (
        <>
          <KpiStrip items={[
            { label: 'Pending predictions', value: num(c.pending_predictions), note: `${num(c.predictions_24h)} in 24 hours` },
            { label: 'Happened, 24h', value: num(c.confirmed_24h), note: 'confirmed by mined blocks', tone: c.confirmed_24h ? 'warn' : undefined },
            { label: 'Mined attacks, 24h', value: num(c.detections_24h), note: 'sandwiches and confirmed attacks' },
            { label: 'Transactions kept', value: num(c.transactions_24h), note: `${num(c.targets)} targets by hand` },
            { label: 'Sources up', value: `${chains.reduce((a, x) => a + (x.sources || []).filter((y) => y.connected).length, 0)} / ${chains.reduce((a, x) => a + (x.sources || []).length, 0)}`, note: `${chains.length} chains` },
          ]} />
          <Card title="Pattern precision, 30 days" icon={Target} description="What happened over what was decided, per pattern and chain">
            <ContributorBars max={1} format={(v) => pct(v)} empty="No decided predictions yet."
              items={acc.filter((a) => a.decided > 0).slice(0, 8).map((a) => ({ key: `${a.chain}:${a.pattern}`, label: `${PATTERNS[a.pattern] || a.pattern} on ${a.chain} (${a.decided} decided)`, value: a.precision ?? 0,
                color: (a.precision ?? 0) >= 0.7 ? 'var(--color-good)' : (a.precision ?? 0) >= 0.4 ? 'var(--color-warning)' : 'var(--color-critical)' }))} />
          </Card>
        </>
      )}
      {(tab === 'overview' || tab === 'sources') && (
        <Card flush title="Chains and sources" description="A chain without a public mempool (a private sequencer) is followed for mined blocks only.">
          <DataTable rows={chains} dense rowKey={(x) => x.name} empty={<EmptyState compact title="No mev process reported in">Start mev run.</EmptyState>} columns={[
            { key: 'n', header: 'Chain', cell: (x) => <span className="capitalize">{x.name}</span> },
            { key: 'h', header: 'Head', align: 'right', cell: (x) => <span className="tnum">{num(x.head)}</span> },
            { key: 'a', header: 'Behind', align: 'right', hide: 'sm', cell: (x) => <span className="text-fg-3">{heads[x.name] ? ago(heads[x.name].block_time) : '-'}</span> },
            { key: 'p', header: 'Pending', align: 'right', cell: (x) => <span className="tnum">{num(x.pending)}</span> },
            { key: 's', header: 'Sources', cell: (x) => (x.mempool ? <span className="flex flex-wrap gap-1">{x.sources.map((src) => (
              <Badge key={src.name} tone={src.connected ? 'good' : 'danger'}>{src.kind} {num(src.received)}{src.errors ? `, ${src.errors} errors` : ''}</Badge>))}</span>
              : <span className="text-xs text-fg-3">mined blocks only</span>) },
            { key: 'f', header: 'Forks', hide: 'md', cell: (x) => <Badge tone={x.simulate ? 'good' : 'neutral'}>{x.simulate ? 'on' : 'off'}</Badge> },
            { key: 't', header: 'Targets', align: 'right', hide: 'lg', cell: (x) => <span className="tnum">{num(x.targets)}</span> },
          ]} />
        </Card>
      )}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {(tab === 'overview' || tab === 'predictions') && (
          <Card flush title="Latest predictions">
            <DataTable rows={s.predictions} dense rowKey={(p) => p.id} empty={<EmptyState compact title="No prediction yet" />} columns={[
              { key: 's', header: 'Severity', cell: (p) => <SeverityBadge value={p.severity} /> },
              { key: 't', header: 'Prediction', cell: (p) => <span className="grid"><span>{p.title}</span><span className="text-xs text-fg-3">{p.chain}, {p.latency_ms ?? '-'} ms</span></span> },
              { key: 'o', header: 'Outcome', hide: 'sm', cell: (p) => <PredictionStatus status={p.status} /> },
              { key: 'w', header: 'When', align: 'right', cell: (p) => <span className="text-fg-3" title={dateTime(p.created_at)}>{ago(p.created_at)}</span> },
            ]} />
          </Card>
        )}
        {(tab === 'overview' || tab === 'detections') && (
          <Card flush title="Mined attacks">
            <DataTable rows={s.detections} dense rowKey={(d) => d.id} empty={<EmptyState compact title="None found yet" />} columns={[
              { key: 'k', header: 'Attack', cell: (d) => PATTERNS[d.kind] || d.kind },
              { key: 'c', header: 'Chain', cell: (d) => <span className="capitalize">{d.chain}</span> },
              { key: 'b', header: 'Block', align: 'right', cell: (d) => <span className="tnum">{num(d.block_number)}</span> },
              { key: 'p', header: 'Predicted', align: 'right', hide: 'sm', cell: (d) => (d.prediction_id ? `#${d.prediction_id}` : <span className="text-fg-3">no</span>) },
            ]} />
          </Card>
        )}
        {(tab === 'accuracy') && (
          <Card flush title="Accuracy, 30 days" description="Precision is what happened over what was decided; at 20 decided a pattern's precision replaces its library prior.">
            <DataTable rows={s.accuracy} dense rowKey={(a) => `${a.chain}:${a.pattern}`} empty={<EmptyState compact title="No predictions yet" />} columns={[
              { key: 'p', header: 'Pattern', cell: (a) => PATTERNS[a.pattern] || a.pattern },
              { key: 'c', header: 'Chain', hide: 'sm', cell: (a) => <span className="capitalize">{a.chain}</span> },
              { key: 't', header: 'Total', align: 'right', cell: (a) => <span className="tnum">{num(a.total)}</span> },
              { key: 'd', header: 'Dropped', align: 'right', hide: 'md', cell: (a) => <span className="tnum">{num(a.dropped)}</span> },
              { key: 'pr', header: 'Precision', align: 'right', cell: (a) => <span className="tnum">{a.confirmed + a.false_positive + a.missed ? pct(a.precision) : '-'}</span> },
            ]} />
          </Card>
        )}
        {(tab === 'dead') && (
          <Card flush title="Dead letters" description="Analyses that did not finish. Retrying queues them again; a paid analysis is not charged twice.">
            <DataTable rows={s.failed_requests} dense rowKey={(q) => q.id} empty={<EmptyState compact title="No failed analyses" />} columns={[
              { key: 'i', header: 'Analysis', cell: (q) => `#${q.id} ${q.chain}` },
              { key: 'e', header: 'Error', cell: (q) => <span className="text-xs text-fg-2">{q.error}</span> },
              { key: 'r', header: '', align: 'right', cell: (q) => <Button size="sm" variant="ghost" onClick={() => retry(q.id)}>Retry</Button> },
            ]} />
          </Card>
        )}
      </div>
      <p className="text-xs text-fg-3">Library {s.library_digest || '-'}. <Link to="/admin/watch" className="hover:underline">Watch</Link> feeds MEV its pool, oracle and lending state.</p>
    </div>,
    status,
  )
}
