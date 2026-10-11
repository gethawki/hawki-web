import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, download } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import { SelectField } from '../../components/common/Field.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import ReportView from '../../components/reports/ReportView.jsx'
import { formatDateTime } from './roles.js'

const DOWNLOADS = [
  { format: 'html', label: 'HTML', ext: 'html' },
  { format: 'markdown', label: 'Markdown', ext: 'md' },
  { format: 'json', label: 'JSON', ext: 'json' },
]
const SHARE_DAYS = [1, 7, 14, 30].map((d) => ({ value: String(d), label: d === 1 ? '1 day' : `${d} days` }))

// Share manages the report's public link. The link is shown once, right
// after it is made; the server keeps only its hash.
function Share({ orgId, report, onChanged }) {
  const [days, setDays] = useState('7')
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function share() {
    setBusy(true)
    setError(null)
    try {
      const d = await api(`/api/v1/orgs/${orgId}/reports/${report.id}/share`, { method: 'POST', body: { days: Number(days) } })
      setUrl(d.url)
      onChanged(d.report)
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }
  async function revoke() {
    setBusy(true)
    try {
      const d = await api(`/api/v1/orgs/${orgId}/reports/${report.id}/share`, { method: 'DELETE' })
      setUrl(null)
      onChanged(d.report)
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <Panel title="Share" className="no-print">
      <div className="grid gap-3">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-grey">
          {report.shared
            ? `Anyone with the link can read this report until ${formatDateTime(report.share_expires_at)}.`
            : 'Make a read-only link for someone outside the organization, such as an auditor. It expires on its own and can be revoked.'}
        </p>
        {url && (
          <>
            <Alert tone="info">Copy the link now. It is shown only once; sharing again makes a new link and ends this one.</Alert>
            <code className="block overflow-x-auto rounded-lg border border-panel-border bg-ink px-3 py-2 font-mono text-xs text-[#d9d9d9]">{url}</code>
          </>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <SelectField id="share-days" label="Expires after" value={days} onChange={(e) => setDays(e.target.value)} options={SHARE_DAYS} />
          <Button variant="ghost" onClick={share} busy={busy}>{report.shared ? 'Make a new link' : 'Create link'}</Button>
          {report.shared && <Button variant="danger" onClick={revoke} busy={busy}>Revoke link</Button>}
        </div>
      </div>
    </Panel>
  )
}

export default function ReportDetail() {
  const { reportId } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/v1/orgs/${currentOrg.id}/reports/${reportId}`))
    } catch (err) {
      setError(err.status === 404 ? 'This report does not exist in this organization.' : errorMessage(err))
    }
  }, [currentOrg.id, reportId])
  useEffect(() => {
    load()
  }, [load])

  async function save(d) {
    try {
      await download(`/api/v1/orgs/${currentOrg.id}/reports/${reportId}/download?format=${d.format}`,
        `hawki-report-${reportId.slice(0, 8)}.${d.ext}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  async function remove() {
    if (!window.confirm('Delete this report? Its share link stops working.')) return
    try {
      await api(`/api/v1/orgs/${currentOrg.id}/reports/${reportId}`, { method: 'DELETE' })
      navigate('/dashboard/reports')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!data) return <Spinner />
  const { report, document: doc } = data
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader
        title={doc.title}
        description={`Snapshot of the ${doc.scan.type} scan finished ${formatDateTime(doc.scan.finished_at)}. Later triage does not change it.`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            {DOWNLOADS.map((d) => <Button key={d.format} variant="ghost" onClick={() => save(d)}>{d.label}</Button>)}
            <Button variant="ghost" onClick={() => window.print()}>Print or PDF</Button>
          </div>
        }
      />
      <ReportView doc={doc} />
      {can('settings:write') && <Share orgId={currentOrg.id} report={report} onChanged={(r) => setData({ ...data, report: r })} />}
      <div className="no-print flex flex-wrap items-center gap-4 text-xs text-grey">
        <Link to="/dashboard/reports" className="hover:text-white">All reports</Link>
        {report.scan_id && <Link to={`/dashboard/scans/${report.scan_id}`} className="hover:text-white">The scan</Link>}
        <span>sha256 {report.sha256.slice(0, 16)}...</span>
        {can('settings:write') && <button type="button" onClick={remove} className="ml-auto text-copper hover:text-white">Delete report</button>}
      </div>
    </div>
  )
}
