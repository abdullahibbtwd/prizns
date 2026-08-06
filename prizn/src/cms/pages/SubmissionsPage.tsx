import { useState } from 'react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { cmsSubmissions } from '@/cms/data/mock'
import { cn } from '@/lib/utils'
import { Mail, MapPin, Calendar, FileText, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

export default function CmsSubmissionsPage() {
  const [selectedId, setSelectedId] = useState(cmsSubmissions[0]?.id)
  const [items, setItems] = useState(cmsSubmissions)
  const selected = items.find((s) => s.id === selectedId) ?? items[0]
  const [toast, setToast] = useState('')

  const updateStatus = (status: (typeof items)[0]['status'], message: string) => {
    if (!selected) return
    setItems((prev) =>
      prev.map((item) => (item.id === selected.id ? { ...item, status } : item)),
    )
    setToast(message)
    setTimeout(() => setToast(''), 4000)
  }

  return (
    <div>
      <CmsPageHeader
        title="Write for Us Queue"
        description="Review community submissions and convert accepted entries directly into draft stories."
        badge={`${items.length} Submissions`}
      />

      {toast && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast('')} className="text-emerald-700 hover:text-emerald-950 font-bold">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Submissions Inbox Panel */}
        <CmsCard className="overflow-hidden">
          <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5 flex items-center justify-between">
            <span className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-stone-600">
              Community Inbox
            </span>
            <span className="rounded-full bg-[#0C2686]/10 px-2.5 py-0.5 text-xs font-bold text-[#0C2686]">
              {items.length} Total
            </span>
          </div>

          <div className="divide-y divide-[#E8E4DC]">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'flex w-full cursor-pointer gap-3.5 px-5 py-4 text-left transition-all hover:bg-stone-50',
                  selected?.id === item.id && 'bg-amber-50/40 border-l-4 border-[#0C2686]',
                )}
              >
                <img src={item.image} alt="" className="size-12 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-bold text-stone-900">{item.title}</p>
                  </div>
                  <p className="truncate text-xs font-medium text-stone-600 mt-0.5">
                    {item.name} · {item.village}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusPill status={item.status} />
                    <span className="text-[10px] font-semibold text-stone-400">{item.submittedAt}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CmsCard>

        {/* Selected Submission Detail View */}
        {selected && (
          <CmsCard className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E8E4DC] pb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <StatusPill status={selected.status} />
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 uppercase tracking-wider border border-stone-200">
                    {selected.category}
                  </span>
                </div>
                <h2 className="mt-3 font-heading text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                  {selected.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-[#0C2686]" /> {selected.name} ({selected.village})
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="size-3.5 text-[#0C2686]" /> {selected.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 border border-stone-200">
                <Calendar className="size-3.5 text-[#0C2686]" />
                Submitted {selected.submittedAt}
              </div>
            </div>

            <div className="relative mt-6 overflow-hidden rounded-2xl border border-[#E8E4DC] shadow-sm">
              <img
                src={selected.image}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                Featured Cover Media Attachment
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-medium">
              <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
                <p className="font-heading uppercase tracking-wider text-stone-500 font-bold">Category & Topic</p>
                <p className="mt-1 text-sm font-bold text-stone-900">{selected.category}</p>
              </div>
              <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
                <p className="font-heading uppercase tracking-wider text-stone-500 font-bold">Submitted Files</p>
                <p className="mt-1 text-sm font-bold text-stone-900">2 High-Res Photos · 1 Doc</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-5 text-sm leading-relaxed text-stone-700">
              <p className="font-heading text-base font-bold text-stone-900">Contribution Summary Excerpt:</p>
              <p>
                "Every morning, the old clay oven in Varbovo gives off the scent of woodsmoke and wild thyme.
                My grandmother learned this recipe during the post-war harvest years, passing down the hand-braided sourdough technique..."
              </p>
            </div>

            {/* Action Bar */}
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#E8E4DC] pt-6">
              <PrimaryButton
                onClick={() =>
                  updateStatus('approved', 'Converted to draft story! Opened in Stories editor queue.')
                }
              >
                <FileText className="size-4" /> Convert to Draft Story
              </PrimaryButton>
              <GhostButton onClick={() => updateStatus('approved', 'Submission approved.')}>
                <CheckCircle2 className="size-4 text-emerald-600" /> Approve
              </GhostButton>
              <GhostButton onClick={() => updateStatus('changes', 'Requested author revision.')}>
                <AlertCircle className="size-4 text-amber-600" /> Request Changes
              </GhostButton>
              <GhostButton
                className="text-rose-700 hover:bg-rose-50 hover:border-rose-200"
                onClick={() => updateStatus('rejected', 'Submission archived.')}
              >
                <XCircle className="size-4 text-rose-600" /> Reject
              </GhostButton>
            </div>
          </CmsCard>
        )}
      </div>
    </div>
  )
}

