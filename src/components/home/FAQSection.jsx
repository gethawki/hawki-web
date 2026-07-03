import { useState } from 'react'
import { Plus } from 'lucide-react'
import Reveal from '../common/Reveal.jsx'

const FAQS = [
  { q: 'Is Hawk‑i free?', a: 'Yes. The core platform is open source. Future cloud services will be optional.' },
  {
    q: 'Does Hawk‑i send my code to the cloud?',
    a: 'No. You control where Hawk‑i runs and which AI providers it uses. Local-first workflows are supported.',
  },
  {
    q: 'Is Hawk‑i only for blockchain?',
    a: 'No. Hawk‑i starts with strong support for smart contracts and blockchain ecosystems, but its long-term vision is to become a broader security intelligence platform for software projects.',
  },
  { q: 'Can organizations self-host Hawk‑i?', a: 'Yes. Self-hosted deployments are a core part of the platform vision.' },
  {
    q: 'Is Hawk‑i production ready?',
    a: 'Hawk‑i is actively evolving. New capabilities are added continuously as the platform grows toward a full security intelligence ecosystem.',
  },
]

function FaqItem({ q, a, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#1a1a1a]">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between py-6 text-left gap-6">
        <span className="text-white font-medium text-lg">{q}</span>
        <Plus size={18} className={`text-[#687F97] shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="text-[#8f8f8f] leading-relaxed pb-6 max-w-2xl">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FAQSection() {
  return (
    <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="mb-8 text-center">
        <span className="text-xs font-mono tracking-[0.2em] text-[#77746C] uppercase">FAQ</span>
        <h2 className="font-display text-3xl md:text-4xl text-white mt-4">Frequently asked questions</h2>
      </Reveal>
      <Reveal delay={0.1}>
        <div>
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </Reveal>
    </section>
  )
}
