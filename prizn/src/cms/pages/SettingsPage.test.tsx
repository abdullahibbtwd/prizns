import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import type { CmsSiteSettings } from '@/lib/site-settings-api'
import CmsSettingsPage from './SettingsPage'

const getCmsSiteSettings = vi.fn()
const updateCmsSiteSettings = vi.fn()

vi.mock('@/lib/site-settings-api', () => ({
  SITE_SETTINGS_QUERY_KEY: ['site-settings'],
  getCmsSiteSettings: () => getCmsSiteSettings(),
  updateCmsSiteSettings: (body: unknown) => updateCmsSiteSettings(body),
  testCmsStripe: vi.fn(),
  testCmsEmail: vi.fn(),
}))

const noSecret = { configured: false, source: null, hint: null, unreadable: false }

function settings(overrides: Partial<CmsSiteSettings> = {}): CmsSiteSettings {
  return {
    facebookUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    tiktokUrl: '',
    photographerCreditName: '',
    photographerCreditUrl: '',
    shopPublic: false,
    shopFeatureAvailable: true,
    donationPresets: [5, 10, 15],
    stripe: {
      secretKey: noSecret,
      webhookSecret: noSecret,
      webhookUrl: 'https://prizni.bg/api/donations/webhook',
      currency: 'eur',
      mode: null,
    },
    email: {
      enabled: false,
      enabledEffective: false,
      host: '',
      hostEffective: null,
      port: null,
      portEffective: 587,
      user: '',
      userEffective: null,
      password: noSecret,
      security: '',
      securityEffective: 'starttls',
      mailFrom: '',
      mailFromName: '',
      mailFromEffective: 'Prizni <hello@prizni.bg>',
      adminNotifyEmail: '',
      adminNotifyEmailEffective: 'hello@prizni.bg',
      notifyAdminOnSubmission: true,
      notifySubmitterOnReceipt: true,
      notifySubmitterOnDecision: true,
      configured: false,
    },
    updatedAt: null,
    ...overrides,
  }
}

describe('CmsSettingsPage', () => {
  beforeEach(() => {
    getCmsSiteSettings.mockReset().mockResolvedValue(settings())
    updateCmsSiteSettings.mockReset()
  })

  it('shows no save button until something changes', async () => {
    renderPage(<CmsSettingsPage />)
    await screen.findByLabelText('Facebook')
    expect(
      screen.queryByRole('button', { name: 'cms.settings.save' }),
    ).not.toBeInTheDocument()
  })

  it('turns SMTP on automatically when a host is saved', async () => {
    const user = userEvent.setup()
    updateCmsSiteSettings.mockImplementation(async (body: Record<string, unknown>) =>
      settings({
        email: {
          ...settings().email,
          enabled: Boolean(body.smtpEnabled),
          host: String(body.smtpHost ?? ''),
          configured: Boolean(body.smtpEnabled && body.smtpHost),
          mailFrom: String(body.mailFrom ?? ''),
          mailFromName: String(body.mailFromName ?? ''),
        },
        updatedAt: '2026-10-07T12:00:00.000Z',
      }),
    )
    renderPage(<CmsSettingsPage />)
    await user.type(await screen.findByLabelText('cms.settings.smtpHost'), 'mail.company.bg')
    await user.click(screen.getByRole('button', { name: 'cms.settings.save' }))

    await waitFor(() => {
      expect(updateCmsSiteSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          smtpHost: 'mail.company.bg',
          smtpEnabled: true,
        }),
      )
    })
  })

  it('shows one save bar with the change count, and discard restores values', async () => {
    const user = userEvent.setup()
    renderPage(<CmsSettingsPage />)
    const facebook = await screen.findByLabelText('Facebook')
    await user.type(facebook, 'https://facebook.com/prizni')

    expect(screen.getAllByRole('button', { name: 'cms.settings.save' })).toHaveLength(1)
    expect(screen.getByText('cms.settings.unsavedOne')).toBeInTheDocument()
    expect(screen.getByText('cms.settings.edited')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'cms.settings.discard' }))
    expect(facebook).toHaveValue('')
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'cms.settings.save' }),
      ).not.toBeInTheDocument()
    })
  })

  it('saves, confirms with a toast, and hides the bar again', async () => {
    const user = userEvent.setup()
    updateCmsSiteSettings.mockResolvedValue(
      settings({
        facebookUrl: 'https://facebook.com/prizni',
        updatedAt: '2026-09-28T10:00:00.000Z',
      }),
    )
    renderPage(<CmsSettingsPage />)
    await user.type(await screen.findByLabelText('Facebook'), 'https://facebook.com/prizni')
    await user.click(screen.getByRole('button', { name: 'cms.settings.save' }))

    await waitFor(() => {
      expect(updateCmsSiteSettings).toHaveBeenCalledWith(
        expect.objectContaining({ facebookUrl: 'https://facebook.com/prizni' }),
      )
    })
    expect(await screen.findByText('cms.settings.saved')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'cms.settings.save' }),
      ).not.toBeInTheDocument()
    })
  })

  it('blocks saving invalid donation amounts with an inline message', async () => {
    const user = userEvent.setup()
    renderPage(<CmsSettingsPage />)
    const presets = await screen.findByLabelText('cms.settings.presets')
    await user.clear(presets)
    await user.type(presets, 'abc')

    expect(screen.getByText('cms.settings.invalidPresets')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cms.settings.save' })).toBeDisabled()
  })
})
