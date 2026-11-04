import { Link, useSearchParams } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { ago } from '../../lib/format.js'
import { scanDuration } from '../../lib/dashboard.js'
import { SCAN_TYPES } from '../../data/dashboardNav.js'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { SeverityCounts, isActive } from '../../components/dashboard/ScanBits.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable, { Pager } from '../../components/ui/DataTable.jsx'
import { ScanStatusBadge } from '../../components/ui/Badge.jsx'
import { FilterSelect, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState } from '../../components/ui/Feedback.jsx'

const PAGE = 25
const STATUSES = ['queued', 'running', 'completed', 'failed', 'canceled']

export default function Scans() {
  const { currentOrg, can } = useAuth()
  const [params, setParams] = useSearchParams()
  const f = { project: params.get('project') || '', status: params.get('status') || '', type: params.get('type') || '' }
  const offset = Number(params.get('offset') || 0)
  const query = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()
  const base = `/api/v1/orgs/${currentOrg.id}`
  const { data: projects } = useApi(`${base}/projects`)
  const { data, error, loading, stale, reload } = useApi(`${base}/scans?${query}&limit=${PAGE}&offset=${offset}`)
  useRefresh(['scan.updated'], reload, { poll: Boolean(data?.scans?.some(isActive)) })

  function set(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'offset') next.delete('offset')
    setParams(next, { replace: true })
  }
  const filtered = f.project || f.status || f.type

  return (
    <div>
      <PageHeader title="Scans" description="Every cloud scan in this organization, newest first. Running scans update live."
        actions={can('scans:create') && <Button to="/dashboard/projects" size="sm">Run a scan</Button>} />
      <div className="grid gap-4">
        <Toolbar>
          <FilterSelect id="s-project" label="Project" value={f.project} onChange={(v) => set('project', v)}
            options={[{ value: '', label: 'All projects' }, ...(projects?.projects || []).map((p) => ({ value: p.id, label: p.name }))]} />
          <FilterSelect id="s-status" label="Status" value={f.status} onChange={(v) => set('status', v)}
            options={[{ value: '', label: 'Any status' }, ...STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
          <FilterSelect id="s-type" label="Type" value={f.type} onChange={(v) => set('type', v)}
            options={[{ value: '', label: 'Any type' }, ...SCAN_TYPES.map((t) => ({ value: t.value, label: t.label }))]} />
          {filtered && <button type="button" onClick={() => setParams({}, { replace: true })} className="text-xs text-fg-3 hover:text-fg">Clear filters</button>}
        </Toolbar>
        {error && <ErrorState onRetry={reload}>{error}</ErrorState>}
        <Card flush>
          <DataTable rows={data?.scans} loading={loading} stale={stale} rowHref={(s) => `/dashboard/scans/${s.id}`}
            empty={<EmptyState icon={ScanLine} title={filtered ? 'No scans match' : 'No scans yet'}>{filtered ? 'Try another filter.' : 'Start a scan from a project.'}</EmptyState>}
            columns={[
              { key: 'status', header: 'Status', className: 'w-32', cell: (s) => <ScanStatusBadge status={s.status} /> },
              {
                key: 'scan', header: 'Scan', cell: (s) => (
                  <div className="min-w-0">
                    <Link to={`/dashboard/scans/${s.id}`} className="font-medium text-fg hover:underline">{s.project_name}</Link>
                    <div className="text-xs text-fg-3">
                      <span className="capitalize">{s.type}</span> scan{s.target?.ref ? ` on ${s.target.ref}` : ''}{s.requested_by === 'schedule' ? ' · scheduled' : ''}
                    </div>
                  </div>
                ),
              },
              {
                key: 'result', header: 'Result', hide: 'md', cell: (s) => s.status === 'completed' ? <SeverityCounts summary={s.summary} />
                  : s.status === 'failed' ? <span className="block max-w-xs truncate text-xs text-bad" title={s.error}>{s.error || 'Failed'}</span>
                    : <span className="text-xs text-fg-3">{s.status === 'running' ? 'Scanning now' : 'Waiting for a worker'}</span>,
              },
              { key: 'duration', header: 'Duration', hide: 'lg', align: 'right', cell: (s) => <span className="text-fg-2">{scanDuration(s)}</span> },
              { key: 'created', header: 'Started', align: 'right', cell: (s) => <span className="text-fg-3" title={new Date(s.created_at).toLocaleString()}>{ago(s.created_at)}</span> },
            ]}
            footer={data && (offset > 0 || data.scans.length === PAGE) && <Pager offset={offset} limit={PAGE} count={data.scans.length} onChange={(o) => set('offset', String(o))} />} />
        </Card>
      </div>
    </div>
  )
}
