import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { ago, dateTime, num } from '../../lib/format.js'
import PageHeader from '../../components/dashboard/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Badge, { SeverityBadge } from '../../components/ui/Badge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { Segmented } from '../../components/ui/Controls.jsx'
import { EmptyState, PageSkeleton } from '../../components/ui/Feedback.jsx'
import TimeChart from '../../components/charts/TimeChart.jsx'
import Button from '../../components/common/Button.jsx'
import Field, { SelectField, TextArea } from '../../components/common/Field.jsx'
import Alert, { errorMessage } from '../../components/common/Alert.jsx'
import { AddressLink, ChainName } from '../../components/intel/IntelKit.jsx'
import ViolationTable from '../../components/watch/ViolationTable.jsx'
import {
  BillingBadge, HealthBadge, LevelBadge, WatchError, WatchLocked, bigValue, credits, useWatch, useWatchAccess, watchCall,
} from '../../components/watch/WatchKit.jsx'

const WINDOWS = [{ value: '1h', label: '1h' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }]

const CUSTOM_TEMPLATE = {
  variables: [{ name: 'my_value', contract: '', call: 'totalSupply()(uint256)' }],
  invariants: [{ id: 'custom-my-check', name: 'My check', type: 'range', severity: 'high', expression: 'my_value > 0', recommendation: 'What to do when it breaks.' }],
}

// StateChart plots one variable's recorded values over a window.
function StateChart({ monitorId, comp }) {
  const vars = useWatch(`/monitors/${monitorId}/components/${comp.id}/state`)
  const [variable, setVariable] = useState('')
  const [win, setWin] = useState('24h')
  const numeric = (vars.data?.current || []).filter((v) => /^-?\d+(\.\d+)?$/.test(v.value))
  const chosen = variable || numeric[0]?.variable || ''
  const series = useWatch(chosen ? `/monitors/${monitorId}/components/${comp.id}/state?variable=${encodeURIComponent(chosen)}&window=${win}` : null)
  // Plotted as the change since the window starts: on-chain values are
  // large and move by small amounts.
  const points = series.data?.series || []
  const start = points[0]?.value
  const data = useMemo(() => points.map((p) => {
    const t = new Date(p.time)
    const label = win === '1h' || win === '24h' ? t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return { label, title: `Block ${p.block.toLocaleString()}, ${t.toLocaleString()}: ${bigValue(p.value)}`, value: Number(BigInt(p.value.split('.')[0]) - BigInt(String(start).split('.')[0])) }
  }), [points, start, win])
  const low = data.length ? Math.min(0, ...data.map((d) => d.value)) : undefined
  const signed = (v) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${num(Math.abs(v))}`
  if (vars.error) return <Alert>{vars.error}</Alert>
  if (!vars.data) return <div className="h-32" />
  return (
    <div className="grid gap-4">
      <DataTable rows={vars.data.current} dense rowKey={(v) => v.variable} empty={<EmptyState compact title="No state read yet">Values appear after the first check.</EmptyState>}
        columns={[
          { key: 'n', header: 'Variable', cell: (v) => <span className="font-mono text-xs">{v.variable}</span> },
          { key: 'v', header: 'Value', align: 'right', cell: (v) => <span className="tnum text-fg" title={v.value}>{bigValue(v.value)}</span> },
          { key: 'p', header: 'Before', align: 'right', hide: 'md', cell: (v) => <span className="tnum text-fg-3" title={v.previous || ''}>{v.previous == null ? '-' : bigValue(v.previous)}</span> },
          { key: 'b', header: 'Block', align: 'right', hide: 'sm', cell: (v) => <span className="tnum text-fg-3" title={dateTime(v.time)}>{num(v.block)}</span> },
        ]} />
      {numeric.length > 0 && (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-56"><SelectField id={`sv-${comp.id}`} label="Chart" value={chosen} onChange={(e) => setVariable(e.target.value)}
              options={numeric.map((v) => ({ value: v.variable, label: v.variable }))} /></div>
            <Segmented label="Window" value={win} onChange={setWin} options={WINDOWS} />
          </div>
          {data.length === 0 ? <p className="text-xs text-fg-3">No change recorded in this window.</p>
            : <TimeChart data={data} series={[{ key: 'value', label: chosen, color: 'var(--color-series-1)' }]} height={200} format={signed} floor={low}
              caption={`Change of ${chosen} over ${win}`} />}
          <p className="text-xs text-fg-3">{data.length > 0 && <>Change since {bigValue(start)} at the start of the window. </>}Values are recorded when they change; each point is the block it changed at.</p>
        </div>
      )}
    </div>
  )
}

function Invariants({ monitor, comp, kind, editable, maxInvariants, onSaved }) {
  const { currentOrg } = useAuth()
  const all = useMemo(() => {
    const custom = (() => {
      try {
        return (comp.custom?.invariants || []).map((i) => ({ ...i, custom: true }))
      } catch {
        return []
      }
    })()
    return [...(kind?.invariants || []), ...custom]
  }, [kind, comp.custom])
  const [on, setOn] = useState(() => new Set(comp.invariants.length ? comp.invariants : all.map((i) => i.id)))
  const [params, setParams] = useState(comp.params || {})
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    setOn(new Set(comp.invariants.length ? comp.invariants : all.map((i) => i.id)))
    setParams(comp.params || {})
  }, [comp, all])
  const dry = comp.dry_run?.invariants || {}
  async function save(body) {
    setMsg(null)
    try {
      await watchCall(currentOrg.id, `/monitors/${monitor.id}/components/${comp.id}/tuning`, 'PUT', body)
      setMsg({ tone: 'info', text: 'Saved. Watch dry runs the component again over the recent blocks.' })
      onSaved()
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) })
    }
  }
  const paramNames = Object.keys(kind?.params || {})
  return (
    <div className="grid gap-4">
      <DataTable rows={all} dense rowKey={(i) => i.id} empty={<EmptyState compact title="No invariants" />}
        columns={[
          ...(editable ? [{ key: 'on', header: <span className="sr-only">Checked</span>, className: 'w-8', cell: (i) => (
            <input type="checkbox" aria-label={`Check ${i.name}`} checked={on.has(i.id)} onChange={(e) => {
              const next = new Set(on)
              if (e.target.checked) next.add(i.id)
              else next.delete(i.id)
              setOn(next)
            }} />
          ) }] : []),
          { key: 'n', header: 'Invariant', cell: (i) => (
            <span className="grid gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-fg">{i.name}{i.custom && <Badge tone="staff">custom</Badge>}{!on.has(i.id) && <Badge>off</Badge>}</span>
              <code className="break-all text-[0.7rem] text-fg-3">{i.expression}</code>
            </span>
          ) },
          { key: 's', header: 'Severity', hide: 'sm', cell: (i) => <SeverityBadge value={i.severity} /> },
          { key: 't', header: 'Type', hide: 'lg', cell: (i) => <span className="text-xs text-fg-2">{i.type}</span> },
          { key: 'c', header: 'Confidence', align: 'right', hide: 'md', cell: (i) => {
            const d = dry[i.id]
            if (!d) return <span className="text-fg-3">{comp.dry_run ? '-' : 'measuring'}</span>
            return <span className="tnum" title={`${d.holds} held, ${d.violated} violated, ${d.unknown} unknown`}>{Math.round(d.confidence * 100)}%</span>
          } },
        ]} />
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={on.size === 0} onClick={() => save({ invariants: [...on] })}>Save invariants</Button>
          <span className="text-xs text-fg-3">{on.size} of {all.length} checked{maxInvariants ? `; a monitor checks ${maxInvariants} at most` : ''}</span>
        </div>
      )}
      {paramNames.length > 0 && (
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save({ params }) }}>
          {paramNames.map((p) => (
            <Field key={p} id={`p-${comp.id}-${p}`} label={p.replaceAll('_', ' ')} value={params[p] ?? ''} disabled={!editable}
              placeholder={`${kind.params[p]} (default)`} onChange={(e) => setParams({ ...params, [p]: e.target.value })} />
          ))}
          {editable && <div className="self-end"><Button size="sm" variant="ghost" type="submit">Save parameters</Button></div>}
        </form>
      )}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </div>
  )
}

function CustomEditor({ monitor, comp, kind, onSaved }) {
  const { currentOrg } = useAuth()
  const start = comp.custom && (comp.custom.variables?.length || comp.custom.invariants?.length) ? comp.custom
    : { ...CUSTOM_TEMPLATE, variables: CUSTOM_TEMPLATE.variables.map((v) => ({ ...v, contract: kind?.roles?.[0] || '' })) }
  const [text, setText] = useState(JSON.stringify(start, null, 2))
  const [check, setCheck] = useState(null)
  const [msg, setMsg] = useState(null)
  function parse() {
    try {
      return JSON.parse(text)
    } catch (err) {
      setCheck({ valid: false, errors: [`Not JSON: ${err.message}`] })
      return null
    }
  }
  async function validate() {
    setMsg(null)
    const body = parse()
    if (!body) return
    try {
      setCheck(await watchCall(currentOrg.id, `/monitors/${monitor.id}/components/${comp.id}/custom/validate`, 'POST', body))
    } catch (err) {
      setCheck({ valid: false, errors: [errorMessage(err)] })
    }
  }
  async function save() {
    setMsg(null)
    const body = parse()
    if (!body) return
    try {
      await watchCall(currentOrg.id, `/monitors/${monitor.id}/components/${comp.id}/custom`, 'PUT', body)
      setCheck(null)
      setMsg('Saved. New custom invariants run in a 24 hour shadow period after a dry run over the recent blocks.')
      onSaved()
    } catch (err) {
      setCheck({ valid: false, errors: [errorMessage(err)] })
    }
  }
  return (
    <div className="grid gap-3">
      <p className="text-xs text-fg-3">Variables read a view call, an ERC20 or native balance, or a storage slot of a role ({kind?.roles?.join(', ')}). Invariant ids start with custom-; expressions use the kind's variables, parameters and roles too, with prev, change_pct, max_over and the rest.</p>
      <div className="font-mono text-xs">
        <TextArea id={`custom-${comp.id}`} label="Custom variables and invariants (JSON)" rows={12} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={validate}>Check</Button>
        <Button size="sm" onClick={save}>Save custom</Button>
      </div>
      {check && (check.valid
        ? <Alert tone="info">Valid: {check.invariants?.length || 0} invariants, variables {Object.entries(check.variables || {}).map(([k, t]) => `${k} (${t})`).join(', ') || 'none'}.</Alert>
        : <Alert><ul className="grid gap-1">{check.errors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>)}
      {msg && <Alert tone="info">{msg}</Alert>}
    </div>
  )
}

function ComponentCard({ monitor, comp, kind, access, enterprise, editable, onSaved }) {
  const [view, setView] = useState('invariants')
  const shadow = comp.shadow_until && new Date(comp.shadow_until) > new Date()
  const views = [{ value: 'invariants', label: 'Invariants' }, { value: 'state', label: 'State' }, { value: 'custom', label: 'Custom' }]
  return (
    <Card title={comp.label} description={kind ? `${kind.name}: ${kind.description}` : comp.kind}
      actions={<span className="flex flex-wrap items-center gap-1.5">{comp.health === 'degraded' ? <Badge tone="warning" dot>Degraded</Badge> : <Badge tone="good" dot>Reading</Badge>}
        {shadow && <Badge>Shadow until {dateTime(comp.shadow_until)}</Badge>}</span>}>
      {comp.health_reason && <div className="mb-3"><Alert tone="info">{comp.health_reason}</Alert></div>}
      <dl className="mb-4 grid gap-1 text-xs sm:grid-cols-2">
        {Object.entries(comp.bind).map(([role, a]) => (
          <div key={role} className="flex gap-2"><dt className="w-20 shrink-0 text-fg-3">{role}</dt><dd className="min-w-0 truncate"><AddressLink chain={monitor.chain} address={a} /></dd></div>
        ))}
      </dl>
      <div className="mb-3"><Segmented label="View" value={view} onChange={setView} options={views} /></div>
      {view === 'invariants' && <Invariants monitor={monitor} comp={comp} kind={kind} editable={editable} maxInvariants={access.max_invariants} onSaved={onSaved} />}
      {view === 'state' && <StateChart monitorId={monitor.id} comp={comp} />}
      {view === 'custom' && (enterprise ? (editable ? <CustomEditor monitor={monitor} comp={comp} kind={kind} onSaved={onSaved} />
        : <EmptyState compact title="Admins write custom invariants" />) : <WatchLocked need="enterprise" what="Custom variables and invariants" compact />)}
    </Card>
  )
}

export default function WatchMonitor() {
  const { monitorId } = useParams()
  const { currentOrg, can } = useAuth()
  const navigate = useNavigate()
  const { access, enterprise } = useWatchAccess()
  const r = useWatch(`/monitors/${monitorId}`)
  const lib = useWatch('/library')
  const vs = useWatch(`/violations?monitor=${monitorId}&limit=50`)
  const [msg, setMsg] = useState(null)
  const [confirm, setConfirm] = useState(false)
  if (r.error && !r.data) return <div><PageHeader title="Monitor" back="/dashboard/watch" /><Card><WatchError status={r.status} error={r.error} onRetry={r.reload} /></Card></div>
  if (!r.data || !access) return <PageSkeleton cards={3} />
  const m = r.data
  const kinds = Object.fromEntries((lib.data?.kinds || []).map((k) => [k.id, k]))
  const configure = can('watch:configure')
  const write = can('watch:write')
  async function act(path, method, body, done) {
    setMsg(null)
    try {
      const out = await watchCall(currentOrg.id, `/monitors/${m.id}${path}`, method, body)
      if (done) done(out)
      else r.reload()
    } catch (err) {
      setMsg(errorMessage(err))
    }
  }
  const other = m.level === 'full' ? 'standard' : 'full'
  return (
    <div className="grid gap-4">
      <PageHeader title={m.name} back="/dashboard/watch"
        description={`${m.components.length} component${m.components.length === 1 ? '' : 's'} on ${m.chain}, checked at every block. ${m.health_reason || ''}`}
        meta={<span className="flex flex-wrap items-center gap-1.5"><HealthBadge health={m.health} pulse /><LevelBadge level={m.level} /><ChainName chain={m.chain} />
          <BillingBadge billing={m.billing} />{m.status === 'paused' && <Badge>Paused</Badge>}</span>}
        actions={(
          <span className="flex flex-wrap gap-2">
            {configure && access.levels.includes(other) && (
              <Button size="sm" variant="ghost" onClick={() => act('/level', 'PUT', { level: other }, (out) => r.setData(out))}>
                Move to {other === 'full' ? 'Full' : 'Standard'} ({access.monthly_credits?.[other]} a month)
              </Button>
            )}
            {write && m.status === 'active' && <Button size="sm" variant="ghost" onClick={() => act('/pause', 'POST')}>Pause</Button>}
            {write && m.status === 'paused' && <Button size="sm" variant="ghost" onClick={() => act('/resume', 'POST')}>Resume</Button>}
            {write && (confirm
              ? <Button size="sm" variant="danger" onClick={() => act('', 'DELETE', undefined, () => navigate('/dashboard/watch'))}>Confirm removal</Button>
              : <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>Remove</Button>)}
          </span>
        )} />
      {msg && <Alert>{msg}</Alert>}
      {m.billing === 'grace' && <Alert tone="info">Watch could not charge this protocol on {m.grace_since?.slice(0, 10)}. It keeps running for 3 days of grace, then pauses until the balance covers a day.</Alert>}
      {m.billing === 'paused' && <Alert>Monitoring is paused: the balance did not cover a day after 3 days of grace. Topping up resumes it at the next daily charge.</Alert>}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="grid min-w-0 gap-4 xl:col-span-2">
          {m.components.map((c) => (
            <ComponentCard key={c.id} monitor={m} comp={c} kind={kinds[c.kind]} access={access} enterprise={enterprise} editable={configure} onSaved={r.reload} />
          ))}
          <Card flush title="Violation episodes">
            <ViolationTable rows={vs.data?.violations} loading={!vs.data} showMonitor={false} />
          </Card>
        </div>
        <div className="grid min-w-0 gap-4">
          <Card title="Cost">
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-fg-3">A month</dt><dd className="text-right tnum">{access.monthly_credits?.[m.level]} credits</dd>
              <dt className="text-fg-3">A day</dt><dd className="text-right tnum">{credits(access.daily_millicredits?.[m.level])} credits</dd>
              <dt className="text-fg-3">Since</dt><dd className="text-right">{dateTime(m.created_at)}</dd>
            </dl>
          </Card>
          <Card title="Health history">
            {m.health_history.length === 0 ? <p className="text-sm text-fg-3">Healthy since it was added.</p> : (
              <ol className="grid gap-2 text-sm">
                {m.health_history.map((h) => (
                  <li key={`${h.at}-${h.health}`} className="grid gap-0.5">
                    <span className="flex items-center justify-between gap-2"><HealthBadge health={h.health} /><span className="text-xs text-fg-3" title={dateTime(h.at)}>{ago(h.at)}</span></span>
                    {h.reason && <span className="text-xs text-fg-3">{h.reason}{h.block ? ` (block ${num(h.block)})` : ''}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
