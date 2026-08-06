import type { ArticleSection } from '@/lib/cms-types'
import { getSectionCategoryBg } from '@/lib/section-i18n'

export type SectionProfile = {
  /** i18n key under cms.editor for the primary title field */
  titleKey: string
  /** i18n key under cms.editor for the secondary/tagline field */
  subtitleKey: string
  /** Default BG category when this section is selected */
  defaultCategoryBg: string
  showAuthor: boolean
  showLocation: boolean
  showReadTime: boolean
  showSpeakerAudio: boolean
  /** Video section: external URL and/or uploaded video file */
  showVideoSource: boolean
  /**
   * First body paragraph is the listing teaser (places detail / traditions description).
   * Shown as its own labeled field; still stored as body[0].
   */
  showTeaser: boolean
  teaserKey?: string
}

const DEFAULT_PROFILE: SectionProfile = {
  titleKey: 'titleBg',
  subtitleKey: 'subtitleBg',
  defaultCategoryBg: 'Материал',
  showAuthor: true,
  showLocation: true,
  showReadTime: true,
  showSpeakerAudio: false,
  showVideoSource: false,
  showTeaser: false,
}

const PROFILES: Partial<Record<ArticleSection, SectionProfile>> = {
  'human-stories': {
    titleKey: 'titleBg',
    subtitleKey: 'excerpt',
    defaultCategoryBg: getSectionCategoryBg('human-stories'),
    showAuthor: true,
    showLocation: true,
    showReadTime: true,
    showSpeakerAudio: false,
    showVideoSource: false,
    showTeaser: false,
  },
  places: {
    titleKey: 'placeName',
    subtitleKey: 'placeSub',
    defaultCategoryBg: getSectionCategoryBg('places'),
    showAuthor: true,
    showLocation: true,
    showReadTime: true,
    showSpeakerAudio: false,
    showVideoSource: false,
    showTeaser: true,
    teaserKey: 'detail',
  },
  traditions: {
    titleKey: 'traditionTitle',
    subtitleKey: 'traditionSub',
    defaultCategoryBg: getSectionCategoryBg('traditions'),
    showAuthor: true,
    showLocation: false,
    showReadTime: false,
    showSpeakerAudio: false,
    showVideoSource: false,
    showTeaser: true,
    teaserKey: 'traditionDescription',
  },
  voices: {
    titleKey: 'titleBg',
    subtitleKey: 'subtitleBg',
    defaultCategoryBg: getSectionCategoryBg('voices'),
    showAuthor: true,
    showLocation: true,
    showReadTime: true,
    showSpeakerAudio: true,
    showVideoSource: false,
    showTeaser: false,
  },
  featured: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('featured'),
  },
  discover: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('discover'),
  },
  sports: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('sports'),
  },
  events: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('events'),
  },
  video: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('video'),
    showVideoSource: true,
    showReadTime: true,
  },
  campaigns: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('campaigns'),
  },
  gallery: {
    ...DEFAULT_PROFILE,
    defaultCategoryBg: getSectionCategoryBg('gallery'),
    showAuthor: true,
    showLocation: true,
    showReadTime: false,
    showSpeakerAudio: false,
    showVideoSource: false,
    showTeaser: false,
  },
}

export function getSectionProfile(section: ArticleSection): SectionProfile {
  return PROFILES[section] ?? DEFAULT_PROFILE
}
