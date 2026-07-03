import CodeBlock from '../common/CodeBlock.jsx'

const sec_title = (
  <>
                    <h1 className="text-4xl font-bold text-white mb-2">🦅 Hawk‑i · v0.6.0 → v0.7.0 Evolution Report</h1>
                    <p className="text-grey">Document: <code>v0_6_0_to_v0_7_0_diff.md</code><br />
                    Purpose: Precisely define architectural, operational, and capability differences between v0.6.0 and v0.7.0. This document serves as a comprehensive reference for developers, contributors, and stakeholders to understand the maturity leap.</p>
        
  </>
)

const sec_executive_summary = (
  <>
                    <h2>1️⃣ Executive Summary</h2>
                    <p><strong>v0.6.0</strong> was a <strong>functional security scanner</strong> – it could ingest repositories, run static rules, optionally invoke AI reasoning, and optionally simulate exploits in a sandbox. Reports were basic markdown lists of findings.</p>
                    <p><strong>v0.7.0</strong> transforms Hawk‑i into an <strong>audit‑grade security intelligence system</strong>. It introduces professional reporting (ARS v2), a deterministic security score, guided remediation snippets, an expanded vulnerability library (30 rules), opt‑in telemetry, and deep integration between sandbox results and risk quantification. The system now answers not just <em>“what vulnerabilities exist?”</em> but also <em>“how severe are they, can they be exploited, what is the quantified risk, and how do we fix them?”</em>.</p>
                    <p>This is <strong>not a patch release</strong>; it is a <strong>maturity milestone</strong>. All enhancements are <strong>additive and backward‑compatible</strong> – existing CLI commands and workflows continue to work unchanged.</p>
        
  </>
)

const sec_architectural_comparison = (
  <>
                    <h2>2️⃣ High‑Level Architectural Comparison</h2>
                    <table>
                        <thead><tr><th>Category</th><th>v0.6.0</th><th>v0.7.0</th></tr></thead>
                        <tbody>
                            <tr><td><strong>Static Rules</strong></td><td>Dynamic discovery, ~15–20 rules</td><td>Expanded to <strong>30 rules</strong>, each with explanation, impact, fix templates</td></tr>
                            <tr><td><strong>AI Engine</strong></td><td>Optional reasoning, no scoring integration</td><td>Integrated with scoring & fallback explanation logic</td></tr>
                            <tr><td><strong>Exploit Sandbox</strong></td><td>Optional simulation, basic success flag</td><td>Structured metrics (balances, gas, tx hash), integrated into score & report</td></tr>
                            <tr><td><strong>Reporting</strong></td><td>Basic markdown list of findings</td><td><strong>Audit‑Grade Report System (ARS v2)</strong> – executive summary, score, charts, per‑finding remediation</td></tr>
                            <tr><td><strong>Risk Score</strong></td><td>❌ Not available</td><td>✅ <strong>0–100 deterministic scoring</strong> with severity deductions & simulation penalties</td></tr>
                            <tr><td><strong>Severity Charts</strong></td><td>❌</td><td>✅ Auto‑generated pie/bar charts (with table fallback)</td></tr>
                            <tr><td><strong>Guided Fix Snippets</strong></td><td>Ad‑hoc, inconsistent</td><td>✅ <strong>Remediation Engine</strong> with template‑based, context‑aware fixes</td></tr>
                            <tr><td><strong>Telemetry</strong></td><td>❌</td><td>✅ <strong>Opt‑in anonymous metrics</strong> (scans, findings, version)</td></tr>
                            <tr><td><strong>CLI Commands</strong></td><td><code>hawki scan</code> only</td><td><code>hawki scan</code>, <code>hawki report</code>, <code>hawki score</code>, <code>hawki metrics</code></td></tr>
                            <tr><td><strong>Output Formats</strong></td><td>Markdown</td><td>Markdown, JSON, PDF (optional)</td></tr>
                            <tr><td><strong>Data Layer</strong></td><td><code>ReportManager</code> (single)</td><td><code>reporting/</code> subsystem with versioned generators</td></tr>
                            <tr><td><strong>Exploit Metrics</strong></td><td>Success flag only</td><td>Balance delta, gas used, transaction hash, logs</td></tr>
                            <tr><td><strong>Grant Readiness</strong></td><td>Early‑stage</td><td><strong>Audit‑grade infrastructure</strong> – quantifiable, demonstrable</td></tr>
                        </tbody>
                    </table>
        
  </>
)

const sec_detection_engine_evolution = (
  <>
                    <h2>3️⃣ Detection Engine Evolution</h2>
                    <h3>v0.6.0</h3>
                    <p>Rules were Python files in <code>static_rule_engine/rules/</code> discovered dynamically. Each rule defined a <code>run_check()</code> method and a <code>severity</code> attribute. AI reasoning was optional; if enabled, the <code>ReasoningAgent</code> added explanations. There was <strong>no enforced schema</strong> for findings – fields varied across rules. Exploit pairing was not mandatory; some rules lacked corresponding attack scripts. No standardised explanation or impact fields – reports relied on AI or rule comments.</p>
                    <h4>Limitations</h4>
                    <ul>
                        <li>Inconsistent finding structure made report generation brittle.</li>
                        <li>No fallback when AI was disabled – reports lacked explanations.</li>
                        <li>Remediation suggestions were embedded in rule logic, not reusable.</li>
                        <li>No correlation between detection and exploit simulation.</li>
                    </ul>
                    <h3>v0.7.0</h3>
                    <h4>Standardised Finding Object</h4>
                    <p>Every finding now conforms to a <strong>strict schema</strong>:</p>
                    <CodeBlock code={`{
    "id": str,                     # e.g., "REENT-001"
    "title": str,                   # e.g., "[CRITICAL] Reentrancy in withdraw()"
    "severity": str,                 # "Critical", "High", "Medium", "Low"
    "file": str,                     # Path relative to repo root
    "line": int,                     # Starting line number
    "vulnerable_snippet": str,       # Code block showing the issue
    "fix_snippet": str,               # Populated by Remediation Engine
    "explanation": str,               # Why it's dangerous (AI or fallback)
    "impact": str,                    # Potential consequences (AI or fallback)
    "exploit_steps": list or None,    # Steps if sandbox succeeded
    "ai_used": bool                    # Whether AI contributed
}`} />
                    <h4>Rule Requirements Expanded</h4>
                    <p>Each rule file must now define class attributes (or provide them via methods):</p>
                    <CodeBlock code={`class ReentrancyRule:
    severity = "Critical"
    explanation_template = "This function allows reentrant calls because it updates state after an external call."
    impact_template = "An attacker can drain funds by recursively calling back before state updates."
    fix_template = "Apply the checks-effects-interactions pattern and add a nonReentrant modifier."

    def run_check(self, contract_ast, ...):
        # detection logic
        return findings  # each finding will inherit these templates`} />
                    <ul>
                        <li><strong>Explanation fallback</strong>: If AI is disabled, the rule’s <code>explanation_template</code> is used.</li>
                        <li><strong>Impact fallback</strong>: Similarly, <code>impact_template</code> provides deterministic impact statements.</li>
                        <li><strong>Fix snippet</strong>: The <code>fix_template</code> is passed to the Remediation Engine for context‑aware population.</li>
                    </ul>
                    <p><strong>Result:</strong> Detection is now deterministic, self‑contained, and report‑ready.</p>
        
  </>
)

const sec_risk_scoring_system = (
  <>
                    <h2>4️⃣ Risk Scoring System</h2>
                    <p><strong>v0.6.0:</strong> ❌ No scoring system. Users had to interpret severity counts manually.</p>
                    <p><strong>v0.7.0:</strong> New component: <code>scoring_engine.py</code> inside <code>data_layer/reporting/</code>.</p>
                    <h4>Scoring Formula</h4>
                    <ul>
                        <li><strong>Base score</strong>: 100</li>
                        <li><strong>Deductions per finding</strong>: Critical -15, High -8, Medium -4, Low -1</li>
                        <li><strong>Simulation penalty</strong> (if sandbox enabled): -5 per successfully reproduced exploit (capped at -15)</li>
                    </ul>
                    <h4>Classification Bands</h4>
                    <table>
                        <thead><tr><th>Score</th><th>Classification</th></tr></thead>
                        <tbody>
                            <tr><td>90–100</td><td>Secure</td></tr>
                            <tr><td>75–89</td><td>Minor Risk</td></tr>
                            <tr><td>50–74</td><td>Moderate Risk</td></tr>
                            <tr><td>25–49</td><td>High Risk</td></tr>
                            <tr><td>0–24</td><td>Critical Risk</td></tr>
                        </tbody>
                    </table>
                    <h4>Output Example</h4>
                    <CodeBlock code={`{
    "score": 61,
    "classification": "High Risk",
    "deductions": {
        "critical": 3,
        "high": 4,
        "simulation_penalty": 2
    },
    "simulation_used": True,
    "ai_used": True
}`} />
                    <p><strong>Impact:</strong> Quantified risk posture, executive summaries, grant credibility.</p>
        
  </>
)

const sec_reporting_system_evolution = (
  <>
                    <h2>5️⃣ Reporting System Evolution (ARS v2)</h2>
                    <p><strong>v0.6.0:</strong> Markdown only, simple list of findings, no executive summary, no charts.</p>
                    <p><strong>v0.7.0:</strong> New directory <code>core/data_layer/reporting/</code> with multiple modules.</p>
                    <ul>
                        <li><code>report_generator_v2.py</code> – generates reports with executive summary, score, charts, per‑finding details.</li>
                        <li><code>chart_renderer.py</code> – creates severity pie chart and vulnerability bar chart (PNG) using matplotlib.</li>
                        <li><code>templates/</code> – Jinja2 templates for HTML/Markdown.</li>
                    </ul>
                    <p><strong>Report structure:</strong> Executive summary, vulnerability breakdown (chart + table), per‑finding details with fix snippets and exploit steps.</p>
        
  </>
)

const sec_vulnerability_coverage = (
  <>
                    <h2>6️⃣ Vulnerability Coverage Expansion</h2>
                    <p><strong>v0.6.0:</strong> ~15–20 rules, limited exploit pairing.</p>
                    <p><strong>v0.7.0:</strong> <strong>Capped at 30 strong vulnerabilities</strong>, each critical/high has a corresponding attack script. Attack scripts return structured data (balances, gas, tx hash). New examples: permit signature replay, integer overflow, signature malleability, reused nonce, centralized owner risk.</p>
        
  </>
)

const sec_remediation_engine = (
  <>
                    <h2>7️⃣ Remediation Engine (New in v0.7.0)</h2>
                    <p><strong>v0.6.0:</strong> Fix suggestions embedded in rule logic, inconsistent.</p>
                    <p><strong>v0.7.0:</strong> New module <code>core/remediation_engine/</code>. Uses template files (e.g., <code>reentrancy.json</code>) with placeholders like <code>{'{'}{'{'}function_name{'}'}{'}'}</code>. Populates <code>fix_snippet</code> in findings. Extensible and context‑aware.</p>
        
  </>
)

const sec_exploit_sandbox_evolution = (
  <>
                    <h2>8️⃣ Exploit Sandbox Evolution</h2>
                    <p><strong>v0.6.0:</strong> <code>SandboxManager.run_all()</code> returned simple success booleans.</p>
                    <p><strong>v0.7.0:</strong> Extended return structure with balance delta, gas used, tx hash, logs. Simulation success rate in executive summary, score penalty for successful exploits.</p>
        
  </>
)

const sec_telemetry_system = (
  <>
                    <h2>9️⃣ Telemetry System (New)</h2>
                    <p><strong>v0.6.0:</strong> ❌ No telemetry.</p>
                    <p><strong>v0.7.0:</strong> Opt‑in anonymous telemetry via <code>--telemetry</code>. Collects scan count, findings per severity, version, etc. Stored locally and optionally sent to Hawk‑i API. New CLI command <code>hawki metrics</code>.</p>
        
  </>
)

const sec_cli_evolution = (
  <>
                    <h2>🔟 CLI Evolution</h2>
                    <p><strong>v0.6.0:</strong> <code>hawki scan &lt;repo&gt; [--ai] [--sandbox]</code></p>
                    <p><strong>v0.7.0:</strong> New subcommands: <code>hawki report</code>, <code>hawki score</code>, <code>hawki metrics</code>. Extended <code>scan</code> with <code>--telemetry</code> and <code>--format</code>. Backward compatible.</p>
        
  </>
)

const sec_data_layer_evolution = (
  <>
                    <h2>1️⃣1️⃣ Data Layer Evolution</h2>
                    <p><strong>v0.6.0:</strong> <code>report_manager.py</code> with <code>save_findings()</code>.</p>
                    <p><strong>v0.7.0:</strong> <code>report_manager.py</code> now has <code>generate_report()</code> delegating to <code>reporting/</code>. New subdirectory <code>reporting/</code> with versioned generators. Old findings format (v1) remains valid.</p>
        
  </>
)

const sec_maturity_level_comparison = (
  <>
                    <h2>1️⃣2️⃣ System Maturity Level Comparison</h2>
                    <table>
                        <thead><tr><th>Dimension</th><th>v0.6.0</th><th>v0.7.0</th></tr></thead>
                        <tbody>
                            <tr><td>Developer Tool</td><td>✅</td><td>✅</td></tr>
                            <tr><td>Security Tool</td><td>✅</td><td>✅</td></tr>
                            <tr><td>Audit Tool</td><td>⚠️ Partial</td><td>✅ Full</td></tr>
                            <tr><td>Grant‑Ready</td><td>Early‑stage</td><td><strong>Strong</strong></td></tr>
                            <tr><td>Enterprise Demo</td><td>Weak</td><td><strong>Strong</strong></td></tr>
                            <tr><td>Quantifiable Intelligence</td><td>❌</td><td>✅ (score, metrics)</td></tr>
                            <tr><td>Deterministic Risk Scoring</td><td>❌</td><td>✅</td></tr>
                            <tr><td>Remediation Guidance</td><td>Basic</td><td><strong>Structured</strong></td></tr>
                            <tr><td>Exploit Simulation Integration</td><td>Minimal</td><td><strong>Deep</strong></td></tr>
                            <tr><td>Public Impact Metrics</td><td>❌</td><td>✅ (opt‑in)</td></tr>
                        </tbody>
                    </table>
        
  </>
)

const sec_philosophical_shift = (
  <>
                    <h2>1️⃣3️⃣ Philosophical Shift</h2>
                    <p><strong>v0.6.0</strong> = a <strong>scanner</strong> – it finds problems and lists them.</p>
                    <p><strong>v0.7.0</strong> = an <strong>intelligence system</strong> – it quantifies risk, explains impact, demonstrates exploitability, and guides remediation.</p>
                    <p>v0.6.0 answers: “What vulnerabilities exist?”</p>
                    <p>v0.7.0 answers: “What vulnerabilities exist, how severe are they, can they be exploited, what is the quantified risk, and how do we fix them?”</p>
        
  </>
)

const sec_breaking_changes = (
  <>
                    <h2>1️⃣4️⃣ Breaking Changes</h2>
                    <p><strong>None.</strong> All existing CLI commands work unchanged. Existing rule files continue to load (fallbacks apply). Old findings JSON files can still be read. <strong>Additive only</strong> – users can upgrade without modifying their workflows.</p>
        
  </>
)

const sec_strategic_positioning = (
  <>
                    <h2>1️⃣5️⃣ Strategic Positioning After Upgrade</h2>
                    <p>With v0.7.0, Hawk‑i is now:</p>
                    <blockquote className="text-white border-l-4 border-steel pl-4 italic">Modular, measurable, audit‑grade security intelligence infrastructure for Web3 repositories.</blockquote>
                    <p>This positions the project for grants, enterprise pilots, ecosystem partnerships, and community growth. The foundation is now laid for future phases (monitoring network, cross‑chain support, etc.).</p>
                    <p className="mt-4 text-grey text-sm">End of v0.6.0 → v0.7.0 Evolution Report</p>
        
  </>
)

export const CHANGELOG_SECTIONS = {
  'title': sec_title,
  'executive-summary': sec_executive_summary,
  'architectural-comparison': sec_architectural_comparison,
  'detection-engine-evolution': sec_detection_engine_evolution,
  'risk-scoring-system': sec_risk_scoring_system,
  'reporting-system-evolution': sec_reporting_system_evolution,
  'vulnerability-coverage': sec_vulnerability_coverage,
  'remediation-engine': sec_remediation_engine,
  'exploit-sandbox-evolution': sec_exploit_sandbox_evolution,
  'telemetry-system': sec_telemetry_system,
  'cli-evolution': sec_cli_evolution,
  'data-layer-evolution': sec_data_layer_evolution,
  'maturity-level-comparison': sec_maturity_level_comparison,
  'philosophical-shift': sec_philosophical_shift,
  'breaking-changes': sec_breaking_changes,
  'strategic-positioning': sec_strategic_positioning,
}
