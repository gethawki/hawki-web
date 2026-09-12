import { useState } from 'react'
import { Plus } from 'lucide-react'
import Reveal from '../common/Reveal.jsx'
import { FAQS } from '../../data/faqs.js'

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
