import { defineConfig } from 'vite'

/**
 * Task 23 — strip all dev-only surfaces from the production build.
 *
 * Renderer JS is already tree-shaken (dev modules live behind `import.meta.env.PROD`
 * dynamic imports). This plugin handles the two surfaces tree-shaking cannot reach:
 *
 *  - HTML: removes every element carrying `data-dev="true"` (with its children),
 *          balancing nested same-name tags.
 *  - CSS:  removes every block between `/* === DEV-ONLY START === *\/` and
 *          `/* === DEV-ONLY END === *\/`, before Vite minifies (which would drop the
 *          marker comments).
 *
 * `apply: 'build'` keeps the whole plugin inert in the dev server, so the dev UI
 * stays fully visible while developing.
 */
function stripDevOnly() {
  const DEV_CSS_BLOCK = /\/\*\s*===\s*DEV-ONLY START\s*===\s*\*\/[\s\S]*?\/\*\s*===\s*DEV-ONLY END\s*===\s*\*\//g

  function stripDataDevElements(html) {
    const ATTR = 'data-dev="true"'
    let idx
    while ((idx = html.indexOf(ATTR)) !== -1) {
      const tagStart = html.lastIndexOf('<', idx)
      const nameMatch = /^<([a-zA-Z0-9-]+)/.exec(html.slice(tagStart))
      if (tagStart === -1 || !nameMatch) {
        // Safety: drop just the attribute so we can never loop forever.
        html = html.slice(0, idx) + html.slice(idx + ATTR.length)
        continue
      }
      const tag = nameMatch[1]
      const startTagEnd = html.indexOf('>', idx)
      if (startTagEnd === -1) break
      const selfClosing = html[startTagEnd - 1] === '/'
      let endPos
      if (selfClosing) {
        endPos = startTagEnd + 1
      } else {
        const openRe = new RegExp('<' + tag + '(?=[\\s/>])', 'g')
        const closeRe = new RegExp('</' + tag + '\\s*>', 'g')
        let depth = 1
        let pos = startTagEnd + 1
        while (depth > 0) {
          openRe.lastIndex = pos
          closeRe.lastIndex = pos
          const o = openRe.exec(html)
          const c = closeRe.exec(html)
          if (!c) { pos = html.length; break }
          if (o && o.index < c.index) { depth++; pos = o.index + tag.length + 1 }
          else { depth--; pos = c.index + c[0].length }
        }
        endPos = pos
      }
      // Also swallow leading indentation and the trailing newline left behind.
      let cut = tagStart
      while (cut > 0 && (html[cut - 1] === ' ' || html[cut - 1] === '\t')) cut--
      let after = endPos
      if (html[after] === '\r') after++
      if (html[after] === '\n') after++
      html = html.slice(0, cut) + html.slice(after)
    }
    return html
  }

  return {
    name: 'jtv-strip-dev-only',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Strip dev-only elements, then drop HTML comments (smaller + no structure leak).
        return stripDataDevElements(html).replace(/<!--[\s\S]*?-->/g, '')
      }
    },
    transform(code, id) {
      if (id.split('?')[0].endsWith('.css')) {
        return { code: code.replace(DEV_CSS_BLOCK, ''), map: null }
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [stripDevOnly()],
  server: {
    port: 5173
  }
})
