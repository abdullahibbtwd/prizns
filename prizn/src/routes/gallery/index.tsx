import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, X, MapPin, Camera } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { preferApi, usePublicMedia } from '@/lib/public-content'
import { getSectionPublicLabel } from '@/lib/section-i18n'

type PhotoItem = {
  id: string
  title: string
  caption: string
  image: string
  location: string
}

export default function GalleryPage() {
  const { data } = usePublicMedia('IMAGE')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)

  return (
    <JournalShell>
      {({ lang }) => {
        const photos = preferApi(
          data?.map((item) => ({
            id: item.id,
            title:
              item.titleBg ||
              item.titleEn ||
              item.originalName?.replace(/\.[^.]+$/, '') ||
              (lang === 'bg' ? 'Кадър' : 'Frame'),
            caption: item.creditBg || item.creditEn || '',
            image: item.url,
            location:
              item.locationBg ||
              item.locationEn ||
              (lang === 'bg'
                ? 'Северозападна България'
                : 'Northwestern Bulgaria'),
          })),
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Фотографски Журнал' : 'Visual Essay'}
              title={getSectionPublicLabel('gallery', lang)}
              description={
                lang === 'bg'
                  ? 'Северозападът в кадри.'
                  : 'The northwest in frames.'
              }
              countLabel={
                lang === 'bg'
                  ? `${photos.length} кадъра`
                  : `${photos.length} frames`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              {photos.length === 0 ? (
                <p className="text-center font-sans text-sm text-[#1A1A1A]/55">
                  {lang === 'bg'
                    ? 'Качете изображения от CMS → Медия библиотека.'
                    : 'Upload images from CMS → Media Library.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {photos.map((item, index) => (
                    <motion.button
                      type="button"
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: index * 0.04 }}
                      onClick={() => setSelectedPhoto(item)}
                      className="group relative aspect-[4/5] overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-[#1A1A1A] text-left"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-5">
                        <div>
                          <p className="font-heading text-xl font-light text-white">
                            {item.title}
                          </p>
                          {item.caption ? (
                            <p className="mt-1 line-clamp-2 font-sans text-xs text-white/70">
                              {item.caption}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                        <Maximize2 className="size-4" />
                      </div>
                    </motion.button>
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
          </main>
        )
      }}
    </JournalShell>
  )
}
