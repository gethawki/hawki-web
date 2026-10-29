import { useAuth } from '../../lib/auth.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState, PageSkeleton } from '../ui/Feedback.jsx'
import Button from '../common/Button.jsx'
import { ScoreCard } from '../../pages/dashboard/HuntAddressPage.jsx'
import { BandBadge, ClusterLink, HuntAddress, HuntError, RULES, huntAddressPath, useHunt } from './HuntKit.jsx'

// ProjectHunt is the Hunt check of a project's contract: who deployed it,
// whether that account is in a funding cluster, and both scores.
export default function ProjectHunt({ projectId }) {
  const { currentOrg } = useAuth()
  const r = useHunt(`/api/v1/orgs/${currentOrg.id}/projects/${projectId}/hunt`)
  if (r.error) return <Card><HuntError status={r.status} error={r.error} onRetry={r.reload} what="Hunt on your contracts" /></Card>
  if (!r.data) return <PageSkeleton cards={2} />
  const c = r.data
  const t = c.genesis_trace
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <div className="grid min-w-0 gap-4 lg:col-span-2">
        <Card title="Hunt check" actions={<Button size="sm" variant="ghost" to={huntAddressPath(c.chain, c.contract)}>Open in Hunt</Button>}>
          <p className="text-sm text-fg">{c.summary}</p>
          {c.deployer && <p className="mt-2 text-xs text-fg-3">Deployed by <HuntAddress chain={c.chain} address={c.deployer} /></p>}
        </Card>
        {c.clusters.length > 0 && (
          <Card title="Deployer's funding clusters">
            <ul className="grid gap-2 text-sm">
              {c.clusters.map((cl) => (
                <li key={cl.id} className="flex flex-wrap items-center gap-2"><ClusterLink code={cl.id} /><BandBadge band={cl.band} points={cl.points} /><span className="text-xs text-fg-3">{cl.contracts} contracts</span></li>
              ))}
            </ul>
          </Card>
        )}
        {t && (
          <Card title="Rules fired on the contract">
            {t.rules_fired.length === 0 ? <EmptyState compact title="None" /> : (
              <ul className="grid gap-1.5 text-sm">{t.rules_fired.map((h) => <li key={h.rule} className="flex items-center gap-2"><Badge tone="warning">{h.rule}</Badge><span className="text-fg-2">{RULES[h.rule]}</span></li>)}</ul>
            )}
          </Card>
        )}
      </div>
      <div className="grid min-w-0 gap-4">
        <ScoreCard title="Contract score" score={c.immune_score} />
        <ScoreCard title="Deployer score" score={c.deployer_score} />
      </div>
    </div>
  )
}
