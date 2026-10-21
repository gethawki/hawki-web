import { useEffect, useState } from 'react'
import { FileCode2 } from 'lucide-react'
import { api } from '../../lib/api.js'
import { ago, dateTime, num } from '../../lib/format.js'
import Card, { DefinitionList } from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import Modal from '../ui/Modal.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { errorMessage } from '../common/Alert.jsx'

const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
const PROXY = { eip1967: 'EIP-1967 proxy', beacon: 'Beacon proxy', eip1822: 'UUPS proxy (EIP-1822)', eip1167: 'Minimal proxy (EIP-1167)' }
const FUNDER = { pending: 'not looked up yet (needs an Etherscan key)', unknown: 'unknown (first transaction did not fund it)' }
const KIND = { deploy: 'Deployed', create: 'Created by contract', create2: 'Created by contract (CREATE2)', factory: 'From factory event' }

function Address({ value, title }) {
  return <span className="font-mono text-xs text-fg" title={title || value}>{short(value)}</span>
}

function Verification({ c }) {
  if (c.verification === 'verified') return <Badge tone="good" dot>{c.match === 'exact' ? 'Verified' : 'Partially verified'}</Badge>
  if (c.verification === 'unverified') return <Badge tone="neutral">Unverified</Badge>
  return <Badge tone="neutral" dot pulse>Checking</Badge>
}

function Proxy({ c }) {
  if (c.code_size == null) return <span className="text-xs text-fg-3">reading code</span>
  if (c.code_size === 0) return <span className="text-xs text-fg-3">no code</span>
  return c.proxy_kind ? <Badge tone="accent">{PROXY[c.proxy_kind] || c.proxy_kind}</Badge> : <span className="text-xs text-fg-3">not a proxy</span>
}

// ContractDetail shows one contract and the contracts sharing its code
// skeleton (clones of the same source).
function ContractDetail({ target, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!target) return
    setData(null)
    setError(null)
    api(`/api/v1/admin/intel/contracts/${target.chain}/${target.address}`).then(setData, (err) => setError(errorMessage(err)))
  }, [target])
  // Children are built even while closed, so nothing may read target then.
  if (!target) return null
  const c = data?.contract
  return (
    <Modal open={!!target} onClose={onClose} width="max-w-2xl" title={c?.name || (c?.labels?.[0]) || 'Contract'} description={target ? `${target.address} on ${target.chain}` : ''}>
      {error && <p className="text-sm text-[#ff8b8b]">{error}</p>}
      {!c && !error && <p className="text-sm text-fg-3">Loading</p>}
      {c && (
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-1.5">
            <Verification c={c} />
            <Proxy c={c} />
            {c.labels.map((l) => <Badge key={l}>{l}</Badge>)}
          </div>
          <DefinitionList items={[
            ['How it was created', KIND[c.kind] || c.kind],
            ['Block', <span className="tnum">{c.block_number.toLocaleString('en')} · {dateTime(c.created_at)}</span>],
            ['Creator', <span className="break-all font-mono text-xs">{c.creator}</span>],
            ['Creator funded by', c.funder ? <span className="break-all font-mono text-xs">{c.funder}</span> : FUNDER[c.funder_status] || 'not tracked (created by a contract)'],
            ['Creation transaction', <span className="break-all font-mono text-xs">{c.tx_hash}</span>],
            ['Code size', c.code_size != null ? `${num(c.code_size)} bytes` : 'not read yet'],
            c.implementation && ['Implementation', <span className="break-all font-mono text-xs">{c.implementation}</span>],
            c.proxy_admin && ['Proxy admin', <span className="break-all font-mono text-xs">{c.proxy_admin}</span>],
            c.beacon && ['Beacon', <span className="break-all font-mono text-xs">{c.beacon}</span>],
            c.verification === 'verified' && ['Source', `${c.verified_by}${c.compiler ? ` · ${c.compiler}` : ''}${c.source_key ? ' · files kept' : ''}`],
            ['Code hash', <span className="break-all font-mono text-xs">{c.code_hash || '-'}</span>],
          ]} />
          <div>
            <div className="mb-2 text-xs text-fg-3">Same code skeleton on {target.chain}: {c.clone_group > 1 ? `${num(c.clone_group - 1)} other contracts` : 'none'}</div>
            {data.similar.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-line">
                <DataTable rows={data.similar} rowKey={(s) => s.address} dense columns={[
                  { key: 'a', header: 'Contract', cell: (s) => <Address value={s.address} /> },
                  { key: 'n', header: 'Name', cell: (s) => <span className="text-fg-2">{s.name || s.labels[0] || '-'}</span> },
                  { key: 'w', header: 'Created', align: 'right', cell: (s) => <span className="whitespace-nowrap text-fg-3">{ago(s.created_at)}</span> },
                ]} />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// IntelContracts is what the deployments indexer and the contract workers
// have found: per chain counts and the newest contracts.
export default function IntelContracts({ stats, recent }) {
  const [open, setOpen] = useState(null)
  return (
    <>
    <Card title={<span className="flex items-center gap-2"><FileCode2 className="size-4 text-fg-3" aria-hidden />By chain</span>}
      description="What the deployments indexer and the contract workers found on each chain; the code queue is contracts waiting for their code to be read" flush>
      <DataTable rows={stats} rowKey={(s) => s.chain} dense empty={<EmptyState compact title="No contracts indexed yet" />} columns={[
        { key: 'chain', header: 'Chain', cell: (s) => <span className="capitalize text-fg">{s.chain}</span> },
        { key: 'n', header: 'Contracts', align: 'right', cell: (s) => <span className="tnum text-fg">{num(s.contracts)}</span> },
        { key: 'f', header: 'From factories', align: 'right', hide: 'md', cell: (s) => <span className="tnum">{num(s.factory)}</span> },
        { key: 'p', header: 'Proxies', align: 'right', cell: (s) => <span className="tnum" title={`${num(s.clones)} minimal proxies`}>{num(s.proxies)}</span> },
        { key: 'v', header: 'Verified', align: 'right', cell: (s) => <span className="tnum">{num(s.verified)}</span> },
        { key: 'u', header: 'Unverified', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{num(s.unverified)}</span> },
        { key: 'd', header: 'Deployers funded', align: 'right', hide: 'lg', cell: (s) => <span className="tnum">{num(s.funded)} / {num(s.deployers)}</span> },
        { key: 'l', header: 'Labeled', align: 'right', hide: 'lg', cell: (s) => <span className="tnum">{num(s.labeled)}</span> },
        { key: 'q', header: 'Code queue', align: 'right', hide: 'md', cell: (s) => <span className={`tnum ${s.code_pending > 500 ? 'text-[#f5dfae]' : 'text-fg-3'}`}>{num(s.code_pending)}</span> },
      ]} />
    </Card>
    <Card title="Newest contracts" description="Open one for its creation, proxy facts, verified source and clones" flush>
      <DataTable rows={recent} rowKey={(c) => `${c.chain}:${c.address}`} dense empty={<EmptyState compact title="Nothing yet" />} columns={[
        { key: 'a', header: 'Contract', cell: (c) => (
          <button type="button" onClick={() => setOpen({ chain: c.chain, address: c.address })} className="text-left hover:underline" aria-label={`Open contract ${c.address} on ${c.chain}`}>
            <Address value={c.address} />
            {(c.name || c.labels[0]) && <span className="ml-2 text-xs text-fg-2">{c.name || c.labels[0]}</span>}
          </button>
        ) },
        { key: 'chain', header: 'Chain', hide: 'sm', cell: (c) => <span className="capitalize text-fg-2">{c.chain}</span> },
        { key: 'k', header: 'Created', hide: 'md', cell: (c) => <span className="text-xs text-fg-2">{KIND[c.kind] || c.kind}</span> },
        { key: 'p', header: 'Proxy', cell: (c) => <Proxy c={c} /> },
        { key: 'v', header: 'Source', hide: 'sm', cell: (c) => <Verification c={c} /> },
        { key: 'g', header: 'Clones', align: 'right', hide: 'lg', cell: (c) => <span className="tnum text-fg-3">{c.clone_group > 1 ? num(c.clone_group - 1) : '-'}</span> },
        { key: 'w', header: 'When', align: 'right', cell: (c) => <span className="whitespace-nowrap text-fg-3" title={dateTime(c.created_at)}>{ago(c.created_at)}</span> },
      ]} />
      <ContractDetail target={open} onClose={() => setOpen(null)} />
    </Card>
    </>
  )
}
