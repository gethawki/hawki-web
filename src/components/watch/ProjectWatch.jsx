import { useAuth } from '../../lib/auth.jsx'
import Card from '../ui/Card.jsx'
import { EmptyState, PageSkeleton } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import ViolationTable from './ViolationTable.jsx'
import { HealthBadge, LevelBadge, MonitorLink, WatchError, WatchLocked, useWatch } from './WatchKit.jsx'

// ProjectWatch is Watch on a project's contract: the monitors that bind it
// and the episodes Watch saw on it.
export default function ProjectWatch({ project }) {
  const { can } = useAuth()
  const r = useWatch(`/contract?chain=${encodeURIComponent(project.chain)}&address=${encodeURIComponent(project.contract_address)}`)
  if (r.error) return <Card><WatchError status={r.status} error={r.error} onRetry={r.reload} what="Watch on your contracts" /></Card>
  if (!r.data) return <PageSkeleton cards={2} />
  const c = r.data
  if (!c.available) return <Card><WatchLocked what="Watch" /></Card>
  return (
    <div className="grid gap-4">
      <Card title="Watch check" actions={can('watch:write') && c.monitors.length === 0 && <Button size="sm" to="/dashboard/watch?tab=add">Monitor it</Button>}>
        <p className="text-sm text-fg">{c.summary}</p>
        {c.monitors.length > 0 && (
          <ul className="mt-3 grid gap-2 text-sm">
            {c.monitors.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2"><MonitorLink id={m.id} name={m.name} /><HealthBadge health={m.health} /><LevelBadge level={m.level} /></li>
            ))}
          </ul>
        )}
      </Card>
      <Card flush title="Episodes on this contract">
        {c.violations.length === 0 ? <EmptyState compact title="None">Watch has not seen an invariant break on this contract.</EmptyState> : <ViolationTable rows={c.violations} showMonitor={false} />}
      </Card>
    </div>
  )
}
