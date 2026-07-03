export default function HeroAmbient() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="glow-orb animate-drift"
        style={{
          width: 520,
          height: 520,
          top: -160,
          right: -120,
          background: 'radial-gradient(circle, rgba(104,127,151,0.28) 0%, transparent 70%)',
        }}
      />
      <div
        className="glow-orb animate-drift"
        style={{
          width: 420,
          height: 420,
          bottom: -140,
          left: -100,
          background: 'radial-gradient(circle, rgba(152,108,103,0.18) 0%, transparent 70%)',
          animationDelay: '-4s',
        }}
      />

      {/* radar motif, right side, faint */}
      <svg
        className="hidden lg:block absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.18]"
        width="620"
        height="620"
        viewBox="0 0 620 620"
      >
        <defs>
          <radialGradient id="radarFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#687F97" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#687F97" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[80, 160, 240, 310].map((r) => (
          <circle key={r} cx="310" cy="310" r={r} fill="none" stroke="#687F97" strokeWidth="1" opacity="0.5" />
        ))}
        <line x1="310" y1="0" x2="310" y2="620" stroke="#687F97" strokeWidth="0.5" opacity="0.3" />
        <line x1="0" y1="310" x2="620" y2="310" stroke="#687F97" strokeWidth="0.5" opacity="0.3" />
        <g className="radar-sweep" style={{ transformBox: 'view-box', transformOrigin: '310px 310px' }}>
          <path d="M310 310 L310 0 A310 310 0 0 1 530 130 Z" fill="url(#radarFade)" />
        </g>
      </svg>

      <div className="grain-overlay" />
    </div>
  )
}
