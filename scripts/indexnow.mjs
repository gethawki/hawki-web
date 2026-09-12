// Notify IndexNow search engines (Bing, Yandex, Seznam, Naver, ...) that URLs
// were added, changed or removed. Run it after a deploy is live:
//   npm run seo:indexnow                           every page in src/data/seo.js
//   npm run seo:indexnow -- /docs/installation ... only these paths
// Only submit what actually changed; resubmitting unchanged URLs does nothing useful.
// The key is the name of public/<32 hex chars>.txt, which must be deployed first.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAGES, SITE_URL } from '../src/data/seo.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const keyFile = fs.readdirSync(path.join(root, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))
if (!keyFile) throw new Error('no IndexNow key file (public/<32 hex chars>.txt) found')
const key = keyFile.slice(0, -'.txt'.length)
const keyLocation = `${SITE_URL}/${keyFile}`

const served = await fetch(keyLocation).then((r) => (r.ok ? r.text() : ''))
if (served.trim() !== key) {
  console.error(`${keyLocation} does not serve the key yet; deploy first.`)
  process.exit(1)
}

const paths = process.argv.slice(2)
const urlList = paths.length ? paths.map((p) => new URL(p, SITE_URL).href) : PAGES.map((p) => p.url)

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation, urlList }),
})

// 200 = accepted, 202 = accepted while the key is still being validated
console.log(`IndexNow: HTTP ${res.status} for ${urlList.length} URL(s)`)
if (!res.ok) {
  console.error(await res.text())
  process.exit(1)
}
