import Reveal from '../common/Reveal.jsx'
import { LINKS } from '../../data/links.js'

export default function OpenSourceBanner() {
  return (
    <section className="relative z-10 py-24 md:py-32 overflow-hidden border-y border-[#1a1a1a]">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(104,127,151,0.12) 0%, transparent 60%)' }}
        aria-hidden="true"
      />
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">Open source first</span>
          <p className="font-display text-3xl md:text-5xl text-white mt-6 leading-[1.25]">
            The open-source edition will{' '}
            <em className="italic text-gradient font-medium">always remain</em> the foundation of the platform.
          </p>
          <p className="text-[#8a8a8a] mt-8 max-w-2xl mx-auto leading-relaxed">
            Optional cloud services will one day add collaboration, orchestration, and large-scale intelligence,
            while the open-source core stays available to everyone, forever.
          </p>
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-10 text-white border-b border-[#3a3a3a] hover:border-[#687F97] pb-1 transition text-sm font-medium"
          >
            <i className="fab fa-github" /> Explore the repository
          </a>
        </Reveal>
      </div>
    </section>
  )
}
