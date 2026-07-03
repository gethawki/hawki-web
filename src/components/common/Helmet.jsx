import { useEffect } from 'react'

export function Helmet({ title }) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
  return null
}
