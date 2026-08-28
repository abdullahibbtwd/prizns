import { flattenCategoryTree } from './flatten-categories';

describe('flattenCategoryTree', () => {
  function makePrisma(rows: Array<{
    id: string;
    slug: string;
    nameBg: string;
    parentId: string | null;
  }>) {
    const categories = rows.map((row) => ({ ...row }));
    const articleCategories: Array<{ articleId: string; categoryId: string }> = [
      { articleId: 'a1', categoryId: 'portreti' },
      { articleId: 'a2', categoryId: 'novini' },
    ];
    const articles: Array<{ id: string; categoryBg: string }> = [
      { id: 'a1', categoryBg: 'Портрети' },
      { id: 'a2', categoryBg: 'Новини' },
    ];

    const prisma = {
      category: {
        findMany: jest.fn(async () => categories.map((row) => ({ ...row }))),
        updateMany: jest.fn(async ({ where, data }: {
          where: { id: { in: string[] } };
          data: { parentId: string | null };
        }) => {
          for (const row of categories) {
            if (where.id.in.includes(row.id)) row.parentId = data.parentId;
          }
        }),
        delete: jest.fn(async ({ where }: { where: { id: string } }) => {
          const index = categories.findIndex((row) => row.id === where.id);
          if (index >= 0) categories.splice(index, 1);
        }),
      },
      articleCategory: {
        findMany: jest.fn(async ({ where }: { where: { categoryId: string } }) =>
          articleCategories.filter((row) => row.categoryId === where.categoryId),
        ),
        findUnique: jest.fn(async ({
          where,
        }: {
          where: { articleId_categoryId: { articleId: string; categoryId: string } };
        }) =>
          articleCategories.find(
            (row) =>
              row.articleId === where.articleId_categoryId.articleId &&
              row.categoryId === where.articleId_categoryId.categoryId,
          ) ?? null,
        ),
        create: jest.fn(async ({ data }: { data: { articleId: string; categoryId: string } }) => {
          articleCategories.push(data);
        }),
        deleteMany: jest.fn(async ({ where }: { where: { categoryId: string } }) => {
          for (let i = articleCategories.length - 1; i >= 0; i -= 1) {
            if (articleCategories[i]?.categoryId === where.categoryId) {
              articleCategories.splice(i, 1);
            }
          }
        }),
      },
      article: {
        update: jest.fn(async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { categoryBg: string };
        }) => {
          const row = articles.find((item) => item.id === where.id);
          if (row) row.categoryBg = data.categoryBg;
        }),
      },
    };

    return { prisma, categories, articleCategories, articles };
  }

  const tree = [
    { id: 'human', slug: 'choveshki-istorii', nameBg: 'Човешки истории', parentId: null },
    { id: 'portreti', slug: 'portreti', nameBg: 'Портрети', parentId: 'human' },
    { id: 'sport', slug: 'sport-2', nameBg: 'Спорт', parentId: null },
    { id: 'novini', slug: 'novini', nameBg: 'Новини', parentId: 'sport' },
  ];

  it('merges same-section children and promotes News', async () => {
    const { prisma, categories, articleCategories, articles } = makePrisma(tree);
    const result = await flattenCategoryTree(prisma as never);

    expect(result.merged).toBe(1);
    expect(result.promoted).toBe(1);
    expect(categories.map((row) => row.slug).sort()).toEqual([
      'choveshki-istorii',
      'novini',
      'sport-2',
    ]);
    expect(categories.find((row) => row.slug === 'novini')?.parentId).toBeNull();
    expect(articleCategories).toEqual(
      expect.arrayContaining([
        { articleId: 'a1', categoryId: 'human' },
        { articleId: 'a2', categoryId: 'novini' },
      ]),
    );
    expect(articleCategories).toHaveLength(2);
    expect(articles.find((row) => row.id === 'a1')?.categoryBg).toBe(
      'Човешки истории',
    );
  });

  it('dry-run does not write', async () => {
    const { prisma, categories } = makePrisma(tree);
    const result = await flattenCategoryTree(prisma as never, { dryRun: true });
    expect(result.merged).toBe(1);
    expect(result.promoted).toBe(1);
    expect(prisma.category.delete).not.toHaveBeenCalled();
    expect(categories).toHaveLength(4);
  });
});
