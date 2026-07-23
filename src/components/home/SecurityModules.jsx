import { motion } from 'framer-motion'
import { FileCheck2, PackageSearch, Layers, CircuitBoard } from 'lucide-react'
import Section from '../common/Section.jsx'
import Reveal from '../common/Reveal.jsx'

const MODULES = [
  {
    icon: FileCheck2,
    name: 'verify',
    tone: 'med',
    cmd: 'hawki verify --address 0x... --source ./src',
    line: 'Confirm the deployed bytecode actually matches your source.',
  },
  {
    icon: PackageSearch,
    name: 'deps',
    tone: 'low',
    cmd: 'hawki deps ./my-project',
    line: 'Flag known-vulnerable library and package versions.',
  },
  {
    icon: Layers,
    name: 'upgrade',
    tone: 'high',
    cmd: 'hawki upgrade --old Old.sol --new New.sol',
    line: 'Catch proxy storage-collisions before an upgrade goes wrong.',
  },
  {
    icon: CircuitBoard,
    name: 'prove',
    tone: 'med',
    cmd: 'hawki prove ./contracts --engine smtchecker',
    line: 'Run formal verification through SMTChecker.',
  },
]

const TONE_TEXT = { low: 'risk-low', med: 'risk-med', high: 'risk-high' }
const TONE_BAR = { low: 'var(--color-risk-low)', med: 'var(--color-risk-med)', high: 'var(--color-risk-high)' }

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function SecurityModules() {
  return (
    <Section
      id="modules"
      num="03"
      kicker="Four ways to be sure"
      title="Focused modules for the sharp questions"
      intro="Beyond the scan pipeline, four standalone commands each answer one precise question about a contract."
      width="wide"
    >
      <Reveal delay={0.1}>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {MODULES.map((m) => (
            <motion.div key={m.name} variants={item} className="panel p-5 group">
              <div className="flex items-center justify-between mb-5">
                <m.icon size={20} className={TONE_TEXT[m.tone]} />
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#4a4a4a]">module</span>
              </div>
              <h3 className="font-mono text-lg text-white">
                hawki <span className={TONE_TEXT[m.tone]}>{m.name}</span>
              </h3>
              <p className="text-[#8a8a8a] text-sm mt-2 leading-relaxed min-h-[3.5rem]">{m.line}</p>
              <div className="h-px w-full my-4" style={{ background: TONE_BAR[m.tone], opacity: 0.35 }} />
              <code className="block font-mono text-[0.72rem] text-[#6f6f6f] break-words leading-relaxed">
                {m.cmd}
              </code>
            </motion.div>
          ))}
        </motion.div>
      </Reveal>
    </Section>
  )
}
