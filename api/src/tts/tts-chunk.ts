/** Google Cloud TTS standard `synthesizeSpeech` limit is 5000 bytes (UTF-8), not characters. */
export const TTS_MAX_INPUT_BYTES = 4800

function utf8Bytes(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

function splitByBytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let buf = '';
  for (const char of text) {
    const next = buf + char;
    if (utf8Bytes(next) > maxBytes) {
      if (buf) chunks.push(buf);
      buf = char;
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/**
 * Split narration script so each request stays under Google's 5000-byte cap.
 * Cyrillic is typically 2 bytes per character, so a 4500-character clip still overflows.
 */
export function chunkTextForTts(
  text: string,
  maxBytes = TTS_MAX_INPUT_BYTES,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (utf8Bytes(trimmed) <= maxBytes) return [trimmed];

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  const take = (piece: string) => {
    const next = current ? `${current}\n\n${piece}` : piece;
    if (utf8Bytes(next) <= maxBytes) {
      current = next;
      return;
    }
    flush();
    if (utf8Bytes(piece) <= maxBytes) {
      current = piece;
      return;
    }
    for (const sentence of splitSentences(piece)) {
      const joined = current ? `${current} ${sentence}` : sentence;
      if (utf8Bytes(joined) <= maxBytes) {
        current = joined;
        continue;
      }
      flush();
      if (utf8Bytes(sentence) <= maxBytes) {
        current = sentence;
      } else {
        chunks.push(...splitByBytes(sentence, maxBytes));
      }
    }
  };

  for (const paragraph of trimmed.split(/\n{2,}/)) {
    if (paragraph.trim()) take(paragraph.trim());
  }
  flush();
  return chunks;
}
