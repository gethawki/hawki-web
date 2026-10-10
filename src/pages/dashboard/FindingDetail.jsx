import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { FINDING_STATUSES } from '../../data/dashboardNav.js'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import PageHeader, { Panel } from '../../components/dashboard/PageHeader.jsx'
import { Severity } from '../../components/dashboard/ScanBits.jsx'

function Code({ children }) {
  return <pre className="overflow-x-auto rounded-lg border border-panel-border bg-ink px-4 py-3 font-mono text-xs leading-relaxed text-[#d9d9d9] whitespace-pre">{children}</pre>
}

export default function FindingDetail() {
  const { findingId } = useParams()
  const { currentOrg, can } = useAuth()
  const [f, setF] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api(`/api/v1/orgs/${currentOrg.id}/findings/${findingId}`)
      .then(setF)
      .catch((err) => setError(err.status === 404 ? 'This finding does not exist in this organization.' : errorMessage(err)))
  }, [currentOrg.id, findingId])

  async function setStatus(status) {
    try {
      setF(await api(`/api/v1/orgs/${currentOrg.id}/findings/${findingId}`, { method: 'PATCH', body: { status } }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error) return <div className="max-w-5xl"><Alert>{error}</Alert></div>
  if (!f) return <Spinner />
  const steps = Array.isArray(f.exploit_steps) ? f.exploit_steps : []
  return (
    <div className="max-w-5xl grid gap-6">
      <PageHeader
        title={f.title}
        description={<>
          <Link to={`/dashboard/projects/${f.project_id}`} className="text-steel hover:text-steel-light">{f.project_name}</Link>
          {' · '}<span className="font-mono">{f.file}:{f.line}</span>
        </>}
        actions={
          <div className="flex items-center gap-3">
            <Severity value={f.severity} />
            {can('findings:update') ? (
              <select aria-label="Triage status" value={f.status} onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg bg-ink border border-panel-border px-3 py-1.5 text-sm text-white outline-none focus:border-steel">
                {FINDING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            ) : (
              <span className="font-mono text-xs uppercase tracking-wider text-grey">{f.status.replace('_', ' ')}</span>
            )}
          </div>
        }
      />
      {f.explanation && <Panel title="What is wrong"><p className="text-sm text-[#cfcfcf] whitespace-pre-line">{f.explanation}</p></Panel>}
      {f.vulnerable_snippet && <Panel title="Vulnerable code"><Code>{f.vulnerable_snippet}</Code></Panel>}
      {f.impact && <Panel title="Impact"><p className="text-sm text-[#cfcfcf] whitespace-pre-line">{f.impact}</p></Panel>}
      {steps.length > 0 && (
        <Panel title="How it could be exploited">
          <ol className="grid gap-1.5 list-decimal pl-5 text-sm text-[#cfcfcf]">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Panel>
      )}
      {f.fix_snippet && <Panel title="Suggested fix"><Code>{f.fix_snippet}</Code></Panel>}
      <p className="text-xs text-grey">
        First seen in <Link to={`/dashboard/scans/${f.first_seen_scan_id}`} className="hover:text-white underline">this scan</Link>
        {f.last_seen_scan_id !== f.first_seen_scan_id && <>, last seen in <Link to={`/dashboard/scans/${f.last_seen_scan_id}`} className="hover:text-white underline">this scan</Link></>}
        {f.ai_used && ' · reported by AI analysis'}
      </p>
    </div>
  )
}
