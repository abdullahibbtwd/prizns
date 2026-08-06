import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import {
  getArticlesByAuthor,
  journalAuthors,
} from '@/data/concept-3/authors'
import { preferApi, usePublicAuthors } from '@/lib/public-content'

export default function AuthorsPage() {
  const { data } = usePublicAuthors()

  return (
    <JournalShell>
      {({ lang }) => {
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
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Автори' : 'Authors'}
              title={lang === 'bg' ? 'Гласовете на Призни' : 'The Voices of Prizni'}
              description={
                lang === 'bg'
                  ? 'Редактори, писатели и фотографи, които събират истории из Северозападна България.'
                  : 'Editors, writers, and photographers gathering stories across Northwestern Bulgaria.'
              }
              countLabel={
                lang === 'bg' ? `${authors.length} автори` : `${authors.length} authors`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {authors.map((author, index) => {
                  return (
                    <motion.div
                      key={author.slug}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
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
                          <h2 className="font-heading text-xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-2xl">
                            {lang === 'bg' ? author.nameBg : author.name}
                          </h2>
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
          </main>
        )
      }}
    </JournalShell>
  )
}
