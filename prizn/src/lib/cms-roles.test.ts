import { describe, expect, it } from 'vitest'
import {
  CMS_USER_ROLES,
  cmsRoleI18nKey,
  isCmsUserRole,
} from './cms-roles'

describe('cms-roles', () => {
  it('includes the WordPress-style CMS roles in select order', () => {
    expect(CMS_USER_ROLES).toEqual([
      'SEO_EDITOR',
      'SEO_MANAGER',
      'SUBSCRIBER',
      'CONTRIBUTOR',
      'AUTHOR',
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
})
