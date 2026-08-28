import { describe, expect, it } from 'vitest'
import { getSectionProfile } from './section-profiles'
import { editorSectionChoices } from '@/lib/cms-types'

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

  it('hides sports, news, and featured from the editor dropdown unless already selected', () => {
    expect(editorSectionChoices()).not.toContain('sports')
    expect(editorSectionChoices()).not.toContain('news')
    expect(editorSectionChoices()).not.toContain('featured')
    expect(editorSectionChoices('sports')).toContain('sports')
    expect(editorSectionChoices('featured')).toContain('featured')
    expect(editorSectionChoices('human-stories')).not.toContain('news')
  })
})
