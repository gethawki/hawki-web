import { useState } from 'react'
import { Severity } from '../dashboard/ScanBits.jsx'

// ReportView renders a report document (hawki-report/1) for the dashboard,
// shared links and printing. Everything is text: React escapes it, and code
// stays inside <pre>.
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info']
const STATUS = { new: 'Open', acknowledged: 'Acknowledged', resolved: 'Resolved', false_positive: 'False positive' }

const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')

function Card({ label, value, note }) {
  return (
    <div className="rounded-xl border border-panel-border px-4 py-3 min-w-0">
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey">{label}</div>
      <div className="mt-1 text-xl text-white">{value}</div>
      {note && <div className="text-xs text-grey">{note}</div>}
    </div>
  )
}

function steps(raw) {
  if (!raw) return []
  return Array.isArray(raw) ? raw.map((s) => (typeof s === 'string' ? s : JSON.stringify(s))) : [JSON.stringify(raw)]
}

function Finding({ f, index, open }) {
  const [shown, setShown] = useState(open)
  const loc = f.line ? `${f.file}:${f.line}` : f.file
  return (
    <article className="report-finding rounded-xl border border-panel-border">
      <button type="button" onClick={() => setShown((v) => !v)} aria-expanded={shown}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left">
        <span className="font-mono text-xs text-grey">{index}</span>
        <Severity value={f.severity} />
        <span className="flex-1 min-w-48 text-sm text-white">{f.title}</span>
        <span className="text-xs text-grey">{STATUS[f.status] || f.status}{f.new_in_scan ? ' · new' : ''}{f.ai_used ? ' · AI reviewed' : ''}</span>
      </button>
      <div className={`${shown ? '' : 'hidden'} print:block border-t border-panel-border px-4 py-3 grid gap-3 text-sm`}>
        <div className="font-mono text-xs text-grey break-all">{loc}</div>
        {f.vulnerable_snippet && <Code label="Code" text={f.vulnerable_snippet} />}
        {f.explanation && <Text label="Explanation" text={f.explanation} />}
        {f.impact && <Text label="Impact" text={f.impact} />}
        {f.fix_snippet && <Code label="Fix" text={f.fix_snippet} />}
        {steps(f.exploit_steps).length > 0 && (
          <div>
            <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey mb-1">Exploit steps</div>
            <ol className="list-decimal pl-5 text-fg-2">{steps(f.exploit_steps).map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )}
      </div>
    </article>
  )
}

const Text = ({ label, text }) => (
  <div>
    <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey mb-1">{label}</div>
    <p className="text-fg-2 whitespace-pre-line">{text}</p>
  </div>
)

const Code = ({ label, text }) => (
  <div>
    <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey mb-1">{label}</div>
    <pre className="overflow-x-auto rounded-lg border border-panel-border bg-ink px-3 py-2 font-mono text-xs text-fg">{text}</pre>
  </div>
)

export default function ReportView({ doc }) {
  const [expandAll, setExpandAll] = useState(false)
  const s = doc.summary
  const target = doc.scan.target?.address
    ? `${doc.scan.target.chain} ${doc.scan.target.address}`
    : `${doc.project.repository_url || ''}${doc.scan.target?.ref ? ` at ${doc.scan.target.ref}` : ''}`
  return (
    <div className="report-sheet grid gap-8">
      <section>
        <h2 className="text-white font-medium mb-3">Executive summary</h2>
        <p className="text-sm text-fg-2 max-w-3xl">{doc.overview}</p>
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {s.score != null && <Card label="Score" value={s.score} note={s.classification} />}
          <Card label="Findings" value={s.total} note={`${s.new} new`} />
          {SEVERITIES.filter((v) => s.by_severity?.[v]).map((v) => <Card key={v} label={v} value={s.by_severity[v]} />)}
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-grey">Organization</dt><dd className="text-fg-2 break-words">{doc.organization}</dd>
          <dt className="text-grey">Project</dt><dd className="text-fg-2 break-words">{doc.project.name}</dd>
          {target && (<><dt className="text-grey">Target</dt><dd className="text-fg-2 break-all">{target}</dd></>)}
          <dt className="text-grey">Scan</dt><dd className="text-fg-2 capitalize">{doc.scan.type} scan{doc.scan.scanner ? `, ${doc.scan.scanner}` : ''}</dd>
          {doc.scan.finished_at && (<><dt className="text-grey">Finished</dt><dd className="text-fg-2">{fmt(doc.scan.finished_at)}</dd></>)}
          <dt className="text-grey">Generated</dt><dd className="text-fg-2">{fmt(doc.generated_at)}</dd>
        </dl>
      </section>

      {doc.recommendations.length > 0 && (
        <section>
          <h2 className="text-white font-medium mb-3">Recommendations</h2>
          <ul className="grid gap-2">
            {doc.recommendations.map((r) => (
              <li key={r.title} className="rounded-xl border border-panel-border px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Severity value={r.severity} />
                  <span className="text-white flex-1 min-w-48">{r.title}</span>
                  <span className="text-xs text-grey">{r.count} {r.count === 1 ? 'place' : 'places'}</span>
                </div>
                {r.files.length > 0 && <div className="mt-1 font-mono text-xs text-grey break-all">{r.files.join(', ')}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="report-findings">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-white font-medium">Findings</h2>
          {doc.findings.length > 0 && (
            <button type="button" onClick={() => setExpandAll((v) => !v)} className="no-print text-xs text-steel hover:text-steel-light">
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
        {doc.findings.length === 0 ? <p className="text-sm text-grey">No findings.</p> : (
          <div className="grid gap-2">
            {doc.findings.map((f, i) => <Finding key={`${f.id}-${expandAll}`} f={f} index={i + 1} open={expandAll} />)}
          </div>
        )}
      </section>

      {doc.evidence.length > 0 && (
        <section>
          <h2 className="text-white font-medium mb-3">Appendix: evidence</h2>
          <ul className="grid gap-1 text-sm">
            {doc.evidence.map((e) => (
              <li key={e.kind + e.sha256} className="flex flex-col sm:flex-row sm:gap-4">
                <span className="text-fg-2 w-24">{e.kind}</span>
                <span className="text-grey w-28">{e.size.toLocaleString()} bytes</span>
                <span className="font-mono text-xs text-grey break-all">sha256 {e.sha256}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
