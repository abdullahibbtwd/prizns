/** Google Cloud TTS `synthesizeSpeech` limit is 5000 bytes (UTF-8), not characters. */
export const TTS_MAX_INPUT_BYTES = 4800

/** Leave headroom for `<speak>`, `<p>`, and `<break>` wrappers. */
export const TTS_SSML_CONTENT_MAX_BYTES = 4200

function utf8Bytes(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter(Boolean)
}

function splitByBytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = []
  let buf = ''
  for (const char of text) {
    const next = buf + char
    if (utf8Bytes(next) > maxBytes) {
      if (buf) chunks.push(buf)
      buf = char
    } else {
      buf = next
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}

/**
 * Split narration script so each request stays under Google's 5000-byte cap.
 * Cyrillic is typically 2 bytes per character, so a 4500-character clip still overflows.
 */
export function chunkTextForTts(
  text: string,
  maxBytes = TTS_MAX_INPUT_BYTES,
): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (utf8Bytes(trimmed) <= maxBytes) return [trimmed]

  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  const take = (piece: string) => {
    const next = current ? `${current}\n\n${piece}` : piece
    if (utf8Bytes(next) <= maxBytes) {
      current = next
      return
    }
    flush()
    if (utf8Bytes(piece) <= maxBytes) {
      current = piece
      return
    }
    for (const sentence of splitSentences(piece)) {
      const joined = current ? `${current} ${sentence}` : sentence
      if (utf8Bytes(joined) <= maxBytes) {
        current = joined
        continue
      }
      flush()
      if (utf8Bytes(sentence) <= maxBytes) {
        current = sentence
      } else {
        chunks.push(...splitByBytes(sentence, maxBytes))
      }
    }
  }

  for (const paragraph of trimmed.split(/\n{2,}/)) {
    if (paragraph.trim()) take(paragraph.trim())
  }
  flush()
  return chunks
}

export function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export type SsmlChunkOptions = {
  maxBytes?: number
  /** Pause after the first paragraph (usually the title). */
  titleBreakMs?: number
  /** Pause between later paragraphs. */
  paragraphBreakMs?: number
}

function expandParagraphs(paragraphs: string[]): string[] {
  const out: string[] = []
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue
    if (utf8Bytes(trimmed) <= TTS_SSML_CONTENT_MAX_BYTES) {
      out.push(trimmed)
    } else {
      out.push(...splitByBytes(trimmed, TTS_SSML_CONTENT_MAX_BYTES))
    }
  }
  return out
}

/**
 * Pack plain paragraphs into `<speak>` documents with natural pauses,
 * staying under Google's synthesizeSpeech byte limit.
 */
export function chunkParagraphsToSsml(
  paragraphs: string[],
  options: SsmlChunkOptions = {},
): string[] {
  const maxBytes = options.maxBytes ?? TTS_MAX_INPUT_BYTES
  const titleBreakMs = options.titleBreakMs ?? 1000
  const paragraphBreakMs = options.paragraphBreakMs ?? 600
  const cleaned = expandParagraphs(paragraphs)
  if (cleaned.length === 0) return []

  const chunks: string[] = []
  let inner = ''
  let countInChunk = 0

  const wrap = (body: string) => `<speak>${body}</speak>`

  const flush = () => {
    if (!inner) return
    chunks.push(wrap(inner))
    inner = ''
    countInChunk = 0
  }

  cleaned.forEach((paragraph, index) => {
    const pauseMs =
      countInChunk === 0
        ? 0
        : index === 1
          ? titleBreakMs
          : paragraphBreakMs
    const breakTag = pauseMs > 0 ? `<break time="${pauseMs}ms"/>` : ''
    const block = `${breakTag}<p>${escapeSsml(paragraph)}</p>`
    const candidate = inner + block

    if (utf8Bytes(wrap(candidate)) > maxBytes && inner) {
      flush()
      const restart = `<p>${escapeSsml(paragraph)}</p>`
      if (utf8Bytes(wrap(restart)) > maxBytes) {
        for (const hard of splitByBytes(paragraph, Math.floor(maxBytes / 2))) {
          chunks.push(wrap(`<p>${escapeSsml(hard)}</p>`))
        }
        return
      }
      inner = restart
      countInChunk = 1
      return
    }

    inner = candidate
    countInChunk += 1
  })

  flush()
  return chunks
}
