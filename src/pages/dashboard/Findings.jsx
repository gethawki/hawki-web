import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { ago, num } from '../../lib/format.js'
import { FINDING_STATUSES, SEVERITIES } from '../../data/dashboardNav.js'
import PageHeader, { KpiStrip } from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable, { Pager } from '../../components/ui/DataTable.jsx'
import { FindingStatusBadge, SEVERITY_COLOR, SeverityBadge } from '../../components/ui/Badge.jsx'
import { FilterSelect, PillFilter, SearchInput, Toolbar } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState } from '../../components/ui/Feedback.jsx'

const PAGE = 25

// SeverityFacets is the row of severity pills with how many findings each
// would show under the other filters.
function SeverityFacets({ facets, value, onChange }) {
  const total = Object.values(facets || {}).reduce((a, b) => a + b, 0)
  return (
    <PillFilter label="Severity" value={value} onChange={onChange}
      options={[{ value: '', label: 'All', count: facets ? num(total) : '-' },
        ...SEVERITIES.map((s) => ({ value: s, label: s, count: facets ? num(facets[s] || 0) : '-', color: SEVERITY_COLOR[s.toLowerCase()] }))]} />
  )
}

export default function Findings() {
  const { currentOrg } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = { project: params.get('project') || '', severity: params.get('severity') || '', status: params.get('status') || '', q: params.get('q') || '' }
  const offset = Number(params.get('offset') || 0)
  const [q, setQ] = useState(filters.q)
  useEffect(() => setQ(filters.q), [filters.q])
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  const base = `/api/v1/orgs/${currentOrg.id}`
  const { data: projects } = useApi(`${base}/projects`)
  const { data: page, error, stale, loading, reload } = useApi(`${base}/findings?${query}&limit=${PAGE}&offset=${offset}&facets=1`)
  useRefresh(['finding.updated', 'scan.updated'], reload)

  function set(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'offset') next.delete('offset')
    setParams(next, { replace: true })
  }

  const statusCounts = page?.facets?.status || {}
  const sev = page?.facets?.severity || {}
  const filtered = filters.q || filters.project || filters.status || filters.severity
  return (
    <div>
      <PageHeader title="Findings" icon={ShieldAlert} description="Every issue found across your projects, most severe first. Each finding is tracked across scans, so triage carries over."
        meta={page && <span className="tnum">{num(page.total)} {page.total === 1 ? 'finding' : 'findings'}{filtered ? ' match these filters' : ''}</span>} />
      <div className="grid grid-cols-1 gap-4">
        {page?.facets && (
          <KpiStrip items={[
            { label: 'Critical', value: num(sev.Critical || 0), tone: sev.Critical ? 'bad' : undefined },
            { label: 'High', value: num(sev.High || 0), tone: sev.High ? 'bad' : undefined },
            { label: 'Medium', value: num(sev.Medium || 0) },
            { label: 'Low', value: num(sev.Low || 0) },
            { label: 'New', value: num(statusCounts.new || 0), note: 'not triaged yet', tone: statusCounts.new ? 'warn' : undefined },
            { label: 'Resolved', value: num(statusCounts.resolved || 0), tone: 'good' },
          ]} />
        )}
        <SeverityFacets facets={page?.facets?.severity} value={filters.severity} onChange={(v) => set('severity', v)} />
        <Toolbar>
          <SearchInput className="w-full sm:w-72" value={q} onChange={setQ} onSubmit={() => set('q', q.trim())} placeholder="Search title or file" label="Search findings" />
          <FilterSelect id="f-project" label="Project" value={filters.project} onChange={(v) => set('project', v)}
            options={[{ value: '', label: 'All projects' }, ...(projects?.projects || []).map((p) => ({ value: p.id, label: p.name }))]} />
          <FilterSelect id="f-status" label="Status" value={filters.status} onChange={(v) => set('status', v)}
            options={[{ value: '', label: 'Any status' }, ...FINDING_STATUSES.map((s) => ({ value: s.value, label: `${s.label}${page ? ` (${num(statusCounts[s.value] || 0)})` : ''}` }))]} />
          {filtered && <button type="button" onClick={() => setParams({}, { replace: true })} className="text-xs text-fg-3 hover:text-fg">Clear filters</button>}
        </Toolbar>
        {error && <ErrorState onRetry={reload}>{error}</ErrorState>}
        <Card flush>
          <DataTable rows={page?.findings} loading={loading} stale={stale} rowHref={(f) => `/dashboard/findings/${f.id}`}
            empty={<EmptyState icon={ShieldCheck} title={filtered ? 'No findings match' : 'No findings yet'}>
              {filtered ? 'Try another filter or clear them.' : 'Run a scan on a project and its findings appear here.'}</EmptyState>}
            columns={[
              { key: 'sev', header: 'Severity', cell: (f) => <SeverityBadge value={f.severity} />, className: 'w-28' },
              {
                key: 'title', header: 'Finding', cell: (f) => (
                  <div className="min-w-0 max-w-[36rem]">
                    <Link to={`/dashboard/findings/${f.id}`} className="block truncate font-medium text-fg hover:underline">{f.title}</Link>
                    <div className="truncate font-mono text-xs text-fg-3">{f.file}{f.line ? `:${f.line}` : ''}</div>
                  </div>
                ),
              },
              { key: 'project', header: 'Project', hide: 'md', cell: (f) => <span className="text-fg-2">{f.project_name}</span> },
              { key: 'status', header: 'Status', cell: (f) => <FindingStatusBadge status={f.status} /> },
              { key: 'updated', header: 'Updated', hide: 'lg', align: 'right', cell: (f) => <span className="text-fg-3">{ago(f.updated_at)}</span> },
            ]}
            footer={page && page.total > 0 && <Pager offset={offset} limit={PAGE} total={page.total} count={page.findings.length} onChange={(o) => set('offset', String(o))} />} />
        </Card>
      </div>
    </div>
  )
}
