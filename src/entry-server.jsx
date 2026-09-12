// Build-time only: scripts/prerender.mjs imports the SSR build of this file to
// render each page to static HTML, which src/main.jsx then hydrates.
import { StrictMode } from 'react'
import { prerenderToNodeStream } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import App from './App.jsx'

export async function render(url) {
  // prerender (unlike renderToString) waits for the lazy route chunks to resolve
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
  let html = ''
  for await (const chunk of prelude) html += chunk
  return html
}
