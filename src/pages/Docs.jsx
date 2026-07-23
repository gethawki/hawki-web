import { useParams, Navigate } from 'react-router-dom'
import { Helmet } from '../components/common/Helmet.jsx'
import DocsLayout from '../components/docs/DocsLayout.jsx'
import { DOCS_SECTIONS } from '../components/docs/DocsSections.jsx'
import { DOCS_NAV } from '../data/docsNav.js'

const FLAT = DOCS_NAV.flatMap((g) => g.links)

export default function Docs() {
  const { slug } = useParams()
  const index = FLAT.findIndex((l) => l.href === slug)

  if (index === -1) {
    return <Navigate to={`/docs/${FLAT[0].href}`} replace />
  }

  const current = FLAT[index]
  const prev = index > 0 ? FLAT[index - 1] : null
  const next = index < FLAT.length - 1 ? FLAT[index + 1] : null

  return (
    <>
      <Helmet title={`Hawk-i Docs · ${current.label}`} />
      <DocsLayout
        nav={DOCS_NAV}
        basePath="/docs"
        activeId={slug}
        eyebrow="Documentation"
        content={DOCS_SECTIONS[slug]}
        footerNote="MIT licensed · v1.0.0"
        mobileTitle="Hawk-i Docs"
        prev={prev}
        next={next}
      />
    </>
  )
}
