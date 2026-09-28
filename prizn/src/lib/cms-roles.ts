export const CMS_USER_ROLES = [
  'SEO_EDITOR',
  'SEO_MANAGER',
  'SUBSCRIBER',
  'CONTRIBUTOR',
  'AUTHOR',
  'MODERATOR',
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
  MODERATOR: 'cms.roles.moderator',
  EDITOR: 'cms.roles.editor',
  ADMIN: 'cms.roles.admin',
} as const satisfies Record<CmsUserRole, string>

const ROLE_RANK: Record<CmsUserRole, number> = {
  SUBSCRIBER: 0,
  CONTRIBUTOR: 1,
  AUTHOR: 2,
  SEO_EDITOR: 3,
  SEO_MANAGER: 4,
  MODERATOR: 5,
  EDITOR: 5,
  ADMIN: 6,
}

type CmsPathAccess = {
  allow: '*' | string[]
  deny?: string[]
}

/**
 * Union of these prefixes is what each role can open in the CMS. Menu only —
 * the API enforces the same rules (`api/src/auth/role-access.ts`).
 */
const STAFF_PATH_ACCESS: CmsPathAccess = {
  allow: '*',
  deny: ['/cms/users', '/cms/settings'],
}

const ROLE_PATH_ACCESS: Record<CmsUserRole, CmsPathAccess> = {
  ADMIN: { allow: '*' },
  MODERATOR: STAFF_PATH_ACCESS,
  EDITOR: STAFF_PATH_ACCESS,
  AUTHOR: {
    allow: ['/cms', '/cms/stories', '/cms/profile'],
  },
  CONTRIBUTOR: {
    allow: [
      '/cms',
      '/cms/stories',
      '/cms/submissions',
      '/cms/media',
      '/cms/profile',
    ],
  },
  SEO_EDITOR: {
    allow: [
      '/cms',
      '/cms/stories',
      '/cms/seo',
      '/cms/tags',
      '/cms/categories',
      '/cms/profile',
    ],
  },
  SEO_MANAGER: {
    allow: [
      '/cms',
      '/cms/seo',
      '/cms/analytics',
      '/cms/tags',
      '/cms/categories',
      '/cms/profile',
    ],
  },
  SUBSCRIBER: { allow: ['/cms', '/cms/profile'] },
}

export type CmsRoleUser = {
  role?: string | null
  roles?: string[] | null
} | null | undefined

export function cmsRoleI18nKey(role: CmsUserRole): string {
  return CMS_ROLE_I18N_KEYS[role]
}

export function isCmsUserRole(value: string): value is CmsUserRole {
  return (CMS_USER_ROLES as readonly string[]).includes(value)
}

export function userRoles(user: CmsRoleUser): CmsUserRole[] {
  const collected = [...(user?.roles ?? []), user?.role].filter(
    (role): role is CmsUserRole => typeof role === 'string' && isCmsUserRole(role),
  )
  const seen = new Set<CmsUserRole>()
  const unique: CmsUserRole[] = []
  for (const role of collected) {
    if (!seen.has(role)) {
      seen.add(role)
      unique.push(role)
    }
  }
  return unique.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])
}

export function primaryCmsRole(
  roles: CmsUserRole[],
  fallback: CmsUserRole = 'SUBSCRIBER',
): CmsUserRole {
  if (!roles.length) return fallback
  return roles.reduce((best, role) =>
    ROLE_RANK[role] > ROLE_RANK[best] ? role : best,
  )
}

export function hasCmsRole(user: CmsRoleUser, role: CmsUserRole): boolean {
  return userRoles(user).includes(role)
}

const STAFF_ROLES: CmsUserRole[] = ['ADMIN', 'MODERATOR', 'EDITOR']
const ALL_STORIES_ROLES: CmsUserRole[] = [...STAFF_ROLES, 'SEO_EDITOR']

/** Moderator-level: submissions, gallery, authors, any story. */
export function isCmsStaff(user: CmsRoleUser): boolean {
  return userRoles(user).some((role) => STAFF_ROLES.includes(role))
}

/** Settings, users/roles and permanent deletes. */
export function isCmsSuperAdmin(user: CmsRoleUser): boolean {
  return hasCmsRole(user, 'ADMIN')
}

/** Only moderators and super admins publish, schedule or archive; others submit for review. */
export function canPublishStories(user: CmsRoleUser): boolean {
  return isCmsStaff(user)
}

/** False for authors/contributors, who only see and edit their own stories. */
export function canManageAllStories(user: CmsRoleUser): boolean {
  return userRoles(user).some((role) => ALL_STORIES_ROLES.includes(role))
}

function normalizeCmsPath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed || '/cms'
}

function matchesCmsPrefix(pathname: string, prefix: string) {
  if (prefix === '/cms') return pathname === '/cms'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function roleAllowsPath(role: CmsUserRole, pathname: string): boolean {
  const access = ROLE_PATH_ACCESS[role]
  if (access.deny?.some((prefix) => matchesCmsPrefix(pathname, prefix))) {
    return false
  }
  if (access.allow === '*') return true
  return access.allow.some((prefix) => matchesCmsPrefix(pathname, prefix))
}

export function canAccessCmsPath(user: CmsRoleUser, pathname: string): boolean {
  const path = normalizeCmsPath(pathname)
  return userRoles(user).some((role) => roleAllowsPath(role, path))
}

export function filterCmsNavGroups<
  T extends { items: Array<{ to: string }> },
>(groups: T[], user: CmsRoleUser): T[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessCmsPath(user, item.to)),
    }))
    .filter((group) => group.items.length > 0)
}
