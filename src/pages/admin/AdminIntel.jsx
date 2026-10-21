import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Boxes, CheckCircle2, FileCode2, Inbox, Network, ServerCrash, ShieldAlert, Skull, Timer, Wrench } from 'lucide-react'
import { ago, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { CardLink } from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSelect, SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import {
  AuditTable, Backfill, ChainStatus, EndpointsTable, IndexersTable, Integrity, PauseControl, ReprocessForm, RepairsTable,
  blockTime, chainHead, chainLag, height, lagIsHigh, useIntelCrumb, useIntelStatus,
} from '../../components/admin/IntelOps.jsx'
import IntelDeadLetters, { IntelSources } from '../../components/admin/IntelDeadLetters.jsx'
import IntelContracts from '../../components/admin/IntelContracts.jsx'
import IntelWallets from '../../components/admin/IntelWallets.jsx'
import IntelControl from '../../components/admin/IntelControl.jsx'
import IntelGovernance from '../../components/admin/IntelGovernance.jsx'
import IntelProtocols from '../../components/admin/IntelProtocols.jsx'
import IntelRisk from '../../components/admin/IntelRisk.jsx'

// The Intel Engine pages of the admin console. Each page loads only the
// parts of the Intel status it shows (GET /admin/intel?parts=...) and
// refreshes them every 10 seconds.

const REFRESH = 'Refreshes every 10 seconds.'

function Loading({ r, cards = 3 }) {
  if (r.error && !r.data) return <ErrorState onRetry={r.reload}>{r.error}</ErrorState>
  return <PageSkeleton cards={cards} />
}

function NotStarted() {
  return <Card><EmptyState icon={Network} title="Intel has not started yet">Start the Intel service with <code className="font-mono">intel ingest</code>; its chains appear here.</EmptyState></Card>
}

// Overview: the engine at a glance and whatever needs attention.
export default function IntelOverview() {
  const r = useIntelStatus(['summary', 'chains', 'sources', 'audit'], { auditLimit: 8 })
  if (!r.data) return <Loading r={r} cards={8} />
  const { summary: s, chains, sources, audit } = r.data
  const enabled = chains.filter((c) => c.enabled)
  const attention = [
    ...enabled.filter((c) => c.status !== 'ok').map((c) => ({ key: `s:${c.name}`, to: `/admin/intel/chains/${c.name}`, text: `${c.name} is ${c.status === 'mismatch' ? 'served by an endpoint on another chain' : c.status}`, detail: c.status_detail })),
    ...enabled.filter((c) => c.paused).map((c) => ({ key: `p:${c.name}`, to: `/admin/intel/chains/${c.name}`, text: `${c.name} ingestion is paused`, detail: c.paused_reason })),
    ...enabled.filter(lagIsHigh).map((c) => ({ key: `l:${c.name}`, to: `/admin/intel/chains/${c.name}`, text: `${c.name} is ${height(chainLag(c))} blocks behind its head`, detail: `${c.confirmations} are held back on purpose` })),
    ...(s.dead_letters > 0 ? [{ key: 'dl', to: '/admin/intel/indexing', text: `${num(s.dead_letters)} dead letters waiting`, detail: 'Replay them once the cause is fixed, or dismiss them' }] : []),
    ...sources.filter((x) => x.error).map((x) => ({ key: `src:${x.source}`, to: '/admin/intel/sources', text: `${x.source} sync failing`, detail: x.error })),
  ]
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Intel Engine" description="The chains Intel follows, how far ingestion and indexing are, and what Intel found in the last day."
        meta={<><span>{REFRESH}</span><span>Configured in config/intel.yaml; run <code className="font-mono">intel ingest</code> and <code className="font-mono">intel index</code>.</span></>} />
      {chains.length === 0 ? <NotStarted /> : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Chains healthy" icon={Network} value={`${s.chains_healthy} / ${s.chains}`} tone={s.chains_healthy < s.chains ? 'danger' : undefined}
              sub={s.chains_paused ? `${s.chains_paused} paused` : 'followed'} to="/admin/intel/chains" />
            <StatCard label="Endpoints up" icon={ServerCrash} value={`${s.endpoints_up} / ${s.endpoints}`} tone={s.endpoints_up < s.endpoints ? 'danger' : undefined} sub="RPC endpoints of followed chains" to="/admin/intel/chains" />
            <StatCard label="Ingestion lag" icon={Timer} value={s.ingest_lag == null ? '-' : `${num(s.ingest_lag)} blocks`} sub="worst chain, confirmations included" to="/admin/intel/chains" />
            <StatCard label="Indexer lag" icon={Inbox} value={s.indexer_lag == null ? '-' : `${num(s.indexer_lag)} blocks`} sub="worst indexer behind ingestion" to="/admin/intel/indexing" />
            <StatCard label="Dead letters" icon={Inbox} value={num(s.dead_letters)} tone={s.dead_letters ? 'danger' : undefined} sub={s.repairs_pending ? `${s.repairs_pending} repairs running` : 'no repair running'} to="/admin/intel/indexing" />
            <StatCard label="Contracts deployed" icon={FileCode2} value={num(s.contracts_24h)} sub="last 24 hours" to="/admin/intel/contracts" />
            <StatCard label="Risk events" icon={ShieldAlert} value={num(s.risk_events_24h)} sub={`${num(s.high_risk_24h)} high or critical, last 24 hours`} to="/admin/intel/risk" />
            <StatCard label="Exploits recorded" icon={Skull} value={num(s.exploits)} sub={`${num(s.protocols)} protocols known`} to="/admin/intel/risk" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3" title="Chains" description="Open a chain for its endpoints, backfill, integrity and controls" actions={<CardLink to="/admin/intel/chains">All chains</CardLink>} flush>
              <ChainsTable rows={enabled} compact />
            </Card>
            <Card className="xl:col-span-2" title="Needs attention" actions={attention.length > 0 && <Badge tone="warning">{attention.length}</Badge>}>
              {attention.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-fg-2"><CheckCircle2 size={16} className="text-[#8fd6a5]" aria-hidden />Nothing needs attention.</div>
              ) : (
                <ul className="grid gap-2">
                  {attention.map((a) => (
                    <li key={a.key}>
                      <Link to={a.to} className="flex gap-3 rounded-lg border border-warning/30 bg-warning/[0.05] px-3 py-2 hover:border-warning/60">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#f5dfae]" aria-hidden />
                        <span className="grid min-w-0 gap-0.5"><span className="text-sm text-fg first-letter:uppercase">{a.text}</span>{a.detail && <span className="truncate text-xs text-fg-3">{a.detail}</span>}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Latest changes" description="What Intel changed in its own state, and what staff did" actions={<CardLink to="/admin/intel/audit">Full audit</CardLink>} flush>
            <AuditTable rows={audit} />
          </Card>
        </>
      )}
    </div>
  )
}

function ChainsTable({ rows, compact }) {
  return (
    <DataTable rows={rows} rowKey={(c) => c.name} rowHref={(c) => `/admin/intel/chains/${c.name}`} dense empty={<EmptyState compact title="No chain followed" />} columns={[
      { key: 'name', header: 'Chain', cell: (c) => <Link to={`/admin/intel/chains/${c.name}`} className="font-medium capitalize text-fg hover:underline">{c.name}</Link> },
      { key: 'status', header: 'Status', cell: (c) => <span className="flex flex-wrap gap-1"><ChainStatus status={c.status} />{c.paused && <Badge tone="warning">Paused</Badge>}</span> },
      { key: 'head', header: 'Head', align: 'right', hide: compact ? 'lg' : 'md', cell: (c) => height(chainHead(c)) },
      { key: 'ingested', header: 'Ingested', align: 'right', hide: compact ? 'xl' : 'md', cell: (c) => height(c.ingested_number) },
      { key: 'lag', header: 'Behind', align: 'right', cell: (c) => { const lag = chainLag(c); return <span className={`whitespace-nowrap ${lagIsHigh(c) ? 'text-[#f5dfae]' : ''}`}>{lag == null ? '-' : `${height(lag)} blocks`}</span> } },
      { key: 'ep', header: 'Endpoints', align: 'right', hide: 'sm', cell: (c) => `${c.endpoints.filter((e) => e.healthy).length} / ${c.endpoints.length}` },
      !compact && { key: 'bt', header: 'Block time', align: 'right', hide: 'lg', cell: (c) => blockTime(c.block_time_ms) },
      !compact && { key: 'conf', header: 'Confirmations', align: 'right', hide: 'lg', cell: (c) => c.confirmations },
      !compact && { key: 'bf', header: 'Backfill', align: 'right', hide: 'xl', cell: (c) => c.backfill_next == null ? '-' : c.backfill_next >= c.backfill_target ? 'done' : `${Math.floor(((c.backfill_next - c.backfill_start) / Math.max(1, c.backfill_target - c.backfill_start)) * 100)}%` },
      !compact && { key: 'int', header: 'Integrity', align: 'right', hide: 'xl', cell: (c) => c.integrity ? (c.integrity.gaps_found + c.integrity.breaks_found > 0 ? <Badge tone="warning">repaired</Badge> : <Badge tone="good">clean</Badge>) : '-' },
    ].filter(Boolean)} />
  )
}

export function IntelChains() {
  useIntelCrumb('Chains')
  const r = useIntelStatus(['chains'])
  if (!r.data) return <Loading r={r} />
  const enabled = r.data.chains.filter((c) => c.enabled)
  const disabled = r.data.chains.filter((c) => !c.enabled)
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Chains" description={`Chains Intel follows, how far ingestion is and the health of their RPC endpoints. ${REFRESH}`} />
      {r.data.chains.length === 0 ? <NotStarted /> : (
        <Card title="Followed" flush><ChainsTable rows={enabled} /></Card>
      )}
      {disabled.length > 0 && (
        <Card title="Configured but off" description="Enable a chain in the Intel config once it has an endpoint that can keep up" flush>
          <DataTable rows={disabled} rowKey={(c) => c.name} dense columns={[
            { key: 'name', header: 'Chain', cell: (c) => <span className="capitalize text-fg">{c.name}</span> },
            { key: 'id', header: 'Chain id', align: 'right', cell: (c) => c.chain_id },
            { key: 'bt', header: 'Block time', align: 'right', cell: (c) => blockTime(c.block_time_ms) },
            { key: 'conf', header: 'Confirmations', align: 'right', hide: 'sm', cell: (c) => c.confirmations },
          ]} />
        </Card>
      )}
    </div>
  )
}

export function IntelChain() {
  const { chain } = useParams()
  const r = useIntelStatus(['chains', 'indexers', 'repairs', 'audit'], { chain, auditLimit: 30 })
  const c = r.data?.chains.find((x) => x.name === chain)
  useIntelCrumb(c ? c.name[0].toUpperCase() + c.name.slice(1) : null)
  const back = { to: '/admin/intel/chains', label: 'Chains' }
  if (!r.data) return <Loading r={r} />
  if (!c) return <><PageHeader back={back} title="Chain not found" /><Card><EmptyState title={`Intel has no chain called ${chain}`} /></Card></>
  const head = chainHead(c)
  const lag = chainLag(c)
  const healthy = c.endpoints.filter((e) => e.healthy).length
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title={<span className="capitalize">{c.name}</span>}
        meta={<><ChainStatus status={c.status} />{c.paused && <Badge tone="warning" dot>Paused</Badge>}<span>chain {c.chain_id}</span><span>{blockTime(c.block_time_ms)} blocks</span><span>start {c.start_policy}</span>{c.traces && <span>traces on</span>}</>} />
      {c.status_detail && c.status !== 'ok' && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${c.status === 'degraded' ? 'border-warning/30 bg-warning/[0.06] text-[#f5dfae]' : 'border-critical/40 bg-critical/[0.06] text-[#f3c7c7]'}`}>{c.status_detail}</div>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Chain head" icon={Network} value={height(head)} sub={c.head_seen_at ? `seen ${ago(c.head_seen_at)}` : 'not seen yet'} />
        <StatCard label="Ingested" icon={Inbox} value={height(c.ingested_number)} sub={c.ingested_at ? `last ${ago(c.ingested_at)}` : 'not started'} />
        <StatCard label="Behind the head" icon={Timer} value={lag == null ? '-' : `${height(lag)} blocks`} tone={lagIsHigh(c) ? 'danger' : undefined} sub={`${c.confirmations} held back for safety`} />
        <StatCard label="Endpoints up" icon={ServerCrash} value={`${healthy} / ${c.endpoints.length}`} tone={healthy < c.endpoints.length ? 'danger' : undefined} sub="probed every few seconds" />
      </div>
      <Card title="RPC endpoints" description="Lower priority is tried first; keys never leave the Intel service, only scheme and host show" flush>
        <EndpointsTable endpoints={c.endpoints} />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Backfill" description="History fetched behind where forward ingestion began"><Backfill c={c} /></Card>
        <Card title="Integrity" description="Stored blocks re-checked for gaps and broken parent links; problems become repairs"><Integrity c={c} /></Card>
      </div>
      <Card title="Controls" description="Both need a reason and are recorded in the Intel audit and the platform audit">
        <div className="grid grid-cols-1 gap-6 divide-y divide-line [&>*:not(:first-child)]:pt-6">
          <PauseControl c={c} query={r.query} onChanged={r.changed} />
          <ReprocessForm c={c} query={r.query} onChanged={r.changed} />
        </div>
      </Card>
      <Card title="Indexers on this chain" flush><IndexersTable rows={r.data.indexers.filter((x) => x.chain === c.name)} showChain={false} /></Card>
      <Card title={<span className="flex items-center gap-2"><Wrench className="size-4 text-fg-3" aria-hidden />Repairs</span>} description="Ranges fetched again on this chain" flush>
        <RepairsTable rows={r.data.repairs.filter((x) => x.chain === c.name)} showChain={false} />
      </Card>
      <Card title="Changes" description="The latest Intel audit entries for this chain" flush><AuditTable rows={r.data.audit} showChain={false} /></Card>
    </div>
  )
}

export function IntelIndexing() {
  useIntelCrumb('Indexing')
  const r = useIntelStatus(['indexers', 'dead_letters', 'repairs'])
  if (!r.data) return <Loading r={r} />
  const { indexers, dead_letters: open, resolved_dead_letters: resolved, repairs } = r.data
  const worst = indexers.reduce((m, x) => Math.max(m, x.lag ?? 0), 0)
  const running = repairs.filter((x) => x.status === 'pending').length
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Indexing" description={<>Indexers turn ingested blocks into tables; they run in <code className="font-mono">intel index</code>. Messages that keep failing are set aside as dead letters. {REFRESH}</>} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Indexers" icon={Boxes} value={num(new Set(indexers.map((x) => x.indexer)).size)} sub={`on ${num(new Set(indexers.map((x) => x.chain)).size)} chains`} />
        <StatCard label="Worst lag" icon={Timer} value={`${num(worst)} blocks`} tone={worst > 100 ? 'danger' : undefined} sub="behind ingestion" />
        <StatCard label="Dead letters" icon={Inbox} value={num(open.length)} tone={open.length ? 'danger' : undefined} sub={`${num(resolved.length)} resolved this week`} />
        <StatCard label="Repairs running" icon={Wrench} value={num(running)} sub={`${num(repairs.length)} recent`} />
      </div>
      <Card title="Indexers" description="Indexed block and distance behind ingestion, per indexer and chain" flush><IndexersTable rows={indexers} /></Card>
      <IntelDeadLetters open={open} resolved={resolved} query={r.query} onChanged={r.changed} />
      <Card title={<span className="flex items-center gap-2"><Wrench className="size-4 text-fg-3" aria-hidden />Repairs</span>}
        description="Ranges fetched again: gaps and broken links found by the integrity check, and reprocessing asked for by staff" flush>
        <RepairsTable rows={repairs} />
      </Card>
    </div>
  )
}

export function IntelSourcesPage() {
  useIntelCrumb('Data sources')
  const r = useIntelStatus(['sources', 'contracts'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Data sources" description="External data Intel brings in: synced registries, and verified source looked up per contract." />
      <IntelSources sources={r.data.sources} />
      <Card title="Contract source verification" description="Sourcify first, then Etherscan when HAWKI_ETHERSCAN_API_KEY is set; files are kept in the object store" flush>
        <DataTable rows={r.data.contracts} rowKey={(s) => s.chain} dense empty={<EmptyState compact title="No contracts yet" />} columns={[
          { key: 'chain', header: 'Chain', cell: (s) => <span className="capitalize text-fg">{s.chain}</span> },
          { key: 'v', header: 'Verified', align: 'right', cell: (s) => num(s.verified) },
          { key: 'u', header: 'Not verified', align: 'right', cell: (s) => num(s.unverified) },
          { key: 'p', header: 'Still checking', align: 'right', cell: (s) => num(Math.max(0, s.contracts - s.verified - s.unverified)) },
          { key: 'f', header: 'Deployers funded', align: 'right', hide: 'sm', cell: (s) => `${num(s.funded)} / ${num(s.deployers)}` },
        ]} />
      </Card>
    </div>
  )
}

export function IntelAuditPage() {
  useIntelCrumb('Audit')
  const [chain, setChain] = useState('')
  const [q, setQ] = useState('')
  const chains = useIntelStatus(['chains'], { every: 0 })
  const r = useIntelStatus(['audit'], { chain, auditLimit: 300 })
  const term = q.trim().toLowerCase()
  const rows = (r.data?.audit || []).filter((a) => !term || `${a.action} ${a.reason} ${a.actor_email}`.toLowerCase().includes(term))
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Intel audit" description="Every change Intel makes to its own state: chains enabled or disabled, ingestion started, paused or resumed, reorgs, resets, backfills, repairs, dead letters and staff actions." />
      <Card flush>
        <div className="p-4"><Toolbar>
          <FilterSelect id="intel-audit-chain" label="Chain" value={chain} onChange={setChain}
            options={[{ value: '', label: 'All chains' }, ...(chains.data?.chains || []).map((c) => ({ value: c.name, label: c.name }))]} />
          <SearchInput id="intel-audit-q" className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Filter by action, reason or person" />
        </Toolbar></div>
        {r.data ? <AuditTable rows={rows} /> : <div className="p-4"><Loading r={r} cards={1} /></div>}
        {r.data && <div className="border-t border-line px-5 py-3 text-xs text-fg-3">Latest {num(r.data.audit.length)} entries{term ? `, ${num(rows.length)} match` : ''}</div>}
      </Card>
    </div>
  )
}

export function IntelContractsPage() {
  useIntelCrumb('Contracts')
  const r = useIntelStatus(['contracts'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Contracts" description="Contracts created on followed chains, with proxy and clone facts read from their code, verified source from Sourcify or Etherscan, and labels." />
      <IntelContracts stats={r.data.contracts} recent={r.data.recent_contracts} />
    </div>
  )
}

export function IntelTokensPage() {
  useIntelCrumb('Wallets and tokens')
  const r = useIntelStatus(['wallets', 'chains'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Wallets and tokens" description="Every address seen on followed chains, tokens found from their transfer events, and transfers and holders of the tokens staff track." />
      <IntelWallets chains={r.data.chains.filter((c) => c.enabled).map((c) => c.name)} wallets={r.data.wallets} tracked={r.data.tracked_tokens} recent={r.data.recent_tokens}
        onChanged={() => r.reload()} />
    </div>
  )
}

export function IntelControlPage() {
  useIntelCrumb('Upgrades and admin')
  const r = useIntelStatus(['control'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Upgrades and admin changes" description="Who controls contracts and how that changes: upgrades, admin and owner changes, roles and timelock operations. Owners, admins and role members are classified as EOA, multisig, timelock or contract." />
      <IntelControl stats={r.data.control} changes={r.data.control_changes} />
    </div>
  )
}

export function IntelGovernancePage() {
  useIntelCrumb('Governance')
  const r = useIntelStatus(['governance'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Governance" description="Proposals on OpenZeppelin Governor, Compound Governor Bravo and Aave v2 governance contracts, with the votes and lifecycle seen since ingestion began." />
      <IntelGovernance stats={r.data.governance} proposals={r.data.proposals} />
    </div>
  )
}

export function IntelProtocolsPage() {
  useIntelCrumb('Protocols')
  const r = useIntelStatus(['protocols', 'sources'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Protocols" description="Protocols from DefiLlama, refreshed daily, with their core contracts, the contracts their factories created, and customer projects linked to them." />
      <IntelProtocols stats={r.data.protocols} sources={r.data.sources} top={r.data.top_protocols} links={r.data.project_links} />
    </div>
  )
}

export function IntelRiskPage() {
  useIntelCrumb('Risk and exploits')
  const r = useIntelStatus(['risk'])
  if (!r.data) return <Loading r={r} />
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title="Risk and exploits" description="What the risk rules found, and the exploit database they draw on." />
      <IntelRisk stats={r.data.risk} events={r.data.risk_events} exploitStats={r.data.exploit_stats} exploits={r.data.recent_exploits} onChanged={r.reload} />
    </div>
  )
}
