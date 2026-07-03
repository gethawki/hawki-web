import Reveal from '../common/Reveal.jsx'
import { LINKS } from '../../data/links.js'

const CHANNELS = [
  { icon: 'fa-github', label: 'GitHub', href: LINKS.github },
  { icon: 'fa-linkedin', label: 'LinkedIn', href: LINKS.linkedin },
  { icon: 'fa-x-twitter', label: 'X', href: LINKS.x },
  { icon: 'fa-facebook', label: 'Facebook', href: LINKS.facebook },
]

export default function Community() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
      <Reveal>
        <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">Community</span>
        <h2 className="font-display text-3xl md:text-4xl text-white mt-4">
          Join the <em className="italic text-[#687F97] font-medium">Hawk‑i</em> community
        </h2>
        <p className="text-[#77746C] mt-5 max-w-xl mx-auto leading-relaxed">
          Developers, researchers, and security engineers building the future of software security, reporting
          vulnerabilities, improving detectors, contributing code, and sharing research.
        </p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-10 text-sm">
          {CHANNELS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[#9a9a9a] hover:text-white transition"
            >
              <i className={`fab ${c.icon} text-[#687F97]`} />
              {c.label}
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
