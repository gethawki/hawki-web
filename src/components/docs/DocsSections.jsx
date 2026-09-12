import { Link } from 'react-router-dom'
import CodeBlock from '../common/CodeBlock.jsx'

const sec_introduction = (
  <>
                    <h1>Introduction</h1>
                    <p className="lead text-lg text-white mb-4">Hawk-i is an open-source security-intelligence platform for Solidity and Web3 smart contracts. It combines deterministic static analysis, LLM reasoning, and a live Docker exploit sandbox into a single command-line tool that runs entirely on your machine.</p>
                    <p>Hawk-i v1.0.0 is a finished, local-first tool. There is no cloud requirement, no account, and no phone-home. Point it at a repository or a deployed contract address and it produces audit-grade findings, a quantified security score, and reproducible proof-of-concept exploits.</p>
                    <h3>What makes it different</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li><strong>Static plus reasoning plus proof</strong> - 50 auto-discovered rules, optional LLM reasoning, and a Docker sandbox that actually runs exploits.</li>
                        <li><strong>No dead rules</strong> - every static rule is verified by a liveness test that proves it fires through the real scan pipeline, not just in isolation.</li>
                        <li><strong>The Deep agent</strong> - an autonomous loop that invents novel attacks and synthesizes a Hardhat or Foundry proof-of-concept for each one.</li>
                        <li><strong>Deployed-contract scanning</strong> - pull verified source straight from block explorers across the major EVM chains.</li>
                        <li><strong>Audit-grade output</strong> - professional reports, an Immunefi-style submission format, and first-class JSON export.</li>
                    </ul>
                    <div className="flex flex-wrap gap-3 mt-6">
                        <span className="badge">Open source</span>
                        <span className="badge">MIT licensed</span>
                        <span className="badge">Local-first</span>
                        <span className="badge">No telemetry</span>
                        <span className="badge">v1.0.0</span>
                    </div>

  </>
)

const sec_installation = (
  <>
                    <h1>Installation</h1>
                    <h3>Prerequisites</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>Python 3.9+ (developed on 3.12)</li>
                        <li>Docker (optional, required only for the exploit sandbox and the Deep agent)</li>
                        <li>Foundry or Hardhat (optional, for proof-of-concept execution)</li>
                    </ul>

                    <h3>via pip (recommended)</h3>
                    <CodeBlock code={`$ pip install hawki`} />
                    <p className="text-sm text-grey">Package available at <a href="https://pypi.org/project/hawki/" target="_blank" rel="noreferrer" className="text-steel underline">pypi.org/project/hawki</a></p>

                    <h3>Optional extras</h3>
                    <p>HTML and PDF reports pull in a few extra dependencies. Install them with extras:</p>
                    <CodeBlock code={`$ pip install "hawki[reports]"   # jinja2 + matplotlib for HTML reports
$ pip install "hawki[pdf]"       # adds pdfkit for PDF output
$ pip install "hawki[all]"       # everything`} />

                    <h3>from source</h3>
                    <CodeBlock code={`$ git clone https://github.com/gethawki/hawki.git
$ cd hawki
$ pip install -e .`} />

                    <h3>Docker image</h3>
                    <CodeBlock code={`$ docker pull levichinecherem/hawki:latest
$ docker run --rm -v $(pwd):/repo levichinecherem/hawki scan /repo`} />
                    <p className="text-sm text-grey">Docker Hub: <a href="https://hub.docker.com/r/levichinecherem/hawki" target="_blank" rel="noreferrer" className="text-steel underline">hub.docker.com/r/levichinecherem/hawki</a></p>

                    <h3>Verify your setup</h3>
                    <p>Run the preflight health check to confirm Docker, LLM keys, and toolchains are wired up:</p>
                    <CodeBlock code={`$ hawki doctor`} />

  </>
)

const sec_quickstart = (
  <>
                    <h1>Quickstart</h1>
                    <p>Scan a local repository with the default static rule engine:</p>
                    <CodeBlock code={`$ hawki scan ./my-project`} />

                    <p>Add LLM reasoning and the Docker exploit sandbox for a full audit:</p>
                    <CodeBlock code={`$ hawki scan ./contracts --ai --sandbox --format pdf`} />

                    <p>Scan a live, deployed contract by address on any supported chain:</p>
                    <CodeBlock code={`$ hawki scan --address 0xYourContract --chain ethereum`} />

                    <p>Turn Hawk-i loose as an autonomous exploit hunter with the Deep agent:</p>
                    <CodeBlock code={`$ hawki deep ./contracts --sandbox`} />

                    <p>Re-render a report from a saved findings file, or just print its score:</p>
                    <CodeBlock code={`$ hawki report --input findings.json --format html --output report.html
$ hawki score findings.json`} />

                    <p className="mt-4">For the full command surface, see the <Link to="/docs/cli-reference" className="text-[#687F97] underline">CLI reference</Link>.</p>

  </>
)

const sec_cli_reference = (
  <>
                    <h1>CLI Reference</h1>
                    <p>The base command is <span className="inline-code">hawki</span>. Every capability is a subcommand.</p>

                    <h3>Command overview</h3>
                    <table><tbody><tr><th>Command</th><th>What it does</th></tr>
                        <tr><td><code>scan</code></td><td>Primary pipeline: index, static rules, optional AI and sandbox, deps, score, report.</td></tr>
                        <tr><td><code>deep</code></td><td>Autonomous agent that invents and runs novel exploits.</td></tr>
                        <tr><td><code>verify</code></td><td>Compare deployed bytecode against local source.</td></tr>
                        <tr><td><code>deps</code></td><td>Dependency vulnerability scanning.</td></tr>
                        <tr><td><code>upgrade</code></td><td>Proxy storage-collision safety for upgradeable contracts.</td></tr>
                        <tr><td><code>prove</code></td><td>Formal verification via SMTChecker.</td></tr>
                        <tr><td><code>registry</code></td><td>Local record of what you have scanned.</td></tr>
                        <tr><td><code>report</code></td><td>Re-render a report from a saved findings JSON.</td></tr>
                        <tr><td><code>score</code></td><td>Print the security score for a findings file.</td></tr>
                        <tr><td><code>export</code></td><td>Export findings to structured formats.</td></tr>
                        <tr><td><code>monitor</code></td><td>Watch a repo or contract and rescan on change.</td></tr>
                        <tr><td><code>metrics</code></td><td>Show your local scan statistics.</td></tr>
                        <tr><td><code>doctor</code></td><td>Preflight health check.</td></tr>
                    </tbody></table>

                    <h3>hawki scan</h3>
                    <p>Run a security scan on a local directory, a Git URL, or a deployed contract address.</p>
                    <CodeBlock code={`hawki scan <path> [options]
hawki scan --address <0x...> --chain <chain> [options]`} />
                    <p><strong>Options:</strong></p>
                    <ul className="list-disc list-inside mb-2">
                        <li><code>-v, --verbose</code> - Enable debug logging.</li>
                        <li><code>-o, --output-dir &lt;dir&gt;</code> - Directory for reports (default: <code>./hawki_reports</code>).</li>
                        <li><code>--ai</code> - Enable LLM reasoning (requires an API key).</li>
                        <li><code>--ai-model &lt;model&gt;</code> - LLM model, e.g. <code>gemini/gemini-1.5-flash</code>, <code>openai/gpt-4</code>.</li>
                        <li><code>--api-key &lt;key&gt;</code> - API key for the chosen LLM (or set the matching env var).</li>
                        <li><code>--sandbox</code> - Run the Docker exploit sandbox.</li>
                        <li><code>--address &lt;0x...&gt;</code> - Scan a deployed contract instead of a path.</li>
                        <li><code>--chain &lt;name&gt;</code> - Target chain for address scans (ethereum, polygon, arbitrum, ...).</li>
                        <li><code>--rpc-url &lt;url&gt;</code> - Override the default RPC endpoint.</li>
                        <li><code>--explorer-key &lt;key&gt;</code> - Block-explorer API key for source retrieval.</li>
                        <li><code>--format {'{'}md,json,html,pdf{'}'}</code> - Report format (default: md).</li>
                    </ul>

                    <h3>hawki deep</h3>
                    <p>Run the autonomous Deep agent against a target. See the <Link to="/docs/deep-agent" className="text-[#687F97] underline">Deep agent</Link> page for the full model.</p>
                    <CodeBlock code={`hawki deep <path> [--sandbox] [--max-attempts N] [--max-tokens N] [--continuous]`} />

                    <h3>hawki report</h3>
                    <p>Re-render an audit-grade report from a saved findings JSON.</p>
                    <CodeBlock code={`hawki report [--input findings.json] [--format md|json|html|pdf] [--style audit|immunefi] [--output report.pdf]`} />

                    <h3>hawki score</h3>
                    <p>Compute and print the deterministic security score (0-100) for a findings file.</p>
                    <CodeBlock code={`hawki score findings.json`} />

                    <h3>Examples</h3>
                    <CodeBlock code={`# Basic local scan
hawki scan ./my-project

# Scan with LLM reasoning
hawki scan ./my-project --ai --ai-model openai/gpt-4

# Full audit with sandbox and a PDF report
hawki scan ./my-project --ai --sandbox --format pdf

# Scan a deployed contract on Arbitrum
hawki scan --address 0xYourContract --chain arbitrum

# Hunt for novel exploits autonomously
hawki deep ./my-project --sandbox --max-attempts 25

# Re-render an Immunefi-style submission
hawki report --input findings.json --style immunefi --format md`} />

  </>
)

const sec_scanning = (
  <>
                    <h1>Scanning</h1>
                    <p>The <span className="inline-code">hawki scan</span> pipeline is the core workflow. It runs a fixed sequence of stages and produces a findings set, a security score, and a report.</p>

                    <h3>The pipeline</h3>
                    <ol className="list-decimal list-inside mb-4">
                        <li><strong>Index</strong> - the source is parsed with tree-sitter, contracts and dependencies are mapped.</li>
                        <li><strong>Static rules</strong> - 50 auto-discovered rules run, and each finding is enriched with a remediation template.</li>
                        <li><strong>AI reasoning</strong> (with <code>--ai</code>) - an LLM adds explanation and impact context.</li>
                        <li><strong>Sandbox</strong> (with <code>--sandbox</code>) - attack scripts run inside Docker to confirm exploitability.</li>
                        <li><strong>Deps</strong> - dependency versions are checked for known vulnerabilities.</li>
                        <li><strong>Score and report</strong> - findings are scored and rendered.</li>
                    </ol>
                    <p>Reports land in <span className="inline-code">./hawki_reports/</span> as timestamped <span className="inline-code">report_*.json</span> files. Persistent state lives under <span className="inline-code">~/.hawki/</span>.</p>

                    <h3>Scanning local code</h3>
                    <p>Point Hawk-i at a directory or a Git URL. Remote repositories are cloned automatically.</p>
                    <CodeBlock code={`$ hawki scan ./contracts
$ hawki scan https://github.com/org/repo.git`} />

                    <h3>Scanning deployed contracts by address</h3>
                    <p>Pass an address and a chain. Hawk-i pulls verified source from the chain's block explorer (Etherscan-family), falling back to web3 and raw bytecode when source is unavailable.</p>
                    <CodeBlock code={`$ hawki scan --address 0xYourContract --chain ethereum
$ hawki scan --address 0xYourContract --chain polygon --explorer-key <KEY>`} />

                    <h3>Supported chains</h3>
                    <p>Per-chain RPC and explorer endpoints ship built in for seven EVM mainnets, plus the Sepolia testnet and a local node:</p>
                    <ul className="grid sm:grid-cols-2 gap-1 mt-2 mb-4">
                        <li><span className="text-steel">-</span> Ethereum</li>
                        <li><span className="text-steel">-</span> Polygon</li>
                        <li><span className="text-steel">-</span> Arbitrum</li>
                        <li><span className="text-steel">-</span> Optimism</li>
                        <li><span className="text-steel">-</span> Base</li>
                        <li><span className="text-steel">-</span> BNB Chain</li>
                        <li><span className="text-steel">-</span> Avalanche</li>
                        <li><span className="text-steel">-</span> Sepolia (testnet)</li>
                        <li><span className="text-steel">-</span> Local (Anvil or Hardhat)</li>
                    </ul>
                    <p>Use <span className="inline-code">--rpc-url</span> to point at your own node and <span className="inline-code">--explorer-key</span> to supply a block-explorer API key.</p>

  </>
)

const sec_security_score = (
  <>
                    <h1>Security Score</h1>
                    <p>Hawk-i computes a deterministic 0-100 security score from the findings of a scan. The same findings always produce the same score.</p>
                    <h3>Formula</h3>
                    <p>The score starts at 100 and subtracts severity-weighted deductions per finding, plus flat penalties, then clamps to the range 0 to 100:</p>
                    <ul className="list-disc list-inside">
                        <li>Critical: -15</li>
                        <li>High: -8</li>
                        <li>Medium: -4</li>
                        <li>Low: -1</li>
                    </ul>
                    <h3>Risk bands</h3>
                    <table><tbody><tr><th>Score</th><th>Risk band</th></tr>
                        <tr><td>90-100</td><td>Secure</td></tr>
                        <tr><td>75-89</td><td>Minor Risk</td></tr>
                        <tr><td>50-74</td><td>Moderate Risk</td></tr>
                        <tr><td>25-49</td><td>High Risk</td></tr>
                        <tr><td>0-24</td><td>Critical Risk</td></tr></tbody></table>
                    <p className="mt-4">The score appears in every report and can be printed standalone from a saved findings file with <span className="inline-code">hawki score findings.json</span>.</p>

  </>
)

const sec_reporting = (
  <>
                    <h1>Audit-Grade Reporting</h1>
                    <p>Hawk-i produces professional, audit-grade reports suitable for team reviews, auditor handoffs, and bug-bounty submissions. Reports can be generated during a scan or re-rendered later from a saved findings JSON with <span className="inline-code">hawki report</span>.</p>

                    <h3>Report styles</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li><strong>audit</strong> - a full security-audit layout: executive summary, severity counts, security score, and per-finding detail.</li>
                        <li><strong>immunefi</strong> - an Immunefi-style bug-bounty submission format, ready to file against a bounty program.</li>
                    </ul>
                    <CodeBlock code={`$ hawki report --input findings.json --style audit --format pdf
$ hawki report --input findings.json --style immunefi --format md`} />

                    <h3>Output formats</h3>
                    <p>Markdown, JSON, HTML, and PDF. HTML and PDF require the <span className="inline-code">reports</span> and <span className="inline-code">pdf</span> extras (PDF is rendered by converting the HTML through pdfkit).</p>

                    <h3>Per-finding detail</h3>
                    <ul className="list-disc list-inside">
                        <li>Title and severity</li>
                        <li>File and line number</li>
                        <li>Vulnerable code snippet</li>
                        <li>Recommended fix snippet, from the remediation templates</li>
                        <li>Explanation and impact (LLM reasoning or the rule's fallback template)</li>
                    </ul>

                    <h3>JSON export as a first-class output</h3>
                    <p>Every scan writes structured JSON to <span className="inline-code">./hawki_reports/</span>. That JSON is the canonical record of a scan: feed it back into <span className="inline-code">hawki report</span> or <span className="inline-code">hawki score</span>, diff it across runs, or wire it into CI. The dedicated <span className="inline-code">hawki export</span> command exists for pushing findings into other structured formats.</p>

  </>
)

const sec_deep_agent = (
  <>
                    <h1>The Deep Agent</h1>
                    <p className="lead text-lg text-white mb-4">Hawk-i Deep is the flagship capability: an autonomous agent that does not just match known patterns, it invents new attacks and proves them by running working exploit code.</p>
                    <CodeBlock code={`$ hawki deep ./contracts --sandbox`} />

                    <h3>How the loop works</h3>
                    <p>Deep runs an asynchronous loop, gated by a budget manager:</p>
                    <CodeBlock code={`Planner.next_attack  ->  Executor.execute  ->  memory.record  ->  budget.consume`} />
                    <p>Each cycle a planner proposes the next attack, an executor attempts it, the outcome is recorded in memory, and the budget is consumed. The loop continues while the budget allows.</p>

                    <h3>Escalating planners</h3>
                    <p>Deep escalates through three planners of increasing creativity:</p>
                    <ul className="list-disc list-inside mb-4">
                        <li><strong>RulePlanner</strong> - drains the canned, known attack scripts first.</li>
                        <li><strong>HybridPlanner</strong> - blends known patterns with contract-specific context.</li>
                        <li><strong>LLMPlanner</strong> - invents novel attacks that the static rules never encoded.</li>
                    </ul>

                    <h3>Proof, not just a claim</h3>
                    <p>When the agent reaches for a novel attack, the NovelExecutor uses an LLM code generator to synthesize a Hardhat or Foundry proof-of-concept and runs it inside the Docker sandbox. The output is a reproducible PoC alongside the finding, so an exploit is demonstrated rather than merely asserted.</p>

                    <h3>Pluggable memory</h3>
                    <p>Everything the agent learns is persisted so runs build on each other. Two backends ship:</p>
                    <ul className="list-disc list-inside mb-4">
                        <li><strong>SQLiteStore</strong> (default) - <span className="inline-code">~/.hawki/deep_memory.db</span></li>
                        <li><strong>JSONStore</strong> - a plain-text JSONL log</li>
                    </ul>

                    <h3>Dual budget</h3>
                    <p>The budget is a dual limit: the agent stops when it hits either <span className="inline-code">max_attempts</span> or <span className="inline-code">max_tokens</span>, whichever comes first. Both default to unlimited, so you set the ceiling that fits your run.</p>
                    <CodeBlock code={`$ hawki deep ./contracts --sandbox --max-attempts 25 --max-tokens 200000`} />

                    <h3>Continuous and focused runs</h3>
                    <p>Deep supports a continuous mode for long-running hunts, and a target-contract focus to concentrate the agent on a single contract of interest.</p>

  </>
)

const sec_security_modules = (
  <>
                    <h1>Security Modules</h1>
                    <p>Beyond the scan pipeline, Hawk-i ships four focused security modules as standalone subcommands. Each answers one sharp question about a contract.</p>

                    <h3>verify - source matches deployed bytecode</h3>
                    <p>Compare the bytecode of a deployed contract against your local source, so you can detect source that does not match what is actually running on-chain.</p>
                    <CodeBlock code={`$ hawki verify --address 0xYourContract --chain ethereum --source ./contracts`} />

                    <h3>deps - dependency vulnerability scanning</h3>
                    <p>Flag known-vulnerable library and package versions in the project's dependency set.</p>
                    <CodeBlock code={`$ hawki deps ./my-project`} />

                    <h3>upgrade - proxy storage-collision safety</h3>
                    <p>For upgradeable contracts, check whether a new implementation is storage-layout compatible with the old one. Storage collisions across an upgrade are a classic source of catastrophic bugs.</p>
                    <CodeBlock code={`$ hawki upgrade --old ./OldImpl.sol --new ./NewImpl.sol`} />

                    <h3>prove - formal verification</h3>
                    <p>Run formal verification via SMTChecker. Verification engines are auto-discovered; select one with <span className="inline-code">--engine</span>.</p>
                    <CodeBlock code={`$ hawki prove ./contracts --engine smtchecker`} />

  </>
)

const sec_registry = (
  <>
                    <h1>Contract Registry</h1>
                    <p>The registry is a local record of everything you have scanned. It lives at <span className="inline-code">~/.hawki/scanned_registry.json</span> and never leaves your machine.</p>
                    <CodeBlock code={`$ hawki registry`} />
                    <p>Use it to keep track of contracts and repositories you have audited over time, without any external service or account.</p>

  </>
)

const sec_doctor = (
  <>
                    <h1>Doctor</h1>
                    <p>The <span className="inline-code">doctor</span> command is a preflight health check. Run it before a big scan to confirm your environment is ready.</p>
                    <CodeBlock code={`$ hawki doctor`} />
                    <p>It checks for things like a working Docker daemon (needed for the sandbox and Deep agent), configured LLM API keys, and the presence of Foundry or Hardhat for proof-of-concept execution. Doctor also reads <span className="inline-code">~/.hawki/config.yaml</span> if present. That config file is consulted only by <span className="inline-code">doctor</span> and diagnostics; <span className="inline-code">scan</span> and <span className="inline-code">deep</span> take everything from CLI flags.</p>

  </>
)

const sec_monitoring = (
  <>
                    <h1>Monitoring</h1>
                    <p>Hawk-i can watch a repository or a deployed contract and rescan automatically when something changes.</p>
                    <CodeBlock code={`$ hawki monitor ./my-project --interval 300 --alert-log alerts.txt`} />
                    <p><strong>Options:</strong></p>
                    <ul className="list-disc list-inside mb-2">
                        <li><code>-c, --config &lt;file&gt;</code> - JSON configuration file for watchers.</li>
                        <li><code>--state-dir &lt;dir&gt;</code> - Directory for watcher state (default: <code>~/.hawki/monitor_state</code>).</li>
                        <li><code>--alert-log &lt;file&gt;</code> - File to append alerts to.</li>
                        <li><code>--interval &lt;sec&gt;</code> - Polling interval in seconds (default: 60).</li>
                        <li><code>--branch &lt;name&gt;</code> - Git branch to monitor (default: main).</li>
                        <li><code>--contract-address &lt;addr&gt;</code> - Deployed contract address to monitor.</li>
                        <li><code>--rpc-url &lt;url&gt;</code> - RPC URL for contract monitoring.</li>
                    </ul>
                    <p>Watchers are pluggable: drop a subclass of <span className="inline-code">Watcher</span> into <span className="inline-code">monitoring/watchers/</span> and it is discovered automatically.</p>

  </>
)

const sec_architecture = (
  <>
                    <h1>Architecture</h1>
                    <p>Hawk-i is a set of independent subsystems. The <span className="inline-code">scan</span> pipeline chains a few of them together; the rest are standalone subcommands.</p>

                    <h3>Scan pipeline stages</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li><strong>Repository intelligence</strong> - indexes and parses source with tree-sitter, handles remote clones and the deployed-address path.</li>
                        <li><strong>Static rule engine</strong> - runs auto-discovered rules and enriches findings with remediation templates.</li>
                        <li><strong>AI engine</strong> - renders a prompt template and calls the configured LLM through litellm (only with <code>--ai</code>).</li>
                        <li><strong>Exploit sandbox</strong> - runs attack scripts in Docker (only with <code>--sandbox</code>).</li>
                        <li><strong>Data layer</strong> - scores findings and renders the report.</li>
                    </ul>

                    <h3>Standalone subsystems</h3>
                    <p>The Deep agent, verify, upgrade, prove, registry, monitoring, and export are standalone subcommands rather than pipeline stages. Each can be used on its own.</p>

                    <h3>The finding model</h3>
                    <p>A finding is a plain dictionary, not a rigid class. The de-facto schema is <span className="inline-code">title</span>, <span className="inline-code">severity</span>, <span className="inline-code">file</span>, <span className="inline-code">line</span>, and <span className="inline-code">vulnerable_snippet</span>, merged with <span className="inline-code">explanation</span>, <span className="inline-code">impact</span>, <span className="inline-code">fix_snippet</span>, and <span className="inline-code">rule</span>. This keeps the JSON output easy to consume and easy to extend.</p>

                    <h3>State on disk</h3>
                    <p>All persistent state lives under <span className="inline-code">~/.hawki/</span>: the scanned registry, Deep agent memory, monitor state, and local metrics. Reports are written to <span className="inline-code">./hawki_reports/</span> in your working directory. Nothing is sent anywhere.</p>

  </>
)

const sec_vulnerability_library = (
  <>
                    <h1>Vulnerability Library</h1>
                    <p>Hawk-i ships 50 source-level detection rules covering the common classes of smart-contract vulnerability: reentrancy, access control, integer overflow, oracle manipulation, unchecked external and ERC20 calls, weak randomness, unsafe downcasts, ecrecover checks, upgrade safety, selfdestruct, locked ether, and code-hygiene issues such as outdated Solidity versions, floating pragmas, inline assembly, and deprecated constructs.</p>
                    <h3>No dead rules</h3>
                    <p>Every rule is backed by a liveness test: a crafted triggering contract is indexed through the real repository indexer and passed to the rule exactly as the scan pipeline passes it, and the rule must produce at least one finding. A rule that only works on hand-crafted inputs, or never fires in production, fails the suite. Adding a new rule requires adding its liveness trigger. The result is 50 rules that actually run, not a padded count.</p>
                    <h3>Tested on real code</h3>
                    <p>The rule set and the Deep agent have been run against real third-party corpora: Trail of Bits' not-so-smart-contracts, Damn Vulnerable DeFi, PancakeSwap's audited BNB Chain farming contracts (zero false criticals on production code), and DeFiVulnLabs' real incident reproductions, where the Deep agent invented and landed a live reentrancy drain in the sandbox (attacker balance grew from 1 ETH to 2 ETH).</p>
                    <p>Every rule pairs with supporting assets:</p>
                    <ul className="list-disc list-inside mb-4">
                        <li>A detection rule in Python, discovered automatically at runtime.</li>
                        <li>A remediation template that populates the fix snippet in reports.</li>
                        <li>For critical and high findings, an attack script the sandbox can run.</li>
                    </ul>

                    <h3>The plugin model</h3>
                    <p>Extending Hawk-i means dropping a file in the right directory; no central registration. The directories and their contracts:</p>
                    <table><tbody><tr><th>Directory</th><th>Add</th></tr>
                        <tr><td><code>static_rule_engine/rules/</code></td><td>Subclass <code>BaseRule</code>, implement <code>run_check</code>.</td></tr>
                        <tr><td><code>remediation_engine/templates/</code></td><td>A JSON file; the filename stem is the rule id.</td></tr>
                        <tr><td><code>exploit_sandbox/attack_scripts/</code></td><td>A Python script following the runtime protocol.</td></tr>
                        <tr><td><code>formal/</code></td><td>Subclass <code>Verifier</code>, implement <code>verify</code>.</td></tr>
                        <tr><td><code>monitoring/watchers/</code></td><td>Subclass <code>Watcher</code>, implement <code>check</code>.</td></tr>
                        <tr><td><code>ai_engine/prompt_templates/</code></td><td>A JSON prompt template.</td></tr>
                    </tbody></table>

                    <h3>Name coupling</h3>
                    <p>The one rule to remember is cross-directory name coupling. A rule class name drives the ids of its companion files. For example <span className="inline-code">ReentrancyRule</span> gives rule id <span className="inline-code">reentrancy</span>, which maps to <span className="inline-code">remediation_engine/templates/reentrancy.json</span> and <span className="inline-code">attack_scripts/reentrancy_attack.py</span>. The names must line up across all three.</p>
                    <p>See the <a href="https://github.com/gethawki/hawki/tree/main/hawki/core/static_rule_engine/rules" target="_blank" rel="noreferrer" className="text-steel underline">rules directory</a> for the full list.</p>

  </>
)

const sec_ai_integration = (
  <>
                    <h1>AI Integration</h1>
                    <p>LLM reasoning is optional and off by default. Enable it with the <code>--ai</code> flag. Hawk-i routes all model calls through litellm, so it works with several providers behind one interface.</p>

                    <h3>Command-line flags</h3>
                    <ul className="list-disc list-inside">
                        <li><code>--ai</code> - Enable LLM reasoning.</li>
                        <li><code>--ai-model</code> - Specify the model, e.g. <code>gemini/gemini-1.5-flash</code>, <code>openai/gpt-4</code>, <code>ollama/codellama</code>.</li>
                        <li><code>--api-key</code> - Provide the API key directly (alternative to environment variables).</li>
                    </ul>
                    <p>The default model is <span className="inline-code">gemini/gemini-1.5-flash</span>.</p>

                    <h3>Environment variables</h3>
                    <p>Keys can be supplied via environment variables (recommended). Hawk-i routes to the right one by model prefix:</p>
                    <CodeBlock code={`export GEMINI_API_KEY=your_key_here      # Google Gemini
export OPENAI_API_KEY=your_key_here      # OpenAI
export ANTHROPIC_API_KEY=your_key_here   # Anthropic`} />
                    <p className="text-sm text-grey">Your keys stay on your machine. Hawk-i passes them straight to the provider you chose and never routes them through any Hawk-i service.</p>

                    <h3>Local models with Ollama</h3>
                    <p>To keep everything offline, run a local model through <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-steel underline">Ollama</a>. Specify the model as <code>ollama/&lt;model_name&gt;</code>:</p>
                    <CodeBlock code={`$ hawki scan ./contracts --ai --ai-model ollama/codellama`} />
                    <p>Make sure Ollama is running locally and the model is pulled.</p>

                    <h3>Fallback behavior</h3>
                    <p>When <code>--ai</code> is not used, Hawk-i falls back to the explanation and impact templates provided by each rule. Every finding still ships with a clear description and remediation guidance, even with no LLM in the loop.</p>

  </>
)

const sec_privacy = (
  <>
                    <h1>Privacy Promise</h1>
                    <p className="lead text-lg text-white mb-4">Hawk-i is local-first and stays that way. There is no telemetry, no cloud requirement, and no phone-home. Ever.</p>
                    <ul className="list-disc list-inside">
                        <li><strong>No telemetry.</strong> Hawk-i does not collect or transmit usage data. The <span className="inline-code">hawki metrics</span> command shows statistics that are computed and stored purely on your own machine.</li>
                        <li><strong>No cloud requirement.</strong> Every capability runs locally. There is no account, no login, and no managed service.</li>
                        <li><strong>Your code stays put.</strong> Source is analyzed on your machine and never uploaded anywhere.</li>
                        <li><strong>Keys you control.</strong> If you enable LLM reasoning, your API keys go directly to the provider you chose. Prefer full offline operation? Run a local model through Ollama.</li>
                        <li><strong>Ephemeral sandboxes.</strong> Docker exploit sandboxes are created for a run and torn down after.</li>
                        <li><strong>State you can inspect.</strong> Everything Hawk-i remembers lives in plain files under <span className="inline-code">~/.hawki/</span> and reports under <span className="inline-code">./hawki_reports/</span>.</li>
                    </ul>

  </>
)

const sec_contributing = (
  <>
                    <h1>Contributing</h1>
                    <p>Hawk-i is MIT licensed and fully open source. Contributions are welcome on <a href="https://github.com/gethawki/hawki" target="_blank" rel="noreferrer" className="text-[#687F97] underline">GitHub</a>.</p>
                    <p>The plugin model means most contributions never touch core code: new detection rules, remediation templates, attack scripts, formal-verification engines, monitoring watchers, and prompt templates are all added by dropping a file in the right directory. See the <Link to="/docs/vulnerability-library" className="text-[#687F97] underline">Vulnerability Library</Link> page for the directory contracts, and read <span className="inline-code">CONTRIBUTING.md</span> in the repository before opening a pull request.</p>

  </>
)

export const DOCS_SECTIONS = {
  'introduction': sec_introduction,
  'installation': sec_installation,
  'quickstart': sec_quickstart,
  'cli-reference': sec_cli_reference,
  'scanning': sec_scanning,
  'security-score': sec_security_score,
  'reporting': sec_reporting,
  'deep-agent': sec_deep_agent,
  'security-modules': sec_security_modules,
  'registry': sec_registry,
  'doctor': sec_doctor,
  'monitoring': sec_monitoring,
  'architecture': sec_architecture,
  'vulnerability-library': sec_vulnerability_library,
  'ai-integration': sec_ai_integration,
  'privacy': sec_privacy,
  'contributing': sec_contributing,
}
