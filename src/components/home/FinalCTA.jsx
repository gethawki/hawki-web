import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Reveal from '../common/Reveal.jsx'
import SocialIcon from '../common/SocialIcon.jsx'
import { LINKS } from '../../data/links.js'

export default function FinalCTA() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 md:py-36 text-center">
      <Reveal>
        <h2 className="font-display text-4xl md:text-6xl text-white leading-[1.1]">
          See the <em className="italic text-gradient font-medium">exploit</em> first.
        </h2>
        <p className="text-[#8a8a8a] mt-6 max-w-lg mx-auto leading-relaxed">
          Install Hawk-i, run doctor, and scan your first contract in under a minute.
          Free, MIT licensed, and entirely on your machine.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-4 mt-11">
          <a
            href={LINKS.pypi}
            target="_blank"
            rel="noreferrer"
            className="bg-white text-black px-6 py-3.5 rounded-full font-mono text-sm hover:bg-[#e8e8e8] transition"
          >
            <span className="text-[#687F97]">$</span> pip install hawki
          </a>
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[#e0e0e0] hover:text-white transition text-sm border-b border-[#3a3a3a] hover:border-[#687F97] pb-0.5"
          >
            <SocialIcon name="github" size={15} /> GitHub
          </a>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-[#e0e0e0] hover:text-white transition text-sm border-b border-[#3a3a3a] hover:border-[#687F97] pb-0.5"
          >
            Documentation <ArrowUpRight size={13} className="text-[#77746C]" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
