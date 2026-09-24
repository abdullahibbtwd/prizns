import {
  fixMixedScriptLookalikes,
  foldLatinToCyrillic,
  searchLookalikeVariants,
} from './cyrillic-latin-fold';

describe('cyrillic-latin-fold', () => {
  it('folds Latin O to Cyrillic О', () => {
    expect(foldLatinToCyrillic('Oля Георгиева')).toBe('Оля Георгиева');
  });

  it('builds search variants for mixed queries', () => {
    expect(searchLookalikeVariants('Oля')).toEqual(
      expect.arrayContaining(['Oля', 'Оля']),
    );
    expect(searchLookalikeVariants('Оля')).toEqual(
      expect.arrayContaining(['Оля', 'Oля']),
    );
  });

  it('fixes Latin letters inside Cyrillic words', () => {
    expect(fixMixedScriptLookalikes('Oля Георгиева: Страстта')).toBe(
      'Оля Георгиева: Страстта',
    );
    expect(fixMixedScriptLookalikes('Оля Георгиева')).toBeNull();
    expect(fixMixedScriptLookalikes('Village life')).toBeNull();
  });
});
