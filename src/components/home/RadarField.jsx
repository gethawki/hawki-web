import { motion, useReducedMotion } from 'framer-motion'

// polar -> cartesian on a 400x400 field, centre 200,200, math angle (y up)
function pt(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180
  return { x: 200 + radius * Math.cos(a), y: 200 - radius * Math.sin(a) }
}

const RISK_COLOR = {
  low: 'var(--color-risk-low)',
  medium: 'var(--color-risk-med)',
  high: 'var(--color-risk-high)',
}

// contract signals resolving to risk-coloured dots as the sweep passes
const BLIPS = [
  { angle: 302, r: 152, level: 'high', label: 'Reentrancy', callout: true },
  { angle: 44, r: 108, level: 'medium', label: 'Access control' },
  { angle: 122, r: 168, level: 'low', label: 'Naming' },
  { angle: 200, r: 92, level: 'high', label: 'Unchecked call' },
  { angle: 158, r: 138, level: 'low', label: 'Shadowing' },
  { angle: 250, r: 120, level: 'medium', label: 'tx.origin' },
  { angle: 18, r: 166, level: 'high', label: 'delegatecall' },
  { angle: 340, r: 74, level: 'medium', label: 'Oracle' },
]

const RINGS = [58, 104, 150, 190]

export default function RadarField({ className = '' }) {
  const reduce = useReducedMotion()

  return (
    <div className={`relative w-full max-w-[560px] mx-auto ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 400" className="w-full h-auto overflow-visible">
        <defs>
          <radialGradient id="rf-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#101418" />
            <stop offset="70%" stopColor="#0b0d0f" />
            <stop offset="100%" stopColor="#0b0b0b" />
          </radialGradient>
          <linearGradient id="rf-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-steel)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-steel)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* iris backdrop */}
        <circle cx="200" cy="200" r="192" fill="url(#rf-iris)" stroke="#1c2026" strokeWidth="1" />

        {/* range rings */}
        {RINGS.map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--color-steel)" strokeWidth="0.75" opacity="0.22" />
        ))}

        {/* crosshair */}
        <line x1="200" y1="10" x2="200" y2="390" stroke="var(--color-steel)" strokeWidth="0.5" opacity="0.18" />
        <line x1="10" y1="200" x2="390" y2="200" stroke="var(--color-steel)" strokeWidth="0.5" opacity="0.18" />
        {/* tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = pt(i * 15, 190)
          const b = pt(i * 15, 183)
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--color-steel)" strokeWidth="0.75" opacity="0.25" />
        })}

        {/* rotating sweep wedge */}
        {!reduce && (
          <g className="radar-sweep" style={{ transformBox: 'view-box', transformOrigin: '200px 200px' }}>
            <path d="M200 200 L200 8 A192 192 0 0 1 388 150 Z" fill="url(#rf-sweep)" />
            <line x1="200" y1="200" x2="200" y2="8" stroke="var(--color-steel)" strokeWidth="1" opacity="0.5" />
          </g>
        )}

        {/* blips settling into risk-coloured dots */}
        {BLIPS.map((b, i) => {
          const p = pt(b.angle, b.r)
          const color = RISK_COLOR[b.level]
          return (
            <g key={b.label}>
              {b.level === 'high' && !reduce && (
                <circle cx={p.x} cy={p.y} r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.5" className="radar-ping" style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${i * 0.35}s` }} />
              )}
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={b.level === 'high' ? 4 : 3}
                fill={color}
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                whileInView={reduce ? undefined : { scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.14, duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            </g>
          )
        })}

        {/* central hawk-eye iris */}
        <circle cx="200" cy="200" r="26" fill="#0b0b0b" stroke="var(--color-steel)" strokeWidth="1" opacity="0.9" />
        <circle cx="200" cy="200" r="15" fill="none" stroke="var(--color-copper)" strokeWidth="1" opacity="0.6" />
        <circle cx="200" cy="200" r="6" fill="var(--color-steel)" />
        <circle cx="196" cy="196" r="2" fill="#e0e0e0" opacity="0.85" />
      </svg>

      {/* one blip expands to a mini callout */}
      {BLIPS.filter((b) => b.callout).map((b) => {
        const p = pt(b.angle, b.r)
        return (
          <motion.div
            key={b.label}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="absolute"
            style={{ left: `${(p.x / 400) * 100}%`, top: `${(p.y / 400) * 100}%` }}
          >
            <div className="-translate-y-1/2 translate-x-3 flex items-center gap-2 whitespace-nowrap rounded-full border border-[#2a2a2a] bg-[#0d0d0d]/90 px-2.5 py-1 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full risk-dot-high" />
              <span className="font-mono text-[11px] text-[#cfcfcf]">{b.label}</span>
              <span className="font-mono text-[11px] risk-high">High</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
