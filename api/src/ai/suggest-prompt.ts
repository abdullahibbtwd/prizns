export type SuggestPromptInput = {
  langLabel: string
  section: string
  titleBg: string
  subtitleBg: string
  locationBg?: string
  categoryBg?: string
  bodyText: string
  variation: string
}

export function draftWordCount(parts: Array<string | undefined>): number {
  return parts
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
}

export function isThinDraft(input: {
  titleBg: string
  subtitleBg?: string
  bodyText?: string
}): boolean {
  return draftWordCount([input.titleBg, input.subtitleBg, input.bodyText]) < 6
}

export function buildSuggestPrompt(input: SuggestPromptInput): string {
  const bodyPreview = input.bodyText.trim().slice(0, 12000)
  const thin = isThinDraft({
    titleBg: input.titleBg,
    subtitleBg: input.subtitleBg,
    bodyText: input.bodyText,
  })
  const grounding = thin
    ? `The draft is a stub (very little text). Do NOT invent villages, traditions, people, or Northwestern Bulgaria color. Headlines and SEO must clearly come from the given words only. If the title is "test", write variations of that stub — never a fake journalistic story.`
    : `Ground every headline in a concrete detail from THIS draft (a name, place, object, quote, or action). Do not fall back to generic "voices of the northwest" / "hidden Bulgaria" templates.`

  return `You are the editorial assistant for Prizni, a warm digital journal of human stories, places, and traditions from Northwestern Bulgaria.

IMPORTANT: The editor is writing in ${input.langLabel}. All suggestions MUST be written in ${input.langLabel} only. Do not mix languages. Do not default to English unless the draft itself is English.

Tone: warm, concrete, photography-led, never clickbait.

Return ONLY valid JSON with this shape:
{
  "headlines": ["...", "...", "..."],
  "subtitle": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "topicTags": ["...", "..."],
  "episodeOutline": ["...", "..."],
  "summary": "..."
}

Rules:
- headlines: exactly 3 distinct alternatives in ${input.langLabel}
- subtitle, seoTitle, seoDescription, topicTags, episodeOutline, summary: all in ${input.langLabel}
- seoTitle: under 60 characters when possible
- seoDescription: under 155 characters
- topicTags: 3–6 short topic labels (not places unless clearly about a place)
- episodeOutline: 0–5 episode titles if the draft could be a series; else []
- Do not invent facts not supported by the draft
- ${grounding}
- Treat title, subtitle, location, category, and body as the only source of truth
- Fresh take token: ${input.variation} (do not mention this token)

Detected draft language: ${input.langLabel}
Section: ${input.section || 'human-stories'}
Category: ${input.categoryBg || '(none)'}
Location: ${input.locationBg || '(none)'}
Title: ${input.titleBg}
Subtitle: ${input.subtitleBg || ''}
Draft body:
${bodyPreview || '(empty draft)'}`
}
