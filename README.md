# Prizni

**Prizni** (also referred to as Prizn in code) is a bilingual editorial journal for Northwestern Bulgaria. It publishes human stories, places, and traditions as one shared region — not as administrative fragments.

The product is a full stack:

- a public journal site (Bulgarian / English)
- a staff CMS (“editorial OS”)
- a NestJS API with PostgreSQL, Redis, MinIO, background jobs, AI, TTS, shop, and donations

---

## Table of contents

1. [What it is](#what-it-is)
2. [Repository layout](#repository-layout)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Public journal](#public-journal)
6. [CMS (editorial OS)](#cms-editorial-os)
7. [API modules](#api-modules)
8. [Data model](#data-model)
9. [Auth, roles, and readers](#auth-roles-and-readers)
10. [Background jobs](#background-jobs)
11. [Feature flags](#feature-flags)
12. [Local development](#local-development)
13. [Environment variables](#environment-variables)
14. [Docker and production](#docker-and-production)
15. [Testing and CI](#testing-and-ci)
16. [Default credentials](#default-credentials)

---

## What it is

Prizni exists to keep the warm human stories, places, and traditions of Northwestern Bulgaria alive. The public site is a journal; the CMS is the newsroom that runs it.

Core editorial principles (see `/why-prizni`):

- People before headlines
- One Northwest (not Montana / Vratsa / Kozloduy as separate products)
- A warm, clear tone
- Transparency when content is sponsored

Content is stored in **Bulgarian as the source language**, with English produced by an automatic translation pipeline (Google Translate). Optional Gemini AI assists editors, classifies contact mail, and powers “Ask the Archive”. Optional Google Cloud TTS can narrate articles in Bulgarian.

---

## Repository layout

This is a two-package workspace with a shared root `.env` and Docker Compose.

```
prizns/
├── .env.example              # Shared env template (copy to .env)
├── docker-compose.yml        # postgres, redis, minio, api, web
├── docker-compose.test.yml   # isolated test infra (ports 5434 / 6381 / 9014)
├── package.json              # root scripts: infra, api, web, prisma, tests
├── .github/workflows/test.yml
├── api/                      # NestJS API
│   ├── prisma/               # schema, migrations, seed
│   ├── src/                  # modules (articles, auth, shop, ai, …)
│   └── test/                 # e2e helpers and specs
└── prizn/                    # React + Vite frontend
    ├── src/routes/           # public journal pages
    ├── src/cms/              # staff CMS
    ├── src/components/       # journal UI (concept-3)
    ├── src/lib/              # API clients, i18n helpers, auth
    └── nginx.conf            # production reverse proxy (API, media, SEO)
```

| Package | Path | Role |
| --- | --- | --- |
| Root | `/` | Orchestrates Docker, Prisma, and tests |
| API | `api/` | REST API, auth, jobs, Prisma, health |
| Web | `prizn/` | Public journal + CMS SPA |

---

## Tech stack

### Frontend (`prizn/`)

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4, Radix UI, shadcn-style components |
| Routing | React Router 7 |
| Data | TanStack Query |
| Forms | React Hook Form + Zod |
| i18n | i18next / react-i18next (`bg` default, `en`) |
| Motion | Framer Motion |
| Maps | MapLibre GL (places map + geocoded tags) |
| Charts | Recharts (CMS analytics / donations) |
| SEO | react-helmet-async |
| Tests | Vitest, Testing Library, happy-dom, Oxlint |

### Backend (`api/`)

| Layer | Choice |
| --- | --- |
| Framework | NestJS 11, Express |
| Database | PostgreSQL 16 + Prisma 7 |
| Cache / sessions / queues | Redis 7 + BullMQ |
| Object storage | MinIO (S3-compatible) |
| Auth | JWT access + refresh cookies, Passport, bcrypt |
| Email | Resend |
| Payments | Stripe (donations + shop; COD also supported) |
| Translation | `google-translate-api-x` |
| AI | Google Gemini (`@google/generative-ai`) |
| TTS | Google Cloud Text-to-Speech |
| Security | Helmet, cookie-parser, class-validator, CORS |
| Health | Nest Terminus (Postgres, Redis, MinIO) |
| Tests | Jest (unit + e2e with Supertest) |

---

## Architecture

```
Browser (localhost:5175)
    │
    ├── Vite SPA  ──public journal──►  Nest API  (localhost:3003/api)
    │                 CMS /cms/*
    │
    └── Docker web (nginx :80)
            /api/*     → api:3000
            /media/*   → minio:9000
            /sitemap.xml, /feed.xml, /robots.txt → API
            bots       → API bot-shell (crawler HTML)

API talks to:
    PostgreSQL   content, users, orders, analytics
    Redis        sessions, BullMQ queues
    MinIO        images, audio, video, uploads
    Resend       magic links, newsletter, shop receipts, contact
    Stripe       checkout + webhooks
    Gemini       editorial AI, archive Q&A, embeddings, contact classify
    Google TTS   article narration
```

**Local default ports** (chosen to avoid clashes with other Postgres/MinIO installs):

| Service | Host port |
| --- | --- |
| Web (Vite) | `5175` |
| API | `3003` |
| PostgreSQL | `5433` |
| Redis | `6379` |
| MinIO API | `9010` |
| MinIO console | `9011` |

Inside Docker Compose the API listens on container port `3000` and talks to `postgres:5432`, `redis:6379`, and `minio:9000`.

---

## Public journal

The SPA lives under `prizn/src/routes/`. Language is Bulgarian by default and can be switched to English; copy is stored as `*Bg` / `*En` fields and picked with `pickLang`.

### Sections (article types)

Articles belong to an `ArticleSection`. URLs are `/{section}/{slug}`.

| Section | Path | Notes |
| --- | --- | --- |
| Featured | (home / featured flag) | Homepage highlight |
| Human stories | `/stories` | Primary pillar |
| Places | `/places` | Includes map of geocoded location tags (`/places/map`) |
| Traditions | `/traditions` | Primary pillar |
| Discover | `/discover` | Tertiary browse |
| Voices | `/voices` | Optional speaker + audio |
| Sports | `/sports` | Footer / secondary |
| Events | `/events` | Footer / secondary |
| News | `/news` | Footer / secondary |
| Video | `/video` | YouTube/Vimeo URL or uploaded file |
| Campaigns | `/campaigns` | Editorial campaigns |
| Gallery | `/gallery` | Public photo grid from media library (IMAGE) |

### Other public pages

| Path | Purpose |
| --- | --- |
| `/` | Home (concept-3 journal shell) |
| `/authors`, `/authors/:slug` | Author directory and profile |
| `/write-for-us` | Public story submissions |
| `/support` | Donations (Stripe; UI in BGN, charged in EUR) |
| `/partnerships` | Partnership inquiries |
| `/contact` | Contact form (honeypot + AI classification) |
| `/why-prizni` | Manifesto |
| `/shop`, `/shop/:slug`, `/shop/cart` | Catalog, product, cart |
| `/shop/track`, `/shop/success` | Order tracking and checkout return |
| `/auth/verify` | Reader magic-link verify |
| `/me` | Reader account (saved articles) |
| `/story-of-the-year` | Annual campaign + vote |
| `/archive` | “Ask the Archive” (Gemini over published stories) |
| `/cms/*` | Staff CMS |

### Reader-facing capabilities

- Bilingual listing pages with filters
- Article body, gallery, related stories (embedding similarity)
- “I Relate” anonymous reactions
- Optional audio narration (TTS)
- Save articles (magic-link reader accounts)
- Newsletter subscribe
- Cookie consent + first-party analytics beacon (page views, dwell, clicks)
- Story of the Year voting (one vote per reader per campaign)
- Shop: Stripe card checkout or cash-on-delivery, shipping, order tracking
- Donations tied to an optional article (“support this story”)

Static fallback content still exists under `prizn/src/data/concept-3/` so the journal can render when the API is empty. Live pages prefer API data via `preferApi` / `usePublicMedia` / article hooks.

---

## CMS (editorial OS)

The CMS is the same SPA, mounted at `/cms`. Staff sign in with email + password. Unverified emails are sent to `/cms/verify-email`.

Quick search is **⌘K**. UI language toggles BG/EN independently of article source language.

### Sidebar

| Group | Screens |
| --- | --- |
| Overview | Dashboard (checklist, search) |
| Content | Stories, Series, Social desk, Tags, Categories, Authors, Media |
| Community | Submissions, Donations, Partnerships, Contact, Newsletter, Badges, Story of the Year |
| Marketing | SEO, Analytics |
| Commerce | Shop overview, Orders, Products |
| System | Profile, Users, AI assistant |

### Editorial workflow

1. Create or convert a **submission** into an article.
2. Edit in the story editor (section-specific fields: teaser, speaker, video, location, author, SEO).
3. Status: `DRAFT` → `REVIEW` → `SCHEDULED` → `PUBLISHED` → `ARCHIVED`.
4. Publishing enqueues **translation** (BG ↔ EN) and optionally **TTS narration** and **embedding**.
5. Social desk can generate platform copy (Facebook / Instagram / TikTok).
6. Series can be sent as **Episode of the Day** email (08:00 Europe/Sofia, or manual send).

The story editor adapts by section (`prizn/src/cms/section-profiles.ts`): places show a teaser/detail field, voices show speaker/audio, video shows playback source, and so on.

---

## API modules

Global prefix: `/api` (configurable via `API_PREFIX`). Validation is whitelist + forbid unknown fields. CORS uses `CORS_ORIGIN` with credentials.

### Public HTTP

| Prefix | What it does |
| --- | --- |
| `GET /` | App hello |
| `GET /health` | Postgres + Redis + MinIO |
| `GET /articles` | Published listing (section, filters) |
| `GET /articles/:section/:slug` | Article detail |
| `GET /articles/:section/:slug/related` | Semantic related stories |
| `POST /articles/:section/:slug/reactions` | “I Relate” |
| `GET /authors`, `GET /authors/:slug` | Public authors |
| `GET /series`, `GET /series/:slug` | Public series |
| `GET /media` | Public media (gallery) |
| `GET /tags`, `GET /categories` | Taxonomies |
| `GET /places/map` | Location tags with coordinates |
| `POST /submissions` | Write-for-us |
| `POST /partnerships` | Partnership form |
| `POST /contact` | Contact form |
| `POST /newsletter/subscribe` | Newsletter |
| `POST /donations/checkout` | Stripe donation session |
| `POST /donations/webhook` | Stripe webhook (donation **and** shop) |
| `GET/POST /shop/*` | Products, checkout, COD, track, delivered |
| `POST /reader-auth/*` | Magic link request / verify / refresh / logout |
| `GET/POST/DELETE /reader/*` | Reader profile + saved articles |
| `GET /story-of-the-year`, `POST .../vote` | Campaign + vote |
| `POST /analytics/beacon` | Page views / dwell / clicks |
| `POST /ai/regional-context` | Public regional explainer |
| `POST /archive/ask` | Ask the Archive |
| `GET /sitemap.xml`, `/feed.xml`, `/feed.json`, `/robots.txt` | SEO |
| `GET /bot-shell` | Crawler HTML shell |

### CMS HTTP (`/api/cms/...`)

Authenticated with JWT cookies. Typical resources:

| Prefix | Operations |
| --- | --- |
| `/cms/articles` | CRUD, translate, narrate, delete narration |
| `/cms/authors`, `/cms/series`, `/cms/tags`, `/cms/categories` | CRUD (+ geocode on tags) |
| `/cms/media` | Library + upload |
| `/cms/submissions` | Review, convert to article |
| `/cms/donations` | List + trend |
| `/cms/partnerships`, `/cms/contact` | Inbox + status/notes |
| `/cms/newsletter` | Subscribers |
| `/cms/badges` | Award / evaluate |
| `/cms/story-year` | Campaigns + nominations |
| `/cms/social` | Generate, approve, platforms |
| `/cms/digest` | Preview, history, send |
| `/cms/seo` | Overview |
| `/cms/analytics` | Summary |
| `/cms/shop` | Products + orders + ship |
| `/cms/users` | Staff users (admin) |
| `/cms/profile` | Own profile + logout other sessions |
| `/cms/todos` | Editorial todos |
| `/cms/dashboard` | Search + checklist |
| `/cms/ai` | Editorial suggest |
| `/storage` | Upload / presign / delete (MinIO) |
| `/auth` | Login, refresh, logout, me, verify-email |

---

## Data model

Prisma schema: `api/prisma/schema.prisma`. Highlights:

### Content

- **Article** — section, slug, bilingual fields, JSON body, status, SEO, embedding, narration/translation status, hero/audio/video media, gallery, tags, categories, featured/sponsored/sourced flags
- **Author** — bilingual bio, optional link to a CMS `User`
- **Series** + **SeriesEpisode**
- **MediaAsset** — IMAGE / AUDIO / VIDEO in MinIO
- **Tag** — LOCATION / TOPIC / CATEGORY, optional lat/lng + geocode status
- **Category** — tree (`parentId`), bilingual, translation status

### People and access

- **User** — staff (CMS). Roles listed below. Email verification, profile, social URLs
- **RefreshToken** — hashed refresh tokens + session id
- **Reader** — public identity via magic link (not staff)
- **MagicLinkToken**, **ReaderRefreshToken**, **SavedArticle**

### Community and commerce

- **Submission**, **PartnershipInquiry**, **ContactInquiry** (AI category + auto-reply timestamps)
- **NewsletterSubscriber**
- **Donation** — Stripe; optional `articleId`
- **Product**, **ProductGalleryItem**, **ShopOrder**, **OrderItem** — Stripe or COD
- **Badge**, **AuthorBadge** — auto-award after N published stories, or manual
- **StoryYearCampaign**, **StoryYearNomination**, **StoryYearVote**

### Ops

- **SocialPost**, **SocialWorkspaceSettings**
- **EpisodeDigestSend**
- **EditorialTodo**
- **AnalyticsSession**, **PageView**, **AnalyticsClick**
- **FileObject** — raw storage records

Article statuses: `DRAFT`, `REVIEW`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`.

---

## Auth, roles, and readers

### Staff (CMS)

- `POST /api/auth/login` sets **httpOnly** access + refresh cookies
- Access TTL default 15 minutes; refresh 7 days
- Redis-backed sessions; logout can revoke the current session or all others
- Email verification required after login (except endpoints marked `@AllowUnverifiedEmail`)
- Production requires 32+ character JWT secrets. `COOKIE_SECURE=true` over HTTPS; `COOKIE_SECURE=false` when `CORS_ORIGIN` is `http://` (IP deploys)

**Roles** (`Role` enum):

| Role | Typical access |
| --- | --- |
| `ADMIN` | Users, products, shipping, badges, story-year campaigns |
| `EDITOR` | Day-to-day editorial, shop list, badges list |
| `AUTHOR` | Linked to an `Author` profile; writes stories |
| `CONTRIBUTOR` | Limited editorial |
| `SUBSCRIBER` | Lowest CMS role |
| `SEO_EDITOR` / `SEO_MANAGER` | SEO-oriented staff |

Guards: `JwtAuthGuard` + `RolesGuard`. Endpoints without `@Roles()` allow any authenticated staff user.

### Readers (public)

- Passwordless **magic link** via Resend
- Separate JWT cookies from staff
- Saved articles, Story of the Year vote, optional analytics `readerId`
- Feature flag: `FEATURE_READER_AUTH` (frontend: `VITE_FEATURE_READER_AUTH`)

---

## Background jobs

BullMQ on Redis (`api/src/jobs/`). Queues:

| Queue | Job | Purpose |
| --- | --- | --- |
| `translate` | article / author / series / category | Fill the other language |
| `ai` | embeddings | Gemini vectors for related articles + archive |
| `tts` | narrate | Google Cloud TTS → audio media on the article |
| `social` | generate | Social desk copy |
| `digest` | daily + manual | Episode of the Day email at **08:00 Europe/Sofia** |

Jobs retry with exponential backoff. Translation and TTS can also be triggered from the CMS article editor.

---

## Feature flags

Set in root `.env` (string `"true"` / `"false"`):

| Flag | Default intent | Effect |
| --- | --- | --- |
| `FEATURE_AI` | on | Gemini suggest, archive, regional context, embeddings, contact classify |
| `FEATURE_TTS` | on | Article narration |
| `FEATURE_SOCIAL` | on | Social desk |
| `FEATURE_DIGEST` | on | Episode of the Day |
| `FEATURE_SHOP` | on | Catalog and checkout (503 if Stripe missing where required) |
| `FEATURE_READER_AUTH` | on | Magic link + `/me` |

Optional keys (`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, Google credentials) disable those integrations when unset rather than crashing local boot — except env validation still requires core infra (DB, Redis, MinIO, JWT).

---

## Local development

### Prerequisites

- Node.js 22+ (CI uses 22; Docker images use Node 24 Alpine)
- Docker Desktop (Postgres, Redis, MinIO)
- npm

### 1. Environment

```bash
cp .env.example .env
```

Adjust only if ports clash. Defaults work for API-on-host + infra-in-Docker.

### 2. Infrastructure

```bash
npm run dev:infra
```

Starts `postgres`, `redis`, `minio`, and `minio-init`.

### 3. API

```bash
cd api
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Or from root: `npm run prisma:migrate`, `npm run prisma:seed`, `npm run dev:api`.

API logs: `API listening on http://localhost:3003/api`.

### 4. Web

```bash
cd prizn
npm install
npm run dev
```

Or from root: `npm run dev:web`.

Vite: `http://localhost:5175` with `VITE_API_URL=http://localhost:3003/api`.

### Useful Prisma commands

```bash
npm run prisma:studio --prefix api   # GUI
npm run prisma:deploy --prefix api   # production migrate
```

Seed upserts:

- CMS admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`
- Categories (`prisma/seed-categories.ts`)

In production, seed refuses the example admin password and requires 16+ characters. After first deploy set `SEED_ON_BOOT=false`.

---

## Environment variables

Documented in `.env.example`. Groups:

**API / web**

- `API_PORT`, `API_PREFIX`, `CORS_ORIGIN`
- `WEB_PORT`, `VITE_API_URL`, `VITE_APP_NAME`
- `PUBLIC_SITE_URL` — canonicals, sitemap, Stripe return URLs

**Postgres / Redis / MinIO**

- `DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`
- `MINIO_*` — endpoint, keys, bucket, `MINIO_PUBLIC_URL`
  - API on host: `http://localhost:9010`
  - API in Docker/Coolify: `/media` (nginx proxies to MinIO)

**Auth**

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (32+ chars in production)
- `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`
- `COOKIE_SECURE`

**Integrations**

- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, `TTS_LANGUAGE_CODE`, `TTS_VOICE_NAME`
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`
- `RESEND_API_KEY`, `RESEND_FROM`, optional `ADMIN_EMAIL` for contact notify
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` (default `eur`)

Donations UI stays in BGN (лв). The API converts at the official rate **1 EUR = 1.95583 BGN** because Stripe no longer accepts BGN.

---

## Docker and production

Full stack:

```bash
npm run docker:up      # docker compose up -d --build
npm run docker:logs
npm run docker:down
```

**API image** (`api/Dockerfile`): multi-stage Node 24 Alpine, Prisma generate + build, `docker-entrypoint.sh` runs `prisma migrate deploy`, optional seed, then `node dist/main.js`.

**Web image** (`prizn/Dockerfile`): Vite build with `VITE_API_URL=/api` by default, served by nginx.

**nginx** (`prizn/nginx.conf`):

- `/api/` → `api:3000`
- `/media/` → MinIO (range requests for audio/video)
- `/sitemap.xml`, `/feed.xml`, `/feed.json`, `/robots.txt` → API
- Known crawler user-agents get a server-rendered **bot shell** instead of the SPA
- SPA fallback: `try_files` → `index.html`

Coolify / compose notes:

- Do not bake `localhost` into the web build; use `/api` and `/media`
- `MINIO_PORT` inside the network is `9000`; host publish is `MINIO_HOST_PORT` (9010)
- Set `COOKIE_SECURE=false` and an `http://` `CORS_ORIGIN` if you serve HTTP (IP). Over HTTPS, both `CORS_ORIGIN` and `COOKIE_SECURE` must use HTTPS / `true`

Health check: `GET /api/health`.

---

## Testing and CI

Root scripts:

```bash
npm run test:web          # Vitest
npm run test:web:cov
npm run test:api          # Jest unit
npm run test:api:cov      # unit + e2e coverage
npm run test:all
npm run test:ci
```

API e2e needs test infra:

```bash
docker compose -f docker-compose.test.yml up -d --wait
npm run test:e2e --prefix api
docker compose -f docker-compose.test.yml down -v
```

Test ports: Postgres `5434`, Redis `6381`, MinIO `9014`. Helpers live in `api/test/helpers/` (app bootstrap, DB, seed, factories, mocks).

GitHub Actions (`.github/workflows/test.yml`) on push/PR:

1. **Web** — `npm ci`, `npm audit --omit=dev`, Vitest coverage
2. **API** — Prisma generate, start test compose, Jest unit + e2e coverage, tear down

Coverage artifacts upload for 7 days.

---

## Default credentials

From `.env.example` (local / first Docker boot only):

| | |
| --- | --- |
| CMS URL | http://localhost:5175/cms |
| Email | `admin@prizn.local` |
| Password | `ChangeMeAdmin123!` |

Change these before any public deploy. Production seed blocks this password.

---

## Project conventions

- **Source language is Bulgarian.** English fields are filled by the translate queue; `sourceLang` and `translationStatus` track the job.
- **Bilingual columns** are named `titleBg` / `titleEn`, `nameBg` / `nameEn`, etc.
- **Public vs CMS controllers** are split (`public-*.controller.ts` vs `cms/*.controller.ts`) so auth stays explicit.
- **Money** is integer cents. Shop currency defaults to EUR; donation display is BGN.
- **Do not commit secrets.** Use `.env` locally; Coolify (or similar) for production.
- Nested `api/README.md` and `prizn/README.md` are leftover Nest/Vite templates — this file is the project documentation.
