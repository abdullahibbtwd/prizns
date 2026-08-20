import {
  insertImagesAmongParagraphs,
  publicBodyWithInlineImages,
  storedBlockToPublic,
} from './article-body.util';

const gallery = [
  { id: 'hero', url: 'https://cdn.example/hero.jpg', creditBg: 'Hero credit' },
  { id: 'g1', url: 'https://cdn.example/one.jpg', creditBg: 'Photo 1' },
  { id: 'g2', url: 'https://cdn.example/two.jpg', creditBg: 'Photo 2' },
];

describe('article body inline images', () => {
  it('resolves stored image blocks from gallery media ids', () => {
    expect(
      storedBlockToPublic(
        { type: 'image', mediaId: 'g1', captionBg: 'Под снимката', captionEn: 'Caption' },
        gallery,
      ),
    ).toEqual({
      type: 'image',
      url: 'https://cdn.example/one.jpg',
      text: 'Caption',
      textBg: 'Под снимката',
    });
  });

  it('places gallery photos on caption blocks for imported stories', () => {
    const body = publicBodyWithInlineImages(
      [
        { type: 'paragraph', textBg: 'Lead.' },
        { type: 'caption', textBg: 'Снимка: личен архив' },
        { type: 'paragraph', textBg: 'More.' },
      ],
      gallery,
      'https://cdn.example/hero.jpg',
    );

    expect(body).toEqual([
      { type: 'paragraph', text: 'Lead.', textBg: 'Lead.' },
      {
        type: 'image',
        url: 'https://cdn.example/one.jpg',
        text: 'Снимка: личен архив',
        textBg: 'Снимка: личен архив',
      },
      { type: 'paragraph', text: 'More.', textBg: 'More.' },
      {
        type: 'image',
        url: 'https://cdn.example/two.jpg',
        text: 'Photo 2',
        textBg: 'Photo 2',
      },
    ]);
  });

  it('keeps explicit image blocks and does not reuse the hero', () => {
    const body = publicBodyWithInlineImages(
      [
        { type: 'paragraph', textBg: 'Lead.' },
        {
          type: 'image',
          mediaId: 'g2',
          captionBg: 'Inline',
        },
      ],
      gallery,
      'https://cdn.example/hero.jpg',
    );

    expect(body.filter((block) => block.type === 'image')).toEqual([
      {
        type: 'image',
        url: 'https://cdn.example/two.jpg',
        text: 'Inline',
        textBg: 'Inline',
      },
    ]);
  });

  it('resolves stored video blocks from a URL', () => {
    expect(
      storedBlockToPublic(
        {
          type: 'video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          captionBg: 'Клип',
          captionEn: 'Clip',
        },
        gallery,
      ),
    ).toEqual({
      type: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      text: 'Clip',
      textBg: 'Клип',
    });
  });

  it('does not place video gallery files as body images', () => {
    const body = publicBodyWithInlineImages(
      [{ type: 'paragraph', textBg: 'Lead.' }],
      [
        {
          id: 'hero',
          url: 'https://cdn.example/clip.mp4',
          creditBg: null,
          kind: 'VIDEO',
        },
        {
          id: 'g1',
          url: 'https://cdn.example/one.jpg',
          creditBg: 'Photo 1',
          kind: 'IMAGE',
        },
      ],
      '',
    );

    expect(body.filter((block) => block.type === 'image')).toEqual([
      {
        type: 'image',
        url: 'https://cdn.example/one.jpg',
        text: 'Photo 1',
        textBg: 'Photo 1',
      },
    ]);
  });

  it('spreads leftover images after paragraphs', () => {
    const result = insertImagesAmongParagraphs(
      [
        { type: 'paragraph', text: 'A', textBg: 'A' },
        { type: 'paragraph', text: 'B', textBg: 'B' },
        { type: 'paragraph', text: 'C', textBg: 'C' },
      ],
      [
        { type: 'image', url: '1.jpg', text: '', textBg: '' },
        { type: 'image', url: '2.jpg', text: '', textBg: '' },
      ],
    );
    expect(result.map((block) => block.type)).toEqual([
      'paragraph',
      'image',
      'paragraph',
      'image',
      'paragraph',
    ]);
  });
});
