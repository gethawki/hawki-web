import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { dateTime } from '../../lib/format.js'
import { FINDING_STATUSES } from '../../data/dashboardNav.js'
import { errorMessage } from '../../components/common/Alert.jsx'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import Badge, { FindingStatusBadge, SeverityBadge } from '../../components/ui/Badge.jsx'
import { ErrorState, PageSkeleton } from '../../components/ui/Feedback.jsx'

// CodeCard shows source with a copy button. The code comes from scanned
// repositories, so it is only ever rendered as text.
function CodeCard({ title, code, tone }) {
  const [copied, setCopied] = useState(false)
  return (
    <Card title={title} flush actions={
      <button type="button" onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-3 hover:bg-surface-3 hover:text-fg" aria-label={`Copy ${title.toLowerCase()}`}>
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
      </button>
    }>
      <pre className={`overflow-x-auto border-t border-line bg-sidebar px-5 py-4 font-mono text-[0.78rem] leading-relaxed text-fg-2 whitespace-pre rounded-b-xl ${tone === 'fix' ? 'border-l-2 border-l-good/60' : tone === 'bad' ? 'border-l-2 border-l-critical/60' : ''}`}>{code}</pre>
    </Card>
  )
}

function Prose({ title, children }) {
  return <Card title={title}><p className="text-sm leading-relaxed text-fg-2 whitespace-pre-line">{children}</p></Card>
}

export default function FindingDetail() {
  const { findingId } = useParams()
  const { currentOrg, can } = useAuth()
  const [f, setF] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api(`/api/v1/orgs/${currentOrg.id}/findings/${findingId}`)
      .then(setF)
      .catch((err) => setError(err.status === 404 ? 'This finding does not exist in this organization.' : errorMessage(err)))
  }, [currentOrg.id, findingId])

  async function setStatus(status) {
    setSaving(true)
    try {
      setF(await api(`/api/v1/orgs/${currentOrg.id}/findings/${findingId}`, { method: 'PATCH', body: { status } }))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
    setSaving(false)
  }

  if (error && !f) return <ErrorState>{error}</ErrorState>
  if (!f) return <PageSkeleton cards={0} />
  const steps = Array.isArray(f.exploit_steps) ? f.exploit_steps : []
  const location = `${f.file}${f.line ? `:${f.line}` : ''}`
  return (
    <div>
      <PageHeader
        back={{ to: `/dashboard/findings?project=${f.project_id}`, label: 'Findings' }}
        title={f.title}
        meta={
          <>
            <SeverityBadge value={f.severity} />
            <FindingStatusBadge status={f.status} />
            <Link to={`/dashboard/projects/${f.project_id}`} className="hover:text-fg">{f.project_name}</Link>
            <span className="font-mono">{location}</span>
            {f.ai_used && <Badge tone="accent">AI analysis</Badge>}
          </>
        }
      />
      {error && <div className="mb-4"><ErrorState>{error}</ErrorState></div>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          {f.explanation && <Prose title="What is wrong">{f.explanation}</Prose>}
          {f.vulnerable_snippet && <CodeCard title="Vulnerable code" code={f.vulnerable_snippet} tone="bad" />}
          {f.impact && <Prose title="Impact">{f.impact}</Prose>}
          {steps.length > 0 && (
            <Card title="How it could be exploited">
              <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-fg-2">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </Card>
          )}
          {f.fix_snippet && <CodeCard title="Suggested fix" code={f.fix_snippet} tone="fix" />}
        </div>

        <div className="grid gap-4 lg:sticky lg:top-20">
          <Card title="Triage" description="Status carries over to future scans of this project.">
            {can('findings:update') ? (
              <div className="grid gap-1.5" role="radiogroup" aria-label="Triage status">
                {FINDING_STATUSES.map((s) => (
                  <button key={s.value} type="button" role="radio" aria-checked={f.status === s.value} disabled={saving}
                    onClick={() => f.status !== s.value && setStatus(s.value)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-60 ${f.status === s.value ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line text-fg-2 hover:border-line-strong hover:text-fg'}`}>
                    {s.label}
                    {f.status === s.value && <Check size={14} className="text-accent" />}
                  </button>
                ))}
              </div>
            ) : <FindingStatusBadge status={f.status} />}
          </Card>
          <Card title="Details">
            <DefinitionList columns={1} items={[
              ['Severity', <SeverityBadge key="s" value={f.severity} />],
              ['Project', <Link key="p" to={`/dashboard/projects/${f.project_id}`} className="text-accent hover:underline">{f.project_name}</Link>],
              ['Location', <span key="l" className="break-all font-mono text-xs">{location}</span>],
              ['First seen', <Link key="fs" to={`/dashboard/scans/${f.first_seen_scan_id}`} className="text-accent hover:underline">{dateTime(f.created_at)}</Link>],
              f.last_seen_scan_id && f.last_seen_scan_id !== f.first_seen_scan_id && ['Last seen', <Link key="ls" to={`/dashboard/scans/${f.last_seen_scan_id}`} className="text-accent hover:underline">Latest scan</Link>],
              ['Updated', dateTime(f.updated_at)],
              ['Found by', f.ai_used ? 'AI analysis' : 'Static rules'],
            ]} />
          </Card>
        </div>
      </div>
    </div>
  )
}
