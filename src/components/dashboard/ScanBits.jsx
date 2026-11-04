import { Link } from 'react-router-dom'
import { ScanStatusBadge, SeverityBadge, SEVERITY_COLOR } from '../ui/Badge.jsx'
import { ago } from '../../lib/format.js'

export const ScanStatus = ScanStatusBadge

export function Severity({ value }) {
  return <SeverityBadge value={value} />
}

// SeverityCounts shows a scan summary as keyed counts: "2 critical 1 low".
export function SeverityCounts({ summary }) {
  const by = summary?.by_severity || {}
  const order = ['Critical', 'High', 'Medium', 'Low', 'Info'].filter((s) => by[s])
  if (!summary || summary.total === undefined) return <span className="text-xs text-fg-3">No results yet</span>
  if (order.length === 0) return <span className="text-xs text-fg-3">No findings</span>
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {order.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5 text-fg-2">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: SEVERITY_COLOR[s.toLowerCase()] }} />
          <span className="tnum text-fg">{by[s]}</span> {s.toLowerCase()}
        </span>
      ))}
    </span>
  )
}

export const isActive = (s) => s.status === 'queued' || s.status === 'running'

export const scanTitle = (scan, showProject) =>
  `${showProject && scan.project_name ? `${scan.project_name} · ` : ''}${scan.type.charAt(0).toUpperCase()}${scan.type.slice(1)} scan`

export function ScanRow({ scan, showProject }) {
  return (
    <Link to={`/dashboard/scans/${scan.id}`} className="flex items-start gap-4 px-5 py-3 transition-colors hover:bg-surface-2/70">
      <div className="w-24 shrink-0 pt-0.5"><ScanStatusBadge status={scan.status} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-fg">
            {scanTitle(scan, showProject)}
            {scan.target?.ref ? <span className="text-fg-3"> on {scan.target.ref}</span> : null}
            {scan.requested_by === 'schedule' ? <span className="text-fg-3"> · scheduled</span> : null}
          </span>
          <span className="shrink-0 text-xs text-fg-3">{ago(scan.created_at)}</span>
        </div>
        <div className="mt-1">
          {scan.status === 'completed' ? <SeverityCounts summary={scan.summary} />
            : scan.status === 'failed' ? <span className="block truncate text-xs text-bad">{scan.error || 'Failed'}</span>
              : <span className="text-xs text-fg-3">{scan.status === 'running' ? 'Scanning now' : 'Waiting for a worker'}</span>}
        </div>
      </div>
    </Link>
  )
}
