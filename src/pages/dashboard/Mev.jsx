import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Zap } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num, pct } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import EngineLayout from '../../components/dashboard/EngineLayout.jsx'
import { MEV_SECTIONS } from '../../data/engineNav.js'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSelect, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { AddressLink, isAddress } from '../../components/intel/IntelKit.jsx'
import {
  MEV_CHAINS, MevAccessBadge, MevError, MevLocked, PATTERNS, PredictionTable, analysisPath, mevCall, newKey, useMev, useMevAccess,
} from '../../components/mev/MevKit.jsx'

const TABS = [
  { value: 'overview', label: 'Live' },
  { value: 'predictions', label: 'Predictions' },
  { value: 'targets', label: 'Targets' },
  { value: 'detections', label: 'Mined attacks' },
  { value: 'analyses', label: 'Analyses' },
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'settings', label: 'Settings' },
]
const chainOptions = (all) => [...(all ? [{ value: '', label: 'All chains' }] : []), ...MEV_CHAINS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))]
const SEVERITIES = ['critical', 'high', 'medium', 'low']

function Live() {
  const r = useMev('/predictions?limit=50')
  const { reload } = r
  useEffect(() => {
    const t = setInterval(reload, 5000)
    return () => clearInterval(t)
  }, [reload])
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  const ps = r.data?.predictions || []
  const day = ps.filter((p) => Date.now() - new Date(p.created_at) < 864e5)
  const decided = day.filter((p) => ['confirmed', 'missed', 'false_positive'].includes(p.status))
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending now" value={num(ps.filter((p) => p.status === 'pending').length)} sub="predictions waiting for their block" />
        <StatCard label="Last 24 hours" value={num(day.length)} sub={`${day.filter((p) => p.severity === 'critical' || p.severity === 'high').length} critical or high`} />
        <StatCard label="Happened" value={decided.length ? pct(decided.filter((p) => p.status === 'confirmed').length / decided.length) : '-'}
          sub={`of ${decided.length} decided in 24 hours`} />
        <StatCard label="At stake" value={`$${num(Math.round(day.reduce((a, p) => a + (p.impact_usd || 0), 0)))}`} sub="in 24 hours' predictions" />
      </div>
      <Card flush title="Live predictions" description="Pending transactions on your contracts, read from the public mempool and private orderflow hints before they are mined. Refreshes every 5 seconds.">
        <PredictionTable rows={ps} loading={!r.data} />
      </Card>
    </div>
  )
}

function Predictions() {
  const [chain, setChain] = useState('')
  const [pattern, setPattern] = useState('')
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const q = new URLSearchParams(Object.entries({ chain, pattern, status, severity, limit: '200' }).filter(([, v]) => v)).toString()
  const r = useMev(`/predictions?${q}`)
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  return (
    <Card flush title="Predictions" description="Each one names its transactions, its risk breakdown, the simulation or route behind it and what to do.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="p-chain" label="Chain" value={chain} onChange={setChain} options={chainOptions(true)} />
        <FilterSelect id="p-pattern" label="Pattern" value={pattern} onChange={setPattern} options={[{ value: '', label: 'Every pattern' }, ...Object.entries(PATTERNS).map(([v, l]) => ({ value: v, label: l }))]} />
        <FilterSelect id="p-status" label="Outcome" value={status} onChange={setStatus} options={[{ value: '', label: 'Any outcome' }, { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Happened' }, { value: 'missed', label: 'Did not happen' }, { value: 'dropped', label: 'Dropped' }, { value: 'false_positive', label: 'False positive' }]} />
        <FilterSelect id="p-severity" label="Severity" value={severity} onChange={setSeverity} options={[{ value: '', label: 'Any severity' }, ...SEVERITIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
      </Toolbar></div>
      <PredictionTable rows={r.data?.predictions} loading={!r.data} />
    </Card>
  )
}

function Targets({ access }) {
  const { currentOrg, can } = useAuth()
  const r = useMev('/targets')
  const [form, setForm] = useState({ chain: 'ethereum', address: '', label: '' })
  const [error, setError] = useState(null)
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  async function add(e) {
    e.preventDefault()
    setError(null)
    try {
      await mevCall(currentOrg.id, '/targets', 'POST', { ...form, address: form.address.trim() })
      setForm({ ...form, address: '', label: '' })
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  async function remove(id) {
    try {
      await mevCall(currentOrg.id, `/targets/${id}`, 'DELETE')
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  const list = r.data?.targets
  const manual = (list || []).filter((t) => t.source === 'manual').length
  return (
    <div className="grid gap-4">
      {can('mev:write') && (
        <Card title="Watch a contract" description="Your projects' contracts and the contracts your Watch monitors bind are watched already. Add pools, vaults, routers or anything else here.">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-end">
            <SelectField id="t-chain" label="Chain" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} options={chainOptions(false)} />
            <Field id="t-address" label="Contract" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x" />
            <Field id="t-label" label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Main pool" />
            <Button type="submit" disabled={!isAddress(form.address.trim())}><Plus size={14} aria-hidden /> Watch</Button>
          </form>
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
          <p className="mt-2 text-xs text-fg-3">{manual} added by hand{access.max_targets ? ` of ${access.max_targets}` : ''}.</p>
        </Card>
      )}
      <Card flush title="Watched contracts">
        <DataTable rows={list} loading={!list} rowKey={(t) => `${t.source}:${t.chain}:${t.address}`}
          empty={<EmptyState compact title="Nothing watched yet">Add a project with a deployed contract, a Watch monitor, or a contract here.</EmptyState>}
          columns={[
            { key: 'a', header: 'Contract', cell: (t) => <span className="grid"><AddressLink chain={t.chain} address={t.address} /><span className="text-xs text-fg-3">{t.label}</span></span> },
            { key: 'c', header: 'Chain', hide: 'sm', cell: (t) => <span className="capitalize">{t.chain}</span> },
            { key: 's', header: 'From', cell: (t) => <Badge tone={t.source === 'manual' ? 'accent' : 'neutral'}>{{ manual: 'added', project: 'project', watch: 'Watch' }[t.source]}</Badge> },
            ...(can('mev:write') ? [{ key: 'x', header: '', align: 'right', cell: (t) => (t.source === 'manual' && t.id
              ? <Button size="sm" variant="ghost" onClick={() => remove(t.id)} aria-label={`Stop watching ${t.address}`}><Trash2 size={14} /></Button> : null) }] : []),
          ]} />
      </Card>
    </div>
  )
}

function Detections() {
  const r = useMev('/detections')
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  return (
    <Card flush title="Attacks found in mined blocks" description="Sandwiches on your pools and attacks by or against your contracts, found in every mined block on all seven chains, predicted or not.">
      <DataTable rows={r.data?.detections} loading={!r.data} rowKey={(d) => d.id}
        empty={<EmptyState compact title="None found">No mined attack touched your contracts.</EmptyState>}
        columns={[
          { key: 'k', header: 'Attack', cell: (d) => <Badge tone="danger">{PATTERNS[d.kind] || d.kind}</Badge> },
          { key: 'c', header: 'Chain', hide: 'sm', cell: (d) => <span className="capitalize">{d.chain}</span> },
          { key: 'a', header: 'Attacker', hide: 'md', cell: (d) => (d.attacker ? <AddressLink chain={d.chain} address={d.attacker} /> : '-') },
          { key: 'v', header: 'Victim', hide: 'lg', cell: (d) => (d.victim ? <AddressLink chain={d.chain} address={d.victim} /> : '-') },
          { key: 'b', header: 'Block', align: 'right', cell: (d) => <span className="tnum">{num(d.block_number)}</span> },
          { key: 'p', header: 'Predicted', align: 'right', hide: 'sm', cell: (d) => (d.prediction_id ? <Link className="hover:underline" to={`/dashboard/mev/predictions/${d.prediction_id}`}>#{d.prediction_id}</Link> : <span className="text-fg-3">no</span>) },
        ]} />
    </Card>
  )
}

function Analyses({ access }) {
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const r = useMev('/analyses')
  const [form, setForm] = useState({ chain: 'ethereum', address: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function run(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const q = await mevCall(currentOrg.id, '/analyses', 'POST', { chain: form.chain, address: form.address.trim() }, newKey())
      navigate(analysisPath(q.id))
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  return (
    <div className="grid gap-4">
      {can('mev:write') && (
        <Card title="Analyse a contract or pool" description={`A one-off MEV analysis (${access.analysis_credits} credits): liquidity depth and price impact for a pool, its sandwiches and predictions in 30 days, and what is pending to it now.`}>
          <form onSubmit={run} className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
            <SelectField id="a-chain" label="Chain" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} options={chainOptions(false)} />
            <Field id="a-address" label="Contract or pool" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x" />
            <Button type="submit" disabled={busy || !isAddress(form.address.trim())}>{busy ? 'Starting' : `Analyse for ${access.analysis_credits} credits`}</Button>
          </form>
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        </Card>
      )}
      <Card flush title="Past analyses">
        <DataTable rows={r.data?.analyses} loading={!r.data} rowKey={(q) => q.id} rowHref={(q) => analysisPath(q.id)}
          empty={<EmptyState compact title="No analysis yet" />}
          columns={[
            { key: 'i', header: 'Analysis', cell: (q) => <Link to={analysisPath(q.id)} className="font-mono text-xs text-fg hover:underline">#{q.id} {q.input?.address}</Link> },
            { key: 'c', header: 'Chain', hide: 'sm', cell: (q) => <span className="capitalize">{q.chain}</span> },
            { key: 's', header: 'Status', cell: (q) => <Badge tone={q.status === 'done' ? 'good' : q.status === 'failed' ? 'danger' : 'neutral'}>{q.status}</Badge> },
            { key: 'w', header: 'When', align: 'right', cell: (q) => <span className="text-fg-3" title={dateTime(q.requested_at)}>{ago(q.requested_at)}</span> },
          ]} />
      </Card>
    </div>
  )
}

function AccuracyTable({ rows, title, description }) {
  return (
    <Card flush title={title} description={description}>
      <DataTable rows={rows} dense rowKey={(a) => `${a.chain}:${a.pattern}`} empty={<EmptyState compact title="No predictions yet" />}
        columns={[
          { key: 'p', header: 'Pattern', cell: (a) => PATTERNS[a.pattern] || a.pattern },
          { key: 'c', header: 'Chain', hide: 'sm', cell: (a) => <span className="capitalize">{a.chain}</span> },
          { key: 't', header: 'Predictions', align: 'right', cell: (a) => <span className="tnum">{num(a.total)}</span> },
          { key: 'h', header: 'Happened', align: 'right', hide: 'sm', cell: (a) => <span className="tnum">{num(a.confirmed)}</span> },
          { key: 'f', header: 'False', align: 'right', hide: 'md', cell: (a) => <span className="tnum">{num(a.false_positive)}</span> },
          { key: 'pr', header: 'Precision', align: 'right', cell: (a) => <span className="tnum">{a.confirmed + a.false_positive + a.missed ? pct(a.precision) : '-'}</span> },
        ]} />
    </Card>
  )
}

function Accuracy() {
  const r = useMev('/accuracy')
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  if (!r.data) return <PageSkeleton cards={2} />
  return (
    <div className="grid gap-4">
      <AccuracyTable rows={r.data.yours} title="On your contracts" description="The last 30 days. Precision is what happened over what was decided (happened, did not happen, false positive)." />
      <AccuracyTable rows={r.data.platform} title="Across Hawk-i" description="Every pattern's track record; once a pattern has 20 decided predictions on a chain its measured precision replaces its starting estimate in the risk score." />
    </div>
  )
}

const HOURS = [{ value: '', label: 'Off' }, ...Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))]

function Settings() {
  const { currentOrg, can } = useAuth()
  const r = useMev('/settings')
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    if (!r.data) return
    setForm({ min_severity: r.data.min_severity, quiet_start: r.data.quiet_start ?? '', quiet_end: r.data.quiet_end ?? '', timezone: r.data.timezone, muted: r.data.muted || [] })
  }, [r.data])
  if (r.error && !r.data) return <Card><MevError status={r.status} error={r.error} onRetry={r.reload} /></Card>
  if (!form) return <PageSkeleton cards={1} />
  const editable = can('mev:configure')
  async function save(e) {
    e.preventDefault()
    setMsg(null)
    const quiet = form.quiet_start !== '' && form.quiet_end !== ''
    try {
      await mevCall(currentOrg.id, '/settings', 'PUT', { min_severity: form.min_severity, timezone: form.timezone, muted: form.muted,
        quiet_start: quiet ? Number(form.quiet_start) : null, quiet_end: quiet ? Number(form.quiet_end) : null })
      setMsg({ tone: 'info', text: 'Saved.' })
      r.reload()
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }
  return (
    <Card title="Alerts" description="Critical and high predictions alert at once (20 a minute at most, the rest in the digest); medium and low go to the daily digest. Channels are set in alert settings.">
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <SelectField id="ms-min" label="Minimum severity" value={form.min_severity} disabled={!editable} onChange={(e) => setForm({ ...form, min_severity: e.target.value })}
          options={SEVERITIES.slice().reverse().map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />
        <Field id="ms-tz" label="Time zone" value={form.timezone} disabled={!editable} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        <SelectField id="ms-qs" label="Quiet from" value={String(form.quiet_start)} disabled={!editable} onChange={(e) => setForm({ ...form, quiet_start: e.target.value })} options={HOURS} />
        <SelectField id="ms-qe" label="Quiet until" value={String(form.quiet_end)} disabled={!editable} onChange={(e) => setForm({ ...form, quiet_end: e.target.value })} options={HOURS} />
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm text-fg-2">Patterns that raise no alert</legend>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {Object.entries(PATTERNS).map(([id, name]) => (
              <label key={id} className="flex items-center gap-2 text-sm text-fg-2">
                <input type="checkbox" disabled={!editable} checked={form.muted.includes(id)}
                  onChange={(e) => setForm({ ...form, muted: e.target.checked ? [...form.muted, id] : form.muted.filter((m) => m !== id) })} /> {name}
              </label>
            ))}
          </div>
        </fieldset>
        {editable && <div className="sm:col-span-2"><Button type="submit">Save</Button></div>}
      </form>
    </Card>
  )
}

export default function Mev() {
  const [params] = useSearchParams()
  const { access, on, error, status, reload } = useMevAccess()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview'
  if (error && !access) return <div><PageHeader title="MEV Intelligence" /><Card><MevError status={status} error={error} onRetry={reload} /></Card></div>
  if (!access) return <PageSkeleton cards={3} />
  return (
    <EngineLayout name="MEV Intelligence" icon={Zap} sections={MEV_SECTIONS} status={<MevAccessBadge access={access} />}
      description="What attack is about to happen: pending transactions on your contracts are decoded, matched against attack patterns, priced and simulated before they are mined, and mined blocks show what really happened.">
      {!on ? <Card><MevLocked what="MEV Intelligence" /></Card> : (
        <div className="grid gap-4">
          {tab === 'overview' && <Live />}
          {tab === 'predictions' && <Predictions />}
          {tab === 'targets' && <Targets access={access} />}
          {tab === 'detections' && <Detections />}
          {tab === 'analyses' && <Analyses access={access} />}
          {tab === 'accuracy' && <Accuracy />}
          {tab === 'settings' && <Settings />}
        </div>
      )}
    </EngineLayout>
  )
}
