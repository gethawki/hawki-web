import { useEffect, useState } from 'react'
import { Landmark } from 'lucide-react'
import { api } from '../../lib/api.js'
import { ago, dateTime, num } from '../../lib/format.js'
import Card, { DefinitionList } from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import Modal from '../ui/Modal.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { errorMessage } from '../common/Alert.jsx'

const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
const shortId = (id) => (id && id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id)
const STATUS = {
  pending: ['neutral', 'Pending'], active: ['accent', 'Voting'], ended: ['neutral', 'Voting ended'], queued: ['warning', 'Queued'],
  executed: ['good', 'Executed'], canceled: ['neutral', 'Canceled'], unknown: ['neutral', 'Unknown'],
}
const SUPPORT = ['Against', 'For', 'Abstain']

// Vote weights are token amounts in base units; most governance tokens
// have 18 decimals, so they are shown in whole tokens.
function weight(raw) {
  try {
    const v = BigInt(raw)
    const whole = v / 10n ** 18n
    return whole > 0n ? whole.toLocaleString('en') : v.toLocaleString('en')
  } catch {
    return raw
  }
}

function Status({ p }) {
  const [tone, label] = STATUS[p.status] || ['neutral', p.status]
  return <Badge tone={tone} dot={p.status === 'active'} pulse={p.status === 'active'}>{label}</Badge>
}

function Tally({ p }) {
  if (!p.voters) return <span className="text-xs text-fg-3">no votes seen</span>
  return (
    <span className="whitespace-nowrap text-xs tnum">
      <span className="text-fg">{weight(p.votes_for)}</span> <span className="text-fg-3">for</span>
      {' · '}<span className="text-fg">{weight(p.votes_against)}</span> <span className="text-fg-3">against</span>
    </span>
  )
}

function ProposalDetail({ target, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!target) return
    setData(null)
    setError(null)
    api(`/api/v1/admin/intel/proposals/${target.chain}/${target.governor}/${target.id}`).then(setData, (err) => setError(errorMessage(err)))
  }, [target])
  if (!target) return null
  const p = data
  return (
    <Modal open onClose={onClose} width="max-w-3xl" title={p?.title || `Proposal ${shortId(target.id)}`} description={`Governor ${target.governor} on ${target.chain}`}>
      {error && <p className="text-sm text-[#ff8b8b]">{error}</p>}
      {!p && !error && <p className="text-sm text-fg-3">Loading</p>}
      {p && (
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-1.5"><Status p={p} />{p.flavor === 'aave_v2' && <Badge>Aave v2</Badge>}{p.labels.map((l) => <Badge key={l}>{l}</Badge>)}</div>
          <DefinitionList items={[
            ['Proposal id', <span className="break-all font-mono text-xs">{p.proposal_id}</span>],
            ['Proposer', <span className="break-all font-mono text-xs">{p.proposer}</span>],
            ['Voting window', <span className="tnum">{p.clock === 'timestamp' ? `${dateTime(new Date(Number(p.vote_start) * 1000))} to ${dateTime(new Date(Number(p.vote_end) * 1000))}` : `blocks ${Number(p.vote_start).toLocaleString('en')} to ${Number(p.vote_end).toLocaleString('en')}`}</span>],
            ['Votes seen', <span className="tnum">{weight(p.votes_for)} for · {weight(p.votes_against)} against · {weight(p.votes_abstain)} abstain ({num(p.voters)} voters)</span>],
            p.eta && ['Executable from', dateTime(new Date(Number(p.eta) * 1000))],
            ['Created', <span className="tnum">block {p.block_number.toLocaleString('en')} · {dateTime(p.created_at)}</span>],
          ]} />
          <div className="min-w-0">
            <div className="mb-2 text-xs text-fg-3">Actions ({p.actions.length})</div>
            <div className="overflow-hidden rounded-lg border border-line">
              <DataTable rows={p.actions.map((a, i) => ({ ...a, i }))} rowKey={(a) => a.i} dense empty={<EmptyState compact title="No actions" />} columns={[
                { key: 't', header: 'Target', cell: (a) => <span className="font-mono text-xs text-fg" title={a.target}>{short(a.target)}</span> },
                { key: 's', header: 'Call', cell: (a) => <span className="break-all font-mono text-xs text-fg-2">{a.signature || (a.calldata.length > 10 ? a.calldata.slice(0, 10) : 'plain transfer')}</span> },
                { key: 'v', header: 'Value (wei)', align: 'right', hide: 'sm', cell: (a) => <span className="tnum text-fg-3">{a.value}</span> },
              ]} />
            </div>
          </div>
          {p.description && (
            <div className="min-w-0">
              <div className="mb-2 text-xs text-fg-3">Description</div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-surface p-3 font-sans text-xs text-fg-2">{p.description}</pre>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-2 text-xs text-fg-3">Largest votes</div>
              <div className="overflow-hidden rounded-lg border border-line">
                <DataTable rows={p.votes} rowKey={(v) => v.voter} dense empty={<EmptyState compact title="No votes seen" />} columns={[
                  { key: 'v', header: 'Voter', cell: (v) => <span className="font-mono text-xs" title={v.voter}>{short(v.voter)}</span> },
                  { key: 's', header: 'Vote', cell: (v) => <span className="text-xs text-fg-2">{SUPPORT[v.support] || v.support}</span> },
                  { key: 'w', header: 'Weight', align: 'right', cell: (v) => <span className="tnum">{weight(v.weight)}</span> },
                ]} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-2 text-xs text-fg-3">Lifecycle</div>
              <div className="overflow-hidden rounded-lg border border-line">
                <DataTable rows={p.events || []} rowKey={(e) => `${e.kind}:${e.block_number}`} dense empty={<EmptyState compact title="Not queued, executed or canceled" />} columns={[
                  { key: 'k', header: 'Event', cell: (e) => <span className="capitalize text-fg">{e.kind}</span> },
                  { key: 'b', header: 'Block', align: 'right', cell: (e) => <span className="tnum text-fg-2">{e.block_number.toLocaleString('en')}</span> },
                  { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3">{ago(e.at)}</span> },
                ]} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// IntelGovernance lists on-chain governance: OpenZeppelin Governor,
// Compound Governor Bravo and Aave v2 proposals, votes and lifecycle.
export default function IntelGovernance({ stats, proposals }) {
  const [open, setOpen] = useState(null)
  return (
    <Card title={<span className="flex items-center gap-2"><Landmark className="size-4 text-fg-3" aria-hidden />Governance</span>}
      description="Proposals on OpenZeppelin Governor, Compound Governor Bravo and Aave v2 governance contracts, with the votes and lifecycle seen since ingestion began" flush>
      <DataTable rows={stats} rowKey={(s) => s.chain} dense empty={<EmptyState compact title="No governance activity yet" />} columns={[
        { key: 'chain', header: 'Chain', cell: (s) => <span className="capitalize text-fg">{s.chain}</span> },
        { key: 'g', header: 'Governors', align: 'right', cell: (s) => <span className="tnum">{num(s.governors)}</span> },
        { key: 'p', header: 'Proposals', align: 'right', cell: (s) => <span className="tnum" title={`${num(s.proposals_7d)} in the last 7 days`}>{num(s.proposals)}</span> },
        { key: 'v', header: 'Votes 24h', align: 'right', cell: (s) => <span className="tnum">{num(s.votes_24h)}</span> },
        { key: 'x', header: 'Executed 7d', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{num(s.executed_7d)}</span> },
      ]} />
      <div className="border-t border-line px-5 pb-1 pt-4 text-xs text-fg-3">Latest proposals</div>
      <DataTable rows={proposals} rowKey={(p) => `${p.chain}:${p.governor}:${p.proposal_id}`} dense empty={<EmptyState compact title="No proposals seen yet" />} columns={[
        { key: 't', header: 'Proposal', cell: (p) => (
          <button type="button" className="block max-w-[28rem] truncate text-left text-fg hover:underline" onClick={() => setOpen({ chain: p.chain, governor: p.governor, id: p.proposal_id })}
            aria-label={`Open proposal ${p.proposal_id} on ${p.chain}`}>{p.title || `Proposal ${shortId(p.proposal_id)}`}</button>
        ) },
        { key: 'g', header: 'Governor', hide: 'md', cell: (p) => <span className="text-xs text-fg-2">{p.labels[0] || short(p.governor)}</span> },
        { key: 's', header: 'Status', cell: (p) => <Status p={p} /> },
        { key: 'v', header: 'Votes', hide: 'sm', cell: (p) => <Tally p={p} /> },
        { key: 'chain', header: 'Chain', hide: 'lg', cell: (p) => <span className="capitalize text-fg-2">{p.chain}</span> },
        { key: 'w', header: 'Created', align: 'right', cell: (p) => <span className="whitespace-nowrap text-fg-3" title={dateTime(p.created_at)}>{ago(p.created_at)}</span> },
      ]} />
      <ProposalDetail target={open} onClose={() => setOpen(null)} />
    </Card>
  )
}
