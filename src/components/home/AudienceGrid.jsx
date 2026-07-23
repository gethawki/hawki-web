import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Reveal from '../common/Reveal.jsx'

const AUDIENCES = [
  {
    key: 'developers',
    title: 'Protocol Developers',
    lead: 'Catch the exploit before you deploy.',
    body: 'Scan contracts while you write them, in the toolchain you already run. Foundry and Hardhat proofs land next to the finding, so a fix is obvious.',
    stat: '01',
  },
  {
    key: 'security',
    title: 'Security Researchers',
    lead: 'Hunt with an autonomous ally.',
    body: 'Turn the Deep agent loose to invent novel attack paths, then read reproducible PoCs instead of triaging bare severity labels.',
    stat: '02',
  },
  {
    key: 'audit',
    title: 'Audit Teams',
    lead: 'Ship audit-grade reports faster.',
    body: 'A deterministic score and a full report per engagement. Re-render an audit or Immunefi submission from the saved findings JSON at any time.',
    stat: '03',
  },
  {
    key: 'hunters',
    title: 'Bug-Bounty Hunters',
    lead: 'Scan any live address.',
    body: 'Point Hawk-i at a deployed contract across the EVM chain set, pull verified source from the explorer, and file an Immunefi-style submission with proof attached.',
    stat: '04',
  },
]

export default function AudienceGrid() {
  const [active, setActive] = useState(0)
  const current = AUDIENCES[active]

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="mb-14">
        <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">07: Built for the people who ship Web3</span>
        <h2 className="font-display text-3xl md:text-4xl text-white mt-4">One console, every seat on the security team</h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          <div className="lg:col-span-4 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {AUDIENCES.map((a, i) => (
              <button
                key={a.key}
                onClick={() => setActive(i)}
                className={`text-left shrink-0 lg:shrink px-5 py-4 rounded-xl transition border ${
                  active === i
                    ? 'border-[#687F97]/40 bg-[#687F97]/[0.07]'
                    : 'border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <span className={`font-mono text-xs mr-3 ${active === i ? 'text-[#687F97]' : 'text-[#444]'}`}>
                  {a.stat}
                </span>
                <span className={`font-medium ${active === i ? 'text-white' : 'text-[#8a8a8a]'}`}>{a.title}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 lg:col-start-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="glass-panel rounded-2xl p-8 md:p-12"
              >
                <p className="font-display italic text-2xl md:text-3xl text-white mb-4">{current.lead}</p>
                <p className="text-[#a0a0a0] leading-relaxed max-w-lg">{current.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
