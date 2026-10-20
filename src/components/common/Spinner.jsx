export default function Spinner({ label = 'Loading', fullPage }) {
  const dot = (
    <div className="flex items-center gap-2.5 py-6 text-fg-3" role="status">
      <span className="h-4 w-4 rounded-full border-2 border-accent border-r-transparent animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
  return fullPage ? <div className="min-h-screen flex items-center justify-center bg-app">{dot}</div> : dot
}
