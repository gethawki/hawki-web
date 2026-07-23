import { Radar, Terminal } from 'lucide-react'
import { ALL_CHAINS, MODULES } from '../../data/product.js'

function TickerItems() {
  return (
    <>
      {ALL_CHAINS.map((c) => (
        <span className="ticker-item" key={c}>
          <Radar size={13} className="inline align-[-2px]" /> {c}
        </span>
      ))}
      <span className="ticker-item text-[#333]">/</span>
      {MODULES.map((m) => (
        <span className="ticker-item" key={m}>
          <Terminal size={13} className="inline align-[-2px] risk-low" />{' '}
          <span className="font-mono text-grey">hawki {m}</span>
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
