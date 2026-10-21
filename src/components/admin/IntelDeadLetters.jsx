import { useState } from 'react'
import { Inbox, Plug } from 'lucide-react'
import { api } from '../../lib/api.js'
import { ago, dateTime, num } from '../../lib/format.js'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import { errorMessage } from '../common/Alert.jsx'

const inputCls = 'h-9 w-full min-w-0 rounded-lg bg-surface border border-line-strong px-3 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70'
const height = (n) => (n != null ? n.toLocaleString('en') : '-')
const bytes = (n) => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`)

function State({ d }) {
  if (d.resolution === 'replayed') return <Badge tone="good" dot>Replayed</Badge>
  if (d.resolution === 'dismissed') return <Badge>Dismissed</Badge>
  if (d.replay_requested_at) return <Badge tone="accent" dot pulse>Replay queued</Badge>
  if (d.replay_error) return <Badge tone="danger">Replay failed</Badge>
  return <Badge tone="warning">Open</Badge>
}

// IntelDeadLetters is the dead letter queue: messages an indexer gave up
// on. Staff replay them through the same indexer once the cause is fixed
// (the index service picks the request up within seconds), or dismiss
// them. Both need a reason and are audited.
export default function IntelDeadLetters({ open, resolved, onChanged }) {
  const [picked, setPicked] = useState(() => new Set())
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [inspect, setInspect] = useState(null)
  const live = new Set(open.map((d) => d.id))
  const chosen = [...picked].filter((id) => live.has(id))
  const all = open.length > 0 && chosen.length === open.length

  function toggle(id) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  async function act(kind) {
    setBusy(true)
    setError(null)
    try {
      onChanged(await api(`/api/v1/admin/intel/dead-letters/${kind}`, { method: 'POST', body: { ids: chosen, reason } }))
      setPicked(new Set())
      setReason('')
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  const ready = chosen.length > 0 && reason.trim().length >= 3 && !busy
  return (
    <Card title={<span className="flex items-center gap-2"><Inbox className="size-4 text-fg-3" aria-hidden />Dead letters</span>}
      description="Blocks and reorg announcements an indexer gave up on after five attempts. Fix the cause, then replay them through the same indexer, or dismiss them."
      actions={open.length > 0 && <Badge tone="danger">{num(open.length)} open</Badge>} flush>
      {open.length > 0 && (
        <div className="grid grid-cols-1 gap-2 border-b border-line px-5 pb-4 sm:grid-cols-[1fr_auto_auto]">
          <input aria-label="Reason for replaying or dismissing" placeholder={chosen.length ? `Reason for the ${chosen.length} picked` : 'Pick dead letters below, then give a reason'}
            value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
          <Button size="sm" disabled={!ready} onClick={() => act('replay')}>Replay {chosen.length || ''}</Button>
          <Button size="sm" variant="ghost" disabled={!ready} onClick={() => act('dismiss')}>Dismiss</Button>
          {error && <p className="text-xs text-[#ff8b8b] sm:col-span-3">{error}</p>}
        </div>
      )}
      <DataTable rows={open} rowKey={(d) => d.id} dense empty={<EmptyState compact title="No dead letters">Every indexer is keeping up.</EmptyState>} columns={[
        { key: 'pick', header: <input type="checkbox" aria-label="Pick all dead letters" checked={all} onChange={() => setPicked(all ? new Set() : new Set(open.map((d) => d.id)))} />,
          className: 'w-8', cell: (d) => <input type="checkbox" aria-label={`Pick dead letter ${d.id}`} checked={picked.has(d.id)} onChange={() => toggle(d.id)} /> },
        { key: 'ix', header: 'Indexer', cell: (d) => <button type="button" className="text-left font-mono text-xs text-fg hover:underline" onClick={() => setInspect(inspect === d.id ? null : d.id)} aria-expanded={inspect === d.id}>{d.indexer}</button> },
        { key: 'chain', header: 'Chain', hide: 'sm', cell: (d) => <span className="capitalize text-fg-2">{d.chain || '-'}</span> },
        { key: 'block', header: 'Block', align: 'right', cell: (d) => <span className="tnum">{height(d.number)}</span> },
        { key: 'state', header: 'State', cell: (d) => <State d={d} /> },
        { key: 'err', header: 'Error', hide: 'md', cell: (d) => (
          <span className={`block text-xs ${inspect === d.id ? 'whitespace-pre-wrap break-all text-fg-2' : 'max-w-sm truncate text-fg-3'}`} title={d.error}>
            {d.replay_error ? `Replay: ${d.replay_error}` : d.error}
            {inspect === d.id && (
              <span className="mt-2 grid gap-0.5 text-fg-3">
                <span>Subject {d.subject}</span>
                {d.hash && <span>Block hash {d.hash}</span>}
                <span>{d.deliveries} deliveries · payload {bytes(d.size)} · stored {dateTime(d.created_at)}</span>
                {d.replay_attempts > 0 && <span>{d.replay_attempts} replay attempts{d.replay_reason ? `, last asked: ${d.replay_reason}` : ''}</span>}
              </span>
            )}
          </span>
        ) },
        { key: 'at', header: 'Stored', align: 'right', hide: 'sm', cell: (d) => <span className="whitespace-nowrap text-fg-3" title={dateTime(d.created_at)}>{ago(d.created_at)}</span> },
      ]} />
      {resolved.length > 0 && (
        <>
          <div className="border-t border-line px-5 pb-1 pt-4 text-xs text-fg-3">Resolved in the last week</div>
          <DataTable rows={resolved} rowKey={(d) => d.id} dense columns={[
            { key: 'ix', header: 'Indexer', cell: (d) => <span className="font-mono text-xs text-fg">{d.indexer}</span> },
            { key: 'block', header: 'Block', align: 'right', cell: (d) => <span className="tnum">{height(d.number)}</span> },
            { key: 'state', header: 'Outcome', cell: (d) => <State d={d} /> },
            { key: 'why', header: 'Reason', hide: 'sm', cell: (d) => <span className="text-xs text-fg-2">{d.replay_reason || '-'}</span> },
            { key: 'at', header: 'When', align: 'right', cell: (d) => <span className="whitespace-nowrap text-fg-3">{ago(d.resolved_at)}</span> },
          ]} />
        </>
      )}
    </Card>
  )
}

const SOURCE = {
  defillama: ['DefiLlama', 'Protocols and their contracts, daily'],
  defihacklabs: ['DeFiHackLabs', 'Exploit incidents and proofs of concept, daily'],
}

// IntelSources is the sync status of the external data sources.
export function IntelSources({ sources }) {
  return (
    <Card title={<span className="flex items-center gap-2"><Plug className="size-4 text-fg-3" aria-hidden />Data sources</span>}
      description="External data Intel syncs on a schedule. Contract source verification (Sourcify, Etherscan) runs per contract and shows under Contracts." flush>
      <DataTable rows={sources} rowKey={(s) => s.source} dense empty={<EmptyState compact title="No source has synced yet" />} columns={[
        { key: 'n', header: 'Source', cell: (s) => <span className="grid"><span className="text-fg">{SOURCE[s.source]?.[0] || s.source}</span><span className="text-xs text-fg-3">{SOURCE[s.source]?.[1]}</span></span> },
        { key: 's', header: 'Status', cell: (s) => s.error ? <Badge tone="danger" dot>Failing</Badge> : <Badge tone="good" dot>OK</Badge> },
        { key: 'i', header: 'Items', align: 'right', cell: (s) => <span className="tnum">{num(s.items)}</span> },
        { key: 'ok', header: 'Last success', align: 'right', hide: 'sm', cell: (s) => <span className="whitespace-nowrap text-fg-3">{s.last_ok_at ? ago(s.last_ok_at) : 'never'}</span> },
        { key: 'e', header: 'Last error', hide: 'md', cell: (s) => <span className="block max-w-xs truncate text-xs text-[#ff8b8b]" title={s.error}>{s.error || ''}</span> },
        { key: 'r', header: 'Last run', align: 'right', cell: (s) => <span className="whitespace-nowrap text-fg-3" title={dateTime(s.last_run_at)}>{ago(s.last_run_at)}</span> },
      ]} />
    </Card>
  )
}
