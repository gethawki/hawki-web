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
                CodeBlock, SocialIcon, Helmet, Logo, Button, Field, Alert, Spinner,
                StatusBanner
    auth/       AuthLayout (sign-in frame with the site navbar), OAuthButtons,
                RouteGuards (RequireAuth, GuestOnly, RequireAccess)
    dashboard/  DashboardLayout (sidebar from data/dashboardNav.js), PageHeader,
                ScanBits (scan status, severity, scan rows)
    account/    Security (email change, two-factor, sessions, account deletion)
    admin/      shared admin bits (tables, stats, reason forms), PaymentForm
  data/         links.js, product.js, docsNav.js, changelogNav.js,
                dashboardNav.js (dashboard sections and who may open them), seo.js
  lib/          api.js (Hawk-i Cloud API client), auth.jsx (session for the whole
                site), access.js (access rule checks)
  pages/        Home, Docs, Changelog, NotFound
    auth/       Login (with the two-factor step), Signup, ForgotPassword,
                ResetPassword, VerifyEmail, ConfirmEmail, AcceptInvite
    dashboard/  Overview, Projects, ProjectDetail, Scans, ScanDetail, Findings,
                FindingDetail, Members, ApiKeys, AuditLog, OrgSettings, Profile
    admin/      AdminOverview, AdminUsers, AdminUser, AdminCustomers,
                AdminCustomer, AdminPayments, AdminRevenue, AdminAudit,
                AdminSwitches (platform admins only)
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

## Accounts and dashboards

The site is one app: the same router and session serve the public pages, the
sign-in pages and the Hawk-i Cloud dashboards, which talk to the `hawki-cloud`
API.

- **Session.** `lib/auth.jsx` wraps the whole app. The navbar shows "Sign in"
  or "Dashboard". Anonymous visitors on public pages never call the API: the
  session is only checked on private pages or after a previous sign-in.
- **Access levels.** `data/dashboardNav.js` lists every dashboard page with
  the access it needs: any signed-in user, a permission in the selected
  organization (from the API's role model: viewer, member, org admin), or
  platform admin. The sidebar shows only what the user may open and
  `RequireAccess` guards the same routes, so viewers, members, org admins and
  platform admins each get their own dashboard. Switching organization
  switches the access level.
- **Routes.** Public: `/`, `/docs`, `/changelog`. Sign-in: `/login`,
  `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`,
  `/invite`, `/confirm-email`. Signed in: `/dashboard/*`, `/admin/*`.
- **Platform console.** `/admin` is the owner's view: platform overview,
  users (suspend, role, password reset, sign out, two-factor reset),
  customers (plan, credits, exemption, notes, tags, payments), payments,
  revenue, platform audit and emergency switches. `StatusBanner` shows the
  site banner and maintenance notice to every signed-in user.
- **Private pages are not indexed.** They are listed in `PRIVATE_PREFIXES`
  (`data/seo.js`), rendered client side from one `noindex` shell
  (`dist/app-shell.html`) through Netlify rewrites, kept out of the sitemap
  and disallowed in `robots.txt`; the build checks all of this.
- **API.** Set `VITE_API_URL` (see `.env.example`, default
  `http://localhost:8080`); the API must allow this site's origin
  (`HAWKI_APP_PUBLIC_URL` or `HAWKI_APP_CORS_ORIGINS`). The access token stays
  in memory and the refresh token is an httpOnly cookie; on a 401 the client
  refreshes once and retries, serialized across tabs.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start local dev server
npm run build   # client build + SSR build + prerender to dist/ (see SEO below)
npm run preview # preview the production build locally
npm run lint    # oxlint (no config file, pure defaults)
npm run seo:indexnow  # after a deploy: ping IndexNow (Bing etc.) about changed URLs
```

## SEO and deployment

The site is deployed on Netlify (`netlify.toml`) at `https://gethawki.com`.

- **Prerendered pages.** `npm run build` runs `vite build`, then an SSR build of
  `src/entry-server.jsx`, then `scripts/prerender.mjs`, which writes one static
  HTML file per page (`/docs/installation` becomes `dist/docs/installation.html`)
  with the page content, title, description, canonical URL, Open Graph/Twitter
  tags and JSON-LD already in the HTML. `src/main.jsx` hydrates it.
- **One source of truth.** Every indexable page is listed in `src/data/seo.js`,
  which builds the docs and changelog pages from `data/docsNav.js` and
  `data/changelogNav.js`. Adding a nav entry (with a `description`) adds the page
  to the prerender, the sitemap and the head tags. `Helmet` keeps `<head>` in
  sync during client-side navigation.
- **Generated files.** `dist/sitemap.xml`, `dist/_redirects` (`/docs` and
  `/changelog` 301 to their first page) and `dist/404.html`. There is no SPA
  catch-all: unknown URLs get a real 404 status.
- **Build-time checks.** The build fails if a page is missing a title or
  description, duplicates another page's, has a description outside 50-170
  characters, or does not render exactly one `<h1>`.
- **Static SEO files** in `public/`: `robots.txt`, `og-image.png` (1200x630),
  `logo.png`, `apple-touch-icon.png`, and the IndexNow key file
  (`<32 hex chars>.txt`).
- Netlify deploy previews and branch deploys are built with `noindex`.

## Notes

- All external links (GitHub, PyPI, Docker Hub, socials) are centralized in
  `src/data/links.js`; the chain and module lists live in `src/data/product.js`.
- Code samples in `/docs` and `/changelog` render through a shared `CodeBlock`
  component with copy-to-clipboard and terminal-style line highlighting
  (`$ ` prompts, leading `#` comments, success and warning markers).
