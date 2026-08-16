import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
} from '@/cms/components/CmsUI'
import { CmsField, CmsInput, CmsTextarea } from '@/cms/components/CmsFields'
import { CmsPasswordInput } from '@/cms/components/CmsPasswordInput'
import { Alert } from '@/components/ui/Alert'
import { uploadCmsMedia } from '@/lib/articles-api'
import { useAuth } from '@/lib/auth'
import {
  getCmsProfile,
  logoutOtherCmsSessions,
  updateCmsProfile,
} from '@/lib/users-api'

export default function CmsProfilePage() {
  const { t } = useTranslation()
  const { reload } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [xUsername, setXUsername] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const profileQuery = useQuery({
    queryKey: ['cms-profile'],
    queryFn: getCmsProfile,
  })
  const profile = profileQuery.data

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setEmail(profile.email)
    setBio(profile.bio ?? '')
    setWebsiteUrl(profile.websiteUrl ?? '')
    setFacebookUrl(profile.facebookUrl ?? '')
    setInstagramUrl(profile.instagramUrl ?? '')
    setYoutubeUrl(profile.youtubeUrl ?? '')
    setLinkedinUrl(profile.linkedinUrl ?? '')
    setXUsername(profile.xUsername ?? '')
    setImageUrl(profile.imageUrl ?? '')
  }, [profile])

  const passwordsMatch = !password || password === confirmPassword
  const canSave =
    name.trim().length > 0 &&
    email.trim().includes('@') &&
    passwordsMatch &&
    (password.length === 0 || password.length >= 8)

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCmsProfile({
        name: name.trim(),
        email: email.trim(),
        bio,
        websiteUrl,
        facebookUrl,
        instagramUrl,
        youtubeUrl,
        linkedinUrl,
        xUsername,
        imageUrl,
        ...(password ? { password } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-profile'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-desk'] })
      await reload()
      setPassword('')
      setConfirmPassword('')
      setToast({ open: true, variant: 'success', message: t('cms.profile.saved') })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.profile.saveFailed'),
      })
    },
  })

  const logoutOthersMutation = useMutation({
    mutationFn: logoutOtherCmsSessions,
    onSuccess: (result) => {
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.profile.sessionsRevoked', { count: result.revoked }),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.profile.sessionsFailed'),
      })
    },
  })

  const uploadPortrait = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const media = await uploadCmsMedia(file, { folder: 'cms' })
      setImageUrl(media.url)
    } catch (err) {
      setToast({
        open: true,
        variant: 'error',
        message: err instanceof Error ? err.message : t('cms.profile.uploadFailed'),
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <CmsPageHeader
        title={t('cms.profile.title')}
        description={t('cms.profile.description')}
        actions={
          <PrimaryButton
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t('cms.common.saving') : t('cms.common.save')}
          </PrimaryButton>
        }
      />

      {profileQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.profile.loading')}
        </CmsCard>
      )}
      {profileQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          {t('cms.profile.loadFailed')}
        </CmsCard>
      )}

      {profile && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            <CmsCard className="space-y-4 p-5">
              <h2 className="font-heading text-lg text-stone-900">
                {t('cms.profile.about')}
              </h2>
              <CmsField label={t('cms.profile.name')} htmlFor="profile-name">
                <CmsInput
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </CmsField>
              <CmsField label={t('cms.profile.email')} htmlFor="profile-email">
                <CmsInput
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </CmsField>
              <CmsField label={t('cms.profile.bio')} htmlFor="profile-bio">
                <CmsTextarea
                  id="profile-bio"
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
                <p className="text-xs text-stone-500">{t('cms.profile.bioHint')}</p>
              </CmsField>
            </CmsCard>

            <CmsCard className="space-y-4 p-5">
              <h2 className="font-heading text-lg text-stone-900">
                {t('cms.profile.contact')}
              </h2>
              <CmsField label={t('cms.profile.website')} htmlFor="profile-website">
                <CmsInput
                  id="profile-website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://"
                />
              </CmsField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CmsField label="Facebook" htmlFor="profile-facebook">
                  <CmsInput
                    id="profile-facebook"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                  />
                </CmsField>
                <CmsField label="Instagram" htmlFor="profile-instagram">
                  <CmsInput
                    id="profile-instagram"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                  />
                </CmsField>
                <CmsField label="YouTube" htmlFor="profile-youtube">
                  <CmsInput
                    id="profile-youtube"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                </CmsField>
                <CmsField label="LinkedIn" htmlFor="profile-linkedin">
                  <CmsInput
                    id="profile-linkedin"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </CmsField>
              </div>
              <CmsField label={t('cms.profile.xUsername')} htmlFor="profile-x">
                <CmsInput
                  id="profile-x"
                  value={xUsername}
                  onChange={(e) => setXUsername(e.target.value)}
                  placeholder="prizni"
                />
              </CmsField>
            </CmsCard>

            <CmsCard className="space-y-4 p-5">
              <h2 className="font-heading text-lg text-stone-900">
                {t('cms.profile.account')}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CmsField label={t('cms.profile.newPassword')} htmlFor="profile-password">
                  <CmsPasswordInput
                    id="profile-password"
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggleVisible={() => setShowPassword((prev) => !prev)}
                    showLabel={t('cms.users.showPassword')}
                    hideLabel={t('cms.users.hidePassword')}
                    minLength={8}
                  />
                  <p className="text-xs text-stone-500">{t('cms.profile.passwordHint')}</p>
                </CmsField>
                <CmsField
                  label={t('cms.users.confirmPassword')}
                  htmlFor="profile-confirm-password"
                >
                  <CmsPasswordInput
                    id="profile-confirm-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
                    showLabel={t('cms.users.showPassword')}
                    hideLabel={t('cms.users.hidePassword')}
                    minLength={8}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-rose-700">
                      {t('cms.users.passwordMismatch')}
                    </p>
                  )}
                </CmsField>
              </div>
              <div className="rounded-xl border border-[#E8E4DC] bg-stone-50 p-4">
                <p className="text-sm font-semibold text-stone-800">
                  {t('cms.profile.sessions')}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.profile.sessionsHint')}
                </p>
                <GhostButton
                  className="mt-3"
                  disabled={logoutOthersMutation.isPending}
                  onClick={() => logoutOthersMutation.mutate()}
                >
                  {t('cms.profile.logoutOthers')}
                </GhostButton>
              </div>
            </CmsCard>
          </div>

          <div className="space-y-6">
            <CmsCard className="space-y-4 p-5">
              <h2 className="text-sm font-semibold">{t('cms.profile.photo')}</h2>
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-300">
                    <UserRound className="size-16" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#E8E4DC] bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-white">
                  {uploading ? t('cms.profile.uploading') : t('cms.profile.upload')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void uploadPortrait(e.target.files)}
                  />
                </label>
                {imageUrl && (
                  <GhostButton
                    className="px-3 py-2 text-xs"
                    onClick={() => setImageUrl('')}
                  >
                    {t('cms.profile.removePhoto')}
                  </GhostButton>
                )}
              </div>
            </CmsCard>

            {profile.authorId && (
              <CmsCard className="p-5">
                <p className="text-sm font-semibold text-stone-800">
                  {t('cms.profile.authorPage')}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.profile.authorPageHint')}
                </p>
                <Link
                  to={`/cms/authors/${profile.authorId}`}
                  className="mt-3 inline-flex text-sm font-semibold text-[#0C2686] hover:underline"
                >
                  {t('cms.users.openAuthor')}
                </Link>
              </CmsCard>
            )}
          </div>
        </div>
      )}

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
