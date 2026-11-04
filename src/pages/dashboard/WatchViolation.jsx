import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { AddressLink, ChainName } from '../../components/intel/IntelKit.jsx'
import { EpisodeStatus, WatchError, bigValue, monitorPath, useWatch, watchCall } from '../../components/watch/WatchKit.jsx'

const EXPLORER = { ethereum: 'https://etherscan.io', base: 'https://basescan.org' }

function TxLink({ chain, hash }) {
  if (!hash) return <span className="text-fg-3">-</span>
  const base = EXPLORER[chain]
  const text = `${hash.slice(0, 10)}…${hash.slice(-8)}`
  return base ? <a href={`${base}/tx/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg hover:underline">{text}</a> : <span className="font-mono text-xs">{text}</span>
}

function HuntHandoff({ chain, addresses }) {
  const { currentOrg, can } = useAuth()
  const [done, setDone] = useState({})
  const [error, setError] = useState(null)
  if (!addresses.length || !can('hunt:watchlist')) return null
  async function add(a) {
    setError(null)
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/hunt/watchlist`, { method: 'POST', body: { chain, address: a, label: 'From a Watch critical episode', threshold: 20 } })
      setDone({ ...done, [a]: true })
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <Card title="Offer to Hunt" description="The accounts that sent the transactions behind this critical episode. Watch them in Hunt to be alerted where else they act.">
      <ul className="grid gap-2 text-sm">
        {addresses.map((a) => (
          <li key={a} className="flex flex-wrap items-center justify-between gap-2">
            <AddressLink chain={chain} address={a} />
            {done[a] ? <Badge tone="good">Watched in Hunt</Badge> : <Button size="sm" variant="ghost" onClick={() => add(a)}>Add to Hunt watchlist</Button>}
          </li>
        ))}
      </ul>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
    </Card>
  )
}

export default function WatchViolation() {
  const { violationId } = useParams()
  const { currentOrg, can } = useAuth()
  const r = useWatch(`/violations/${violationId}`)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState(null)
  const ev = useMemo(() => r.data?.evidence || {}, [r.data])
  if (r.error && !r.data) return <div><PageHeader title="Violation" back="/dashboard/watch?tab=violations" /><Card><WatchError status={r.status} error={r.error} onRetry={r.reload} /></Card></div>
  if (!r.data) return <PageSkeleton cards={3} />
  const v = r.data
  const open = ['open', 'acknowledged', 'suspected'].includes(v.status)
  const diff = ev.diff || []
  const checks = ev.checks || (Array.isArray(v.checks) ? v.checks : [])
  const cands = ev.transactions?.candidates || []
  const triggering = v.triggering_tx || ev.transactions?.triggering
  async function act(action) {
    setMsg(null)
    try {
      r.setData(await watchCall(currentOrg.id, `/violations/${v.id}/${action}`, 'POST', note.trim() ? { note: note.trim() } : {}))
      setNote('')
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }
  return (
    <div className="grid gap-4">
      <PageHeader title={v.title || v.invariant} back="/dashboard/watch?tab=violations"
        meta={<span className="flex flex-wrap items-center gap-1.5"><SeverityBadge value={v.severity} /><EpisodeStatus status={v.status} /><ChainName chain={v.chain} />
          <Badge tone={v.category === 'invariant' ? 'neutral' : 'staff'}>{v.category}</Badge>
          {v.confirmed ? <Badge tone="good">Confirmed</Badge> : <Badge tone="warning">Unconfirmed, at the head</Badge>}
          {v.shadow && <Badge>Shadow period, not alerted</Badge>}</span>} />
      <p className="-mt-2 text-sm text-fg-3">{v.component || v.kind} of <Link to={monitorPath(v.monitor_id)} className="text-fg hover:underline">{v.monitor_name}</Link></p>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="grid min-w-0 gap-4 xl:col-span-2">
          <Card title="What broke">
            {v.description && <p className="text-sm text-fg-2">{v.description}</p>}
            {v.expression && <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 text-xs text-fg"><code>{v.expression}</code></pre>}
            {v.recommendation && <div className="mt-3"><Alert tone="info">{v.recommendation}</Alert></div>}
          </Card>
          <Card flush title="State diff" description={`Every variable that differs between the check before and block ${num(v.first_block)}.`}>
            <DataTable rows={diff} dense rowKey={(d) => d.variable} empty={<EmptyState compact title="No variable changed">The invariant broke on values that were already there, or on derived values.</EmptyState>}
              columns={[
                { key: 'n', header: 'Variable', cell: (d) => <span className="font-mono text-xs">{d.variable}</span> },
                { key: 'b', header: 'Before', align: 'right', cell: (d) => <span className="tnum text-fg-3" title={d.before || ''}>{d.before == null ? 'first read' : bigValue(d.before)}</span> },
                { key: 'a', header: 'After', align: 'right', cell: (d) => <span className="tnum text-fg" title={d.after}>{bigValue(d.after)}</span> },
              ]} />
          </Card>
          <Card flush title="Checks" description="Each comparison in the expression with both sides as read.">
            <DataTable rows={checks} dense rowKey={(c) => `${c.expr}:${c.left}:${c.right}`} empty={<EmptyState compact title="No comparison recorded" />}
              columns={[
                { key: 'e', header: 'Comparison', cell: (c) => <code className="text-xs">{c.expr}</code> },
                { key: 'l', header: 'Left', align: 'right', hide: 'sm', cell: (c) => <span className="tnum text-xs" title={c.left}>{bigValue(c.left)}</span> },
                { key: 'r', header: 'Right', align: 'right', hide: 'sm', cell: (c) => <span className="tnum text-xs" title={c.right}>{bigValue(c.right)}</span> },
                { key: 'h', header: 'Holds', align: 'right', cell: (c) => <Badge tone={c.holds ? 'good' : 'danger'}>{c.holds ? 'yes' : 'no'}</Badge> },
              ]} />
          </Card>
          <Card flush title="Transactions" description={triggering ? 'The one transaction to watched contracts since the previous check.' : 'Candidates since the previous check; none could be singled out.'}>
            <DataTable rows={cands} dense rowKey={(c) => c.hash} empty={<EmptyState compact title="No transaction to the watched contracts">The state moved without a direct call, for example through a price feed or another contract.</EmptyState>}
              columns={[
                { key: 'h', header: 'Transaction', cell: (c) => <span className="flex items-center gap-2"><TxLink chain={v.chain} hash={c.hash} />{c.hash === triggering && <Badge tone="danger">triggering</Badge>}</span> },
                { key: 'f', header: 'From', hide: 'sm', cell: (c) => (c.from ? <AddressLink chain={v.chain} address={c.from} /> : '-') },
                { key: 'b', header: 'Block', align: 'right', hide: 'md', cell: (c) => <span className="tnum">{num(c.block)}</span> },
                { key: 'l', header: 'Logs', align: 'right', cell: (c) => <span className="tnum">{c.logs?.length || 0}</span> },
              ]} />
          </Card>
          {(ev.state_before || ev.state_after) && (
            <Card title="Evidence package" description={`Stored ${ev.recorded_at ? dateTime(ev.recorded_at) : ''}${v.evidence_key ? ` as ${v.evidence_key}` : ''}.`}>
              <details>
                <summary className="cursor-pointer text-sm text-fg-2">Show the full package (JSON)</summary>
                <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg border border-line bg-surface-2 p-3 text-[0.7rem] text-fg-2"><code>{JSON.stringify(ev, null, 2)}</code></pre>
              </details>
            </Card>
          )}
        </div>
        <div className="grid min-w-0 gap-4">
          <Card title="Episode">
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-fg-3">First block</dt><dd className="text-right tnum">{num(v.first_block)}</dd>
              <dt className="text-fg-3">First seen</dt><dd className="text-right" title={dateTime(v.first_time)}>{ago(v.first_time)}</dd>
              <dt className="text-fg-3">Last block</dt><dd className="text-right tnum">{num(v.last_block)}</dd>
              <dt className="text-fg-3">Occurrences</dt><dd className="text-right tnum">{v.occurrences}</dd>
              <dt className="text-fg-3">Second read</dt><dd className="text-right">{v.second_read.replaceAll('_', ' ')}</dd>
              <dt className="text-fg-3">Confidence</dt><dd className="text-right tnum">{Math.round(v.confidence * 100)}%</dd>
              {v.contract && <><dt className="text-fg-3">Contract</dt><dd className="truncate text-right"><AddressLink chain={v.chain} address={v.contract} /></dd></>}
              {v.resolved_at && <><dt className="text-fg-3">Resolved</dt><dd className="text-right" title={dateTime(v.resolved_at)}>{ago(v.resolved_at)}</dd></>}
              {v.resolution && <><dt className="text-fg-3">Note</dt><dd className="text-right text-fg-2">{v.resolution}</dd></>}
            </dl>
          </Card>
          {open && can('watch:write') && (
            <Card title="Act on it" description="Acknowledging keeps it open. A suspected false positive alerts as low from now on and closes once the invariant holds. Resolving closes it by hand.">
              <div className="grid gap-3">
                <Field id="v-note" label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you found" />
                <div className="flex flex-wrap gap-2">
                  {v.status !== 'acknowledged' && <Button size="sm" variant="ghost" onClick={() => act('acknowledge')}>Acknowledge</Button>}
                  {v.status !== 'suspected' && <Button size="sm" variant="ghost" onClick={() => act('false-positive')}>False positive</Button>}
                  <Button size="sm" onClick={() => act('resolve')}>Resolve</Button>
                </div>
                {msg && <Alert>{msg}</Alert>}
              </div>
            </Card>
          )}
          <HuntHandoff chain={v.chain} addresses={v.hunt_candidates || []} />
        </div>
      </div>
    </div>
  )
}
