import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { EditorialHero } from '@/components/concept-3/EditorialHero'
import { EditorsLetter } from '@/components/concept-3/EditorsLetter'
import { FeaturedStoryCard } from '@/components/concept-3/FeaturedStoryCard'
import { CuratedCollections } from '@/components/concept-3/CuratedCollections'
import { OurPlacesSection } from '@/components/concept-3/OurPlacesSection'
import { HumanStoriesSection } from '@/components/concept-3/HumanStoriesSection'
import { AuthorsSection } from '@/components/concept-3/AuthorsSection'
import { TraditionsSection } from '@/components/concept-3/TraditionsSection'
import { VoicesAudioSection } from '@/components/concept-3/VoicesAudioSection'
import { PhotographyGallery } from '@/components/concept-3/PhotographyGallery'
import { WriteForUsSection } from '@/components/concept-3/WriteForUsSection'
import { ShopWithUsSection } from '@/components/concept-3/ShopWithUsSection'
import { SupportSection } from '@/components/concept-3/SupportSection'
import { NewsletterSection } from '@/components/concept-3/NewsletterSection'
import { StoryYearSection } from '@/components/concept-3/StoryYearSection'

export default function HomePage() {
  return (
    <JournalShell navVariant="hero">
      {({ lang }) => (
        <main className="w-full overflow-x-hidden">
          <PageMeta
            lang={lang}
            title={
              lang === 'bg'
                ? 'Prizni — истории от Северозападна България'
                : 'Prizni — stories from Northwestern Bulgaria'
            }
            description={
              lang === 'bg'
                ? 'Топъл дигитален журнал за човешки истории, места и традиции от Северозападна България.'
                : 'A warm digital journal of human stories, places, and traditions from Northwestern Bulgaria.'
            }
            path="/"
          />
          <EditorialHero lang={lang} />
          <EditorsLetter lang={lang} />
          <FeaturedStoryCard lang={lang} />
          <StoryYearSection lang={lang} />
          <OurPlacesSection lang={lang} />
          <HumanStoriesSection lang={lang} />
          <AuthorsSection lang={lang} />
          <VoicesAudioSection lang={lang} />
          <CuratedCollections lang={lang} />
          <PhotographyGallery lang={lang} />
          {/* Last editorial pillar — Sports / Events / News live in the footer */}
          <TraditionsSection lang={lang} />
          {/* Contribute — always last above footer */}
          <WriteForUsSection lang={lang} />
          <ShopWithUsSection lang={lang} />
          <SupportSection lang={lang} />
          <NewsletterSection lang={lang} />
        </main>
      )}
    </JournalShell>
  )
}
