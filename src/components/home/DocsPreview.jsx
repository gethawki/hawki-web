import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import Reveal from '../common/Reveal.jsx'

// Real docsNav destinations, deep-linked.
const DOC_LINKS = [
  { label: 'Introduction', href: 'introduction' },
  { label: 'Installation', href: 'installation' },
  { label: 'Quickstart', href: 'quickstart' },
  { label: 'CLI Reference', href: 'cli-reference' },
  { label: 'The Deep Agent', href: 'deep-agent' },
  { label: 'Security Modules', href: 'security-modules' },
  { label: 'Scanning', href: 'scanning' },
  { label: 'Audit-Grade Reporting', href: 'reporting' },
  { label: 'Doctor', href: 'doctor' },
  { label: 'Privacy Promise', href: 'privacy' },
]

export default function DocsPreview() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
        <Reveal className="lg:col-span-4">
          <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">Documentation</span>
          <h2 className="font-display text-3xl md:text-4xl text-white mt-4">Everything, documented for v1.0.0.</h2>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 mt-7 text-white border-b border-[#3a3a3a] hover:border-[#687F97] pb-1 transition text-sm font-medium"
          >
            <BookOpen size={15} /> Browse the docs
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
          <div className="grid sm:grid-cols-2">
            {DOC_LINKS.map((d) => (
              <Link
                key={d.href}
                to={`/docs/${d.href}`}
                className="group flex items-center justify-between py-4 border-b border-[#1a1a1a] text-[#9a9a9a] hover:text-white transition text-sm pr-4"
              >
                {d.label}
                <ArrowRight size={14} className="text-[#3a3a3a] group-hover:text-[#687F97] group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
