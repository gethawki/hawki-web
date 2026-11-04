import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState, PageSkeleton } from '../ui/Feedback.jsx'
import { MevError, PredictionTable, useMev } from './MevKit.jsx'

// ProjectMev is MEV on a project's contract: its predictions and the
// attacks found on it in mined blocks.
export default function ProjectMev({ project }) {
  const addr = project.contract_address.toLowerCase()
  const preds = useMev(`/predictions?chain=${encodeURIComponent(project.chain)}&limit=200`)
  const dets = useMev('/detections')
  if (preds.error && !preds.data) return <Card><MevError status={preds.status} error={preds.error} onRetry={preds.reload} what="MEV on your contracts" /></Card>
  if (!preds.data) return <PageSkeleton cards={2} />
  const mine = (preds.data.predictions || []).filter((p) => p.targets?.includes(addr))
  const mined = (dets.data?.detections || []).filter((d) => d.chain === project.chain && [d.pool, d.victim, d.attacker].includes(addr))
  return (
    <div className="grid gap-4">
      <Card title="MEV check">
        <p className="text-sm text-fg">MEV Intelligence watches this contract: pending transactions to it are read before they are mined.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Badge tone="accent">{mine.length} predictions</Badge><Badge tone={mined.length ? 'danger' : 'good'}>{mined.length} attacks mined</Badge></div>
      </Card>
      <Card flush title="Predictions on this contract">
        <PredictionTable rows={mine} empty={<EmptyState compact title="None yet">No pending transaction to this contract matched an attack pattern.</EmptyState>} />
      </Card>
    </div>
  )
}
