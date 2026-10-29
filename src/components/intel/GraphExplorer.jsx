import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Expand, Maximize2, Minus, Plus, Route } from 'lucide-react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { errorMessage } from '../common/Alert.jsx'
import Button from '../common/Button.jsx'
import Badge from '../ui/Badge.jsx'
import { FilterSelect } from '../ui/Controls.jsx'
import { IntelError, isAddress, nodePath, short } from './IntelKit.jsx'

// GraphExplorer draws the Threat Graph around a node: click a node to see
// it, expand it to load its neighbours, ask for the shortest path to
// another address. The layout is a small force simulation in SVG; graphs
// here stay at a few hundred nodes, so no graph library is needed.

const KIND_COLOR = {
  address: 'var(--color-steel-light)',
  contract: 'var(--color-accent)',
  token: 'var(--color-series-2)',
  protocol: 'var(--color-staff)',
  exploit: 'var(--color-critical)',
  proposal: 'var(--color-series-1)',
  risk_event: 'var(--color-serious)',
}
const KIND_LABEL = { address: 'Account', contract: 'Contract', token: 'Token', protocol: 'Protocol', exploit: 'Incident', proposal: 'Proposal', risk_event: 'Risk event' }

export const RELATIONS = [
  { value: '', label: 'All relationships' },
  { value: 'DEPLOYED,FUNDED', label: 'Deployment and funding' },
  { value: 'OWNS,ADMIN_OF,HAS_ROLE,PROXY_OF,USES_BEACON', label: 'Control' },
  { value: 'BELONGS_TO', label: 'Protocols' },
  { value: 'SUFFERED,INVOLVED_IN,FLAGGED', label: 'Incidents and risk' },
  { value: 'TRANSFERRED,HOLDS', label: 'Token flows' },
  { value: 'PROPOSED,VOTED,TARGETS,GOVERNED_BY', label: 'Governance' },
]

const W = 900
const H = 560

// tags are a node's Intel labels; node.labels are the graph's own labels
// (Address, Contract), which the colour already shows.
const tags = (n) => (Array.isArray(n.facts?.labels) ? n.facts.labels : [])

function nodeName(n) {
  if (n.name) return n.name
  if (tags(n).length) return tags(n)[0]
  if (n.address) return short(n.address)
  return n.id.split(':').slice(1).join(':')
}

// tick moves the layout one step: nodes push each other apart, edges pull
// their ends together, everything drifts to the middle.
function tick(nodes, edges, alpha) {
  const list = [...nodes.values()]
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]
      let dx = a.x - b.x
      let dy = a.y - b.y
      let d2 = dx * dx + dy * dy
      if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1 }
      if (d2 > 90000) continue
      const f = (900 * alpha) / d2
      a.vx += dx * f; a.vy += dy * f
      b.vx -= dx * f; b.vy -= dy * f
    }
  }
  for (const e of edges) {
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const f = ((d - 70) / d) * 0.06 * alpha
    a.vx += dx * f; a.vy += dy * f
    b.vx -= dx * f; b.vy -= dy * f
  }
  for (const n of list) {
    n.vx += (W / 2 - n.x) * 0.004 * alpha
    n.vy += (H / 2 - n.y) * 0.004 * alpha
    if (n.pinned) { n.vx = 0; n.vy = 0; continue }
    n.vx *= 0.6; n.vy *= 0.6
    n.x += n.vx; n.y += n.vy
  }
}

export default function GraphExplorer({ start, height = 'h-[26rem] sm:h-[32rem]', fullLink = true }) {
  const { currentOrg } = useAuth()
  const base = `/api/v1/orgs/${currentOrg.id}/intel/graph`
  const graph = useRef({ nodes: new Map(), edges: [] })
  const [, setFrame] = useState(0)
  const [selected, setSelected] = useState(start)
  const [expanded, setExpanded] = useState(new Set())
  const [types, setTypes] = useState('')
  const [depth, setDepth] = useState('1')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState(null)
  const [note, setNote] = useState('')
  const [pathTo, setPathTo] = useState('')
  const [onPath, setOnPath] = useState(new Set())
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const svg = useRef(null)
  const anim = useRef(0)
  const drag = useRef(null)

  const run = useCallback((steps = 220) => {
    cancelAnimationFrame(anim.current)
    let alpha = 1
    let n = 0
    const step = () => {
      const g = graph.current
      for (let i = 0; i < 3; i++) tick(g.nodes, g.edges, alpha)
      alpha *= 0.97
      setFrame((f) => f + 1)
      if (++n < steps && alpha > 0.02) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  // On a phone the drawing is scaled down to the screen: start zoomed in.
  useEffect(() => {
    const w = svg.current?.clientWidth || W
    if (w < 500) setView({ k: 1.8, x: (W / 2) * (1 - 1.8), y: (H / 2) * (1 - 1.8) })
  }, [])

  // merge adds a subgraph, placing new nodes around the one they came from.
  const merge = useCallback((sub, near) => {
    const g = graph.current
    const origin = g.nodes.get(near) || { x: W / 2, y: H / 2 }
    for (const n of sub.nodes || []) {
      const had = g.nodes.get(n.id)
      if (had) { Object.assign(had, n, { x: had.x, y: had.y, vx: had.vx, vy: had.vy, pinned: had.pinned }); continue }
      const a = Math.random() * Math.PI * 2
      g.nodes.set(n.id, { ...n, x: origin.x + Math.cos(a) * 60, y: origin.y + Math.sin(a) * 60, vx: 0, vy: 0 })
    }
    const seen = new Set(g.edges.map((e) => `${e.from}>${e.to}>${e.type}`))
    for (const e of sub.edges || []) {
      const k = `${e.from}>${e.to}>${e.type}`
      if (!seen.has(k)) { g.edges.push(e); seen.add(k) }
    }
    run()
  }, [run])

  const expand = useCallback(async (id, reset = false) => {
    setBusy(true)
    setFailure(null)
    try {
      const q = new URLSearchParams({ node: id, depth, limit: '150' })
      if (types) q.set('types', types)
      const sub = await api(`${base}/neighborhood?${q}`)
      if (reset) { graph.current = { nodes: new Map(), edges: [] }; setOnPath(new Set()); setExpanded(new Set()) }
      merge(sub, id)
      setExpanded((s) => new Set([...(reset ? [] : s), id]))
      setNote(sub.truncated ? 'Some neighbours were left out to keep the picture readable; expand nodes to see more.' : '')
    } catch (err) {
      setFailure({ status: err.status, error: errorMessage(err) })
    }
    setBusy(false)
  }, [base, depth, types, merge])

  useEffect(() => {
    if (!start) return
    setSelected(start)
    expand(start, true)
    // Filters change what is loaded: start over from the start node.
  }, [start, types, depth]) // eslint-disable-line react-hooks/exhaustive-deps

  async function findPath(e) {
    e?.preventDefault()
    const target = pathTo.trim()
    let to = target
    if (isAddress(target)) {
      const chain = start.split(':')[1]
      to = `address:${chain}:${target.toLowerCase()}`
    }
    if (!to.includes(':')) { setNote('Give a 0x address, or a node ID such as protocol:aave-v3.'); return }
    setBusy(true)
    setFailure(null)
    try {
      const r = await api(`${base}/path?${new URLSearchParams({ from: selected || start, to, max_depth: '6' })}`)
      if (!r.found) { setNote('No link within 6 hops.'); setOnPath(new Set()) } else {
        merge(r, selected || start)
        setOnPath(new Set([...r.nodes.map((n) => n.id), ...r.edges.map((x) => `${x.from}>${x.to}>${x.type}`)]))
        setNote(`Linked in ${r.edges.length} ${r.edges.length === 1 ? 'hop' : 'hops'}.`)
      }
    } catch (err) {
      setFailure({ status: err.status, error: errorMessage(err) })
    }
    setBusy(false)
  }

  // Panning drags the background; zooming keeps the point under the
  // pointer still.
  function toSvg(evt) {
    const r = svg.current.getBoundingClientRect()
    return { x: ((evt.clientX - r.left) / r.width) * W, y: ((evt.clientY - r.top) / r.height) * H }
  }
  function onWheel(evt) {
    const p = toSvg(evt)
    const k = Math.min(4, Math.max(0.25, view.k * (evt.deltaY < 0 ? 1.15 : 1 / 1.15)))
    setView({ k, x: p.x - ((p.x - view.x) * k) / view.k, y: p.y - ((p.y - view.y) * k) / view.k })
  }
  function zoom(f) {
    const k = Math.min(4, Math.max(0.25, view.k * f))
    setView({ k, x: W / 2 - ((W / 2 - view.x) * k) / view.k, y: H / 2 - ((H / 2 - view.y) * k) / view.k })
  }
  function onPointerDown(evt, id) {
    evt.stopPropagation()
    const p = toSvg(evt)
    drag.current = { id, p, view, moved: false }
    svg.current.setPointerCapture?.(evt.pointerId)
  }
  function onPointerMove(evt) {
    const d = drag.current
    if (!d) return
    const p = toSvg(evt)
    const dx = p.x - d.p.x
    const dy = p.y - d.p.y
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    if (d.id) {
      const n = graph.current.nodes.get(d.id)
      if (n) { n.x += dx / view.k; n.y += dy / view.k; n.pinned = true; d.p = p; setFrame((f) => f + 1) }
    } else {
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy })
    }
  }
  function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (d?.id && !d.moved) setSelected(d.id)
  }

  const g = graph.current
  const nodes = [...g.nodes.values()]
  const sel = g.nodes.get(selected)
  const selEdges = useMemo(() => g.edges.filter((e) => e.from === selected || e.to === selected), [g.edges, selected, nodes.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const to = sel && nodePath(sel.id)

  if (failure && nodes.length === 0) return <IntelError {...failure} what="The Threat Graph" onRetry={() => expand(start, true)} />
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect id="graph-types" label="Show" value={types} onChange={setTypes} options={RELATIONS} />
        <FilterSelect id="graph-depth" label="Depth" value={depth} onChange={setDepth} options={[{ value: '1', label: '1 hop' }, { value: '2', label: '2 hops' }]} />
        <form onSubmit={findPath} className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
          <input value={pathTo} onChange={(e) => setPathTo(e.target.value)} placeholder="Path to 0x address or node ID" aria-label="Find the shortest path to"
            className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-accent/60" />
          <Button size="sm" variant="ghost" type="submit" disabled={busy || !pathTo.trim()}><Route size={14} aria-hidden /> Path</Button>
        </form>
        {fullLink && <Button size="sm" variant="ghost" to={`/dashboard/intel/graph?node=${encodeURIComponent(start)}`}><Maximize2 size={14} aria-hidden /> Full screen</Button>}
      </div>
      {(note || busy || failure) && <p className="text-xs text-fg-3" role="status">{busy ? 'Loading the graph' : failure ? failure.error : note}</p>}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className={`relative overflow-hidden rounded-lg border border-line bg-app ${height}`}>
          <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="h-full w-full touch-none select-none" role="img" aria-label={`Threat Graph around ${sel ? nodeName(sel) : 'the node'}: ${nodes.length} nodes, ${g.edges.length} relationships`}
            onWheel={onWheel} onPointerDown={(e) => onPointerDown(e, null)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {g.edges.map((e) => {
                const a = g.nodes.get(e.from)
                const b = g.nodes.get(e.to)
                if (!a || !b) return null
                const hot = onPath.has(`${e.from}>${e.to}>${e.type}`)
                const near = e.from === selected || e.to === selected
                return (
                  <g key={`${e.from}>${e.to}>${e.type}`}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? 'var(--color-staff)' : near ? 'var(--color-fg-2)' : 'var(--color-line-strong)'} strokeWidth={hot ? 2.5 : near ? 1.4 : 1} />
                    {(near || hot) && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 3} textAnchor="middle" fontSize="8" fill="var(--color-fg-3)">{e.type.toLowerCase().replaceAll('_', ' ')}</text>}
                  </g>
                )
              })}
              {nodes.map((n) => {
                const r = n.id === start ? 11 : Math.min(10, 5 + Math.log2(1 + (n.degree || 0)))
                const isSel = n.id === selected
                return (
                  <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="cursor-pointer" onPointerDown={(e) => onPointerDown(e, n.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); expand(n.id) }}>
                    <circle r={r + (isSel ? 4 : 0)} fill="none" stroke={isSel ? 'var(--color-fg)' : onPath.has(n.id) ? 'var(--color-staff)' : 'none'} strokeWidth="1.5" />
                    <circle r={r} fill={KIND_COLOR[n.kind] || 'var(--color-grey)'} stroke={n.super ? 'var(--color-warning)' : 'var(--color-app)'} strokeWidth={n.super ? 2 : 1.5} />
                    {(isSel || n.id === start || nodes.length <= 40 || onPath.has(n.id)) && (
                      <text y={r + 11} textAnchor="middle" fontSize="9" fill={isSel ? 'var(--color-fg)' : 'var(--color-fg-2)'}>{nodeName(n).slice(0, 24)}</text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
          <div className="absolute right-2 top-2 grid gap-1">
            <button type="button" aria-label="Zoom in" onClick={() => zoom(1.25)} className="grid size-7 place-items-center rounded-md border border-line bg-surface-2 text-fg-2 hover:text-fg"><Plus size={14} /></button>
            <button type="button" aria-label="Zoom out" onClick={() => zoom(0.8)} className="grid size-7 place-items-center rounded-md border border-line bg-surface-2 text-fg-2 hover:text-fg"><Minus size={14} /></button>
            <button type="button" aria-label="Fit" onClick={() => setView({ x: 0, y: 0, k: 1 })} className="grid size-7 place-items-center rounded-md border border-line bg-surface-2 text-fg-2 hover:text-fg"><Crosshair size={14} /></button>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-fg-3">
            {Object.entries(KIND_LABEL).filter(([k]) => nodes.some((n) => n.kind === k)).map(([k, l]) => (
              <span key={k} className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: KIND_COLOR[k] }} />{l}</span>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-lg border border-line p-3 text-xs">
          {!sel ? <p className="text-fg-3">Select a node.</p> : (
            <>
              <div className="grid gap-1">
                <span className="text-fg-3">{KIND_LABEL[sel.kind] || sel.kind}{sel.chain ? ` on ${sel.chain}` : ''}</span>
                <span className="break-all text-sm font-medium text-fg">{nodeName(sel)}</span>
                {sel.address && <span className="break-all font-mono text-fg-2">{sel.address}</span>}
                <div className="flex flex-wrap gap-1">
                  {tags(sel).slice(0, 4).map((l) => <Badge key={l}>{l}</Badge>)}
                  {sel.super && <Badge tone="warning">Hub: {sel.degree} links, not all drawn</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!expanded.has(sel.id) && <Button size="sm" onClick={() => expand(sel.id)} disabled={busy}><Expand size={13} aria-hidden /> Expand</Button>}
                {to && <Button size="sm" variant="ghost" to={to}>Open</Button>}
              </div>
              {sel.facts && Object.keys(sel.facts).length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {Object.entries(sel.facts).filter(([k]) => k !== 'labels').slice(0, 8).map(([k, v]) => (
                    <div key={k} className="contents"><dt className="text-fg-3">{k.replaceAll('_', ' ')}</dt><dd className="break-all text-fg-2">{Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? v.toLocaleString('en', { maximumFractionDigits: 2 }) : String(v)}</dd></div>
                  ))}
                </dl>
              )}
              <div className="grid gap-1">
                <span className="text-fg-3">{selEdges.length} relationships drawn</span>
                <ul className="grid max-h-48 gap-1 overflow-y-auto scrollbar-thin">
                  {selEdges.slice(0, 40).map((e) => {
                    const other = g.nodes.get(e.from === sel.id ? e.to : e.from)
                    return (
                      <li key={`${e.from}>${e.to}>${e.type}`}>
                        <button type="button" onClick={() => setSelected(other?.id)} className="flex w-full gap-2 text-left hover:text-fg">
                          <span className="shrink-0 text-fg-3">{e.from === sel.id ? '→' : '←'} {e.type.toLowerCase().replaceAll('_', ' ')}</span>
                          <span className="truncate text-fg-2">{other ? nodeName(other) : ''}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
          <p className="text-fg-3">Drag to move, scroll to zoom, double-click a node to expand it.</p>
        </div>
      </div>
    </div>
  )
}
