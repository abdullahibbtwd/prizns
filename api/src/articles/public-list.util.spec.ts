import {
  clampPublicListPage,
  clampPublicListPageSize,
  parsePublicArticleSort,
  publicArticleOrderBy,
  publicPublishedAtFilter,
} from './public-list.util';

describe('public-list.util', () => {
  it('defaults invalid sort to newest and accepts alphabet aliases', () => {
    expect(parsePublicArticleSort(undefined)).toBe('newest');
    expect(parsePublicArticleSort('updated')).toBe('newest');
    expect(parsePublicArticleSort('oldest')).toBe('oldest');
    expect(parsePublicArticleSort('az')).toBe('az');
    expect(parsePublicArticleSort('za')).toBe('za');
    expect(parsePublicArticleSort('a-z')).toBe('az');
    expect(parsePublicArticleSort('z-a')).toBe('za');
  });

  it('always ends orderBy with id for pagination stability', () => {
    expect(publicArticleOrderBy('newest')).toEqual([
      { publishedAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(publicArticleOrderBy('oldest')).toEqual([
      { publishedAt: 'asc' },
      { id: 'asc' },
    ]);
    expect(publicArticleOrderBy('az')).toEqual([
      { titleBg: 'asc' },
      { id: 'asc' },
    ]);
    expect(publicArticleOrderBy('za')).toEqual([
      { titleBg: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('builds a publishedAt day range capped at now', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const filter = publicPublishedAtFilter(now, '2026-01-01', '2026-12-31');
    expect(filter.not).toBeNull();
    expect(filter.gte).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(filter.lte).toEqual(now);
  });

  it('caps page and pageSize', () => {
    expect(clampPublicListPage(0)).toBe(1);
    expect(clampPublicListPage(999)).toBe(200);
    expect(clampPublicListPageSize(0)).toBe(30);
    expect(clampPublicListPageSize(100)).toBe(50);
  });
});
