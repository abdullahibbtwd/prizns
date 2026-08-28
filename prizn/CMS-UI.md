# Prizni — how to use it

Click-path guide. **This → that → done.**

Two sides:

- **CMS** (`/cms`) — staff newsroom
- **Journal** (`/`) — what readers see

CMS labels switch with **BG / EN** in the top bar. This guide uses English labels.

---

## 1. Start

```
/cms/login  →  email + password  →  Sign in
          →  (if asked) 6-digit code  →  Verify
          →  Dashboard
```

Unverified accounts go to `/cms/verify-email`. Code expires in 15 minutes. **Send a new code** if needed.

Readers do **not** use this login. They use **Sign in** on the public site (magic link).

---

## 2. Screen chrome (every CMS page)

### Sidebar (left)

```
PRIZNI Editorial          → Dashboard
────────────────────────────────
Overview
  Dashboard
Content
  Stories  (count)
  Series   (count)
  Social Automation
  Tags
  Categories
  Authors  (count)
  Media Library
Community
  Write for Us
  Donations
  Partnerships
  Contact
  Newsletter
  Badges
  Story of the Year
Marketing
  SEO
  Analytics
Commerce
  Shop
  Orders
  Products
System
  Profile
  User Management     ← Admin only
  AI Assistant
────────────────────────────────
[your name + role]    → Profile
Sign out              → /cms/login
View Public Journal   → / (new tab)
```

You only see the items your **role** allows. Missing item = you cannot open it.

**Settings** is not in the sidebar. Use server `.env` for keys, Stripe, email.

### Top bar

```
☰ (mobile)     → open sidebar
Editorial OS › [page name]   → breadcrumb; first link = Dashboard
Search  ⌘K     → jump to stories / drafts / submissions / authors / tags / categories
BG / EN        → CMS labels only (not article language)
Avatar         → Profile
```

There is **no notifications bell**.

---

## 3. Roles

Your role is under your name in the sidebar footer. One account can hold several; highest wins for the label (`Admin +1`).

| Role | What you see |
| --- | --- |
| **Admin** | Everything |
| **Editor** | Everything except **User Management** |
| **Author** | Dashboard, Stories, Series, Media, Authors, Profile |
| **Contributor** | Dashboard, Stories, Write for Us, Media, Profile |
| **SEO Editor** | Dashboard, Stories, SEO, Tags, Categories, Profile |
| **SEO Manager** | Dashboard, SEO, Analytics, Tags, Categories, Profile |

```
Need a new staff login?  Admin → User Management → New user
Need a public byline?    Authors desk (not Profile)
Need a reader account?   Public site → Sign in (magic link)
```

---

## 4. Dashboard — `/cms`

Morning desk. Nothing publishes from here. Cards hide if your role cannot open that screen.

```
Today / Week / Month     → traffic window (needs Analytics access)
New Story                → story editor
```

**Cards** (click to jump)

| Card | Goes to |
| --- | --- |
| Reader Traffic | Analytics |
| Published Stories | Stories, status = Published |
| In Progress Drafts | Stories, status = Draft |
| Pending Review | Stories Review **or** Write for Us |
| Scheduled Releases | Stories, status = Scheduled |

**Most Read Stories** → click a row → that story in the editor.

**Today’s Tasks** (auto)

```
Write for Us submissions (n)  → /cms/submissions
Stories in review (n)         → /cms/stories?status=REVIEW
Failed translations (n)       → /cms/stories
Published today (n)           → /cms/stories?status=PUBLISHED
```

**Personal reminders**

```
type title  → optional due date  → Add
checkbox    → done
trash       → delete
```

**AI Assistant** box → shortcuts into Stories / Submissions / `/cms/ai`.

---

## 5. Content (sidebar, top to bottom)

### 5.1 Stories — `/cms/stories`

The journal. Every section lives here.

```
New Story  → editor
Filter: All / Draft / Review / Published / Scheduled / Sponsored
Filter: section, author
Search title
Grid / table
Edit / View (public URL if published) / Delete
```

**Editor** `/cms/stories/new` or `/cms/stories/:id`

```
1. Pick Section first          → form changes
2. Write title + body (BG or EN; the other language is translated after save)
3. Author, tags, images, SEO
4. Save draft / Review / Schedule / Publish / Archive
```

Pipeline:

```
Draft → Review → Schedule (hidden until date) → Publish → Archive
```

After **Publish**: translation (+ optional TTS, related-stories embedding) runs in the background.

| Section | Extra fields | Readers see |
| --- | --- | --- |
| Human stories | author, location, read time | `/stories` · `/stories/{slug}` |
| Places | place name, slogan, listing teaser | `/places` · `/places/{slug}` · map |
| Traditions | tradition title, teaser | `/traditions` · `/traditions/{slug}` |
| Voices | speaker + audio | `/voices` |
| Video | YouTube/Vimeo **or** upload + poster | `/video` |
| Discover, Sports, Events, News, Campaigns, Gallery | standard | `/{section}` · `/{section}/{slug}` |

Also in the editor: body blocks (paragraph, pull quote, note, caption) · hero + gallery · featured / sponsored / sourced · series episode · **Retranslate** · Gemini panel (headlines, lead, SEO — apply only what you accept) · TTS narration (Bulgarian).

**Featured** flag → homepage hero. **Sponsored** → badge on cards.

---

### 5.2 Series — `/cms/series`

Multi-episode, not a single article.

```
New series  → title, description, cover, status Active
Manage      → drag episodes, add existing stories, New episode
Delete      → series gone; episodes stay as standalone stories
```

You can also attach a story to a series **from the story editor**.

Readers: `/discover` (series cards) · each episode at its article URL · newsletter Episode of the Day.

---

### 5.3 Social Automation — `/cms/social`

Copy for Facebook / Instagram / TikTok. **Does not post to Meta.**

```
Publish the story first
→ Social → find row → Generate
→ edit body + hashtags → Save → Approve
→ copy → paste into the real apps
```

Only **published** stories can generate.

---

### 5.4 Tags — `/cms/tags`

```
Kind (Location / Topic)  → name  → Create
Location tags            → Geocode  (puts the pin on /places map)
Attach on the story editor
```

Readers: filter chips on `/stories`, `/places`, `/traditions` · map on `/places`.

---

### 5.5 Categories — `/cms/categories`

One category per public section (Human stories, Our places, Traditions, …). No subcategories.

```
Add category  → name  → Save
Assign from the story editor (picks the section too)
```

Public listings are the section itself (`/stories`, `/places`, …). Location / topic filters use **Tags**, not categories.

---

### 5.6 Authors — `/cms/authors`

Public bylines. **Not** CMS logins.

```
New author  → name, role, location, quote, bio, portrait, Active  → Save
Attach that author on each story
Optional: Badges
```

You can also create an author **from the story editor**.

Readers: `/authors` · `/authors/{slug}` · byline on the article.

---

### 5.7 Media Library — `/cms/media`

Shared files (MinIO). Not the same as an article gallery, though editor uploads land here too.

```
Name + optional location  → choose file  → Upload
Filter: All / Images / Videos / Audio
```

Readers: `/gallery` (library **images**) · inside articles · series covers · author portraits · shop photos.

---

## 6. Community

### 6.1 Write for Us — `/cms/submissions`

Inbox from `/write-for-us`. Not live until you convert.

```
Reader fills /write-for-us
→ appears as New
→ open → Review / Approved / Rejected
→ Convert to article  → draft in Stories  → finish  → Publish
```

---

### 6.2 Donations — `/cms/donations`

Read-only. Money comes from Stripe on `/support`.

```
Chart (days / months / years)  → table (amount, story, email, status)
```

No “create donation” in CMS.

---

### 6.3 Partnerships — `/cms/partnerships`

```
Partner submits /partnerships
→ New → Review → Contacted → Closed
```

---

### 6.4 Contact — `/cms/contact`

```
Reader sends /contact
→ Gemini tags it (business / tip / spam / general)
→ open → internal notes → Replied / Closed
```

They may get an auto-reply. They never see internal notes.

---

### 6.5 Newsletter — `/cms/newsletter`

Episode of the Day (Resend). Next **unpublished-in-digest** series episode.

```
Readers subscribe on the public site
→ Active series with episodes
→ Newsletter → preview → Send now
  (or wait for 08:00 Europe/Sofia job)
```

Needs Resend. Open rate is a **placeholder**.

---

### 6.6 Badges — `/cms/badges`

```
Auto:  publish N stories under that author  → re-evaluate
Manual: pick author + badge  → Award
```

Readers: `/authors/{slug}` only. No public badges page.

---

### 6.7 Story of the Year — `/cms/story-year`

```
Create campaign (year + title)
→ pick published stories  → Save nominations
→ set Voting open
→ later: Closed
```

Readers: `/story-of-the-year`. One vote per magic-link reader.

---

## 7. Marketing

### 7.1 SEO — `/cms/seo`

Health check. You **write** SEO in the **story editor**, not here.

```
See gaps  → Edit SEO  → fill title + description  → Save / Publish  → recheck
```

Also links: `/sitemap.xml`, `/robots.txt`, RSS.

---

### 7.2 Analytics — `/cms/analytics`

Read-only. Today / Week / Month. Visitors, pageviews, dwell, top pages, sources.

You do not add rows. Public browsing writes the numbers. Same summary feeds the Dashboard traffic card.

---

## 8. Commerce

### 8.1 Shop — `/cms/shop`

Hub only. Two links: **Products** and **Orders**. Public store is `/shop`.

### 8.2 Orders — `/cms/orders`

```
Customer checks out on /shop (card or COD)
→ row appears
→ open  → Mark as shipped
```

Buyer tracks at `/shop/track`.

### 8.3 Products — `/cms/products`

```
New product  → title, price (EUR), stock, photos, COD / ETA  → Save
→ set Active  (inactive = hidden from /shop)
```

Stock drops as orders complete.

---

## 9. System

### 9.1 Profile — `/cms/profile`

**Your** CMS user. Not a public author page.

```
Name, email, bio, social URLs, avatar  → Save
Change password (min 8)
Log out other sessions
```

Changing email → new 6-digit verify on next login.

To appear on `/authors`, create an **Author** and attach it to stories.

### 9.2 User Management — `/cms/users` (Admin)

```
New user  → name, email, password, role(s)
They verify email  → /cms/login
```

### 9.3 AI Assistant — `/cms/ai`

Paste text → pick a tool → copy. This page is **simulated** (demo text).

Real Gemini: story editor AI panel · contact classification · public Ask the Archive (`/archive`).

---

## 10. Goal recipes

**Publish a story**

```
Stories → New Story → pick section → write → author + tags + images
→ Publish → wait for translation → View Public Journal
```

**Turn a pitch into a story**

```
Write for Us → open New → Convert to article → editor → Publish
```

**Put a place on the map**

```
Tags → Location → Create → Geocode → attach on a Places story → Publish
```

**Start a series + email it**

```
Series → New series → Active → add episodes → Publish each episode
→ Newsletter → Send now
```

**Ship an order**

```
Orders → open row → Mark as shipped
```

**Open yearly voting**

```
Publish candidate stories → Story of the Year → create campaign
→ nominations → Voting open
```

**Award a badge**

```
Badges → author + badge → Award
(or publish enough stories, then re-evaluate)
```

**Hire staff**

```
Admin → User Management → New user → they verify → they sign in
```

---

## 11. Public journal

### Navbar (every public page)

```
Logo                         → /
Human Stories                → /stories
Our Places                   → /places
Events                       → /events
Traditions                   → /traditions
Search                       → overlay
Contribute ▾
    Write for Us             → /write-for-us
    Authors                  → /authors
    Support Us               → /support
    Partnerships             → /partnerships
Sign in  (or Saved if logged in)  → magic link / /me
BG / EN                      → public language
☰ (mobile)                   → same links + Discover, Sports, Shop, Why Prizni
```

Navbar language is the **reader** language (translated fields). CMS BG/EN is separate.

### Home `/` (top → bottom)

```
Hero
Featured story               ← CMS Featured flag
Story of the Year            ← open campaign
Human stories
Editor’s letter
Places
Authors
Voices
Discover / collections
Gallery
Traditions
Write for us
Shop
Stay with us                 ← support + newsletter
Footer
```

Empty sections hide when there is no published work.

### Footer extras (not all in the top nav)

```
Discover / Sports / Shop / Authors
Why Prizni                   → /why-prizni
Contact                      → /contact
RSS                          → /feed.xml
```

Other hubs filled by Stories: `/video`, `/campaigns`, `/news`, `/voices`, `/gallery`, `/archive`.

### Reader (not staff)

```
Sign in  → email  → magic link  → /me (saved articles)
Vote on /story-of-the-year
Subscribe in footer / Stay with us
Donate on /support
```

---

## 12. CMS action → readers see it at

| You do this | They see it |
| --- | --- |
| Publish human-stories | `/stories`, `/stories/{slug}` |
| Publish places | `/places`, `/places/{slug}`, map |
| Publish traditions | `/traditions`, `/traditions/{slug}` |
| Publish other section | `/{section}`, `/{section}/{slug}` |
| Featured flag | Homepage Featured Editorial (latest published, any category) |
| Series + publish episodes | `/discover`, episode article URLs, newsletter |
| Upload media (name + location) | `/gallery` |
| Create author + attach | `/authors`, `/authors/{slug}`, byline |
| Location tag + geocode + attach | Filters + `/places` map |
| Convert Write-for-us → publish | The section you picked |
| Open Story of the Year voting | `/story-of-the-year` |
| Activate product | `/shop` |
| Mark order shipped | `/shop/track` |
| Fill SEO fields | Google, share cards, sitemap |
| Send digest | Subscriber inbox |
| Award badge | Author profile |

---

