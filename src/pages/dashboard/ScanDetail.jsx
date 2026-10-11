import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api, download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useRefresh } from '../../lib/live.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { ScanStatus, Severity, isActive } from '../../components/dashboard/ScanBits.jsx'

const EVIDENCE_LABELS = { export: 'Structured export (JSON)', report: 'Full scanner report (JSON)', log: 'Scanner log' }
const FILE_NAMES = { export: 'export.json', report: 'report.json', log: 'scan.log' }

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel/60 px-5 py-4">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey">{label}</div>
      <div className="mt-1.5 text-lg text-white">{value}</div>
    </div>
  )
}

export default function ScanDetail() {
  const { scanId } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const [reporting, setReporting] = useState(false)
  const [scan, setScan] = useState(null)
  const [findings, setFindings] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const s = await api(`/api/v1/orgs/${currentOrg.id}/scans/${scanId}`)
      setScan(s)
      if (s.status === 'completed') {
        setFindings((await api(`/api/v1/orgs/${currentOrg.id}/findings?scan=${scanId}&limit=200`)).findings)
      }
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

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!scan) return <Spinner />
  const sum = scan.summary || {}
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader
        title={<span className="capitalize">{scan.type} scan</span>}
        description={<>
          <Link to={`/dashboard/projects/${scan.project_id}`} className="text-steel hover:text-steel-light">{scan.project_name}</Link>
          {' · '}{scan.target.repository_url || `${scan.target.chain} ${scan.target.address}`}{scan.target.ref ? ` @ ${scan.target.ref}` : ''}
        </>}
        actions={
          <div className="flex items-center gap-3">
            {scan.status === 'completed' && can('reports:create') && <Button variant="ghost" busy={reporting} onClick={createReport}>Create report</Button>}
            <ScanStatus status={scan.status} />
          </div>
        }
      />
      {isActive(scan) && <Alert tone="info">{scan.status === 'queued' ? 'Waiting for a scan worker.' : 'Scanning. This page updates on its own.'}</Alert>}
      {scan.status === 'failed' && <Alert>{scan.error}</Alert>}
      {scan.status === 'completed' && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Findings" value={sum.total} />
          <Stat label="New" value={sum.new} />
          <Stat label="Security score" value={sum.score ?? 'n/a'} />
          <Stat label="Risk" value={sum.classification || 'n/a'} />
        </div>
      )}
      {findings && (
        <Panel title="Findings in this scan">
          {findings.length === 0 ? <p className="text-sm text-grey">Nothing found.</p> : (
            <ul className="divide-y divide-panel-border">
              {findings.map((f) => (
                <li key={f.id}>
                  <Link to={`/dashboard/findings/${f.id}`} className="flex items-center gap-3 py-3 first:pt-0 hover:text-white">
                    <Severity value={f.severity} />
                    <span className="flex-1 min-w-0 truncate text-sm text-white">{f.title}</span>
                    <span className="hidden sm:block font-mono text-xs text-grey truncate max-w-[14rem]">{f.file}:{f.line}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      {scan.evidence?.length > 0 && (
        <Panel title="Evidence">
          <ul className="grid gap-2">
            {scan.evidence.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate text-[#cfcfcf]">{EVIDENCE_LABELS[ev.kind] || ev.kind}</span>
                <span className="hidden sm:block font-mono text-xs text-grey">{(ev.size / 1024).toFixed(1)} KB · sha256 {ev.sha256.slice(0, 12)}</span>
                <button onClick={() => save(ev)} className="inline-flex items-center gap-1.5 text-steel hover:text-steel-light" aria-label={`Download ${ev.kind}`}>
                  <Download size={15} /> Download
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="text-xs text-grey">
        Requested {new Date(scan.created_at).toLocaleString()}
        {scan.finished_at && ` · finished ${new Date(scan.finished_at).toLocaleString()}`}
        {scan.scanner && ` · ${scan.scanner}`}
      </p>
    </div>
  )
}
