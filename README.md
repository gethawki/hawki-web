# Hawk‑i - Web Frontend

A React 19.x single-page application for the Hawk‑i security intelligence platform,
rebuilt from the original static HTML site (`index.html`, `docs.html`, `changelog.html`).

Everything now runs as real, modular React components — no CDN scripts, no inline
`<script>` tags. Tailwind, Font Awesome, Chart.js, and Three.js are installed as
proper npm dependencies and imported through the build pipeline.

## Stack

- **React 19.x** + **React Router 6** (client-side routing)
- **Vite** (build tool / dev server)
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — brand palette defined as design tokens
- **Framer Motion** — scroll-reveal animations
- **Three.js** — animated hero background (rotating wireframe torus knot + particles)
- **Chart.js** (`react-chartjs-2`) — severity donut + detection-coverage bar chart
- **lucide-react** + **Font Awesome (npm)** — iconography
- **clsx** — conditional classnames

## Brand palette

Defined once in `src/index.css` under `@theme`, then reused everywhere:

| Token            | Hex       | Usage                         |
|------------------|-----------|--------------------------------|
| `--color-steel`  | `#687F97` | primary accent                 |
| `--color-copper` | `#986C67` | secondary / warning accent     |
| `--color-grey`   | `#77746C` | muted text                     |
| `--color-ink`    | `#0b0b0b` | page background                |

## Structure

```
src/
  components/
    layout/     Navbar, Footer, Ticker, ScrollToTop
    home/       All homepage sections (Hero, FeatureGrid, ProductPreview, FAQ, ...)
    docs/       DocsLayout (shared sidebar/TOC shell), DocsContent, ChangelogContent
    common/     CodeBlock, Reveal, SectionKicker, Helmet
  data/         links.js, docsNav.js, changelogNav.js — content/config, not markup
  pages/        Home.jsx, Docs.jsx, Changelog.jsx, NotFound.jsx
```

- **Home** (`/`) was rewritten using the updated "software security intelligence
  first" messaging (leads broad, lets `/docs` carry the Web3-specific depth) —
  fully componentized, richer UI (charts, animated reveals, FAQ accordion, audience
  segmentation) than the original static hero-and-cards layout.
- **Docs** (`/docs`) and **Changelog** (`/changelog`) preserve the *complete* original
  content from `docs.html` / `changelog.html` — every section, table, and code sample —
  ported into JSX and rendered through a shared `DocsLayout` (left nav + auto-built
  right-hand table of contents + scrollspy + mobile drawer), replacing the old
  vanilla-JS DOM scripting.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start local dev server
npm run build   # production build → dist/
npm run preview # preview the production build locally
```

## Notes

- All external links (GitHub, PyPI, Docker Hub, socials) are centralized in
  `src/data/links.js`.
- Code samples throughout `/docs` and `/changelog` render through a shared
  `CodeBlock` component with copy-to-clipboard and lightweight terminal-style
  line highlighting (prompts, success/warning markers).
