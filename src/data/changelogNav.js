// Each link is also a page in the sitemap; `description` feeds its meta description
// via src/data/seo.js (see the note in docsNav.js).
export const CHANGELOG_NAV = [
  {
    "title": "HAWK-I v1.0.0",
    "links": [
      {
        "href": "highlights",
        "label": "1. Highlights",
        "description": "Hawk-i v1.0.0 release highlights: the Deep exploit agent, 50 live-tested static rules, deployed-contract scanning, security modules, and audit-grade reports."
      },
      {
        "href": "deep-agent",
        "label": "2. The Deep Agent",
        "description": "Hawk-i v1.0.0 introduces hawki deep, an autonomous agent that plans novel smart contract attacks and proves them with runnable proof-of-concept exploits."
      },
      {
        "href": "deployed-scanning",
        "label": "3. Deployed & Multi-Chain Scanning",
        "description": "Hawk-i v1.0.0 scans deployed contracts by address, pulling verified source from block explorers across seven EVM mainnets, Sepolia, and local nodes."
      },
      {
        "href": "security-modules",
        "label": "4. Security Modules",
        "description": "Hawk-i v1.0.0 ships four standalone security modules: verify (bytecode vs source), deps, upgrade (proxy storage collisions), and prove (SMTChecker)."
      },
      {
        "href": "reporting",
        "label": "5. Reporting & JSON Export",
        "description": "Hawk-i v1.0.0 reporting: audit and Immunefi report styles in Markdown, JSON, HTML, and PDF, with JSON as the canonical, re-renderable scan record."
      },
      {
        "href": "security-score",
        "label": "6. Security Score",
        "description": "Hawk-i v1.0.0 adds a deterministic 0-100 security score with severity-weighted deductions and five risk bands, from Secure to Critical Risk."
      },
      {
        "href": "registry-doctor",
        "label": "7. Registry & Doctor",
        "description": "Hawk-i v1.0.0 adds hawki registry, a local record of scanned contracts, and hawki doctor, a preflight check for Docker, LLM keys, and toolchains."
      },
      {
        "href": "licensing",
        "label": "8. MIT License, No Telemetry",
        "description": "Hawk-i v1.0.0 is MIT licensed and 100% open source, with no telemetry: nothing is collected or transmitted, and all state stays in ~/.hawki."
      },
      {
        "href": "install-upgrade",
        "label": "9. Install & Upgrade",
        "description": "Install or upgrade to Hawk-i v1.0.0 from PyPI with pip, add the HTML and PDF report extras, or pull the Docker image, then verify with hawki doctor."
      }
    ]
  }
]
