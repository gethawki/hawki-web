import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Alert from '../../components/common/Alert.jsx'
import { AddressLink } from '../../components/intel/IntelKit.jsx'
import { MevError, PATTERNS, PredictionTable, useMev } from '../../components/mev/MevKit.jsx'

// MevAnalysis is a one-off MEV analysis, shown as it runs and when done.
export default function MevAnalysis() {
  const { analysisId } = useParams()
  const r = useMev(`/analyses/${analysisId}`)
  const running = r.data && !['done', 'failed'].includes(r.data.status)
  const { reload } = r
  useEffect(() => {
    if (!running) return
    const t = setInterval(reload, 2000)
    return () => clearInterval(t)
  }, [running, reload])
  if (r.error && !r.data) return <div><PageHeader title="Analysis" back="/dashboard/mev?tab=analyses" /><Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card></div>
  if (!r.data) return <PageSkeleton cards={2} />
  const q = r.data
  const a = q.result || {}
  return (
    <div className="grid gap-4">
      <PageHeader title={`Analysis #${q.id}`} back="/dashboard/mev?tab=analyses" description={`Requested ${dateTime(q.requested_at)}.`}
        meta={<span className="flex flex-wrap items-center gap-1.5"><span className="text-sm capitalize text-fg-2">{q.chain}</span>
          <Badge tone={q.status === 'done' ? 'good' : q.status === 'failed' ? 'danger' : 'accent'} dot pulse={running}>{q.status}</Badge></span>} />
      {running && <Alert tone="info">Reading the contract and MEV's records of it.</Alert>}
      {q.status === 'failed' && <Alert>{q.error || 'The analysis failed.'}</Alert>}
      {q.status === 'done' && (
        <>
          <Card title={a.kind === 'pool' ? 'Pool' : 'Contract'}>
            <p className="text-sm text-fg">{a.summary}</p>
            <p className="mt-2 text-xs text-fg-3"><AddressLink chain={a.chain} address={a.address} /> at block {num(a.block)}</p>
            <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-fg-2">{(a.findings || []).map((f) => <li key={f}>{f}</li>)}</ul>
          </Card>
          {a.depth?.length > 0 && (
            <Card flush title="Liquidity depth" description="Selling token0 into the pool: the share of its reserve (or in-range virtual reserve) and how far the price moves.">
              <DataTable rows={a.depth} dense rowKey={(d) => d.share_pct} columns={[
                { key: 's', header: 'Trade', cell: (d) => `${d.share_pct}% of the reserve` },
                { key: 'm', header: 'Price move', align: 'right', cell: (d) => <span className="tnum">{(d.price_move * 100).toFixed(2)}%</span> },
              ]} />
            </Card>
          )}
          <Card title="30 days of MEV">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone={a.sandwiches ? 'danger' : 'good'}>{a.sandwiches} sandwiches mined</Badge>
              {Object.entries(a.predictions || {}).map(([k, n]) => <Badge key={k} tone="accent">{PATTERNS[k] || k}: {n}</Badge>)}
              <Badge>{a.pending_now} pending to it now</Badge>
            </div>
          </Card>
          <Card flush title="Recent predictions">
            <PredictionTable rows={a.recent || []} empty={<EmptyState compact title="None in 30 days" />} />
          </Card>
        </>
      )}
    </div>
  )
}
