import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'

// AdminHunt is the Hunt Engine as staff see it: running processes, how far
// genesis traces follow each chain, what is waiting, the heuristics in use
// and messages Hunt gave up on.
export default function AdminHunt() {
  const r = useApi('/api/v1/admin/hunt')
  if (r.error) return <div><PageHeader title="Hunt Engine" /><ErrorState onRetry={r.reload}>{r.error}</ErrorState></div>
  if (!r.data) return <PageSkeleton cards={4} />
  const s = r.data
  if (!s.installed) return <div><PageHeader title="Hunt Engine" /><Card><EmptyState title="Hunt is not installed">Run hunt migrate, then start hunt.</EmptyState></Card></div>
  const g = s.genesis || {}
  const h = s.heuristics || {}
  const scores = s.immune_scores?.by_label || {}
  const standing = Object.entries(s.clusters?.by_status || {}).filter(([k]) => k !== 'retracted').reduce((a, [, v]) => a + v, 0)
  return (
    <div className="grid gap-4">
      <PageHeader title="Hunt Engine" description="Genesis traces, rules, funding clusters, families and Digital Immune Scores, and the Intel messages Hunt reads."
        actions={<Badge tone={s.instances.length ? 'good' : 'danger'} dot>{s.instances.length ? `${s.instances.length} running` : 'Not running'}</Badge>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Genesis traces" value={num(g.traces)} sub={`${num(g.with_liquidity)} with liquidity, ${num(g.unverified)} unverified`} />
        <StatCard label="Standing clusters" value={num(standing)} sub={`${num(s.families)} cross-chain families`} />
        <StatCard label="Scored" value={num(Object.values(scores).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0))} sub={`${num(s.immune_scores?.waiting)} waiting`} />
        <StatCard label="Clusters waiting" value={num(s.clusters?.waiting)} sub="funders to group again" />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card flush title="Processes">
          <DataTable rows={s.instances} dense rowKey={(i) => i.id} empty={<EmptyState compact title="No hunt process reported in">Start hunt run.</EmptyState>} columns={[
            { key: 'id', header: 'Instance', cell: (i) => <span className="font-mono text-xs">{i.id}</span> },
            { key: 'v', header: 'Version', hide: 'sm', cell: (i) => i.version },
            { key: 'a', header: 'Intel stream', cell: (i) => <Badge tone={i.attached ? 'good' : 'warning'}>{i.attached ? 'reading' : 'waiting'}</Badge> },
            { key: 'h', header: 'Last seen', align: 'right', cell: (i) => <span className="text-fg-3" title={dateTime(i.heartbeat_at)}>{ago(i.heartbeat_at)}</span> },
          ]} />
        </Card>
        <Card flush title="Genesis cursors" description="How far traces follow each chain behind Intel's indexers.">
          <DataTable rows={s.genesis_cursors} dense rowKey={(c) => c.chain} empty={<EmptyState compact title="No chain traced yet" />} columns={[
            { key: 'c', header: 'Chain', cell: (c) => <span className="capitalize">{c.chain}</span> },
            { key: 'n', header: 'Block', align: 'right', cell: (c) => <span className="tnum">{num(c.number)}</span> },
            { key: 'u', header: 'Moved', align: 'right', cell: (c) => <span className="text-fg-3" title={dateTime(c.updated_at)}>{ago(c.updated_at)}</span> },
          ]} />
        </Card>
        <Card title="Rules fired" description={`Heuristics ${s.heuristics_digest || ''}, loaded ${s.heuristics_loaded_at ? ago(s.heuristics_loaded_at) : 'never'}.`}>
          <ul className="grid gap-2 text-sm">
            {(h.rules || []).map((rule) => (
              <li key={rule.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_5rem] items-center gap-2">
                <Badge tone={rule.enabled ? 'warning' : 'neutral'}>{rule.id}</Badge>
                <span className="truncate text-fg-2" title={rule.description}>{rule.name}</span>
                <span className="text-right text-xs text-fg-3">{rule.points} pts</span>
                <span className="text-right tnum">{num(s.rule_hits?.[rule.id] || 0)}</span>
              </li>
            ))}
          </ul>
          {h.cluster && <p className="mt-3 text-xs text-fg-3">A cluster forms at {h.cluster.min_contracts} deployments within one window; bands low {h.bands?.low}, medium {h.bands?.medium}, high {h.bands?.high}.</p>}
        </Card>
        <Card title="Digital Immune Scores">
          {['wallet', 'contract'].map((k) => (
            <div key={k} className="mb-3 grid gap-1 text-sm">
              <span className="capitalize text-fg-2">{k}s</span>
              <span className="flex flex-wrap gap-1.5">{['critical', 'high', 'medium', 'low', 'clean'].map((l) => <Badge key={l} tone={l === 'clean' ? 'good' : l === 'low' ? 'accent' : l === 'medium' ? 'warning' : 'danger'}>{l} {num(scores[k]?.[l] || 0)}</Badge>)}</span>
            </div>
          ))}
        </Card>
        <Card flush title="Intel messages" description="Risk events and insights Hunt received.">
          <DataTable rows={s.inbox} dense rowKey={(i) => `${i.source}:${i.kind}`} empty={<EmptyState compact title="Nothing received yet" />} columns={[
            { key: 's', header: 'Source', cell: (i) => i.source },
            { key: 'k', header: 'Kind', cell: (i) => i.kind },
            { key: 't', header: 'Total', align: 'right', cell: (i) => <span className="tnum">{num(i.total)}</span> },
            { key: 'd', header: 'Last day', align: 'right', hide: 'sm', cell: (i) => <span className="tnum">{num(i.last_day)}</span> },
          ]} />
        </Card>
        <Card flush title="Dead letters" description={`${s.open_dead_letters} open: messages Hunt could not handle.`}>
          <DataTable rows={s.dead_letters} dense rowKey={(d) => d.id} empty={<EmptyState compact title="No dead letters" />} columns={[
            { key: 'su', header: 'Subject', cell: (d) => <span className="font-mono text-xs">{d.subject}</span> },
            { key: 'e', header: 'Error', cell: (d) => <span className="text-xs text-fg-2">{d.error}</span> },
            { key: 'w', header: 'When', align: 'right', cell: (d) => <span className="text-fg-3" title={dateTime(d.created_at)}>{ago(d.created_at)}</span> },
          ]} />
        </Card>
      </div>
    </div>
  )
}
