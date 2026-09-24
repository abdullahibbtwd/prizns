import { Helmet } from 'react-helmet-async'
import { absoluteShareUrl } from '@/lib/share-image'
import { stripLocalePrefix, withLocale } from '@/lib/locale-path'

const SITE_NAME = 'Prizni'
/** Bulgarian default — shown when a page omits its own description. */
const DEFAULT_DESCRIPTION =
  'Prizni — човешки истории, места и традиции от Северозападна България.'
export const DEFAULT_SHARE_IMAGE = '/og-default.png'
const DEFAULT_SHARE_ALT = 'Prizni — истории от Северозападна България'

function siteOrigin() {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://prizni.bg'
}

function imageMime(url: string) {
  const path = url.split('?')[0].toLowerCase()
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

export type PageMetaProps = {
  title: string
  description?: string | null
  path?: string
  image?: string | null
  type?: 'website' | 'article'
  lang?: 'bg' | 'en'
  jsonLd?: Record<string, unknown> | null
  noIndex?: boolean
}

export function PageMeta({
  title,
  description,
  path,
  image,
  type = 'website',
  lang = 'bg',
  jsonLd,
  noIndex,
}: PageMetaProps) {
  const origin = siteOrigin()
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
  const desc = (description || DEFAULT_DESCRIPTION).trim()
  const rawPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const barePath = stripLocalePrefix(rawPath)
  const canonicalPath = withLocale(barePath, lang)
  const canonical = `${origin}${canonicalPath === '/' ? '' : canonicalPath}`
  const bgHref = `${origin}${barePath === '/' ? '' : barePath}`
  const enHref = `${origin}${barePath === '/' ? '/en' : `/en${barePath}`}`
  const ogImage =
    absoluteShareUrl(origin, image) ||
    absoluteShareUrl(origin, DEFAULT_SHARE_IMAGE) ||
    `${origin}${DEFAULT_SHARE_IMAGE}`
  const imageAlt = image?.trim() ? fullTitle : DEFAULT_SHARE_ALT

  const resolvedJsonLd = jsonLd
    ? {
        ...jsonLd,
        ...(typeof jsonLd.image === 'string'
          ? { image: absoluteShareUrl(origin, jsonLd.image) || ogImage }
          : Array.isArray(jsonLd.image)
            ? {
                image: jsonLd.image.map(
                  (item) =>
                    (typeof item === 'string'
                      ? absoluteShareUrl(origin, item)
                      : null) || ogImage,
                ),
              }
            : { image: ogImage }),
        ...(typeof jsonLd.mainEntityOfPage === 'string' &&
        jsonLd.mainEntityOfPage.startsWith('/')
          ? {
              mainEntityOfPage: `${origin}${withLocale(jsonLd.mainEntityOfPage, lang)}`,
            }
          : {}),
      }
    : null

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang }}>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="bg" href={bgHref} />
      <link rel="alternate" hrefLang="en" href={enHref} />
      <link rel="alternate" hrefLang="x-default" href={bgHref} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:type" content={imageMime(ogImage)} />
      <meta property="og:locale" content={lang === 'bg' ? 'bg_BG' : 'en_US'} />
      <meta
        property="og:locale:alternate"
        content={lang === 'bg' ? 'en_US' : 'bg_BG'}
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {resolvedJsonLd ? (
        <script type="application/ld+json">{JSON.stringify(resolvedJsonLd)}</script>
      ) : null}
    </Helmet>
  )
}
