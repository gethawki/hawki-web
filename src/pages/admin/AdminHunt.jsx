import { useSearchParams } from 'react-router-dom'
import { Crosshair, Gauge, Inbox, ListChecks, Server, ShieldCheck, Workflow } from 'lucide-react'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num } from '../../lib/format.js'
import { KpiStrip } from '../../components/dashboard/PageHeader.jsx'
import EngineLayout from '../../components/dashboard/EngineLayout.jsx'
import Card from '../../components/ui/Card.jsx'
import { ContributorBars, Donut } from '../../components/ui/Viz.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'

const SECTIONS = [
  {
    title: 'Hunt Engine',
    links: [
      { to: '/admin/hunt', label: 'Overview', icon: Gauge, end: true },
      { to: '/admin/hunt?tab=rules', label: 'Rules and scores', icon: ListChecks },
      { to: '/admin/hunt?tab=pipeline', label: 'Pipeline', icon: Workflow },
      { to: '/admin/hunt?tab=dead', label: 'Dead letters', icon: Inbox },
    ],
  },
]

const LABELS = ['critical', 'high', 'medium', 'low', 'clean']
const LABEL_COLOR = { critical: 'var(--color-sev-critical)', high: 'var(--color-sev-high)', medium: 'var(--color-sev-medium)', low: 'var(--color-sev-low)', clean: 'var(--color-good)' }

function Processes({ s }) {
  return (
    <Card flush title="Processes" icon={Server}>
      <DataTable rows={s.instances} dense rowKey={(i) => i.id} empty={<EmptyState compact title="No hunt process reported in">Start hunt run.</EmptyState>} columns={[
        { key: 'id', header: 'Instance', cell: (i) => <span className="font-mono text-xs">{i.id}</span> },
        { key: 'version', header: 'Version', hide: 'sm' },
        { key: 'a', header: 'Intel stream', cell: (i) => <Badge tone={i.attached ? 'good' : 'warning'}>{i.attached ? 'reading' : 'waiting'}</Badge> },
        { key: 'heartbeat_at', header: 'Last seen', align: 'right', cell: (i) => <span className="text-fg-3" title={dateTime(i.heartbeat_at)}>{ago(i.heartbeat_at)}</span> },
      ]} />
    </Card>
  )
}

function Rules({ s, h }) {
  const rules = h.rules || []
  return (
    <Card title="Rules fired" icon={ListChecks} description={`Heuristics ${s.heuristics_digest || ''}, loaded ${s.heuristics_loaded_at ? ago(s.heuristics_loaded_at) : 'never'}.`}>
      <ContributorBars items={rules.map((rule) => ({ key: rule.id, label: `${rule.id} · ${rule.name} (${rule.points} pts)`, value: s.rule_hits?.[rule.id] || 0, display: num(s.rule_hits?.[rule.id] || 0),
        color: rule.enabled ? 'var(--color-warning)' : 'var(--color-fg-3)' }))} empty="No rules loaded." />
      {h.cluster && <p className="mt-4 text-xs text-fg-3">A cluster forms at {h.cluster.min_contracts} deployments within one window; bands low {h.bands?.low}, medium {h.bands?.medium}, high {h.bands?.high}.</p>}
    </Card>
  )
}

function Scores({ scores }) {
  return (
    <Card title="Digital Immune Scores" icon={ShieldCheck} description="Every scored wallet and contract by band">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {['wallet', 'contract'].map((k) => (
          <div key={k}>
            <div className="mb-3 text-sm font-medium capitalize text-fg">{k}s</div>
            <Donut size={120} stroke={14} centerLabel={`${k}s`} parts={LABELS.map((l) => ({ label: l.charAt(0).toUpperCase() + l.slice(1), value: scores[k]?.[l] || 0, color: LABEL_COLOR[l] }))} />
          </div>
        ))}
      </div>
    </Card>
  )
}

// AdminHunt is the Hunt Engine as staff see it, in sections: what it has
// built and whether it runs, the rules and scores, the pipeline from Intel
// and the messages it gave up on.
export default function AdminHunt() {
  const [params] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const r = useApi('/api/v1/admin/hunt')
  const frame = (body, status) => <EngineLayout name="Hunt Engine" icon={Crosshair} sections={SECTIONS} status={status}
    description="Genesis traces, rules, funding clusters, families and Digital Immune Scores, and the Intel messages Hunt reads.">{body}</EngineLayout>
  if (r.error) return frame(<ErrorState onRetry={r.reload}>{r.error}</ErrorState>)
  if (!r.data) return frame(<PageSkeleton cards={4} />)
  const s = r.data
  if (!s.installed) return frame(<Card><EmptyState title="Hunt is not installed">Run hunt migrate, then start hunt.</EmptyState></Card>)
  const g = s.genesis || {}
  const h = s.heuristics || {}
  const scores = s.immune_scores?.by_label || {}
  const standing = Object.entries(s.clusters?.by_status || {}).filter(([k]) => k !== 'retracted').reduce((a, [, v]) => a + v, 0)
  const scored = Object.values(scores).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0)
  const status = <Badge tone={s.instances.length ? 'good' : 'danger'} dot>{s.instances.length ? `${s.instances.length} running` : 'Not running'}</Badge>
  return frame(
    <div className="grid gap-4">
      {tab === 'overview' && (
        <>
          <KpiStrip items={[
            { label: 'Genesis traces', value: num(g.traces), note: `${num(g.with_liquidity)} with liquidity` },
            { label: 'Unverified', value: num(g.unverified), tone: g.unverified ? 'warn' : undefined },
            { label: 'Standing clusters', value: num(standing), note: `${num(s.families)} cross-chain families` },
            { label: 'Scored', value: num(scored), note: `${num(s.immune_scores?.waiting)} waiting` },
            { label: 'Clusters waiting', value: num(s.clusters?.waiting), note: 'funders to group again' },
            { label: 'Dead letters', value: num(s.open_dead_letters), tone: s.open_dead_letters ? 'bad' : 'good' },
          ]} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Scores scores={scores} />
            <Rules s={s} h={h} />
          </div>
          <Processes s={s} />
        </>
      )}
      {tab === 'rules' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Rules s={s} h={h} />
          <Scores scores={scores} />
        </div>
      )}
      {tab === 'pipeline' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card flush title="Genesis cursors" icon={Workflow} description="How far traces follow each chain behind Intel's indexers.">
            <DataTable rows={s.genesis_cursors} dense rowKey={(c) => c.chain} empty={<EmptyState compact title="No chain traced yet" />} columns={[
              { key: 'chain', header: 'Chain', cell: (c) => <span className="capitalize">{c.chain}</span> },
              { key: 'number', header: 'Block', align: 'right', cell: (c) => <span className="tnum">{num(c.number)}</span> },
              { key: 'updated_at', header: 'Moved', align: 'right', cell: (c) => <span className="text-fg-3" title={dateTime(c.updated_at)}>{ago(c.updated_at)}</span> },
            ]} />
          </Card>
          <Card flush title="Intel messages" icon={Inbox} description="Risk events and insights Hunt received.">
            <DataTable rows={s.inbox} dense rowKey={(i) => `${i.source}:${i.kind}`} empty={<EmptyState compact title="Nothing received yet" />} columns={[
              { key: 'source', header: 'Source' },
              { key: 'kind', header: 'Kind' },
              { key: 'total', header: 'Total', align: 'right', cell: (i) => <span className="tnum">{num(i.total)}</span> },
              { key: 'last_day', header: 'Last day', align: 'right', hide: 'sm', cell: (i) => <span className="tnum">{num(i.last_day)}</span> },
            ]} />
          </Card>
          <div className="xl:col-span-2"><Processes s={s} /></div>
        </div>
      )}
      {tab === 'dead' && (
        <Card flush title="Dead letters" icon={Inbox} description={`${s.open_dead_letters} open: messages Hunt could not handle.`}>
          <DataTable rows={s.dead_letters} dense rowKey={(d) => d.id} empty={<EmptyState compact title="No dead letters" />} columns={[
            { key: 'subject', header: 'Subject', cell: (d) => <span className="font-mono text-xs">{d.subject}</span> },
            { key: 'error', header: 'Error', cell: (d) => <span className="text-xs text-fg-2">{d.error}</span> },
            { key: 'created_at', header: 'When', align: 'right', cell: (d) => <span className="text-fg-3" title={dateTime(d.created_at)}>{ago(d.created_at)}</span> },
          ]} />
        </Card>
      )}
    </div>,
    status,
  )
}
