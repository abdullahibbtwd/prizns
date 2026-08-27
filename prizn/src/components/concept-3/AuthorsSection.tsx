import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { SectionLoading } from '@/components/concept-3/SectionLoading'
import { preferApi, usePublicAuthors } from '@/lib/public-content'

interface AuthorsSectionProps {
  lang: 'bg' | 'en'
}

export function AuthorsSection({ lang }: AuthorsSectionProps) {
  const { data, isLoading } = usePublicAuthors()
  const authors = preferApi(
    data?.map((author) => ({
      ...author,
      path: `/authors/${author.slug}`,
    })),
  )
  const featured = authors.slice(0, 8)

  if (!isLoading && featured.length === 0) return null

  return (
    <section id="authors" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Екипът' : 'The desk'}
            </span>
            <h2 className="font-heading text-4xl font-light tracking-tight text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Екипът на Призни' : 'The Prizni Team'}
            </h2>
          </div>
          <ViewAllLink to="/authors" lang={lang} />
        </div>

        {isLoading ? (
          <SectionLoading
            lang={lang}
            count={4}
            cardClassName="aspect-square max-w-28 mx-auto"
            gridClassName="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-10"
          />
        ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-10">
          {featured.map((author, index) => {
            const name = lang === 'bg' ? author.nameBg || author.name : author.name
            const role = lang === 'bg' ? author.roleBg || author.role : author.role

            return (
              <motion.div
                key={author.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Link
                  to={author.path}
                  className="group flex cursor-pointer flex-col items-center text-center"
                >
                  <div className="mb-4 size-24 overflow-hidden rounded-[4px] bg-[#EAE6DF] md:size-28">
                    <img
                      src={author.image}
                      alt={name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  </div>

                  <h3 className="line-clamp-1 font-heading text-lg font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-xl">
                    {name}
                  </h3>
                  <p className="mt-1 line-clamp-1 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                    {role}
                    {author.storyCount != null ? (
                      <>
                        <span className="mx-1.5 text-[#EAE6DF]">·</span>
                        {author.storyCount} {lang === 'bg' ? 'истории' : 'stories'}
                      </>
                    ) : null}
                  </p>
                </Link>
              </motion.div>
            )
          })}
        </div>
        )}
      </div>
    </section>
  )
}
