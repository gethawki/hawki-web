import { Link } from 'react-router-dom'
import { ago, dateTime } from '../../lib/format.js'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { SeverityTag } from '../admin/intelBits.jsx'
import { IntelError, addressPath, short, useIntel } from './IntelKit.jsx'

// Insights are what Intel's analysis concluded: patterns, relationships,
// anomalies and risk rises, each with a confidence and a priority.

export const KIND = {
  pattern: ['accent', 'Pattern'],
  relationship: ['warning', 'Relationship'],
  anomaly: ['warning', 'Anomaly'],
  risk: ['danger', 'Risk'],
}

export const PATTERN = {
  exploit_clone: 'Copies exploit code',
  attacker_deployment: 'Deployed by an attacker',
  flagged_funding: 'Flagged funding',
  flagged_controller: 'Flagged controller',
  risky_upgrade: 'Risky upgrade',
  control_then_upgrade: 'Upgrade after control change',
  large_movement: 'Large movement',
  risk_rise: 'Risk rose',
  same_actor: 'Same actor as an exploit',
}

export const STATUS = { generated: ['neutral', 'New'], reviewed: ['accent', 'Reviewed'], acted_on: ['warning', 'Acted on'], resolved: ['good', 'Resolved'] }
export const RESOLUTION = { fixed: 'fixed', accepted: 'risk accepted', false_positive: 'false positive', retracted: 'retracted by a reorg' }

export function KindBadge({ kind }) {
  const [tone, label] = KIND[kind] || ['neutral', kind]
  return <Badge tone={tone}>{label}</Badge>
}

export function InsightStatus({ insight }) {
  const [tone, label] = STATUS[insight.status] || ['neutral', insight.status]
  return <Badge tone={tone}>{label}{insight.resolution ? `, ${RESOLUTION[insight.resolution] || insight.resolution}` : ''}</Badge>
}

// Priority is 0 to 100; the bar makes a long feed easy to scan.
export function Priority({ value }) {
  const tone = value >= 60 ? 'bg-critical' : value >= 35 ? 'bg-[#e0a458]' : 'bg-fg-3'
  return (
    <span className="inline-flex items-center gap-2" title={`Priority ${value} of 100`}>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-3"><span className={`block h-full ${tone}`} style={{ width: `${Math.max(4, value)}%` }} /></span>
      <span className="tnum text-xs text-fg-2">{value}</span>
    </span>
  )
}

// subjectPath is the page of what an insight is about.
export function subjectPath(i) {
  if (i.subject === 'protocol') return `/dashboard/intel/protocols/${encodeURIComponent(i.ref)}`
  return i.chain && i.ref ? addressPath(i.chain, i.ref) : null
}

export function Subject({ insight: i }) {
  const to = subjectPath(i)
  const label = i.subject === 'protocol' ? i.ref : short(i.ref)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
      <span className="text-fg-3">{i.subject}</span>
      {to ? <Link to={to} className={`truncate text-fg hover:underline ${i.subject === 'protocol' ? '' : 'font-mono'}`} title={i.ref}>{label}</Link> : <span className="font-mono text-fg">{label}</span>}
      {i.chain && <span className="capitalize text-fg-3">{i.chain}</span>}
    </span>
  )
}

export const insightColumns = (withSubject = true) => [
  { key: 'p', header: 'Priority', className: 'w-28', cell: (i) => <Priority value={i.priority} /> },
  { key: 's', header: 'Severity', className: 'w-24', hide: 'sm', cell: (i) => <SeverityTag severity={i.severity} /> },
  { key: 't', header: 'Insight', cell: (i) => (
    <span className="grid min-w-0 gap-0.5">
      <Link to={`/dashboard/intel/insights/${i.id}`} className="truncate text-fg hover:underline">{i.title}</Link>
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-fg-3">
        <span>{PATTERN[i.pattern] || i.pattern}</span>
        <span>{Math.round(i.confidence * 100)}% confidence</span>
        {i.status !== 'generated' && <InsightStatus insight={i} />}
      </span>
    </span>
  ) },
  withSubject && { key: 'subj', header: 'About', hide: 'md', cell: (i) => <Subject insight={i} /> },
  { key: 'k', header: 'Kind', hide: 'md', cell: (i) => <KindBadge kind={i.kind} /> },
  { key: 'w', header: 'When', align: 'right', cell: (i) => <span className="whitespace-nowrap text-fg-3" title={dateTime(i.created_at)}>{ago(i.created_at)}</span> },
].filter(Boolean)

// EntityInsights lists the insights about one address or protocol.
export function EntityInsights({ query, title = 'Insights' }) {
  const r = useIntel(`/insights?${query}&sort=priority&limit=20`)
  return (
    <Card flush title={title} description="What Intel's analysis concluded about this, by priority">
      {r.error ? <div className="px-5 pb-5"><IntelError status={r.status} error={r.error} onRetry={r.reload} what="Insights" /></div> : (
        <DataTable rows={r.data?.insights} loading={!r.data} dense rowKey={(i) => i.id} columns={insightColumns(false)}
          empty={<EmptyState compact title="No insight yet">Insights appear when Intel's detectors find a pattern, a tie to an incident or an anomaly here.</EmptyState>} />
      )}
    </Card>
  )
}

// ScoreHistory shows the values a stored score held before its current
// one, newest first.
export function ScoreHistory({ path }) {
  const r = useIntel(path)
  if (!r.data) return null
  const { score, history } = r.data
  return (
    <Card title="Score history" description={score.computed_at ? `Current value since ${dateTime(score.computed_at)}` : undefined}>
      {history.length === 0 ? <p className="text-sm text-fg-2">The score has not changed since Intel first computed it.</p> : (
        <ol className="grid gap-2">
          {[{ value: score.value, band: score.band, computed_at: score.computed_at, current: true }, ...history].slice(0, 12).map((h, i, all) => {
            const prev = all[i + 1]
            const delta = prev ? h.value - prev.value : null
            return (
              <li key={`${h.computed_at}:${i}`} className="flex items-center gap-3 text-xs">
                <span className="w-8 text-right text-sm font-medium text-fg tnum">{h.value}</span>
                <span className="w-16 text-fg-2">{h.band}</span>
                {delta != null && delta !== 0 && <span className={`tnum ${delta > 0 ? 'text-bad' : 'text-ok'}`}>{delta > 0 ? `+${delta}` : delta}</span>}
                <span className="ml-auto text-fg-3" title={dateTime(h.computed_at)}>{h.current ? 'now' : `until ${ago(h.replaced_at)}`}</span>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
