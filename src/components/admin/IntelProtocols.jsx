import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import { api } from '../../lib/api.js'
import { ago, dateTime, num } from '../../lib/format.js'
import Card, { DefinitionList } from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import Modal from '../ui/Modal.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { SearchInput } from '../ui/Controls.jsx'
import { errorMessage } from '../common/Alert.jsx'
import { Profile, CONTROLLER } from './IntelWallets.jsx'
import { ScoreSection } from './intelBits.jsx'

const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
const SOURCE = { curated: 'Curated', factory: 'Created by its factory', proxy: 'Proxy of its implementation' }

export function usd(v) {
  if (v == null) return '-'
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${Math.round(v)}`
}

// TVL on the chains Intel follows.
export const followedTvl = (p) => Object.values(p.chain_tvls || {}).reduce((a, b) => a + b, 0)

export function Flags({ p }) {
  return (
    <>
      {p.rugged && <Badge tone="danger">Rugged</Badge>}
      {p.dead_from && <Badge>Inactive</Badge>}
      {p.deprecated && <Badge>Deprecated</Badge>}
    </>
  )
}

function ProtocolDetail({ slug, onClose, onOpenAddress }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!slug) return
    setData(null)
    setError(null)
    api(`/api/v1/admin/intel/protocols/${slug}`).then(setData, (err) => setError(errorMessage(err)))
  }, [slug])
  if (!slug) return null
  const p = data?.protocol
  return (
    <Modal open onClose={onClose} width="max-w-3xl" title={p?.name || slug} description={p ? `${p.category || 'Uncategorised'} · data from DefiLlama, updated ${ago(p.updated_at)}` : ''}>
      {error && <p className="text-sm text-[#ff8b8b]">{error}</p>}
      {!data && !error && <p className="text-sm text-fg-3">Loading</p>}
      {p && (
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-1.5"><Flags p={p} />{p.parent && <Badge>{p.parent}</Badge>}</div>
          {p.description && <p className="text-sm text-fg-2">{p.description}</p>}
          <ScoreSection score={data.score} title="Protocol risk score" />
          {data.exploits?.length > 0 && (
            <div className="grid gap-1 rounded-lg border border-critical/40 bg-critical/[0.05] p-4 text-xs">
              <div className="font-medium text-[#ff8b8b]">Recorded incidents</div>
              {data.exploits.map((x) => <div key={x.id} className="text-fg-2">{x.name} ({x.occurred_on ? x.occurred_on.slice(0, 10) : 'undated'}){x.loss_usd != null ? ` · ${usd(x.loss_usd)}` : ''}</div>)}
            </div>
          )}
          <DefinitionList items={[
            ['TVL (all chains)', usd(p.tvl)],
            ['On followed chains', Object.keys(p.chain_tvls || {}).length ? Object.entries(p.chain_tvls).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${usd(v)}`).join(' · ') : '-'],
            ['Audits', p.audits == null ? '-' : p.audit_links?.length ? <span className="grid gap-0.5">{p.audit_links.slice(0, 4).map((l) => <a key={l} href={l} target="_blank" rel="noreferrer noopener" className="break-all text-accent hover:underline">{l}</a>)}</span> : num(p.audits)],
            ['Listed', p.listed_at ? dateTime(p.listed_at) : '-'],
            p.url && ['Website', <a href={p.url} target="_blank" rel="noreferrer noopener" className="break-all text-accent hover:underline">{p.url}</a>],
            p.forked_from?.length > 0 && ['Forked from', p.forked_from.join(', ')],
            p.governance?.length > 0 && ['Governance', p.governance.join(', ')],
            ['Chains', p.chains.join(', ')],
          ]} />
          <div className="min-w-0">
            <div className="mb-2 text-xs text-fg-3">Contracts on followed chains ({num(p.contracts)}, first 100)</div>
            <div className="overflow-hidden rounded-lg border border-line">
              <DataTable rows={data.contracts} rowKey={(c) => `${c.chain}:${c.address}`} dense empty={<EmptyState compact title="No contract mapped yet" />} columns={[
                { key: 'a', header: 'Contract', cell: (c) => <button type="button" className="font-mono text-xs text-fg hover:underline" onClick={() => onOpenAddress({ chain: c.chain, address: c.address })} aria-label={`Open contract ${c.address} on ${c.chain}`}>{short(c.address)}</button> },
                { key: 'r', header: 'Role', cell: (c) => <span className="text-xs text-fg-2">{c.role}</span> },
                { key: 's', header: 'How', hide: 'sm', cell: (c) => <span className="text-xs text-fg-3">{SOURCE[c.source] || c.source}</span> },
                { key: 'c', header: 'Chain', align: 'right', cell: (c) => <span className="capitalize text-fg-2">{c.chain}</span> },
              ]} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// IntelProtocols is the protocol registry: protocols from DefiLlama, the
// contracts mapped to them, and customer project contracts linked to what
// Intel knows about them.
export default function IntelProtocols({ stats, sources, top, links }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState(null)
  const [openSlug, setOpenSlug] = useState(null)
  const [openAddr, setOpenAddr] = useState(null)
  useEffect(() => {
    const term = q.trim()
    if (!term) { setFound(null); return }
    const t = setTimeout(() => {
      api(`/api/v1/admin/intel/protocols?q=${encodeURIComponent(term)}`).then((d) => setFound(d.protocols), () => setFound([]))
    }, 250)
    return () => clearTimeout(t)
  }, [q])
  const rows = found ?? top
  const llama = sources.find((s) => s.source === 'defillama')
  return (
    <Card title={<span className="flex items-center gap-2"><Boxes className="size-4 text-fg-3" aria-hidden />Protocols</span>}
      description="Protocols from DefiLlama, refreshed daily, with their core contracts and the contracts their factories created" flush
      actions={llama && <span className={`text-xs ${llama.error ? 'text-[#ff8b8b]' : 'text-fg-3'}`} title={llama.error || ''}>{llama.error ? 'Last DefiLlama sync failed' : `DefiLlama synced ${ago(llama.last_ok_at)} · ${num(llama.items)} protocols`}</span>}>
      <DataTable rows={stats} rowKey={(s) => s.chain} dense empty={<EmptyState compact title="No contract mapped to a protocol yet" />} columns={[
        { key: 'chain', header: 'Chain', cell: (s) => <span className="capitalize text-fg">{s.chain}</span> },
        { key: 'p', header: 'Protocols', align: 'right', cell: (s) => <span className="tnum">{num(s.protocols)}</span> },
        { key: 'c', header: 'Curated', align: 'right', cell: (s) => <span className="tnum">{num(s.curated)}</span> },
        { key: 'f', header: 'From factories', align: 'right', cell: (s) => <span className="tnum">{num(s.factory)}</span> },
        { key: 'x', header: 'Proxies', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{num(s.proxy)}</span> },
      ]} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 pb-1 pt-4">
        <span className="text-xs text-fg-3">{found ? `${num(found.length)} found` : 'Top protocols on followed chains'}</span>
        <div className="w-full sm:w-64"><SearchInput id="intel-protocol-search" value={q} onChange={setQ} placeholder="Search protocols" label="Search protocols" /></div>
      </div>
      <DataTable rows={rows} rowKey={(p) => p.slug} dense empty={<EmptyState compact title="No protocols" />} columns={[
        { key: 'n', header: 'Protocol', cell: (p) => (
          <button type="button" className="flex min-w-0 items-center gap-2 text-left hover:underline" onClick={() => setOpenSlug(p.slug)} aria-label={`Open protocol ${p.name}`}>
            <span className="truncate text-fg">{p.name}</span><Flags p={p} />
          </button>
        ) },
        { key: 'c', header: 'Category', hide: 'sm', cell: (p) => <span className="text-xs text-fg-2">{p.category}</span> },
        { key: 't', header: 'TVL here', align: 'right', cell: (p) => <span className="tnum">{usd(followedTvl(p))}</span> },
        { key: 'a', header: 'Audits', align: 'right', hide: 'md', cell: (p) => <span className="tnum text-fg-2">{p.audits ?? '-'}</span> },
        { key: 'm', header: 'Contracts', align: 'right', cell: (p) => <span className="tnum">{num(p.contracts)}</span> },
      ]} />
      <div className="border-t border-line px-5 pb-1 pt-4 text-xs text-fg-3">Customer project contracts</div>
      <DataTable rows={links} rowKey={(l) => l.project_id} dense empty={<EmptyState compact title="No project has a contract on a followed chain" />} columns={[
        { key: 'p', header: 'Project', cell: (l) => <span className="text-fg">{l.project_name}<span className="ml-2 text-xs text-fg-3">{l.org_name}</span></span> },
        { key: 'a', header: 'Contract', cell: (l) => <button type="button" className="font-mono text-xs text-fg hover:underline" onClick={() => setOpenAddr({ chain: l.chain, address: l.address })} aria-label={`Open contract ${l.address} on ${l.chain}`}>{short(l.address)}</button> },
        { key: 's', header: 'Intel', cell: (l) => (
          <span className="flex flex-wrap gap-1">
            {!l.seen && !l.contract ? <Badge>Not seen yet</Badge> : null}
            {l.verification === 'verified' && <Badge tone="good">Verified</Badge>}
            {l.proxy_kind && <Badge tone="accent">Proxy</Badge>}
            {l.owner_kind && <Badge tone={l.owner_kind === 'eoa' ? 'warning' : 'neutral'}>Owner: {CONTROLLER[l.owner_kind] || l.owner_kind}</Badge>}
            {l.protocols.map((p) => <Badge key={p}>{p}</Badge>)}
          </span>
        ) },
        { key: 'c', header: 'Chain', align: 'right', hide: 'sm', cell: (l) => <span className="capitalize text-fg-2">{l.chain}</span> },
      ]} />
      <ProtocolDetail slug={openSlug} onClose={() => setOpenSlug(null)} onOpenAddress={(t) => { setOpenSlug(null); setOpenAddr(t) }} />
      <Profile target={openAddr} onClose={() => setOpenAddr(null)} />
    </Card>
  )
}
