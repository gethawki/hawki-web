import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { SeverityCounts } from '../../components/dashboard/ScanBits.jsx'
import { formatDateTime } from './roles.js'

// NewReport lists recent completed scans to freeze into a report.
function NewReport({ orgId }) {
  const navigate = useNavigate()
  const [scans, setScans] = useState(null)
  const [scanId, setScanId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    api(`/api/v1/orgs/${orgId}/scans?status=completed&limit=50`)
      .then((d) => {
        setScans(d.scans)
        if (d.scans[0]) setScanId(d.scans[0].id)
      })
      .catch(() => setScans([]))
  }, [orgId])

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const r = await api(`/api/v1/orgs/${orgId}/reports`, { method: 'POST', body: { scan_id: scanId } })
      navigate(`/dashboard/reports/${r.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (!scans) return null
  return (
    <Panel title="New report">
      {scans.length === 0 ? (
        <p className="text-sm text-grey">Reports are made from completed scans. <Link to="/dashboard/projects" className="text-steel hover:text-steel-light">Run a scan first.</Link></p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
          <SelectField id="report-scan" label="From scan" value={scanId} onChange={(e) => setScanId(e.target.value)}
            options={scans.map((s) => ({ value: s.id, label: `${s.project_name} · ${s.type} scan · ${formatDateTime(s.finished_at || s.created_at)} · ${s.summary?.total ?? 0} findings` }))} />
          <Button onClick={create} busy={busy}>Create report</Button>
        </div>
      )}
    </Panel>
  )
}

export default function Reports() {
  const { currentOrg, can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [reports, setReports] = useState(null)
  const [error, setError] = useState(null)
  const filters = { project: params.get('project') || '', from: params.get('from') || '', to: params.get('to') || '' }
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()

  const load = useCallback(async () => {
    try {
      setReports((await api(`/api/v1/orgs/${currentOrg.id}/reports${query ? `?${query}` : ''}`)).reports)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id, query])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    api(`/api/v1/orgs/${currentOrg.id}/projects`).then((d) => setProjects(d.projects)).catch(() => setProjects([]))
  }, [currentOrg.id])

  function setFilter(key, value) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    setParams(p, { replace: true })
  }

  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader title="Reports" description="Frozen snapshots of completed scans to read, download, print or share." />
      {error && <Alert>{error}</Alert>}
      {can('reports:create') && <NewReport orgId={currentOrg.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField id="report-project" label="Project" value={filters.project} onChange={(e) => setFilter('project', e.target.value)}
          options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
        <Field id="report-from" label="From" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
        <Field id="report-to" label="To" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
      </div>
      <Panel>
        {!reports ? <Spinner /> : reports.length === 0 ? (
          <p className="text-sm text-grey">{query ? 'No reports match these filters.' : 'No reports yet.'}</p>
        ) : (
          <div className="divide-y divide-panel-border">
            {reports.map((r) => (
              <Link key={r.id} to={`/dashboard/reports/${r.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 first:pt-0 last:pb-0 hover:text-white">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{r.title}{r.shared && <span className="ml-2 text-xs text-steel">shared</span>}</div>
                  <div className="text-xs text-grey">{formatDateTime(r.created_at)}{r.summary.score != null ? ` · score ${r.summary.score}` : ''}</div>
                </div>
                <SeverityCounts summary={r.summary} />
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
