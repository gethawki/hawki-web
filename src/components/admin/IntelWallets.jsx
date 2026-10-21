import { useEffect, useState } from 'react'
import { Coins, Search } from 'lucide-react'
import { api } from '../../lib/api.js'
import { ago, dateTime, num } from '../../lib/format.js'
import Card, { DefinitionList } from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import Modal from '../ui/Modal.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import { errorMessage } from '../common/Alert.jsx'
import { ScoreSection, SeverityTag } from './intelBits.jsx'

const inputCls = 'h-9 w-full min-w-0 rounded-lg bg-surface border border-line-strong px-3 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70'
const isAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(a)
const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
export const STANDARD = { erc20: 'ERC-20', erc721: 'ERC-721', erc1155: 'ERC-1155' }
const KIND = { eoa: 'Account (EOA)', contract: 'Contract', unknown: 'Not read yet' }

// units shows an integer amount in base units with the token's decimals,
// trimmed to four decimal places. BigInt keeps 256-bit values exact.
export function units(raw, decimals) {
  if (raw == null) return '-'
  let v
  try { v = BigInt(raw) } catch { return raw }
  if (!decimals) return v.toLocaleString('en')
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  const frac = (v % base).toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '')
  return whole.toLocaleString('en') + (frac ? `.${frac}` : '')
}

function TokenName({ t }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="truncate text-fg">{t.symbol || t.name || short(t.address)}</span>
      {t.symbol && t.name && <span className="hidden truncate text-xs text-fg-3 sm:inline">{t.name}</span>}
    </span>
  )
}

// Profile shows everything Intel knows about one address: the registry
// row, token facts with tracked transfers and holders, and contract facts.
export function Profile({ target, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!target) return
    setData(null)
    setError(null)
    api(`/api/v1/admin/intel/addresses/${target.chain}/${target.address}`).then(setData, (err) => setError(errorMessage(err)))
  }, [target])
  if (!target) return null
  const a = data?.address
  const t = data?.token
  const c = data?.contract
  const ctl = data?.control
  const labels = [...new Set([...(a?.labels || []), ...(t?.labels || []), ...(c?.labels || [])])]
  return (
    <Modal open onClose={onClose} width="max-w-3xl" title={t ? (t.symbol || t.name || 'Token') : c?.name || labels[0] || 'Address'} description={`${target.address} on ${target.chain}`}>
      {error && <p className="text-sm text-[#ff8b8b]">{error}</p>}
      {!data && !error && <p className="text-sm text-fg-3">Loading</p>}
      {data && (
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-1.5">
            {a && <Badge>{KIND[a.kind] || a.kind}</Badge>}
            {a?.delegate && <Badge tone="warning">EIP-7702 delegated</Badge>}
            {t && <Badge tone="accent">{STANDARD[t.standard]}</Badge>}
            {t?.tracked && <Badge tone="good" dot>Tracked</Badge>}
            {c?.proxy_kind && <Badge tone="accent">Proxy</Badge>}
            {labels.map((l) => <Badge key={l}>{l}</Badge>)}
            {(data.protocols || []).map((pc) => <Badge key={pc.protocol} tone="accent" title={pc.role}>{pc.protocol_name}</Badge>)}
          </div>
          <DefinitionList items={[
            a && ['First seen', <span className="tnum">block {a.first_block.toLocaleString('en')} · {dateTime(a.first_seen_at)}</span>],
            a && ['Last seen', <span className="tnum">block {a.last_block.toLocaleString('en')} · {ago(a.last_seen_at)}</span>],
            a && ['Transactions sent', <span className="tnum">{num(a.tx_count)}</span>],
            a && ['Blocks it appeared in', <span className="tnum">{num(a.activity)}</span>],
            a?.delegate && ['Delegates to', <span className="break-all font-mono text-xs">{a.delegate}</span>],
            t && ['Name', t.name || '-'],
            t && ['Decimals', t.decimals ?? '-'],
            t && ['Total supply', <span className="tnum">{units(t.total_supply, t.decimals)}</span>],
            t?.tracked && ['Holders (seen since tracking)', <span className="tnum">{num(t.holders)}</span>],
            c && ['Created by', <span className="break-all font-mono text-xs">{c.creator}</span>],
            c?.implementation && ['Implementation', <span className="break-all font-mono text-xs">{c.implementation}</span>],
            c && ['Source', c.verification === 'verified' ? `${c.name || 'verified'} (${c.verified_by})` : c.verification || '-'],
          ]} />
          {data.score && <ScoreSection score={data.score} />}
          {(data.exploits || []).length > 0 && (
            <div className="grid gap-1 rounded-lg border border-critical/40 bg-critical/[0.05] p-4 text-xs">
              <div className="font-medium text-[#ff8b8b]">In recorded incidents</div>
              {data.exploits.map((x) => <div key={`${x.id}:${x.role}`} className="text-fg-2">{x.name} ({x.occurred_on ? x.occurred_on.slice(0, 10) : 'undated'}) as {x.role.replace('_', ' ')}</div>)}
            </div>
          )}
          {(data.risk_events || []).length > 0 && (
            <div className="grid gap-1.5">
              <div className="text-xs text-fg-3">Risk events</div>
              {data.risk_events.slice(0, 8).map((e) => <div key={e.id} className="flex flex-wrap items-center gap-2 text-xs"><SeverityTag severity={e.severity} /><span className="text-fg-2">{e.title}</span><span className="text-fg-3">{ago(e.created_at)}</span></div>)}
            </div>
          )}
          {ctl && <ControlSection ctl={ctl} />}
          {t?.tracked && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-2 text-xs text-fg-3">Largest holders</div>
                <div className="overflow-hidden rounded-lg border border-line">
                  <DataTable rows={data.holders} rowKey={(h) => h.holder} dense empty={<EmptyState compact title="No balances read yet" />} columns={[
                    { key: 'h', header: 'Holder', cell: (h) => <span className="font-mono text-xs text-fg" title={h.holder}>{short(h.holder)}</span> },
                    { key: 'b', header: 'Balance', align: 'right', cell: (h) => <span className="tnum">{units(h.balance, t.decimals)}</span> },
                  ]} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-2 text-xs text-fg-3">Latest transfers</div>
                <div className="overflow-hidden rounded-lg border border-line">
                  <DataTable rows={data.transfers} rowKey={(x) => `${x.tx_hash}:${x.from}:${x.to}:${x.value}:${x.token_id}`} dense empty={<EmptyState compact title="No transfers since tracking began" />} columns={[
                    { key: 'f', header: 'From → to', cell: (x) => <span className="whitespace-nowrap font-mono text-xs text-fg-2" title={`${x.from} to ${x.to}`}>{short(x.from)} → {short(x.to)}</span> },
                    { key: 'v', header: 'Amount', align: 'right', cell: (x) => <span className="tnum">{x.token_id != null && t.standard === 'erc721' ? `#${x.token_id}` : units(x.value, t.decimals)}</span> },
                    { key: 'w', header: 'When', align: 'right', hide: 'sm', cell: (x) => <span className="whitespace-nowrap text-fg-3">{ago(x.at)}</span> },
                  ]} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export const CONTROLLER = { eoa: 'EOA', multisig: 'Multisig', timelock: 'Timelock', contract: 'Contract', unknown: 'Checking' }

// Who is the controller: its kind, threshold or delay, and labels.
export function ControllerTag({ address, info }) {
  if (!address) return <span className="text-fg-3">-</span>
  const extra = info?.kind === 'multisig' && info.threshold ? ` ${info.threshold} of ${info.signers}`
    : info?.kind === 'timelock' && info.min_delay != null ? ` ${duration(info.min_delay)}` : ''
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="break-all font-mono text-xs text-fg" title={address}>{short(address)}</span>
      {info && <Badge tone={controllerTone(info)}>{CONTROLLER[info.kind] || info.kind}{extra}</Badge>}
      {info?.delegate && <Badge tone="warning">7702</Badge>}
      {info?.owner && <span className="text-xs text-fg-3">owned by {short(info.owner)}</span>}
      {info?.labels?.map((l) => <Badge key={l}>{l}</Badge>)}
    </span>
  )
}

// A single key (an EOA, or a 1 of N multisig) is a warning; a multisig
// needing two or more signers, or a timelock, is the safer setup.
function controllerTone(info) {
  if (info.kind === 'eoa' || (info.kind === 'multisig' && info.threshold === 1)) return 'warning'
  if (info.kind === 'multisig' || info.kind === 'timelock') return 'good'
  return 'neutral'
}

function duration(secs) {
  const s = Number(secs)
  if (s >= 86400) return `${+(s / 86400).toFixed(1)}d`
  if (s >= 3600) return `${+(s / 3600).toFixed(1)}h`
  if (s >= 60) return `${Math.round(s / 60)}m`
  return `${s}s`
}

const OP = { pending: ['warning', 'Pending'], executed: ['good', 'Executed'], cancelled: ['neutral', 'Cancelled'] }

// ControlSection is who controls a contract now and how that came about.
export function ControlSection({ ctl }) {
  const info = (a) => ctl.controllers?.[a]
  return (
    <div className="grid gap-3 rounded-lg border border-line p-4">
      <div className="text-xs font-medium text-fg-2">Control</div>
      <DefinitionList items={[
        ['Owner', ctl.renounced ? <Badge tone="good">Renounced</Badge> : <ControllerTag address={ctl.owner} info={info(ctl.owner)} />],
        ctl.pending_owner && ['Pending owner (two step)', <ControllerTag address={ctl.pending_owner} info={info(ctl.pending_owner)} />],
        ctl.proxy_admin && ['Proxy admin', <ControllerTag address={ctl.proxy_admin} info={info(ctl.proxy_admin)} />],
        ctl.implementation && ['Implementation', <span className="break-all font-mono text-xs">{ctl.implementation}</span>],
        ctl.beacon && ['Beacon', <ControllerTag address={ctl.beacon} info={info(ctl.beacon)} />],
        ['Upgrades seen', <span className="tnum">{num(ctl.upgrades)}</span>],
        ctl.min_delay && ['Timelock delay', duration(ctl.min_delay)],
      ]} />
      {ctl.roles.length > 0 && (
        <div className="grid gap-2">
          <div className="text-xs text-fg-3">Roles</div>
          {ctl.roles.map((r) => (
            <div key={r.role} className="grid gap-1 sm:grid-cols-[12rem_1fr]">
              <span className="truncate font-mono text-xs text-fg-2" title={r.role}>{r.name || short(r.role)}</span>
              <span className="grid gap-1">{r.members.length ? r.members.map((m) => <ControllerTag key={m} address={m} info={info(m)} />) : <span className="text-xs text-fg-3">no members</span>}</span>
            </div>
          ))}
        </div>
      )}
      {ctl.timelock_ops.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line">
          <DataTable rows={ctl.timelock_ops} rowKey={(o) => o.id} dense columns={[
            { key: 'id', header: 'Operation', cell: (o) => <span className="font-mono text-xs" title={o.id}>{short(o.id)}</span> },
            { key: 't', header: 'Target', hide: 'sm', cell: (o) => <span className="font-mono text-xs text-fg-2">{short(o.target)}</span> },
            { key: 's', header: 'Status', cell: (o) => { const [tone, label] = OP[o.status] || ['neutral', o.status]; return <Badge tone={tone} dot>{label}</Badge> } },
            { key: 'r', header: 'Ready', align: 'right', cell: (o) => <span className="whitespace-nowrap text-fg-3">{o.ready_at ? dateTime(o.ready_at) : '-'}</span> },
          ]} />
        </div>
      )}
      <div className="text-xs text-fg-3">{num(ctl.history.length)} control events recorded{ctl.history[0] ? `, latest ${ago(ctl.history[0].at)}` : ''}</div>
    </div>
  )
}

function ChainSelect({ id, chains, value, onChange }) {
  return (
    <select id={id} aria-label="Chain" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-7 capitalize`}>
      {chains.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}

// IntelWallets is the address registry and token view: counts per chain,
// an address lookup, tracked tokens and the newest tokens.
export default function IntelWallets({ chains, wallets, tracked, recent, onChanged }) {
  const [open, setOpen] = useState(null)
  const [lookChain, setLookChain] = useState(chains[0] || '')
  const [look, setLook] = useState('')
  const [trackChain, setTrackChain] = useState(chains[0] || '')
  const [trackAddr, setTrackAddr] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function setTracked(chain, address, track, why = '') {
    setBusy(true)
    setError(null)
    try {
      onChanged(await api(`/api/v1/admin/intel/tokens/${chain}/${address}/track`, track ? { method: 'PUT', body: { reason: why } } : { method: 'DELETE' }))
      if (track) { setTrackAddr(''); setReason('') }
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Card title={<span className="flex items-center gap-2"><Coins className="size-4 text-fg-3" aria-hidden />Wallets and tokens</span>}
      description="Every address seen on followed chains, tokens found from their transfer events, and transfers and holders of the tokens you track" flush>
      <DataTable rows={wallets} rowKey={(w) => w.chain} dense empty={<EmptyState compact title="Nothing indexed yet" />} columns={[
        { key: 'chain', header: 'Chain', cell: (w) => <span className="capitalize text-fg">{w.chain}</span> },
        { key: 'a', header: 'Addresses', align: 'right', cell: (w) => <span className="tnum text-fg">{num(w.addresses)}</span> },
        { key: 'e', header: 'Accounts', align: 'right', hide: 'sm', cell: (w) => <span className="tnum" title={`${num(w.delegated)} with an EIP-7702 delegation`}>{num(w.eoas)}</span> },
        { key: 'c', header: 'Contracts', align: 'right', hide: 'sm', cell: (w) => <span className="tnum">{num(w.contracts)}</span> },
        { key: 'd', header: '7702 delegated', align: 'right', hide: 'lg', cell: (w) => <span className="tnum">{num(w.delegated)}</span> },
        { key: 't', header: 'Tokens', align: 'right', cell: (w) => <span className="tnum" title={`${num(w.erc20)} ERC-20, ${num(w.erc721)} ERC-721, ${num(w.erc1155)} ERC-1155`}>{num(w.tokens)}</span> },
        { key: 'k', header: 'Tracked', align: 'right', cell: (w) => <span className="tnum">{num(w.tracked)}</span> },
        { key: 'q', header: 'Queues', align: 'right', hide: 'md', cell: (w) => <span className="whitespace-nowrap text-xs text-fg-3 tnum" title="addresses to classify · token metadata · holder balances">{num(w.unknown)} · {num(w.meta_pending)} · {num(w.holders_queue)}</span> },
      ]} />

      <div className="grid grid-cols-1 gap-4 border-t border-line px-5 py-4 lg:grid-cols-2">
        <form className="grid min-w-0 gap-2" onSubmit={(e) => { e.preventDefault(); if (isAddress(look.trim())) setOpen({ chain: lookChain, address: look.trim().toLowerCase() }) }}>
          <div className="text-xs text-fg-3">Look up an address</div>
          <div className="flex gap-2">
            <div className="w-28 shrink-0"><ChainSelect id="intel-lookup-chain" chains={chains} value={lookChain} onChange={setLookChain} /></div>
            <input aria-label="Address to look up" placeholder="0x…" value={look} onChange={(e) => setLook(e.target.value)} className={`${inputCls} flex-1 font-mono`} />
            <Button size="sm" type="submit" disabled={!isAddress(look.trim())} aria-label="Look up"><Search size={14} /></Button>
          </div>
        </form>
        <form className="grid min-w-0 gap-2" onSubmit={(e) => { e.preventDefault(); setTracked(trackChain, trackAddr.trim().toLowerCase(), true, reason) }}>
          <div className="text-xs text-fg-3">Track a token (transfers and holders are kept from now on)</div>
          <div className="grid grid-cols-[auto_1fr] gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
            <ChainSelect id="intel-track-chain" chains={chains} value={trackChain} onChange={setTrackChain} />
            <input aria-label="Token address to track" placeholder="Token 0x…" value={trackAddr} onChange={(e) => setTrackAddr(e.target.value)} className={`${inputCls} font-mono`} />
            <input aria-label="Reason for tracking" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} col-span-2 sm:col-span-1`} />
            <Button size="sm" type="submit" disabled={busy || !isAddress(trackAddr.trim()) || reason.trim().length < 3} className="col-span-2 sm:col-span-1">Track</Button>
          </div>
          {error && <p className="text-xs text-[#ff8b8b]">{error}</p>}
        </form>
      </div>

      <div className="border-t border-line px-5 pb-1 pt-4 text-xs text-fg-3">Tracked tokens</div>
      <DataTable rows={tracked} rowKey={(t) => `${t.chain}:${t.address}`} dense empty={<EmptyState compact title="No token is tracked">Track one above to keep its transfers and holders.</EmptyState>} columns={[
        { key: 'n', header: 'Token', cell: (t) => (
          <button type="button" className="text-left hover:underline" onClick={() => setOpen({ chain: t.chain, address: t.address })} aria-label={`Open token ${t.address} on ${t.chain}`}>
            {t.standard ? <TokenName t={t} /> : <span className="font-mono text-xs text-fg-2">{short(t.address)} · not seen moving yet</span>}
          </button>
        ) },
        { key: 'chain', header: 'Chain', hide: 'sm', cell: (t) => <span className="capitalize text-fg-2">{t.chain}</span> },
        { key: 'h', header: 'Holders', align: 'right', cell: (t) => <span className="tnum">{num(t.holders)}</span> },
        { key: 'x', header: 'Transfers 24h', align: 'right', cell: (t) => <span className="tnum">{num(t.transfers_24h)}</span> },
        { key: 'r', header: 'Reason', hide: 'md', cell: (t) => <span className="text-fg-2">{t.track_reason}</span> },
        { key: 'u', header: '', align: 'right', cell: (t) => <Button size="sm" variant="ghost" disabled={busy} onClick={() => setTracked(t.chain, t.address, false)} aria-label={`Stop tracking ${t.symbol || t.address}`}>Untrack</Button> },
      ]} />

      <div className="border-t border-line px-5 pb-1 pt-4 text-xs text-fg-3">Newest tokens</div>
      <DataTable rows={recent} rowKey={(t) => `${t.chain}:${t.address}`} dense empty={<EmptyState compact title="Nothing yet" />} columns={[
        { key: 'n', header: 'Token', cell: (t) => (
          <button type="button" className="min-w-0 text-left hover:underline" onClick={() => setOpen({ chain: t.chain, address: t.address })} aria-label={`Open token ${t.address} on ${t.chain}`}><TokenName t={t} /></button>
        ) },
        { key: 'chain', header: 'Chain', hide: 'sm', cell: (t) => <span className="capitalize text-fg-2">{t.chain}</span> },
        { key: 's', header: 'Standard', cell: (t) => <Badge>{STANDARD[t.standard]}</Badge> },
        { key: 'sup', header: 'Supply', align: 'right', hide: 'md', cell: (t) => <span className="tnum text-fg-2">{units(t.total_supply, t.decimals)}</span> },
        { key: 'w', header: 'First seen', align: 'right', cell: (t) => <span className="whitespace-nowrap text-fg-3" title={dateTime(t.first_seen_at)}>{ago(t.first_seen_at)}</span> },
      ]} />
      <Profile target={open} onClose={() => setOpen(null)} />
    </Card>
  )
}
