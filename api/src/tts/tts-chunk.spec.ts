import { chunkTextForTts, TTS_MAX_INPUT_BYTES } from './tts-chunk';

describe('chunkTextForTts', () => {
  it('keeps a short script as one chunk', () => {
    expect(chunkTextForTts('Кратко заглавие.\n\nЕдин абзац.')).toEqual([
      'Кратко заглавие.\n\nЕдин абзац.',
    ]);
  });

  it('splits when UTF-8 byte length exceeds the Google cap', () => {
    const paragraph = 'Ж'.repeat(3000);
    const script = `${paragraph}\n\n${paragraph}`;
    expect(Buffer.byteLength(script, 'utf8')).toBeGreaterThan(5000);

    const chunks = chunkTextForTts(script);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(
        TTS_MAX_INPUT_BYTES,
      );
    }
    expect(chunks.join('').replace(/\s/g, '')).toBe(script.replace(/\s/g, ''));
  });
});
