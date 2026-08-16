import { describe, expect, it } from 'vitest'
import { getSectionProfile } from './section-profiles'

describe('getSectionProfile', () => {
  it('uses a teaser field for places and traditions', () => {
    expect(getSectionProfile('places').showTeaser).toBe(true)
    expect(getSectionProfile('places').teaserKey).toBe('detail')
    expect(getSectionProfile('traditions').showLocation).toBe(false)
    expect(getSectionProfile('traditions').showTeaser).toBe(true)
  })

  it('enables speaker audio for voices and video source for video', () => {
    expect(getSectionProfile('voices').showSpeakerAudio).toBe(true)
    expect(getSectionProfile('video').showVideoSource).toBe(true)
  })

  it('falls back to the default profile for unknown sections', () => {
    const profile = getSectionProfile('news')
    expect(profile.showAuthor).toBe(true)
    expect(profile.showTeaser).toBe(false)
    expect(profile.defaultCategoryBg).toBeTruthy()
  })
})
