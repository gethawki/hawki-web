import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useLiveEvent, useRefresh } from '../../lib/live.jsx'
import { ALERT_SEVERITIES, SCAN_TYPES } from '../../data/dashboardNav.js'
import { creditsLabel, paymentMessage } from '../../lib/credits.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { ScanRow, isActive } from '../../components/dashboard/ScanBits.jsx'
import ProjectHistory from '../../components/reports/ProjectHistory.jsx'

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
    <Panel title="Run a scan">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        {refused && (
          <Alert>
            {refused}{' '}
            {can('billing:read') && <Link to="/dashboard/billing" className="underline hover:text-white">See billing.</Link>}
          </Alert>
        )}
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Scan type">
          {SCAN_TYPES.map((t) => {
            const locked = t.value !== 'quick' && hasKey === false
            return (
              <button key={t.value} type="button" role="radio" aria-checked={type === t.value} disabled={locked}
                onClick={() => setType(t.value)}
                className={`text-left rounded-xl border px-4 py-3 transition disabled:opacity-45 disabled:cursor-not-allowed ${type === t.value ? 'border-steel bg-steel/10' : 'border-panel-border hover:border-steel/60'}`}>
                <div className="flex justify-between gap-2 text-sm text-white">
                  <span>{t.label}</span>
                  {costs && <span className="font-mono text-xs text-grey">{creditsLabel(costs[t.value])}</span>}
                </div>
                <div className="text-xs text-grey mt-0.5">{locked ? 'Needs your AI provider key.' : t.hint}</div>
              </button>
            )
          })}
        </div>
        {hasKey === false && (
          <p className="text-xs text-grey">
            Full and deep scans use your own model provider key.{' '}
            {can('settings:write') ? (
              <Link to="/dashboard/settings" className="text-steel hover:text-steel-light">Add one in settings.</Link>
            ) : (
              'Ask an organization admin to add one.'
            )}
          </p>
        )}
        {both && (
          <div className="flex gap-2 text-sm">
            {['repository', 'contract'].map((t) => (
              <button key={t} type="button" onClick={() => setTarget(t)}
                className={`rounded-lg border px-3 py-1.5 capitalize ${target === t ? 'border-steel text-white' : 'border-panel-border text-grey'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
        {target === 'repository' && (
          <Field id="scan-ref" label="Branch or tag" placeholder={project.default_ref || 'default branch'} value={ref} onChange={(e) => setRef(e.target.value)} />
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={run} busy={busy}>Start scan</Button>
          {balance && (
            <span className="text-xs text-grey">
              {balance.period_cap_mc === 0
                ? 'Cloud scans start on the Builder plan.'
                : `${creditsLabel(balance.total_remaining_mc)} available. Failed scans are refunded.`}
            </span>
          )}
        </div>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="schedule-frequency" label="Run" disabled={!canWrite} value={form.scan_frequency} options={FREQUENCIES}
            onChange={(e) => setForm({ ...form, scan_frequency: e.target.value })} />
          <SelectField id="schedule-type" label="Scan" disabled={!canWrite || form.scan_frequency === 'off'} value={form.scheduled_scan_type}
            options={SCAN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            onChange={(e) => setForm({ ...form, scheduled_scan_type: e.target.value })} />
        </div>
        <p className="text-xs text-grey">
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
          <p className="text-sm text-grey">No alert channels yet. <Link to="/dashboard/alerts/channels" className="text-steel hover:text-steel-light">Set one up.</Link></p>
        ) : (
          <fieldset disabled={!canWrite}>
            <legend className="text-sm text-[#cfcfcf] mb-1.5">To</legend>
            <label className="flex items-center gap-2 text-sm text-[#cfcfcf] mb-1.5">
              <input type="checkbox" checked={all} onChange={() => setPrefs({ ...prefs, channel_ids: all ? channels.map((c) => c.id) : null })} />
              Every channel of the organization
            </label>
            {!all && (
              <div className="grid gap-1.5 sm:grid-cols-2 pl-6">
                {channels.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-[#cfcfcf]">
                    <input type="checkbox" checked={prefs.channel_ids.includes(c.id)} onChange={() => toggle(c.id)} />
                    {c.name} <span className="text-grey text-xs capitalize">({c.kind})</span>
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
            {saved && <span className="text-xs text-grey">Saved.</span>}
          </div>
        )}
      </div>
    </Panel>
  )
}

export default function ProjectDetail() {
  const { projectId } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [scans, setScans] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api(`/api/v1/orgs/${currentOrg.id}/projects/${projectId}`),
        api(`/api/v1/orgs/${currentOrg.id}/scans?project=${projectId}&limit=20`),
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

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!project) return <Spinner />
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader
        title={project.name}
        description={project.repository_url || `${project.chain} ${project.contract_address}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" to={`/dashboard/findings?project=${project.id}`}>Findings</Button>
            {can('projects:delete') && <Button variant="danger" onClick={remove}>Delete</Button>}
          </div>
        }
      />
      {can('scans:create') && <RunScan orgId={currentOrg.id} project={project} onStarted={load} />}
      <Schedule key={`${project.scan_frequency}-${project.scheduled_scan_type}-${project.next_scheduled_at}`} orgId={currentOrg.id}
        project={project} canWrite={can('projects:write')} onSaved={load} />
      {can('alerts:read') && <ProjectAlerts orgId={currentOrg.id} projectId={project.id} canWrite={can('projects:write')} />}
      {can('scans:read') && <ProjectHistory orgId={currentOrg.id} projectId={project.id} />}
      <Panel title="Scans">
        {!scans ? <Spinner /> : scans.length === 0 ? (
          <p className="text-sm text-grey">No scans yet.</p>
        ) : (
          <div className="divide-y divide-panel-border">
            {scans.map((s) => <ScanRow key={s.id} scan={s} />)}
          </div>
        )}
      </Panel>
      <p className="text-xs text-grey">
        <Link to="/dashboard/projects" className="hover:text-white">All projects</Link>
      </p>
    </div>
  )
}
