import { motion } from 'framer-motion'
import { Bot, Gauge, FileSearch, ScrollText, HardDrive } from 'lucide-react'
import Section from '../common/Section.jsx'

const PILLARS = [
  {
    icon: Bot,
    title: 'Autonomous',
    body: 'The Deep agent invents novel attacks and proves them: on real incident code it invented and landed a live reentrancy drain in the sandbox.',
  },
  {
    icon: Gauge,
    title: 'Deterministic',
    body: 'A 0 to 100 score with fixed risk bands. The same findings always produce the same number.',
  },
  {
    icon: FileSearch,
    title: 'Evidence, not alerts',
    body: 'Every finding ships with a location, an explanation, a fix, and, where it counts, a runnable exploit.',
  },
  {
    icon: ScrollText,
    title: 'MIT, no telemetry',
    body: '100% open source under MIT. No account, no phone-home, no usage data leaving your machine. Ever.',
  },
  {
    icon: HardDrive,
    title: 'Local first',
    body: 'Everything runs on your box. Bring your own LLM key, or stay fully offline with a local model.',
  },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function WhyHawki() {
  return (
    <Section
      id="why"
      num="06"
      kicker="Why Hawk-i"
      title="An instrument, not another black box"
      intro="Hawk-i is built to be understood. It shows its work, it stays on your machine, and it never asks you to trust a number you cannot check."
      width="wide"
    >
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {PILLARS.map((p) => (
          <motion.div key={p.title} variants={item} className="panel p-5">
            <p.icon size={20} className="text-steel" />
            <h3 className="text-white font-medium mt-4 mb-2">{p.title}</h3>
            <p className="text-[#8a8a8a] text-sm leading-relaxed">{p.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  )
}
