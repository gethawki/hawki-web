import { Link } from 'react-router-dom'
import Reveal from '../common/Reveal.jsx'
import { LINKS } from '../../data/links.js'

export default function FinalCTA() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 md:py-36 text-center">
      <Reveal>
        <h2 className="font-display text-4xl md:text-6xl text-white leading-[1.1]">
          Start building <em className="italic text-gradient font-medium">more secure</em> software today
        </h2>
        <p className="text-[#77746C] mt-6 max-w-lg mx-auto leading-relaxed">
          Download Hawk‑i, explore the documentation, and join a growing community building the future of
          AI-powered security intelligence.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 mt-11">
          <a
            href={LINKS.pypi}
            target="_blank"
            rel="noreferrer"
            className="bg-white text-black px-7 py-3.5 rounded-full font-medium hover:bg-[#e8e8e8] transition"
          >
            Get started
          </a>
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="text-[#e0e0e0] hover:text-white transition text-sm border-b border-[#3a3a3a] hover:border-[#687F97] pb-0.5">
            <i className="fab fa-github mr-1.5" /> GitHub
          </a>
          <Link to="/docs" className="text-[#e0e0e0] hover:text-white transition text-sm border-b border-[#3a3a3a] hover:border-[#687F97] pb-0.5">
            Documentation
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
