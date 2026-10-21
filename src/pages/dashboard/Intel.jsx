import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Telescope } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ButtonTabs, FilterSelect, SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import { errorMessage } from '../../components/common/Alert.jsx'
import { SeverityTag } from '../../components/admin/intelBits.jsx'
import { CONTROL_KIND, change } from '../../components/admin/IntelControl.jsx'
import { Status, Tally } from '../../components/admin/IntelGovernance.jsx'
import { Flags, followedTvl, usd } from '../../components/admin/IntelProtocols.jsx'
import { AccessBadge, AddressLink, ChainName, IntelError, Locked, addressPath, isAddress, short, useIntelAccess } from '../../components/intel/IntelKit.jsx'

const TABS = [
  { value: 'risk', label: 'Risk events', need: 'full' },
  { value: 'control', label: 'Upgrades and admin', need: 'full' },
  { value: 'deployments', label: 'Deployments', need: 'full' },
  { value: 'governance', label: 'Governance', need: 'full' },
  { value: 'exploits', label: 'Exploits', need: 'basic' },
  { value: 'protocols', label: 'Protocols', need: 'full' },
]

const RISK_KINDS = [
  { value: '', label: 'All kinds' },
  { value: 'upgrade', label: 'Upgrades' },
  { value: 'admin_change,owner_change,renounced', label: 'Admin and owner changes' },
  { value: 'fast_governance,fast_timelock', label: 'Fast governance' },
  { value: 'large_transfer', label: 'Large transfers' },
  { value: 'exploit_code', label: 'Copies exploit code' },
  { value: 'spoofed_token', label: 'Spoofed tokens' },
]
const SEVERITIES = [
  { value: 'low', label: 'Low and up' },
  { value: 'medium', label: 'Medium and up' },
  { value: 'high', label: 'High and up' },
  { value: 'critical', label: 'Critical' },
]
const CONTROL_KINDS = [
  { value: '', label: 'All changes' },
  { value: 'upgraded,beacon_upgraded,diamond_cut', label: 'Upgrades' },
  { value: 'admin_changed', label: 'Admin changes' },
  { value: 'ownership_transferred,ownership_transfer_started', label: 'Owner changes' },
  { value: 'role_granted,role_revoked,role_admin_changed', label: 'Roles' },
  { value: 'timelock_scheduled,timelock_executed,timelock_cancelled,timelock_delay_changed', label: 'Timelock' },
]

// Feed is one paged Intel list: the first page loads with the filters and
// "Load more" asks for the page before the last row.
function Feed({ path, params, field, cursor, columns, rowKey, empty, what }) {
  const { currentOrg } = useAuth()
  const [rows, setRows] = useState(null)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const [tick, setTick] = useState(0)
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  const base = `/api/v1/orgs/${currentOrg.id}/intel${path}?limit=50${query ? `&${query}` : ''}`

  useEffect(() => {
    let live = true
    setRows(null)
    setFailure(null)
    api(base).then((d) => { if (live) { setRows(d[field]); setMore(d[field].length === 50) } },
      (err) => { if (live) setFailure({ status: err.status, error: errorMessage(err) }) })
    return () => { live = false }
  }, [base, field, tick])

  async function loadMore() {
    setBusy(true)
    try {
      const d = await api(`${base}&before=${encodeURIComponent(cursor(rows[rows.length - 1]))}`)
      setRows([...rows, ...d[field]])
      setMore(d[field].length === 50)
    } catch (err) {
      setFailure({ status: err.status, error: errorMessage(err) })
    }
    setBusy(false)
  }

  if (failure && !rows) return <div className="px-5 pb-5"><IntelError {...failure} what={what} onRetry={() => setTick(tick + 1)} /></div>
  return (
    <DataTable rows={rows} loading={!rows} rowKey={rowKey} columns={columns} empty={empty}
      footer={rows && more && (
        <div className="flex w-full justify-center">
          <Button size="sm" variant="ghost" onClick={loadMore} disabled={busy}>{busy ? 'Loading' : 'Load more'}</Button>
        </div>
      )} />
  )
}

const chainOptions = (chains) => [{ value: '', label: 'All chains' }, ...chains.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))]

function RiskTab({ chains }) {
  const [chain, setChain] = useState('')
  const [kind, setKind] = useState('')
  const [severity, setSeverity] = useState('low')
  return (
    <Card flush title="Risk events" description="Upgrades and control changes on contracts Intel watches, fast governance, large transfers of tracked tokens, contracts copying exploit code and tokens imitating well known ones.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="risk-chain" label="Chain" value={chain} onChange={setChain} options={chainOptions(chains)} />
        <FilterSelect id="risk-kind" label="Kind" value={kind} onChange={setKind} options={RISK_KINDS} />
        <FilterSelect id="risk-severity" label="Severity" value={severity} onChange={setSeverity} options={SEVERITIES} />
      </Toolbar></div>
      <Feed path="/risk-events" params={{ chain, kind, severity }} field="events" cursor={(e) => e.id} rowKey={(e) => e.id}
        empty={<EmptyState compact title="No risk event matches">Events appear here as Intel finds them.</EmptyState>}
        columns={[
          { key: 's', header: 'Severity', className: 'w-28', cell: (e) => <SeverityTag severity={e.severity} /> },
          { key: 't', header: 'Event', cell: (e) => <span className="text-fg">{e.title}</span> },
          { key: 'c', header: 'Contract', hide: 'sm', cell: (e) => <AddressLink chain={e.chain} address={e.contract} /> },
          { key: 'chain', header: 'Chain', hide: 'md', cell: (e) => <ChainName chain={e.chain} /> },
          { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={dateTime(e.created_at)}>{ago(e.created_at)}</span> },
        ]} />
    </Card>
  )
}

function ControlTab({ chains }) {
  const [chain, setChain] = useState('')
  const [kind, setKind] = useState('')
  return (
    <Card flush title="Upgrades and admin changes" description="Who controls contracts and how that changes. New owners, admins and role members are classified as EOA, multisig, timelock or contract.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="control-chain" label="Chain" value={chain} onChange={setChain} options={chainOptions(chains)} />
        <FilterSelect id="control-kind" label="Change" value={kind} onChange={setKind} options={CONTROL_KINDS} />
      </Toolbar></div>
      <Feed path="/control" params={{ chain, kind }} field="changes" cursor={(e) => e.at} rowKey={(e) => `${e.chain}:${e.tx_hash}:${e.kind}:${e.contract}:${e.account}:${e.new}`}
        empty={<EmptyState compact title="No change matches" />}
        columns={[
          { key: 'k', header: 'Change', className: 'w-40', cell: (e) => { const [tone, label] = CONTROL_KIND[e.kind] || ['neutral', e.kind]; return <Badge tone={tone}>{label}</Badge> } },
          { key: 'c', header: 'Contract', cell: (e) => <AddressLink chain={e.chain} address={e.contract} label={e.labels[0]} /> },
          { key: 'd', header: 'Detail', hide: 'sm', cell: (e) => <span className="text-xs text-fg-2">{change(e)}</span> },
          { key: 'chain', header: 'Chain', hide: 'md', cell: (e) => <ChainName chain={e.chain} /> },
          { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={dateTime(e.at)}>{ago(e.at)}</span> },
        ]} />
    </Card>
  )
}

const PROXY = { eip1967: 'EIP-1967 proxy', beacon: 'Beacon proxy', eip1822: 'UUPS proxy', eip1167: 'Minimal proxy' }

function DeploymentsTab({ chains }) {
  const [chain, setChain] = useState('')
  return (
    <Card flush title="New deployments" description="Contracts created on the chains Intel follows, with what their code and verified source say about them.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="deploy-chain" label="Chain" value={chain} onChange={setChain} options={chainOptions(chains)} />
      </Toolbar></div>
      <Feed path="/deployments" params={{ chain }} field="contracts" cursor={(c) => c.created_at} rowKey={(c) => `${c.chain}:${c.address}`}
        empty={<EmptyState compact title="No deployment yet" />}
        columns={[
          { key: 'a', header: 'Contract', cell: (c) => <AddressLink chain={c.chain} address={c.address} label={c.name || c.labels[0]} /> },
          { key: 'p', header: 'Kind', hide: 'sm', cell: (c) => c.proxy_kind ? <Badge tone="accent">{PROXY[c.proxy_kind] || c.proxy_kind}</Badge> : <span className="text-xs text-fg-3">{c.code_size == null ? 'reading code' : 'contract'}</span> },
          { key: 'v', header: 'Source', hide: 'md', cell: (c) => c.verification === 'verified' ? <Badge tone="good" dot>Verified</Badge> : <span className="text-xs text-fg-3">{c.verification === 'unverified' ? 'Unverified' : 'Checking'}</span> },
          { key: 'g', header: 'Clones', align: 'right', hide: 'lg', cell: (c) => <span className="text-fg-3">{c.clone_group > 1 ? num(c.clone_group - 1) : '-'}</span> },
          { key: 'chain', header: 'Chain', hide: 'md', cell: (c) => <ChainName chain={c.chain} /> },
          { key: 'w', header: 'Created', align: 'right', cell: (c) => <span className="whitespace-nowrap text-fg-3" title={dateTime(c.created_at)}>{ago(c.created_at)}</span> },
        ]} />
    </Card>
  )
}

function GovernanceTab({ chains }) {
  const [chain, setChain] = useState('')
  return (
    <Card flush title="Governance proposals" description="Proposals on governors Intel follows, with their votes and where they are in their lifecycle.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="gov-chain" label="Chain" value={chain} onChange={setChain} options={chainOptions(chains)} />
      </Toolbar></div>
      <Feed path="/proposals" params={{ chain }} field="proposals" cursor={(p) => p.created_at} rowKey={(p) => `${p.chain}:${p.governor}:${p.proposal_id}`}
        empty={<EmptyState compact title="No proposal yet" />}
        columns={[
          { key: 't', header: 'Proposal', cell: (p) => (
            <Link to={`/dashboard/intel/proposals/${p.chain}/${p.governor}/${p.proposal_id}`} className="block max-w-md truncate text-fg hover:underline">
              {p.title || `Proposal ${short(p.proposal_id)}`}
            </Link>
          ) },
          { key: 's', header: 'Status', cell: (p) => <Status p={p} /> },
          { key: 'v', header: 'Votes', hide: 'md', cell: (p) => <Tally p={p} /> },
          { key: 'g', header: 'Governor', hide: 'lg', cell: (p) => <span className="text-xs text-fg-2">{p.labels[0] || short(p.governor)}</span> },
          { key: 'chain', header: 'Chain', hide: 'sm', cell: (p) => <ChainName chain={p.chain} /> },
          { key: 'w', header: 'Created', align: 'right', cell: (p) => <span className="whitespace-nowrap text-fg-3">{ago(p.created_at)}</span> },
        ]} />
    </Card>
  )
}

// Searchable lists: the term is sent after a short pause.
function useSearch(path, field, term) {
  const { currentOrg } = useAuth()
  const [state, setState] = useState({ rows: null, failure: null })
  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      api(`/api/v1/orgs/${currentOrg.id}/intel${path}${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ''}`)
        .then((d) => live && setState({ rows: d[field], failure: null }), (err) => live && setState({ rows: null, failure: { status: err.status, error: errorMessage(err) } }))
    }, term ? 250 : 0)
    return () => { live = false; clearTimeout(t) }
  }, [currentOrg.id, path, field, term])
  return state
}

function ExploitsTab() {
  const [q, setQ] = useState('')
  const { rows, failure } = useSearch('/exploits', 'exploits', q)
  return (
    <Card flush title="Exploit database" description="Past incidents with the contracts and transactions involved, from DeFiHackLabs and Hawk-i research.">
      <div className="px-5 pb-4"><Toolbar><SearchInput id="exploit-search" className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search incidents" /></Toolbar></div>
      {failure ? <div className="px-5 pb-5"><IntelError {...failure} what="The exploit database" /></div> : (
        <DataTable rows={rows} loading={!rows} rowKey={(e) => e.id} rowHref={(e) => `/dashboard/intel/exploits/${e.id}`}
          empty={<EmptyState compact title="No incident matches" />}
          columns={[
            { key: 'd', header: 'Date', className: 'w-28', cell: (e) => <span className="whitespace-nowrap text-fg-3 tnum">{e.occurred_on ? e.occurred_on.slice(0, 10) : '-'}</span> },
            { key: 'n', header: 'Incident', cell: (e) => <Link to={`/dashboard/intel/exploits/${e.id}`} className="text-fg hover:underline">{e.name}</Link> },
            { key: 't', header: 'Attack', hide: 'md', cell: (e) => <span className="text-xs text-fg-2">{e.attack_type || '-'}</span> },
            { key: 'l', header: 'Loss', align: 'right', cell: (e) => <span className="tnum">{usd(e.loss_usd)}</span> },
            { key: 'c', header: 'Chain', align: 'right', hide: 'sm', cell: (e) => <ChainName chain={e.chain} /> },
          ]} />
      )}
    </Card>
  )
}

function ProtocolsTab() {
  const [q, setQ] = useState('')
  const { rows, failure } = useSearch('/protocols', 'protocols', q)
  return (
    <Card flush title="Protocols" description="Protocols on the chains Intel follows, ranked by value locked there, with their contracts, incidents and risk score.">
      <div className="px-5 pb-4"><Toolbar><SearchInput id="protocol-search" className="w-full sm:w-72" value={q} onChange={setQ} placeholder="Search protocols" /></Toolbar></div>
      {failure ? <div className="px-5 pb-5"><IntelError {...failure} what="Protocols" /></div> : (
        <DataTable rows={rows} loading={!rows} rowKey={(p) => p.slug} rowHref={(p) => `/dashboard/intel/protocols/${p.slug}`}
          empty={<EmptyState compact title="No protocol matches" />}
          columns={[
            { key: 'n', header: 'Protocol', cell: (p) => <span className="flex min-w-0 items-center gap-2"><Link to={`/dashboard/intel/protocols/${p.slug}`} className="truncate text-fg hover:underline">{p.name}</Link><Flags p={p} /></span> },
            { key: 'c', header: 'Category', hide: 'sm', cell: (p) => <span className="text-xs text-fg-2">{p.category || '-'}</span> },
            { key: 't', header: 'TVL here', align: 'right', cell: (p) => <span className="tnum">{usd(followedTvl(p))}</span> },
            { key: 'a', header: 'Audits', align: 'right', hide: 'md', cell: (p) => <span className="text-fg-2">{p.audits ?? '-'}</span> },
            { key: 'm', header: 'Contracts', align: 'right', hide: 'sm', cell: (p) => num(p.contracts) },
          ]} />
      )}
    </Card>
  )
}

const HIT = { address: 'Address', contract: 'Contract', token: 'Token', protocol: 'Protocol', exploit: 'Incident', label: 'Label' }
const hitPath = (h) => h.kind === 'protocol' ? `/dashboard/intel/protocols/${h.slug}`
  : h.kind === 'exploit' ? `/dashboard/intel/exploits/${h.id}`
    : h.address ? addressPath(h.chain, h.address) : null

// Lookup finds an address on every chain Intel follows, or protocols,
// tokens, incidents and labels by name, tolerating typos.
function Lookup() {
  const { currentOrg } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState(null)
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  async function search() {
    const term = q.trim()
    if (term.length < 2) return
    setBusy(true)
    setFailure(null)
    try {
      const d = await api(`/api/v1/orgs/${currentOrg.id}/intel/lookup?q=${encodeURIComponent(term)}`)
      const exact = isAddress(term) && d.results.filter((h) => h.address?.toLowerCase() === term.toLowerCase() && h.chain)
      if (exact && new Set(exact.map((h) => h.chain)).size === 1) navigate(addressPath(exact[0].chain, term))
      else setHits(d.results)
    } catch (err) {
      setFailure({ status: err.status, error: errorMessage(err) })
    }
    setBusy(false)
  }
  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput id="intel-lookup" className="min-w-0 flex-1" value={q} onChange={setQ} onSubmit={search}
          placeholder="Look up an address, protocol, token or incident" label="Look up" />
        <Button size="sm" onClick={search} disabled={busy || q.trim().length < 2}>{busy ? 'Searching' : 'Look up'}</Button>
      </div>
      {failure && <div className="mt-3"><IntelError {...failure} what="Lookup" onRetry={search} /></div>}
      {hits && (
        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <DataTable rows={hits} dense rowKey={(h) => `${h.kind}:${h.chain}:${h.address}:${h.slug}:${h.id}:${h.name}`} rowHref={hitPath}
            empty={<EmptyState compact title="Nothing found">Intel knows nothing by that name or address yet.</EmptyState>}
            columns={[
              { key: 'k', header: 'Kind', className: 'w-28', cell: (h) => <Badge>{HIT[h.kind] || h.kind}</Badge> },
              { key: 'n', header: 'Name', cell: (h) => {
                const to = hitPath(h)
                const label = h.name || short(h.address)
                return to ? <Link to={to} className="text-fg hover:underline">{label}</Link> : <span className="text-fg">{label}</span>
              } },
              { key: 'd', header: 'Detail', hide: 'sm', cell: (h) => <span className="text-xs text-fg-3">{h.detail || (h.address ? short(h.address) : '')}</span> },
              { key: 'c', header: 'Chain', align: 'right', cell: (h) => <ChainName chain={h.chain} /> },
            ]} />
        </div>
      )}
    </Card>
  )
}

// Intel is the workspace's view of the Intel Engine: what happens on the
// chains it follows and what is known about any address or protocol.
export default function Intel() {
  const { access, full, basic, error, status, reload } = useIntelAccess()
  const [params, setParams] = useSearchParams()
  if (error) return <IntelError status={status} error={error} onRetry={reload} />
  if (!access) return <PageSkeleton cards={2} />

  const open = (t) => (t.need === 'full' ? full : basic)
  const asked = TABS.find((t) => t.value === params.get('tab'))
  const tab = asked || TABS.find(open) || TABS[0]
  const chains = access.chains || []
  const header = (
    <PageHeader title="Intel" description="Live intelligence on the chains Hawk-i follows: risk events, upgrades and admin changes, new deployments, governance, past exploits and protocols."
      meta={<><AccessBadge access={access} />{chains.length > 0 && <span className="capitalize">{chains.join(', ')}</span>}</>}>
      {basic && (
        <ButtonTabs value={tab.value} onChange={(v) => setParams({ tab: v }, { replace: true })}
          tabs={TABS.map((t) => ({ value: t.value, label: open(t) ? t.label : <span className="inline-flex items-center gap-1.5">{t.label}<Lock size={12} aria-label="not in your plan" /></span> }))} />
      )}
    </PageHeader>
  )
  if (!basic) {
    return (
      <div>
        {header}
        <Card><Locked need="basic" what="Intel" /></Card>
        <Card className="mt-4"><EmptyState icon={Telescope} title="What Intel covers">Risk events as they happen, upgrades and admin changes, new deployments, governance proposals, the exploit database, protocol risk scores, and Intel alerts on your projects' contracts.</EmptyState></Card>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {header}
      {full && <Lookup />}
      {!open(tab) ? <Card><Locked need={tab.need} what={tab.label} /></Card>
        : tab.value === 'risk' ? <RiskTab chains={chains} />
          : tab.value === 'control' ? <ControlTab chains={chains} />
            : tab.value === 'deployments' ? <DeploymentsTab chains={chains} />
              : tab.value === 'governance' ? <GovernanceTab chains={chains} />
                : tab.value === 'exploits' ? <ExploitsTab />
                  : <ProtocolsTab />}
    </div>
  )
}
