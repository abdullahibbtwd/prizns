import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Prizni'
const DEFAULT_DESCRIPTION =
  'Prizni — human stories, places, and traditions from Northwestern Bulgaria.'

function siteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://prizni.bg'
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
  const canonicalPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const canonical = `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${origin}${image.startsWith('/') ? image : `/${image}`}`
    : undefined

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      <meta property="og:locale" content={lang === 'bg' ? 'bg_BG' : 'en_US'} />

      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  )
}
