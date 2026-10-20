import { useEffect, useRef, useState } from 'react'

// Menu is a dropdown anchored to its trigger. It closes on outside click,
// Escape and after choosing an item.
export default function Menu({ trigger, children, align = 'right', width = 'w-64', label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), props: { 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-label': label } })}
      {open && (
        <div role="menu" onClick={(e) => { if (e.target.closest('[role=menuitem]')) setOpen(false) }}
          className={`absolute z-50 mt-1.5 ${width} ${align === 'right' ? 'right-0' : 'left-0'} rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl shadow-black/50`}>
          {children}
        </div>
      )}
    </div>
  )
}

export const menuItem = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-fg-2 hover:bg-surface-3 hover:text-fg'
export const MenuDivider = () => <div className="my-1.5 h-px bg-line" />
export const MenuLabel = ({ children }) => <div className="px-2.5 pb-1 pt-1.5 text-[0.7rem] font-medium text-fg-3">{children}</div>
