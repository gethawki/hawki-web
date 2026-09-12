// Post-build step (see "build" in package.json). Turns the client build in dist/
// into a crawlable static site:
//   - one prerendered HTML file per page in src/data/seo.js, each with its own
//     title, description, canonical URL, Open Graph tags and JSON-LD
//     (/docs/installation -> dist/docs/installation.html, served by Netlify at
//     the extensionless URL with HTTP 200)
//   - 404.html, an empty app shell Netlify serves with a real 404 status, so
//     unknown URLs are never soft-404s
//   - sitemap.xml and _redirects, generated from the same page list
// The build fails if a page is missing metadata, duplicates another page's
// title or description, or does not render exactly one <h1>.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  NOT_FOUND,
  OG_IMAGE,
  PAGES,
  REDIRECTS,
  SITE_NAME,
  SITE_URL,
  TWITTER_SITE,
  structuredData,
} from '../src/data/seo.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrOut = path.join(root, 'dist-ssr')

const { render } = await import(pathToFileURL(path.join(ssrOut, 'entry-server.js')).href)

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const HEAD_SLOT = /<!--seo:start-->[\s\S]*?<!--seo:end-->/
const ROOT_SLOT = '<div id="root"></div>'
if (!HEAD_SLOT.test(template) || !template.includes(ROOT_SLOT)) {
  throw new Error('dist/index.html is missing the <!--seo:start-->/<!--seo:end--> markers or an empty #root')
}

// Netlify sets CONTEXT; deploy previews and branch deploys must not compete with production.
const previewBuild = Boolean(process.env.CONTEXT) && process.env.CONTEXT !== 'production'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function headFor(meta) {
  const tags = [`<title>${esc(meta.title)}</title>`, `<meta name="description" content="${esc(meta.description)}" />`]
  if (previewBuild || !meta.url) tags.push('<meta name="robots" content="noindex" />')
  if (meta.url) {
    tags.push(
      `<link rel="canonical" href="${meta.url}" />`,
      `<meta property="og:type" content="${meta.type}" />`,
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:title" content="${esc(meta.title)}" />`,
      `<meta property="og:description" content="${esc(meta.description)}" />`,
      `<meta property="og:url" content="${meta.url}" />`,
      `<meta property="og:image" content="${OG_IMAGE.url}" />`,
      `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
      `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
      `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:site" content="${TWITTER_SITE}" />`,
      `<meta name="twitter:title" content="${esc(meta.title)}" />`,
      `<meta name="twitter:description" content="${esc(meta.description)}" />`,
      `<meta name="twitter:image" content="${OG_IMAGE.url}" />`,
      // \u003c keeps a "</script>" inside a string from closing the tag
      `<script type="application/ld+json">${JSON.stringify(structuredData(meta)).replace(/</g, '\\u003c')}</script>`,
    )
  }
  return tags.join('\n    ')
}

// Function replacers: rendered HTML is full of "$" (shell prompts), which a
// replacement string would treat as a substitution pattern.
const htmlFor = (meta, body = '') =>
  template.replace(HEAD_SLOT, () => headFor(meta)).replace(ROOT_SLOT, () => `<div id="root">${body}</div>`)

const problems = []
const seen = { title: new Map(), description: new Map() }

for (const meta of PAGES) {
  for (const key of ['title', 'description']) {
    const value = meta[key]
    if (!value) problems.push(`${meta.path}: missing ${key}`)
    else if (seen[key].has(value)) problems.push(`${meta.path}: same ${key} as ${seen[key].get(value)}`)
    else seen[key].set(value, meta.path)
  }
  const len = meta.description?.length ?? 0
  if (len && (len < 50 || len > 170)) problems.push(`${meta.path}: description is ${len} chars (keep it 50-170)`)

  const body = await render(meta.path)
  const h1s = (body.match(/<h1[\s>]/g) || []).length
  if (h1s !== 1) problems.push(`${meta.path}: renders ${h1s} <h1> elements (want exactly 1)`)

  const file = path.join(dist, meta.path === '/' ? 'index.html' : `${meta.path.slice(1)}.html`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, htmlFor(meta, body))
}

fs.writeFileSync(path.join(dist, '404.html'), htmlFor(NOT_FOUND))

fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${p.url}</loc></url>`).join('\n')}
</urlset>
`,
)

fs.writeFileSync(path.join(dist, '_redirects'), REDIRECTS.map((r) => `${r.from}  ${r.to}  301`).join('\n') + '\n')

const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8')
if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) problems.push('robots.txt does not reference the sitemap')
if (/^Disallow:\s*\/\s*$/m.test(robots)) problems.push('robots.txt blocks the whole site')

fs.rmSync(ssrOut, { recursive: true, force: true })

if (problems.length) {
  console.error(`\nSEO check failed:\n  - ${problems.join('\n  - ')}\n`)
  process.exit(1)
}
console.log(
  `prerendered ${PAGES.length} pages + 404.html, wrote sitemap.xml (${PAGES.length} URLs) and _redirects` +
    (previewBuild ? ` [noindex: ${process.env.CONTEXT} build]` : ''),
)
