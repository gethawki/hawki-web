import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { LINKS } from '../../data/links.js'

const NAV_ITEMS = [
  { to: '/docs', label: 'Docs' },
  { to: '/changelog', label: 'Changelog' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="relative z-30">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="w-2 h-2 rounded-full bg-[#687F97]" />
          <span className="font-display text-xl text-white tracking-tight">
            Hawk<span className="text-[#687F97] italic">i</span>
          </span>
        </Link>

        <div className="hidden md:flex gap-9 text-sm items-center">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative pb-1 transition ${
                  isActive
                    ? 'text-white after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-[#687F97]'
                    : 'text-[#9a9a9a] hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="text-[#9a9a9a] hover:text-white transition">
            GitHub
          </a>
          <a
            href={LINKS.pypi}
            target="_blank"
            rel="noreferrer"
            className="border border-[#333] rounded-full px-4 py-1.5 text-[#e0e0e0] hover:border-[#687F97] hover:text-white transition font-mono text-xs"
          >
            pip install hawki
          </a>
        </div>

        <button
          className="md:hidden text-[#e0e0e0] p-2 -mr-2"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#1e1e1e] bg-black/80 backdrop-blur-sm px-6 py-5 flex flex-col gap-4 text-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'text-white' : 'text-[#9a9a9a] hover:text-white transition')}
            >
              {item.label}
            </NavLink>
          ))}
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="text-[#9a9a9a] hover:text-white transition">
            GitHub
          </a>
          <a
            href={LINKS.pypi}
            target="_blank"
            rel="noreferrer"
            className="border border-[#333] rounded-full px-4 py-2 text-[#e0e0e0] w-fit font-mono text-xs"
          >
            pip install hawki
          </a>
        </div>
      )}
    </nav>
  )
}
