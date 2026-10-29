import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { addressPath, short } from '../../components/intel/IntelKit.jsx'
import { BandBadge, ClusterLink, HuntAddress, HuntError, RULES, RuleTags, ScoreBadge, huntCall, newKey, useHunt, useHuntAccess } from '../../components/hunt/HuntKit.jsx'

// ScoreCard shows a Digital Immune Score with its factors and history.
export function ScoreCard({ title, score }) {
  if (!score) return null
  const factors = Array.isArray(score.factors) ? score.factors : []
  return (
    <Card title={title} description="Hunt's own score: the weighted sum of five factors, each 0 to 100." actions={<ScoreBadge score={score.score} label={score.label} />}>
      <ul className="grid gap-2 text-sm">
        {factors.map((f) => (
          <li key={f.name} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem] items-center gap-2">
            <span className="capitalize text-fg-2">{f.name}</span>
            <span className="min-w-0">
              <span className="block h-1.5 rounded-full bg-surface-3"><span className="block h-1.5 rounded-full bg-accent" style={{ width: `${f.level}%` }} /></span>
              <span className="mt-1 block truncate text-xs text-fg-3" title={f.reason}>{f.reason}</span>
            </span>
            <span className="text-right text-xs tnum text-fg-2" title={`level ${f.level} x weight ${f.weight}%`}>{f.points.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      {score.history?.length > 1 && (
        <p className="mt-3 text-xs text-fg-3">History: {score.history.slice(0, 8).map((h) => `${h.score} (${ago(h.computed_at)})`).join(', ')}</p>
      )}
    </Card>
  )
}

export default function HuntAddressPage() {
  const { chain, address } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const { access, pro } = useHuntAccess()
  const wallet = useHunt(`/scores/wallets/${chain}/${address}`)
  const contract = useHunt(`/scores/contracts/${chain}/${address}`)
  const trace = useHunt(`/traces/${chain}/${address}`)
  const clusters = useHunt(`/clusters?chain=${chain}&address=${address}&limit=50`)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState('')

  const gate = [wallet, clusters].find((x) => x.status === 402)
  if (gate) return <div><PageHeader title={short(address)} back={{ to: '/dashboard/hunt', label: 'Hunt' }} /><Card><HuntError status={402} error={gate.error} /></Card></div>
  if (wallet.loading || contract.loading || trace.loading || clusters.loading) return <PageSkeleton cards={3} />

  async function run(kind) {
    setBusy(kind)
    setMsg(null)
    try {
      const req = await huntCall(currentOrg.id, '/requests', 'POST', { kind, chain, address, ...(kind === 'trace' ? { depth: 3 } : {}) }, newKey())
      navigate(`/dashboard/hunt/requests/${req.id}`)
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
    setBusy('')
  }
  async function watch() {
    setBusy('watch')
    setMsg(null)
    try {
      await huntCall(currentOrg.id, '/watchlist', 'POST', { chain, address })
      setMsg({ tone: 'info', text: 'Added to the watchlist.' })
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
    setBusy('')
  }

  const t = trace.data
  const list = clusters.data?.clusters || []
  const nothing = !wallet.data && !contract.data && !t && list.length === 0
  return (
    <div>
      <PageHeader back={{ to: '/dashboard/hunt', label: 'Hunt' }} title={<span className="font-mono">{short(address)}</span>}
        description={<span className="break-all font-mono text-xs">{address} on {chain}</span>}
        actions={
          <span className="flex flex-wrap gap-2">
            {can('hunt:watchlist') && <Button size="sm" variant="ghost" onClick={watch} disabled={busy !== ''}>Watch</Button>}
            {can('hunt:write') && <Button size="sm" variant="ghost" onClick={() => run('investigation')} disabled={busy !== ''}>Investigate, {access?.credits?.investigation} credits</Button>}
            {can('hunt:write') && pro && <Button size="sm" onClick={() => run('trace')} disabled={busy !== ''}>Trace funds, {access?.credits?.trace} credits</Button>}
            {can('intel:read') && <Button size="sm" variant="ghost" to={addressPath(chain, address)}>Intel profile</Button>}
          </span>
        } />
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {nothing && <Card><EmptyState title="Hunt knows nothing of this address yet">It shows here once it deploys, funds a deployer or joins a cluster on a chain Hunt follows.</EmptyState></Card>}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          {list.length > 0 && (
            <Card flush title="Funding clusters" description="Clusters this address is the funder or a deployer of, or a contract in.">
              <DataTable rows={list} dense rowKey={(c) => c.id} rowHref={(c) => `/dashboard/hunt/clusters/${c.id}`} columns={[
                { key: 'id', header: 'Cluster', cell: (c) => <ClusterLink code={c.id} /> },
                { key: 'p', header: 'Points', cell: (c) => <BandBadge band={c.band} points={c.points} /> },
                { key: 'r', header: 'Rules', cell: (c) => <RuleTags rules={c.rules} /> },
                { key: 'n', header: 'Contracts', align: 'right', cell: (c) => <span className="tnum">{c.contracts}</span> },
              ]} />
            </Card>
          )}
          {t && (
            <Card title="Genesis trace" description="How the contract came to be and what followed.">
              <DefinitionList items={[
                ['Deployed', `${dateTime(t.deployed_at)}, block ${t.deploy_block}`],
                ['Deployer', <HuntAddress key="d" chain={chain} address={t.creator} />],
                ['Funded by', t.funder ? <HuntAddress key="f" chain={chain} address={t.funder} /> : t.funding === 'unknown' ? 'Unknown (funded before Intel\'s history)' : 'Not known yet'],
                ['Deployer born', t.creator_born_at ? dateTime(t.creator_born_at) : 'Before Intel\'s history'],
                ['Token', t.token_standard || 'Not a token'],
                ['Pair', t.pair ? <span key="p" className="font-mono text-xs">{short(t.pair)} {t.pair_kind}</span> : 'None'],
                ['First liquidity', t.liquidity_tx ? `block ${t.liquidity_block}` : 'None'],
                ['Removed', t.removed_tx ? `block ${t.removed_block}` : 'No'],
                ['Locked', t.locked_kind ? t.locked_kind.replace('_', ' ') : 'No'],
                ['Ownership renounced', t.renounced_tx ? dateTime(t.renounced_at) : 'No'],
                ['Verification', t.verification || 'Not checked yet'],
              ]} />
              <div className="mt-4 grid gap-1.5">
                <span className="text-xs text-fg-3">Rules fired</span>
                {t.rules_fired.length === 0 ? <span className="text-sm text-fg-3">None</span> : t.rules_fired.map((h) => (
                  <div key={h.rule} className="flex flex-wrap items-center gap-2 text-sm"><Badge tone="warning">{h.rule}</Badge><span className="text-fg-2">{RULES[h.rule]}</span><span className="text-xs text-fg-3">{h.points} points</span></div>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className="grid min-w-0 gap-4">
          <ScoreCard title="Wallet score" score={wallet.data} />
          <ScoreCard title="Contract score" score={contract.data} />
        </div>
      </div>
    </div>
  )
}
