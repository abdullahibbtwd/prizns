import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PublicSiteSettings = {
  social: {
    facebook: string | null
    instagram: string | null
    youtube: string | null
    tiktok: string | null
  }
  photographerCredit: { name: string; url: string | null } | null
  shopEnabled: boolean
  donations: {
    enabled: boolean
    presets: number[]
    currency: string
  }
}

export const DEFAULT_DONATION_PRESETS = [5, 10, 15]

export type SecretStatus = {
  configured: boolean
  source: 'settings' | 'env' | null
  hint: string | null
  unreadable: boolean
}

export type SmtpSecurity = 'none' | 'starttls' | 'ssl'

export type CmsSiteSettings = {
  facebookUrl: string
  instagramUrl: string
  youtubeUrl: string
  tiktokUrl: string
  photographerCreditName: string
  photographerCreditUrl: string
  shopPublic: boolean
  shopFeatureAvailable: boolean
  donationPresets: number[]
  stripe: {
    secretKey: SecretStatus
    webhookSecret: SecretStatus
    webhookUrl: string
    currency: string
    mode: 'live' | 'test' | null
  }
  email: {
    enabled: boolean
    enabledEffective: boolean
    host: string
    hostEffective: string | null
    port: number | null
    portEffective: number
    user: string
    userEffective: string | null
    password: SecretStatus
    security: SmtpSecurity | ''
    securityEffective: SmtpSecurity
    mailFrom: string
    mailFromName: string
    mailFromEffective: string
    adminNotifyEmail: string
    adminNotifyEmailEffective: string | null
    notifyAdminOnSubmission: boolean
    notifySubmitterOnReceipt: boolean
    notifySubmitterOnDecision: boolean
    configured: boolean
  }
  updatedAt: string | null
}

/** Omitted keys stay unchanged; '' clears (secrets fall back to env). */
export type UpdateSiteSettings = Partial<{
  facebookUrl: string
  instagramUrl: string
  youtubeUrl: string
  tiktokUrl: string
  photographerCreditName: string
  photographerCreditUrl: string
  shopPublic: boolean
  donationPresets: number[]
  stripeSecretKey: string
  stripeWebhookSecret: string
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: number | null
  smtpUser: string
  smtpPassword: string
  smtpSecurity: SmtpSecurity
  mailFrom: string
  mailFromName: string
  adminNotifyEmail: string
  notifyAdminOnSubmission: boolean
  notifySubmitterOnReceipt: boolean
  notifySubmitterOnDecision: boolean
}>

export type StripeTestResult = {
  ok: true
  mode: 'live' | 'test'
  accountId: string
  accountName: string | null
  email: string | null
  chargesEnabled: boolean
  webhookConfigured: boolean
}

export function getPublicSiteSettings() {
  return api.get<PublicSiteSettings>('/settings/public')
}

export const SITE_SETTINGS_QUERY_KEY = ['site-settings-public'] as const

export function useSiteSettings() {
  return useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: getPublicSiteSettings,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

export function getCmsSiteSettings() {
  return api.get<CmsSiteSettings>('/cms/settings')
}

export function updateCmsSiteSettings(body: UpdateSiteSettings) {
  return api.patch<CmsSiteSettings>('/cms/settings', body)
}

export function testCmsStripe() {
  return api.post<StripeTestResult>('/cms/settings/test-stripe')
}

export function testCmsEmail(to?: string) {
  return api.post<{
    ok: true
    to: string
    from: string
    host: string
    port: number
    security: string
  }>('/cms/settings/test-email', to ? { to } : {})
}
