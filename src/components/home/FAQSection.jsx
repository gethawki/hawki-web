import { useState } from 'react'
import { Plus } from 'lucide-react'
import Reveal from '../common/Reveal.jsx'

const FAQS = [
  {
    q: 'Is Hawk-i free?',
    a: 'Yes, entirely. Hawk-i v1.0.0 is 100% open source under the MIT license. There is no paid tier and no upsell. The Deep agent and every module are included.',
  },
  {
    q: 'Does it phone home?',
    a: 'Never. There is no telemetry of any kind. Your source is analysed on your machine and nothing is transmitted. The hawki metrics command reports only local statistics, and all state lives in plain files under ~/.hawki/.',
  },
  {
    q: 'Which chains can it scan by address?',
    a: 'Seven EVM mainnets (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, and Avalanche), plus the Sepolia testnet and a local node. Point --rpc-url at any other EVM endpoint you like.',
  },
  {
    q: 'Does the Deep agent need an API key?',
    a: 'For its novel-attack planner it calls an LLM through litellm, so you supply a key for the provider you choose, or run a local model through Ollama to stay fully offline. The rule-based stages need no key at all.',
  },
  {
    q: 'Has Hawk-i been run against real code?',
    a: "Yes. It has been run against Trail of Bits' not-so-smart-contracts, Damn Vulnerable DeFi, PancakeSwap's audited BNB Chain farming contracts (zero false criticals on production code), and DeFiVulnLabs' real incident reproductions, where the Deep agent invented and landed a live reentrancy drain in the sandbox.",
  },
  {
    q: 'Is it production ready at v1.0.0?',
    a: 'Yes. v1.0.0 is the first stable release: a finished, local-first toolkit with the Deep agent, deployed-contract scanning, the verify, deps, upgrade, and prove modules, audit-grade reporting, and structured export.',
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
