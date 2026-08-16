import { htmlToBlocks, stripHtml } from './html';

const SAMPLE_HTML = `
<p>Всеки от нас има поне един познат.</p>
<figure class="wp-caption">
  <img src="http://prizni.bg/wp-content/uploads/2026/08/da-badesh.jpg" alt="" />
  <figcaption>Снимка: личен архив</figcaption>
</figure>
<h3><b>За избора на спорта</b></h3>
<p>Навън бягането е рутина.</p>
<p><strong>„Започнах да се занимавам със спорт, защото си помислих какъв баща бих искал да бъда за децата си.“</strong></p>
<blockquote><p>Умората е чувство.</p></blockquote>
`;

describe('wordpress htmlToBlocks', () => {
  it('strips tags and decodes entities', () => {
    expect(stripHtml('<p>Hello&#8230; &amp; world</p>')).toBe('Hello… & world');
  });

  it('maps paragraphs, headings, quotes, and figures', () => {
    const { blocks, images } = htmlToBlocks(SAMPLE_HTML);

    expect(images).toEqual([
      {
        src: 'https://prizni.bg/wp-content/uploads/2026/08/da-badesh.jpg',
        caption: 'Снимка: личен архив',
        alt: '',
      },
    ]);

    expect(blocks[0]).toEqual({
      type: 'paragraph',
      textBg: 'Всеки от нас има поне един познат.',
    });
    expect(blocks[1]).toEqual({
      type: 'caption',
      textBg: 'Снимка: личен архив',
    });
    expect(blocks[2]).toEqual({
      type: 'note',
      labelBg: 'За избора на спорта',
      textBg: '',
    });
    expect(blocks[3]).toEqual({
      type: 'paragraph',
      textBg: 'Навън бягането е рутина.',
    });
    expect(blocks[4]).toMatchObject({
      type: 'pullquote',
      textBg: expect.stringContaining('Започнах да се занимавам със спорт'),
    });
    expect(blocks[5]).toMatchObject({
      type: 'pullquote',
      textBg: 'Умората е чувство.',
    });
  });
});
