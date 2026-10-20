import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import { SelectField } from '../../components/common/Field.jsx'
import { FileText } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSelect, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState } from '../../components/ui/Feedback.jsx'
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
        <p className="text-sm text-fg-3">Reports are made from completed scans. <Link to="/dashboard/projects" className="text-accent hover:underline">Run a scan first.</Link></p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-end">
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
    <div className="grid gap-6">
      <PageHeader title="Reports" description="Frozen snapshots of completed scans to read, download, print or share." />
      {error && <Alert>{error}</Alert>}
      {can('reports:create') && <NewReport orgId={currentOrg.id} />}
      <Toolbar>
        <FilterSelect id="report-project" label="Project" value={filters.project} onChange={(v) => setFilter('project', v)}
          options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
        <label className="inline-flex items-center gap-2 text-xs text-fg-3">From
          <input id="report-from" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-sm text-fg outline-none focus:border-accent/60" /></label>
        <label className="inline-flex items-center gap-2 text-xs text-fg-3">To
          <input id="report-to" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-sm text-fg outline-none focus:border-accent/60" /></label>
      </Toolbar>
      <Card flush>
        <DataTable rows={reports} loading={!reports} rowHref={(r) => `/dashboard/reports/${r.id}`}
          empty={<EmptyState icon={FileText} title={query ? 'No reports match' : 'No reports yet'}>{query ? 'Try other filters.' : 'Create a report from any completed scan.'}</EmptyState>}
          columns={[
            {
              key: 'title', header: 'Report', cell: (r) => (
                <div className="min-w-0">
                  <Link to={`/dashboard/reports/${r.id}`} className="font-medium text-fg hover:underline">{r.title}</Link>
                  <div className="text-xs text-fg-3">{formatDateTime(r.created_at)}</div>
                </div>
              ),
            },
            { key: 'findings', header: 'Findings', hide: 'md', cell: (r) => <SeverityCounts summary={r.summary} /> },
            { key: 'score', header: 'Score', align: 'right', hide: 'sm', cell: (r) => r.summary.score ?? '-' },
            { key: 'shared', header: 'Sharing', align: 'right', cell: (r) => r.shared ? <Badge tone="accent" dot>Shared link</Badge> : <span className="text-xs text-fg-3">Private</span> },
          ]} />
      </Card>
    </div>
  )
}
