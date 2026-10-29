import { Link, useParams } from 'react-router-dom'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { ScoreSection, SeverityTag } from '../../components/admin/intelBits.jsx'
import { ControlSection, STANDARD, units } from '../../components/admin/IntelWallets.jsx'
import { AddressLink, IntelError, Locked, isAddress, short, useIntel, useIntelAccess } from '../../components/intel/IntelKit.jsx'
import { EntityInsights, ScoreHistory } from '../../components/intel/Insights.jsx'
import GraphExplorer from '../../components/intel/GraphExplorer.jsx'

const KIND = { eoa: 'Account (EOA)', contract: 'Contract', unknown: 'Not read yet' }
const PROXY = { eip1967: 'EIP-1967 proxy', beacon: 'Beacon proxy', eip1822: 'UUPS proxy (EIP-1822)', eip1167: 'Minimal proxy (EIP-1167)' }
const CREATED = { deploy: 'Deployed', create: 'Created by a contract', create2: 'Created by a contract (CREATE2)', factory: 'From a factory event' }
const ROLE = { vulnerable: 'vulnerable contract', attacker: 'attacker', attack_contract: 'attack contract', victim: 'victim' }

// Vulnerability is the exposure check open from the Builder plan: past
// incidents the address took part in, and findings that its code copies
// exploit code or that it imitates a well known token.
export function Vulnerability({ v }) {
  const exposed = v.vulnerable || v.findings.length > 0 || v.exploits.length > 0
  return (
    <Card title={<span className="flex items-center gap-2">{exposed ? <ShieldAlert className="size-4 text-[#ff8b8b]" aria-hidden /> : <ShieldCheck className="size-4 text-[#8fd6a5]" aria-hidden />}Vulnerability lookup</span>}
      description="Past incidents and exploit code matches">
      {!exposed ? <p className="text-sm text-fg-2">No recorded incident involves this address and its code matches no known exploit.</p> : (
        <div className="grid gap-3">
          {v.vulnerable && <Badge tone="danger" dot>Known vulnerable</Badge>}
          {v.exploits.map((x) => (
            <Link key={`${x.id}:${x.role}`} to={`/dashboard/intel/exploits/${x.id}`} className="grid gap-0.5 rounded-lg border border-critical/30 bg-critical/[0.04] px-3 py-2 text-xs hover:border-critical/60">
              <span className="font-medium text-fg">{x.name}</span>
              <span className="text-fg-3">{x.occurred_on ? x.occurred_on.slice(0, 10) : 'undated'} · as {ROLE[x.role] || x.role.replace('_', ' ')}</span>
            </Link>
          ))}
          {v.findings.map((e) => <div key={e.id} className="flex flex-wrap items-center gap-2 text-xs"><SeverityTag severity={e.severity} /><span className="text-fg-2">{e.title}</span></div>)}
        </div>
      )}
    </Card>
  )
}

export function SimilarContracts({ chain, rows, total }) {
  return (
    <Card flush title="Similar contracts" description={`Contracts on ${chain} with the same code skeleton: clones of the same source${total > rows.length ? `, first ${rows.length} of ${num(total)}` : ''}`}>
      <DataTable rows={rows} dense rowKey={(c) => c.address} empty={<EmptyState compact title="No other contract shares this code" />} columns={[
        { key: 'a', header: 'Contract', cell: (c) => <AddressLink chain={c.chain} address={c.address} label={c.name || c.labels[0]} /> },
        { key: 'v', header: 'Source', hide: 'sm', cell: (c) => c.verification === 'verified' ? <Badge tone="good">Verified</Badge> : <span className="text-xs text-fg-3">{c.verification || '-'}</span> },
        { key: 'w', header: 'Created', align: 'right', cell: (c) => <span className="whitespace-nowrap text-fg-3">{ago(c.created_at)}</span> },
      ]} />
    </Card>
  )
}

function Facts({ p }) {
  const a = p.address
  const t = p.token
  const c = p.contract
  return (
    <Card title="Facts">
      <DefinitionList items={[
        a && ['Kind', KIND[a.kind] || a.kind],
        a && ['First seen', <span className="tnum">block {a.first_block.toLocaleString('en')} · {dateTime(a.first_seen_at)}</span>],
        a && ['Last seen', <span className="tnum">block {a.last_block.toLocaleString('en')} · {ago(a.last_seen_at)}</span>],
        a && ['Transactions sent', <span className="tnum">{num(a.tx_count)}</span>],
        a?.delegate && ['Delegates to (EIP-7702)', <span className="break-all font-mono text-xs">{a.delegate}</span>],
        t && ['Token', `${t.name || '-'}${t.symbol ? ` (${t.symbol})` : ''} · ${STANDARD[t.standard] || t.standard}`],
        t && ['Total supply', <span className="tnum">{units(t.total_supply, t.decimals)}</span>],
        c && ['Created', <span>{CREATED[c.kind] || c.kind} at block <span className="tnum">{c.block_number.toLocaleString('en')}</span> · {dateTime(c.created_at)}</span>],
        c && ['Creator', <span className="break-all font-mono text-xs">{c.creator}</span>],
        c && ['Proxy', c.proxy_kind ? PROXY[c.proxy_kind] || c.proxy_kind : c.code_size == null ? 'code not read yet' : 'not a proxy'],
        c?.implementation && ['Implementation', <AddressLink chain={c.chain} address={c.implementation} />],
        c && ['Source', c.verification === 'verified' ? `Verified${c.match === 'exact' ? '' : ' (partial match)'} by ${c.verified_by}${c.compiler ? ` · ${c.compiler}` : ''}` : c.verification === 'unverified' ? 'Not verified' : 'Checking'],
        c && ['Code size', c.code_size != null ? `${num(c.code_size)} bytes` : '-'],
      ]} />
    </Card>
  )
}

// IntelAddress is everything Intel knows about one address on one chain.
// The full profile needs full Intel; the vulnerability lookup and similar
// contracts are open from the Builder plan.
export default function IntelAddress() {
  const { chain, address } = useParams()
  const valid = isAddress(address)
  const { access, full, basic, graph, error: accessError, status: accessStatus, reload } = useIntelAccess()
  const base = valid ? `/addresses/${chain}/${address}` : null
  const profile = useIntel(full ? base : null)
  const vuln = useIntel(basic ? `${base}/vulnerability` : null)
  const similar = useIntel(basic && valid ? `/contracts/${chain}/${address}/similar` : null)

  const back = { to: '/dashboard/intel', label: 'Intel' }
  if (!valid) return <><PageHeader back={back} title="Not an address" /><EmptyState title="That is not a 0x address of 40 hex characters" /></>
  if (accessError) return <IntelError status={accessStatus} error={accessError} onRetry={reload} />
  if (!access || (full && profile.loading && !profile.data) || (basic && vuln.loading && !vuln.data)) return <PageSkeleton cards={3} />
  if (!basic) return <><PageHeader back={back} title={short(address)} /><Card><Locked need="basic" what="Intel" /></Card></>

  const p = profile.data
  const t = p?.token
  const c = p?.contract
  const labels = [...new Set([...(p?.address?.labels || []), ...(t?.labels || []), ...(c?.labels || [])])]
  const title = t ? (t.symbol || t.name) : c?.name || labels[0] || similar.data?.contract?.name || short(address)
  const notFound = full && profile.status === 404
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title={title || short(address)}
        meta={<>
          <span className="capitalize">{chain}</span>
          <span className="break-all font-mono">{address}</span>
          {p?.address && <Badge>{KIND[p.address.kind] || p.address.kind}</Badge>}
          {c?.proxy_kind && <Badge tone="accent">Proxy</Badge>}
          {labels.map((l) => <Badge key={l}>{l}</Badge>)}
          {(p?.protocols || []).map((pc) => <Link key={pc.protocol} to={`/dashboard/intel/protocols/${pc.protocol}`}><Badge tone="accent">{pc.protocol_name}</Badge></Link>)}
        </>} />
      {notFound && <Card><EmptyState title="Intel has not seen this address">It appears once it sends or receives a transaction on {chain}, or once a contract is created there.</EmptyState></Card>}
      {full && profile.error && !notFound && <IntelError status={profile.status} error={profile.error} onRetry={profile.reload} />}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          {p && <Facts p={p} />}
          {p?.control && <div className="min-w-0 rounded-lg bg-surface"><ControlSection ctl={p.control} /></div>}
          {p && (
            <Card flush title="Risk events" description="What the risk rules found on this address">
              <DataTable rows={p.risk_events} dense rowKey={(e) => e.id} empty={<EmptyState compact title="No risk event" />} columns={[
                { key: 's', header: 'Severity', className: 'w-28', cell: (e) => <SeverityTag severity={e.severity} /> },
                { key: 't', header: 'Event', cell: (e) => <span className="text-fg">{e.title}</span> },
                { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={dateTime(e.created_at)}>{ago(e.created_at)}</span> },
              ]} />
            </Card>
          )}
          {full && p && <EntityInsights query={`chain=${chain}&address=${address.toLowerCase()}`} />}
          {graph && p ? (
            <Card title="Threat Graph" description="How this address connects to contracts, protocols, incidents and other accounts">
              <GraphExplorer start={`address:${chain}:${address.toLowerCase()}`} />
            </Card>
          ) : full && p && <Card><Locked need="graph" what="The Threat Graph" compact /></Card>}
          {similar.data && <SimilarContracts chain={chain} rows={similar.data.similar} total={similar.data.contract.clone_group - 1} />}
          {!full && <Card><Locked need="full" what="The full address profile" compact /></Card>}
        </div>
        <div className="grid min-w-0 gap-4">
          {p?.score && <div className="rounded-lg bg-surface"><ScoreSection score={p.score} title={c ? 'Risk score' : 'Account risk score'} /></div>}
          {p?.score && <ScoreHistory path={`/scores/${c ? 'contracts' : 'wallets'}/${chain}/${address.toLowerCase()}`} />}
          {vuln.data ? <Vulnerability v={vuln.data} /> : vuln.error && <IntelError status={vuln.status} error={vuln.error} onRetry={vuln.reload} />}
        </div>
      </div>
    </div>
  )
}
