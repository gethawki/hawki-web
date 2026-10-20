import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Sparkline } from '../charts/Small.jsx'
import { pct } from '../../lib/format.js'

// Delta is a signed change vs a named period. Its color says whether the
// move is good (up is good unless `upIsGood` is false); the arrow and sign
// carry the direction without color.
export function Delta({ value, upIsGood = true, period = 'previous period' }) {
  if (value == null) return <span className="text-xs text-fg-3">no earlier data</span>
  const flat = Math.abs(value) < 0.005
  const good = flat ? null : (value > 0) === upIsGood
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight
  const tone = good == null ? 'text-fg-3' : good ? 'text-[#4cc24c]' : 'text-[#ff8b8b]'
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-medium tnum ${tone}`}>
        <Icon size={13} aria-hidden="true" />
        {flat ? '0%' : `${value > 0 ? '+' : ''}${pct(value, Math.abs(value) < 0.1 ? 1 : 0)}`}
      </span>
      <span className="hidden text-fg-3 @[15rem]:inline">vs {period}</span>
    </span>
  )
}

// StatCard: label, one value, an optional delta and sparkline.
export default function StatCard({ label, value, sub, delta, trend, icon: Icon, to, tone }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-fg-3">
        {Icon && <Icon size={14} aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className={`text-2xl font-semibold tracking-tight truncate ${tone === 'danger' ? 'text-[#ff8b8b]' : 'text-fg'}`}>{value}</div>
        {trend && <div className="hidden shrink-0 @[13rem]:block"><Sparkline values={trend} /></div>}
      </div>
      <div className="mt-1.5 min-h-[1.1rem] truncate">{delta ?? <span className="text-xs text-fg-3">{sub}</span>}</div>
      {delta && sub && <div className="text-xs text-fg-3 truncate">{sub}</div>}
    </>
  )
  const cls = '@container block min-w-0 rounded-xl border border-line bg-surface px-4 py-3.5'
  return to ? <Link to={to} className={`${cls} transition hover:border-line-strong hover:bg-surface-2/60`}>{body}</Link> : <div className={cls}>{body}</div>
}
