import { JournalShell } from '@/components/concept-3/JournalShell'
import { EditorialHero } from '@/components/concept-3/EditorialHero'
import { EditorsLetter } from '@/components/concept-3/EditorsLetter'
import { FeaturedStoryCard } from '@/components/concept-3/FeaturedStoryCard'
import { CuratedCollections } from '@/components/concept-3/CuratedCollections'
import { OurPlacesSection } from '@/components/concept-3/OurPlacesSection'
import { HumanStoriesSection } from '@/components/concept-3/HumanStoriesSection'
import { AuthorsSection } from '@/components/concept-3/AuthorsSection'
import { TraditionsSection } from '@/components/concept-3/TraditionsSection'
import { VoicesAudioSection } from '@/components/concept-3/VoicesAudioSection'
import { SportsSection } from '@/components/concept-3/SportsSection'
import { EventsSection } from '@/components/concept-3/EventsSection'
import { VideoSection } from '@/components/concept-3/VideoSection'
import { CampaignsSection } from '@/components/concept-3/CampaignsSection'
import { PhotographyGallery } from '@/components/concept-3/PhotographyGallery'
import { WriteForUsSection } from '@/components/concept-3/WriteForUsSection'
import { SupportSection } from '@/components/concept-3/SupportSection'
import { NewsletterSection } from '@/components/concept-3/NewsletterSection'
import { ShopWithUsSection } from '@/components/concept-3/ShopWithUsSection'

export default function HomePage() {
  return (
    <JournalShell navVariant="hero">
      {({ lang }) => (
        <main className="w-full overflow-x-hidden">
          <EditorialHero lang={lang} />
          <EditorsLetter lang={lang} />
          <FeaturedStoryCard lang={lang} />
          <CuratedCollections lang={lang} />
          <OurPlacesSection lang={lang} />
          <HumanStoriesSection lang={lang} />
          <AuthorsSection lang={lang} />
          <TraditionsSection lang={lang} />
          <VoicesAudioSection lang={lang} />
          <SportsSection lang={lang} />
          <EventsSection lang={lang} />
          <VideoSection lang={lang} />
          <CampaignsSection lang={lang} />
          <PhotographyGallery lang={lang} />
          <WriteForUsSection lang={lang} />
          <SupportSection lang={lang} />
          <NewsletterSection lang={lang} />
          <ShopWithUsSection lang={lang} />
        </main>
      )}
    </JournalShell>
  )
}
