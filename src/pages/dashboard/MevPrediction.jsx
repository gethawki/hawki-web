import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num, pct } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { AddressLink } from '../../components/intel/IntelKit.jsx'
import { MevError, PATTERNS, PredictionStatus, mevCall, usdText, useMev } from '../../components/mev/MevKit.jsx'

const EXPLORER = { ethereum: 'https://etherscan.io', base: 'https://basescan.org', polygon: 'https://polygonscan.com', bnb: 'https://bscscan.com',
  arbitrum: 'https://arbiscan.io', optimism: 'https://optimistic.etherscan.io', avalanche: 'https://snowtrace.io' }

function Tx({ chain, hash }) {
  const short = `${hash.slice(0, 10)}…${hash.slice(-8)}`
  const base = EXPLORER[chain]
  return base && hash.length === 66 ? <a href={`${base}/tx/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg hover:underline">{short}</a>
    : <span className="font-mono text-xs">{short}</span>
}

function Factor({ label, value, hint }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs"><span className="text-fg-2">{label}</span><span className="tnum text-fg">{pct(value)}</span></div>
      <div className="h-1.5 rounded-full bg-surface-3"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} /></div>
      {hint && <span className="text-[0.7rem] text-fg-3">{hint}</span>}
    </div>
  )
}

export default function MevPrediction() {
  const { predictionId } = useParams()
  const { currentOrg, can } = useAuth()
  const r = useMev(`/predictions/${predictionId}`)
  const [msg, setMsg] = useState(null)
  const [hunted, setHunted] = useState(false)
  if (r.error && !r.data) return <div><PageHeader title="Prediction" back="/dashboard/mev" /><Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card></div>
  if (!r.data) return <PageSkeleton cards={3} />
  const p = r.data
  const f = p.factors || {}
  const sim = p.simulation
  const route = p.route || {}
  const sandwich = route.sandwich
  async function feedback(v) {
    setMsg(null)
    try {
      r.setData(await mevCall(currentOrg.id, `/predictions/${p.id}/feedback`, 'POST', { feedback: v }))
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }
  async function hunt() {
    setMsg(null)
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/hunt/watchlist`, { method: 'POST', body: { chain: p.chain, address: p.attacker, label: 'From an MEV prediction', threshold: 20 } })
      setHunted(true)
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }
  return (
    <div className="grid gap-4">
      <PageHeader title={p.title} back="/dashboard/mev"
        meta={<span className="flex flex-wrap items-center gap-1.5"><SeverityBadge value={p.severity} /><PredictionStatus status={p.status} />
          <span className="text-sm capitalize text-fg-2">{p.chain}</span><Badge tone={p.tier === 'enterprise' ? 'staff' : 'accent'}>{PATTERNS[p.pattern] || p.pattern}</Badge></span>} />
      {msg && <Alert>{msg}</Alert>}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="grid min-w-0 gap-4 xl:col-span-2">
          <Card title="What is about to happen">
            <p className="text-sm text-fg">{p.summary}</p>
            {p.recommendation && <div className="mt-3"><Alert tone="info">{p.recommendation}</Alert></div>}
          </Card>
          <Card flush title="Transactions">
            <DataTable rows={p.transactions} dense rowKey={(t) => `${t.role}:${t.hash}`} empty={<EmptyState compact title="None" />}
              columns={[
                { key: 'r', header: 'Role', cell: (t) => <Badge tone={t.role === 'victim' ? 'warning' : t.role === 'target' ? 'neutral' : 'danger'}>{t.role}</Badge> },
                { key: 'h', header: 'Transaction', cell: (t) => <Tx chain={p.chain} hash={t.hash} /> },
                { key: 'f', header: 'From', hide: 'sm', cell: (t) => (t.from ? <AddressLink chain={p.chain} address={t.from} /> : <span className="text-fg-3">private</span>) },
                { key: 'to', header: 'To', hide: 'md', cell: (t) => (t.to ? <AddressLink chain={p.chain} address={t.to} /> : '-') },
              ]} />
          </Card>
          {sandwich && (
            <Card title="Route" description={`Exact pool maths at block ${route.hops?.[0]?.pool?.block ?? '-'}${sandwich.approximate ? '; a V3 pool is read within its current tick range' : ''}.`}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-fg-3">Victim tolerance</dt><dd className="tnum">{(sandwich.slack * 100).toFixed(2)}%</dd></div>
                <div><dt className="text-xs text-fg-3">Front run</dt><dd className="tnum break-all">{sandwich.front}</dd></div>
                <div><dt className="text-xs text-fg-3">Attacker profit</dt><dd className="tnum break-all">{sandwich.profit}</dd></div>
                <div><dt className="text-xs text-fg-3">Victim gets</dt><dd className="tnum break-all">{sandwich.victim_out}</dd></div>
                <div><dt className="text-xs text-fg-3">Instead of</dt><dd className="tnum break-all">{sandwich.victim_fair}</dd></div>
                <div><dt className="text-xs text-fg-3">Victim loses</dt><dd className="tnum break-all">{sandwich.victim_loss}</dd></div>
              </dl>
            </Card>
          )}
          {sim && (
            <Card flush title="Simulation" description={`Run on a fork at block ${num(sim.fork_block)} in ${sim.took_ms} ms, each transaction as its sender.`}>
              <DataTable rows={sim.steps} dense rowKey={(s) => `${s.label}:${s.hash}`} empty={<EmptyState compact title="No steps" />}
                columns={[
                  { key: 'l', header: 'Step', cell: (s) => s.label },
                  { key: 'o', header: 'Outcome', cell: (s) => <Badge tone={s.success ? 'good' : 'danger'}>{s.success ? 'succeeds' : `reverts${s.revert ? `: ${s.revert}` : ''}`}</Badge> },
                  { key: 'g', header: 'Gas', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{num(s.gas_used)}</span> },
                  { key: 't', header: 'Transfers', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{s.transfers?.length || 0}</span> },
                  { key: 'c', header: 'Calls', align: 'right', hide: 'md', cell: (s) => <span className="tnum">{s.calls?.length || 0}</span> },
                ]} />
              {sim.net && Object.keys(sim.net).length > 0 && (
                <div className="px-5 py-3">
                  <p className="mb-2 text-xs text-fg-3">Token balance changes over the run</p>
                  <ul className="grid gap-1 text-xs">
                    {Object.entries(sim.net).flatMap(([acct, toks]) => Object.entries(toks).map(([tok, d]) => (
                      <li key={acct + tok} className="flex flex-wrap items-center gap-2">
                        <AddressLink chain={p.chain} address={acct} /><span className={`tnum ${d.startsWith('-') ? 'text-bad' : 'text-ok'}`}>{d}</span>
                        <span className="text-fg-3">of</span><AddressLink chain={p.chain} address={tok} />
                      </li>
                    )))}
                  </ul>
                </div>
              )}
            </Card>
          )}
          <Card title="Evidence package">
            <details>
              <summary className="cursor-pointer text-sm text-fg-2">Show the full package (JSON)</summary>
              <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg border border-line bg-surface-2 p-3 text-[0.7rem] text-fg-2"><code>{JSON.stringify(p.evidence, null, 2)}</code></pre>
            </details>
          </Card>
        </div>
        <div className="grid min-w-0 gap-4">
          <Card title={`Risk score ${p.risk_score}`} description="40% probability, 35% impact, 10% urgency, 15% confidence.">
            <div className="grid gap-3">
              <Factor label="Probability" value={f.probability || 0} hint={`Pattern precision ${pct(f.prior || 0)}, simulation ${f.simulation || 'none'}`} />
              <Factor label="Impact" value={f.impact || 0} hint={`About ${usdText(p.impact_usd)} at stake`} />
              <Factor label="Urgency" value={f.urgency || 0} hint={p.urgency === 'pending' ? 'Not mined yet' : 'Mined'} />
              <Factor label="Confidence" value={f.confidence || 0} />
            </div>
          </Card>
          <Card title="Timeline">
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-fg-3">Seen</dt><dd className="text-right" title={dateTime(p.seen_at)}>{ago(p.seen_at)}</dd>
              <dt className="text-fg-3">Predicted in</dt><dd className="text-right tnum">{p.latency_ms != null ? `${p.latency_ms} ms` : '-'}</dd>
              <dt className="text-fg-3">Head then</dt><dd className="text-right tnum">{num(p.head_block)}</dd>
              {p.outcome_block && <><dt className="text-fg-3">Outcome block</dt><dd className="text-right tnum">{num(p.outcome_block)}</dd></>}
              {p.outcome?.note && <><dt className="text-fg-3">Note</dt><dd className="text-right text-fg-2">{p.outcome.note}</dd></>}
              {p.feedback && <><dt className="text-fg-3">Feedback</dt><dd className="text-right">{p.feedback.replace('_', ' ')}</dd></>}
            </dl>
          </Card>
          {can('mev:write') && (
            <Card title="Was it right?" description="Your answer counts towards the pattern's precision, which moves the next predictions' scores.">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => feedback('accurate')}>Accurate</Button>
                <Button size="sm" variant="ghost" onClick={() => feedback('happened')}>The attack happened</Button>
                <Button size="sm" variant="ghost" onClick={() => feedback('false_positive')}>False positive</Button>
              </div>
            </Card>
          )}
          {p.attacker && can('hunt:watchlist') && (
            <Card title="Offer to Hunt" description="Watch the attacking account in Hunt to be alerted where else it acts.">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AddressLink chain={p.chain} address={p.attacker} />
                {hunted ? <Badge tone="good">Watched in Hunt</Badge> : <Button size="sm" variant="ghost" onClick={hunt}>Add to Hunt watchlist</Button>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
