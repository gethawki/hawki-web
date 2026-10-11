import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { SCAN_TYPES } from '../../data/dashboardNav.js'
import { creditsLabel, paymentMessage } from '../../lib/credits.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { ScanRow, isActive } from '../../components/dashboard/ScanBits.jsx'

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

  // Follow scans that are still queued or running.
  useEffect(() => {
    if (!scans?.some(isActive)) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [scans, load])

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
