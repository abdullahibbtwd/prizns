# Prizni CMS — UI functionalities (sidebar by sidebar)

This guide walks the **Editorial OS** (`/cms`) the same way an editor uses it: **every sidebar item, top to bottom**. For each screen it answers:

- **What it means** — why the item exists
- **What you can do** — buttons, filters, and workflows on that screen
- **What it achieves** — the outcome for the journal
- **How you add it** — what to click / fill so the feature actually ships
- **Where readers see it** — public URL after you publish or save

Staff sign in at `/cms/login` (email + password). Unverified accounts go to `/cms/verify-email` (6-digit code). After that, the sidebar is the newsroom.

The CMS language toggle (BG / EN in the top bar) only changes **labels in the CMS**. Article source language stays Bulgarian; English is produced by the translation pipeline after save/publish.

---

## Chrome around the sidebar (not a nav item, but used on every screen)

| Control | Where | What it does |
| --- | --- | --- |
| Brand **PRIZNI / Editorial** | Sidebar header | Goes to Dashboard (`/cms`) |
| **⌘K / Ctrl+K** quick search | Top bar | Jump to stories, drafts, submissions, authors, tags, categories |
| **BG / EN** | Top bar | CMS UI language |
| **Bell** | Top bar | Notification dropdown (currently **placeholder copy**, not live events) |
| Avatar | Top bar | Opens **Profile** |
| Footer card | Sidebar bottom | Same as Profile |
| **Sign out** | Sidebar bottom | Ends the session, returns to `/cms/login` |
| **View Public Journal** | Sidebar bottom | Opens `/` in a new tab so you can check what readers see |

Stories, Authors, and Series show a **count badge** on the sidebar when those lists have loaded.

---

## 1. Overview

### 1.1 Dashboard — `/cms`

**What it means.** The morning desk. One place to see what needs work today, how the public site is performing, and personal reminders.

**What you can do**

- Switch traffic window: **Today / Week / Month**
- Read stat cards: visitor traffic, published stories, drafts, pending review, scheduled
- Open **Most read stories** (from public analytics)
- Use the **auto task list**: pending Write-for-us submissions, stories in Review, failed translations, published-today count — each row links into the right CMS screen
- Add / check off / delete **personal reminders** (title + optional due date)
- Click **New story** to start a draft
- Open the **AI assistant** shortcut (jumps to `/cms/ai`)

**What it achieves.** Editors do not hunt across screens. The dashboard turns queues (review, submissions, translations) into a daily checklist and shows whether published work is actually being read.

**How you add / use it.** Nothing is “published” from here. You act on the cards:

1. Click a task → land on Submissions or Stories (filtered).
2. Click **New story** → story editor.
3. Type a reminder → it stays on this dashboard until you complete or delete it.

**Where readers see it.** They never see the dashboard. The numbers come from the public journal (`/`, `/stories`, article pages, etc.).

**Status.** Live (analytics, checklist, todos). The top-bar bell is still mock.

---

## 2. Content

### 2.1 Stories — `/cms/stories`

**What it means.** The story desk: every article in every public section (human stories, places, traditions, voices, news, video, …).

**What you can do**

- **New story** → `/cms/stories/new` (editor)
- Filter by status: All, Draft, Review, Published, Scheduled, Sponsored
- Filter by **section** and **author**
- Search by title
- Switch **grid / table** view, paginate
- **Edit**, **view** (public path when published), **delete**

**Story editor** (`/cms/stories/:id`) is where the article is actually written. The form **changes by section**:

| Section you pick | Extra fields | Public listing |
| --- | --- | --- |
| Human stories / Featured | Author, location, read time, body blocks | `/stories` · article `/stories/{slug}` |
| Places | Place name, slogan, listing teaser | `/places` · `/places/{slug}` · map |
| Traditions | Tradition title, teaser | `/traditions` · `/traditions/{slug}` |
| Voices | Speaker + audio upload | `/voices` |
| Video | YouTube/Vimeo URL or uploaded file + poster | `/video` |
| Discover, Sports, Events, News, Campaigns, Gallery | Standard article fields | `/discover`, `/sports`, `/events`, `/news`, `/campaigns`, `/gallery` (gallery *articles* vs photo library — see Media) |

**Editor actions (status pipeline)**

`DRAFT` → **Review** → **Schedule** (hidden until date/time) → **Publish** → **Archive**

Also in the editor:

- Body blocks: paragraph, pull-quote, note, caption
- Hero image, gallery, photo credit
- Author (or create one inline)
- Tags (places + topics)
- Featured / sponsored / sourced flags + sponsor name
- SEO title and description
- Optional **series** membership (episode of a series)
- **Retranslate** (BG ↔ EN after save)
- **Gemini AI panel** (real API): headlines, lead, SEO, topic ideas — apply only what you accept
- **TTS narration** (Bulgarian audio from the text)

**What it achieves.** This is the journal. Publishing a story is what fills the public site, sitemap, RSS, related-stories, and social desk.

**How you add it**

1. Stories → **New story** (or convert a submission — see Community).
2. Choose **section** first so the form matches the public page.
3. Write in Bulgarian (or English — language is detected; the other language is translated after save).
4. Attach author, tags, images.
5. Save draft, send to review, or **Publish**.
6. After publish, translation (and optional TTS / embeddings) run in the background.

**Where readers see it**

- Homepage sections (Human Stories, Places, Traditions, …)
- Section hubs listed above
- Article page at `/{section}/{slug}` (human stories use `/stories/{slug}`)
- Search / archive, related stories, “I Relate”
- If **Featured**: homepage hero / featured slots
- If **Sponsored**: sponsored badge on cards and article
- If in a **series**: Discover / series episode list and newsletter digest
- English appears after translation status is Ready (language toggle on the public site)

---

### 2.2 Series — `/cms/series`

**What it means.** Multi-episode narratives (a named series with ordered episodes), not a single article.

**What you can do**

- Create a series (title, description, cover, status: Draft / Active / Archived)
- Open **Manage** (`/cms/series/:id`): drag-and-drop episode order, add existing stories, **New episode** (opens story editor already attached)
- See episode stats (published / draft / scheduled / review / archived)
- Delete a series (episodes remain as standalone stories)

You can also attach a story to a series from the **story editor**.

**What it achieves.** Long-form regional storytelling: readers follow episode 1, 2, 3… Newsletter can send the next unpublished episode as **Episode of the Day**.

**How you add it**

1. Series → **New series** → fill BG title/description, upload cover, set **Active**.
2. Add episodes (existing published/draft stories, or create new ones).
3. Reorder by drag, save order.
4. Publish each episode from the story editor as usual.

**Where readers see it**

- `/discover` (series + episodes)
- Series path `/series/{slug}` (and episode links on each article)
- Newsletter email when you send Episode of the Day (`/cms/newsletter`)

---

### 2.3 Social — `/cms/social`

**What it means.** Social automation desk: generate Facebook / Instagram / TikTok (and extra platforms) copy **from a published story**, edit it, then approve. It does **not** post to Meta yet.

**What you can do**

- Browse stories; filter by status, section, author; search
- Choose which **platforms** to generate for (saved workspace list; default FB / IG / TikTok)
- **Generate** a pack (only for **published** stories)
- Open a pack: edit body + hashtags, save, **Approve** / Approve all, copy text, delete
- See pack status on the table (no pack / drafts / approved)

**What it achieves.** Editors leave the CMS with ready-to-paste social copy instead of rewriting every story by hand.

**How you add it**

1. Publish the story first.
2. Social → find the row → **Generate**.
3. Edit / approve. Copy into the real social apps until native publishing ships.

**Where readers see it.** Not on prizni.bg until someone pastes/posts it. Planned next step (already noted in the UI): **Meta publishing**. Until then, the “where” is Facebook, Instagram, TikTok after a human posts.

---

### 2.4 Tags — `/cms/tags`

**What it means.** Taxonomy used to filter and map content: **Location**, **Topic**, or **Category-kind** tags.

**What you can do**

- Create a tag (kind + Bulgarian name; English is translated)
- Filter the list by kind
- **Geocode** location tags (lat/lng for the public map)
- Edit / delete

**What it achieves.** Places get a map; listings get location/topic filters; stories stay findable without stuffing keywords into titles.

**How you add it**

1. Tags → choose kind (Location / Topic) → name (e.g. “Белоградчик”) → create.
2. For locations, run **geocode** so the pin exists.
3. In the **story editor**, attach those tags to the article.

**Where readers see it**

- Filter chips on `/stories`, `/places`, `/traditions`
- Region map on `/places` (geocoded LOCATION tags)
- Article metadata / related browsing by place and topic

---

### 2.5 Categories — `/cms/categories`

**What it means.** Hierarchical folders (parent + child), bilingual, used to group stories beyond the 12 fixed **sections**.

**What you can do**

- Create a **parent** or **child** category
- Tree view: expand/collapse children, paginate
- Edit name, description, parent
- Delete (with confirm)

**What it achieves.** Finer grouping than section hubs (e.g. a tradition nested under a parent theme) while keeping URLs section-based.

**How you add it**

1. Categories → create parent, then children.
2. Assign from the story editor **category** field (section still decides which hub page the story lives on).

**Where readers see it.** Category labels and filters on listings/article cards. The public **URL** still follows section + slug (`/places/belogradchik`), not the category tree.

---

### 2.6 Authors — `/cms/authors`

**What it means.** Public contributor profiles (staff and guests), separate from CMS login accounts.

**What you can do**

- **New author** → `/cms/authors/new`
- Edit (`/cms/authors/:id`): name, role, location, quote, bio, aliases, portrait, active flag
- Write BG or EN; the other language translates after save
- Delete (stories remain, unlinked)

You can also create an author **from the story editor**.

**What it achieves.** Bylines, author pages, and badge holders. Readers trust a named person, not an anonymous feed.

**How you add it**

1. Authors → New author → portrait + bio → save.
2. Attach that author on each story.
3. Optionally award badges (`/cms/badges`).

**Where readers see it**

- `/authors` index and homepage authors strip
- `/authors/{slug}` profile (bio, quote, story list, badges)
- Byline on every article that uses this author

---

### 2.7 Media — `/cms/media`

**What it means.** Shared library of images, video, and audio stored in MinIO — not the same as an article gallery, though articles also upload files.

**What you can do**

- Upload image or video with **name** and **location**
- Filter All / Images / Videos / Audio
- Browse the grid (preview, title, location)

**What it achieves.** A public photo journal plus reusable assets for stories, series covers, products, and profiles.

**How you add it**

1. Media → name + optional location → choose file → **Upload**.
2. Article hero/gallery/audio/video can also be uploaded from the story editor (those files become media assets too).

**Where readers see it**

- `/gallery` — public gallery of **library images** (name + location)
- Inside articles (hero, gallery, video, voices audio)
- Series covers, author portraits, shop product images when those uploads go through the same storage

---

## 3. Community

### 3.1 Submissions (Write for us) — `/cms/submissions`

**What it means.** Inbox for public pitches from `/write-for-us`. Not published until an editor converts them.

**What you can do**

- Search; filter New / Review / Changes / Approved / Rejected
- Open detail (`/cms/submissions/:id`): photos, contact, place, body
- Change status
- **Convert to article** → creates a draft in Stories and opens the editor
- Delete

**What it achieves.** Community reporting without putting raw pitches live. The desk turns a form into an edited story.

**How you add it (reader vs editor)**

- **Reader:** fills `/write-for-us` → appears here as **New**.
- **Editor:** open → set Review/Approved → **Convert** → finish in Stories → Publish.

**Where readers see it**

- The form: `/write-for-us` (and Support contribute links)
- The story: only **after** convert + publish, on the section you choose in the editor

---

### 3.2 Donations — `/cms/donations`

**What it means.** Completed Stripe donations (general or tied to a story).

**What you can do**

- View **trend chart** (days / months / years)
- Table: amount, story link, email, status, date

There is no “create donation” in CMS; money comes from the public checkout.

**What it achieves.** Transparency for the newsroom: who supported the journal, and which stories people fund.

**How you add it.** Readers donate on `/support` (or a story-linked checkout). Completed payments land here automatically via Stripe webhook.

**Where readers see it**

- Donate UI: `/support`
- Success return from Stripe
- CMS only (donor list is not a public leaderboard)

---

### 3.3 Partnerships — `/cms/partnerships`

**What it means.** CRM for inbound partnership forms (tourism boards, museums, wineries, sponsors).

**What you can do**

- List inquiries (name, org, email, message excerpt)
- Change status: New → Review → Contacted → Closed

**What it achieves.** Partnerships do not get lost in a shared mailbox. Status is the pipeline.

**How you add it.** Partners submit `/partnerships`. Editors update status as they email/call.

**Where readers see it.** Public form: `/partnerships`. The pipeline itself is staff-only.

---

### 3.4 Contact — `/cms/contact`

**What it means.** Public contact inbox. Gemini classifies messages (business, story tip, spam, general) and can leave an AI note.

**What you can do**

- Search; filter New / Review / Replied / Closed
- See AI category + short AI note (open modal for full note)
- Detail (`/cms/contact/:id`): full message, **internal notes**, status, auto-reply flag

**What it achieves.** Faster triage (spam vs story tip) and a paper trail without forwarding the whole team.

**How you add it.** Readers send `/contact`. Editors open the row, reply off-platform, mark **Replied** / **Closed**, keep notes.

**Where readers see it.** Form: `/contact`. They may get an auto-reply email. They never see internal notes.

---

### 3.5 Newsletter — `/cms/newsletter`

**What it means.** Subscriber list + **Episode of the Day** digest (Resend). Sends the next series episode that has not been emailed yet.

**What you can do**

- Stats: active subscribers, digests sent (open rate is **placeholder** until Resend reporting)
- Preview next episode; **Send now** (confirm)
- History of recent sends
- Search subscribers, remove one

A scheduled job can also send at **08:00 Europe/Sofia**.

**What it achieves.** Habit: one episode in the inbox, not a dump of the whole site.

**How you add it**

1. Readers subscribe on the public site (footer / newsletter form).
2. Build an **Active** series with unpublished-in-digest episodes.
3. Newsletter → confirm preview → **Send now** (or wait for the daily job).
4. Requires Resend to be configured; otherwise the UI shows it is missing.

**Where readers see it**

- Subscribe: public journal footer / newsletter field
- Receive: their email
- The episode itself still lives on the public series/article URLs

---

### 3.6 Badges — `/cms/badges`

**What it means.** Author honours. Some auto-award after N **published** stories; some are manual (e.g. “Voice of the Northwest”).

**What you can do**

- See each badge, rule (auto at N+ or manual), current holders
- **Manual award**: pick author + badge
- **Re-evaluate** auto badges for an author after new publishes

**What it achieves.** Visible recognition on author pages; a reason for contributors to keep publishing.

**How you add it**

1. Publish enough stories under that author (auto), **or**
2. Badges → select author + badge → **Award**.

**Where readers see it.** `/authors/{slug}` (badge list on the profile). Not a separate public “badges” page.

---

### 3.7 Story of the Year — `/cms/story-year`

**What it means.** Annual reader vote: a campaign with nominated **published** stories. One vote per Magic Link reader.

**What you can do**

- Create campaign (year + BG title)
- Open a campaign: set status **Draft** (hidden) / **Open voting** / **Closed**
- Pick nominations from published stories, save
- See vote counts
- Link to the public page

**What it achieves.** A yearly community ritual, not just a static archive.

**How you add it**

1. Publish the candidate stories.
2. Story of the Year → create campaign → pick nominations → set **Open voting**.
3. Close when the year ends.

**Where readers see it**

- `/story-of-the-year` (and footer nav)
- Voting requires a reader Magic Link (`/auth/verify` flow)
- Nominated stories remain on their normal article URLs

---

## 4. Marketing

### 4.1 SEO — `/cms/seo`

**What it means.** Health check for discoverability: unique titles/descriptions, clean URLs, schema.org, Open Graph, sitemap, canonicals. Strategy is **evergreen** traditions + places, not news spikes.

**What you can do**

- See coverage % and counts (published, with meta, missing title, missing description)
- Open gaps table → **Edit SEO** jumps into that story
- Chips to public `/traditions` and `/places`
- Open `/sitemap.xml`, `/robots.txt`, RSS

You **write** SEO fields in the **story editor**, not on this page.

**What it achieves.** Google and social crawlers get unique titles, descriptions, and images; published work enters the sitemap.

**How you add it**

1. Open a published story with a gap.
2. Fill **SEO title** and **SEO description** (or apply Gemini suggestions).
3. Republish / save. Recheck this page.

**Where readers / crawlers see it**

- Browser tab title and Google snippet
- Facebook/Twitter cards (OG)
- `/sitemap.xml`, `/robots.txt`, `/feed.xml`
- Article JSON-LD

---

### 4.2 Analytics — `/cms/analytics`

**What it means.** Live reading of the public site: visitors, pageviews, dwell time, logged-in vs anonymous, top pages/stories, traffic sources, top clicks.

**What you can do**

- Range: Today / Week / Month
- Stat cards + tables (no edit — read only)

Data is collected by the public **analytics beacon** (page views, dwell, clicks).

**What it achieves.** Editorial decisions from real attention, not guesses. The same summary feeds the Dashboard traffic card.

**How you add it.** You do not add rows here. Readers browsing `/`, articles, shop, etc. generate events automatically.

**Where readers see it.** They don’t. Staff only. (Readers may be signed in via Magic Link; that only changes the “signed-in vs anonymous” split.)

---

## 5. Commerce

### 5.1 Shop — `/cms/shop`

**What it means.** Hub page, not a catalog editor. It points you to Products and Orders and reminds you the public store is `/shop`.

**What you can do.** Follow the two links. No extra forms.

**What it achieves.** A single “commerce” landing so new staff do not miss Orders vs Products.

**Where readers see it.** `/shop`, `/shop/cart`, product pages, `/shop/track`.

---

### 5.2 Orders — `/cms/orders`

**What it means.** Paid (or COD) shop orders. Fulfilment desk.

**What you can do**

- List orders (public id, email, status, total)
- Click a row: line items, payment method (card / COD), shipping
- **Mark as shipped**

**What it achieves.** Handmade goods actually leave the studio; buyers can be told the order is on the way.

**How you add it.** Customers checkout on `/shop` (Stripe card or cash-on-delivery). Orders appear here. You mark shipped after packing.

**Where readers see it**

- Checkout / success: `/shop`, `/shop/success`
- Tracking: `/shop/track`
- They never see the CMS table

---

### 5.3 Products — `/cms/products`

**What it means.** Catalog: bilingual title/description, price (EUR), stock, gallery, active flag, optional COD, estimated arrival (business or calendar days).

**What you can do**

- Create / edit product
- Upload gallery images, slider or grid preview
- Activate / deactivate (inactive hides from the public shop)
- Set COD + ETA range

**What it achieves.** The public boutique matches what you can actually ship.

**How you add it**

1. Products → **New product** → title, price, stock, photos, COD/ETA → save.
2. Set **Active**.
3. Stock decreases as orders complete (fulfil via Orders).

**Where readers see it**

- `/shop` listing
- `/shop/{slug}` (or product route) detail, gallery, ETA, pay or COD
- Cart `/shop/cart`

---

## 6. System

### 6.1 Profile — `/cms/profile`

**What it means.** **Your** CMS user (not the public Authors desk). Name, photo, bio, social URLs, password, email.

**What you can do**

- Edit name, email, bio, website, Facebook, Instagram, YouTube, LinkedIn, X
- Upload avatar (shown in sidebar and header)
- Change password (min 8 characters, confirm)
- **Log out other sessions**

Changing email requires a new 6-digit verification on next login.

**What it achieves.** Correct byline-adjacent staff identity inside the OS, and session hygiene if a laptop is lost.

**How you add it.** Fill the form → save. Avatar appears immediately in the CMS chrome.

**Where readers see it.** **Not** on `/authors` unless you also create a matching **Author** record and attach it to stories. Profile is staff-only.

---

### 6.2 Users — `/cms/users`

**What it means.** Staff accounts and roles. Creating logins is an **Admin** job.

**Roles:** Subscriber, Contributor, Author, Editor, SEO Editor, SEO Manager, Administrator.

**What you can do**

- Search, filter by role, paginate
- **New user** (admin): name, email, password, role
- Edit name/email; admins change role and status
- Email verification column

**What it achieves.** Access control: who can enter the newsroom and at what level.

**How you add it.** Admin → Users → New user → they verify email → they sign in at `/cms/login`.

**Where readers see it.** Nowhere. Public readers use Magic Link (`/me`), not this table.

---

### 6.3 AI assistant — `/cms/ai`

**What it means.** Standalone workbench: paste a draft, run tools (better title, SEO meta, translate, summary, Instagram, TikTok script).

**What you can do today**

- Paste text, click a tool, copy the result

**Important:** this page currently uses **simulated** output (timeout + sample text). It is a UI prototype.

**Real Gemini** already runs in:

- Story editor **AI panel** (`/cms/ai/suggest`)
- Contact classification
- Public **Ask the Archive** (`/archive`)
- Regional context explainer

**What it achieves (when wired).** A sandbox for copy without opening a full article. Until the API is connected, treat results as demos.

**How you add it (to make it real).** Point the tools at the same `suggestCmsAi` / translate endpoints the story editor uses, then keep Copy → paste into Social or the editor.

**Where readers see it.** They don’t, except indirectly if you paste AI copy into a published story or social post.

---

### Settings — `/cms/settings` (hidden from sidebar)

Commented out in the sidebar. Route still exists as **Coming soon**: brand, domains, AI keys, payment gateways. Those values live in server `.env` today, not in this UI.

---

## Quick map: CMS action → public URL

| You do this in CMS | Readers see it at |
| --- | --- |
| Publish story (section = human-stories / featured) | `/stories`, `/stories/{slug}`, homepage |
| Publish story (places) | `/places`, `/places/{slug}`, map |
| Publish story (traditions) | `/traditions`, `/traditions/{slug}` |
| Publish story (other sections) | `/{section}` and `/{section}/{slug}` |
| Create series + publish episodes | `/discover`, series slug, newsletter |
| Upload media with name/location | `/gallery` |
| Create author + attach to stories | `/authors`, `/authors/{slug}` |
| Create location tag + geocode + attach | Filters + `/places` map |
| Approve Write-for-us → convert → publish | Section you chose |
| Open Story of the Year voting | `/story-of-the-year` |
| Activate product | `/shop` |
| Mark order shipped | Buyer tracking `/shop/track` |
| Fill SEO fields | Google, OG shares, sitemap |
| Send digest | Subscriber inbox |
| Award badge | Author profile |

---

## Not in the sidebar (public journal only)

These are reader features. CMS does not have a matching nav item, but stories/tags/authors you add still feed them:

| Public page | Role |
| --- | --- |
| `/` | Homepage composition of published sections |
| `/why-prizni` | Mission |
| `/archive` | Ask the Archive (AI over published text) |
| `/me` | Reader profile + saved articles (Magic Link) |
| `/support` | Donate + contribute shortcuts |
| `/video`, `/campaigns`, `/sports`, `/events`, `/news`, `/voices` | Section hubs filled by Stories |

---

## Honest gaps (UI exists, behaviour not finished)

| UI | Reality |
| --- | --- |
| Header **notifications** | Hardcoded samples |
| `/cms/ai` workbench | Fake generated text |
| Social **Approve** | Copy is ready; **no auto-post to Meta** |
| Newsletter **open rate** | Label only; Resend reporting later |
| **Settings** | Coming soon; use env vars |
| Sidebar **Settings** link | Commented out |

Everything else in the sidebar above is wired to the API: create it in CMS, and the matching public page is where readers will see it.
