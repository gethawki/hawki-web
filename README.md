# Hawk-i - Web Frontend

The marketing and documentation site for Hawk-i, a local-first security console
for Solidity and Web3 smart contracts. Built as a React 19 single-page app under
the design direction "The Watcher's Console": a calm, dark analytical instrument
organised around a radar motif, with a strict three-color brand system and a
color-equals-risk visual grammar.

Everything runs as modular React components through the Vite pipeline: no CDN
scripts and no inline `<script>` tags. All assets are self-contained and the
build carries no icon-font payload.

## Stack

- **React 19** + **react-router-dom v7** (client-side routing, lazy routes)
- **Vite** (build tool and dev server)
- **Tailwind CSS v4** (via `@tailwindcss/vite`); brand palette defined as design
  tokens in `src/index.css` under `@theme`, with hand-written utilities
  (`.panel`, `.glow-orb`, `.risk-badge`, `.terminal`, `.kicker`)
- **Framer Motion** for scroll reveals, staggered grids, spring meters, the radar
  sweep, and the typed-terminal effect (with a `prefers-reduced-motion` guard)
- **Chart.js** (`react-chartjs-2`) for the severity doughnut and coverage bar,
  recolored to the risk palette
- **lucide-react** for iconography; brand/social glyphs are inline SVG in
  `components/common/SocialIcon.jsx` (no Font Awesome dependency)

The hero background is `components/home/HeroAmbient.jsx`: CSS gradient glow orbs
plus a grain overlay, and the signature radar is `components/home/RadarField.jsx`,
inline SVG animated with Framer Motion. There is no WebGL and no Three.js.

## Brand palette

Defined once in `src/index.css` under `@theme`, then reused everywhere:

| Token            | Hex       | Usage                              |
|------------------|-----------|------------------------------------|
| `--color-steel`  | `#687F97` | primary accent, risk = Medium      |
| `--color-copper` | `#986C67` | secondary accent, risk = High      |
| `--color-grey`   | `#77746C` | muted text, risk = Low             |
| `--color-ink`    | `#0b0b0b` | page background                    |

## Structure

```
src/
  components/
    layout/     Navbar, Footer, Ticker, ScrollToTop
    home/       Homepage sections (Hero, RadarField, LiveTerminal, DeepAgent,
                SecurityModules, MultiChain, ScoreReport, WhyHawki, AudienceGrid,
                OpenSourceBanner, DocsPreview, Community, FAQSection, FinalCTA,
                SeverityChart, CoverageChart, HeroAmbient)
    docs/       DocsLayout (shared sidebar + TOC shell), DocsSections,
                ChangelogSections, Pager
    common/     Section, Kicker, RiskBadge, Terminal, StatMeter, CountUp, Reveal,
                CodeBlock, SocialIcon, Helmet
  data/         links.js, product.js, docsNav.js, changelogNav.js (content/config)
  pages/        Home.jsx, Docs.jsx, Changelog.jsx, NotFound.jsx
```

- **Home** (`/`) is composed from the named sections above, each built on the
  shared `Section` primitive so the page breaks its own rhythm instead of
  repeating one layout.
- **Docs** (`/docs`) and **Changelog** (`/changelog`) are data-driven: the nav
  lives in `data/docsNav.js` / `data/changelogNav.js`, the content in
  `components/docs/DocsSections.jsx` / `ChangelogSections.jsx`, both rendered
  through a shared `DocsLayout` (left nav + auto-built table of contents +
  scrollspy + mobile drawer + `Pager`). Add a section by editing the nav data and
  the matching sections file, not the layout.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start local dev server
npm run build   # production build to dist/
npm run preview # preview the production build locally
npm run lint    # oxlint (no config file, pure defaults)
```

## Notes

- All external links (GitHub, PyPI, Docker Hub, socials) are centralized in
  `src/data/links.js`; the chain and module lists live in `src/data/product.js`.
- Code samples in `/docs` and `/changelog` render through a shared `CodeBlock`
  component with copy-to-clipboard and terminal-style line highlighting
  (`$ ` prompts, leading `#` comments, success and warning markers).
