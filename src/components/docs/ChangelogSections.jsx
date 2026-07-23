import CodeBlock from '../common/CodeBlock.jsx'

const sec_title = (
  <>
                    <h1 className="text-4xl font-bold text-white mb-2">Hawk-i v1.0.0</h1>
                    <p className="text-grey">The first stable release of Hawk-i: a finished, local-first, open-source security-intelligence platform for Solidity and Web3 smart contracts. MIT licensed, no telemetry, no cloud requirement. This note walks through what ships in v1.0.0.</p>

  </>
)

const sec_highlights = (
  <>
                    <h2>1. Highlights</h2>
                    <p>Hawk-i v1.0.0 is a complete smart-contract security toolkit that runs entirely on your machine. The headline capabilities:</p>
                    <ul className="list-disc list-inside mb-4">
                        <li><strong>The Deep agent</strong> - an autonomous loop that invents novel exploits and proves them with a runnable Hardhat or Foundry proof-of-concept.</li>
                        <li><strong>50 static rules that actually run</strong> - every rule is verified by a liveness test that proves it fires through the real scan pipeline; there are no dead rules.</li>
                        <li><strong>Tested on real code</strong> - run against Trail of Bits' not-so-smart-contracts, Damn Vulnerable DeFi, PancakeSwap's audited BNB Chain farming contracts (zero false criticals on production code), and DeFiVulnLabs' incident reproductions.</li>
                        <li><strong>Deployed-contract scanning</strong> across the major EVM chains, pulling verified source from block explorers.</li>
                        <li><strong>Four focused security modules</strong> - verify, deps, upgrade, and prove.</li>
                        <li><strong>Audit-grade reporting</strong> with an audit style and an Immunefi bug-bounty style, plus first-class JSON export.</li>
                        <li><strong>A deterministic security score</strong> that maps findings to a clear risk band.</li>
                        <li><strong>MIT license and a firm no-telemetry promise.</strong></li>
                    </ul>
                    <div className="flex flex-wrap gap-3 mt-4">
                        <span className="badge">Open source</span>
                        <span className="badge">MIT licensed</span>
                        <span className="badge">Local-first</span>
                        <span className="badge">v1.0.0</span>
                    </div>

  </>
)

const sec_deep_agent = (
  <>
                    <h2>2. The Deep Agent</h2>
                    <p>The flagship of v1.0.0 is <code>hawki deep</code>, an autonomous exploit-hunting agent. It runs an asynchronous loop, gated by a budget manager:</p>
                    <CodeBlock code={`Planner.next_attack  ->  Executor.execute  ->  memory.record  ->  budget.consume`} />
                    <p>Planners escalate in creativity: RulePlanner drains the known attack scripts, HybridPlanner blends known patterns with contract context, and LLMPlanner invents novel attacks the rules never encoded. For a novel attack, the NovelExecutor uses an LLM code generator to synthesize a Hardhat or Foundry proof-of-concept and runs it in the Docker sandbox, so the result is a reproducible PoC rather than a bare claim.</p>
                    <p>Agent memory is pluggable: a SQLite store (default, at <code>~/.hawki/deep_memory.db</code>) or a JSON store. The budget is a dual limit on <code>max_attempts</code> and <code>max_tokens</code>, both defaulting to unlimited. Continuous mode and a target-contract focus round out the agent.</p>
                    <p>The agent has been exercised on real incident code: against DeFiVulnLabs' reproductions, it invented and landed a live reentrancy drain in the sandbox, growing the attacker balance from 1 ETH to 2 ETH.</p>
                    <CodeBlock code={`$ hawki deep ./contracts --sandbox --max-attempts 25`} />

  </>
)

const sec_deployed_scanning = (
  <>
                    <h2>3. Deployed-Contract and Multi-Chain Scanning</h2>
                    <p>Hawk-i scans live contracts by address, not just local source. Pass an address and a chain and it pulls verified source from the chain's block explorer (Etherscan-family), falling back to web3 and raw bytecode when source is not published.</p>
                    <CodeBlock code={`$ hawki scan --address 0xYourContract --chain ethereum`} />
                    <p>Per-chain RPC and explorer endpoints ship built in for seven EVM mainnets (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, and Avalanche), plus the Sepolia testnet and a local node. Override the RPC with <code>--rpc-url</code> and supply an explorer API key with <code>--explorer-key</code>.</p>

  </>
)

const sec_security_modules = (
  <>
                    <h2>4. Security Modules</h2>
                    <p>v1.0.0 ships four standalone security modules alongside the scan pipeline:</p>
                    <ul className="list-disc list-inside">
                        <li><strong>verify</strong> - compare deployed on-chain bytecode against local source, to catch source that does not match what is running.</li>
                        <li><strong>deps</strong> - dependency vulnerability scanning for known-vulnerable library and package versions.</li>
                        <li><strong>upgrade</strong> - proxy storage-collision safety, checking that a new implementation is storage-layout compatible with the old one.</li>
                        <li><strong>prove</strong> - formal verification via SMTChecker, with auto-discovered engines selected by <code>--engine</code>.</li>
                    </ul>

  </>
)

const sec_reporting = (
  <>
                    <h2>5. Reporting and JSON Export</h2>
                    <p>Reports are audit-grade and come in two styles: <code>audit</code> (a full security-audit layout) and <code>immunefi</code> (an Immunefi-style bug-bounty submission). Formats are Markdown, JSON, HTML, and PDF; HTML and PDF need the <code>reports</code> and <code>pdf</code> extras.</p>
                    <p>Every scan writes structured JSON to <code>./hawki_reports/</code> as its canonical record. Re-render any report or recompute the score from that file at any time:</p>
                    <CodeBlock code={`$ hawki report --input findings.json --style immunefi --format md
$ hawki score findings.json`} />
                    <p>A dedicated <code>hawki export</code> command handles pushing findings into other structured formats.</p>

  </>
)

const sec_security_score = (
  <>
                    <h2>6. Security Score</h2>
                    <p>Every scan produces a deterministic 0-100 security score. It starts at 100 and subtracts severity-weighted deductions per finding (Critical -15, High -8, Medium -4, Low -1) plus flat penalties, then clamps to the 0 to 100 range and maps to a risk band.</p>
                    <table>
                        <thead><tr><th>Score</th><th>Risk band</th></tr></thead>
                        <tbody>
                            <tr><td>90-100</td><td>Secure</td></tr>
                            <tr><td>75-89</td><td>Minor Risk</td></tr>
                            <tr><td>50-74</td><td>Moderate Risk</td></tr>
                            <tr><td>25-49</td><td>High Risk</td></tr>
                            <tr><td>0-24</td><td>Critical Risk</td></tr>
                        </tbody>
                    </table>

  </>
)

const sec_registry_doctor = (
  <>
                    <h2>7. Registry and Doctor</h2>
                    <p><strong>Registry.</strong> <code>hawki registry</code> keeps a local record of everything you have scanned at <code>~/.hawki/scanned_registry.json</code>. It never leaves your machine and needs no account.</p>
                    <p><strong>Doctor.</strong> <code>hawki doctor</code> is a preflight health check. Run it before a big scan to confirm Docker, LLM keys, and Foundry or Hardhat are all in place.</p>
                    <CodeBlock code={`$ hawki registry
$ hawki doctor`} />

  </>
)

const sec_licensing = (
  <>
                    <h2>8. MIT License and No Telemetry</h2>
                    <p>Hawk-i v1.0.0 is released under the <strong>MIT license</strong> and is 100% open source.</p>
                    <p>There is <strong>no telemetry</strong>. Hawk-i does not collect or transmit usage data of any kind, and it does not phone home. The <code>hawki metrics</code> command reports only statistics that are computed and stored on your own machine. Enabling LLM reasoning sends your prompts and keys directly to the provider you chose, never through any Hawk-i service; run a local model through Ollama to stay fully offline. All state lives in plain files under <code>~/.hawki/</code>.</p>

  </>
)

const sec_install_upgrade = (
  <>
                    <h2>9. Install and Upgrade</h2>
                    <p>Install or upgrade from PyPI:</p>
                    <CodeBlock code={`$ pip install --upgrade hawki`} />
                    <p>Optional extras add HTML and PDF reporting:</p>
                    <CodeBlock code={`$ pip install "hawki[all]"`} />
                    <p>Or pull the Docker image:</p>
                    <CodeBlock code={`$ docker pull 0xsemantic/hawki:latest`} />
                    <p>After upgrading, run <code>hawki doctor</code> to confirm your environment is ready.</p>

  </>
)

export const CHANGELOG_SECTIONS = {
  'title': sec_title,
  'highlights': sec_highlights,
  'deep-agent': sec_deep_agent,
  'deployed-scanning': sec_deployed_scanning,
  'security-modules': sec_security_modules,
  'reporting': sec_reporting,
  'security-score': sec_security_score,
  'registry-doctor': sec_registry_doctor,
  'licensing': sec_licensing,
  'install-upgrade': sec_install_upgrade,
}
