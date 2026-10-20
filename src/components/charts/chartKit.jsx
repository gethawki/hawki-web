import { useEffect, useRef, useState } from 'react'

// useWidth measures a container so charts draw at real pixel sizes (marks
// keep their thickness at any width). Zero until mounted.
export function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// niceMax rounds a maximum up to a clean axis top with `ticks` steps.
export function niceScale(max, ticks = 4) {
  if (!max || max <= 0) return { top: ticks, step: 1 }
  const raw = max / ticks
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  return { top: step * ticks, step }
}

export const CHART = {
  grid: '#26262a',
  axis: '#3a3a40',
  label: '#6f6f76',
  surface: '#111112',
}

// Legend lists series with a key that mirrors the mark (line or square).
export function Legend({ series, kind = 'square' }) {
  if (series.length < 2) return null
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          {kind === 'line'
            ? <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            : <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />}
          {s.label}
        </li>
      ))}
    </ul>
  )
}

// Tooltip is the one readout for every series at the hovered position:
// value first and strong, the series name after it.
export function Tooltip({ x, width, title, rows }) {
  const left = Math.min(Math.max(x + 12, 0), Math.max(0, width - 180))
  return (
    <div role="status" className="pointer-events-none absolute top-1 z-10 w-[168px] rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2 shadow-xl backdrop-blur"
      style={{ left }}>
      <div className="mb-1 text-[0.7rem] text-fg-3">{title}</div>
      <ul className="grid gap-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            <span className="h-0.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="tnum font-medium text-fg">{r.value}</span>
            <span className="truncate text-fg-3">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// DataTable is the chart's table view, read by screen readers.
export function SrTable({ caption, columns, rows }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
    </table>
  )
}

// xTicks picks a few evenly spaced label positions, always the last one.
export function xTicks(n, maxLabels) {
  if (n <= maxLabels) return [...Array(n).keys()]
  const step = Math.ceil((n - 1) / (maxLabels - 1))
  const out = []
  for (let i = n - 1; i >= 0; i -= step) out.unshift(i)
  return out
}

// topRounded draws a column whose data end has 4px rounded corners and whose
// baseline end is square.
export function columnPath(x, y, w, h, r = 4) {
  if (h <= 0) return ''
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}
