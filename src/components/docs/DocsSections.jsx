import CodeBlock from '../common/CodeBlock.jsx'

const sec_introduction = (
  <>
                    <h2>Introduction</h2>
                    <p className="lead text-lg text-white mb-4">Hawk‑i is an open security intelligence platform for Web3 repositories. It combines deterministic static analysis, AI reasoning, and live exploit simulation into a unified, privacy‑first tool.</p>
                    <p>With the <strong>v0.7.0 release</strong>, Hawk‑i evolves from a functional scanner to an <strong>audit‑grade security intelligence system</strong>. It now produces professional reports with quantified risk scores, guided remediation snippets, and optional telemetry to measure ecosystem impact.</p>
                    <div className="flex flex-wrap gap-3 mt-6">
                        <span className="badge">Open source</span>
                        <span className="badge">AI‑augmented</span>
                        <span className="badge">Self‑hostable</span>
                        <span className="badge">v0.7.0</span>
                    </div>
        
  </>
)

const sec_installation = (
  <>
                    <h2>Installation</h2>
                    <h3>Prerequisites</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>Python 3.9+</li>
                        <li>Node.js 16+ (for sandbox)</li>
                        <li>Docker (optional, for exploit simulation)</li>
                    </ul>

                    <h3>via pip (recommended)</h3>
                    <CodeBlock code={`$ pip install hawki`} />
                    <p className="text-sm text-grey">Package available at <a href="https://pypi.org/project/hawki/" target="_blank" rel="noreferrer" className="text-steel underline">pypi.org/project/hawki</a></p>

                    <h3>from source</h3>
                    <CodeBlock code={`$ git clone https://github.com/0xSemantic/hawki.git
$ cd hawki
$ pip install -e .`} />

                    <h3>Docker image</h3>
                    <CodeBlock code={`$ docker pull levichinecherem/hawki:latest
$ docker run --rm -v $(pwd):/repo levichinecherem/hawki scan /repo`} />
                    <p className="text-sm text-grey">Docker Hub: <a href="https://hub.docker.com/r/levichinecherem/hawki" target="_blank" rel="noreferrer" className="text-steel underline">hub.docker.com/r/levichinecherem/hawki</a></p>
        
  </>
)

const sec_quickstart = (
  <>
                    <h2>Quickstart</h2>
                    <p>Scan a local repository with default settings (Minimal mode):</p>
                    <CodeBlock code={`$ hawki scan ./my-project`} />

                    <p>Run a full audit with AI reasoning and exploit simulation (Full Audit mode):</p>
                    <CodeBlock code={`$ hawki scan ./contracts --ai --sandbox --format pdf --telemetry`} />

                    <p>Generate a report from the latest scan:</p>
                    <CodeBlock code={`$ hawki report --format html --output report.html`} />

                    <p>View the security score of a previous findings file:</p>
                    <CodeBlock code={`$ hawki score findings.json`} />

                    <p>Display local telemetry stats:</p>
                    <CodeBlock code={`$ hawki metrics`} />

                    <p className="mt-4">For more, see the <a href="#cli-reference" className="text-[#687F97] underline">CLI reference</a>.</p>
        
  </>
)

const sec_cli_reference = (
  <>
                    <h2>CLI Reference</h2>
                    <p>The main command is <span className="inline-code">hawki</span>. Below are all available subcommands and options.</p>

                    <h3>hawki scan</h3>
                    <p>Perform a one‑time security scan on a local directory or Git repository. Supports three operational modes depending on flags.</p>
                    <CodeBlock code={`hawki scan <path> [options]`} />
                    <p><strong>Options:</strong></p>
                    <ul className="list-disc list-inside mb-2">
                        <li><code>-v, --verbose</code> – Enable debug logging.</li>
                        <li><code>-o, --output-dir &lt;dir&gt;</code> – Directory to store reports (default: <code>./hawki_reports</code>).</li>
                        <li><code>--ai</code> – Enable AI‑powered analysis (requires API key).</li>
                        <li><code>--ai-model &lt;model&gt;</code> – LLM model (e.g., <code>gemini/gemini-1.5-flash</code>, <code>openai/gpt-4</code>).</li>
                        <li><code>--api-key &lt;key&gt;</code> – API key for the chosen LLM (or set env var).</li>
                        <li><code>--sandbox</code> – Run exploit simulation sandbox (requires Docker).</li>
                        <li><code>--telemetry</code> – Opt in to anonymous usage metrics.</li>
                        <li><code>--format {'{'}md,json,html,pdf{'}'}</code> – Output report format (default: md).</li>
                    </ul>

                    <h3>hawki monitor</h3>
                    <p>Continuously monitor a repository or deployed contract for changes and trigger automatic rescans.</p>
                    <CodeBlock code={`hawki monitor [target] [options]`} />
                    <p><strong>Options:</strong></p>
                    <ul className="list-disc list-inside mb-2">
                        <li><code>-c, --config &lt;file&gt;</code> – JSON configuration file for watchers.</li>
                        <li><code>--state-dir &lt;dir&gt;</code> – Directory to store watcher state (default: <code>~/.hawki/monitor_state</code>).</li>
                        <li><code>--alert-log &lt;file&gt;</code> – File to append alerts to.</li>
                        <li><code>--interval &lt;sec&gt;</code> – Polling interval in seconds (default: 60).</li>
                        <li><code>--branch &lt;name&gt;</code> – Git branch to monitor (default: main).</li>
                        <li><code>--contract-address &lt;addr&gt;</code> – Ethereum contract address to monitor.</li>
                        <li><code>--rpc-url &lt;url&gt;</code> – RPC URL for contract monitoring (default: <code>http://localhost:8545</code>).</li>
                    </ul>

                    <h3>hawki report</h3>
                    <p>Generate an audit‑grade report from a previous scan’s findings (JSON file) or from the latest scan.</p>
                    <CodeBlock code={`hawki report [--input findings.json] [--format pdf|md|html|json] [--output report.pdf]`} />
                    <p><strong>Options:</strong></p>
                    <ul className="list-disc list-inside mb-2">
                        <li><code>-i, --input &lt;file&gt;</code> – Path to findings JSON file (if omitted, uses latest scan in output dir).</li>
                        <li><code>-f, --format &lt;format&gt;</code> – Output format (md, json, html, pdf).</li>
                        <li><code>-o, --output &lt;file&gt;</code> – Output file path.</li>
                    </ul>

                    <h3>hawki score</h3>
                    <p>Calculate and display the security score (0–100) for a given findings file.</p>
                    <CodeBlock code={`hawki score findings.json`} />

                    <h3>hawki metrics</h3>
                    <p>Display locally stored telemetry statistics (if any).</p>
                    <CodeBlock code={`hawki metrics`} />

                    <h3>hawki simulate</h3>
                    <p>Run a specific exploit simulation against a contract (advanced usage).</p>
                    <CodeBlock code={`hawki simulate --target Vault.sol --attack reentrancy`} />
                    <p><strong>Options:</strong></p>
                    <ul className="list-disc list-inside mb-2">
                        <li><code>--target &lt;file&gt;</code> – Solidity file or contract name.</li>
                        <li><code>--attack &lt;name&gt;</code> – Name of the attack script (e.g., <code>reentrancy</code>).</li>
                    </ul>

                    <h3>Examples</h3>
                    <CodeBlock code={`# Basic scan (Minimal mode)
hawki scan ./my-project

# Enhanced scan with AI
hawki scan ./my-project --ai --ai-model openai/gpt-4

# Full audit with sandbox and PDF report
hawki scan ./my-project --ai --sandbox --format pdf --output report.pdf

# Monitor a repository
hawki monitor ./my-project --interval 300 --alert-log alerts.txt

# Generate a report from previous scan
hawki report --input findings.json --format html --output report.html

# View security score
hawki score findings.json

# Show telemetry stats
hawki metrics
        `} />
        
  </>
)

const sec_operational_modes = (
  <>
                    <h2>Operational Modes</h2>
                    <p>Hawk‑i adapts to your environment and privacy needs. Three modes are supported:</p>
                    <table><tbody><tr><th>Mode</th><th>Static Rules</th><th>AI</th><th>Sandbox</th><th>Docker Required</th></tr>
                        <tr><td><strong>Minimal</strong></td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        <tr><td><strong>Enhanced</strong></td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        <tr><td><strong>Full Audit</strong></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr></tbody></table>
                    <p className="mt-4">The generated report will indicate which mode was used and adapt content accordingly (e.g., omit exploit steps if sandbox not enabled).</p>
        
  </>
)

const sec_reporting = (
  <>
                    <h2>Audit‑Grade Reporting (ARS v2)</h2>
                    <p>v0.7.0 introduces the <strong>Audit‑Grade Report System</strong>, producing professional reports suitable for grant applications, enterprise reviews, and auditor handoffs.</p>
                    <h3>Report Structure</h3>
                    <ul className="list-disc list-inside">
                        <li><strong>Executive Summary</strong> – total contracts, severity counts, security score, risk classification, mode used.</li>
                        <li><strong>Vulnerability Breakdown</strong> – pie chart (severity) + bar chart (type) + fallback table.</li>
                        <li><strong>Per‑Finding Details</strong> – each finding includes:
                            <ul className="list-circle list-inside ml-4">
                                <li>Title & severity</li>
                                <li>File & line number</li>
                                <li>Vulnerable code snippet</li>
                                <li>Recommended fix snippet (from Remediation Engine)</li>
                                <li>Explanation (AI or fallback)</li>
                                <li>Impact analysis</li>
                                <li>Exploit reproduction steps (if sandbox succeeded)</li>
                            </ul>
                        </li>
                        <li><strong>Simulation Metrics</strong> – success rate, balance deltas, gas used.</li>
                    </ul>
                    <h3>Output Formats</h3>
                    <p>Markdown, JSON, HTML, and PDF (optional dependencies).</p>
        
  </>
)

const sec_security_score = (
  <>
                    <h2>Security Score</h2>
                    <p>Hawk‑i computes a deterministic 0–100 security score based on findings and sandbox results.</p>
                    <h3>Formula</h3>
                    <p>Base: 100. Deductions per finding:</p>
                    <ul className="list-disc list-inside">
                        <li>Critical: -15</li>
                        <li>High: -8</li>
                        <li>Medium: -4</li>
                        <li>Low: -1</li>
                    </ul>
                    <p>If sandbox is enabled, each successfully reproduced exploit adds an extra -5 (capped).</p>
                    <h3>Classification Bands</h3>
                    <table><tbody><tr><th>Score</th><th>Classification</th></tr>
                        <tr><td>90–100</td><td>Secure</td></tr>
                        <tr><td>75–89</td><td>Minor Risk</td></tr>
                        <tr><td>50–74</td><td>Moderate Risk</td></tr>
                        <tr><td>25–49</td><td>High Risk</td></tr>
                        <tr><td>0–24</td><td>Critical Risk</td></tr></tbody></table>
                    <p className="mt-4">The score is included in every report and can be viewed standalone with <span className="inline-code">hawki score</span>.</p>
        
  </>
)

const sec_remediation = (
  <>
                    <h2>Guided Remediation Engine</h2>
                    <p>Every finding now includes a <strong>context‑aware fix snippet</strong>. The Remediation Engine uses templates and AST information to generate accurate, secure code replacements.</p>
                    <p>Example for reentrancy:</p>
                    <CodeBlock code={`// Vulnerable
function withdraw() external {
    uint amount = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] = 0;
}

// Recommended fix
function withdraw() external nonReentrant {
    uint amount = balances[msg.sender];
    balances[msg.sender] = 0;
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
}`} />
                    <p>Fixes are populated automatically in reports and are also available via the <span className="inline-code">hawki report</span> command.</p>
        
  </>
)

const sec_telemetry = (
  <>
                    <h2>Telemetry (Opt‑In)</h2>
                    <p>To measure ecosystem impact, Hawk‑i can collect <strong>anonymous usage metrics</strong> when the <span className="inline-code">--telemetry</span> flag is used.</p>
                    <p>Collected data includes:</p>
                    <ul className="list-disc list-inside">
                        <li>Total scans performed</li>
                        <li>Findings per severity</li>
                        <li>Simulation success rate (if sandbox enabled)</li>
                        <li>Hawk‑i version</li>
                        <li>Execution mode (minimal/enhanced/full)</li>
                    </ul>
                    <p><strong>No source code, repository names, or IP addresses are ever collected.</strong> Data is stored locally in <span className="inline-code">~/.hawki/metrics.json</span> and can be viewed with <span className="inline-code">hawki metrics</span>.</p>
                    <p>If you opt in, Hawk‑i may send aggregated statistics to a public endpoint to power the community metrics badge. You can disable telemetry entirely by never using the flag or setting <span className="inline-code">HAWKI_TELEMETRY=0</span>.</p>
        
  </>
)

const sec_configuration = (
  <>
                    <h2>Configuration</h2>
                    <p>Hawk‑i can be configured via <span className="inline-code">.hawkirc</span> or environment variables. Example <span className="inline-code">.hawkirc</span>:</p>
                    <CodeBlock code={`[ai]
provider = "openai"
model = "gpt-4"
api_key = "sk-..."   # or set env HAWKI_OPENAI_KEY

[monitoring]
interval = 300
webhook_secret = "..."

[telemetry]
enabled = false      # override with --telemetry

[reporting]
default_format = "pdf"
charts = true        # enable matplotlib charts`} />
        
  </>
)

const sec_monitoring = (
  <>
                    <h2>Monitoring</h2>
                    <p>Hawk‑i can continuously monitor repositories via git hooks, file watchers, or GitHub webhooks. Set up a webhook endpoint:</p>
                    <CodeBlock code={`$ hawki watch --webhook --port 8080`} />
                    <p>Configure your GitHub repo to send push events to <span className="inline-code">http://your-host:8080/webhook</span>.</p>
        
  </>
)

const sec_architecture = (
  <>
                    <h2>Architecture overview</h2>
                    <p>Hawk‑i consists of seven core subsystems, plus new additions in v0.7.0:</p>
                    <ul className="grid sm:grid-cols-2 gap-2 mt-4">
                        <li><span className="text-[#687F97] font-mono">RIE</span> – Repository Intelligence Engine</li>
                        <li><span className="text-[#687F97] font-mono">SRE</span> – Static Rule Engine (30+ rules)</li>
                        <li><span className="text-[#687F97] font-mono">AIRE</span> – AI Reasoning Engine</li>
                        <li><span className="text-[#687F97] font-mono">ESS</span> – Exploit Simulation Sandbox</li>
                        <li><span className="text-[#687F97] font-mono">AMS</span> – Activity Monitoring System</li>
                        <li><span className="text-[#687F97] font-mono">SDL</span> – Security Data Layer</li>
                        <li><span className="text-[#687F97] font-mono">DIL</span> – Dashboard & Interface</li>
                        <li><span className="text-[#687F97] font-mono">REM</span> – Remediation Engine (new)</li>
                        <li><span className="text-[#687F97] font-mono">TEL</span> – Telemetry Module (new)</li>
                        <li><span className="text-[#687F97] font-mono">ARS</span> – Audit Report System (new)</li>
                    </ul>
                    <p className="mt-4">Each can be used independently; they communicate via internal APIs and a shared metadata store.</p>
        
  </>
)

const sec_subsystems = (
  <>
                    <h2>Subsystems in depth</h2>
                    <h3>Repository Intelligence Engine (RIE)</h3>
                    <p>Traverses file systems, parses Solidity (via tree‑sitter, Slither AST), builds dependency graphs and contract registries.</p>

                    <h3>Static Rule Engine (SRE)</h3>
                    <p>Dynamically loads rules from <span className="inline-code">rules/</span> directory. v0.7.0 includes 30 standardized rules, each with explanation, impact, and fix templates.</p>

                    <h3>AI Reasoning Engine (AIRE)</h3>
                    <p>Supports OpenAI, Anthropic, Gemini, and local LLMs. Now integrates with scoring and provides fallback explanations when AI is disabled.</p>

                    <h3>Exploit Simulation Sandbox (ESS)</h3>
                    <p>Dockerized Hardhat/Foundry environment. Returns detailed metrics (balances, gas, tx hash) and influences the security score.</p>

                    <h3>Remediation Engine (REM)</h3>
                    <p>Generates context‑aware fix snippets using templates and AST information.</p>

                    <h3>Telemetry Module (TEL)</h3>
                    <p>Opt‑in anonymous metrics collection and local storage.</p>

                    <h3>Audit Report System (ARS)</h3>
                    <p>Produces professional reports with charts, scores, and per‑finding remediation.</p>
        
  </>
)

const sec_ai_integration = (
  <>
                    <h2>AI Integration</h2>
                    <p>Hawk‑i supports multiple LLM providers for AI‑powered reasoning. You can enable AI analysis with the <code>--ai</code> flag and specify the model and API key via command line, environment variables, or configuration file.</p>
            
                    <h3>Command‑Line Flags</h3>
                    <ul className="list-disc list-inside">
                        <li><code>--ai</code> – Enable AI‑powered analysis.</li>
                        <li><code>--ai-model</code> – Specify the model (e.g., <code>gemini/gemini-1.5-flash</code>, <code>openai/gpt-4</code>, <code>ollama/codellama</code>).</li>
                        <li><code>--api-key</code> – Provide the API key directly (alternative to environment variables).</li>
                    </ul>
            
                    <h3>Environment Variables</h3>
                    <p>You can set API keys using the following environment variables (recommended for security):</p>
                    <CodeBlock code={`    export GEMINI_API_KEY=your_key_here      # Google Gemini
    export OPENAI_API_KEY=your_key_here      # OpenAI
    export ANTHROPIC_API_KEY=your_key_here   # Anthropic Claude
            `} />
            
                    <h3>Local Models with Ollama</h3>
                    <p>To use local models via <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-steel underline">Ollama</a>, specify the model as <code>ollama/&lt;model_name&gt;</code>, e.g.:</p>
                    <CodeBlock code={`hawki scan ./contracts --ai --ai-model ollama/codellama`} />
                    <p>Ensure Ollama is running locally and the model is pulled.</p>
            
                    <h3>Fallback Behavior</h3>
                    <p>If AI is disabled (<code>--ai</code> not used), Hawk‑i automatically falls back to rule‑provided explanation and impact templates. This guarantees that every finding includes a clear description and remediation guidance, even without an LLM.</p>
            
                    <h3>Example: Full AI‑Powered Scan</h3>
                    <CodeBlock code={`hawki scan ./my-project --ai --ai-model openai/gpt-4 --api-key sk-... --format pdf --sandbox`} />
        
  </>
)

const sec_vulnerability_library = (
  <>
                    <h2>Vulnerability Library (30 Rules)</h2>
                    <p>v0.7.0 expands coverage to <strong>30 vulnerabilities</strong>, each with:</p>
                    <ul className="list-disc list-inside">
                        <li>Detection rule (Python, dynamically loaded)</li>
                        <li>Attack script (for critical/high, in <span className="inline-code">attack_scripts/</span>)</li>
                        <li>Fix template (JSON in <span className="inline-code">remediation_engine/templates/</span>)</li>
                        <li>Explanation & impact templates</li>
                    </ul>
                    <p>Categories include reentrancy, access control, oracle manipulation, flash loans, signature replay, and more. See the <a href="https://github.com/0xSemantic/hawki/tree/main/hawki/core/static_rule_engine/rules" target="_blank" rel="noreferrer" className="text-steel underline">rules directory</a> for the full list.</p>
        
  </>
)

const sec_deployment = (
  <>
                    <h2>Deployment modes</h2>
                    <ul>
                        <li><strong>Local</strong> – runs on developer machine, everything in‑memory or local SQLite.</li>
                        <li><strong>Self‑hosted</strong> – Docker Compose with PostgreSQL, Redis, optional sandbox nodes.</li>
                        <li><strong>Managed cloud</strong> – (future) ephemeral scanning, no data retention.</li>
                    </ul>
        
  </>
)

const sec_privacy = (
  <>
                    <h2>Privacy & Security</h2>
                    <p>Hawk‑i is built with privacy as a first principle:</p>
                    <ul className="list-disc list-inside">
                        <li>All processing can be done locally, code never leaves your machine.</li>
                        <li>When using cloud AI, you control the API keys; prompts are anonymized.</li>
                        <li>Telemetry is opt‑in and contains no identifiable information.</li>
                        <li>Sandboxes are ephemeral and destroyed after each simulation.</li>
                        <li>No source code is ever uploaded to any remote server.</li>
                    </ul>
        
  </>
)

const sec_contributing = (
  <>
                    <h2>Contributing</h2>
                    <p>We welcome contributions! See our <a href="https://github.com/0xSemantic/hawki" target="_blank" rel="noreferrer" className="text-[#687F97] underline">GitHub</a> for issues and pull requests. Please read the <span className="inline-code">CONTRIBUTING.md</span> guide. New rules, attack scripts, and remediation templates can be added without touching core code.</p>
        
  </>
)

const sec_roadmap = (
  <>
                    <h2>Roadmap</h2>
                    <ul className="list-disc list-inside">
                        <li>Phase 1: Repository intelligence + static rule engine (✅)</li>
                        <li>Phase 2: AI reasoning (✅)</li>
                        <li>Phase 3: Exploit simulation sandbox (✅)</li>
                        <li>Phase 4: Continuous monitoring & alerts (✅)</li>
                        <li>Phase 5: CI/CD & ecosystem integrations (✅)</li>
                        <li>Phase 6: Deployment (PyPI, Docker, CLI) (✅)</li>
                        <li><strong>Phase 7: v0.7.0 – Intelligence & Reporting Upgrade (✅)</strong>
                            <ul className="list-circle list-inside ml-4">
                                <li>Audit‑grade reporting (ARS v2)</li>
                                <li>30 vulnerability rules</li>
                                <li>Security score</li>
                                <li>Guided remediation engine</li>
                                <li>Opt‑in telemetry</li>
                            </ul>
                        </li>
                        <li>Phase 8: Dashboard & real‑time visualisation (🔜)</li>
                        <li>Phase 9: Intelligence network & community rules marketplace (🔜)</li>
                    </ul>
                    <p className="mt-4 text-grey">Current version: <strong>v0.7.0</strong></p>
        
  </>
)

export const DOCS_SECTIONS = {
  'introduction': sec_introduction,
  'installation': sec_installation,
  'quickstart': sec_quickstart,
  'cli-reference': sec_cli_reference,
  'operational-modes': sec_operational_modes,
  'reporting': sec_reporting,
  'security-score': sec_security_score,
  'remediation': sec_remediation,
  'telemetry': sec_telemetry,
  'configuration': sec_configuration,
  'monitoring': sec_monitoring,
  'architecture': sec_architecture,
  'subsystems': sec_subsystems,
  'ai-integration': sec_ai_integration,
  'vulnerability-library': sec_vulnerability_library,
  'deployment': sec_deployment,
  'privacy': sec_privacy,
  'contributing': sec_contributing,
  'roadmap': sec_roadmap,
}
