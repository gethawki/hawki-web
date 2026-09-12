// Each link is also a page in the sitemap: `label` feeds the nav, `title` (optional,
// defaults to label) and `description` feed the page's <title> and meta description
// via src/data/seo.js. The build fails if a description is missing or duplicated.
export const DOCS_NAV = [
  {
    "title": "GETTING STARTED",
    "links": [
      {
        "href": "introduction",
        "label": "Introduction",
        "description": "Hawk-i is an open-source, local-first security platform for Solidity smart contracts: 50 static rules, LLM reasoning, and a Docker exploit sandbox in one CLI."
      },
      {
        "href": "installation",
        "label": "Installation",
        "description": "Install Hawk-i with pip, from source, or as a Docker image. Covers prerequisites, the optional HTML and PDF report extras, and verifying your setup."
      },
      {
        "href": "quickstart",
        "label": "Quickstart",
        "description": "Run your first Hawk-i scan: scan a Solidity repo, add AI reasoning and the exploit sandbox, scan a deployed contract by address, and launch the Deep agent."
      }
    ]
  },
  {
    "title": "CORE WORKFLOW",
    "links": [
      {
        "href": "cli-reference",
        "label": "CLI Reference",
        "description": "Complete Hawk-i CLI reference: every subcommand, including scan, deep, verify, deps, upgrade, prove, report, score, monitor, and doctor, with options and examples."
      },
      {
        "href": "scanning",
        "label": "Scanning",
        "description": "How the hawki scan pipeline works: tree-sitter indexing, 50 static rules, optional AI and sandbox stages, and scanning deployed contracts on EVM chains."
      },
      {
        "href": "security-score",
        "label": "Security Score",
        "title": "Security Score: How the 0-100 Score Works",
        "description": "How Hawk-i computes its deterministic 0-100 smart contract security score, with severity-weighted deductions per finding and five risk bands."
      },
      {
        "href": "reporting",
        "label": "Audit-Grade Reporting",
        "description": "Generate audit-grade smart contract security reports with Hawk-i: audit and Immunefi bug-bounty styles, Markdown, JSON, HTML, and PDF output."
      }
    ]
  },
  {
    "title": "HAWK-I DEEP",
    "links": [
      {
        "href": "deep-agent",
        "label": "Deep Agent",
        "title": "Deep Agent: Autonomous Exploit Generation",
        "description": "Hawk-i Deep is an autonomous agent that invents novel smart contract attacks and proves them with Hardhat or Foundry proof-of-concept exploits in a sandbox."
      }
    ]
  },
  {
    "title": "SECURITY MODULES",
    "links": [
      {
        "href": "security-modules",
        "label": "Verify, Deps, Upgrade, Prove",
        "title": "Security Modules: Verify, Deps, Upgrade, Prove",
        "description": "Hawk-i security modules: verify deployed bytecode against source, scan dependencies, check proxy upgrade storage collisions, and run formal verification."
      }
    ]
  },
  {
    "title": "OPERATIONS",
    "links": [
      {
        "href": "registry",
        "label": "Contract Registry",
        "description": "The Hawk-i contract registry keeps a local record of every repository and contract you have scanned, stored in ~/.hawki with no account or external service."
      },
      {
        "href": "doctor",
        "label": "Doctor",
        "title": "Doctor: Preflight Health Check",
        "description": "hawki doctor is a preflight health check that confirms Docker, LLM API keys, and Foundry or Hardhat are ready before you run a smart contract security scan."
      },
      {
        "href": "monitoring",
        "label": "Monitoring",
        "description": "Use hawki monitor to watch a repository or deployed contract and rescan automatically when it changes, with pluggable watchers and alert logs."
      }
    ]
  },
  {
    "title": "UNDER THE HOOD",
    "links": [
      {
        "href": "architecture",
        "label": "Architecture",
        "description": "Hawk-i architecture: the scan pipeline stages, the standalone subsystems, the plain-dictionary finding model, and where state is stored on disk."
      },
      {
        "href": "vulnerability-library",
        "label": "Vulnerability Library",
        "title": "Vulnerability Library: 50 Solidity Detection Rules",
        "description": "Hawk-i's 50 Solidity vulnerability detection rules, from reentrancy and access control to oracle manipulation, each verified by a liveness test."
      },
      {
        "href": "ai-integration",
        "label": "AI Integration",
        "description": "Configure Hawk-i's optional LLM reasoning through litellm: Gemini, OpenAI, Anthropic, or fully offline local models with Ollama, plus fallback behavior."
      }
    ]
  },
  {
    "title": "PROJECT",
    "links": [
      {
        "href": "privacy",
        "label": "Privacy Promise",
        "title": "Privacy Promise: No Telemetry",
        "description": "Hawk-i's privacy promise: no telemetry, no cloud requirement, and no account. Your smart contract source code and API keys stay on your machine."
      },
      {
        "href": "contributing",
        "label": "Contributing",
        "description": "Contribute to Hawk-i, the MIT-licensed smart contract security tool: add detection rules, remediation templates, attack scripts, and watchers."
      }
    ]
  }
]
