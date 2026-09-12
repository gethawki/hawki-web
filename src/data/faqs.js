// Rendered by components/home/FAQSection.jsx and emitted as FAQPage JSON-LD on the homepage.
export const FAQS = [
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
