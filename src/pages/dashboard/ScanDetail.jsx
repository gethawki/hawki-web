import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Download, FileText, Loader2 } from 'lucide-react'
import { api, download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { dateTime, num } from '../../lib/format.js'
import { scanDuration, scoreBand } from '../../lib/dashboard.js'
import { SEVERITIES } from '../../data/dashboardNav.js'
import { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import { isActive } from '../../components/dashboard/ScanBits.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import StatCard from '../../components/ui/Stat.jsx'
import Badge, { FindingStatusBadge, ScanStatusBadge, SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable, { Pager } from '../../components/ui/DataTable.jsx'
import { Segmented } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { SeverityBar } from '../../components/charts/Small.jsx'

const EVIDENCE_LABELS = { export: 'Structured export', report: 'Full scanner report', log: 'Scanner log' }
const FILE_NAMES = { export: 'export.json', report: 'report.json', log: 'scan.log' }
const PAGE = 25

// Progress shows where a scan is: requested, picked up by a worker, done.
function Progress({ scan }) {
  const steps = [
    { label: 'Requested', at: scan.created_at, done: true },
    { label: 'Scanning', at: scan.started_at, done: Boolean(scan.started_at), current: scan.status === 'running' },
    { label: 'Results imported', at: scan.finished_at, done: scan.status === 'completed' },
  ]
  return (
    <Card title={scan.status === 'queued' ? 'Waiting for a scan worker' : 'Scanning'} description="This page updates on its own.">
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${s.done ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line-strong text-fg-3'}`}>
              {s.current ? <Loader2 size={13} className="animate-spin" /> : s.done ? <Check size={13} /> : null}
            </span>
            <span>
              <span className={`block text-sm ${s.done ? 'text-fg' : 'text-fg-3'}`}>{s.label}</span>
              <span className="block text-xs text-fg-3">{s.at ? dateTime(s.at) : 'Pending'}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function ScanFindings({ orgId, scanId }) {
  const [sev, setSev] = useState('')
  const [offset, setOffset] = useState(0)
  const { data, loading, stale } = useApi(`/api/v1/orgs/${orgId}/findings?scan=${scanId}&limit=${PAGE}&offset=${offset}${sev ? `&severity=${sev}` : ''}`)
  return (
    <Card title="Findings in this scan" flush
      actions={<Segmented label="Severity" value={sev} onChange={(v) => { setSev(v); setOffset(0) }}
        options={[{ value: '', label: 'All' }, ...SEVERITIES.filter((s) => s !== 'Info').map((s) => ({ value: s, label: s }))]} />}>
      <DataTable rows={data?.findings} loading={loading} stale={stale} rowHref={(f) => `/dashboard/findings/${f.id}`} dense
        empty={<EmptyState compact title="Nothing found">No findings at this severity.</EmptyState>}
        columns={[
          { key: 'sev', header: 'Severity', className: 'w-28', cell: (f) => <SeverityBadge value={f.severity} /> },
          {
            key: 'title', header: 'Finding', cell: (f) => (
              <div className="min-w-0 max-w-[30rem]">
                <Link to={`/dashboard/findings/${f.id}`} className="block truncate text-fg hover:underline">{f.title}</Link>
                <div className="truncate font-mono text-xs text-fg-3">{f.file}{f.line ? `:${f.line}` : ''}</div>
              </div>
            ),
          },
          { key: 'status', header: 'Status', hide: 'md', cell: (f) => <FindingStatusBadge status={f.status} /> },
        ]}
        footer={data && data.total > PAGE && <Pager offset={offset} limit={PAGE} total={data.total} count={data.findings.length} onChange={setOffset} />} />
    </Card>
  )
}

export default function ScanDetail() {
  const { scanId } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const [reporting, setReporting] = useState(false)
  const [scan, setScan] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setScan(await api(`/api/v1/orgs/${currentOrg.id}/scans/${scanId}`))
    } catch (err) {
      setError(err.status === 404 ? 'This scan does not exist in this organization.' : errorMessage(err))
    }
  }, [currentOrg.id, scanId])

  useEffect(() => {
    load()
  }, [load])
  useRefresh(['scan.updated'], load, { poll: Boolean(scan && isActive(scan)), filter: (m) => m.data?.id === scanId })

  async function createReport() {
    setReporting(true)
    try {
      const r = await api(`/api/v1/orgs/${currentOrg.id}/reports`, { method: 'POST', body: { scan_id: scanId } })
      navigate(`/dashboard/reports/${r.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setReporting(false)
    }
  }

  async function save(ev) {
    try {
      await download(`/api/v1/orgs/${currentOrg.id}/scans/${scanId}/evidence/${ev.id}`, `hawki-${scanId.slice(0, 8)}-${FILE_NAMES[ev.kind] || ev.kind}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error && !scan) return <ErrorState>{error}</ErrorState>
  if (!scan) return <PageSkeleton />
  const sum = scan.summary || {}
  const by = sum.by_severity || {}
  const counts = { critical: by.Critical || 0, high: by.High || 0, medium: by.Medium || 0, low: by.Low || 0 }
  const target = scan.target.repository_url || `${scan.target.chain} ${scan.target.address}`
  const title = `${scan.project_name} · ${scan.type.charAt(0).toUpperCase()}${scan.type.slice(1)} scan`

  return (
    <div>
      <PageHeader
        back={{ to: '/dashboard/scans', label: 'Scans' }}
        title={title}
        meta={
          <>
            <ScanStatusBadge status={scan.status} />
            <span className="truncate">{target}{scan.target.ref ? ` @ ${scan.target.ref}` : ''}</span>
            {scan.requested_by === 'schedule' && <Badge tone="accent">Scheduled</Badge>}
          </>
        }
        actions={scan.status === 'completed' && can('reports:create') && (
          <Button size="sm" busy={reporting} onClick={createReport}><FileText size={14} /> Create report</Button>
        )}
      />
      {error && <div className="mb-4"><ErrorState>{error}</ErrorState></div>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          {isActive(scan) && <Progress scan={scan} />}
          {scan.status === 'failed' && <ErrorState>{scan.error || 'The scan failed.'} Failed scans are refunded.</ErrorState>}
          {scan.status === 'completed' && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Findings" value={num(sum.total)} sub={`${num(sum.new)} new in this scan`} />
                <StatCard label="Critical and high" value={num(counts.critical + counts.high)} tone={counts.critical ? 'danger' : undefined} sub={`${num(counts.critical)} critical`} />
                <StatCard label="Scanner score" value={sum.score ?? '-'} sub={sum.score != null ? scoreBand(sum.score)[0] : 'Not reported'} />
                <StatCard label="Duration" value={scanDuration(scan)} sub={scan.scanner || 'hawki'} />
              </div>
              <Card title="Severity distribution"><SeverityBar counts={counts} height={10} /></Card>
              <ScanFindings orgId={currentOrg.id} scanId={scanId} />
            </>
          )}
        </div>

        <div className="grid gap-4">
          <Card title="Details">
            <DefinitionList columns={1} items={[
              ['Project', <Link key="p" to={`/dashboard/projects/${scan.project_id}`} className="text-accent hover:underline">{scan.project_name}</Link>],
              ['Target', <span key="t" className="break-all">{target}</span>],
              scan.target.ref && ['Branch or tag', scan.target.ref],
              ['Type', <span key="ty" className="capitalize">{scan.type}</span>],
              ['Requested', dateTime(scan.created_at)],
              scan.started_at && ['Started', dateTime(scan.started_at)],
              scan.finished_at && ['Finished', dateTime(scan.finished_at)],
              scan.scanner && ['Scanner', scan.scanner],
              scan.worker && ['Worker', <span key="w" className="font-mono text-xs">{scan.worker}</span>],
            ]} />
          </Card>
          {scan.evidence?.length > 0 && (
            <Card title="Evidence" description="Stored in the evidence vault with a SHA-256 checksum." flush>
              <ul className="divide-y divide-line border-t border-line">
                {scan.evidence.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-fg">{EVIDENCE_LABELS[ev.kind] || ev.kind}</div>
                      <div className="truncate font-mono text-[0.7rem] text-fg-3">{(ev.size / 1024).toFixed(1)} KB · {ev.sha256.slice(0, 16)}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => save(ev)} aria-label={`Download ${ev.kind}`}><Download size={14} /></Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
