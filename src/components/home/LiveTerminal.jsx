import Section from '../common/Section.jsx'
import Terminal from '../common/Terminal.jsx'
import Reveal from '../common/Reveal.jsx'

const LINES = [
  { tone: 'prompt', prefix: '$', text: 'hawki scan 0xA0b8...48 --chain ethereum --ai' },
  { tone: 'dim', text: 'resolving verified source from Etherscan ... ok' },
  { tone: 'dim', text: 'indexing 6 contracts with tree-sitter ... ok' },
  { tone: 'output', text: 'running 50 static rules ...' },
  { tone: 'high', prefix: '!', text: 'High     reentrancy in withdraw()            Vault.sol:118' },
  { tone: 'high', prefix: '!', text: 'High     unchecked low-level call            Router.sol:64' },
  { tone: 'med', prefix: '~', text: 'Medium   missing access control on setOwner  Admin.sol:22' },
  { tone: 'low', prefix: '-', text: 'Low      shadowed state variable            Token.sol:9' },
  { tone: 'info', text: 'llm reasoning attached to 4 findings' },
  { tone: 'success', prefix: '=', text: 'report written to ./hawki_reports/report_20260715.json' },
  { tone: 'med', text: 'Security score: 72 / 100  (Moderate Risk)' },
]

export default function LiveTerminal() {
  return (
    <Section
      id="watch"
      num="01"
      kicker="Watch it run"
      title="One command, from address to evidence"
      intro="Point Hawk-i at a repo or a live contract. It resolves source, runs the rules, reasons over the findings, and prints a deterministic score, streaming as it goes."
      width="wide"
    >
      <Reveal delay={0.1}>
        <Terminal title="hawki scan" lines={LINES} className="max-w-3xl" />
      </Reveal>
    </Section>
  )
}
