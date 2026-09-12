import { useParams, Navigate } from 'react-router-dom'
import DocsLayout from '../components/docs/DocsLayout.jsx'
import { CHANGELOG_SECTIONS } from '../components/docs/ChangelogSections.jsx'
import { CHANGELOG_NAV } from '../data/changelogNav.js'

const FLAT = CHANGELOG_NAV.flatMap((g) => g.links)

export default function Changelog() {
  const { slug } = useParams()
  const index = FLAT.findIndex((l) => l.href === slug)

  if (index === -1) {
    return <Navigate to={`/changelog/${FLAT[0].href}`} replace />
  }

  const prev = index > 0 ? FLAT[index - 1] : null
  const next = index < FLAT.length - 1 ? FLAT[index + 1] : null

  return (
    <DocsLayout
      nav={CHANGELOG_NAV}
      basePath="/changelog"
      activeId={slug}
      eyebrow="Changelog"
      content={CHANGELOG_SECTIONS[slug]}
      footerNote="Release notes · v1.0.0"
      mobileTitle="Hawk-i Changelog"
      prev={prev}
      next={next}
    />
  )
}
