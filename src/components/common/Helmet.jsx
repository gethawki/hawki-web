import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { NOT_FOUND, pageMeta } from '../../data/seo.js'

// Keeps <head> in sync during client-side navigation. The initial HTML of every
// page already carries the full tag set (scripts/prerender.mjs); this only
// rewrites the per-page values when the route changes.
function upsert(selector, create) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  return el
}

function setMeta(attr, key, content) {
  upsert(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute(attr, key)
    return m
  }).setAttribute('content', content)
}

export function Helmet() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = pageMeta(pathname)
    const meta = page || NOT_FOUND

    document.title = meta.title
    setMeta('name', 'description', meta.description)
    setMeta('property', 'og:title', meta.title)
    setMeta('property', 'og:description', meta.description)
    setMeta('name', 'twitter:title', meta.title)
    setMeta('name', 'twitter:description', meta.description)

    if (page) {
      setMeta('property', 'og:url', page.url)
      setMeta('property', 'og:type', page.type)
      upsert('link[rel="canonical"]', () => {
        const l = document.createElement('link')
        l.rel = 'canonical'
        return l
      }).href = page.url
    } else {
      document.head.querySelector('link[rel="canonical"]')?.remove()
    }
  }, [pathname])

  return null
}
