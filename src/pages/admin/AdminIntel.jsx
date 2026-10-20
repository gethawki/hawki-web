import { useEffect } from 'react'
import { Activity, Boxes, Network, ServerCrash } from 'lucide-react'
import { useApi } from '../../lib/useApi.js'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'

const STATUS = {
  ok: ['good', 'Healthy'],
  degraded: ['warning', 'Degraded'],
  down: ['danger', 'Down'],
  mismatch: ['danger', 'Wrong chain'],
  pending: ['neutral', 'Starting'],
  disabled: ['neutral', 'Disabled'],
}

function ChainStatus({ status }) {
  const [tone, label] = STATUS[status] || ['neutral', status]
  return <Badge tone={tone} dot>{label}</Badge>
}

// Block heights are shown in full: operators compare them digit by digit.
const height = (n) => (n != null ? n.toLocaleString('en') : '-')
const blockTime = (ms) => (ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`)

function ChainCard({ c }) {
  const healthy = c.endpoints.filter((e) => e.healthy).length
  return (
    <Card
      title={<span className="flex items-center gap-2 capitalize">{c.name}<span className="text-xs font-normal normal-case text-fg-3">chain {c.chain_id}</span></span>}
      actions={<ChainStatus status={c.status} />}
      flush
    >
      <div className="grid grid-cols-2 gap-4 px-5 pb-4 sm:grid-cols-4">
        <div><div className="text-xs text-fg-3">Head</div><div className="text-lg font-semibold text-fg tnum">{height(c.head_number)}</div><div className="text-xs text-fg-3">{c.head_seen_at ? `seen ${ago(c.head_seen_at)}` : 'not seen yet'}</div></div>
        <div><div className="text-xs text-fg-3">Endpoints</div><div className="text-lg font-semibold text-fg tnum">{healthy} / {c.endpoints.length}</div><div className="text-xs text-fg-3">healthy</div></div>
        <div><div className="text-xs text-fg-3">Block time</div><div className="text-lg font-semibold text-fg tnum">{blockTime(c.block_time_ms)}</div><div className="text-xs text-fg-3">{c.confirmations} confirmations</div></div>
        <div><div className="text-xs text-fg-3">Start</div><div className="text-lg font-semibold text-fg">{c.start_policy}</div><div className="text-xs text-fg-3">{c.traces ? 'traces on' : 'no traces'}</div></div>
      </div>
      {c.status_detail && c.status !== 'ok' && (
        <div className={`mx-5 mb-4 rounded-lg border px-3 py-2 text-xs ${c.status === 'degraded' ? 'border-warning/30 bg-warning/[0.06] text-[#f5dfae]' : 'border-critical/40 bg-critical/[0.06] text-[#f3c7c7]'}`}>{c.status_detail}</div>
      )}
      <div className="border-t border-line">
        <DataTable rows={c.endpoints} rowKey={(e) => e.label} dense
          empty={<EmptyState compact title="No endpoints probed yet" />}
          columns={[
            { key: 'label', header: 'Endpoint', cell: (e) => <span className="break-all font-mono text-xs text-fg">{e.label}</span> },
            { key: 'up', header: 'Status', cell: (e) => <Badge tone={e.healthy ? 'good' : 'danger'} dot>{e.healthy ? 'Up' : 'Down'}</Badge> },
            { key: 'head', header: 'Head', align: 'right', hide: 'sm', cell: (e) => height(e.head_number) },
            { key: 'lat', header: 'Latency', align: 'right', cell: (e) => <span className="whitespace-nowrap">{e.latency_ms != null ? `${e.latency_ms} ms` : '-'}</span> },
            { key: 'err', header: 'Last error', hide: 'md', cell: (e) => <span className="text-xs text-fg-3">{e.last_error || '-'}</span> },
            { key: 'at', header: 'Checked', align: 'right', hide: 'lg', cell: (e) => <span className="whitespace-nowrap text-fg-3">{ago(e.checked_at)}</span> },
          ]} />
      </div>
    </Card>
  )
}

// AdminIntel is the operations view of the Intel Engine: which chains it
// follows, whether their RPC endpoints answer for the right chain, and every
// change Intel made to its own state.
export default function AdminIntel() {
  const { data, error, reload } = useApi('/api/v1/admin/intel')
  useEffect(() => {
    const t = setInterval(reload, 10000)
    return () => clearInterval(t)
  }, [reload])

  if (error && !data) return <ErrorState onRetry={reload}>{error}</ErrorState>
  if (!data) return <PageSkeleton cards={4} />

  const enabled = data.chains.filter((c) => c.enabled)
  const disabled = data.chains.filter((c) => !c.enabled)
  const healthy = enabled.filter((c) => c.status === 'ok').length
  const problems = enabled.filter((c) => ['down', 'mismatch'].includes(c.status)).length
  const eps = enabled.flatMap((c) => c.endpoints)

  return (
    <div className="grid gap-4">
      <PageHeader title="Intel Engine" description="Chains Intel follows, the health of their RPC endpoints and every change Intel makes to its own state. Refreshes every 10 seconds."
        meta={<span>Configured in the Intel service (config/intel.yaml); start it with <code className="font-mono">intel ingest</code>.</span>} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Chains followed" icon={Network} value={num(enabled.length)} sub={`${num(disabled.length)} configured but off`} />
        <StatCard label="Healthy" icon={Activity} value={`${healthy} / ${enabled.length}`} sub="every endpoint answers" />
        <StatCard label="Endpoints up" icon={Boxes} value={`${eps.filter((e) => e.healthy).length} / ${eps.length}`} sub="across followed chains" />
        <StatCard label="Down or wrong chain" icon={ServerCrash} value={num(problems)} tone={problems ? 'danger' : undefined} sub={problems ? 'needs attention' : 'none'} />
      </div>

      {data.chains.length === 0 ? (
        <Card><EmptyState icon={Network} title="Intel has not started yet">Start the Intel service with <code className="font-mono">intel ingest</code>; its chains appear here.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {enabled.map((c) => <ChainCard key={c.name} c={c} />)}
        </div>
      )}

      {disabled.length > 0 && (
        <Card title="Configured but off" description="Enable a chain in the Intel config once it has an endpoint that can keep up." flush>
          <DataTable rows={disabled} rowKey={(c) => c.name} dense columns={[
            { key: 'name', header: 'Chain', cell: (c) => <span className="capitalize text-fg">{c.name}</span> },
            { key: 'id', header: 'Chain id', align: 'right', cell: (c) => c.chain_id },
            { key: 'bt', header: 'Block time', align: 'right', cell: (c) => blockTime(c.block_time_ms) },
            { key: 'conf', header: 'Confirmations', align: 'right', hide: 'sm', cell: (c) => c.confirmations },
          ]} />
        </Card>
      )}

      <Card title="Intel audit" description="Chains enabled or disabled, reorgs, reprocessing and checkpoint moves" flush>
        <DataTable rows={data.audit} dense empty={<EmptyState compact title="Nothing recorded yet" />} columns={[
          { key: 'when', header: 'When', cell: (a) => <span className="whitespace-nowrap text-fg-3" title={dateTime(a.occurred_at)}>{ago(a.occurred_at)}</span> },
          { key: 'chain', header: 'Chain', cell: (a) => <span className="capitalize text-fg-2">{a.chain || '-'}</span> },
          { key: 'action', header: 'Action', cell: (a) => <span className="font-mono text-xs text-fg">{a.action}</span> },
          { key: 'reason', header: 'Reason', hide: 'sm', cell: (a) => <span className="text-fg-2">{a.reason}</span> },
          { key: 'actor', header: 'By', align: 'right', hide: 'md', cell: (a) => <span className="text-fg-3">{a.actor}</span> },
        ]} />
      </Card>
    </div>
  )
}
