import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GitBranch, ScanLine, Trash2 } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useLiveEvent, useRefresh } from '../../lib/live.jsx'
import { ALERT_SEVERITIES, SCAN_TYPES } from '../../data/dashboardNav.js'
import { creditsLabel, paymentMessage } from '../../lib/credits.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { SeverityCounts, isActive } from '../../components/dashboard/ScanBits.jsx'
import Card, { CardLink } from '../../components/ui/Card.jsx'
import Badge, { ScanStatusBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { ButtonTabs } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { SeverityBar } from '../../components/charts/Small.jsx'
import { useApi } from '../../lib/useApi.js'
import { ago, num } from '../../lib/format.js'
import { postureScore, projectSource, scanDuration, scoreBand } from '../../lib/dashboard.js'
import ProjectHistory from '../../components/reports/ProjectHistory.jsx'
import ProjectIntel from '../../components/intel/ProjectIntel.jsx'
import ProjectHunt from '../../components/hunt/ProjectHunt.jsx'
import ProjectWatch from '../../components/watch/ProjectWatch.jsx'
import ProjectMev from '../../components/mev/ProjectMev.jsx'

function RunScan({ orgId, project, onStarted }) {
  const { can } = useAuth()
  const [type, setType] = useState('quick')
  const [hasKey, setHasKey] = useState(null)
  const [costs, setCosts] = useState(null)
  const [balance, setBalance] = useState(null)
  const [refused, setRefused] = useState(null)
  const canBill = can('billing:read')
  const loadBalance = useCallback(() => {
    if (!canBill) return
    api(`/api/v1/orgs/${orgId}/billing`).then(setBalance).catch(() => setBalance(null))
  }, [orgId, canBill])
  useEffect(() => {
    api(`/api/v1/orgs/${orgId}/llm-key`).then((d) => setHasKey(d.llm_key.configured)).catch(() => setHasKey(false))
    api('/api/v1/plans', { auth: false }).then((d) => setCosts(d.scan_costs_mc)).catch(() => setCosts(null))
    loadBalance()
  }, [orgId, loadBalance])
  useLiveEvent(['billing.updated'], loadBalance)
  const [ref, setRef] = useState('')
  const [target, setTarget] = useState(project.repository_url ? 'repository' : 'contract')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const both = project.repository_url && project.contract_address

  async function run() {
    setBusy(true)
    setError(null)
    setRefused(null)
    try {
      await api(`/api/v1/orgs/${orgId}/projects/${project.id}/scans`, { method: 'POST', body: { type, target, ref: target === 'repository' ? ref : '' } })
      onStarted()
      loadBalance()
    } catch (err) {
      if (err.status === 402) setRefused(paymentMessage(err) || errorMessage(err))
      else setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Panel title="Run a scan" description="Scans this project with the open-source engine.">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        {refused && (
          <Alert>
            {refused}{' '}
            {can('billing:read') && <Link to="/dashboard/billing" className="underline hover:text-fg">See billing.</Link>}
          </Alert>
        )}
        <div className="grid gap-2" role="radiogroup" aria-label="Scan type">
          {SCAN_TYPES.map((t) => {
            const locked = t.value !== 'quick' && hasKey === false
            return (
              <button key={t.value} type="button" role="radio" aria-checked={type === t.value} disabled={locked}
                onClick={() => setType(t.value)}
                className={`text-left rounded-lg border px-3 py-2.5 transition disabled:opacity-45 disabled:cursor-not-allowed ${type === t.value ? 'border-accent/70 bg-accent/10' : 'border-line hover:border-line-strong'}`}>
                <div className="flex justify-between gap-2 text-sm font-medium text-fg">
                  <span>{t.label}</span>
                  {costs && <span className="text-xs font-normal text-fg-3 tnum">{balance?.exempt ? 'Free' : creditsLabel(costs[t.value])}</span>}
                </div>
                <div className="text-xs text-fg-3 mt-0.5">{locked ? 'Needs your AI provider key.' : t.hint}</div>
              </button>
            )
          })}
        </div>
        {hasKey === false && (
          <p className="text-xs text-fg-3">
            Full and deep scans use your own model provider key.{' '}
            {can('settings:write') ? (
              <Link to="/dashboard/settings" className="text-accent hover:underline">Add one in settings.</Link>
            ) : (
              'Ask an organization admin to add one.'
            )}
          </p>
        )}
        {both && (
          <div className="flex gap-2 text-sm">
            {['repository', 'contract'].map((t) => (
              <button key={t} type="button" onClick={() => setTarget(t)}
                className={`rounded-lg border px-3 py-1.5 capitalize ${target === t ? 'border-accent/70 text-fg' : 'border-line text-fg-3'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
        {target === 'repository' && (
          <Field id="scan-ref" label="Branch or tag" placeholder={project.default_ref || 'default branch'} value={ref} onChange={(e) => setRef(e.target.value)} />
        )}
        <Button onClick={run} busy={busy} className="w-full">Start scan</Button>
        {balance && (
          <p className="text-xs text-fg-3">
            {balance.exempt
              ? 'This organization is exempt from billing, so scans are free.'
              : balance.period_cap_mc === 0
                ? 'Cloud scans start on the Builder plan.'
                : `${creditsLabel(balance.total_remaining_mc)} available. Failed scans are refunded.`}
          </p>
        )}
      </div>
    </Panel>
  )
}

const FREQUENCIES = [
  { value: 'off', label: 'Off' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
]

// Schedule runs a scan of the project on a fixed cadence. Each run is charged
// like a manual one; a run that cannot start raises an alert.
function Schedule({ orgId, project, canWrite, onSaved }) {
  const [form, setForm] = useState({ scan_frequency: project.scan_frequency, scheduled_scan_type: project.scheduled_scan_type || 'quick' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const changed = form.scan_frequency !== project.scan_frequency || form.scheduled_scan_type !== project.scheduled_scan_type

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await api(`/api/v1/orgs/${orgId}/projects/${project.id}`, { method: 'PATCH', body: form })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Panel title="Scheduled scans">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField id="schedule-frequency" label="Run" disabled={!canWrite} value={form.scan_frequency} options={FREQUENCIES}
            onChange={(e) => setForm({ ...form, scan_frequency: e.target.value })} />
          <SelectField id="schedule-type" label="Scan" disabled={!canWrite || form.scan_frequency === 'off'} value={form.scheduled_scan_type}
            options={SCAN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            onChange={(e) => setForm({ ...form, scheduled_scan_type: e.target.value })} />
        </div>
        <p className="text-xs text-fg-3">
          {project.scan_frequency === 'off' || !project.next_scheduled_at
            ? 'No scheduled scans. Each run costs the same credits as starting it yourself.'
            : `Next run ${new Date(project.next_scheduled_at).toLocaleString()}. If a run cannot start, you get an alert.`}
        </p>
        {canWrite && <div><Button onClick={save} busy={busy} disabled={!changed}>Save schedule</Button></div>}
      </div>
    </Panel>
  )
}

const MUTE_FOR = [
  { value: '', label: 'Choose how long' },
  { value: String(60 * 60e3), label: '1 hour' },
  { value: String(24 * 60 * 60e3), label: '1 day' },
  { value: String(7 * 24 * 60 * 60e3), label: '1 week' },
  { value: String(30 * 24 * 60 * 60e3), label: '30 days' },
]

// ProjectAlerts narrows which channels hear about this project, from which
// severity, and mutes delivery during maintenance. The dashboard still shows
// every alert.
function ProjectAlerts({ orgId, projectId, canWrite }) {
  const [prefs, setPrefs] = useState(null)
  const [channels, setChannels] = useState([])
  const [mute, setMute] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api(`/api/v1/orgs/${orgId}/projects/${projectId}/alerts`).then(setPrefs).catch((err) => setError(errorMessage(err)))
    api(`/api/v1/orgs/${orgId}/alert-channels`).then((d) => setChannels(d.channels)).catch(() => setChannels([]))
  }, [orgId, projectId])

  async function save(next) {
    setBusy(true)
    setSaved(false)
    setError(null)
    try {
      setPrefs(await api(`/api/v1/orgs/${orgId}/projects/${projectId}/alerts`, { method: 'PUT', body: next }))
      setSaved(true)
      setMute('')
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  if (!prefs) return error ? <Panel title="Alerts"><Alert>{error}</Alert></Panel> : null
  const all = prefs.channel_ids == null
  const muted = prefs.muted_until && new Date(prefs.muted_until) > new Date()
  const toggle = (id) => {
    const ids = all ? channels.map((c) => c.id) : prefs.channel_ids
    setPrefs({ ...prefs, channel_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
  }
  return (
    <Panel title="Alerts">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        {muted && <Alert tone="info">Delivery is muted until {new Date(prefs.muted_until).toLocaleString()}. Alerts still show in the dashboard.</Alert>}
        <SelectField id="project-alert-severity" label="Send alerts from" disabled={!canWrite} value={prefs.min_severity}
          onChange={(e) => setPrefs({ ...prefs, min_severity: e.target.value })}
          options={ALERT_SEVERITIES.map((s) => ({ value: s.value, label: `${s.label} and above` }))} />
        {channels.length === 0 ? (
          <p className="text-sm text-fg-3">No alert channels yet. <Link to="/dashboard/alerts/channels" className="text-accent hover:underline">Set one up.</Link></p>
        ) : (
          <fieldset disabled={!canWrite}>
            <legend className="text-sm text-fg-2 mb-1.5">To</legend>
            <label className="flex items-center gap-2 text-sm text-fg-2 mb-1.5">
              <input type="checkbox" checked={all} onChange={() => setPrefs({ ...prefs, channel_ids: all ? channels.map((c) => c.id) : null })} />
              Every channel of the organization
            </label>
            {!all && (
              <div className="grid gap-1.5 sm:grid-cols-2 pl-6">
                {channels.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-fg-2">
                    <input type="checkbox" checked={prefs.channel_ids.includes(c.id)} onChange={() => toggle(c.id)} />
                    {c.name} <span className="text-fg-3 text-xs capitalize">({c.kind})</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}
        {canWrite && (
          <div className="flex flex-wrap items-end gap-3">
            <Button busy={busy} onClick={() => save({ min_severity: prefs.min_severity, channel_ids: prefs.channel_ids, muted_until: prefs.muted_until })}>Save</Button>
            {muted ? (
              <Button variant="ghost" onClick={() => save({ ...prefs, muted_until: null })}>Unmute</Button>
            ) : (
              <>
                <SelectField id="project-mute" label="Mute delivery for" value={mute} onChange={(e) => setMute(e.target.value)} options={MUTE_FOR} />
                <Button variant="ghost" disabled={!mute}
                  onClick={() => save({ ...prefs, muted_until: new Date(Date.now() + Number(mute)).toISOString() })}>Mute</Button>
              </>
            )}
            {saved && <span className="text-xs text-fg-3">Saved.</span>}
          </div>
        )}
      </div>
    </Panel>
  )
}

function OpenFindings({ orgId, projectId }) {
  const base = `/api/v1/orgs/${orgId}/findings?project=${projectId}&limit=1&facets=1`
  const fresh = useApi(`${base}&status=new`)
  const ack = useApi(`${base}&status=acknowledged`)
  useRefresh(['finding.updated', 'scan.updated'], () => { fresh.reload(); ack.reload() })
  if (!fresh.data || !ack.data) return <Card title="Open findings"><div className="h-24" /></Card>
  const sev = (k) => (fresh.data.facets.severity[k] || 0) + (ack.data.facets.severity[k] || 0)
  const counts = { critical: sev('Critical'), high: sev('High'), medium: sev('Medium'), low: sev('Low') }
  const open = counts.critical + counts.high + counts.medium + counts.low
  const score = postureScore(counts)
  const [band, tone] = scoreBand(score)
  return (
    <Card title="Open findings" description="New and acknowledged, excluding informational" actions={<CardLink to={`/dashboard/findings?project=${projectId}`}>All findings</CardLink>}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex gap-8">
          <div><div className="text-3xl font-semibold tracking-tight text-fg tnum">{num(open)}</div><div className="text-xs text-fg-3">open</div></div>
          <div>
            <div className="text-3xl font-semibold tracking-tight text-fg tnum">{score}</div>
            <div className="mt-0.5"><Badge tone={tone} dot>{band}</Badge></div>
          </div>
        </div>
        <SeverityBar counts={counts} height={10} />
      </div>
    </Card>
  )
}

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'scans', label: 'Scans' },
  { value: 'history', label: 'History' },
  { value: 'intel', label: 'Intel' },
  { value: 'hunt', label: 'Hunt' },
  { value: 'watch', label: 'Watch' },
  { value: 'mev', label: 'MEV' },
  { value: 'settings', label: 'Settings' },
]

export default function ProjectDetail() {
  const { projectId } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [project, setProject] = useState(null)
  // Intel needs a deployed contract to look at.
  const tabs = TABS.filter((t) => (t.value !== 'intel' || (project?.contract_address && can('intel:read'))) && (t.value !== 'hunt' || (project?.contract_address && can('hunt:read')))
    && (t.value !== 'watch' || (project?.contract_address && project?.chain && can('watch:read')))
    && (t.value !== 'mev' || (project?.contract_address && project?.chain && can('mev:read'))))
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview'
  const [scans, setScans] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api(`/api/v1/orgs/${currentOrg.id}/projects/${projectId}`),
        api(`/api/v1/orgs/${currentOrg.id}/scans?project=${projectId}&limit=50`),
      ])
      setProject(p)
      setScans(s.scans)
    } catch (err) {
      setError(err.status === 404 ? 'This project does not exist in this organization.' : errorMessage(err))
    }
  }, [currentOrg.id, projectId])

  useEffect(() => {
    load()
  }, [load])

  // Follow this project's scans.
  useRefresh(['scan.updated'], load, { poll: Boolean(scans?.some(isActive)), filter: (m) => m.data?.project_id === projectId })

  async function remove() {
    if (!window.confirm(`Delete ${project.name} with all its scans and findings?`)) return
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/projects/${projectId}`, { method: 'DELETE' })
      navigate('/dashboard/projects')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error) return <ErrorState>{error}</ErrorState>
  if (!project) return <PageSkeleton cards={3} />
  const last = scans?.[0]
  const scanTable = (rows) => (
    <DataTable rows={rows} rowHref={(s) => `/dashboard/scans/${s.id}`}
      empty={<EmptyState compact icon={ScanLine} title="No scans yet">{can('scans:create') ? 'Start one from the Run a scan panel.' : 'Scans of this project appear here.'}</EmptyState>}
      columns={[
        { key: 'status', header: 'Status', className: 'w-32', cell: (s) => <ScanStatusBadge status={s.status} /> },
        { key: 'type', header: 'Scan', cell: (s) => <Link to={`/dashboard/scans/${s.id}`} className="font-medium capitalize text-fg hover:underline">{s.type} scan{s.requested_by === 'schedule' ? <span className="font-normal normal-case text-fg-3"> · scheduled</span> : null}</Link> },
        { key: 'result', header: 'Result', hide: 'md', cell: (s) => s.status === 'completed' ? <SeverityCounts summary={s.summary} /> : s.status === 'failed' ? <span className="block max-w-xs truncate text-xs text-bad">{s.error || 'Failed'}</span> : <span className="text-xs text-fg-3">In progress</span> },
        { key: 'duration', header: 'Duration', hide: 'lg', align: 'right', cell: (s) => <span className="text-fg-2">{scanDuration(s)}</span> },
        { key: 'when', header: 'Started', align: 'right', cell: (s) => <span className="text-fg-3">{ago(s.created_at)}</span> },
      ]} />
  )
  const settings = (
    <div className="grid max-w-3xl gap-4">
      <Schedule key={`${project.scan_frequency}-${project.scheduled_scan_type}-${project.next_scheduled_at}`} orgId={currentOrg.id}
        project={project} canWrite={can('projects:write')} onSaved={load} />
      {can('alerts:read') && <ProjectAlerts orgId={currentOrg.id} projectId={project.id} canWrite={can('projects:write')} />}
      {can('projects:delete') && (
        <Panel title="Delete project" description="Removes the project with every scan, finding and piece of evidence. This cannot be undone.">
          <Button variant="danger" onClick={remove}><Trash2 size={14} /> Delete {project.name}</Button>
        </Panel>
      )}
    </div>
  )

  return (
    <div>
      <PageHeader
        back={{ to: '/dashboard/projects', label: 'Projects' }}
        title={project.name}
        meta={
          <>
            {project.repository_url && <a href={project.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg"><GitBranch size={13} />{projectSource(project)}{project.default_ref ? `@${project.default_ref}` : ''}</a>}
            {project.contract_address && <span className="font-mono">{project.chain} {project.contract_address}</span>}
            {project.scan_frequency !== 'off' && <Badge tone="accent">Scans {project.scan_frequency}</Badge>}
            <span>Last scanned {last ? ago(last.created_at) : 'never'}</span>
          </>
        }
        actions={<Button variant="ghost" size="sm" to={`/dashboard/findings?project=${project.id}`}>View findings</Button>}
      >
        <ButtonTabs value={tab} onChange={(v) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })}
          tabs={tabs.map((t) => (t.value === 'scans' ? { ...t, count: scans?.length } : t))} />
      </PageHeader>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            {can('findings:read') && <OpenFindings orgId={currentOrg.id} projectId={project.id} />}
            <Card title="Recent scans" actions={<button type="button" onClick={() => setParams({ tab: 'scans' }, { replace: true })} className="text-xs text-fg-2 hover:text-fg">View all</button>} flush>
              {!scans ? <div className="h-32" /> : scanTable(scans.slice(0, 5))}
            </Card>
          </div>
          <div className="grid gap-4">
            {can('scans:create') && <RunScan orgId={currentOrg.id} project={project} onStarted={load} />}
          </div>
        </div>
      )}
      {tab === 'scans' && <Card flush>{!scans ? <div className="h-32" /> : scanTable(scans)}</Card>}
      {tab === 'history' && can('scans:read') && <ProjectHistory orgId={currentOrg.id} projectId={project.id} />}
      {tab === 'intel' && <ProjectIntel chain={project.chain} address={project.contract_address} />}
      {tab === 'hunt' && <ProjectHunt projectId={project.id} />}
      {tab === 'watch' && <ProjectWatch project={project} />}
      {tab === 'mev' && <ProjectMev project={project} />}
      {tab === 'settings' && settings}
    </div>
  )
}
