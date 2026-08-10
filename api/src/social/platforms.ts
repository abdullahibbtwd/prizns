export type SocialPlatformDef = {
  code: string
  labelEn: string
  labelBg: string
  hintEn: string
  hintBg: string
  defaultSelected?: boolean
}

/** Editorial catalog — generate uses the saved selection from this list. */
export const SOCIAL_PLATFORM_CATALOG: SocialPlatformDef[] = [
  {
    code: 'FACEBOOK',
    labelEn: 'Facebook',
    labelBg: 'Facebook',
    hintEn: '1–3 short paragraphs + link CTA',
    hintBg: '1–3 кратки абзаца + линк',
    defaultSelected: true,
  },
  {
    code: 'INSTAGRAM',
    labelEn: 'Instagram',
    labelBg: 'Instagram',
    hintEn: 'Caption with line breaks, soft CTA',
    hintBg: 'Надпис с нови редове, меко CTA',
    defaultSelected: true,
  },
  {
    code: 'TIKTOK',
    labelEn: 'TikTok / Shorts',
    labelBg: 'TikTok / Shorts',
    hintEn: 'Spoken / on-screen script ~30–60s',
    hintBg: 'Говорен / екранен сценарий ~30–60 сек',
    defaultSelected: true,
  },
  {
    code: 'X',
    labelEn: 'X (Twitter)',
    labelBg: 'X (Twitter)',
    hintEn: 'Punchy post under 280 chars when possible',
    hintBg: 'Кратък пост до ~280 символа',
  },
  {
    code: 'LINKEDIN',
    labelEn: 'LinkedIn',
    labelBg: 'LinkedIn',
    hintEn: 'Professional editorial tone',
    hintBg: 'Професионален редакционен тон',
  },
  {
    code: 'YOUTUBE',
    labelEn: 'YouTube',
    labelBg: 'YouTube',
    hintEn: 'Title + description blurb',
    hintBg: 'Заглавие + описание',
  },
  {
    code: 'PINTEREST',
    labelEn: 'Pinterest',
    labelBg: 'Pinterest',
    hintEn: 'Pin title + description',
    hintBg: 'Заглавие и описание за пин',
  },
  {
    code: 'THREADS',
    labelEn: 'Threads',
    labelBg: 'Threads',
    hintEn: 'Conversational short thread starter',
    hintBg: 'Разговорен кратък старт на нишка',
  },
  {
    code: 'WHATSAPP',
    labelEn: 'WhatsApp',
    labelBg: 'WhatsApp',
    hintEn: 'Share message with link',
    hintBg: 'Съобщение за споделяне с линк',
  },
  {
    code: 'TELEGRAM',
    labelEn: 'Telegram',
    labelBg: 'Telegram',
    hintEn: 'Channel post with link',
    hintBg: 'Пост за канал с линк',
  },
  {
    code: 'VIBER',
    labelEn: 'Viber',
    labelBg: 'Viber',
    hintEn: 'Community share blurb',
    hintBg: 'Текст за споделяне в общност',
  },
  {
    code: 'REDDIT',
    labelEn: 'Reddit',
    labelBg: 'Reddit',
    hintEn: 'Title + body (no heavy hashtags)',
    hintBg: 'Заглавие + текст (без много хаштагове)',
  },
  {
    code: 'SNAPCHAT',
    labelEn: 'Snapchat',
    labelBg: 'Snapchat',
    hintEn: 'Very short story caption',
    hintBg: 'Много кратък надпис за стори',
  },
  {
    code: 'BLUESKY',
    labelEn: 'Bluesky',
    labelBg: 'Bluesky',
    hintEn: 'Short post similar to X',
    hintBg: 'Кратък пост като в X',
  },
  {
    code: 'MASTODON',
    labelEn: 'Mastodon',
    labelBg: 'Mastodon',
    hintEn: 'Fediverse post with hashtags',
    hintBg: 'Пост с хаштагове',
  },
  {
    code: 'TUMBLR',
    labelEn: 'Tumblr',
    labelBg: 'Tumblr',
    hintEn: 'Short reflective caption',
    hintBg: 'Кратък размисъл / надпис',
  },
  {
    code: 'MEDIUM',
    labelEn: 'Medium',
    labelBg: 'Medium',
    hintEn: 'Promo blurb for the article',
    hintBg: 'Промо текст за статията',
  },
  {
    code: 'DISCORD',
    labelEn: 'Discord',
    labelBg: 'Discord',
    hintEn: 'Community channel announcement',
    hintBg: 'Съобщение за общностен канал',
  },
  {
    code: 'EMAIL',
    labelEn: 'Email / newsletter blurb',
    labelBg: 'Имейл / бюлетин',
    hintEn: 'Subject-friendly teaser paragraph',
    hintBg: 'Кратък тийзър за писмо',
  },
  {
    code: 'GOOGLE_BUSINESS',
    labelEn: 'Google Business',
    labelBg: 'Google Business',
    hintEn: 'Local update post',
    hintBg: 'Локален ъпдейт пост',
  },
]

export const DEFAULT_SOCIAL_PLATFORMS = SOCIAL_PLATFORM_CATALOG.filter(
  (p) => p.defaultSelected,
).map((p) => p.code)

export function isKnownSocialPlatform(code: string) {
  return SOCIAL_PLATFORM_CATALOG.some((p) => p.code === code)
}

export function socialPlatformLabel(code: string, lang: 'bg' | 'en' = 'en') {
  const found = SOCIAL_PLATFORM_CATALOG.find((p) => p.code === code)
  if (!found) return code
  return lang === 'bg' ? found.labelBg : found.labelEn
}

export function socialPlatformHint(code: string) {
  return (
    SOCIAL_PLATFORM_CATALOG.find((p) => p.code === code)?.hintEn ||
    'Short platform-native copy with soft CTA'
  )
}
