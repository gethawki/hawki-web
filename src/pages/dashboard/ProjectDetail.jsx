import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { SCAN_TYPES } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { ScanRow, isActive } from '../../components/dashboard/ScanBits.jsx'

function RunScan({ orgId, project, onStarted }) {
  const [type, setType] = useState('quick')
  const [ref, setRef] = useState('')
  const [target, setTarget] = useState(project.repository_url ? 'repository' : 'contract')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const both = project.repository_url && project.contract_address

  async function run() {
    setBusy(true)
    setError(null)
    try {
      await api(`/api/v1/orgs/${orgId}/projects/${project.id}/scans`, { method: 'POST', body: { type, target, ref: target === 'repository' ? ref : '' } })
      onStarted()
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Panel title="Run a scan">
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Scan type">
          {SCAN_TYPES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={type === t.value} onClick={() => setType(t.value)}
              className={`text-left rounded-xl border px-4 py-3 transition ${type === t.value ? 'border-steel bg-steel/10' : 'border-panel-border hover:border-steel/60'}`}>
              <div className="text-sm text-white">{t.label}</div>
              <div className="text-xs text-grey mt-0.5">{t.hint}</div>
            </button>
          ))}
        </div>
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
        <div><Button onClick={run} busy={busy}>Start scan</Button></div>
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
