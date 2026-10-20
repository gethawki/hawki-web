import { AlertTriangle } from 'lucide-react'

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

// PageSkeleton stands in for a dashboard page while its first load runs.
export function PageSkeleton({ cards = 4 }) {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-56" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(cards)].map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action, compact }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-8' : 'py-14'} px-6`}>
      {Icon && (
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-fg-2">
          <Icon size={20} />
        </div>
      )}
      <div className="text-sm font-medium text-fg">{title}</div>
      {children && <p className="mt-1 max-w-sm text-sm text-fg-3">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ children, onRetry }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-xl border border-critical/40 bg-critical/5 px-4 py-3 text-sm text-[#f3c7c7]">
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{children}</span>
      {onRetry && <button type="button" onClick={onRetry} className="text-xs underline hover:text-white">Try again</button>}
    </div>
  )
}
