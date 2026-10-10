export default function Spinner({ label = 'loading', fullPage }) {
  const dot = (
    <div className="flex items-center gap-3 text-grey" role="status">
      <span className="w-2 h-2 rounded-full bg-steel animate-pulse" />
      <span className="font-mono text-sm">{label}</span>
    </div>
  )
  return fullPage ? <div className="min-h-screen flex items-center justify-center bg-ink">{dot}</div> : dot
}
