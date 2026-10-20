import { useEffect, useState } from 'react'
import { CHART, Legend, SrTable, Tooltip, columnPath, niceScale, useWidth, xTicks } from './chartKit.jsx'

const PAD = { top: 12, right: 12, bottom: 24, left: 36 }
const TIP_MS = 2500

// TimeChart plots daily series as lines (optionally with a 10% area wash)
// or as stacked columns, with one y axis, a crosshair or per-column hover,
// and a tooltip listing every series at that day.
//
// data:   [{ label, ...values }]
// series: [{ key, label, color }]
export default function TimeChart({ data, series, kind = 'line', area, height = 220, yMax, format = (v) => v, caption, stale }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  // The readout shows for a moment each time the hovered day changes, then
  // fades so it never sits on top of the chart; the crosshair stays.
  const [tip, setTip] = useState(false)
  useEffect(() => {
    if (hover == null) return setTip(false)
    setTip(true)
    const t = setTimeout(() => setTip(false), TIP_MS)
    return () => clearTimeout(t)
  }, [hover])
  const n = data.length
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const stackTotal = (d) => series.reduce((a, s) => a + (d[s.key] || 0), 0)
  const peak = yMax ?? Math.max(0, ...data.map((d) => (kind === 'stacked' ? stackTotal(d) : Math.max(...series.map((s) => d[s.key] || 0)))))
  const { top, step } = niceScale(peak)
  const y = (v) => PAD.top + innerH - (v / top) * innerH
  const band = n ? innerW / n : 0
  const cx = (i) => (kind === 'line' ? PAD.left + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1)) : PAD.left + band * i + band / 2)
  const barW = Math.min(24, Math.max(2, band * 0.62))
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v)
  const labels = xTicks(n, Math.max(2, Math.floor(innerW / 64)))

  function pick(evt) {
    const rect = evt.currentTarget.getBoundingClientRect()
    const px = evt.clientX - rect.left - PAD.left
    const i = kind === 'line' ? Math.round((px / innerW) * (n - 1)) : Math.floor(px / band)
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  function onKey(e) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1))
    else if (e.key === 'Escape') setHover(null)
  }

  return (
    <div className={`grid min-w-0 grid-cols-1 gap-3 transition-opacity ${stale ? 'opacity-60' : ''}`}>
      <Legend series={series} kind={kind === 'line' ? 'line' : 'square'} />
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && n > 0 && (
          <svg width={width} height={height} role="img" aria-label={caption} tabIndex={0} onKeyDown={onKey}
            onPointerMove={pick} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
            className="block outline-none focus-visible:ring-1 focus-visible:ring-accent/60 rounded">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? CHART.axis : CHART.grid} strokeWidth="1" />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="10" fill={CHART.label} className="tnum">{format(t)}</text>
              </g>
            ))}
            {labels.map((i) => (
              <text key={i} x={cx(i)} y={height - 6} textAnchor={i === n - 1 && kind === 'line' ? 'end' : i === 0 && kind === 'line' ? 'start' : 'middle'}
                fontSize="10" fill={CHART.label}>{data[i].label}</text>
            ))}

            {kind === 'stacked' && data.map((d, i) => {
              let base = 0
              return (
                <g key={i} opacity={hover == null || hover === i ? 1 : 0.55}>
                  {series.map((s, si) => {
                    const v = d[s.key] || 0
                    if (!v) return null
                    const y0 = y(base)
                    base += v
                    const y1 = y(base)
                    const isTop = series.slice(si + 1).every((t) => !d[t.key])
                    // 2px surface gap between stacked segments.
                    const h = Math.max(1, y0 - y1 - (base - v > 0 ? 2 : 0))
                    const x = cx(i) - barW / 2
                    return isTop
                      ? <path key={s.key} d={columnPath(x, y1, barW, h)} fill={s.color} />
                      : <rect key={s.key} x={x} y={y1} width={barW} height={h} fill={s.color} />
                  })}
                </g>
              )
            })}

            {kind === 'line' && series.map((s) => {
              const pts = data.map((d, i) => [cx(i), y(d[s.key] || 0)])
              const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join('')
              return (
                <g key={s.key}>
                  {area && <path d={`${line}L${pts[pts.length - 1][0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill={s.color} opacity="0.1" />}
                  <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {n > 0 && <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4" fill={s.color} stroke={CHART.surface} strokeWidth="2" />}
                </g>
              )
            })}

            {hover != null && kind === 'line' && (
              <g>
                <line x1={cx(hover)} x2={cx(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke={CHART.axis} strokeWidth="1" />
                {series.map((s) => <circle key={s.key} cx={cx(hover)} cy={y(data[hover][s.key] || 0)} r="4" fill={s.color} stroke={CHART.surface} strokeWidth="2" />)}
              </g>
            )}
          </svg>
        )}
        {hover != null && width > 0 && (
          <Tooltip visible={tip} x={cx(hover)} width={width} title={data[hover].title || data[hover].label}
            rows={[...series].reverse().map((s) => ({ label: s.label, color: s.color, value: format(data[hover][s.key] || 0) }))} />
        )}
      </div>
      <SrTable caption={caption} columns={['Day', ...series.map((s) => s.label)]}
        rows={data.map((d) => [d.title || d.label, ...series.map((s) => format(d[s.key] || 0))])} />
    </div>
  )
}
