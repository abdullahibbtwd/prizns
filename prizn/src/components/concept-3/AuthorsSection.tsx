import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  getArticlesByAuthor,
  journalAuthors,
} from '@/data/concept-3/authors'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { preferApi, usePublicAuthors } from '@/lib/public-content'

interface AuthorsSectionProps {
  lang: 'bg' | 'en'
}

export function AuthorsSection({ lang }: AuthorsSectionProps) {
  const { data } = usePublicAuthors()
  const authors = preferApi(
    data?.map((author) => ({
      ...author,
      path: `/authors/${author.slug}`,
    })),
    journalAuthors.map((author) => ({
      id: author.slug,
      slug: author.slug,
      path: `/authors/${author.slug}`,
      name: author.name,
      nameBg: author.nameBg,
      role: author.role,
      roleBg: author.roleBg,
      location: author.location,
      locationBg: author.locationBg,
      quote: author.quote,
      quoteBg: author.quoteBg,
      bio: author.bio,
      bioBg: author.bioBg,
      image: author.image,
      aliases: author.aliases ?? [],
      storyCount: getArticlesByAuthor(author).length,
    })),
  ).slice(0, 4)

  return (
    <section id="authors" className="bg-[#FDFBF7] py-20 md:py-28 px-6 md:px-12 border-t border-[#EAE6DF]">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-16">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#0C2686]/80">
            {lang === 'bg' ? 'Автори' : 'Authors'}
          </p>
          <h2 className="mt-3 font-heading text-4xl font-light tracking-tight text-[#1A1A1A] md:text-5xl">
            {lang === 'bg' ? 'Гласовете на Призни' : 'The voices of Prizni'}
          </h2>
          <p className="mx-auto mt-4 max-w-md font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/55">
            {lang === 'bg'
              ? 'Редактори и фотографи, които събират истории из Северозапада.'
              : 'Editors and photographers gathering stories across the Northwest.'}
          </p>
          <div className="mt-5 flex justify-center">
            <ViewAllLink to="/authors" lang={lang} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {authors.map((author, index) => {
            return (
              <motion.div
                key={author.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.06 }}
              >
                <Link to={author.path} className="group block cursor-pointer">
                  <div className="relative mb-5 aspect-[3/4] overflow-hidden rounded-[4px] bg-[#EAE6DF]">
                    <img
                      src={author.image}
                      alt={lang === 'bg' ? author.nameBg : author.name}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="border-t border-[#EAE6DF] pt-4">
                    <h3 className="font-heading text-xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-2xl">
                      {lang === 'bg' ? author.nameBg : author.name}
                    </h3>
                    <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                      {lang === 'bg' ? author.roleBg : author.role}
                      <span className="mx-2 text-[#EAE6DF]">·</span>
                      {author.storyCount} {lang === 'bg' ? 'истории' : 'stories'}
                    </p>
                    <p className="mt-3 font-heading text-[15px] italic leading-relaxed text-[#1A1A1A]/60">
                      “{lang === 'bg' ? author.quoteBg : author.quote}”
                    </p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
