import { useParams } from 'react-router-dom'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { Status, weight } from '../../components/admin/IntelGovernance.jsx'
import { AddressLink, IntelError, short, useIntel } from '../../components/intel/IntelKit.jsx'

const SUPPORT = ['Against', 'For', 'Abstain']
const when = (p, v) => (p.clock === 'timestamp' ? dateTime(new Date(Number(v) * 1000)) : `block ${Number(v).toLocaleString('en')}`)

// IntelProposal is one governance proposal with its actions, votes and
// lifecycle.
export default function IntelProposal() {
  const { chain, governor, id } = useParams()
  const { data: p, error, status, reload } = useIntel(`/proposals/${chain}/${governor}/${encodeURIComponent(id)}`)
  const back = { to: '/dashboard/intel?tab=governance', label: 'Governance' }
  if (status === 404) return <><PageHeader back={back} title="Proposal not found" /><EmptyState title="Intel has not seen this proposal" /></>
  if (error) return <IntelError status={status} error={error} onRetry={reload} what="Governance" />
  if (!p) return <PageSkeleton cards={3} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title={p.title || `Proposal ${short(p.proposal_id)}`}
        meta={<><Status p={p} />{p.flavor === 'aave_v2' && <Badge>Aave v2</Badge>}{p.labels.map((l) => <Badge key={l}>{l}</Badge>)}<span className="capitalize">{p.chain}</span></>} />
      <Card title="Proposal">
        <DefinitionList items={[
          ['Governor', <AddressLink chain={p.chain} address={p.governor} />],
          ['Proposer', <AddressLink chain={p.chain} address={p.proposer} />],
          ['Voting', p.vote_start ? `${when(p, p.vote_start)} to ${when(p, p.vote_end)}` : '-'],
          ['Votes seen', <span className="tnum">{weight(p.votes_for)} for · {weight(p.votes_against)} against · {weight(p.votes_abstain)} abstain ({num(p.voters)} voters)</span>],
          p.eta && ['Executable from', dateTime(new Date(Number(p.eta) * 1000))],
          ['Created', <span className="tnum">block {p.block_number.toLocaleString('en')} · {dateTime(p.created_at)}</span>],
          ['Proposal id', <span className="break-all font-mono text-xs">{p.proposal_id}</span>],
        ]} />
      </Card>
      <Card flush title={`Actions (${p.actions.length})`} description="What the proposal does when executed">
        <DataTable rows={p.actions.map((a, i) => ({ ...a, i }))} dense rowKey={(a) => a.i} empty={<EmptyState compact title="No actions" />} columns={[
          { key: 't', header: 'Target', cell: (a) => <AddressLink chain={p.chain} address={a.target} /> },
          { key: 's', header: 'Call', cell: (a) => <span className="break-all font-mono text-xs text-fg-2">{a.signature || (a.calldata.length > 10 ? a.calldata.slice(0, 10) : 'plain transfer')}</span> },
          { key: 'v', header: 'Value (wei)', align: 'right', hide: 'sm', cell: (a) => <span className="text-fg-3">{a.value}</span> },
        ]} />
      </Card>
      {p.description && (
        <Card title="Description">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-fg-2">{p.description}</pre>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card flush title="Largest votes">
          <DataTable rows={p.votes || []} dense rowKey={(v) => v.voter} empty={<EmptyState compact title="No votes seen" />} columns={[
            { key: 'v', header: 'Voter', cell: (v) => <AddressLink chain={p.chain} address={v.voter} /> },
            { key: 's', header: 'Vote', cell: (v) => <span className="text-xs text-fg-2">{SUPPORT[v.support] || v.support}</span> },
            { key: 'w', header: 'Weight', align: 'right', cell: (v) => weight(v.weight) },
          ]} />
        </Card>
        <Card flush title="Lifecycle">
          <DataTable rows={p.events || []} dense rowKey={(e) => `${e.kind}:${e.block_number}`} empty={<EmptyState compact title="Not queued, executed or canceled yet" />} columns={[
            { key: 'k', header: 'Event', cell: (e) => <span className="capitalize text-fg">{e.kind}</span> },
            { key: 'b', header: 'Block', align: 'right', cell: (e) => <span className="text-fg-2">{e.block_number.toLocaleString('en')}</span> },
            { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3">{ago(e.at)}</span> },
          ]} />
        </Card>
      </div>
    </div>
  )
}
