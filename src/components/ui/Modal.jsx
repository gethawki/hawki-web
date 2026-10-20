import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Modal is a centered dialog. Escape and the backdrop close it; focus moves
// into it when it opens.
export default function Modal({ open, onClose, title, description, children, width = 'max-w-lg' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector('input, select, textarea, button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-4 py-[8vh]" role="dialog" aria-modal="true" aria-label={title}>
      <button className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div ref={ref} className={`relative w-full ${width} rounded-2xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/60`}>
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-fg-3">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-fg-3 hover:bg-surface-3 hover:text-fg"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
