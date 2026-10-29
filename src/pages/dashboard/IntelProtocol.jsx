import { Link, useParams } from 'react-router-dom'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { ScoreSection } from '../../components/admin/intelBits.jsx'
import { Flags, usd } from '../../components/admin/IntelProtocols.jsx'
import { AddressLink, ChainName, IntelError, Locked, useIntel, useIntelAccess } from '../../components/intel/IntelKit.jsx'
import { EntityInsights, ScoreHistory } from '../../components/intel/Insights.jsx'
import GraphExplorer from '../../components/intel/GraphExplorer.jsx'

const SOURCE = { curated: 'Curated', factory: 'Created by its factory', proxy: 'Proxy of its implementation' }
const ext = (href, text) => <a href={href} target="_blank" rel="noreferrer noopener" className="break-all text-accent hover:underline">{text}</a>

// IntelProtocol is one protocol: its risk score, incidents, facts from
// DefiLlama and its contracts on the chains Intel follows.
export default function IntelProtocol() {
  const { slug } = useParams()
  const { data, error, status, reload } = useIntel(`/protocols/${encodeURIComponent(slug)}`)
  const { graph } = useIntelAccess()
  const back = { to: '/dashboard/intel?tab=protocols', label: 'Protocols' }
  if (status === 404) return <><PageHeader back={back} title="Protocol not found" /><EmptyState title="Intel does not know this protocol" /></>
  if (error) return <IntelError status={status} error={error} onRetry={reload} what="Protocols" />
  if (!data) return <PageSkeleton cards={3} />
  const p = data.protocol
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title={p.name} description={p.description || undefined}
        meta={<><span>{p.category || 'Uncategorised'}</span><Flags p={p} />{p.parent && <Badge>{p.parent}</Badge>}<span>Data from DefiLlama, updated {ago(p.updated_at)}</span></>} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          <Card title="Facts">
            <DefinitionList items={[
              ['TVL (all chains)', usd(p.tvl)],
              ['On followed chains', Object.keys(p.chain_tvls || {}).length ? Object.entries(p.chain_tvls).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${usd(v)}`).join(' · ') : '-'],
              ['Audits', p.audits == null ? '-' : p.audit_links?.length ? <span className="grid gap-0.5">{p.audit_links.slice(0, 4).map((l) => <span key={l}>{ext(l, l)}</span>)}</span> : num(p.audits)],
              ['Listed', p.listed_at ? dateTime(p.listed_at) : '-'],
              p.url && ['Website', ext(p.url, p.url)],
              p.forked_from?.length > 0 && ['Forked from', p.forked_from.join(', ')],
              p.governance?.length > 0 && ['Governance', p.governance.join(', ')],
              ['Chains', p.chains.join(', ')],
            ]} />
          </Card>
          <Card flush title="Contracts" description={`On the chains Intel follows (${num(p.contracts)}${p.contracts > data.contracts.length ? `, first ${data.contracts.length}` : ''})`}>
            <DataTable rows={data.contracts} dense rowKey={(c) => `${c.chain}:${c.address}`} empty={<EmptyState compact title="No contract mapped yet" />} columns={[
              { key: 'a', header: 'Contract', cell: (c) => <AddressLink chain={c.chain} address={c.address} /> },
              { key: 'r', header: 'Role', cell: (c) => <span className="text-xs text-fg-2">{c.role}</span> },
              { key: 's', header: 'How', hide: 'sm', cell: (c) => <span className="text-xs text-fg-3">{SOURCE[c.source] || c.source}</span> },
              { key: 'c', header: 'Chain', align: 'right', cell: (c) => <ChainName chain={c.chain} /> },
            ]} />
          </Card>
          <EntityInsights query={`protocol=${encodeURIComponent(slug)}`} />
          {graph ? (
            <Card title="Threat Graph" description="The protocol's contracts, who controls them, forks and incidents">
              <GraphExplorer start={`protocol:${slug}`} />
            </Card>
          ) : <Card><Locked need="graph" what="The Threat Graph" compact /></Card>}
        </div>
        <div className="grid min-w-0 gap-4">
          <div className="rounded-lg bg-surface"><ScoreSection score={data.score} title="Protocol risk score" /></div>
          <ScoreHistory path={`/scores/protocols/${encodeURIComponent(slug)}`} />
          <Card title="Incidents">
            {data.exploits.length === 0 ? <p className="text-sm text-fg-2">No recorded incident.</p> : (
              <div className="grid gap-2">
                {data.exploits.map((x) => (
                  <Link key={x.id} to={`/dashboard/intel/exploits/${x.id}`} className="grid gap-0.5 rounded-lg border border-critical/30 bg-critical/[0.04] px-3 py-2 text-xs hover:border-critical/60">
                    <span className="font-medium text-fg">{x.name}</span>
                    <span className="text-fg-3">{x.occurred_on ? x.occurred_on.slice(0, 10) : 'undated'}{x.loss_usd != null ? ` · ${usd(x.loss_usd)} lost` : ''}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
