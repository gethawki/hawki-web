import { Link, useSearchParams } from 'react-router-dom'
import { num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import GraphExplorer from '../../components/intel/GraphExplorer.jsx'
import { IntelError, Locked, nodePath, short, useIntel, useIntelAccess } from '../../components/intel/IntelKit.jsx'

const memberLabel = (m) => m.name || short(m.id.split(':').pop())

// Cluster shows the same-actor cluster holding a node, from the newest
// graph analysis: accounts and contracts tied by deployment, control,
// roles and funding.
export function Cluster({ node }) {
  const list = useIntel(`/graph/clusters?node=${encodeURIComponent(node)}&limit=1`)
  const anchor = list.data?.clusters?.[0]?.anchor
  const detail = useIntel(anchor ? `/graph/clusters/${encodeURIComponent(anchor)}?limit=100` : null)
  if (list.error) return <IntelError status={list.status} error={list.error} onRetry={list.reload} what="Same-actor clusters" />
  if (!list.data) return null
  if (!anchor) return <p className="text-sm text-fg-2">This is in no same-actor cluster: Intel found no other contract tied to it by deployment, control, roles or funding.</p>
  const c = detail.data?.cluster || list.data.clusters[0]
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-3">
        {c.attacker && <Badge tone="danger" dot>Tied to an incident attacker</Badge>}
        <span>{num(c.contracts)} contracts</span><span>{num(c.actors)} accounts</span>
        <span className="capitalize">{c.chains.join(', ')}</span>
        {c.protocols.length > 0 && <span>Protocols: {c.protocols.join(', ')}</span>}
      </div>
      <DataTable rows={detail.data?.members} loading={!detail.data} dense rowKey={(m) => m.id} rowHref={(m) => nodePath(m.id)} empty={<EmptyState compact title="No member listed" />}
        columns={[
          { key: 'n', header: 'Member', cell: (m) => { const to = nodePath(m.id); const l = memberLabel(m); return to ? <Link to={to} className="font-mono text-xs text-fg hover:underline">{l}</Link> : <span className="text-xs">{l}</span> } },
          { key: 'k', header: 'Kind', cell: (m) => <span className="text-xs text-fg-2">{m.kind === 'address' ? 'account' : m.kind}</span> },
          { key: 'c', header: 'Chain', hide: 'sm', cell: (m) => <span className="text-xs capitalize text-fg-3">{m.chain}</span> },
          { key: 'd', header: 'Links', align: 'right', cell: (m) => <span className="tnum text-xs text-fg-3">{num(m.degree)}</span> },
        ]} />
    </div>
  )
}

// IntelGraph is the Threat Graph explorer on its own page, around the node
// in ?node= (address:<chain>:<0x>, protocol:<slug> and so on).
export default function IntelGraph() {
  const [params] = useSearchParams()
  const node = params.get('node') || ''
  const { access, graph, error, status, reload } = useIntelAccess()
  const back = { to: nodePath(node) || '/dashboard/intel', label: nodePath(node) ? 'Back' : 'Intel' }
  if (error) return <IntelError status={status} error={error} onRetry={reload} />
  if (!access) return <PageSkeleton cards={1} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title="Threat Graph" description="How addresses, contracts, protocols, incidents and proposals connect. Expand nodes to follow the links; ask for the shortest path to another address."
        meta={node && <span className="break-all font-mono">{node}</span>} />
      {!graph ? <Card><Locked need="graph" what="The Threat Graph" /></Card>
        : !node ? <Card><EmptyState title="Open the graph from an address or a protocol">Every address, contract and protocol page has a Threat Graph section with a full screen view.</EmptyState></Card>
          : (
            <>
              <Card><GraphExplorer start={node} height="h-[60vh] min-h-[22rem]" fullLink={false} /></Card>
              {node.startsWith('address:') && <Card title="Same-actor cluster" description="From the newest graph analysis"><Cluster node={node} /></Card>}
            </>
          )}
    </div>
  )
}
