import { useState } from 'react'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { BillingBadge, EpisodeStatus, HealthBadge, LevelBadge, credits } from '../../components/watch/WatchKit.jsx'

// AdminWatch is the Watch Engine as staff see it: processes, where each
// chain's head and last check are, checks and RPC calls a second, monitors
// by organization, charges, protocols in grace or paused, and requests
// Watch could not finish.
export default function AdminWatch() {
  const r = useApi('/api/v1/admin/watch/overview')
  const [msg, setMsg] = useState(null)
  if (r.error) return <div><PageHeader title="Watch Engine" /><ErrorState onRetry={r.reload}>{r.error}</ErrorState></div>
  if (!r.data) return <PageSkeleton cards={4} />
  const s = r.data
  if (!s.installed) return <div><PageHeader title="Watch Engine" /><Card><EmptyState title="Watch is not installed">Run watch migrate, then start watch.</EmptyState></Card></div>
  const live = (s.instances || []).filter((i) => Date.now() - new Date(i.heartbeat_at) < 60000)
  const rates = Object.fromEntries((s.rates || []).map((x) => [x.chain, x]))
  const rpc = {}
  for (const i of live) for (const [chain, st] of Object.entries(i.stats || {})) rpc[chain] = st
  const m = s.monitors || {}
  const chargedWeek = (s.charges || []).filter((c) => c.outcome === 'charged' && Date.now() - new Date(c.day) < 7 * 864e5).reduce((a, c) => a + c.millicredits, 0)
  async function retry(id) {
    setMsg(null)
    try {
      await api(`/api/v1/admin/watch/requests/${id}/retry`, { method: 'POST' })
      setMsg({ tone: 'info', text: `Request ${id} is queued again.` })
      r.reload()
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }
  return (
    <div className="grid gap-4">
      <PageHeader title="Watch Engine" description="Head followers, state reads, invariant checks, violations and daily billing of every monitored protocol."
        actions={<Badge tone={live.length ? 'good' : 'danger'} dot>{live.length ? `${live.length} running` : 'Not running'}</Badge>} />
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active monitors" value={num(m.active)} sub={`${num(m.paused)} paused, ${num(m.catalog)} in the catalogue`} />
        <StatCard label="Components" value={num(m.components)} sub={`${num(m.degraded)} degraded`} tone={m.degraded ? 'danger' : undefined} />
        <StatCard label="Open episodes" value={num(m.open_violations)} sub={`${num(m.open_critical)} critical, ${num(m.open_high)} high`} tone={m.open_critical ? 'danger' : undefined} />
        <StatCard label="Charged, 7 days" value={`${credits(chargedWeek)} cr`} sub={`${(s.billing_trouble || []).length} protocols in grace or paused`} />
      </div>
      <Card flush title="Chains" description="Head lag is the chain head an endpoint reports minus the last block checked; checks a second over the last minute; RPC requests a second over the last heartbeat.">
        <DataTable rows={s.heads} dense rowKey={(h) => h.chain} empty={<EmptyState compact title="No chain followed yet" />} columns={[
          { key: 'c', header: 'Chain', cell: (h) => <span className="capitalize">{h.chain}</span> },
          { key: 'n', header: 'Last checked', align: 'right', cell: (h) => <span className="tnum">{num(h.number)}</span> },
          { key: 'l', header: 'Head lag', align: 'right', cell: (h) => <Badge tone={h.head - h.number > 5 ? 'warning' : 'good'}>{h.head - h.number} blocks</Badge> },
          { key: 'a', header: 'Behind time', align: 'right', hide: 'sm', cell: (h) => <span className="tnum text-fg-2">{Math.max(0, Math.round((new Date(h.checked_at) - new Date(h.block_time)) / 100) / 10)} s</span> },
          { key: 'r', header: 'Checks/s', align: 'right', cell: (h) => <span className="tnum">{rates[h.chain]?.checks_per_second ?? '-'}</span> },
          { key: 'p', header: 'RPC/s', align: 'right', cell: (h) => <span className="tnum">{rpc[h.chain]?.rpc_per_second ?? '-'}</span> },
          { key: 't', header: 'RPC total', align: 'right', hide: 'md', cell: (h) => <span className="tnum text-fg-3">{num(rpc[h.chain]?.rpc_requests)}</span> },
          { key: 'e', header: 'Endpoints', hide: 'lg', cell: (h) => <span className="flex flex-wrap gap-1">{(rpc[h.chain]?.endpoints || []).map((e) => (
            <Badge key={e.label} tone={e.open ? 'danger' : e.failures ? 'warning' : 'good'}>{e.label}{e.open ? ' skipped' : ''}</Badge>
          ))}</span> },
          { key: 'k', header: 'Checks', align: 'right', hide: 'lg', cell: (h) => <span className="tnum text-fg-3">{num(h.checks)}{h.skipped ? `, ${num(h.skipped)} skipped` : ''}</span> },
        ]} />
      </Card>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card flush title="Monitors by organization">
          <DataTable rows={s.by_org} dense rowKey={(o) => o.org_id} empty={<EmptyState compact title="No customer monitors yet" />} columns={[
            { key: 'n', header: 'Organization', cell: (o) => o.org_name || o.org_id },
            { key: 'a', header: 'Active', align: 'right', cell: (o) => <span className="tnum">{o.active}{o.paused ? ` (+${o.paused} paused)` : ''}</span> },
            { key: 'l', header: 'Std / Full', align: 'right', hide: 'sm', cell: (o) => <span className="tnum">{o.standard} / {o.full}</span> },
            { key: 'v', header: 'Open', align: 'right', cell: (o) => <span className="tnum">{o.open_violations}</span> },
            { key: 'c', header: '30 days', align: 'right', hide: 'md', cell: (o) => <span className="tnum">{credits(o.charged_30d_millicredits)} cr</span> },
          ]} />
        </Card>
        <Card flush title="Grace and paused" description="Protocols whose day could not be charged: 3 days of grace, then paused until the balance covers a day.">
          <DataTable rows={s.billing_trouble} dense rowKey={(x) => x.id} empty={<EmptyState compact title="Every protocol is paid up" />} columns={[
            { key: 'n', header: 'Protocol', cell: (x) => <span className="grid"><span>{x.name}</span><span className="text-xs text-fg-3">{x.org_name}</span></span> },
            { key: 'b', header: 'Billing', cell: (x) => <BillingBadge billing={x.billing} /> },
            { key: 's', header: 'Since', align: 'right', cell: (x) => <span className="text-fg-3">{x.grace_since?.slice(0, 10) || '-'}</span> },
          ]} />
        </Card>
        <Card flush title="Charges" description="Billed protocol-days of the last month, newest first.">
          <DataTable rows={(s.charges || []).slice(0, 50)} dense rowKey={(c) => `${c.monitor_id}:${c.day}`} empty={<EmptyState compact title="Nothing billed yet" />} columns={[
            { key: 'd', header: 'Day', cell: (c) => c.day.slice(0, 10) },
            { key: 'm', header: 'Protocol', cell: (c) => <span className="grid"><span>{c.monitor_name}</span><span className="text-xs text-fg-3">{c.org_name}</span></span> },
            { key: 'l', header: 'Level', hide: 'sm', cell: (c) => <LevelBadge level={c.level} /> },
            { key: 'c', header: 'Credits', align: 'right', cell: (c) => <span className="tnum">{credits(c.millicredits)}</span> },
            { key: 'o', header: 'Outcome', align: 'right', cell: (c) => <Badge tone={c.outcome === 'charged' ? 'good' : c.outcome === 'refused' ? 'danger' : 'neutral'}>{c.outcome}</Badge> },
          ]} />
        </Card>
        <Card flush title="Dead letters" description="Health checks and suggestions Watch could not finish. Retrying queues them again; a paid check is not charged twice.">
          <DataTable rows={s.failed_requests} dense rowKey={(q) => q.id} empty={<EmptyState compact title="No failed requests" />} columns={[
            { key: 'i', header: 'Request', cell: (q) => <span className="grid"><span>#{q.id} {q.kind.replace('_', ' ')}</span><span className="text-xs capitalize text-fg-3">{q.chain}</span></span> },
            { key: 'e', header: 'Error', cell: (q) => <span className="text-xs text-fg-2">{q.error}</span> },
            { key: 'w', header: 'When', align: 'right', hide: 'sm', cell: (q) => <span className="text-fg-3" title={dateTime(q.finished_at)}>{ago(q.finished_at)}</span> },
            { key: 'r', header: '', align: 'right', cell: (q) => <Button size="sm" variant="ghost" onClick={() => retry(q.id)}>Retry</Button> },
          ]} />
        </Card>
        <Card flush title="Latest episodes" description="Across every organization and Hawk-i's own monitors.">
          <DataTable rows={s.violations} dense rowKey={(v) => v.id} empty={<EmptyState compact title="No violation yet" />} columns={[
            { key: 's', header: 'Severity', cell: (v) => <SeverityBadge value={v.severity} /> },
            { key: 't', header: 'Invariant', cell: (v) => <span className="grid"><span>{v.title || v.invariant}</span><span className="text-xs text-fg-3">{v.chain}, block {num(v.first_block)}</span></span> },
            { key: 'st', header: 'Status', hide: 'sm', cell: (v) => <EpisodeStatus status={v.status} /> },
            { key: 'w', header: 'When', align: 'right', cell: (v) => <span className="text-fg-3" title={dateTime(v.first_time)}>{ago(v.first_time)}</span> },
          ]} />
        </Card>
        <Card flush title="Processes">
          <DataTable rows={s.instances} dense rowKey={(i) => i.id} empty={<EmptyState compact title="No watch process reported in">Start watch run.</EmptyState>} columns={[
            { key: 'id', header: 'Instance', cell: (i) => <span className="font-mono text-xs">{i.id}</span> },
            { key: 'v', header: 'Version', hide: 'sm', cell: (i) => i.version },
            { key: 'c', header: 'Chains', cell: (i) => (i.chains || []).join(', ') },
            { key: 'h', header: 'Last seen', align: 'right', cell: (i) => <span className="text-fg-3" title={dateTime(i.heartbeat_at)}>{ago(i.heartbeat_at)}</span> },
          ]} />
          {s.library && <p className="px-5 py-3 text-xs text-fg-3">Library {s.library.digest}: {s.library.kinds} kinds, {s.library.invariants} invariants, loaded {ago(s.library.loaded_at)}.</p>}
        </Card>
        <Card flush title="Reorgs">
          <DataTable rows={s.reorgs} dense rowKey={(x) => x.id} empty={<EmptyState compact title="No reorg seen" />} columns={[
            { key: 'c', header: 'Chain', cell: (x) => <span className="capitalize">{x.chain}</span> },
            { key: 'f', header: 'Fork', align: 'right', cell: (x) => <span className="tnum">{num(x.fork_number)}</span> },
            { key: 'd', header: 'Depth', align: 'right', cell: (x) => <span className="tnum">{x.depth}{x.deeper ? '+' : ''}</span> },
            { key: 'w', header: 'When', align: 'right', cell: (x) => <span className="text-fg-3" title={dateTime(x.detected_at)}>{ago(x.detected_at)}</span> },
          ]} />
        </Card>
      </div>
      <p className="text-xs text-fg-3">Health per monitor: <HealthBadge health="healthy" /> <HealthBadge health="degraded" /> <HealthBadge health="at_risk" /> <HealthBadge health="critical" /></p>
    </div>
  )
}
