import { Link } from 'react-router-dom'
import { SEVERITY_COLOR } from '../ui/Badge.jsx'
import { num } from '../../lib/format.js'

// Sparkline is a 2px trend line for stat cards: history in the quiet hue,
// the latest point marked in the accent.
export function Sparkline({ values, width = 96, height = 28, color = 'var(--color-accent)' }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
      <path d={d} fill="none" stroke="var(--color-line-strong)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={pts.slice(-Math.max(2, Math.ceil(values.length / 6))).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')}
        fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} stroke="var(--color-surface)" strokeWidth="2" />
    </svg>
  )
}

// BarList ranks items with a value and a thin bar, for "top N" blocks.
export function BarList({ items, format = num, color = 'var(--color-series-1)', empty = 'Nothing to show yet.' }) {
  if (!items.length) return <p className="text-sm text-fg-3">{empty}</p>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="grid gap-3">
      {items.map((it) => (
        <li key={it.key || it.label} className="grid gap-1.5">
          <div className="flex items-baseline gap-3 text-sm">
            <span className="flex-1 min-w-0 truncate text-fg">{it.href ? <Link to={it.href} className="hover:underline">{it.label}</Link> : it.label}</span>
            {it.note && <span className="hidden sm:inline text-xs text-fg-3 truncate">{it.note}</span>}
            <span className="tnum text-fg-2">{format(it.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: it.color || color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const SEVS = ['critical', 'high', 'medium', 'low']

// SeverityBar is one 100% bar of open findings by severity, with a legend
// that carries the counts so the reading never depends on color.
export function SeverityBar({ counts, legend = true, height = 8 }) {
  const total = SEVS.reduce((a, s) => a + (counts?.[s] || 0), 0)
  return (
    <div className="grid gap-2.5">
      <div className="flex gap-[2px] overflow-hidden rounded-full bg-surface-3" style={{ height }} role="img"
        aria-label={SEVS.map((s) => `${counts?.[s] || 0} ${s}`).join(', ')}>
        {total > 0 && SEVS.map((s) => counts[s] ? <div key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: SEVERITY_COLOR[s] }} /> : null)}
      </div>
      {legend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {SEVS.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5 text-fg-3">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: SEVERITY_COLOR[s] }} />
              <span className="tnum text-fg">{counts?.[s] || 0}</span> {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Meter fills toward a limit; the fill turns warning then critical as it
// nears it, and the track is a quieter step of the same surface.
export function Meter({ value, max, label, invert }) {
  const r = max > 0 ? Math.min(1, value / max) : 0
  const used = invert ? 1 - r : r
  const color = used > 0.9 ? 'var(--color-critical)' : used > 0.75 ? 'var(--color-warning)' : 'var(--color-accent)'
  return (
    <div className="h-1.5 rounded-full bg-surface-3" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.max(r > 0 ? 2 : 0, r * 100)}%`, background: color }} />
    </div>
  )
}
