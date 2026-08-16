export const CMS_USER_ROLES = [
  'SEO_EDITOR',
  'SEO_MANAGER',
  'SUBSCRIBER',
  'CONTRIBUTOR',
  'AUTHOR',
  'EDITOR',
  'ADMIN',
] as const

export type CmsUserRole = (typeof CMS_USER_ROLES)[number]

const CMS_ROLE_I18N_KEYS = {
  SEO_EDITOR: 'cms.roles.seoEditor',
  SEO_MANAGER: 'cms.roles.seoManager',
  SUBSCRIBER: 'cms.roles.subscriber',
  CONTRIBUTOR: 'cms.roles.contributor',
  AUTHOR: 'cms.roles.author',
  EDITOR: 'cms.roles.editor',
  ADMIN: 'cms.roles.admin',
} as const satisfies Record<CmsUserRole, string>

export function cmsRoleI18nKey(role: CmsUserRole): string {
  return CMS_ROLE_I18N_KEYS[role]
}

export function isCmsUserRole(value: string): value is CmsUserRole {
  return (CMS_USER_ROLES as readonly string[]).includes(value)
}
