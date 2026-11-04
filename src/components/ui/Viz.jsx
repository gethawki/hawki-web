import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Visual building blocks of the security console: a score ring, a radar
// breakdown, a donut, contributor bars, an expandable list and a timeline.
// All hand-drawn SVG and every figure is also written out as text.

const bandColor = (score) =>
  score >= 80 ? 'var(--color-good)' : score >= 60 ? 'var(--color-warning)' : score >= 40 ? 'var(--color-serious)' : 'var(--color-critical)'

export const scoreBand = (score) => (score == null ? 'No data' : score >= 80 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Weak' : 'Critical')

// ScoreRing draws a 0 to max score as a ring with the number inside and a
// band name under it ("87, Good").
export function ScoreRing({ value, max = 100, size = 132, stroke = 10, label, sub, color }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = value == null ? 0 : Math.max(0, Math.min(max, value))
  const col = color || bandColor((v / max) * 100)
  return (
    <figure className="grid justify-items-center gap-1.5" aria-label={`${label || 'Score'} ${value ?? 'not available'} of ${max}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - v / max)} style={{ transition: 'stroke-dashoffset .6s ease', filter: `drop-shadow(0 0 6px color-mix(in oklab, ${col} 45%, transparent))` }} />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[1.9rem] font-semibold leading-none tracking-tight text-fg tnum" style={{ fontSize: size / 4.2 }}>{value ?? '-'}</span>
          {max !== 100 && <span className="text-[0.7rem] text-fg-3">of {max}</span>}
        </div>
      </div>
      {label && <figcaption className="text-xs text-fg-2">{label}</figcaption>}
      {sub !== false && <span className="text-xs font-medium" style={{ color: col }}>{sub ?? scoreBand(value == null ? null : (v / max) * 100)}</span>}
    </figure>
  )
}

// Radar compares a set of 0 to 100 axes, optionally against a second
// series (a dashed reference such as last period). axes: [{ label, value,
// compare }].
export function Radar({ axes, size = 260, label = 'Score', compareLabel }) {
  const n = axes.length
  if (n < 3) return null
  const padX = 70
  const cx = size / 2 + padX
  const cy = size / 2
  const R = size / 2 - 40
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]
  }
  const poly = (key) => axes.map((a, i) => pt(i, Math.max(0, Math.min(100, a[key] ?? 0))).map((x) => x.toFixed(1)).join(',')).join(' ')
  const hasCompare = axes.some((a) => a.compare != null)
  return (
    <figure className="grid justify-items-center gap-2">
      <svg viewBox={`0 0 ${size + padX * 2} ${size}`} className="w-full max-w-[24rem]" role="img" aria-label={axes.map((a) => `${a.label} ${Math.round(a.value)}`).join(', ')}>
        {[25, 50, 75, 100].map((g) => (
          <polygon key={g} points={axes.map((_, i) => pt(i, g).join(',')).join(' ')} fill="none" stroke="var(--color-line)" strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-line)" strokeWidth="1" />
        })}
        {hasCompare && <polygon points={poly('compare')} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />}
        <polygon points={poly('value')} fill="color-mix(in oklab, var(--color-good) 18%, transparent)" stroke="var(--color-good)" strokeWidth="2" strokeLinejoin="round" />
        {axes.map((a, i) => {
          const [x, y] = pt(i, Math.max(0, Math.min(100, a.value)))
          return <circle key={a.label} cx={x} cy={y} r="3.5" fill="var(--color-good)" stroke="var(--color-surface)" strokeWidth="1.5" />
        })}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 122)
          const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end'
          return (
            <g key={a.label}>
              <text x={x} y={y - 4} textAnchor={anchor} fontSize="11" fill="var(--color-fg-2)">{a.label}</text>
              <text x={x} y={y + 10} textAnchor={anchor} fontSize="12" fontWeight="600" fill="var(--color-fg)">{Math.round(a.value)}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="flex flex-wrap justify-center gap-4 text-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-good" />{label}</span>
        {hasCompare && <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-accent" />{compareLabel || 'Compared with'}</span>}
      </figcaption>
    </figure>
  )
}

// Donut splits a total into parts with a legend that carries the counts.
// parts: [{ label, value, color }].
export function Donut({ parts, size = 140, stroke = 18, center, centerLabel }) {
  const total = parts.reduce((a, p) => a + (p.value || 0), 0)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={parts.map((p) => `${p.value} ${p.label}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
          {total > 0 && parts.filter((p) => p.value > 0).map((p) => {
            const len = (p.value / total) * c
            const el = <circle key={p.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />
            offset += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-xl font-semibold text-fg tnum" title={total.toLocaleString()}>{center ?? (total >= 100000 ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(total) : total.toLocaleString())}</span>
          {centerLabel && <span className="text-[0.68rem] text-fg-3">{centerLabel}</span>}
        </div>
      </div>
      <ul className="grid min-w-[9rem] flex-1 gap-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate text-fg-2">{p.label}</span>
            <span className="tnum font-medium text-fg">{(p.value || 0).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ContributorBars lists what makes up a figure, each with its share as a
// bar ("Top contributors"). items: [{ label, value, display, color }].
export function ContributorBars({ items, max, format = (v) => v, color = 'var(--color-accent)', empty = 'Nothing to show yet.' }) {
  if (!items.length) return <p className="text-sm text-fg-3">{empty}</p>
  const top = max ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="grid min-w-0 grid-cols-1 gap-3">
      {items.map((it) => (
        <li key={it.key || it.label} className="grid min-w-0 grid-cols-1 gap-1.5">
          <div className="flex items-baseline gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-fg-2">{it.label}</span>
            <span className="tnum font-semibold text-fg">{it.display ?? format(it.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3">
            <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.max(it.value > 0 ? 2 : 0, (it.value / top) * 100)}%`, background: it.color || color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// SummaryList is a compact "Risk summary" block: a colored mark, a label and
// a count on each row. items: [{ label, value, color, tone }].
export function SummaryList({ items }) {
  const tones = { bad: 'text-bad', warn: 'text-warn', good: 'text-ok', accent: 'text-accent' }
  return (
    <ul className="grid gap-2 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2.5">
          {i.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} />}
          <span className="min-w-0 flex-1 truncate text-fg-2">{i.label}</span>
          <span className={`tnum font-semibold ${tones[i.tone] || 'text-fg'}`} style={i.color && !i.tone ? { color: `color-mix(in oklab, ${i.color} 75%, white)` } : undefined}>{i.value}</span>
        </li>
      ))}
    </ul>
  )
}

// Expandable is a list of rows that open in place to show their details,
// like the reference's vulnerability list. items: [{ key, icon, title,
// badge, sub, meta, body }].
export function Expandable({ items, empty }) {
  const [open, setOpen] = useState(null)
  if (!items.length) return empty || null
  return (
    <ul className="grid min-w-0 grid-cols-1 gap-2">
      {items.map((it) => {
        const isOpen = open === it.key
        return (
          <li key={it.key} className={`min-w-0 rounded-xl border transition ${isOpen ? 'border-accent/40 bg-surface-2' : 'border-line bg-surface-2/50 hover:border-line-strong'}`}>
            <div className="flex items-start gap-3 px-3.5 py-3">
              {it.icon && <span className="mt-0.5 shrink-0">{it.icon}</span>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{it.title}</span>
                  {it.badge}
                </div>
                {it.sub && <p className="mt-0.5 truncate text-xs text-fg-3">{it.sub}</p>}
              </div>
              {it.meta && <span className="hidden shrink-0 self-center rounded-md bg-surface-3 px-2 py-0.5 text-[0.7rem] text-fg-3 sm:inline">{it.meta}</span>}
              {it.body && (
                <button type="button" onClick={() => setOpen(isOpen ? null : it.key)} aria-expanded={isOpen}
                  className="inline-flex shrink-0 items-center gap-1 self-center rounded-lg border border-line px-2.5 py-1 text-xs text-fg-2 transition hover:border-accent/40 hover:text-fg">
                  Details <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            {isOpen && <div className="border-t border-line px-3.5 py-3 text-sm text-fg-2">{it.body}</div>}
          </li>
        )
      })}
    </ul>
  )
}

// Timeline lists events in order with a dot on a rail; done steps are
// filled, pending ones hollow. items: [{ key, title, at, done, tone }].
export function Timeline({ items, empty = 'Nothing yet.' }) {
  if (!items.length) return <p className="text-sm text-fg-3">{empty}</p>
  const color = { bad: 'var(--color-critical)', warn: 'var(--color-warning)', good: 'var(--color-good)' }
  return (
    <ol className="relative grid gap-3.5 pl-6 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-line-strong">
      {items.map((it) => {
        const c = color[it.tone] || 'var(--color-accent)'
        return (
          <li key={it.key || it.title} className="relative flex items-start gap-3 text-sm">
            <span className="absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-2" style={{ borderColor: c, background: it.done === false ? 'var(--color-surface)' : c }} />
            <div className="min-w-0 flex-1">
              <div className="text-fg">{it.title}</div>
              {it.sub && <div className="truncate text-xs text-fg-3">{it.sub}</div>}
            </div>
            {it.at && <span className="shrink-0 text-xs text-fg-3 tnum">{it.at}</span>}
          </li>
        )
      })}
    </ol>
  )
}
