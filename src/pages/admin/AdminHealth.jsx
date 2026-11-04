import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HeartPulse } from 'lucide-react'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num, pct } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ButtonTabs, Segmented } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import { BarList, Meter } from '../../components/charts/Small.jsx'
import { Badge, Stat } from '../../components/admin/bits.jsx'
import { StatusBadge, bytes, ms, serviceLabel, span, uptime } from '../../components/admin/platformBits.jsx'

const TABS = [
  { value: 'services', label: 'Services' },
  { value: 'performance', label: 'Performance' },
  { value: 'resources', label: 'Resources' },
]

// useRefresh reloads a page's data every interval while it is open.
function useRefresh(reload, every) {
  useEffect(() => {
    const t = setInterval(() => reload(), every)
    return () => clearInterval(t)
  }, [reload, every])
}

const hour = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function ServiceHistory({ service }) {
  const [days, setDays] = useState(7)
  const { data, error } = useApi(`/api/v1/admin/system/health/${service}?days=${days}`)
  return (
    <Card title={`${serviceLabel(service)} history`} description="Checks per hour by outcome, one check a minute"
      actions={<Segmented label="History range" value={days} onChange={setDays} options={[{ value: 1, label: '24h' }, { value: 7, label: '7d' }, { value: 30, label: '30d' }]} />}>
      {error ? <ErrorState>{error}</ErrorState> : !data ? <div className="h-[200px]" /> : data.timeline.length === 0 ? <p className="text-sm text-fg-3">No checks in this range.</p> : (
        <>
          <TimeChart kind="stacked" height={200} caption={`${serviceLabel(service)} checks per hour`}
            data={data.timeline.map((b) => ({ label: hour(b.at), ok: b.ok, degraded: b.degraded, down: b.down }))}
            series={[{ key: 'ok', label: 'Up', color: 'var(--color-good)' }, { key: 'degraded', label: 'Degraded', color: 'var(--color-warning)' }, { key: 'down', label: 'Down', color: 'var(--color-critical)' }]} />
          {data.incidents.length > 0 && (
            <ul className="mt-4 grid gap-2 border-t border-line pt-3 text-sm">
              {data.incidents.slice(0, 8).map((i) => (
                <li key={i.started_at} className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={i.status} />
                  <span className="text-fg-2">{dateTime(i.started_at)}</span>
                  <span className="text-fg-3">for {span(i.started_at, i.ended_at)}{i.ended_at ? '' : ', still going'}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-fg-3" title={i.detail}>{i.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

function Services({ h, reload }) {
  useRefresh(reload, 30000)
  const [open, setOpen] = useState(null)
  const down = h.services.filter((s) => s.status === 'down').length
  const degraded = h.services.filter((s) => s.status === 'degraded').length
  const worker = h.queue?.consumers?.find((c) => c.name === 'scanworker')
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Services" value={num(h.services.length)} note={down || degraded ? `${down} down, ${degraded} degraded` : 'all up'} tone={down ? 'bad' : undefined} />
        <Stat label="Incidents, 30 days" value={num(h.incidents.length)} note={h.incidents[0] ? `last ${ago(h.incidents[0].started_at)}` : 'none'} />
        <Stat label="Scans queued" value={num(h.scans.queued)} note={h.scans.oldest_queued_seconds ? `oldest ${span(new Date(Date.now() - h.scans.oldest_queued_seconds * 1000))}` : `${num(h.scans.running)} running`} />
        <Stat label="Scan workers" value={worker ? num(worker.waiting) : '-'} note={worker ? 'pulls open' : 'not attached'} />
      </div>
      <Card flush title="Services" description="Checked every minute. Uptime counts degraded as up. Open a row for its history.">
        <DataTable rows={h.services} rowKey={(s) => s.service} empty={<EmptyState compact icon={HeartPulse} title="No checks yet" />}
          columns={[
            { key: 's', header: 'Service', cell: (s) => <button type="button" onClick={() => setOpen(open === s.service ? null : s.service)} className="text-left font-medium text-fg hover:underline">{serviceLabel(s.service)}</button> },
            { key: 'st', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
            { key: 'd', header: 'Detail', hide: 'md', cell: (s) => <span className="block max-w-[22rem] truncate text-xs text-fg-3" title={s.detail}>{s.detail || (s.checked_at ? `checked ${ago(s.checked_at)}` : '')}</span> },
            { key: 'u1', header: '24h', align: 'right', cell: (s) => uptime(s.uptime_24h) },
            { key: 'u7', header: '7d', align: 'right', hide: 'sm', cell: (s) => uptime(s.uptime_7d) },
            { key: 'u30', header: '30d', align: 'right', hide: 'md', cell: (s) => uptime(s.uptime_30d) },
            { key: 'li', header: 'Last incident', align: 'right', hide: 'sm', cell: (s) => (s.last_incident ? <span className="text-xs text-fg-2" title={s.last_incident.detail}>{ago(s.last_incident.started_at)}, {span(s.last_incident.started_at, s.last_incident.ended_at)}</span> : <span className="text-xs text-fg-3">none</span>) },
          ]} />
      </Card>
      {open && <ServiceHistory key={open} service={open} />}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card flush title="Engine processes" description="Heartbeats from the last week">
          <DataTable rows={h.instances} rowKey={(i) => `${i.engine}:${i.id}`} dense empty={<EmptyState compact title="No engine has reported" />}
            columns={[
              { key: 'e', header: 'Engine', cell: (i) => <span className="text-fg">{serviceLabel(i.engine)}</span> },
              { key: 'id', header: 'Process', hide: 'sm', cell: (i) => <span className="font-mono text-xs text-fg-3">{i.id}</span> },
              { key: 'v', header: 'Version', hide: 'md', cell: (i) => <span className="text-xs text-fg-3">{i.version}</span> },
              { key: 'h', header: 'Heartbeat', align: 'right', cell: (i) => <Badge tone={i.age_seconds < 90 ? 'good' : i.age_seconds < 300 ? 'warn' : 'bad'}>{ago(i.heartbeat_at)}</Badge> },
            ]} />
        </Card>
        <Card flush title="Scan queue" description={h.queue ? `${num(h.queue.messages)} messages, ${bytes(h.queue.bytes)} in ${h.queue.name}` : h.queue_error || 'Not reported'}>
          <DataTable rows={h.queue?.consumers || []} rowKey={(c) => c.name} dense empty={<EmptyState compact title="No consumers" />}
            columns={[
              { key: 'n', header: 'Consumer', cell: (c) => <span className="font-mono text-xs text-fg">{c.name}</span> },
              { key: 'p', header: 'Pending', align: 'right', cell: (c) => num(c.pending) },
              { key: 'a', header: 'In work', align: 'right', cell: (c) => num(c.ack_pending) },
              { key: 'w', header: 'Pulls', align: 'right', hide: 'sm', cell: (c) => num(c.waiting) },
              { key: 'l', header: 'Last delivery', align: 'right', hide: 'sm', cell: (c) => <span className="text-xs text-fg-3">{c.last_active ? ago(c.last_active) : 'never'}</span> },
            ]} />
        </Card>
      </div>
      <Card flush title="Incidents" description="Runs of failed checks in the last 30 days">
        <DataTable rows={h.incidents} rowKey={(i) => `${i.service}:${i.started_at}`} dense empty={<EmptyState compact title="No incidents in 30 days" />}
          columns={[
            { key: 's', header: 'Service', cell: (i) => serviceLabel(i.service) },
            { key: 'st', header: 'Worst', cell: (i) => <StatusBadge status={i.status} /> },
            { key: 'b', header: 'Started', hide: 'sm', cell: (i) => <span className="text-xs text-fg-2">{dateTime(i.started_at)}</span> },
            { key: 'l', header: 'Lasted', align: 'right', cell: (i) => <span className="text-xs">{span(i.started_at, i.ended_at)}{i.ended_at ? '' : ' so far'}</span> },
            { key: 'd', header: 'Detail', hide: 'md', cell: (i) => <span className="block max-w-[24rem] truncate text-xs text-fg-3" title={i.detail}>{i.detail}</span> },
          ]} />
      </Card>
    </div>
  )
}

function Performance() {
  const [windowSel, setWindow] = useState('1h')
  const [days, setDays] = useState(1)
  const { data: p, error, reload } = useApi(`/api/v1/admin/system/performance?window=${windowSel}&days=${days}`)
  useRefresh(reload, 60000)
  if (error) return <ErrorState>{error}</ErrorState>
  if (!p) return <PageSkeleton cards={4} />
  const all = p.routes[0] || {}
  const routes = p.routes.slice(1)
  const label = (iso) => (days > 1 ? hour(iso) : new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))
  const e = p.engines
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-fg-3">Routes over</span>
        <Segmented label="Route window" value={windowSel} onChange={setWindow} options={[{ value: '5m', label: '5 min' }, { value: '15m', label: '15 min' }, { value: '1h', label: '1 hour' }]} />
        <span className="text-xs text-fg-3">History</span>
        <Segmented label="History range" value={days} onChange={setDays} options={[{ value: 1, label: '24h' }, { value: 7, label: '7d' }, { value: 30, label: '30d' }]} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Requests" value={num(all.requests)} note={`over ${windowSel}`} />
        <Stat label="Server errors" value={all.requests ? pct(all.errors / all.requests, 2) : '-'} note={`${num(all.errors)} answers`} tone={all.requests && all.errors / all.requests > 0.05 ? 'bad' : undefined} />
        <Stat label="p50" value={ms(all.p50_ms)} />
        <Stat label="p95" value={ms(all.p95_ms)} />
        <Stat label="p99" value={ms(all.p99_ms)} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="API latency" description="p95 and p99 per sample, in milliseconds">
          <TimeChart height={210} caption="API latency" format={(v) => ms(v)}
            data={p.history.map((s) => ({ label: label(s.at), p95: s.p95_ms, p99: s.p99_ms }))}
            series={[{ key: 'p95', label: 'p95', color: 'var(--color-series-1)' }, { key: 'p99', label: 'p99', color: 'var(--color-series-3)' }]} />
        </Card>
        <Card title="Requests" description="Answered requests per sample, server errors apart">
          <TimeChart kind="stacked" height={210} caption="Requests and server errors"
            data={p.history.map((s) => ({ label: label(s.at), ok: s.requests - s.errors, errors: s.errors }))}
            series={[{ key: 'ok', label: 'Answered', color: 'var(--color-series-1)' }, { key: 'errors', label: 'Server errors', color: 'var(--color-critical)' }]} />
        </Card>
      </div>
      <Card flush title="Routes" description={`Busiest routes over ${windowSel}`}>
        <DataTable rows={routes} rowKey={(r) => r.route} dense empty={<EmptyState compact title="No requests in this window" />}
          columns={[
            { key: 'r', header: 'Route', cell: (r) => <span className="block max-w-[26rem] truncate font-mono text-xs text-fg" title={r.route}>{r.route}</span> },
            { key: 'n', header: 'Requests', align: 'right', cell: (r) => num(r.requests) },
            { key: 'e', header: 'Errors', align: 'right', hide: 'sm', cell: (r) => <span className={r.errors ? 'text-bad' : 'text-fg-3'}>{num(r.errors)}</span> },
            { key: 'p50', header: 'p50', align: 'right', hide: 'md', cell: (r) => ms(r.p50_ms) },
            { key: 'p95', header: 'p95', align: 'right', cell: (r) => ms(r.p95_ms) },
            { key: 'p99', header: 'p99', align: 'right', hide: 'sm', cell: (r) => ms(r.p99_ms) },
          ]} />
      </Card>
      <Card title="Throughput" description="From each engine's own records">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
          <Stat label="Scans finished, 1h" value={num(e.scans.done_1h)} note={`${num(e.scans.done_24h)} in 24h, ${num(e.scans.failed_24h)} failed`} />
          <Stat label="Scan duration" value={e.scans.duration_p50_seconds != null ? `${Math.round(e.scans.duration_p50_seconds)} s` : '-'} note={e.scans.duration_p95_seconds != null ? `p95 ${Math.round(e.scans.duration_p95_seconds)} s` : '7 days'} />
          <Stat label="Hunt messages, 1h" value={num(e.hunt.messages_1h)} note={`${num(e.hunt.backlog)} waiting${e.hunt.dead_letters_open ? `, ${e.hunt.dead_letters_open} dead letters` : ''}`} />
          <Stat label="Watch requests, 1h" value={num(e.watch.requests_1h)} note={`${num(e.watch.queued)} queued, p95 ${ms(e.watch.request_p95_ms)}`} />
          <Stat label="MEV transactions, 1h" value={num(e.mev.transactions_1h)} note={`${num(e.mev.predictions_1h)} predictions`} />
          <Stat label="MEV prediction time" value={ms(e.mev.prediction_p50_ms)} note={`p95 ${ms(e.mev.prediction_p95_ms)}, 24h`} />
          <Stat label="MEV analyses queued" value={num(e.mev.requests_queued)} note={`${num(e.mev.requests_failed_24h)} failed in 24h`} />
          <Stat label="Watch failures, 24h" value={num(e.watch.failed_24h)} />
        </div>
      </Card>
    </div>
  )
}

function Resources() {
  const { data: p, error, reload } = useApi('/api/v1/admin/system/performance?window=5m&days=1')
  useRefresh(reload, 60000)
  if (error) return <ErrorState>{error}</ErrorState>
  if (!p) return <PageSkeleton cards={4} />
  const r = p.runtime
  const pool = p.pool
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Orchestrator heap" value={bytes(r.heap_bytes)} note={`${bytes(r.sys_bytes)} from the system`} />
        <Stat label="Goroutines" value={num(r.goroutines)} note={`${r.cpus} CPUs, up ${r.uptime_hours < 48 ? `${r.uptime_hours.toFixed(1)} h` : `${Math.round(r.uptime_hours / 24)} days`}`} />
        <Stat label="Database" value={bytes(p.database.size_bytes)} note={`${p.database.schemas.length} schemas`} />
        <Stat label="Last GC pause" value={ms(r.gc_pause_ms)} note={`${num(r.num_gc)} collections`} />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card title="Database connections" description="The orchestrator's pool">
          <div className="grid gap-2">
            <div className="flex justify-between text-sm"><span className="text-fg-2">In use</span><span className="tnum text-fg">{pool.in_use} of {pool.max}</span></div>
            <Meter value={pool.in_use} max={pool.max} label="Connections in use" />
            <p className="text-xs text-fg-3">{pool.idle} idle, {pool.total} open. {num(pool.waits)} waits for a free connection since start ({ms(pool.waited_ms)} in all).</p>
          </div>
        </Card>
        <Card title="Database by schema">
          <BarList items={p.database.schemas.map((s) => ({ label: s.schema, value: s.size_bytes }))} format={bytes} />
        </Card>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card flush title="Largest tables">
          <DataTable rows={p.database.largest_tables} rowKey={(t) => t.table} dense columns={[
            { key: 't', header: 'Table', cell: (t) => <span className="font-mono text-xs text-fg">{t.table}</span> },
            { key: 's', header: 'Size', align: 'right', cell: (t) => bytes(t.size_bytes) },
            { key: 'r', header: 'Rows', align: 'right', hide: 'sm', cell: (t) => num(t.rows_estimate) },
          ]} />
        </Card>
        <Card flush title="Object storage" description="Counted at most every 10 minutes">
          <DataTable rows={p.storage} rowKey={(b) => b.bucket} dense empty={<EmptyState compact title="No buckets" />} columns={[
            { key: 'b', header: 'Bucket', cell: (b) => <span className="font-mono text-xs text-fg">{b.bucket}</span> },
            { key: 'o', header: 'Objects', align: 'right', cell: (b) => (b.error ? <span className="text-xs text-bad">{b.error}</span> : `${num(b.objects)}${b.partial ? '+' : ''}`) },
            { key: 's', header: 'Size', align: 'right', cell: (b) => (b.error ? '-' : `${bytes(b.bytes)}${b.partial ? '+' : ''}`) },
          ]} />
        </Card>
      </div>
      <Card flush title="Engine processes" description="From each engine's metrics page (HAWKI_ADMIN_METRICS_URLS)">
        <DataTable rows={p.engine_metrics} rowKey={(s) => s.name} dense empty={<EmptyState compact title="No metrics pages configured" />} columns={[
          { key: 'n', header: 'Engine', cell: (s) => <span className="text-fg">{serviceLabel(s.name)}</span> },
          { key: 'm', header: 'Memory', align: 'right', cell: (s) => (s.error ? <span className="text-xs text-bad" title={s.error}>unreachable</span> : bytes(s.resident_bytes)) },
          { key: 'h', header: 'Heap', align: 'right', hide: 'sm', cell: (s) => bytes(s.heap_bytes) },
          { key: 'g', header: 'Goroutines', align: 'right', hide: 'sm', cell: (s) => num(s.goroutines) },
          { key: 'c', header: 'CPU time', align: 'right', hide: 'md', cell: (s) => (s.cpu_seconds != null ? `${Math.round(s.cpu_seconds)} s` : '-') },
          { key: 'u', header: 'Up since', align: 'right', hide: 'md', cell: (s) => (s.start_time ? <span className="text-xs text-fg-3">{ago(new Date(s.start_time * 1000).toISOString())}</span> : '-') },
        ]} />
      </Card>
    </div>
  )
}

export default function AdminHealth() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'services'
  const { data, error, reload } = useApi('/api/v1/admin/system/health')
  return (
    <div>
      <PageHeader title="System health" description="Every service checked once a minute, the API's speed and errors, engine throughput and resource use.">
        <ButtonTabs tabs={TABS} value={tab} onChange={(v) => setParams(v === 'services' ? {} : { tab: v }, { replace: true })} />
      </PageHeader>
      {tab === 'services' && (error ? <ErrorState>{error}</ErrorState> : !data ? <PageSkeleton cards={4} /> : <Services h={data} reload={reload} />)}
      {tab === 'performance' && <Performance />}
      {tab === 'resources' && <Resources />}
    </div>
  )
}
