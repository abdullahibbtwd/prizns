export type AppLocale = 'bg' | 'en'

const SKIP_PREFIXES = ['/cms', '/api', '/media', '/sitemap', '/feed', '/robots']

/** Paths that must stay language-agnostic (CMS, APIs, assets). */
export function isLocaleExempt(path: string): boolean {
  if (/^https?:\/\//i.test(path)) return true
  return SKIP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

/** `/en/stories/foo` → `/stories/foo`; `/en` → `/` */
export function stripLocalePrefix(path: string): string {
  if (path === '/en') return '/'
  if (path.startsWith('/en/')) {
    const rest = path.slice(3)
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  return path || '/'
}

export function localeFromPath(path: string): AppLocale {
  const pathname = path.split('?')[0]?.split('#')[0] || '/'
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'bg'
}

function splitPath(path: string): {
  pathname: string
  query: string
  hash: string
} {
  const match = path.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/)
  return {
    pathname: match?.[1] || '/',
    query: match?.[2] || '',
    hash: match?.[3] || '',
  }
}

/**
 * Prefix a site path for the active locale.
 * BG stays unprefixed (`/stories`); EN uses `/en/stories`.
 */
export function withLocale(path: string, lang: AppLocale): string {
  if (!path || isLocaleExempt(path)) return path
  const { pathname, query, hash } = splitPath(path)
  const bare = stripLocalePrefix(pathname)
  const localized =
    lang === 'en' ? (bare === '/' ? '/en' : `/en${bare}`) : bare === '/' ? '/' : bare
  return `${localized}${query}${hash}`
}

export function alternateLocalePath(path: string, target: AppLocale): string {
  return withLocale(path, target)
}
