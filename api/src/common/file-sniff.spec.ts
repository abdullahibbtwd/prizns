import { MediaKind } from '@prisma/client';
import { assertSniffMatchesKind, sniffMediaKind } from './file-sniff';

describe('file sniff', () => {
  it('detects jpeg and png headers', () => {
    expect(sniffMediaKind(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      MediaKind.IMAGE,
    );
    expect(
      sniffMediaKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toBe(MediaKind.IMAGE);
  });

  it('detects mp4 ftyp boxes as video', () => {
    const header = Buffer.alloc(12);
    header.write('ftyp', 4);
    header.write('isom', 8);
    expect(sniffMediaKind(header)).toBe(MediaKind.VIDEO);
  });

  it('rejects content that does not match the declared kind', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => assertSniffMatchesKind(jpeg, MediaKind.IMAGE)).not.toThrow();
    expect(() => assertSniffMatchesKind(jpeg, MediaKind.VIDEO)).toThrow();
    expect(() =>
      assertSniffMatchesKind(Buffer.from('MZ executable'), MediaKind.IMAGE),
    ).toThrow();
  });
});
