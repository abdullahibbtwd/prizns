import type { Plugin } from 'vite'

/**
 * Dev/stage Vite: document requests from non-browser UAs (curl, crawlers)
 * receive the same bot-shell HTML production nginx serves — so meta is in the
 * raw response without waiting for client JS.
 */
function isBrowserLikeUa(ua: string | undefined): boolean {
  if (!ua) return false
  if (
    /googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|applebot|duckduckbot|semrushbot|ahrefsbot/i.test(
      ua,
    )
  ) {
    return false
  }
  return /Mozilla|Chrome|Safari|Firefox|Edg|OPR|Opera|CriOS|FxiOS/i.test(ua)
}

function shouldSkipPath(pathname: string): boolean {
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/src') ||
    pathname.startsWith('/node_modules') ||
    pathname.startsWith('/media')
  ) {
    return true
  }
  return /\.\w{2,5}$/.test(pathname)
}

export function prizniSeoShellPlugin(apiOrigin: string): Plugin {
  const base = apiOrigin.replace(/\/+$/, '')

  return {
    name: 'prizni-seo-shell',
    configureServer(server) {
      // Run after Vite's internal middleware so assets still resolve first.
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            next()
            return
          }
          if (isBrowserLikeUa(req.headers['user-agent'])) {
            next()
            return
          }

          const rawUrl = req.url || '/'
          const pathname = rawUrl.split('?')[0] || '/'
          if (shouldSkipPath(pathname)) {
            next()
            return
          }

          try {
            const target = `${base}/bot-shell?path=${encodeURIComponent(rawUrl)}`
            const upstream = await fetch(target)
            const html = await upstream.text()
            if (!html.includes('<title>') || !html.includes('og:title')) {
              next()
              return
            }
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            if (req.method === 'HEAD') {
              res.end()
              return
            }
            res.end(html)
          } catch {
            next()
          }
        })
      }
    },
  }
}
