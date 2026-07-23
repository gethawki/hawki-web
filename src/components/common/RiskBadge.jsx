const MAP = {
  low: { cls: 'risk-low', label: 'Low' },
  medium: { cls: 'risk-med', label: 'Medium' },
  high: { cls: 'risk-high', label: 'High' },
  critical: { cls: 'risk-high', label: 'Critical' },
}

export default function RiskBadge({ level = 'medium', label, className = '' }) {
  const r = MAP[level] || MAP.medium
  return (
    <span className={`risk-badge ${r.cls} ${className}`}>
      <span className="dot" />
      {label || r.label}
    </span>
  )
}
