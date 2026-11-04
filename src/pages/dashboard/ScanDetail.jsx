import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Check, Download, FileText, Loader2, ShieldAlert } from 'lucide-react'
import { api, download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useApi } from '../../lib/useApi.js'
import { useRefresh } from '../../lib/live.jsx'
import { dateTime, num } from '../../lib/format.js'
import { scanDuration, scoreBand } from '../../lib/dashboard.js'
import { SEVERITIES } from '../../data/dashboardNav.js'
import { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import PageHeader, { KpiStrip } from '../../components/dashboard/PageHeader.jsx'
import { isActive } from '../../components/dashboard/ScanBits.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge, { FindingStatusBadge, ScanStatusBadge, SeverityBadge } from '../../components/ui/Badge.jsx'
import { Pager } from '../../components/ui/DataTable.jsx'
import { PillFilter } from '../../components/ui/Controls.jsx'
import { Expandable, ScoreRing, SummaryList, Timeline } from '../../components/ui/Viz.jsx'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'

const EVIDENCE_LABELS = { export: 'Structured export', report: 'Full scanner report', log: 'Scanner log' }
const FILE_NAMES = { export: 'export.json', report: 'report.json', log: 'scan.log' }
const PAGE = 10
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'pending')

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

function Code({ label, code, tone }) {
  if (!code) return null
  return (
    <div className="min-w-0">
      <div className={`mb-1 text-[0.7rem] font-semibold uppercase tracking-wider ${tone === 'fix' ? 'text-ok' : 'text-bad'}`}>{label}</div>
      <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-app p-3 font-mono text-[0.72rem] leading-relaxed text-fg-2 scrollbar-thin"><code>{code}</code></pre>
    </div>
  )
}

// ScanFindings is the reference's vulnerability list: severity pills with
// counts, then one row per finding that opens to its explanation, impact,
// the vulnerable code and the fix.
function ScanFindings({ orgId, scanId, by }) {
  const [sev, setSev] = useState('')
  const [offset, setOffset] = useState(0)
  const { data, stale } = useApi(`/api/v1/orgs/${orgId}/findings?scan=${scanId}&limit=${PAGE}&offset=${offset}${sev ? `&severity=${sev}` : ''}`)
  const total = SEVERITIES.reduce((a, s) => a + (by[s] || 0), 0)
  return (
    <Card title="Vulnerabilities" description="Open a row for the explanation, the code and the fix" icon={ShieldAlert}>
      <div className="mb-3">
        <PillFilter label="Severity" value={sev} onChange={(v) => { setSev(v); setOffset(0) }}
          options={[{ value: '', label: 'All', count: total }, ...SEVERITIES.filter((s) => by[s]).map((s) => ({ value: s, label: s, count: by[s], color: `var(--color-sev-${s.toLowerCase()})` }))]} />
      </div>
      <div className={`transition-opacity ${stale ? 'opacity-60' : ''}`}>
        {!data ? <div className="h-40" /> : (
          <Expandable empty={<EmptyState compact title="Nothing found">No findings at this severity.</EmptyState>}
            items={data.findings.map((f) => ({
              key: f.id,
              icon: <AlertTriangle size={16} style={{ color: `var(--color-sev-${(f.severity || 'info').toLowerCase()})` }} />,
              title: <Link to={`/dashboard/findings/${f.id}`} className="hover:underline">{f.title}</Link>,
              badge: <><SeverityBadge value={f.severity} /><FindingStatusBadge status={f.status} /></>,
              sub: f.explanation || `${f.file}${f.line ? `:${f.line}` : ''}`,
              meta: f.line ? `Line ${f.line}` : f.file ? f.file.split('/').pop() : null,
              body: (
                <div className="grid gap-3">
                  <div className="font-mono text-xs text-fg-3">{f.file}{f.line ? `:${f.line}` : ''}</div>
                  {f.explanation && <p>{f.explanation}</p>}
                  {f.impact && <p><span className="font-medium text-fg">Impact. </span>{f.impact}</p>}
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <Code label="Vulnerable code" code={f.vulnerable_snippet} />
                    <Code label="Suggested fix" code={f.fix_snippet} tone="fix" />
                  </div>
                  <Link to={`/dashboard/findings/${f.id}`} className="w-fit text-xs text-accent hover:underline">Open the finding to triage it</Link>
                </div>
              ),
            }))} />
        )}
      </div>
      {data && data.total > PAGE && (
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-xs text-fg-3">
          <Pager offset={offset} limit={PAGE} total={data.total} count={data.findings.length} onChange={setOffset} />
        </div>
      )}
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
      {scan.status === 'completed' && (
        <div className="mb-4 grid gap-4">
          <KpiStrip items={[
            { label: 'Findings', value: num(sum.total), note: `${num(sum.new)} new in this scan` },
            { label: 'Critical', value: num(counts.critical), tone: counts.critical ? 'bad' : undefined },
            { label: 'High', value: num(counts.high), tone: counts.high ? 'bad' : undefined },
            { label: 'Scanner score', value: sum.score != null ? `${sum.score} / 100` : '-', note: sum.score != null ? scoreBand(sum.score)[0] : 'not reported' },
            { label: 'Duration', value: scanDuration(scan), note: scan.scanner || 'hawki' },
          ]} />
          <section className="app-card grid grid-cols-1 divide-y divide-line rounded-2xl border border-line md:grid-cols-2 md:divide-y-0 xl:grid-cols-[1.3fr_auto_1fr_1fr] xl:divide-x">
            <div className="grid content-start gap-2 p-5">
              <div className="flex flex-wrap items-center gap-2"><span className="truncate text-lg font-semibold text-fg">{scan.project_name}</span><ScanStatusBadge status={scan.status} /></div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-fg-3">Target</dt><dd className="truncate text-fg" title={target}>{target}</dd>
                {scan.target.ref && <><dt className="text-fg-3">Ref</dt><dd className="text-fg">{scan.target.ref}</dd></>}
                <dt className="text-fg-3">Type</dt><dd className="capitalize text-fg">{scan.type}</dd>
                <dt className="text-fg-3">Scanner</dt><dd className="text-fg">{scan.scanner || 'hawki'}</dd>
              </dl>
            </div>
            <div className="grid place-items-center p-5"><ScoreRing value={sum.score ?? null} label="Scanner score" /></div>
            <div className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-fg">Risk summary</h3>
              <SummaryList items={[['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([k, l]) => ({ label: `${l} risk`, value: num(counts[k]), color: `var(--color-sev-${k})` }))
                .concat([{ label: 'Informational', value: num(by.Info || 0), color: 'var(--color-sev-info)' }])} />
            </div>
            <div className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-fg">Scan timeline</h3>
              <Timeline items={[
                { key: 'r', title: 'Requested', at: time(scan.created_at), done: true },
                { key: 's', title: 'Analysis started', at: time(scan.started_at), done: Boolean(scan.started_at) },
                { key: 'f', title: 'Results imported', at: time(scan.finished_at), done: Boolean(scan.finished_at), tone: 'good' },
              ]} />
            </div>
          </section>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          {isActive(scan) && <Progress scan={scan} />}
          {scan.status === 'failed' && <ErrorState>{scan.error || 'The scan failed.'} Failed scans are refunded.</ErrorState>}
          {scan.status === 'completed' && <ScanFindings orgId={currentOrg.id} scanId={scanId} by={by} />}
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
