import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { FINDING_STATUSES, SEVERITIES } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Severity } from '../../components/dashboard/ScanBits.jsx'

const PAGE = 50
const selectCls = 'rounded-lg bg-ink border border-panel-border px-3 py-2 text-sm text-white outline-none focus:border-steel'

export default function Findings() {
  const { currentOrg } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = { project: params.get('project') || '', severity: params.get('severity') || '', status: params.get('status') || '' }
  const [projects, setProjects] = useState([])
  const [page, setPage] = useState(null)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState(null)
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()

  useEffect(() => {
    api(`/api/v1/orgs/${currentOrg.id}/projects`).then((d) => setProjects(d.projects)).catch(() => setProjects([]))
  }, [currentOrg.id])

  const load = useCallback(async () => {
    try {
      setPage(await api(`/api/v1/orgs/${currentOrg.id}/findings?${query}&limit=${PAGE}&offset=${offset}`))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [currentOrg.id, query, offset])

  useEffect(() => {
    load()
  }, [load])

  const setFilter = (k) => (e) => {
    const next = new URLSearchParams(params)
    if (e.target.value) next.set(k, e.target.value)
    else next.delete(k)
    setOffset(0)
    setParams(next, { replace: true })
  }

  return (
    <div className="max-w-6xl grid gap-6">
      <PageHeader title="Findings" description="Issues found across your projects, most severe first. Each one is tracked across scans." />
      <div className="flex flex-wrap gap-2">
        <select aria-label="Project" className={selectCls} value={filters.project} onChange={setFilter('project')}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Severity" className={selectCls} value={filters.severity} onChange={setFilter('severity')}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Status" className={selectCls} value={filters.status} onChange={setFilter('status')}>
          <option value="">Any status</option>
          {FINDING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {error && <Alert>{error}</Alert>}
      <Panel>
        {!page ? <Spinner /> : page.findings.length === 0 ? (
          <p className="text-sm text-grey">No findings match.</p>
        ) : (
          <>
            <ul className="divide-y divide-panel-border">
              {page.findings.map((f) => (
                <li key={f.id}>
                  <Link to={`/dashboard/findings/${f.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 first:pt-0 hover:text-white">
                    <Severity value={f.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{f.title}</div>
                      <div className="text-xs text-grey truncate">{f.project_name} · <span className="font-mono">{f.file}:{f.line}</span></div>
                    </div>
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-grey">{f.status.replace('_', ' ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3 text-xs text-grey">
              <span>{offset + 1} to {offset + page.findings.length} of {page.total}</span>
              {offset > 0 && <Button variant="ghost" className="py-1" onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>}
              {offset + PAGE < page.total && <Button variant="ghost" className="py-1" onClick={() => setOffset(offset + PAGE)}>Next</Button>}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
