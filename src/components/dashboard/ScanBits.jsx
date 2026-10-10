import { Link } from 'react-router-dom'
import RiskBadge from '../common/RiskBadge.jsx'

const STATUS = {
  queued: 'text-grey border-panel-border',
  running: 'text-steel border-steel/60',
  completed: 'text-[#cfcfcf] border-panel-border',
  failed: 'text-copper border-copper/60',
  canceled: 'text-grey border-panel-border',
}

// ScanStatus is a small pill; running scans pulse.
export function ScanStatus({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider ${STATUS[status] || STATUS.queued}`}>
      {(status === 'running' || status === 'queued') && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {status}
    </span>
  )
}

export function Severity({ value }) {
  return <RiskBadge level={(value || 'info').toLowerCase()} label={value} />
}

// SeverityCounts shows "2 Critical 1 Low" for a scan summary.
export function SeverityCounts({ summary }) {
  const by = summary?.by_severity || {}
  const order = ['Critical', 'High', 'Medium', 'Low', 'Info'].filter((s) => by[s])
  if (!summary || summary.total === undefined) return <span className="text-grey text-sm">no results yet</span>
  if (order.length === 0) return <span className="text-grey text-sm">no findings</span>
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {order.map((s) => (
        <span key={s} className={s === 'Critical' || s === 'High' ? 'text-copper' : s === 'Medium' ? 'text-steel' : 'text-grey'}>
          {by[s]} {s}
        </span>
      ))}
    </span>
  )
}

export const isActive = (s) => s.status === 'queued' || s.status === 'running'

export function ScanRow({ scan, showProject }) {
  return (
    <Link to={`/dashboard/scans/${scan.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 first:pt-0 last:pb-0 hover:text-white">
      <ScanStatus status={scan.status} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">
          {showProject && scan.project_name ? `${scan.project_name} · ` : ''}
          <span className="capitalize">{scan.type}</span> scan
          {scan.target?.ref ? <span className="text-grey"> on {scan.target.ref}</span> : null}
        </div>
        <div className="text-xs text-grey">{new Date(scan.created_at).toLocaleString()}</div>
      </div>
      {scan.status === 'completed' ? <SeverityCounts summary={scan.summary} /> : scan.status === 'failed' ? <span className="text-xs text-copper truncate max-w-xs">{scan.error}</span> : null}
    </Link>
  )
}
