import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Alert from '../../components/common/Alert.jsx'
import { ChainName } from '../../components/intel/IntelKit.jsx'
import { HealthBadge, WatchError, bigValue, useWatch } from '../../components/watch/WatchKit.jsx'

const OUTCOME_TONE = { holds: 'good', violated: 'danger', unknown: 'neutral' }

// WatchRequest is a one-off health check or a contract suggestion, shown
// as it runs and when it is done.
export default function WatchRequest() {
  const { requestId } = useParams()
  const r = useWatch(`/requests/${requestId}`)
  const running = r.data && !['done', 'failed'].includes(r.data.status)
  const { reload } = r
  useEffect(() => {
    if (!running) return
    const t = setInterval(reload, 2000)
    return () => clearInterval(t)
  }, [running, reload])
  if (r.error && !r.data) return <div><PageHeader title="Health check" back="/dashboard/watch?tab=checks" /><Card><WatchError status={r.status} error={r.error} onRetry={r.reload} /></Card></div>
  if (!r.data) return <PageSkeleton cards={2} />
  const q = r.data
  const res = q.result || {}
  const title = q.kind === 'health_check' ? `Health check #${q.id}` : `Suggestion #${q.id}`
  return (
    <div className="grid gap-4">
      <PageHeader title={title} back="/dashboard/watch?tab=checks"
        description={`Requested ${dateTime(q.requested_at)}${q.input?.preset ? ` for ${q.input.preset}` : ''}.`}
        meta={<span className="flex flex-wrap items-center gap-1.5"><ChainName chain={q.chain} />{q.status === 'done' && res.health ? <HealthBadge health={res.health} />
          : <Badge tone={q.status === 'failed' ? 'danger' : 'accent'} dot pulse={running}>{q.status}</Badge>}</span>} />
      {running && <Alert tone="info">Reading the protocol at the last two blocks. This takes a few seconds on paid endpoints, up to a minute on public ones.</Alert>}
      {q.status === 'failed' && <Alert>{q.error || 'The check failed.'}</Alert>}
      {q.status === 'done' && q.kind === 'health_check' && (
        <>
          <p className="text-sm text-fg-3">Read at block {num(res.block)} ({dateTime(res.time)}).</p>
          {(res.components || []).map((c) => (
            <Card key={c.label} flush title={c.label} description={c.kind} actions={c.health === 'ok' ? <Badge tone="good" dot>Read</Badge> : <Badge tone="warning" dot>Degraded</Badge>}>
              {c.failed && Object.keys(c.failed).length > 0 && <div className="px-5 pb-3"><Alert tone="info">Unreadable: {Object.entries(c.failed).map(([k, e]) => `${k} (${e})`).join(', ')}</Alert></div>}
              <DataTable rows={c.invariants} dense rowKey={(i) => i.invariant} empty={<EmptyState compact title="No invariants" />}
                columns={[
                  { key: 'n', header: 'Invariant', cell: (i) => <span className="grid"><span className="text-fg">{i.name}</span>{i.reason && <span className="text-xs text-fg-3">{i.reason}</span>}</span> },
                  { key: 's', header: 'Severity', hide: 'sm', cell: (i) => <SeverityBadge value={i.severity} /> },
                  { key: 'o', header: 'Outcome', align: 'right', cell: (i) => <Badge tone={OUTCOME_TONE[i.outcome] || 'neutral'}>{i.outcome}</Badge> },
                ]} />
              <details className="px-5 py-3">
                <summary className="cursor-pointer text-xs text-fg-3">Values read</summary>
                <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                  {Object.entries(c.values || {}).map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="font-mono text-fg-3">{k}</dt><dd className="tnum text-fg" title={v}>{bigValue(v)}</dd></div>)}
                </dl>
              </details>
            </Card>
          ))}
        </>
      )}
      {q.status === 'done' && q.kind === 'suggest' && (
        <Card flush title="Kinds the contract fits">
          <DataTable rows={Array.isArray(q.result) ? q.result : []} dense rowKey={(s) => s.kind} empty={<EmptyState compact title="No kind fits" />}
            columns={[
              { key: 'n', header: 'Kind', cell: (s) => s.name },
              { key: 'c', header: 'Category', cell: (s) => s.category },
              { key: 'v', header: 'Values read', align: 'right', cell: (s) => <span className="tnum">{Object.keys(s.values || {}).length}</span> },
            ]} />
        </Card>
      )}
    </div>
  )
}
