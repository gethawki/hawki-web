const CHAINS = ['Ethereum', 'BNB Chain', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche', 'Fantom', 'Gnosis']
const TOOLS = ['Slither', 'Mythril', 'Foundry', 'Hardhat', 'Echidna']

function TickerItems() {
  return (
    <>
      {CHAINS.map((c) => (
        <span className="ticker-item" key={c}>
          <i className="fas fa-link" /> {c}
        </span>
      ))}
      <span className="ticker-item text-[#333]">/</span>
      {TOOLS.map((t) => (
        <span className="ticker-item" key={t}>
          <i className="fas fa-shield-alt" /> {t}
        </span>
      ))}
    </>
  )
}

export default function Ticker() {
  return (
    <div className="ticker-wrap ticker-fade border-none shadow-none bg-transparent py-4">
      <div className="ticker-move opacity-70">
        <TickerItems />
        <TickerItems />
      </div>
    </div>
  )
}
