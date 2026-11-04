import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Plus, Radar } from 'lucide-react'
import { api, download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import EngineLayout from '../../components/dashboard/EngineLayout.jsx'
import { WATCH_SECTIONS } from '../../data/engineNav.js'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSelect, Segmented, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { AlertRow } from '../../components/dashboard/AlertBits.jsx'
import ViolationTable from '../../components/watch/ViolationTable.jsx'
import { ChainName, isAddress } from '../../components/intel/IntelKit.jsx'
import {
  BillingBadge, HealthBadge, LevelBadge, MonitorLink, SEVERITIES, WatchAccessBadge, WatchError, WatchLocked,
  chainOptions, credits, monitorPath, newKey, requestPath, useWatch, useWatchAccess, watchCall,
} from '../../components/watch/WatchKit.jsx'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'add', label: 'Add protocol' },
  { value: 'violations', label: 'Violations' },
  { value: 'risks', label: 'Economic risks' },
  { value: 'checks', label: 'Health checks' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
]

function Overview({ access }) {
  const r = useWatch('/monitors')
  const open = useWatch('/violations?status=active&limit=10')
  const ms = r.data?.monitors
  const health = useMemo(() => {
    const out = { healthy: 0, degraded: 0, at_risk: 0, critical: 0 }
    for (const m of ms || []) if (m.status === 'active') out[m.health] = (out[m.health] || 0) + 1
    return out
  }, [ms])
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Watch" /></Card>
  const active = (ms || []).filter((m) => m.status === 'active').length
  const openList = open.data?.violations || []
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monitors" value={ms ? num(ms.length) : '-'} sub={access.max_monitors ? `${active} active, ${access.max_monitors} at most` : `${active} active`} />
        <StatCard label="Health" value={ms ? `${health.healthy} healthy` : '-'}
          sub={`${health.degraded} degraded, ${health.at_risk} at risk, ${health.critical} critical`} tone={health.critical + health.at_risk > 0 ? 'danger' : undefined} />
        <StatCard label="Projected spend" value={`${credits(access.projected_monthly_millicredits)} cr`} sub={access.exempt ? 'a month, not charged (exempt)' : 'a month at today’s monitors'} />
        <StatCard label="Open episodes" value={open.data ? num(openList.length) + (openList.length === 10 ? '+' : '') : '-'}
          sub={openList.filter((v) => v.severity === 'critical' || v.severity === 'high').length + ' critical or high'} />
      </div>
      <Card flush title="Monitored protocols" description="Each is checked at every block on 2 s chains and every 2 s on faster ones; a monitor's health is its worst open episode."
        actions={<Button size="sm" to="/dashboard/watch?tab=add"><Plus size={14} aria-hidden /> Add protocol</Button>}>
        <DataTable rows={ms} loading={!ms} rowKey={(m) => m.id} rowHref={(m) => monitorPath(m.id)}
          empty={<EmptyState compact title="No protocol monitored yet" action={<Button size="sm" to="/dashboard/watch?tab=add">Add a protocol</Button>}>
            Pick one from the catalogue or bind your own contracts.</EmptyState>}
          columns={[
            { key: 'n', header: 'Protocol', cell: (m) => <span className="flex flex-wrap items-center gap-2"><MonitorLink id={m.id} name={m.name} /><BillingBadge billing={m.billing} />
              {m.status === 'paused' && <Badge>Paused</Badge>}</span> },
            { key: 'c', header: 'Chain', hide: 'sm', cell: (m) => <ChainName chain={m.chain} /> },
            { key: 'l', header: 'Level', hide: 'sm', cell: (m) => <LevelBadge level={m.level} /> },
            { key: 'h', header: 'Health', cell: (m) => <HealthBadge health={m.health} pulse /> },
            { key: 'k', header: 'Components', align: 'right', hide: 'md', cell: (m) => <span className="tnum">{m.components.length}</span> },
            { key: 's', header: 'Since', align: 'right', hide: 'lg', cell: (m) => <span className="whitespace-nowrap text-fg-3" title={dateTime(m.health_since)}>{ago(m.health_since)}</span> },
          ]} />
      </Card>
      {openList.length > 0 && (
        <Card flush title="Open episodes" actions={<Button size="sm" variant="ghost" to="/dashboard/watch?tab=violations">All violations</Button>}>
          <ViolationTable rows={openList} />
        </Card>
      )}
    </div>
  )
}

// ComponentForm binds one library kind to addresses: a field per role.
export function ComponentForm({ kinds, value, onChange, idPrefix }) {
  const kind = kinds.find((k) => k.id === value.kind)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField id={`${idPrefix}-kind`} label="Kind" value={value.kind} onChange={(e) => onChange({ ...value, kind: e.target.value, bind: {} })}
        options={[{ value: '', label: 'Choose a kind' }, ...kinds.map((k) => ({ value: k.id, label: `${k.name}${k.level === 'full' ? ' (Full)' : ''}` }))]} />
      <Field id={`${idPrefix}-label`} label="Label" value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="Vault, pair, token" />
      {kind?.roles.map((role) => (
        <Field key={role} id={`${idPrefix}-${role}`} label={`${role} address`} value={value.bind[role] || ''} placeholder="0x"
          onChange={(e) => onChange({ ...value, bind: { ...value.bind, [role]: e.target.value.trim() } })} />
      ))}
      {kind && <p className="text-xs text-fg-3 sm:col-span-2">{kind.description} {kind.invariants.length} invariants.</p>}
    </div>
  )
}

function AddProtocol({ access, reloadAccess }) {
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const cat = useWatch('/catalog')
  const lib = useWatch('/library')
  const [mode, setMode] = useState('catalog')
  const [chain, setChain] = useState('')
  const [preset, setPreset] = useState('')
  const [level, setLevel] = useState('standard')
  const [name, setName] = useState('')
  const [comp, setComp] = useState({ kind: '', label: '', bind: {} })
  const [own, setOwn] = useState({ chain: 'base', address: '' })
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const kinds = useMemo(() => lib.data?.kinds || [], [lib.data])
  const kindLevel = (id) => kinds.find((k) => k.id === id)?.level
  const protocols = (cat.data?.protocols || []).filter((p) => !chain || p.chain === chain)
  const chosen = protocols.find((p) => p.id === preset)
  const needsFull = (comps) => (comps || []).some((c) => kindLevel(c.kind) === 'full')
  const presetFull = chosen && needsFull(chosen.components)
  const ownFull = comp.kind && kindLevel(comp.kind) === 'full'
  const want = (mode === 'catalog' ? presetFull : ownFull) ? 'full' : level
  const monthly = access.monthly_credits?.[want]
  const daily = access.daily_millicredits?.[want]
  const atLimit = access.max_monitors > 0 && access.monitors >= access.max_monitors
  const fullLocked = want === 'full' && !access.levels.includes('full')

  useEffect(() => {
    if (!suggestion?.id || suggestion.status === 'done' || suggestion.status === 'failed') return
    const t = setTimeout(async () => {
      try {
        setSuggestion(await watchCall(currentOrg.id, `/requests/${suggestion.id}`, 'GET'))
      } catch (err) {
        setError(errorMessage(err))
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [suggestion, currentOrg.id])

  if (cat.error || lib.error) return <Card><WatchError status={cat.status || lib.status} error={cat.error || lib.error} onRetry={() => { cat.reload(); lib.reload() }} /></Card>
  if (!can('watch:write')) return <Card><EmptyState title="Members add protocols">Ask an admin or member of the organization to add one.</EmptyState></Card>

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = mode === 'catalog'
        ? { preset, level: want, ...(name.trim() ? { name: name.trim() } : {}) }
        : { name: name.trim(), chain: own.chain, level: want, components: [{ kind: comp.kind, label: comp.label.trim() || comp.kind, bind: comp.bind }] }
      const m = await watchCall(currentOrg.id, '/monitors', 'POST', body)
      reloadAccess()
      navigate(monitorPath(m.id))
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  async function suggest(e) {
    e.preventDefault()
    setError(null)
    setSuggestion(null)
    try {
      setSuggestion(await watchCall(currentOrg.id, '/suggestions', 'POST', { chain: own.chain, address: own.address.trim() }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  const suggestions = Array.isArray(suggestion?.result) ? suggestion.result : suggestion?.result?.suggestions || []
  const ready = mode === 'catalog' ? Boolean(preset) : Boolean(comp.kind && name.trim())

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <div className="grid min-w-0 gap-4 lg:col-span-2">
        <Card title="What to monitor">
          <div className="mb-4"><Segmented label="Source" value={mode} onChange={setMode} options={[{ value: 'catalog', label: 'Catalogue' }, { value: 'own', label: 'Your contracts' }]} /></div>
          {mode === 'catalog' ? (
            <div className="grid gap-3">
              <div className="w-40"><FilterSelect id="add-chain" label="Chain" value={chain} onChange={(v) => { setChain(v); setPreset('') }} options={chainOptions(true)} /></div>
              {!cat.data ? <div className="h-24" /> : (
                <ul className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Catalogue protocols">
                  {protocols.map((p) => {
                    const full = needsFull(p.components)
                    return (
                      <li key={p.id}>
                        <button type="button" role="radio" aria-checked={preset === p.id} aria-label={`${p.name} on ${p.chain}`} onClick={() => setPreset(p.id)}
                          className={`grid w-full gap-1 rounded-xl border p-3 text-left transition ${preset === p.id ? 'border-accent bg-accent/5' : 'border-line hover:border-line-strong'}`}>
                          <span className="flex flex-wrap items-center gap-2 text-sm text-fg">{p.name}<ChainName chain={p.chain} />{full && <LevelBadge level="full" />}</span>
                          <span className="text-xs text-fg-3">{p.description}</span>
                          <span className="text-xs text-fg-3">{p.invariants} invariants</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <form onSubmit={suggest} className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
                <SelectField id="own-chain" label="Chain" value={own.chain} onChange={(e) => setOwn({ ...own, chain: e.target.value })} options={chainOptions(false)} />
                <Field id="own-address" label="Contract" value={own.address} onChange={(e) => setOwn({ ...own, address: e.target.value })} placeholder="0x" />
                <Button type="submit" variant="ghost" disabled={!isAddress(own.address.trim())}>Suggest kinds</Button>
              </form>
              {suggestion && (
                <div className="rounded-xl border border-line p-3 text-sm">
                  {suggestion.status !== 'done' && suggestion.status !== 'failed' && <p className="text-fg-3">Reading the contract as every kind it could be...</p>}
                  {suggestion.status === 'failed' && <Alert>{suggestion.error || 'The suggestion failed.'}</Alert>}
                  {suggestion.status === 'done' && (suggestions.length === 0 ? <p className="text-fg-3">No library kind reads this contract fully. Bind it by hand below.</p> : (
                    <ul className="grid gap-2">{suggestions.map((s) => (
                      <li key={s.kind} className="flex flex-wrap items-center justify-between gap-2">
                        <span><span className="text-fg">{s.name}</span> <span className="text-xs text-fg-3">{Object.keys(s.values || {}).length} values read</span></span>
                        <Button size="sm" variant="ghost" onClick={() => setComp({ kind: s.kind, label: s.name, bind: s.bind })}>Use</Button>
                      </li>
                    ))}</ul>
                  ))}
                </div>
              )}
              <ComponentForm kinds={kinds} value={comp} onChange={setComp} idPrefix="own" />
              <p className="text-xs text-fg-3">Your own contracts spend 24 hours in a shadow period: violations are recorded but not alerted while Watch measures each invariant.</p>
            </div>
          )}
        </Card>
      </div>
      <Card title="Cost" className="lg:sticky lg:top-4">
        <form onSubmit={create} className="grid gap-3">
          <Field id="add-name" label={mode === 'catalog' ? 'Name (optional)' : 'Name'} value={name} onChange={(e) => setName(e.target.value)}
            placeholder={chosen?.name || 'My protocol'} />
          <SelectField id="add-level" label="Level" value={want} disabled={(mode === 'catalog' ? presetFull : ownFull)} onChange={(e) => setLevel(e.target.value)}
            options={[{ value: 'standard', label: 'Standard: invariants' }, { value: 'full', label: 'Full: invariants and economic analyses' }]} />
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-fg-3">A month</dt><dd className="text-right tnum text-fg">{monthly} credits</dd>
            <dt className="text-fg-3">Charged today</dt><dd className="text-right tnum text-fg">{credits(daily)} credits</dd>
            <dt className="text-fg-3">Watch a month after</dt><dd className="text-right tnum text-fg">{credits((access.projected_monthly_millicredits || 0) + (daily || 0) * 30)} credits</dd>
          </dl>
          <p className="text-xs text-fg-3">Charged each day at 00:00 UTC for the day ahead; the first day now. {access.exempt ? 'Your organization is exempt: nothing is charged.' : 'The month’s projected spend must fit your monthly cap.'}</p>
          {atLimit && <Alert tone="info">Your plan monitors {access.max_monitors} protocols at most. Remove one or move to Security for more.</Alert>}
          {fullLocked && <WatchLocked need="pro" what="The Full level" compact />}
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy || !ready || atLimit || fullLocked}>{busy ? 'Adding' : `Add for ${credits(daily)} credits today`}</Button>
        </form>
      </Card>
    </div>
  )
}

function Violations() {
  const [status, setStatus] = useState('active')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const q = new URLSearchParams(Object.entries({ status, category, severity, limit: '100' }).filter(([, v]) => v)).toString()
  const r = useWatch(`/violations?${q}`)
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Violations" /></Card>
  return (
    <Card flush title="Violation episodes" description="One episode per invariant break, from the first block it failed until it holds again. Critical and high are read a second time from another endpoint before they open.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="v-status" label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Not over' }, { value: '', label: 'Any status' },
          { value: 'open', label: 'Open' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'suspected', label: 'Suspected false positive' },
          { value: 'resolved', label: 'Resolved' }, { value: 'retracted', label: 'Retracted (reorg)' }]} />
        <FilterSelect id="v-category" label="Kind" value={category} onChange={setCategory} options={[{ value: '', label: 'Every kind' }, { value: 'invariant', label: 'Invariant' },
          { value: 'economic', label: 'Economic' }, { value: 'governance', label: 'Governance' }]} />
        <FilterSelect id="v-severity" label="Severity" value={severity} onChange={setSeverity} options={[{ value: '', label: 'Any severity' }, ...SEVERITIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
      </Toolbar></div>
      <ViolationTable rows={r.data?.violations} loading={!r.data} />
    </Card>
  )
}

function Risks({ pro }) {
  const r = useWatch(pro ? '/risks' : null)
  if (!pro) return <Card><WatchLocked need="pro" what="Economic security" /></Card>
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Economic risks" /></Card>
  if (!r.data) return <PageSkeleton cards={2} />
  const d = r.data
  return (
    <div className="grid gap-4">
      {d.full_monitors === 0 && <Alert tone="info">No monitor is on the Full level yet. Full adds oracle manipulation, flash loan, liquidity, governance proposal and MEV analyses.</Alert>}
      <Card flush title="Economic episodes" description="Oracle prices drifting from the market, prices moving during flash loans, liquidity leaving fast, concentrated holders and liquidatable positions.">
        <ViolationTable rows={d.economic} />
      </Card>
      <Card flush title="Governance" description="Pending proposals that target a Full monitor are simulated on a fork at the head; a proposal that would break an invariant opens an episode before it executes.">
        <ViolationTable rows={d.governance} />
      </Card>
      <Card flush title="Simulated proposals">
        <DataTable rows={d.simulations} rowKey={(s) => `${s.governor}:${s.proposal_id}:${s.monitor_id}`} dense
          empty={<EmptyState compact title="No proposal simulated yet">None of the pending proposals touched your Full monitors.</EmptyState>}
          columns={[
            { key: 'p', header: 'Proposal', cell: (s) => <span className="font-mono text-xs">{s.proposal_id.length > 14 ? `${s.proposal_id.slice(0, 14)}…` : s.proposal_id}</span> },
            { key: 'o', header: 'Outcome', cell: (s) => <Badge tone={s.outcome === 'harmful' ? 'danger' : s.outcome === 'harmless' ? 'good' : 'warning'}>{s.outcome}</Badge> },
            { key: 'm', header: 'Monitor', hide: 'sm', cell: (s) => <Link to={monitorPath(s.monitor_id)} className="hover:underline">#{s.monitor_id}</Link> },
            { key: 'w', header: 'When', align: 'right', cell: (s) => <span className="text-fg-3" title={dateTime(s.simulated_at)}>{ago(s.simulated_at)}</span> },
          ]} />
      </Card>
    </div>
  )
}

function Checks({ access }) {
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const cat = useWatch('/catalog')
  const lib = useWatch('/library')
  const r = useWatch('/requests?kind=health_check')
  const [mode, setMode] = useState('catalog')
  const [preset, setPreset] = useState('')
  const [chain, setChain] = useState('base')
  const [comp, setComp] = useState({ kind: '', label: '', bind: {} })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Health checks" /></Card>
  async function run(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = mode === 'catalog' ? { preset } : { chain, components: [{ kind: comp.kind, label: comp.label || comp.kind, bind: comp.bind }] }
      const q = await watchCall(currentOrg.id, '/health-checks', 'POST', body, newKey())
      navigate(requestPath(q.id))
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  return (
    <div className="grid gap-4">
      {can('watch:write') && (
        <Card title="One-off health check" description={`Every invariant of a protocol read at the last two blocks, without ongoing monitoring: ${access.credits?.health_check} credits.`}>
          <form onSubmit={run} className="grid gap-3">
            <Segmented label="Source" value={mode} onChange={setMode} options={[{ value: 'catalog', label: 'Catalogue' }, { value: 'own', label: 'Your contract' }]} />
            {mode === 'catalog'
              ? <SelectField id="hc-preset" label="Protocol" value={preset} onChange={(e) => setPreset(e.target.value)}
                options={[{ value: '', label: 'Choose a protocol' }, ...(cat.data?.protocols || []).map((p) => ({ value: p.id, label: `${p.name} (${p.chain})` }))]} />
              : (
                <div className="grid gap-3">
                  <div className="w-40"><SelectField id="hc-chain" label="Chain" value={chain} onChange={(e) => setChain(e.target.value)} options={chainOptions(false)} /></div>
                  <ComponentForm kinds={lib.data?.kinds || []} value={comp} onChange={setComp} idPrefix="hc" />
                </div>
              )}
            {error && <Alert>{error}</Alert>}
            <div><Button type="submit" disabled={busy || (mode === 'catalog' ? !preset : !comp.kind)}>{busy ? 'Starting' : `Run for ${access.credits?.health_check} credits`}</Button></div>
          </form>
        </Card>
      )}
      <Card flush title="Past health checks">
        <DataTable rows={r.data?.requests} loading={!r.data} rowKey={(q) => q.id} rowHref={(q) => requestPath(q.id)}
          empty={<EmptyState compact title="No health check yet" />}
          columns={[
            { key: 'i', header: 'Check', cell: (q) => <Link to={requestPath(q.id)} className="text-fg hover:underline">#{q.id} {q.input?.preset || q.input?.components?.[0]?.label || ''}</Link> },
            { key: 'c', header: 'Chain', hide: 'sm', cell: (q) => <ChainName chain={q.chain} /> },
            { key: 'h', header: 'Result', cell: (q) => (q.status === 'done' ? <HealthBadge health={q.result?.health} /> : <Badge tone={q.status === 'failed' ? 'danger' : 'neutral'}>{q.status}</Badge>) },
            { key: 'w', header: 'When', align: 'right', cell: (q) => <span className="text-fg-3" title={dateTime(q.requested_at)}>{ago(q.requested_at)}</span> },
          ]} />
      </Card>
    </div>
  )
}

function Reports({ enterprise }) {
  const { currentOrg, can } = useAuth()
  const r = useWatch('/reports')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function create() {
    setBusy(true)
    setError(null)
    try {
      await watchCall(currentOrg.id, '/reports', 'POST', {})
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  async function save(rep, format) {
    try {
      await download(`/api/v1/orgs/${currentOrg.id}/watch/reports/${rep.id}?format=${format}`, `watch-report-${rep.period_start.slice(0, 10)}.${format}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Watch reports" /></Card>
  return (
    <Card flush title="Health reports" description="A weekly report every Monday for the week before, emailed to the recipients in settings. Enterprise writes one for the last 7 days on demand. HTML prints to PDF."
      actions={enterprise && can('reports:create') && <Button size="sm" onClick={create} disabled={busy}>{busy ? 'Writing' : 'New report'}</Button>}>
      {error && <div className="px-5 pb-3"><Alert>{error}</Alert></div>}
      <DataTable rows={r.data?.reports} loading={!r.data} rowKey={(x) => x.id}
        empty={<EmptyState compact title="No reports yet">The first weekly report comes on Monday.</EmptyState>}
        columns={[
          { key: 't', header: 'Report', cell: (x) => <span className="text-fg">{x.title}</span> },
          { key: 'k', header: 'Kind', hide: 'sm', cell: (x) => <Badge tone={x.kind === 'weekly' ? 'accent' : 'staff'}>{x.kind === 'on_demand' ? 'on demand' : x.kind}</Badge> },
          { key: 's', header: 'Summary', hide: 'lg', cell: (x) => <span className="text-xs text-fg-3">{x.summary?.monitors} monitors, {Object.values(x.summary?.violations || {}).reduce((a, b) => a + b, 0)} episodes, {credits(x.summary?.charged_millicredits)} credits</span> },
          { key: 'd', header: 'Download', align: 'right', cell: (x) => (
            <span className="flex justify-end gap-1">{['html', 'md', 'json'].map((f) => <Button key={f} size="sm" variant="ghost" onClick={() => save(x, f)}><Download size={13} aria-hidden /> {f}</Button>)}</span>
          ) },
        ]} />
    </Card>
  )
}

const SEVERITY_OPTIONS = SEVERITIES.slice().reverse().map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))
const HOURS = [{ value: '', label: 'Off' }, ...Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))]

function Settings() {
  const { currentOrg, can } = useAuth()
  const r = useWatch('/settings')
  const bill = useWatch(can('billing:read') ? '/billing' : null)
  const alerts = useAlerts(currentOrg.id)
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    if (!r.data) return
    const s = r.data
    setForm({ min_severity: s.min_severity, quiet_start: s.quiet_start ?? '', quiet_end: s.quiet_end ?? '', timezone: s.timezone, weekly_reports: s.weekly_reports,
      report_recipients: (s.report_recipients || []).join(', ') })
  }, [r.data])
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Watch settings" /></Card>
  if (!form) return <PageSkeleton cards={1} />
  const editable = can('watch:configure')
  async function save(e) {
    e.preventDefault()
    setMsg(null)
    const quiet = form.quiet_start !== '' && form.quiet_end !== ''
    try {
      await watchCall(currentOrg.id, '/settings', 'PUT', {
        min_severity: form.min_severity, timezone: form.timezone, weekly_reports: form.weekly_reports,
        quiet_start: quiet ? Number(form.quiet_start) : null, quiet_end: quiet ? Number(form.quiet_end) : null,
        report_recipients: form.report_recipients.split(',').map((x) => x.trim()).filter(Boolean),
      })
      setMsg({ tone: 'info', text: 'Saved.' })
      r.reload()
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }
  return (
    <div className="grid gap-4">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Card title="Alerts and reports" description="Critical and high episodes alert at once; medium and low go to the daily digest. During quiet hours everything below critical waits for the digest. Channels are set in alert settings.">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <SelectField id="ws-min" label="Minimum severity" value={form.min_severity} disabled={!editable} onChange={(e) => setForm({ ...form, min_severity: e.target.value })} options={SEVERITY_OPTIONS} />
          <Field id="ws-tz" label="Time zone" value={form.timezone} disabled={!editable} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="UTC or Europe/Berlin" />
          <SelectField id="ws-qs" label="Quiet from" value={String(form.quiet_start)} disabled={!editable} onChange={(e) => setForm({ ...form, quiet_start: e.target.value })} options={HOURS} />
          <SelectField id="ws-qe" label="Quiet until" value={String(form.quiet_end)} disabled={!editable} onChange={(e) => setForm({ ...form, quiet_end: e.target.value })} options={HOURS} />
          <Field id="ws-rec" label="Report recipients" value={form.report_recipients} disabled={!editable} onChange={(e) => setForm({ ...form, report_recipients: e.target.value })}
            placeholder="security@example.com, cto@example.com" hint="Comma separated; the weekly report is emailed to them." />
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-fg-2">
            <input type="checkbox" checked={form.weekly_reports} disabled={!editable} onChange={(e) => setForm({ ...form, weekly_reports: e.target.checked })} /> Weekly reports
          </label>
          {editable && <div className="sm:col-span-2"><Button type="submit">Save</Button></div>}
        </form>
      </Card>
      <Card flush title="Recent Watch alerts" actions={<Button size="sm" variant="ghost" to="/dashboard/alerts?type=watch">All alerts</Button>}>
        {!alerts ? <div className="h-16" /> : alerts.length === 0 ? <EmptyState compact title="No Watch alerts" /> : <div className="divide-y divide-line">{alerts.map((a) => <AlertRow key={a.id} alert={a} />)}</div>}
      </Card>
      {bill.data && (
        <Card flush title="Billed protocol-days" description="The last 31 days: each monitor once a day, charged, exempt or refused.">
          <DataTable rows={bill.data.days} dense rowKey={(d) => `${d.monitor_id}:${d.day}`} empty={<EmptyState compact title="Nothing billed yet" />}
            columns={[
              { key: 'd', header: 'Day', cell: (d) => d.day.slice(0, 10) },
              { key: 'm', header: 'Monitor', cell: (d) => <Link to={monitorPath(d.monitor_id)} className="hover:underline">#{d.monitor_id}</Link> },
              { key: 'l', header: 'Level', hide: 'sm', cell: (d) => <LevelBadge level={d.level} /> },
              { key: 'c', header: 'Credits', align: 'right', cell: (d) => <span className="tnum">{credits(d.millicredits)}</span> },
              { key: 'o', header: 'Outcome', align: 'right', cell: (d) => <Badge tone={d.outcome === 'charged' ? 'good' : d.outcome === 'refused' ? 'danger' : 'neutral'}>{d.outcome}</Badge> },
            ]} />
        </Card>
      )}
    </div>
  )
}

function useAlerts(orgId) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let live = true
    api(`/api/v1/orgs/${orgId}/alerts?type=watch&limit=10`).then((d) => live && setRows(d.alerts), () => live && setRows([]))
    return () => { live = false }
  }, [orgId])
  return rows
}

export default function Watch() {
  const [params] = useSearchParams()
  const { access, lite, pro, enterprise, error, status, reload } = useWatchAccess()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview'
  if (error && !access) return <div><PageHeader title="Watch" /><Card><WatchError status={status} error={error} onRetry={reload} /></Card></div>
  if (!access) return <PageSkeleton cards={3} />
  return (
    <EngineLayout name="Watch" icon={Radar} sections={WATCH_SECTIONS} status={<WatchAccessBadge access={access} />}
      description="Live protocols checked at every block: the state that matters is read, every invariant verified, and a break raises an alert with the state before and after, the diff and the transaction behind it.">
      {!lite ? <Card><WatchLocked what="Watch" /></Card> : (
        <div className="grid gap-4">
          {tab === 'overview' && <Overview access={access} />}
          {tab === 'add' && <AddProtocol access={access} reloadAccess={reload} />}
          {tab === 'violations' && <Violations />}
          {tab === 'risks' && <Risks pro={pro} />}
          {tab === 'checks' && <Checks access={access} />}
          {tab === 'reports' && <Reports enterprise={enterprise} />}
          {tab === 'settings' && <Settings />}
        </div>
      )}
    </EngineLayout>
  )
}
