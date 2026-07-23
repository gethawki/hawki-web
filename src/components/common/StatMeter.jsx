import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import CountUp from './CountUp.jsx'

// A labelled spring bar: value / max, with a count-up numerator.
export default function StatMeter({ label, value, max, unit = '', tone = 'med' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const fill = {
    low: 'var(--color-risk-low)',
    med: 'var(--color-risk-med)',
    high: 'var(--color-risk-high)',
  }[tone]

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[#77746C]">{label}</span>
        <span className="font-mono text-sm text-[#d0d0d0]">
          <CountUp to={value} format={(v) => Math.round(v).toLocaleString()} />
          <span className="text-[#5a5a5a]">
            {' / '}
            {max.toLocaleString()}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: fill }}
          initial={reduce ? false : { width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.2 }}
        />
      </div>
    </div>
  )
}
