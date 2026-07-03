import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowRight } from 'lucide-react'
import HeroAmbient from './HeroAmbient.jsx'
import { LINKS } from '../../data/links.js'

export default function Hero() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-24 md:pt-32 md:pb-32 overflow-hidden">
      <HeroAmbient />

      <div className="grid lg:grid-cols-12 gap-y-14 gap-x-10 items-end">
        <div className="lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-9 text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase"
          >
            <span className="w-6 h-px bg-[#687F97]" />
            Open source · local first · built for developers
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="font-display text-[2.75rem] leading-[1.08] sm:text-6xl md:text-[5.25rem] md:leading-[1.02] text-white tracking-tight"
          >
            Build more <em className="italic text-gradient font-medium">secure</em>
            <br className="hidden sm:block" /> software. Faster.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-[#a8a8a8] mt-8 max-w-lg leading-relaxed"
          >
            AI-powered security intelligence for software and blockchain projects.
            Discover vulnerabilities, understand risk, and generate evidence-based
            reports, before software reaches production.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-11"
          >
            <a
              href={LINKS.githubQuickStart}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 bg-white text-black pl-6 pr-5 py-3.5 rounded-full font-medium hover:bg-[#e8e8e8] transition"
            >
              Get started
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={LINKS.githubReadme}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[#e0e0e0] hover:text-white transition text-sm font-medium border-b border-[#3a3a3a] hover:border-[#687F97] pb-0.5"
            >
              View on GitHub
              <ArrowUpRight size={14} className="text-[#77746C] group-hover:text-[#687F97] transition" />
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="lg:col-span-4 flex lg:flex-col lg:items-end gap-6 lg:gap-3 text-sm text-[#77746C] font-mono"
        >
          <span className="lg:self-end">hawki scan · audit · simulate · watch</span>
          <div className="hairline w-full hidden lg:block" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-20 glass-panel rounded-2xl p-1.5 shadow-2xl shadow-black/40"
      >
        <div className="rounded-[0.9rem] bg-[#0d0d0d] px-6 md:px-8 py-6 md:py-7 flex flex-col md:flex-row gap-6 md:gap-0 md:divide-x divide-[#232323]">
          <div className="md:pr-8 md:w-1/3">
            <p className="text-xs font-mono tracking-[0.15em] text-[#687F97] uppercase mb-2">Terminal</p>
            <code className="text-[13px] font-mono text-[#9a9a9a] leading-[1.9] block">
              <span className="text-[#687F97]">$</span> hawki audit ./contracts
              <br />
              <span className="text-emerald-500/90">✓</span> static analysis: no critical
              <br />
              <span className="text-[#986C67]">⚠</span> AI logic flaw in withdraw()
            </code>
          </div>
          <div className="md:px-8 md:w-1/3">
            <p className="text-xs font-mono tracking-[0.15em] text-[#687F97] uppercase mb-2">Simulation</p>
            <code className="text-[13px] font-mono text-[#9a9a9a] leading-[1.9] block">
              [sandbox] drain success: 120 ETH
              <br />
              <span className="text-[#687F97]">→</span> PoC + evidence generated
            </code>
          </div>
          <div className="md:pl-8 md:w-1/3 flex items-center">
            <p className="text-sm text-[#77746C] leading-relaxed">
              Every finding ships with reproducible evidence, not just a severity label.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
