// PageHeader is the title block at the top of every dashboard page.
export default function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-end gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-3xl text-white">{title}</h1>
        {description && <p className="mt-2 text-sm text-grey max-w-2xl">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

// Panel is a bordered dashboard card.
export function Panel({ title, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-panel-border bg-panel/50 p-6 ${className}`}>
      {title && <h2 className="text-white font-medium mb-4">{title}</h2>}
      {children}
    </section>
  )
}
