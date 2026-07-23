import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

const TONE = {
  prompt: 'text-[#e6e6e6]',
  dim: 'text-[#6f6f6f]',
  output: 'text-[#9a9a9a]',
  success: 'text-emerald-400/90',
  low: 'risk-low',
  med: 'risk-med',
  high: 'risk-high',
  info: 'text-steel',
}

// lines: [{ tone, text, prefix }]
export default function Terminal({ title = 'hawki', lines = [], className = '', interval = 260 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setShown(lines.length)
      return
    }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setShown((s) => Math.min(s + 1, lines.length))
      if (i >= lines.length) clearInterval(id)
    }, interval)
    return () => clearInterval(id)
  }, [inView, reduce, lines.length, interval])

  const done = shown >= lines.length

  return (
    <div ref={ref} className={`terminal ${className}`}>
      <div className="terminal-bar">
        <span className="terminal-dot" style={{ background: '#986c67' }} />
        <span className="terminal-dot" style={{ background: '#77746c' }} />
        <span className="terminal-dot" style={{ background: '#687f97' }} />
        <span className="ml-3 font-mono text-[11px] text-[#6a6a6a]">{title}</span>
      </div>
      <div className="p-4 sm:p-5 font-mono text-[12.5px] sm:text-[13px] leading-[1.85] min-h-[15rem] overflow-x-auto">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className={TONE[l.tone] || TONE.output}>
            {l.prefix && <span className="text-[#687F97] mr-1.5">{l.prefix}</span>}
            {l.text || ' '}
          </div>
        ))}
        {!reduce && !done && <span className="caret" />}
      </div>
    </div>
  )
}
