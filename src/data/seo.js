// Single source of truth for every indexable page and its metadata.
// Read by components/common/Helmet.jsx (client-side navigation) and by
// scripts/prerender.mjs, which writes per-page HTML, sitemap.xml and _redirects.
// Docs and changelog pages come straight from the nav data, so a new nav entry
// is automatically prerendered and added to the sitemap.
import { DOCS_NAV } from './docsNav.js'
import { CHANGELOG_NAV } from './changelogNav.js'
import { FAQS } from './faqs.js'
import { LINKS, SOCIAL_HANDLE, VERSION } from './links.js'

export const SITE_URL = 'https://gethawki.com'
export const SITE_NAME = 'Hawk-i'
export const TWITTER_SITE = `@${SOCIAL_HANDLE}`
export const OG_IMAGE = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: 'Hawk-i: open-source smart contract security scanner for Solidity',
}

const HOME = {
  path: '/',
  title: 'Hawk-i · Open-source smart contract security scanner for Solidity',
  description:
    'Hawk-i is an open-source, local-first Solidity smart contract security scanner: static rules, LLM reasoning, a Docker exploit sandbox, and an autonomous exploit agent.',
  type: 'website',
}

// "1. Highlights" -> "Highlights"
const stripNumber = (label) => label.replace(/^\d+\.\s*/, '')

function navPages(nav, basePath, sectionName, titleSuffix) {
  const sectionPath = `${basePath}/${nav[0].links[0].href}`
  return nav.flatMap((group) =>
    group.links.map((link) => {
      const headline = link.title || stripNumber(link.label)
      return {
        path: `${basePath}/${link.href}`,
        title: `${headline} · ${titleSuffix}`,
        headline,
        description: link.description,
        type: 'article',
        section: { name: sectionName, path: sectionPath },
      }
    }),
  )
}

const DOCS_PAGES = navPages(DOCS_NAV, '/docs', 'Documentation', 'Hawk-i Docs')
const CHANGELOG_PAGES = navPages(CHANGELOG_NAV, '/changelog', 'Changelog', `Hawk-i v${VERSION} Changelog`)

export const PAGES = [HOME, ...DOCS_PAGES, ...CHANGELOG_PAGES].map((p) => ({ ...p, url: `${SITE_URL}${p.path}` }))

// Section roots have no page of their own; Netlify 301s them to the first entry.
export const REDIRECTS = [
  { from: '/docs', to: DOCS_PAGES[0].path },
  { from: '/changelog', to: CHANGELOG_PAGES[0].path },
]

export const NOT_FOUND = { title: `Page not found · ${SITE_NAME}`, description: HOME.description }

export function pageMeta(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PAGES.find((p) => p.path === path) || null
}

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SOCIAL_HANDLE,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [LINKS.linkedin, LINKS.x, LINKS.facebook],
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: HOME.description,
  inLanguage: 'en',
  publisher: { '@id': ORGANIZATION['@id'] },
}

const SOFTWARE = {
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: SITE_NAME,
  alternateName: 'hawki',
  description: HOME.description,
  url: `${SITE_URL}/`,
  applicationCategory: 'SecurityApplication',
  applicationSubCategory: 'Smart contract security scanner',
  operatingSystem: 'Cross-platform (Python 3.9+ or Docker)',
  softwareVersion: VERSION,
  license: 'https://opensource.org/licenses/MIT',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  downloadUrl: LINKS.pypi,
  author: { '@id': ORGANIZATION['@id'] },
  publisher: { '@id': ORGANIZATION['@id'] },
  sameAs: [LINKS.github, LINKS.pypi, LINKS.docker],
}

// JSON-LD for a page. Only describes what is actually on the page.
export function structuredData(page) {
  if (page.path === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        ORGANIZATION,
        WEBSITE,
        SOFTWARE,
        {
          '@type': 'FAQPage',
          '@id': `${SITE_URL}/#faq`,
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
      ],
    }
  }

  const crumbs = [
    { name: SITE_NAME, url: `${SITE_URL}/` },
    ...(page.path === page.section.path ? [] : [{ name: page.section.name, url: `${SITE_URL}${page.section.path}` }]),
    { name: page.headline, url: page.url },
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: page.headline,
        description: page.description,
        url: page.url,
        mainEntityOfPage: page.url,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', '@id': WEBSITE['@id'], name: SITE_NAME, url: `${SITE_URL}/` },
        about: { '@type': 'SoftwareApplication', '@id': SOFTWARE['@id'], name: SITE_NAME },
        publisher: { '@type': 'Organization', '@id': ORGANIZATION['@id'], name: ORGANIZATION.name, logo: ORGANIZATION.logo },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      },
    ],
  }
}
