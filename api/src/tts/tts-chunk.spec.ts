import {
  chunkParagraphsToSsml,
  chunkTextForTts,
  escapeSsml,
  TTS_MAX_INPUT_BYTES,
} from './tts-chunk'

describe('chunkTextForTts', () => {
  it('keeps a short script as one chunk', () => {
    expect(chunkTextForTts('Кратко заглавие.\n\nЕдин абзац.')).toEqual([
      'Кратко заглавие.\n\nЕдин абзац.',
    ])
  })

  it('splits when UTF-8 byte length exceeds the Google cap', () => {
    const paragraph = 'Ж'.repeat(3000)
    const script = `${paragraph}\n\n${paragraph}`
    expect(Buffer.byteLength(script, 'utf8')).toBeGreaterThan(5000)

    const chunks = chunkTextForTts(script)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(
        TTS_MAX_INPUT_BYTES,
      )
    }
    expect(chunks.join('').replace(/\s/g, '')).toBe(script.replace(/\s/g, ''))
  })
})

describe('chunkParagraphsToSsml', () => {
  it('escapes SSML special characters', () => {
    expect(escapeSsml(`A & B <C> "D" 'E'`)).toBe(
      'A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;',
    )
  })

  it('wraps title and body with pauses', () => {
    const [ssml] = chunkParagraphsToSsml([
      'Утро над реката',
      'Първи абзац.',
      'Втори абзац.',
    ])
    expect(ssml).toContain('<speak>')
    expect(ssml).toContain('<p>Утро над реката</p>')
    expect(ssml).toContain('<break time="1000ms"/>')
    expect(ssml).toContain('<break time="600ms"/>')
    expect(ssml).toContain('<p>Първи абзац.</p>')
    expect(ssml).toContain('<p>Втори абзац.</p>')
    expect(Buffer.byteLength(ssml, 'utf8')).toBeLessThanOrEqual(
      TTS_MAX_INPUT_BYTES,
    )
  })

  it('splits oversized scripts into multiple speak documents', () => {
    const paragraphs = Array.from({ length: 40 }, (_, i) =>
      `Абзац ${i + 1}: ${'текст '.repeat(80)}`,
    )
    const chunks = chunkParagraphsToSsml(paragraphs)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.startsWith('<speak>')).toBe(true)
      expect(chunk.endsWith('</speak>')).toBe(true)
      expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(
        TTS_MAX_INPUT_BYTES,
      )
    }
  })
})
