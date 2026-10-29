import { useParams } from 'react-router-dom'
import { dateTime, pct } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card, { DefinitionList } from '../../components/ui/Card.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import { SeverityTag } from '../../components/admin/intelBits.jsx'
import { IntelError, useIntel } from '../../components/intel/IntelKit.jsx'
import { InsightStatus, KindBadge, PATTERN, Priority, RESOLUTION, STATUS, Subject } from '../../components/intel/Insights.jsx'

// Evidence values are shown as they are: addresses, numbers, short lists.
function Evidence({ evidence }) {
  const rows = Object.entries(evidence || {}).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
  if (rows.length === 0) return <p className="text-sm text-fg-2">No further detail.</p>
  const show = (v) => (typeof v === 'object' ? (Array.isArray(v) && v.every((x) => typeof x !== 'object') ? v.join(', ') : JSON.stringify(v)) : String(v))
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-[10rem_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-fg-3">{k.replaceAll('_', ' ')}</dt>
          <dd className="break-all font-mono text-fg-2">{show(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

// IntelInsight is one insight: what was found, why it ranks where it does,
// the evidence, and its lifecycle.
export default function IntelInsight() {
  const { id } = useParams()
  const { data, error, status, reload } = useIntel(`/insights/${encodeURIComponent(id)}`)
  const back = { to: '/dashboard/intel?tab=insights', label: 'Insights' }
  if (status === 404) return <><PageHeader back={back} title="Insight not found" /><EmptyState title="Intel has no insight with this number" /></>
  if (error) return <IntelError status={status} error={error} onRetry={reload} what="Insights" />
  if (!data) return <PageSkeleton cards={2} />
  const i = data.insight
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader back={back} title={i.title} description={i.summary}
        meta={<><SeverityTag severity={i.severity} /><KindBadge kind={i.kind} /><InsightStatus insight={i} /><span>{PATTERN[i.pattern] || i.pattern}</span><span>{dateTime(i.created_at)}</span></>} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          <Card title="Evidence"><Evidence evidence={i.evidence} /></Card>
          <Card title="Lifecycle" description="Hawk-i analysts review insights and record what was done">
            <ol className="grid gap-2">
              {data.events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                  <span className="w-36 text-fg-3">{dateTime(e.at)}</span>
                  <span className="text-fg">{(STATUS[e.status] || ['', e.status])[1]}{e.resolution ? `, ${RESOLUTION[e.resolution] || e.resolution}` : ''}</span>
                  {e.note && <span className="text-fg-2">{e.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <Card title="Why it ranks here">
          <DefinitionList columns={1} items={[
            ['About', <Subject insight={i} />],
            i.protocol && i.subject !== 'protocol' && ['Protocol', i.protocol],
            ['Priority', <Priority value={i.priority} />],
            ['Confidence', pct(i.confidence)],
            ['Novelty', <span title="Lower when Intel found the same pattern here in the last 30 days">{pct(i.novelty)}</span>],
            ['Actionability', <span title="How much the people behind it can do about it">{pct(i.actionability)}</span>],
            i.block_number != null && ['Block', <span className="tnum">{i.block_number.toLocaleString('en')}</span>],
          ]} />
        </Card>
      </div>
    </div>
  )
}
