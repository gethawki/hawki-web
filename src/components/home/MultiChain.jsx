import { useState } from 'react'
import { motion } from 'framer-motion'
import Section from '../common/Section.jsx'
import Reveal from '../common/Reveal.jsx'
import { MAINNETS, TESTNETS } from '../../data/product.js'

const SLUG = {
  Ethereum: 'ethereum',
  Polygon: 'polygon',
  Arbitrum: 'arbitrum',
  Optimism: 'optimism',
  Base: 'base',
  'BNB Chain': 'bnb',
  Avalanche: 'avalanche',
  Sepolia: 'sepolia',
  Local: 'local',
}

export default function MultiChain() {
  const [chain, setChain] = useState('Ethereum')

  return (
    <Section
      id="chains"
      num="04"
      kicker="Any address, any chain"
      title="Scan live contracts across the EVM"
      intro="Pass an address and a chain. Hawk-i pulls verified source straight from the block explorer, falling back to web3 and raw bytecode when source is not published."
      width="wide"
    >
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-start">
        <Reveal className="lg:col-span-7">
          <div className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-grey">
            Mainnets
          </div>
          <div className="flex flex-wrap gap-2.5 mb-6">
            {MAINNETS.map((c) => (
              <button
                key={c}
                onClick={() => setChain(c)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  chain === c
                    ? 'border-steel bg-[#687F97]/12 text-white'
                    : 'border-[#242424] text-[#8a8a8a] hover:border-[#3a3a3a] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-grey">
            Testnet and local
          </div>
          <div className="flex flex-wrap gap-2.5">
            {TESTNETS.map((c) => (
              <button
                key={c}
                onClick={() => setChain(c)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  chain === c
                    ? 'border-steel bg-[#687F97]/12 text-white'
                    : 'border-[#242424] text-[#8a8a8a] hover:border-[#3a3a3a] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="panel p-6">
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[#77746C] mb-4">
              command
            </div>
            <code className="block font-mono text-[13px] leading-relaxed text-[#c8c8c8]">
              <span className="text-steel">$</span> hawki scan --address{' '}
              <span className="text-[#7a7a7a]">0xA0b8...48</span>
              <br />
              <span className="pl-[5.2ch]">--chain </span>
              <motion.span
                key={chain}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-copper"
              >
                {SLUG[chain]}
              </motion.span>
            </code>
            <p className="text-[#7a7a7a] text-sm mt-5 leading-relaxed">
              Same scan pipeline, whether the target is a folder of Solidity or a contract already live on{' '}
              <span className="text-[#c0c0c0]">{chain}</span>.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
