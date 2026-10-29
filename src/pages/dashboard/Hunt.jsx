import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Plus, Trash2 } from 'lucide-react'
import { api, download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ButtonTabs, FilterSelect, SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { AlertRow } from '../../components/dashboard/AlertBits.jsx'
import { ChainName, isAddress } from '../../components/intel/IntelKit.jsx'
import {
  BandBadge, ClusterLink, HuntAccessBadge, HuntAddress, HuntError, HuntLocked, RULES, RuleTags, STATUS_TONE, ScoreBadge,
  huntAddressPath, huntCall, newKey, useHunt, useHuntAccess,
} from '../../components/hunt/HuntKit.jsx'

const TABS = [
  { value: 'clusters', label: 'Clusters' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'requests', label: 'Investigations' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
]
const CHAINS = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon']
const chainOptions = (all) => [...(all ? [{ value: '', label: 'All chains' }] : []), ...CHAINS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))]

function ClustersTab() {
  const [chain, setChain] = useState('')
  const [status, setStatus] = useState('')
  const [min, setMin] = useState('0')
  const [address, setAddress] = useState('')
  const [q, setQ] = useState('')
  const query = new URLSearchParams(Object.entries({ chain, status, min_points: min, address: q, limit: '100' }).filter(([, v]) => v && v !== '0')).toString()
  const r = useHunt(`/clusters?${query}`)
  return (
    <Card flush title="Funding clusters" description="Contracts one funder's deployers created on a chain, once four or more fall within 24 hours. Points add up the rules their contracts fired; families tie clusters of one actor across chains.">
      <div className="px-5 pb-4"><Toolbar>
        <FilterSelect id="cl-chain" label="Chain" value={chain} onChange={setChain} options={chainOptions(true)} />
        <FilterSelect id="cl-status" label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'Standing' }, { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }, { value: 'archived', label: 'Archived' }, { value: 'retracted', label: 'Retracted' }]} />
        <FilterSelect id="cl-min" label="Points" value={min} onChange={setMin} options={[{ value: '0', label: 'Any points' }, { value: '20', label: '20 and up' },
          { value: '50', label: '50 and up' }, { value: '80', label: '80 and up' }]} />
        <SearchInput id="cl-address" label="Address" value={address} onChange={setAddress} placeholder="Member or contract 0x address"
          onSubmit={() => setQ(isAddress(address.trim()) ? address.trim() : '')} />
      </Toolbar></div>
      {r.error ? <div className="px-5 pb-5"><HuntError status={r.status} error={r.error} onRetry={r.reload} what="Funding clusters" /></div> : (
        <DataTable rows={r.data?.clusters} loading={!r.data} rowKey={(c) => c.id} rowHref={(c) => `/dashboard/hunt/clusters/${c.id}`}
          empty={<EmptyState compact title="No cluster matches">Clusters form as Hunt traces new deployments.</EmptyState>}
          columns={[
            { key: 'id', header: 'Cluster', className: 'w-24', cell: (c) => <ClusterLink code={c.id} /> },
            { key: 'p', header: 'Points', className: 'w-36', cell: (c) => <span className="flex flex-wrap items-center gap-1"><BandBadge band={c.band} points={c.points} />{c.custom_points != null && <Badge tone="staff">yours {c.custom_points}</Badge>}</span> },
            { key: 'r', header: 'Rules', cell: (c) => <RuleTags rules={c.rules} /> },
            { key: 'k', header: 'Key', hide: 'md', cell: (c) => <span className="text-xs text-fg-2"><HuntAddress chain={c.chain} address={c.key} /> {c.key_kind}</span> },
            { key: 'n', header: 'Contracts', align: 'right', hide: 'sm', cell: (c) => <span className="tnum">{c.contracts}</span> },
            { key: 'c', header: 'Chain', hide: 'md', cell: (c) => <ChainName chain={c.chain} /> },
            { key: 's', header: 'Status', hide: 'sm', cell: (c) => <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge> },
            { key: 'w', header: 'Last active', align: 'right', hide: 'lg', cell: (c) => <span className="whitespace-nowrap text-fg-3" title={dateTime(c.last_activity_at)}>{ago(c.last_activity_at)}</span> },
          ]} />
      )}
    </Card>
  )
}

function WatchlistTab({ access }) {
  const { currentOrg, can } = useAuth()
  const r = useHunt('/watchlist')
  const [form, setForm] = useState({ chain: 'base', address: '', label: '', threshold: '20' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const editable = can('hunt:watchlist')

  async function add(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await huntCall(currentOrg.id, '/watchlist', 'POST', { ...form, threshold: Number(form.threshold) })
      setForm({ ...form, address: '', label: '' })
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  async function change(entry, patch) {
    try {
      await huntCall(currentOrg.id, `/watchlist/${entry.id}`, 'PUT', { label: entry.label, threshold: entry.threshold, status: entry.status, ...patch })
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  async function remove(entry) {
    try {
      await huntCall(currentOrg.id, `/watchlist/${entry.id}`, 'DELETE')
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (r.error) return <Card><HuntError status={r.status} error={r.error} onRetry={r.reload} what="The watchlist" /></Card>
  const list = r.data?.watchlist
  return (
    <div className="grid gap-4">
      {editable && (
        <Card title="Watch an address" description={`Hunt alerts you when it touches your projects or their protocols, bridges funds${access?.level === 'lite' ? ' (Hunt Pro)' : ''}, lands in a funding cluster or its Digital Immune Score moves by more than the threshold.`}>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,12rem)_6rem_auto] sm:items-end">
            <SelectField id="w-chain" label="Chain" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} options={chainOptions(false)} />
            <Field id="w-address" label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x" required />
            <Field id="w-label" label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Treasury, counterparty" />
            <Field id="w-threshold" label="Score move" type="number" min="1" max="100" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
            <Button type="submit" disabled={busy || !isAddress(form.address.trim())}><Plus size={14} aria-hidden /> Watch</Button>
          </form>
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
          {list && <p className="mt-2 text-xs text-fg-3">{list.length} of {access?.watchlist_limit} addresses</p>}
        </Card>
      )}
      <Card flush title="Watched addresses">
        <DataTable rows={list} loading={!list} rowKey={(e) => e.id}
          empty={<EmptyState compact title="Nothing watched yet">Add the deployers, treasuries and counterparties you deal with.</EmptyState>}
          columns={[
            { key: 'a', header: 'Address', cell: (e) => <HuntAddress chain={e.chain} address={e.address} label={e.label} /> },
            { key: 'c', header: 'Chain', hide: 'md', cell: (e) => <ChainName chain={e.chain} /> },
            { key: 's', header: 'Immune score', cell: (e) => <ScoreBadge score={e.immune_score} label={e.immune_label} /> },
            { key: 'cl', header: 'Clusters', hide: 'sm', cell: (e) => (e.clusters.length ? <span className="flex flex-wrap gap-1">{e.clusters.map((c) => <ClusterLink key={c} code={c} />)}</span> : <span className="text-fg-3">None</span>) },
            { key: 'b', header: 'Bridges', align: 'right', hide: 'lg', cell: (e) => <span className="tnum">{e.bridge_links}</span> },
            { key: 't', header: 'Alerts at', align: 'right', hide: 'lg', cell: (e) => <span className="tnum text-fg-2">±{e.threshold}</span> },
            { key: 'st', header: 'Status', hide: 'sm', cell: (e) => <Badge tone={e.status === 'active' ? 'good' : 'neutral'}>{e.status}</Badge> },
            ...(editable ? [{ key: 'x', header: '', align: 'right', cell: (e) => (
              <span className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => change(e, { status: e.status === 'active' ? 'inactive' : 'active' })}>{e.status === 'active' ? 'Pause' : 'Resume'}</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(e)} aria-label={`Stop watching ${e.address}`}><Trash2 size={14} /></Button>
              </span>
            ) }] : []),
          ]} />
      </Card>
    </div>
  )
}

function AlertsTab() {
  const { currentOrg } = useAuth()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let live = true
    api(`/api/v1/orgs/${currentOrg.id}/alerts?type=hunt&limit=50`).then((d) => live && setRows(d.alerts), (err) => live && setError(errorMessage(err)))
    return () => { live = false }
  }, [currentOrg.id])
  if (error) return <Card><Alert>{error}</Alert></Card>
  return (
    <Card flush title="Hunt alerts" description="Watched addresses touching your projects, bridging funds, joining clusters or moving their score, and project contracts whose deployer is in a cluster. Each alert lists its transactions and what to do."
      actions={<Button size="sm" variant="ghost" to="/dashboard/alerts">All alerts</Button>}>
      {!rows ? <div className="h-24" /> : rows.length === 0
        ? <EmptyState compact title="No Hunt alerts">Watch addresses to be alerted about them.</EmptyState>
        : <div className="divide-y divide-line">{rows.map((a) => <AlertRow key={a.id} alert={a} />)}</div>}
    </Card>
  )
}

function RequestsTab({ access }) {
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const r = useHunt('/requests')
  const [form, setForm] = useState({ kind: 'investigation', chain: 'base', address: '', depth: '3' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const pro = access?.level === 'pro' || access?.level === 'enterprise'

  async function run(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = { kind: form.kind, chain: form.chain, address: form.address.trim(), ...(form.kind === 'trace' ? { depth: Number(form.depth) } : {}) }
      const req = await huntCall(currentOrg.id, '/requests', 'POST', body, newKey())
      navigate(`/dashboard/hunt/requests/${req.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  if (r.error) return <Card><HuntError status={r.status} error={r.error} onRetry={r.reload} what="Investigations" /></Card>
  const credits = access?.credits || {}
  return (
    <div className="grid gap-4">
      {can('hunt:write') && (
        <Card title="Investigate an address" description={`An investigation (${credits.investigation} credits) gathers its scores, clusters, genesis trace, the contracts it deployed and who first funded it. A cross-chain trace (${credits.trace} credits, Hunt Pro) follows its funds back over fundings and bridges.`}>
          <form onSubmit={run} className="grid gap-3 sm:grid-cols-[10rem_8rem_minmax(0,1fr)_6rem_auto] sm:items-end">
            <SelectField id="r-kind" label="Kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
              options={[{ value: 'investigation', label: `Investigation, ${credits.investigation}` }, ...(pro ? [{ value: 'trace', label: `Fund trace, ${credits.trace}` }] : [])]} />
            <SelectField id="r-chain" label="Chain" value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })} options={chainOptions(false)} />
            <Field id="r-address" label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x" required />
            <SelectField id="r-depth" label="Hops" value={form.depth} disabled={form.kind !== 'trace'} onChange={(e) => setForm({ ...form, depth: e.target.value })}
              options={['1', '2', '3', '4', '5'].map((d) => ({ value: d, label: d }))} />
            <Button type="submit" disabled={busy || !isAddress(form.address.trim())}>{busy ? 'Running' : 'Run'}</Button>
          </form>
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        </Card>
      )}
      <Card flush title="Past requests">
        <DataTable rows={r.data?.requests} loading={!r.data} rowKey={(q) => q.id} rowHref={(q) => (q.kind === 'report' && q.report_id ? null : `/dashboard/hunt/requests/${q.id}`)}
          empty={<EmptyState compact title="No requests yet" />}
          columns={[
            { key: 'k', header: 'Kind', className: 'w-32', cell: (q) => <Badge tone={q.kind === 'trace' ? 'staff' : 'accent'}>{q.kind}</Badge> },
            { key: 'a', header: 'Address', cell: (q) => (q.address ? <HuntAddress chain={q.chain} address={q.address} /> : <span className="text-fg-3">-</span>) },
            { key: 'c', header: 'Credits', align: 'right', cell: (q) => <span className="tnum">{q.credits}</span> },
            { key: 'w', header: 'When', align: 'right', cell: (q) => <span className="whitespace-nowrap text-fg-3" title={dateTime(q.created_at)}>{ago(q.created_at)}</span> },
          ]} />
      </Card>
    </div>
  )
}

function ReportsTab({ access }) {
  const { currentOrg, can } = useAuth()
  const r = useHunt('/reports')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const pro = access?.level === 'pro' || access?.level === 'enterprise'
  async function create() {
    setBusy(true)
    setError(null)
    try {
      await huntCall(currentOrg.id, '/reports', 'POST', {}, newKey())
      r.reload()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  async function save(rep, format) {
    try {
      await download(`/api/v1/orgs/${currentOrg.id}/hunt/reports/${rep.id}?format=${format}`, `hunt-report-${rep.period_start.slice(0, 10)}.${format}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  if (r.error) return <Card><HuntError status={r.status} error={r.error} onRetry={r.reload} what="Hunt reports" /></Card>
  return (
    <Card flush title="Hunt reports" description={`A weekly report every Sunday (Hunt Pro), and custom reports of the last 7 days on request (${access?.credits?.report} credits). HTML prints to PDF.`}
      actions={pro && can('reports:create') && <Button size="sm" onClick={create} disabled={busy}>{busy ? 'Writing' : 'New custom report'}</Button>}>
      {error && <div className="px-5 pb-3"><Alert>{error}</Alert></div>}
      {!pro && <HuntLocked need="pro" what="Weekly and custom Hunt reports" compact />}
      {pro && (
        <DataTable rows={r.data?.reports} loading={!r.data} rowKey={(x) => x.id}
          empty={<EmptyState compact title="No reports yet">The first weekly report comes on Sunday.</EmptyState>}
          columns={[
            { key: 't', header: 'Report', cell: (x) => <span className="text-fg">{x.title}</span> },
            { key: 'k', header: 'Kind', hide: 'sm', cell: (x) => <Badge tone={x.kind === 'weekly' ? 'accent' : 'staff'}>{x.kind}</Badge> },
            { key: 's', header: 'Summary', hide: 'lg', cell: (x) => <span className="text-xs text-fg-3">{x.summary?.clusters_formed} clusters formed, {Object.values(x.summary?.alerts || {}).reduce((a, b) => a + b, 0)} alerts</span> },
            { key: 'd', header: 'Download', align: 'right', cell: (x) => (
              <span className="flex justify-end gap-1">{['html', 'md', 'json'].map((f) => <Button key={f} size="sm" variant="ghost" onClick={() => save(x, f)}><Download size={13} aria-hidden /> {f}</Button>)}</span>
            ) },
          ]} />
      )}
    </Card>
  )
}

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))
const HOURS = [{ value: '', label: 'Off' }, ...Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))]

function SettingsTab({ access }) {
  const { currentOrg, can } = useAuth()
  const r = useHunt('/settings')
  const [form, setForm] = useState(null)
  const [rules, setRules] = useState({})
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    if (!r.data) return
    const s = r.data
    setForm({ min_severity: s.min_severity, quiet_start: s.quiet_start ?? '', quiet_end: s.quiet_end ?? '', timezone: s.timezone, weekly_reports: s.weekly_reports,
      report_recipients: (s.report_recipients || []).join(', ') })
    setRules(s.heuristics || {})
  }, [r.data])
  if (r.error) return <Card><HuntError status={r.status} error={r.error} onRetry={r.reload} what="Hunt settings" /></Card>
  if (!form) return <PageSkeleton cards={1} />
  const editable = can('hunt:write')

  async function save(e) {
    e.preventDefault()
    setMsg(null)
    const quiet = form.quiet_start !== '' && form.quiet_end !== ''
    try {
      await huntCall(currentOrg.id, '/settings', 'PUT', {
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
  async function saveRules(e) {
    e.preventDefault()
    setMsg(null)
    // A rule left blank keeps Hunt's points.
    const chosen = Object.fromEntries(Object.entries(rules).filter(([, v]) => v.points !== '' && v.points != null))
    try {
      await huntCall(currentOrg.id, '/heuristics', 'PUT', { rules: chosen })
      setMsg({ tone: 'info', text: 'Your heuristics are saved; clusters now show your points next to Hunt\'s.' })
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }
  return (
    <div className="grid gap-4">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Card title="Alerts and reports" description="Alerts below the minimum are not raised. During quiet hours alerts below critical go to the daily digest. Channels are set in alert settings.">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <SelectField id="s-min" label="Minimum severity" value={form.min_severity} disabled={!editable} onChange={(e) => setForm({ ...form, min_severity: e.target.value })} options={SEVERITY_OPTIONS} />
          <Field id="s-tz" label="Time zone" value={form.timezone} disabled={!editable} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="UTC or Europe/Berlin" />
          <SelectField id="s-qs" label="Quiet from" value={String(form.quiet_start)} disabled={!editable} onChange={(e) => setForm({ ...form, quiet_start: e.target.value })} options={HOURS} />
          <SelectField id="s-qe" label="Quiet until" value={String(form.quiet_end)} disabled={!editable} onChange={(e) => setForm({ ...form, quiet_end: e.target.value })} options={HOURS} />
          <Field id="s-rec" label="Report recipients" value={form.report_recipients} disabled={!editable} onChange={(e) => setForm({ ...form, report_recipients: e.target.value })}
            placeholder="security@example.com, cto@example.com" hint="Comma separated; the weekly report is emailed to them." />
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-fg-2">
            <input type="checkbox" checked={form.weekly_reports} disabled={!editable} onChange={(e) => setForm({ ...form, weekly_reports: e.target.checked })} /> Weekly reports
          </label>
          {editable && <div className="sm:col-span-2"><Button type="submit">Save</Button></div>}
        </form>
      </Card>
      <Card title="Your heuristics" description="Enterprise sets its own points per rule. Clusters then show your points next to Hunt's; what Hunt detects does not change.">
        {access?.level !== 'enterprise' ? <HuntLocked need="enterprise" what="Your own heuristics" compact /> : (
          <form onSubmit={saveRules} className="grid gap-2">
            {Object.entries(RULES).map(([id, name]) => {
              const rule = rules[id] || { points: '', enabled: true }
              return (
                <div key={id} className="grid grid-cols-[3rem_minmax(0,1fr)_6rem_auto] items-center gap-3 text-sm">
                  <Badge tone="warning">{id}</Badge><span className="text-fg-2">{name}</span>
                  <input aria-label={`${id} points`} type="number" min="0" max="100" value={rule.points} placeholder="Hunt's"
                    onChange={(e) => setRules({ ...rules, [id]: { ...rule, points: e.target.value === '' ? '' : Number(e.target.value) } })}
                    className="h-8 rounded-lg border border-line bg-surface px-2 text-sm text-fg" />
                  <label className="flex items-center gap-1 text-xs text-fg-3"><input type="checkbox" checked={rule.enabled !== false}
                    onChange={(e) => setRules({ ...rules, [id]: { ...rule, enabled: e.target.checked } })} /> counts</label>
                </div>
              )
            })}
            <div><Button type="submit">Save heuristics</Button></div>
          </form>
        )}
      </Card>
    </div>
  )
}

export default function Hunt() {
  const [params, setParams] = useSearchParams()
  const { access, lite, error, status, reload } = useHuntAccess()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'clusters'
  const [jump, setJump] = useState({ chain: 'base', address: '' })
  const navigate = useNavigate()
  if (error) return <div><PageHeader title="Hunt" /><Card><HuntError status={status} error={error} onRetry={reload} /></Card></div>
  if (!access) return <PageSkeleton cards={3} />
  return (
    <div>
      <PageHeader title="Hunt" description="Who is behind a contract, how it was funded and where else they are active: funding clusters, genesis traces and Digital Immune Scores, with transaction hashes for every claim."
        meta={<HuntAccessBadge access={access} />}>
        {lite && <ButtonTabs value={tab} onChange={(v) => setParams(v === 'clusters' ? {} : { tab: v }, { replace: true })} tabs={TABS} />}
      </PageHeader>
      {!lite ? <Card><HuntLocked what="Hunt" /></Card> : (
        <div className="grid gap-4">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (isAddress(jump.address.trim())) navigate(huntAddressPath(jump.chain, jump.address.trim())) }}>
            <div className="w-36"><SelectField id="jump-chain" label="Look up on" value={jump.chain} onChange={(e) => setJump({ ...jump, chain: e.target.value })} options={chainOptions(false)} /></div>
            <div className="min-w-0 flex-1 sm:max-w-md"><Field id="jump-address" label="Wallet or contract" value={jump.address} onChange={(e) => setJump({ ...jump, address: e.target.value })} placeholder="0x" /></div>
            <Button type="submit" variant="ghost" disabled={!isAddress(jump.address.trim())}>Open</Button>
          </form>
          {tab === 'clusters' && <ClustersTab />}
          {tab === 'watchlist' && <WatchlistTab access={access} />}
          {tab === 'alerts' && <AlertsTab />}
          {tab === 'requests' && <RequestsTab access={access} />}
          {tab === 'reports' && <ReportsTab access={access} />}
          {tab === 'settings' && <SettingsTab access={access} />}
        </div>
      )}
      <p className="mt-6 text-xs text-fg-3">Hunt's Digital Immune Score is Hunt's own, shown next to Intel's risk score where both appear. <Link to="/docs" className="hover:underline">How Hunt works</Link></p>
    </div>
  )
}
