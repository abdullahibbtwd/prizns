import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, X, MapPin, Camera } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { preferApi, usePublicMedia } from '@/lib/public-content'
import { getSectionPublicLabel } from '@/lib/section-i18n'

interface PhotoItem {
  id: string
  title: string
  caption: string
  image: string
  location: string
  aspect: string
  span: string
}

interface PhotographyGalleryProps {
  lang: 'bg' | 'en'
}

function aspectForIndex(index: number): { aspect: string; span: string } {
  const patterns = [
    { aspect: 'aspect-[4/5]', span: '' },
    { aspect: 'aspect-square', span: '' },
    { aspect: 'aspect-[3/4]', span: '' },
    { aspect: 'aspect-[4/3]', span: 'md:col-span-2' },
    { aspect: 'aspect-[4/5]', span: '' },
    { aspect: 'aspect-square', span: '' },
  ]
  return patterns[index % patterns.length]
}

export function PhotographyGallery({ lang }: PhotographyGalleryProps) {
  const { data } = usePublicMedia('IMAGE')
  const photos = preferApi(
    data?.map((item, index) => {
      const layout = aspectForIndex(index)
      const title =
        item.titleBg ||
        item.titleEn ||
        item.originalName?.replace(/\.[^.]+$/, '') ||
        (lang === 'bg' ? 'Кадър' : 'Frame')
      return {
        id: item.id,
        title,
        caption: item.creditBg || item.creditEn || '',
        image: item.url,
        location:
          item.locationBg ||
          item.locationEn ||
          (lang === 'bg' ? 'Северозападна България' : 'Northwestern Bulgaria'),
        ...layout,
      } satisfies PhotoItem
    }),
    (journalContent.gallery as readonly {
      id: string
      title: string
      caption: string
      image: string
      span: string
      aspect: string
    }[]).map((item) => ({
      id: item.id,
      title: item.title,
      caption: item.caption,
      image: item.image,
      location:
        lang === 'bg' ? 'Северозападна България' : 'Northwestern Bulgaria',
      span: item.span,
      aspect: item.aspect,
    })),
  ).slice(0, 6)

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)

  return (
    <section
      id="gallery"
      className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Фотографски Журнал' : 'Visual Essay'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {getSectionPublicLabel('gallery', lang)}
            </h2>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="max-w-sm font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 md:text-right">
              {lang === 'bg'
                ? 'Северозападът в кадри — от медия библиотеката.'
                : 'The northwest in frames — from the media library.'}
            </p>
            <ViewAllLink to="/gallery" lang={lang} />
          </div>
        </div>

        {photos.length === 0 ? (
          <p className="text-center font-sans text-sm text-[#1A1A1A]/50">
            {lang === 'bg'
              ? 'Качете изображения от CMS → Медия библиотека.'
              : 'Upload images from CMS → Media Library.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {photos.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                onClick={() => setSelectedPhoto(item)}
                className={`group relative cursor-pointer overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-[#1A1A1A] ${item.aspect} ${item.span}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105 filter grayscale-[15%] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-6 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
                      <Maximize2 className="size-5 stroke-[1.5]" />
                    </div>
                    <p className="font-heading text-xl font-light text-white">
                      {item.title}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 p-6 backdrop-blur-xl md:p-12"
          >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between text-white/80">
              <div className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest">
                <Camera className="size-4 text-[#4051C7]" />
                <span>Prizni Editorial Archive</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="rounded-full border border-white/20 p-2.5 text-white transition-colors hover:bg-white/10"
              >
                <X className="size-6 stroke-[1.5]" />
              </button>
            </div>

            <div className="relative mx-auto my-auto flex max-h-[70vh] max-w-5xl items-center justify-center">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.title}
                className="max-h-[68vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>

            <div className="mx-auto max-w-2xl pb-4 text-center text-white">
              <h3 className="mb-2 font-heading text-2xl font-light md:text-3xl">
                {selectedPhoto.title}
              </h3>
              {selectedPhoto.caption ? (
                <p className="mb-2 font-sans text-xs font-light text-white/70 md:text-sm">
                  {selectedPhoto.caption}
                </p>
              ) : null}
              <div className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-widest text-white/50">
                <MapPin className="size-3 text-[#4051C7]" />
                <span>{selectedPhoto.location}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
