import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useRefresh } from '../../lib/live.jsx'
import Alert, { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import { SelectField } from '../common/Field.jsx'
import { Panel } from '../dashboard/PageHeader.jsx'
import { Severity } from '../dashboard/ScanBits.jsx'

const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')
const EVENT_LINK = { scan: '/dashboard/scans/', report: '/dashboard/reports/', alert: '/dashboard/alerts/' }

// ScoreTrend draws the security score of completed scans, oldest to newest.
function ScoreTrend({ points }) {
  const scored = [...points].reverse().filter((p) => p.score != null)
  if (scored.length < 2) return <p className="text-sm text-grey">The score trend appears after two completed scans.</p>
  const x = (i) => (i / (scored.length - 1)) * 100
  const y = (s) => 38 - (s / 100) * 34
  const line = scored.map((p, i) => `${x(i).toFixed(2)},${y(p.score).toFixed(2)}`).join(' ')
  const last = scored[scored.length - 1]
  const first = scored[0]
  const delta = last.score - first.score
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-24 text-steel" role="img"
        aria-label={`Security score went from ${first.score} to ${last.score} over ${scored.length} scans`}>
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        {scored.map((p, i) => <circle key={p.scan_id} cx={x(i)} cy={y(p.score)} r="1.2" fill="currentColor" />)}
      </svg>
      <p className="mt-2 text-xs text-grey">
        Score {first.score} to {last.score} over {scored.length} scans ({delta >= 0 ? '+' : ''}{delta}). Latest: {last.total} findings.
      </p>
    </div>
  )
}

function FindingList({ title, items, empty }) {
  return (
    <div>
      <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey mb-2">{title} ({items.length})</div>
      {items.length === 0 ? <p className="text-sm text-grey">{empty}</p> : (
        <ul className="grid gap-1.5">
          {items.slice(0, 50).map((f) => (
            <li key={f.id}>
              <Link to={`/dashboard/findings/${f.id}`} className="flex items-center gap-3 text-sm hover:text-white">
                <Severity value={f.severity} />
                <span className="flex-1 min-w-0 truncate text-[#cfcfcf]">{f.title}</span>
                <span className="hidden sm:block font-mono text-xs text-grey truncate max-w-[12rem]">{f.file}</span>
              </Link>
            </li>
          ))}
          {items.length > 50 && <li className="text-xs text-grey">and {items.length - 50} more</li>}
        </ul>
      )}
    </div>
  )
}

function Compare({ orgId, projectId, points }) {
  const [from, setFrom] = useState(points[1]?.scan_id || '')
  const [to, setTo] = useState(points[0]?.scan_id || '')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const options = points.map((p) => ({ value: p.scan_id, label: `${fmt(p.finished_at)} · ${p.type} · ${p.total} findings` }))

  async function run() {
    setBusy(true)
    setError(null)
    try {
      setResult(await api(`/api/v1/orgs/${orgId}/projects/${projectId}/compare?from=${from}&to=${to}`))
    } catch (err) {
      setError(errorMessage(err))
    }
    setBusy(false)
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
        <SelectField id="compare-from" label="From" value={from} onChange={(e) => setFrom(e.target.value)} options={options} />
        <SelectField id="compare-to" label="To" value={to} onChange={(e) => setTo(e.target.value)} options={options} />
        <Button variant="ghost" onClick={run} busy={busy} disabled={from === to}>Compare</Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {result && (
        <div className="grid gap-5">
          <p className="text-sm text-[#cfcfcf]">
            Score {result.from.score ?? 'n/a'} to {result.to.score ?? 'n/a'}. {result.added.length} new, {result.removed.length} gone, {result.kept} still present.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <FindingList title="New since the earlier scan" items={result.added} empty="Nothing new." />
            <FindingList title="Gone since the earlier scan" items={result.removed} empty="Nothing went away." />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectHistory({ orgId, projectId }) {
  const [points, setPoints] = useState(null)
  const [events, setEvents] = useState([])
  const load = useCallback(() => {
    api(`/api/v1/orgs/${orgId}/projects/${projectId}/trend`).then((d) => setPoints(d.scans)).catch(() => setPoints([]))
    api(`/api/v1/orgs/${orgId}/projects/${projectId}/timeline`).then((d) => setEvents(d.events)).catch(() => setEvents([]))
  }, [orgId, projectId])
  useEffect(() => {
    load()
  }, [load])
  useRefresh(['scan.updated', 'alert.created'], load, { filter: (m) => !m.data?.project_id || m.data.project_id === projectId })

  if (!points) return null
  return (
    <Panel title="History">
      <div className="grid gap-8">
        <ScoreTrend points={points} />
        {points.length >= 2 && <Compare key={points[0].scan_id} orgId={orgId} projectId={projectId} points={points} />}
        <div>
          <div className="font-mono text-[0.65rem] uppercase tracking-wider text-grey mb-2">Timeline</div>
          {events.length === 0 ? <p className="text-sm text-grey">Nothing has happened yet.</p> : (
            <ol className="grid gap-2 border-l border-panel-border pl-4">
              {events.slice(0, 30).map((ev) => (
                <li key={`${ev.kind}-${ev.ref_id}`} className="text-sm">
                  <span className="text-xs text-grey mr-2">{fmt(ev.at)}</span>
                  <Link to={(EVENT_LINK[ev.ref_type] || '/dashboard/') + ev.ref_id} className="text-[#cfcfcf] hover:text-white">{ev.title}</Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Panel>
  )
}
