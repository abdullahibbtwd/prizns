import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Mail,
  Share2,
  ShoppingBag,
  Camera,
  AlertTriangle,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
} from '@/cms/components/CmsUI'
import { CmsCheckbox, CmsField, CmsInput, CmsSelect } from '@/cms/components/CmsFields'
import { CmsPasswordInput } from '@/cms/components/CmsPasswordInput'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { Alert } from '@/components/ui/Alert'
import { ApiError } from '@/lib/api'
import {
  SITE_SETTINGS_QUERY_KEY,
  getCmsSiteSettings,
  testCmsEmail,
  testCmsStripe,
  updateCmsSiteSettings,
  type CmsSiteSettings,
  type SecretStatus,
  type SmtpSecurity,
  type UpdateSiteSettings,
} from '@/lib/site-settings-api'
import { cn } from '@/lib/utils'

type Form = {
  facebookUrl: string
  instagramUrl: string
  youtubeUrl: string
  tiktokUrl: string
  photographerCreditName: string
  photographerCreditUrl: string
  shopPublic: boolean
  presets: string
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpSecurity: SmtpSecurity
  mailFrom: string
  mailFromName: string
  adminNotifyEmail: string
  notifyAdminOnSubmission: boolean
  notifySubmitterOnReceipt: boolean
  notifySubmitterOnDecision: boolean
}

type SecretKey = 'stripeSecretKey' | 'stripeWebhookSecret' | 'smtpPassword'
const SECRET_KEYS: SecretKey[] = ['stripeSecretKey', 'stripeWebhookSecret', 'smtpPassword']
const EMPTY_SECRETS: Record<SecretKey, string> = {
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  smtpPassword: '',
}

type SectionId = 'social' | 'credit' | 'shop' | 'donations' | 'email'
const SECTION_FIELDS: Record<SectionId, Array<keyof Form | SecretKey>> = {
  social: ['facebookUrl', 'instagramUrl', 'youtubeUrl', 'tiktokUrl'],
  credit: ['photographerCreditName', 'photographerCreditUrl'],
  shop: ['shopPublic'],
  donations: ['presets', 'stripeSecretKey', 'stripeWebhookSecret'],
  email: [
    'smtpEnabled',
    'smtpHost',
    'smtpPort',
    'smtpUser',
    'smtpPassword',
    'smtpSecurity',
    'mailFrom',
    'mailFromName',
    'adminNotifyEmail',
    'notifyAdminOnSubmission',
    'notifySubmitterOnReceipt',
    'notifySubmitterOnDecision',
  ],
}

type Toast = { open: boolean; variant: 'success' | 'error'; message: string }

const EMPTY_SECRET: SecretStatus = {
  configured: false,
  source: null,
  hint: null,
  unreadable: false,
}

function toForm(s: CmsSiteSettings): Form {
  const email = s.email
  return {
    facebookUrl: s.facebookUrl,
    instagramUrl: s.instagramUrl,
    youtubeUrl: s.youtubeUrl,
    tiktokUrl: s.tiktokUrl,
    photographerCreditName: s.photographerCreditName,
    photographerCreditUrl: s.photographerCreditUrl,
    shopPublic: s.shopPublic,
    presets: s.donationPresets.join(', '),
    smtpEnabled: Boolean(email?.enabled),
    smtpHost: email?.host ?? '',
    smtpPort: email?.port != null ? String(email.port) : '',
    smtpUser: email?.user ?? '',
    smtpSecurity: email?.security || email?.securityEffective || 'starttls',
    mailFrom: email?.mailFrom ?? '',
    mailFromName: email?.mailFromName ?? '',
    adminNotifyEmail: email?.adminNotifyEmail ?? '',
    notifyAdminOnSubmission: email?.notifyAdminOnSubmission ?? true,
    notifySubmitterOnReceipt: email?.notifySubmitterOnReceipt ?? true,
    notifySubmitterOnDecision: email?.notifySubmitterOnDecision ?? true,
  }
}

function parsePresets(value: string): number[] | null {
  const parts = value
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!parts.length || parts.length > 6) return null
  const numbers = parts.map(Number)
  if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 10000)) return null
  return numbers
}

function sameValue(key: keyof Form, a: Form[keyof Form], b: Form[keyof Form]) {
  if (key === 'presets') {
    return String(a).replace(/[\s,]+/g, ',') === String(b).replace(/[\s,]+/g, ',')
  }
  if (typeof a === 'string' && typeof b === 'string') return a.trim() === b.trim()
  return a === b
}

function errorText(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return String(error)
}

function Section({
  icon: Icon,
  title,
  help,
  status,
  edited,
  editedLabel,
  children,
}: {
  icon: typeof Mail
  title: string
  help?: ReactNode
  status?: ReactNode
  edited?: boolean
  editedLabel: string
  children: ReactNode
}) {
  return (
    <CmsCard
      hover={false}
      className={cn(
        'p-6 transition-shadow md:p-8',
        edited && 'ring-1 ring-amber-300/80',
      )}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#0C2686]/15 bg-[#0C2686]/5 text-[#0C2686]">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-bold text-stone-900">{title}</h2>
              {edited ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {editedLabel}
                </span>
              ) : null}
            </div>
            {help ? (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">{help}</p>
            ) : null}
          </div>
        </div>
        {status}
      </div>
      <div className="space-y-5">{children}</div>
    </CmsCard>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-800',
      )}
    >
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {label}
    </span>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] py-3 pl-8 pr-4 text-xs leading-relaxed text-stone-600">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  )
}

export default function CmsSettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useCmsConfirm()
  const settingsQuery = useQuery({
    queryKey: ['cms-site-settings'],
    queryFn: getCmsSiteSettings,
  })
  const data = settingsQuery.data

  const [form, setForm] = useState<Form | null>(null)
  const [secrets, setSecrets] = useState<Record<SecretKey, string>>(EMPTY_SECRETS)
  const [visible, setVisible] = useState<Record<SecretKey, boolean>>({
    stripeSecretKey: false,
    stripeWebhookSecret: false,
    smtpPassword: false,
  })
  const [toast, setToast] = useState<Toast>({ open: false, variant: 'success', message: '' })
  const [stripeResult, setStripeResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [testEmailTo, setTestEmailTo] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (data && !form) setForm(toForm(data))
  }, [data, form])

  const baseline = useMemo(() => (data ? toForm(data) : null), [data])

  const changed = useMemo(() => {
    const keys = new Set<keyof Form | SecretKey>()
    if (form && baseline) {
      for (const key of Object.keys(form) as (keyof Form)[]) {
        if (!sameValue(key, form[key], baseline[key])) keys.add(key)
      }
    }
    for (const key of SECRET_KEYS) {
      if (secrets[key].trim()) keys.add(key)
    }
    return keys
  }, [form, baseline, secrets])

  const dirty = changed.size > 0
  const sectionEdited = (id: SectionId) => SECTION_FIELDS[id].some((key) => changed.has(key))
  const presetsError =
    form && changed.has('presets') && !parsePresets(form.presets)
      ? t('cms.settings.invalidPresets')
      : null
  const smtpPortError = (() => {
    if (!form || !changed.has('smtpPort')) return null
    const raw = form.smtpPort.trim()
    if (!raw) return null
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 65535) return t('cms.settings.invalidSmtpPort')
    return null
  })()

  const showToast = (variant: Toast['variant'], message: string) =>
    setToast({ open: true, variant, message })

  const commitSaved = (saved: CmsSiteSettings) => {
    queryClient.setQueryData(['cms-site-settings'], saved)
    void queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY })
  }

  const saveMutation = useMutation({
    mutationFn: (body: UpdateSiteSettings) => updateCmsSiteSettings(body),
    onSuccess: (saved) => {
      commitSaved(saved)
      setForm(toForm(saved))
      setSecrets(EMPTY_SECRETS)
      setStripeResult(null)
      setEmailResult(null)
      showToast('success', t('cms.settings.saved'))
    },
    onError: (error) => showToast('error', errorText(error)),
  })

  const removeMutation = useMutation({
    mutationFn: (key: SecretKey) => updateCmsSiteSettings({ [key]: '' }),
    onSuccess: (saved, key) => {
      commitSaved(saved)
      setSecrets((prev) => ({ ...prev, [key]: '' }))
      showToast('success', t('cms.settings.keyRemoved'))
    },
    onError: (error) => showToast('error', errorText(error)),
  })

  const stripeTest = useMutation({
    mutationFn: testCmsStripe,
    onSuccess: (r) => {
      const lines = [
        t('cms.settings.stripeOk', {
          name: r.accountName || r.email || r.accountId,
          mode: r.mode.toUpperCase(),
        }),
      ]
      if (!r.chargesEnabled) lines.push(t('cms.settings.chargesDisabled'))
      if (!r.webhookConfigured) lines.push(t('cms.settings.webhookMissing'))
      setStripeResult({ ok: r.chargesEnabled && r.webhookConfigured, text: lines.join(' ') })
    },
    onError: (error) => setStripeResult({ ok: false, text: errorText(error) }),
  })

  const emailTest = useMutation({
    mutationFn: () => testCmsEmail(testEmailTo.trim() || undefined),
    onSuccess: (r) =>
      setEmailResult({
        ok: true,
        text: t('cms.settings.testEmailSentDetail', {
          to: r.to,
          from: r.from,
          host: r.host,
          port: r.port,
        }),
      }),
    onError: (error) => setEmailResult({ ok: false, text: errorText(error) }),
  })

  const canSave = dirty && !presetsError && !smtpPortError && !saveMutation.isPending

  const handleSave = useCallback(() => {
    if (!form || !canSave) return
    const presets = parsePresets(form.presets)
    if (!presets) return
    const portRaw = form.smtpPort.trim()
    const smtpPort = portRaw ? Number(portRaw) : null
    if (portRaw && (!Number.isInteger(smtpPort) || smtpPort! < 1 || smtpPort! > 65535)) return
    const body: UpdateSiteSettings = {
      facebookUrl: form.facebookUrl,
      instagramUrl: form.instagramUrl,
      youtubeUrl: form.youtubeUrl,
      tiktokUrl: form.tiktokUrl,
      photographerCreditName: form.photographerCreditName,
      photographerCreditUrl: form.photographerCreditUrl,
      shopPublic: form.shopPublic,
      donationPresets: presets,
      smtpEnabled: form.smtpEnabled,
      smtpHost: form.smtpHost,
      smtpPort,
      smtpUser: form.smtpUser,
      smtpSecurity: form.smtpSecurity,
      mailFrom: form.mailFrom,
      mailFromName: form.mailFromName,
      adminNotifyEmail: form.adminNotifyEmail,
      notifyAdminOnSubmission: form.notifyAdminOnSubmission,
      notifySubmitterOnReceipt: form.notifySubmitterOnReceipt,
      notifySubmitterOnDecision: form.notifySubmitterOnDecision,
    }
    for (const key of SECRET_KEYS) {
      if (secrets[key].trim()) body[key] = secrets[key].trim()
    }
    saveMutation.mutate(body)
  }, [form, canSave, secrets, saveMutation])

  const handleDiscard = () => {
    if (data) setForm(toForm(data))
    setSecrets(EMPTY_SECRETS)
  }

  const saveRef = useRef(handleSave)
  saveRef.current = handleSave

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = t('cms.settings.leaveWarning')
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty, t])

  if (settingsQuery.isLoading || (!form && !settingsQuery.isError)) {
    return <p className="text-sm text-stone-500">{t('cms.common.loading')}</p>
  }
  if (settingsQuery.isError || !data || !form) {
    return (
      <p className="text-sm text-rose-700">
        {t('cms.settings.loadError')}: {errorText(settingsQuery.error)}
      </p>
    )
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const removeSecret = async (key: SecretKey) => {
    const ok = await confirm({
      title: t('cms.settings.removeConfirmTitle'),
      description: t('cms.settings.removeConfirmBody'),
      confirmLabel: t('cms.settings.remove'),
    })
    if (ok) removeMutation.mutate(key)
  }

  const secretHint = (key: SecretKey, status: SecretStatus = EMPTY_SECRET) => {
    if (secrets[key].trim()) {
      return { tone: 'text-amber-700', text: t('cms.settings.secretPending') }
    }
    if (status.unreadable && status.source !== 'settings') {
      return { tone: 'text-rose-700', text: t('cms.settings.secretUnreadable') }
    }
    if (status.source === 'settings') {
      return { tone: 'text-emerald-700', text: t('cms.settings.secretSaved', { hint: status.hint }) }
    }
    if (status.source === 'env') {
      return { tone: 'text-emerald-700', text: t('cms.settings.secretFromEnv', { hint: status.hint }) }
    }
    return { tone: 'text-stone-500', text: t('cms.settings.secretEmpty') }
  }

  const secretField = (
    key: SecretKey,
    label: string,
    status: SecretStatus | undefined,
  ) => {
    const safe = status ?? EMPTY_SECRET
    const hint = secretHint(key, safe)
    return (
      <CmsField label={label} htmlFor={key}>
        <CmsPasswordInput
          id={key}
          value={secrets[key]}
          onChange={(value) => setSecrets((prev) => ({ ...prev, [key]: value }))}
          visible={visible[key]}
          onToggleVisible={() => setVisible((prev) => ({ ...prev, [key]: !prev[key] }))}
          showLabel={t('cms.settings.show')}
          hideLabel={t('cms.settings.hide')}
          autoComplete="off"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={hint.tone}>{hint.text}</span>
          {(safe.source === 'settings' || safe.unreadable) && !secrets[key].trim() ? (
            <button
              type="button"
              onClick={() => void removeSecret(key)}
              disabled={removeMutation.isPending}
              className="font-semibold text-rose-700 hover:underline disabled:opacity-50"
            >
              {t('cms.settings.remove')}
            </button>
          ) : null}
        </div>
      </CmsField>
    )
  }

  const stripeConnected = Boolean(data.stripe?.secretKey?.configured)
  const emailConnected = Boolean(data.email?.configured)
  const donationsEdited = sectionEdited('donations')
  const emailEdited = sectionEdited('email')
  const editedLabel = t('cms.settings.edited')
  const email = data.email

  return (
    <div className="space-y-6 pb-28">
      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <CmsPageHeader
        title={t('cms.settings.title')}
        description={t('cms.settings.description')}
        actions={
          data.updatedAt ? (
            <span className="text-xs text-stone-500">
              {t('cms.settings.lastSaved', { date: new Date(data.updatedAt).toLocaleString() })}
            </span>
          ) : undefined
        }
      />

      <Section
        icon={Share2}
        title={t('cms.settings.socialTitle')}
        help={t('cms.settings.socialHelp')}
        edited={sectionEdited('social')}
        editedLabel={editedLabel}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ['facebookUrl', 'Facebook', 'https://facebook.com/prizni'],
              ['instagramUrl', 'Instagram', 'https://instagram.com/prizni'],
              ['youtubeUrl', 'YouTube', 'https://youtube.com/@prizni'],
              ['tiktokUrl', 'TikTok', 'https://tiktok.com/@prizni'],
            ] as const
          ).map(([key, label, placeholder]) => (
            <CmsField key={key} label={label} htmlFor={key}>
              <CmsInput
                id={key}
                type="url"
                inputMode="url"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </CmsField>
          ))}
        </div>
      </Section>

      <Section
        icon={Camera}
        title={t('cms.settings.creditTitle')}
        help={t('cms.settings.creditHelp')}
        edited={sectionEdited('credit')}
        editedLabel={editedLabel}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CmsField label={t('cms.settings.creditName')} htmlFor="creditName">
            <CmsInput
              id="creditName"
              value={form.photographerCreditName}
              onChange={(e) => set('photographerCreditName', e.target.value)}
            />
          </CmsField>
          <CmsField label={t('cms.settings.creditUrl')} htmlFor="creditUrl">
            <CmsInput
              id="creditUrl"
              type="url"
              placeholder="https://"
              value={form.photographerCreditUrl}
              onChange={(e) => set('photographerCreditUrl', e.target.value)}
            />
          </CmsField>
        </div>
      </Section>

      <Section
        icon={ShoppingBag}
        title={t('cms.settings.shopTitle')}
        edited={sectionEdited('shop')}
        editedLabel={editedLabel}
        status={
          <StatusBadge
            ok={data.shopPublic && data.shopFeatureAvailable}
            label={
              data.shopPublic && data.shopFeatureAvailable
                ? t('cms.settings.shopVisible')
                : t('cms.settings.shopHidden')
            }
          />
        }
      >
        <CmsCheckbox
          checked={form.shopPublic}
          onChange={() => set('shopPublic', !form.shopPublic)}
          disabled={!data.shopFeatureAvailable}
          label={t('cms.settings.shopToggle')}
          description={
            data.shopFeatureAvailable
              ? t('cms.settings.shopToggleHelp')
              : t('cms.settings.shopServerOff')
          }
        />
      </Section>

      <Section
        icon={CreditCard}
        title={t('cms.settings.donationsTitle')}
        help={t('cms.settings.donationsHelp')}
        edited={donationsEdited}
        editedLabel={editedLabel}
        status={
          <StatusBadge
            ok={stripeConnected}
            label={
              stripeConnected
                ? data.stripe?.mode === 'live'
                  ? t('cms.settings.statusLive')
                  : t('cms.settings.statusTest')
                : t('cms.settings.statusNotConnected')
            }
          />
        }
      >
        <CmsField label={t('cms.settings.presets')} htmlFor="presets">
          <CmsInput
            id="presets"
            value={form.presets}
            onChange={(e) => set('presets', e.target.value)}
            placeholder="5, 10, 15"
            aria-invalid={Boolean(presetsError)}
            className={cn(presetsError && 'border-rose-300 focus:border-rose-400')}
          />
          <p className={cn('text-xs', presetsError ? 'text-rose-700' : 'text-stone-500')}>
            {presetsError ?? t('cms.settings.presetsHelp')}
          </p>
        </CmsField>

        <Steps
          items={[
            t('cms.settings.stripeStep1'),
            t('cms.settings.stripeStep2'),
            t('cms.settings.stripeStep3'),
            t('cms.settings.stripeStep4'),
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
        {secretField(
          'stripeSecretKey',
          t('cms.settings.stripeSecret'),
          data.stripe?.secretKey,
        )}
        {secretField(
          'stripeWebhookSecret',
          t('cms.settings.stripeWebhook'),
          data.stripe?.webhookSecret,
        )}
        </div>

        <CmsField label={t('cms.settings.webhookUrl')}>
          <div className="flex gap-2">
            <CmsInput
              readOnly
              value={data.stripe?.webhookUrl ?? ''}
              className="font-mono text-xs"
            />
            <GhostButton
              onClick={() => {
                void navigator.clipboard.writeText(data.stripe?.webhookUrl ?? '')
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              }}
            >
              <Copy className="size-4" />
              {copied ? t('cms.settings.copied') : t('cms.settings.copy')}
            </GhostButton>
          </div>
        </CmsField>

        <div className="flex flex-wrap items-center gap-3">
          <GhostButton
            onClick={() => {
              setStripeResult(null)
              stripeTest.mutate()
            }}
            disabled={!stripeConnected || donationsEdited || stripeTest.isPending}
          >
            {stripeTest.isPending ? t('cms.settings.testing') : t('cms.settings.testStripe')}
          </GhostButton>
          {donationsEdited ? (
            <span className="text-xs text-amber-700">{t('cms.settings.saveBeforeTest')}</span>
          ) : stripeResult ? (
            <span className={cn('text-sm', stripeResult.ok ? 'text-emerald-700' : 'text-amber-800')}>
              {stripeResult.text}
            </span>
          ) : !stripeConnected ? (
            <span className="text-xs text-stone-500">{t('cms.settings.testAfterSave')}</span>
          ) : null}
        </div>
      </Section>

      <Section
        icon={Mail}
        title={t('cms.settings.emailTitle')}
        help={t('cms.settings.emailHelp')}
        edited={emailEdited}
        editedLabel={editedLabel}
        status={
          <StatusBadge
            ok={emailConnected}
            label={
              emailConnected
                ? t('cms.settings.statusConnected')
                : t('cms.settings.statusNotConnected')
            }
          />
        }
      >
        <Steps
          items={[
            t('cms.settings.emailStep1'),
            t('cms.settings.emailStep2'),
            t('cms.settings.emailStep3'),
          ]}
        />

        <CmsCheckbox
          checked={form.smtpEnabled}
          onChange={() => set('smtpEnabled', !form.smtpEnabled)}
          label={t('cms.settings.smtpEnabled')}
          description={t('cms.settings.smtpEnabledHelp')}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <CmsField label={t('cms.settings.smtpHost')} htmlFor="smtpHost">
            <CmsInput
              id="smtpHost"
              placeholder={email?.hostEffective ?? 'mail.example.com'}
              value={form.smtpHost}
              onChange={(e) => set('smtpHost', e.target.value)}
              autoComplete="off"
            />
          </CmsField>
          <CmsField label={t('cms.settings.smtpPort')} htmlFor="smtpPort">
            <CmsInput
              id="smtpPort"
              inputMode="numeric"
              placeholder={String(email?.portEffective ?? 587)}
              value={form.smtpPort}
              onChange={(e) => set('smtpPort', e.target.value)}
              autoComplete="off"
            />
            {smtpPortError ? (
              <p className="text-xs text-rose-700">{smtpPortError}</p>
            ) : (
              <p className="text-xs text-stone-500">{t('cms.settings.smtpPortHelp')}</p>
            )}
          </CmsField>
          <CmsField label={t('cms.settings.smtpUser')} htmlFor="smtpUser">
            <CmsInput
              id="smtpUser"
              placeholder={email?.userEffective ?? ''}
              value={form.smtpUser}
              onChange={(e) => set('smtpUser', e.target.value)}
              autoComplete="off"
            />
          </CmsField>
          <CmsField label={t('cms.settings.smtpSecurity')} htmlFor="smtpSecurity">
            <CmsSelect
              id="smtpSecurity"
              value={form.smtpSecurity}
              onChange={(e) => set('smtpSecurity', e.target.value as SmtpSecurity)}
            >
              <option value="starttls">{t('cms.settings.smtpSecurityStarttls')}</option>
              <option value="ssl">{t('cms.settings.smtpSecuritySsl')}</option>
              <option value="none">{t('cms.settings.smtpSecurityNone')}</option>
            </CmsSelect>
            <p className="text-xs text-stone-500">{t('cms.settings.smtpSecurityHelp')}</p>
          </CmsField>
        </div>

        {secretField('smtpPassword', t('cms.settings.smtpPassword'), email?.password)}

        <div className="grid gap-4 md:grid-cols-2">
          <CmsField label={t('cms.settings.mailFromName')} htmlFor="mailFromName">
            <CmsInput
              id="mailFromName"
              placeholder="Prizni"
              value={form.mailFromName}
              onChange={(e) => set('mailFromName', e.target.value)}
            />
          </CmsField>
          <CmsField label={t('cms.settings.mailFrom')} htmlFor="mailFrom">
            <CmsInput
              id="mailFrom"
              type="email"
              placeholder="hello@prizni.bg"
              value={form.mailFrom}
              onChange={(e) => set('mailFrom', e.target.value)}
            />
            <p className="text-xs text-stone-500">{t('cms.settings.mailFromHelp')}</p>
          </CmsField>
          <CmsField label={t('cms.settings.adminInbox')} htmlFor="adminInbox" className="md:col-span-2">
            <CmsInput
              id="adminInbox"
              type="email"
              placeholder={email?.adminNotifyEmailEffective ?? 'editor@prizni.bg'}
              value={form.adminNotifyEmail}
              onChange={(e) => set('adminNotifyEmail', e.target.value)}
            />
            <p className="text-xs text-stone-500">{t('cms.settings.adminInboxHelp')}</p>
          </CmsField>
        </div>

        <div className="grid gap-2">
          <CmsCheckbox
            checked={form.notifyAdminOnSubmission}
            onChange={() => set('notifyAdminOnSubmission', !form.notifyAdminOnSubmission)}
            label={t('cms.settings.notifyAdmin')}
            description={t('cms.settings.notifyAdminHelp')}
          />
          <CmsCheckbox
            checked={form.notifySubmitterOnReceipt}
            onChange={() => set('notifySubmitterOnReceipt', !form.notifySubmitterOnReceipt)}
            label={t('cms.settings.notifyReceipt')}
            description={t('cms.settings.notifyReceiptHelp')}
          />
          <CmsCheckbox
            checked={form.notifySubmitterOnDecision}
            onChange={() => set('notifySubmitterOnDecision', !form.notifySubmitterOnDecision)}
            label={t('cms.settings.notifyDecision')}
            description={t('cms.settings.notifyDecisionHelp')}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <CmsField label={t('cms.settings.testEmailTo')} htmlFor="testEmailTo" className="min-w-64 flex-1">
            <CmsInput
              id="testEmailTo"
              type="email"
              placeholder={t('cms.settings.testEmailToPlaceholder')}
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
            />
          </CmsField>
          <GhostButton
            onClick={() => {
              setEmailResult(null)
              emailTest.mutate()
            }}
            disabled={!emailConnected || emailEdited || emailTest.isPending}
          >
            {emailTest.isPending ? t('cms.settings.testing') : t('cms.settings.testEmail')}
          </GhostButton>
        </div>
        {emailEdited ? (
          <p className="text-xs text-amber-700">{t('cms.settings.saveBeforeTest')}</p>
        ) : emailResult ? (
          <p className={cn('text-sm', emailResult.ok ? 'text-emerald-700' : 'text-rose-700')}>
            {emailResult.text}
          </p>
        ) : null}
      </Section>

      <AnimatePresence>
        {dirty || saveMutation.isPending ? (
          <motion.div
            key="save-bar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="sticky bottom-4 z-30"
            role="region"
            aria-label={t('cms.settings.save')}
          >
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900 px-5 py-3 text-white shadow-xl">
              <span className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-amber-400" />
                {changed.size === 1
                  ? t('cms.settings.unsavedOne')
                  : t('cms.settings.unsavedMany', { count: changed.size })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={saveMutation.isPending}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {t('cms.settings.discard')}
                </button>
                <PrimaryButton
                  onClick={handleSave}
                  disabled={!canSave}
                  className="bg-white text-stone-900 hover:bg-stone-100"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('cms.settings.saving')}
                    </>
                  ) : (
                    t('cms.settings.save')
                  )}
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {dialog}
    </div>
  )
}
