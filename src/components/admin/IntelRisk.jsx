import { useEffect, useState } from 'react'
import { ShieldAlert, Skull } from 'lucide-react'
import { api } from '../../lib/api.js'
import { ago, dateTime, num } from '../../lib/format.js'
import Card, { DefinitionList } from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import Modal from '../ui/Modal.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { SearchInput, Segmented } from '../ui/Controls.jsx'
import Button from '../common/Button.jsx'
import { errorMessage } from '../common/Alert.jsx'
import { Profile } from './IntelWallets.jsx'
import { SeverityTag } from './intelBits.jsx'

const inputCls = 'h-9 w-full min-w-0 rounded-lg bg-surface border border-line-strong px-3 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/70'
const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '-')
function usd(v) {
  if (v == null) return '-'
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${Math.round(v)}`
}

// What staff can edit on an incident. Addresses are one per line as
// "chain role address", transactions "chain hash", links one URL a line.
function toForm(e) {
  return {
    name: e?.name || '', occurred_on: e?.occurred_on ? e.occurred_on.slice(0, 10) : '', chain: e?.chain || '', protocol: e?.protocol || '',
    attack_type: e?.attack_type || '', loss_usd: e?.loss_usd ?? '', summary: e?.summary || '', hidden: !!e?.hidden,
    addresses: (e?.addresses || []).map((a) => `${a.chain} ${a.role} ${a.address}`).join('\n'),
    txs: (e?.txs || []).map((t) => `${t.chain} ${t.hash}`).join('\n'), links: (e?.links || []).join('\n'),
  }
}

function fromForm(f) {
  const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    name: f.name, occurred_on: f.occurred_on, chain: f.chain, protocol: f.protocol, attack_type: f.attack_type, summary: f.summary, hidden: f.hidden,
    loss_usd: f.loss_usd === '' ? null : Number(f.loss_usd),
    addresses: lines(f.addresses).map((l) => { const [chain, role, address] = l.split(/\s+/); return { chain, role, address } }),
    txs: lines(f.txs).map((l) => { const [chain, hash] = l.split(/\s+/); return { chain, hash } }),
    links: lines(f.links),
  }
}

function ExploitForm({ exploit, onSaved, onCancel }) {
  const [f, setF] = useState(toForm(exploit))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(await api(exploit ? `/api/v1/admin/intel/exploits/${exploit.id}` : '/api/v1/admin/intel/exploits', { method: exploit ? 'PUT' : 'POST', body: fromForm(f) }))
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  const field = (k, label, props = {}) => (
    <label className="grid gap-1 text-xs text-fg-3">{label}<input aria-label={label} value={f[k]} onChange={set(k)} className={inputCls} {...props} /></label>
  )
  const area = (k, label, placeholder) => (
    <label className="grid gap-1 text-xs text-fg-3 sm:col-span-2">{label}<textarea aria-label={label} value={f[k]} onChange={set(k)} rows={3} placeholder={placeholder}
      className="min-w-0 rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-xs text-fg outline-none focus:border-accent/70" /></label>
  )
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      {field('name', 'Name')}
      {field('occurred_on', 'Date (YYYY-MM-DD)', { placeholder: '2026-10-21' })}
      {field('chain', 'Chain', { placeholder: 'ethereum' })}
      {field('protocol', 'Protocol slug', { placeholder: 'uniswap-v3' })}
      {field('attack_type', 'Attack type')}
      {field('loss_usd', 'Loss (USD)', { inputMode: 'decimal' })}
      {area('summary', 'Summary', '')}
      {area('addresses', 'Addresses: chain role address, one a line', 'ethereum vulnerable 0x…')}
      {area('txs', 'Transactions: chain hash, one a line', 'ethereum 0x…')}
      {area('links', 'Links, one a line', 'https://…')}
      <label className="flex items-center gap-2 text-xs text-fg-2"><input type="checkbox" checked={f.hidden} onChange={set('hidden')} aria-label="Hidden" /> Hidden (left out of scores and lists)</label>
      <div className="flex justify-end gap-2 sm:col-span-2">
        {error && <span className="mr-auto self-center text-xs text-bad">{error}</span>}
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button size="sm" type="submit" disabled={busy || f.name.trim() === ''}>{busy ? 'Saving' : 'Save incident'}</Button>
      </div>
    </form>
  )
}

function ExploitDetail({ id, creating, onClose, onOpenAddress, onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(!!creating)
  useEffect(() => {
    setEditing(!!creating)
    if (!id) return
    setData(null)
    setError(null)
    api(`/api/v1/admin/intel/exploits/${id}`).then(setData, (err) => setError(errorMessage(err)))
  }, [id, creating])
  if (!id && !creating) return null
  const e = data
  return (
    <Modal open onClose={onClose} width="max-w-3xl" title={creating ? 'Add an incident' : e?.name || 'Incident'}
      description={e ? `${e.source === 'staff' ? 'Added by staff' : 'From DeFiHackLabs (Apache-2.0)'}${e.edited ? ' · edited by staff, sync leaves it alone' : ''}` : ''}>
      {error && <p className="text-sm text-bad">{error}</p>}
      {editing && <ExploitForm exploit={creating ? null : e} onSaved={(saved) => { setData(saved); setEditing(false); onChanged() }} onCancel={() => (creating ? onClose() : setEditing(false))} />}
      {!editing && !e && !error && <p className="text-sm text-fg-3">Loading</p>}
      {!editing && e && (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {e.attack_type && <Badge>{e.attack_type}</Badge>}{e.protocol && <Badge tone="accent">{e.protocol}</Badge>}{e.hidden && <Badge>Hidden</Badge>}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>Edit</Button>
          </div>
          {e.summary && <p className="text-sm text-fg-2">{e.summary}</p>}
          <DefinitionList items={[
            ['Date', e.occurred_on ? e.occurred_on.slice(0, 10) : '-'],
            ['Chain', <span className="capitalize">{e.chain || '-'}</span>],
            ['Loss', e.loss_usd != null ? usd(e.loss_usd) : e.loss_text || '-'],
            e.poc_url && ['Proof of concept', <a href={e.poc_url} target="_blank" rel="noreferrer noopener" className="break-all text-accent hover:underline">{e.poc_url.split('/').pop()}</a>],
            e.links?.length > 0 && ['Write-ups', <span className="grid gap-0.5">{e.links.slice(0, 4).map((l) => <a key={l} href={l} target="_blank" rel="noreferrer noopener" className="break-all text-accent hover:underline">{l}</a>)}</span>],
          ]} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-2 text-xs text-fg-3">Addresses</div>
              <div className="overflow-hidden rounded-lg border border-line">
                <DataTable rows={e.addresses || []} rowKey={(a) => `${a.chain}:${a.address}:${a.role}`} dense empty={<EmptyState compact title="None recorded" />} columns={[
                  { key: 'a', header: 'Address', cell: (a) => <button type="button" className="font-mono text-xs text-fg hover:underline" onClick={() => onOpenAddress({ chain: a.chain, address: a.address })} aria-label={`Open address ${a.address} on ${a.chain}`}>{short(a.address)}</button> },
                  { key: 'r', header: 'Role', cell: (a) => <span className="text-xs text-fg-2">{a.role.replace('_', ' ')}</span> },
                ]} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-2 text-xs text-fg-3">Transactions</div>
              <div className="overflow-hidden rounded-lg border border-line">
                <DataTable rows={e.txs || []} rowKey={(t) => t.hash} dense empty={<EmptyState compact title="None recorded" />} columns={[
                  { key: 'h', header: 'Hash', cell: (t) => <span className="font-mono text-xs" title={t.hash}>{short(t.hash)}</span> },
                  { key: 'r', header: 'Role', cell: (t) => <span className="text-xs text-fg-2">{t.role}</span> },
                ]} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

const LEVELS = [{ value: 'low', label: 'Low and up' }, { value: 'medium', label: 'Medium and up' }, { value: 'high', label: 'High and up' }, { value: 'info', label: 'All' }]

// IntelRisk is risk events from the rules and the exploit database.
export default function IntelRisk({ stats, events, exploitStats, exploits, onChanged }) {
  const [level, setLevel] = useState('low')
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState(null)
  const [openAddr, setOpenAddr] = useState(null)
  const [openExploit, setOpenExploit] = useState(null)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (level === 'low') { setRows(null); return }
    api(`/api/v1/admin/intel/risk-events?severity=${level}`).then((d) => setRows(d.events), () => setRows([]))
  }, [level])
  useEffect(() => {
    const term = q.trim()
    if (!term) { setFound(null); return }
    const t = setTimeout(() => api(`/api/v1/admin/intel/exploits?q=${encodeURIComponent(term)}`).then((d) => setFound(d.exploits), () => setFound([])), 250)
    return () => clearTimeout(t)
  }, [q])
  return (
    <>
      <Card title={<span className="flex items-center gap-2"><ShieldAlert className="size-4 text-fg-3" aria-hidden />Last 24 hours by chain</span>}
        description="Risk events per severity; unpublished ones are still waiting for the outbox to put them on the queue as intel.events.<kind>" flush>
        <DataTable rows={stats} rowKey={(s) => s.chain} dense empty={<EmptyState compact title="No risk event in the last 24 hours" />} columns={[
          { key: 'chain', header: 'Chain (24h)', cell: (s) => <span className="capitalize text-fg">{s.chain}</span> },
          { key: 'c', header: 'Critical', align: 'right', cell: (s) => <span className={`tnum ${s.critical ? 'text-bad' : ''}`}>{num(s.critical)}</span> },
          { key: 'h', header: 'High', align: 'right', cell: (s) => <span className="tnum">{num(s.high)}</span> },
          { key: 'm', header: 'Medium', align: 'right', cell: (s) => <span className="tnum">{num(s.medium)}</span> },
          { key: 'l', header: 'Low and info', align: 'right', hide: 'sm', cell: (s) => <span className="tnum">{num(s.low + s.info)}</span> },
          { key: 'p', header: 'Unpublished', align: 'right', hide: 'md', cell: (s) => <span className="tnum text-fg-3">{num(s.unpublished)}</span> },
        ]} />
      </Card>
      <Card title="Latest events" description="Upgrades and control changes on tracked contracts, fast governance, large transfers, contracts copying exploit code and tokens imitating well known ones" flush>
        <div className="overflow-x-auto px-5 pb-3 scrollbar-thin"><Segmented label="Minimum severity" options={LEVELS} value={level} onChange={setLevel} /></div>
        <DataTable rows={rows ?? events} rowKey={(e) => e.id} dense empty={<EmptyState compact title="No event at this level" />} columns={[
          { key: 's', header: 'Severity', cell: (e) => <SeverityTag severity={e.severity} /> },
          { key: 't', header: 'Event', cell: (e) => <span className="text-fg">{e.title}</span> },
          { key: 'c', header: 'Contract', hide: 'sm', cell: (e) => e.contract ? <button type="button" className="font-mono text-xs text-fg-2 hover:underline" onClick={() => setOpenAddr({ chain: e.chain, address: e.contract })} aria-label={`Open contract ${e.contract} on ${e.chain}`}>{short(e.contract)}</button> : '-' },
          { key: 'chain', header: 'Chain', hide: 'md', cell: (e) => <span className="capitalize text-fg-2">{e.chain}</span> },
          { key: 'w', header: 'When', align: 'right', cell: (e) => <span className="whitespace-nowrap text-fg-3" title={dateTime(e.created_at)}>{ago(e.created_at)}</span> },
        ]} />
      </Card>

      <Card title={<span className="flex items-center gap-2"><Skull className="size-4 text-fg-3" aria-hidden />Exploits</span>}
        description={`Incidents from DeFiHackLabs (Apache-2.0), synced daily, plus incidents staff add. ${num(exploitStats.total)} recorded, ${num(exploitStats.last_365d)} in the last year (${usd(exploitStats.loss_usd_365d)} lost).`}
        actions={<Button size="sm" variant="ghost" onClick={() => setCreating(true)}>Add incident</Button>} flush>
        <div className="flex justify-end px-5 pb-1"><div className="w-full sm:w-64"><SearchInput id="intel-exploit-search" value={q} onChange={setQ} placeholder="Search incidents" label="Search incidents" /></div></div>
        <DataTable rows={found ?? exploits} rowKey={(e) => e.id} dense empty={<EmptyState compact title="No incident" />} columns={[
          { key: 'd', header: 'Date', cell: (e) => <span className="whitespace-nowrap text-fg-3 tnum">{e.occurred_on ? e.occurred_on.slice(0, 10) : '-'}</span> },
          { key: 'n', header: 'Incident', cell: (e) => <button type="button" className="text-left text-fg hover:underline" onClick={() => setOpenExploit(e.id)} aria-label={`Open incident ${e.name}`}>{e.name}</button> },
          { key: 't', header: 'Attack', hide: 'md', cell: (e) => <span className="text-xs text-fg-2">{e.attack_type || '-'}</span> },
          { key: 'p', header: 'Protocol', hide: 'lg', cell: (e) => <span className="text-xs text-fg-2">{e.protocol || '-'}</span> },
          { key: 'l', header: 'Loss', align: 'right', cell: (e) => <span className="tnum">{usd(e.loss_usd)}</span> },
          { key: 'c', header: 'Chain', align: 'right', hide: 'sm', cell: (e) => <span className="capitalize text-fg-2">{e.chain || '-'}</span> },
        ]} />
      </Card>
      <ExploitDetail id={openExploit} creating={creating} onClose={() => { setOpenExploit(null); setCreating(false) }}
        onOpenAddress={(t) => { setOpenExploit(null); setCreating(false); setOpenAddr(t) }} onChanged={onChanged} />
      <Profile target={openAddr} onClose={() => setOpenAddr(null)} />
    </>
  )
}
