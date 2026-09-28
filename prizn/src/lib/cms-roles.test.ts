import { describe, expect, it } from 'vitest'
import {
  CMS_USER_ROLES,
  canAccessCmsPath,
  canManageAllStories,
  cmsRoleI18nKey,
  filterCmsNavGroups,
  isCmsStaff,
  isCmsSuperAdmin,
  isCmsUserRole,
  primaryCmsRole,
  userRoles,
} from './cms-roles'

describe('cms-roles', () => {
  it('includes the WordPress-style CMS roles in select order', () => {
    expect(CMS_USER_ROLES).toEqual([
      'SEO_EDITOR',
      'SEO_MANAGER',
      'SUBSCRIBER',
      'CONTRIBUTOR',
      'AUTHOR',
      'MODERATOR',
      'EDITOR',
      'ADMIN',
    ])
  })

  it('maps roles to i18n keys', () => {
    expect(cmsRoleI18nKey('SEO_EDITOR')).toBe('cms.roles.seoEditor')
    expect(cmsRoleI18nKey('ADMIN')).toBe('cms.roles.admin')
  })

  it('narrows known role strings', () => {
    expect(isCmsUserRole('AUTHOR')).toBe(true)
    expect(isCmsUserRole('GUEST')).toBe(false)
  })

  it('collects primary plus extra roles and ranks the primary', () => {
    expect(
      userRoles({ role: 'AUTHOR', roles: ['AUTHOR', 'EDITOR'] }),
    ).toEqual(['EDITOR', 'AUTHOR'])
    expect(primaryCmsRole(['AUTHOR', 'ADMIN'])).toBe('ADMIN')
  })

  it('unions path access across multiple roles', () => {
    const editorAuthor = { role: 'EDITOR', roles: ['EDITOR', 'AUTHOR'] }
    expect(canAccessCmsPath(editorAuthor, '/cms/stories/new')).toBe(true)
    expect(canAccessCmsPath(editorAuthor, '/cms/users')).toBe(false)
    expect(canAccessCmsPath({ role: 'ADMIN' }, '/cms/users')).toBe(true)
    expect(canAccessCmsPath({ role: 'AUTHOR' }, '/cms/analytics')).toBe(false)
    expect(
      canAccessCmsPath(
        { role: 'AUTHOR', roles: ['AUTHOR', 'SEO_MANAGER'] },
        '/cms/analytics',
      ),
    ).toBe(true)
  })

  it('hides nav items the signed-in user cannot open', () => {
    const groups = [
      {
        labelKey: 'overview',
        items: [
          { to: '/cms' },
          { to: '/cms/stories' },
          { to: '/cms/users' },
        ],
      },
    ]
    expect(
      filterCmsNavGroups(groups, { role: 'AUTHOR' }).map((g) =>
        g.items.map((item) => item.to),
      ),
    ).toEqual([['/cms', '/cms/stories']])
  })

  it('gives moderators everything except settings and users', () => {
    const moderator = { role: 'MODERATOR' }
    for (const path of [
      '/cms/stories/abc',
      '/cms/submissions',
      '/cms/media',
      '/cms/authors/new',
      '/cms/analytics',
      '/cms/newsletter',
    ]) {
      expect(canAccessCmsPath(moderator, path)).toBe(true)
    }
    expect(canAccessCmsPath(moderator, '/cms/settings')).toBe(false)
    expect(canAccessCmsPath(moderator, '/cms/users')).toBe(false)
    expect(isCmsStaff(moderator)).toBe(true)
    expect(isCmsSuperAdmin(moderator)).toBe(false)
    expect(canManageAllStories(moderator)).toBe(true)
  })

  it('keeps authors to their own stories and profile', () => {
    const author = { role: 'AUTHOR' }
    expect(canAccessCmsPath(author, '/cms/stories/new')).toBe(true)
    expect(canAccessCmsPath(author, '/cms/profile')).toBe(true)
    expect(canAccessCmsPath(author, '/cms/media')).toBe(false)
    expect(canAccessCmsPath(author, '/cms/authors')).toBe(false)
    expect(canManageAllStories(author)).toBe(false)
    expect(isCmsStaff(author)).toBe(false)
  })
})
