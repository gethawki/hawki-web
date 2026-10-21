import Badge from '../ui/Badge.jsx'

// Pieces the Intel admin cards share.

export const SEVERITY = { critical: ['danger', 'Critical'], high: ['danger', 'High'], medium: ['warning', 'Medium'], low: ['neutral', 'Low'], info: ['neutral', 'Info'] }
const BAND = { critical: 'danger', high: 'danger', elevated: 'warning', guarded: 'neutral', low: 'good' }

export function SeverityTag({ severity }) {
  const [tone, label] = SEVERITY[severity] || ['neutral', severity]
  return <Badge tone={tone} dot={severity === 'critical' || severity === 'high'}>{label}</Badge>
}

// ScoreSection shows a risk score and every factor behind it.
export function ScoreSection({ score, title = 'Risk score' }) {
  if (!score) return null
  return (
    <div className="grid gap-2 rounded-lg border border-line p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-fg-2">{title}</span>
        <span className="text-lg font-semibold text-fg tnum">{score.value}</span>
        <Badge tone={BAND[score.band] || 'neutral'}>{score.band}</Badge>
      </div>
      {score.factors.length === 0
        ? <p className="text-xs text-fg-3">No risk factor found in what Intel knows.</p>
        : <ul className="grid gap-1">{score.factors.map((f) => <li key={f.name} className="flex gap-2 text-xs"><span className="w-8 shrink-0 text-right text-fg tnum">+{f.points}</span><span className="text-fg-2">{f.reason}</span></li>)}</ul>}
    </div>
  )
}

