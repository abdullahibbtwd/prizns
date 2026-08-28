import { describe, expect, it } from 'vitest'
import type { CmsCategory } from '@/lib/categories-api'
import {
  categorySelectOptions,
  visibleCmsCategories,
} from '@/lib/category-tree'

function cat(
  partial: Pick<CmsCategory, 'id' | 'slug' | 'nameEn' | 'parentId'>,
): CmsCategory {
  return {
    nameBg: partial.nameEn ?? partial.slug,
    name: partial.nameEn ?? partial.slug,
    descriptionBg: null,
    descriptionEn: null,
    parentName: null,
    translationStatus: 'READY',
    translationError: null,
    sourceLang: 'bg',
    childCount: 0,
    articleCount: 0,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

describe('visibleCmsCategories', () => {
  it('hides city leftovers, OPIK, and Business from the CMS dropdown', () => {
    const rows = [
      cat({ id: '1', slug: 'choveshki-istorii', nameEn: 'Human stories', parentId: null }),
      cat({ id: '2', slug: 'portreti', nameEn: 'Portraits', parentId: '1' }),
      cat({ id: '3', slug: 'vratza', nameEn: 'Vratsa', parentId: null }),
      cat({ id: '4', slug: 'opik', nameEn: 'OPIK', parentId: null }),
      cat({ id: '5', slug: 'biznes', nameEn: 'Business', parentId: null }),
      cat({ id: '6', slug: 'video', nameEn: 'Video', parentId: null }),
    ]
    expect(visibleCmsCategories(rows).map((row) => row.slug)).toEqual([
      'choveshki-istorii',
      'portreti',
      'video',
    ])
    expect(
      categorySelectOptions(rows, 'en', 'slug').map((row) => row.value),
    ).toEqual(['choveshki-istorii', 'video'])
  })
})
