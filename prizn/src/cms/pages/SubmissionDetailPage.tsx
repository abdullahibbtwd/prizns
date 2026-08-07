import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import {
  convertCmsSubmission,
  deleteCmsSubmission,
  getCmsSubmission,
  updateCmsSubmission,
  type SubmissionStatus,
} from '@/lib/submissions-api'
import { cn } from '@/lib/utils'
import {
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  Link2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'

export default function CmsSubmissionDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [toast, setToast] = useState('')

  const detailQuery = useQuery({
    queryKey: ['cms-submission', id],
    queryFn: () => getCmsSubmission(id),
    enabled: Boolean(id),
  })

  const selected = detailQuery.data

  useEffect(() => {
    setPhotoIndex(0)
  }, [selected?.id])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4000)
  }

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cms-submission', id] }),
      queryClient.invalidateQueries({ queryKey: ['cms-submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['cms-submissions-pending-count'] }),
    ])
  }

  const statusMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
    }: {
      submissionId: string
      status: SubmissionStatus
    }) => updateCmsSubmission(submissionId, { status }),
    onSuccess: async () => {
      await invalidate()
    },
  })

  const convertMutation = useMutation({
    mutationFn: (submissionId: string) => convertCmsSubmission(submissionId),
    onSuccess: async (result) => {
      await invalidate()
      showToast('Converted to draft story.')
      navigate(`/cms/stories/${result.articleId}`)
    },
    onError: (err: Error) => showToast(err.message || 'Convert failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (submissionId: string) => deleteCmsSubmission(submissionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-submissions'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-submissions-pending-count'] })
      showToast('Submission deleted.')
      navigate('/cms/submissions')
    },
    onError: (err: Error) => showToast(err.message || 'Delete failed'),
  })

  const updateStatus = (status: SubmissionStatus, message: string) => {
    if (!selected) return
    statusMutation.mutate(
      { submissionId: selected.id, status },
      {
        onSuccess: () => showToast(message),
        onError: (err: Error) => showToast(err.message || 'Update failed'),
      },
    )
  }

  const photos = selected?.photoUrls ?? []
  const activePhoto = photos[photoIndex] ?? photos[0]
  const hasMultiplePhotos = photos.length > 1

  const goPrevPhoto = () => {
    setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1))
  }

  const goNextPhoto = () => {
    setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1))
  }

  const fileSummary = () => {
    if (!selected) return ''
    const photoCount = selected.photoUrls.length
    const docCount = selected.documentUrls.length
    if (!photoCount && !docCount) return 'No files attached'
    const parts: string[] = []
    if (photoCount) parts.push(`${photoCount} Photo${photoCount === 1 ? '' : 's'}`)
    if (docCount) parts.push(`${docCount} Doc${docCount === 1 ? '' : 's'}`)
    return parts.join(' · ')
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/cms/submissions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 transition-colors hover:text-[#0C2686]"
        >
          <ArrowLeft className="size-4" />
          Back to submissions
        </Link>
      </div>

      <CmsPageHeader
        title={selected?.title ?? 'Submission'}
        description="Review this community entry and update its editorial status."
        badge={selected ? selected.status : undefined}
      />

      {toast && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast('')}
            className="font-bold text-emerald-700 hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {detailQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">Loading submission…</CmsCard>
      )}

      {detailQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          Failed to load submission. {(detailQuery.error as Error).message}
        </CmsCard>
      )}

      {selected && (
        <CmsCard hover={false} className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E8E4DC] pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <StatusPill status={selected.status} />
                <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-stone-700">
                  {selected.category}
                </span>
              </div>
              <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                {selected.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-600">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-[#0C2686]" /> {selected.name} ({selected.village})
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5 text-[#0C2686]" /> {selected.email}
                </span>
                {selected.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3.5 text-[#0C2686]" /> {selected.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">
              <Calendar className="size-3.5 text-[#0C2686]" />
              Submitted {selected.submittedAt}
            </div>
          </div>

          {activePhoto && (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100 shadow-sm">
              <img
                src={activePhoto.url}
                alt={activePhoto.name}
                className="aspect-[16/9] w-full object-cover"
              />

              {hasMultiplePhotos && (
                <>
                  <button
                    type="button"
                    onClick={goPrevPhoto}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextPhoto}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-sm">
                    {photos.map((photo, index) => (
                      <button
                        key={photo.url}
                        type="button"
                        aria-label={`Show photo ${index + 1}`}
                        onClick={() => setPhotoIndex(index)}
                        className={cn(
                          'size-2 rounded-full transition',
                          index === photoIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70',
                        )}
                      />
                    ))}
                    <span className="ml-1 text-[10px] font-semibold text-white/90">
                      {photoIndex + 1}/{photos.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-medium">
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
              <p className="font-heading font-bold uppercase tracking-wider text-stone-500">
                Category & Topic
              </p>
              <p className="mt-1 text-sm font-bold text-stone-900">{selected.category}</p>
            </div>
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
              <p className="font-heading font-bold uppercase tracking-wider text-stone-500">
                Submitted Files
              </p>
              <p className="mt-1 text-sm font-bold text-stone-900">{fileSummary()}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-5 text-sm leading-relaxed text-stone-700">
            <p className="font-heading text-base font-bold text-stone-900">Short description</p>
            <p className="whitespace-pre-wrap">{selected.description}</p>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-700">
            <p className="font-heading text-base font-bold text-stone-900">Story</p>
            <p className="whitespace-pre-wrap">{selected.story}</p>
          </div>

          {selected.links && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-4 text-sm">
              <Link2 className="mt-0.5 size-4 shrink-0 text-[#0C2686]" />
              <a
                href={selected.links.startsWith('http') ? selected.links : `https://${selected.links}`}
                target="_blank"
                rel="noreferrer"
                className="break-all font-medium text-[#0C2686] underline"
              >
                {selected.links}
              </a>
            </div>
          )}

          {(selected.photoUrls.length > 0 || selected.documentUrls.length > 0) && (
            <div className="mt-4 space-y-2">
              <p className="font-heading text-sm font-bold text-stone-900">Attachments</p>
              <ul className="space-y-1.5 text-sm">
                {[...selected.photoUrls, ...selected.documentUrls].map((file) => (
                  <li key={file.url}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#0C2686] underline"
                    >
                      <ExternalLink className="size-3.5" />
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#E8E4DC] pt-6">
            <PrimaryButton
              disabled={convertMutation.isPending}
              onClick={() => {
                if (selected.articleId) {
                  navigate(`/cms/stories/${selected.articleId}`)
                  return
                }
                convertMutation.mutate(selected.id)
              }}
            >
              <FileText className="size-4" />
              {selected.articleId ? 'Open Draft Story' : 'Convert to Draft Story'}
            </PrimaryButton>
            <GhostButton onClick={() => updateStatus('approved', 'Submission approved.')}>
              <CheckCircle2 className="size-4 text-emerald-600" /> Approve
            </GhostButton>
            <GhostButton onClick={() => updateStatus('review', 'Marked for review.')}>
              <AlertCircle className="size-4 text-sky-600" /> Mark Review
            </GhostButton>
            <GhostButton onClick={() => updateStatus('changes', 'Requested author revision.')}>
              <AlertCircle className="size-4 text-amber-600" /> Request Changes
            </GhostButton>
            <GhostButton
              className="text-rose-700 hover:border-rose-200 hover:bg-rose-50"
              onClick={() => updateStatus('rejected', 'Submission rejected.')}
            >
              <XCircle className="size-4 text-rose-600" /> Reject
            </GhostButton>
            <GhostButton
              className="text-rose-700 hover:border-rose-200 hover:bg-rose-50"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Delete this submission permanently?')) {
                  deleteMutation.mutate(selected.id)
                }
              }}
            >
              <Trash2 className="size-4 text-rose-600" /> Delete
            </GhostButton>
          </div>
        </CmsCard>
      )}
    </div>
  )
}
