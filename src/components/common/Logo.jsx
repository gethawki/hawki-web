import { Link } from 'react-router-dom'

// The Hawk-i wordmark. `badge` adds a small pill after it (version, "Cloud").
export default function Logo({ to = '/', badge, onClick }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" onClick={onClick}>
      <span className="w-2 h-2 rounded-full bg-steel" />
      <span className="font-display text-xl text-white tracking-tight">
        Hawk<span className="text-steel italic">i</span>
      </span>
      {badge && (
        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[0.6rem] tracking-wider text-grey border border-panel-border rounded-full px-1.5 py-0.5">
          {badge}
        </span>
      )}
    </Link>
  )
}
