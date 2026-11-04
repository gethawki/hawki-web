import { Link } from 'react-router-dom'
import { ago, dateTime, num } from '../../lib/format.js'
import Badge, { SeverityBadge } from '../ui/Badge.jsx'
import DataTable from '../ui/DataTable.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { EpisodeStatus, violationPath } from './WatchKit.jsx'

// ViolationTable lists violation episodes, each linking to its page.
export default function ViolationTable({ rows, loading, showMonitor = true }) {
  return (
    <DataTable rows={rows} loading={loading} rowKey={(v) => v.id} rowHref={(v) => violationPath(v.id)}
      empty={<EmptyState compact title="No violation matches">Every invariant held.</EmptyState>}
      columns={[
        { key: 's', header: 'Severity', className: 'w-24', cell: (v) => <SeverityBadge value={v.severity} /> },
        { key: 't', header: 'Invariant', cell: (v) => (
          <span className="grid">
            <Link to={violationPath(v.id)} className="text-fg hover:underline">{v.title || v.invariant}</Link>
            <span className="text-xs text-fg-3">{[showMonitor && v.monitor_name, v.shadow && 'shadow period', !v.confirmed && v.status === 'open' && 'unconfirmed'].filter(Boolean).join(', ')}</span>
          </span>
        ) },
        { key: 'c', header: 'Kind', hide: 'md', cell: (v) => <Badge tone={v.category === 'invariant' ? 'neutral' : 'staff'}>{v.category}</Badge> },
        { key: 'st', header: 'Status', hide: 'sm', cell: (v) => <EpisodeStatus status={v.status} /> },
        { key: 'b', header: 'Block', align: 'right', hide: 'lg', cell: (v) => <span className="tnum text-fg-2">{num(v.first_block)}{v.occurrences > 1 ? ` (${v.occurrences}x)` : ''}</span> },
        { key: 'w', header: 'When', align: 'right', cell: (v) => <span className="whitespace-nowrap text-fg-3" title={dateTime(v.first_time)}>{ago(v.first_time)}</span> },
      ]} />
  )
}
