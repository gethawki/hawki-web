import { useParams } from 'react-router-dom'
import { ago, dateTime } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { ChainName, short } from '../../components/intel/IntelKit.jsx'
import GraphExplorer from '../../components/intel/GraphExplorer.jsx'
import { BandBadge, ClusterLink, HuntAddress, HuntError, RuleTags, ScoreBadge, traceGraph, useHunt } from '../../components/hunt/HuntKit.jsx'

// FundTrace shows where an account's funds came from: the path on the
// graph explorer, every hop with both transaction hashes, and the
// ultimate sources.
export function FundTrace({ trace }) {
  const root = `address:${trace.root.chain}:${trace.root.address}`
  return (
    <div className="grid gap-4">
      <Card title="Fund trace" description={`Up to ${trace.depth} hops back from the account: first fundings on a chain, and relayed bridge transfers between chains. Double-click a node to open its Threat Graph neighbours.`}>
        {trace.edges.length === 0 ? <EmptyState compact title="No earlier funds known">Intel saw no funding of this account and no bridge transfer to it.</EmptyState>
          : <GraphExplorer start={root} data={traceGraph(trace)} fullLink={false} height="h-[22rem] sm:h-[26rem]" />}
      </Card>
      <Card flush title="Hops">
        <DataTable rows={trace.edges} dense rowKey={(e) => `${e.tx}:${e.to}`} empty={<EmptyState compact title="No hops" />} columns={[
          { key: 'k', header: 'How', className: 'w-24', cell: (e) => <Badge tone={e.kind === 'bridged' ? 'staff' : 'accent'}>{e.kind === 'bridged' ? `bridge ${e.bridge}` : 'funded'}</Badge> },
          { key: 'f', header: 'From', cell: (e) => <span className="flex items-center gap-1"><HuntAddress chain={e.from_chain} address={e.from} /><ChainName chain={e.from_chain} /></span> },
          { key: 't', header: 'To', cell: (e) => <span className="flex items-center gap-1"><HuntAddress chain={e.to_chain} address={e.to} /><ChainName chain={e.to_chain} /></span> },
          { key: 'x', header: 'Transactions', hide: 'sm', cell: (e) => <span className="font-mono text-xs text-fg-3">{short(e.tx)}{e.dest_tx ? `, ${short(e.dest_tx)}` : ''}</span> },
        ]} />
      </Card>
      <Card title="Ultimate sources">
        {trace.sources.length === 0 ? <p className="text-sm text-fg-3">None beyond the account itself.</p> : (
          <ul className="grid gap-1.5 text-sm">
            {trace.sources.map((n) => (
              <li key={`${n.chain}:${n.address}`} className="flex flex-wrap items-center gap-2">
                <HuntAddress chain={n.chain} address={n.address} /><ChainName chain={n.chain} />
                {n.labels?.map((l) => <Badge key={l}>{l}</Badge>)}
                {n.clusters?.map((c) => <ClusterLink key={c} code={c} />)}
                <span className="text-xs text-fg-3">{n.cut ? `as far as ${trace.depth} hops reach` : 'no earlier funds known'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Investigation({ inv }) {
  return (
    <div className="grid gap-4">
      <Card title="Scores">
        {inv.immune_scores.length === 0 ? <p className="text-sm text-fg-3">Hunt has not scored this address.</p> : (
          <div className="flex flex-wrap gap-3 text-sm">{inv.immune_scores.map((s) => <span key={s.kind} className="flex items-center gap-2"><span className="capitalize text-fg-2">{s.kind}</span><ScoreBadge score={s.score} label={s.label} /></span>)}</div>
        )}
      </Card>
      <Card flush title="Funding clusters">
        <DataTable rows={inv.clusters} dense rowKey={(c) => c.id} rowHref={(c) => `/dashboard/hunt/clusters/${c.id}`} empty={<EmptyState compact title="In no funding cluster" />} columns={[
          { key: 'id', header: 'Cluster', cell: (c) => <ClusterLink code={c.id} /> },
          { key: 'p', header: 'Points', cell: (c) => <BandBadge band={c.band} points={c.points} /> },
          { key: 'r', header: 'Rules', cell: (c) => <RuleTags rules={c.rules} /> },
        ]} />
      </Card>
      <Card flush title="Contracts it deployed" description="The latest 50, newest first.">
        <DataTable rows={inv.deployed} dense rowKey={(t) => t.contract} empty={<EmptyState compact title="No deployments seen" />} columns={[
          { key: 'c', header: 'Contract', cell: (t) => <HuntAddress chain={t.chain} address={t.contract} /> },
          { key: 'p', header: 'Points', align: 'right', cell: (t) => <span className="tnum">{t.points}</span> },
          { key: 'v', header: 'Verification', hide: 'sm', cell: (t) => <span className="text-fg-2">{t.verification || '-'}</span> },
          { key: 'w', header: 'When', align: 'right', cell: (t) => <span className="text-fg-3" title={dateTime(t.deployed_at)}>{ago(t.deployed_at)}</span> },
        ]} />
      </Card>
      {inv.funding && <FundTrace trace={inv.funding} />}
    </div>
  )
}

export default function HuntRequest() {
  const { id } = useParams()
  const r = useHunt(`/requests/${id}`)
  if (r.error) return <div><PageHeader title="Request" back={{ to: '/dashboard/hunt?tab=requests', label: 'Investigations' }} /><Card><HuntError status={r.status} error={r.error} onRetry={r.reload} /></Card></div>
  if (!r.data) return <PageSkeleton cards={3} />
  const q = r.data
  return (
    <div>
      <PageHeader back={{ to: '/dashboard/hunt?tab=requests', label: 'Investigations' }}
        title={q.kind === 'trace' ? 'Cross-chain fund trace' : 'Investigation'}
        description={<span className="break-all font-mono text-xs">{q.address} on {q.chain}</span>}
        meta={<span className="flex flex-wrap items-center gap-2"><Badge>{q.credits} credits</Badge><span title={dateTime(q.created_at)}>{ago(q.created_at)}</span></span>} />
      {q.kind === 'trace' ? <FundTrace trace={q.result} /> : <Investigation inv={q.result} />}
    </div>
  )
}
