import { Link } from 'react-router-dom'
import { LINKS, SOCIAL_HANDLE } from '../../data/links.js'

const PRODUCT_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Documentation', to: '/docs' },
  { label: 'Changelog', to: '/changelog' },
]

const RESOURCE_LINKS = [
  { label: 'GitHub', href: LINKS.github },
  { label: 'PyPI', href: LINKS.pypi },
  { label: 'Docker', href: LINKS.docker },
]

const COMMUNITY_LINKS = [
  { label: 'GitHub', href: LINKS.github },
  { label: 'LinkedIn', href: LINKS.linkedin },
  { label: 'X', href: LINKS.x },
  { label: 'Facebook', href: LINKS.facebook },
]

export default function Footer() {
  return (
    <footer className="relative z-10">
      <div className="hairline" />
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#687F97]" />
              <span className="font-display text-lg text-white">
                Hawk<span className="text-[#687F97] italic">i</span>
              </span>
            </Link>
            <p className="text-sm text-[#666] mt-4 max-w-xs leading-relaxed">
              Open, AI-powered security intelligence for software and blockchain projects, local first,
              developer built.
            </p>
            <span className="inline-block text-xs text-[#4a4a4a] mt-5 font-mono">© 2026 · security public good</span>
          </div>

          <div>
            <h4 className="text-[#77746C] text-xs font-mono uppercase tracking-[0.15em] mb-5">Product</h4>
            <ul className="space-y-3 text-sm">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-[#9a9a9a] hover:text-white transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#77746C] text-xs font-mono uppercase tracking-[0.15em] mb-5">Resources</h4>
            <ul className="space-y-3 text-sm">
              {RESOURCE_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="text-[#9a9a9a] hover:text-white transition">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#77746C] text-xs font-mono uppercase tracking-[0.15em] mb-5">Community</h4>
            <ul className="space-y-3 text-sm">
              {COMMUNITY_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="text-[#9a9a9a] hover:text-white transition">
                    {l.label} <span className="text-[#333]">· {SOCIAL_HANDLE}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[#161616] flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-[#687F97] font-mono">#infrastructure #opensource</span>
          <p className="text-xs text-[#555] text-center md:text-right max-w-xl">
            Hawk‑i is designed as public security infrastructure, open, verifiable, and privacy-first.
          </p>
        </div>
      </div>
    </footer>
  )
}
