import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Pager from './Pager.jsx'

export default function DocsLayout({
  nav,
  basePath,
  activeId,
  eyebrow,
  content,
  footerNote,
  mobileTitle,
  prev,
  next,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inPageToc, setInPageToc] = useState([])
  const contentRef = useRef(null)

  // close mobile drawer whenever the page changes
  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo({ top: 0 })
  }, [activeId])

  // build an in-page mini TOC from this section's own h3 subheadings
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const items = []
    el.querySelectorAll('h3').forEach((h3, idx) => {
      if (!h3.id) {
        h3.id = `h3-${idx}-${h3.textContent.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
      }
      items.push({ id: h3.id, label: h3.textContent })
    })
    setInPageToc(items)
  }, [activeId, content])

  const currentGroup = nav.find((g) => g.links.some((l) => l.href === activeId))

  return (
    <>
      <div className={`menu-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* left sidebar */}
      <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to="/" className="p-5 flex items-center gap-2 border-b border-[#1a1a1a]">
          <span className="w-2 h-2 rounded-full bg-[#687F97]" />
          <span className="font-display text-2xl text-white">
            Hawk<span className="text-[#687F97] italic">i</span>
          </span>
        </Link>
        <nav className="py-4">
          {nav.map((section) => (
            <div key={section.title}>
              <div className="section-title mt-4 first:mt-0">{section.title}</div>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  to={`${basePath}/${link.href}`}
                  className={link.href === activeId ? 'active' : ''}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-5 border-t border-[#1a1a1a] text-xs text-[#666] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#687F97]" /> {footerNote}
        </div>
      </aside>

      {/* right sidebar — in-page TOC, or nearby links if this page has no subheadings */}
      <aside className="docs-right-sidebar">
        {inPageToc.length > 0 ? (
          <>
            <div className="toc-title">On this page</div>
            {inPageToc.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="toc-item toc-h3" style={{ paddingLeft: '0.9rem' }}>
                {item.label}
              </a>
            ))}
          </>
        ) : currentGroup ? (
          <>
            <div className="toc-title">{currentGroup.title}</div>
            {currentGroup.links.map((link) => (
              <Link
                key={link.href}
                to={`${basePath}/${link.href}`}
                className={`toc-item ${link.href === activeId ? 'active' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
              >
                {link.label}
              </Link>
            ))}
          </>
        ) : null}
      </aside>

      {/* main content */}
      <main className="docs-main">
        <div className="flex items-center gap-3 mb-8 md:hidden">
          <button onClick={() => setSidebarOpen((v) => !v)} className="text-[#687F97] p-1 -ml-1" aria-label="Toggle menu">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="font-display text-lg text-white">{mobileTitle}</span>
        </div>

        <div className="docs-content-col">
          <div className="docs-hero-glow" aria-hidden="true" />
          <div className="flex items-center gap-2 text-xs font-mono text-[#666] uppercase tracking-[0.15em] mb-8">
            <span>{eyebrow}</span>
            {currentGroup && (
              <>
                <span className="text-[#333]">/</span>
                <span className="text-[#687F97]">{currentGroup.title}</span>
              </>
            )}
          </div>

          <article ref={contentRef} className="doc-card">
            {content}
          </article>

          <Pager basePath={basePath} prev={prev} next={next} />
        </div>
      </main>
    </>
  )
}
