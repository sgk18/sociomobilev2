# SOCIO Mobile (PWA) v2 — Project Context

> **Last updated:** May 03, 2026  
> **Purpose:** Detailed resume document for continuing development of the SOCIO mobile PWA.

---

## 1. What Is This Project?

**SOCIO Mobile v2** is a **mobile-first Progressive Web App** (with an optional **Capacitor Android wrapper**) for the SOCIO university event platform. It targets **students** (discovering events, registering, managing tickets) and **volunteer staff** (QR scanning for attendance). The app reuses the existing SOCIO backend API and Supabase project; the backend server is **not** part of this repo.

**Key characteristics**
- **Mobile-first UX** with desktop gating (directs users to the desktop site).
- **PWA installable** (custom service worker + manifest + install prompts).
- **Optional native wrapper** via Capacitor (Android).
- **Notifications** via OneSignal (native) and polling (PWA).
- **Volunteer QR scanning** with a dedicated dashboard.

Repository: `https://github.com/sgk18/sociomobilev2`

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15.1 (App Router) |
| React | 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + custom CSS variables |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase Postgres (shared with SOCIO backend) |
| Backend API | SOCIO API (`NEXT_PUBLIC_API_URL`) |
| Notifications | OneSignal (native), polling (web/PWA) |
| QR | `qr-scanner` |
| Mobile wrapper | Capacitor (Android) + Screen Orientation plugin |
| Dates | Day.js |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| PWA | `public/sw.js`, `public/manifest.json`, install prompt |

### Brand Tokens (CSS Variables in `app/globals.css`)
- Primary: `#011F7B`
- Primary Dark: `#000D3B`
- Primary Light: `#E6ECF8`
- Accent: `#FFBA09`
- Accent Dark: `#D99E00`
- Background: `#F8FAFC`
- Surface: `#FFFFFF`
- Text: `#0F172A`
- Text Muted: `#64748B`
- Border: `#E2E8F0`

---

## 3. Project Structure

```
sociomobilev2/
├── app/
│   ├── AppShell.tsx          # Desktop/Orientation gates, navs, prompts, chat, transitions
│   ├── layout.tsx            # Global providers, SSR event prefetch, service worker wiring
│   ├── globals.css           # Design system, animations, global styles
│   ├── loading.tsx           # Global loading UI
│   ├── error.tsx             # Error boundary
│   ├── not-found.tsx         # 404 fallback
│   ├── api/pwa/              # Next API proxy layer for SOCIO backend
│   ├── auth/                 # Sign-in + callback
│   ├── discover/             # Dashboard (search, curated sections)
│   ├── events/               # Events listing
│   ├── event/[id]/           # Event detail
│   ├── event/[id]/register/  # Team registration form
│   ├── fests/                # Fests listing
│   ├── fest/[id]/            # Fest detail
│   ├── profile/              # User profile, registrations, QR codes
│   ├── notifications/        # Notification feed
│   ├── volunteer/            # Volunteer dashboard
│   ├── volunteer/scanner/    # Volunteer QR scanner
│   ├── privacy/              # Privacy policy page
│   ├── terms/                # Terms page
│   └── offline/              # Offline fallback page
├── components/               # UI components (cards, prompts, scanner, chatbot, etc.)
├── context/                  # Auth, Events, Notifications, Shake-to-scan
├── lib/                      # Utilities (supabase client, date utils, debounce, volunteer access)
├── public/                   # PWA assets (manifest, sw.js, applogo.png, images)
├── android/                  # Capacitor Android project (optional)
├── capacitor.config.ts       # Capacitor settings
├── middleware.ts             # Route protection for /profile and /volunteer
├── next.config.ts            # Image remote patterns + cache headers
└── package.json
```

---

## 4. Environment & Configuration

Create `.env.local` based on `.env.local.example`.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public app URL for OAuth redirects |
| `NEXT_PUBLIC_PWA_URL` | Public PWA URL (often same as app URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | SOCIO backend API base URL |
| `NEXT_PUBLIC_REMOTE_IMAGE_HOSTS` | Comma-separated image host allowlist |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | OneSignal App ID (native only) |

**Config notes**
- `next.config.ts` controls image remote patterns and cache headers for static assets.
- `middleware.ts` protects `/profile` and `/volunteer` routes (Supabase session required).
- `capacitor.config.ts` defines Android appId, server URL, and allowNavigation hosts.

---

## 5. Key Runtime Flows

### Auth & Session
1. User signs in via Supabase Google OAuth from `/auth`.
2. `/auth/callback` exchanges auth code and upserts the user via the backend (`/api/users`).
3. `AuthContext` stores session + userData in localStorage (PWA persistence) and refreshes tokens.
4. Campus selection is prompted when missing; outsider users can set a one-time display name.
5. Protected routes (`/profile`, `/volunteer`) are gated in `middleware.ts`.

### Events & Fests Data
1. `layout.tsx` fetches events from `${NEXT_PUBLIC_API_URL}/api/events` (ISR, 5 min).
2. Events are passed to `EventProvider`; most list pages use context (no extra fetch).
3. Detail pages fall back to API calls if events are not in context.

### Registration & QR Tickets
- Team/solo registration uses `/api/pwa/register` → backend `/api/register`.
- Registrations are listed via `/api/pwa/registrations`.
- Profile can show QR tickets via `/api/pwa/registrations/:id/qr-code`.
- Users can cancel a registration via `/api/pwa/registrations/self/:id`.

### Notifications
- `NotificationContext` polls `/api/pwa/notifications` (every 60s) for PWA users.
- Native (Capacitor) builds initialize OneSignal for push notifications.
- `BrowserNotificationPrompt` and `NotificationBell` manage in-app prompts and counts.

### Volunteer Tools
- `/volunteer` lists assigned events (fetched via `/api/pwa/volunteer/events`).
- `/volunteer/scanner/[eventId]` uses `QRScanner` to verify attendance.
- Scan requests proxy to `/api/pwa/events/[eventId]/scan-qr`.
- `ShakeToScanContext` provides a motion-triggered shortcut to open scanner.

### App Shell & PWA
- `AppShell` wires TopBar, BottomNav, prompts (install, notifications, campus), and chat.
- `DesktopGate` blocks large viewports and links to desktop site.
- Service worker is registered in production; dev mode clears SW cache.

---

## 6. App Routes

| Route | Purpose |
|---|---|
| `/` | Home / landing |
| `/auth` | Start Google sign-in |
| `/auth/callback` | OAuth code exchange |
| `/discover` | Main dashboard |
| `/events` | Events listing |
| `/event/[id]` | Event detail |
| `/event/[id]/register` | Registration form |
| `/fests` | Fests listing |
| `/fest/[id]` | Fest detail |
| `/profile` | User profile, registrations, QR tickets |
| `/notifications` | Notification feed |
| `/volunteer` | Volunteer dashboard |
| `/volunteer/scanner/[eventId]` | QR scanner |
| `/privacy` | Privacy policy |
| `/terms` | Terms |
| `/offline` | Offline fallback |

---

## 7. API Routes (Next.js Proxy Layer)

All routes under `app/api/pwa/*` proxy requests to the SOCIO backend API.

| Route | Methods | Purpose |
|---|---|---|
| `/api/pwa/register` | POST | Event registration |
| `/api/pwa/registrations` | GET | List user registrations |
| `/api/pwa/registrations/:id/qr-code` | GET | QR code for a registration |
| `/api/pwa/registrations/self/:id` | DELETE | Cancel registration |
| `/api/pwa/notifications` | GET/PATCH/DELETE | List + bulk mark read + clear |
| `/api/pwa/notifications/:id` | DELETE | Dismiss notification |
| `/api/pwa/notifications/:id/read` | PATCH | Mark notification read |
| `/api/pwa/events/:id/scan-qr` | POST | Volunteer QR scan |
| `/api/pwa/volunteer/events` | GET | Volunteer assignments |
| `/api/pwa/volunteer/events/:id/access` | GET | Validate scanner access |
| `/api/pwa/fests` | GET | Fests listing |
| `/api/pwa/fests/:id` | GET | Fest detail |
| `/api/pwa/users` | POST | User upsert |
| `/api/pwa/users/me` | GET | Current user (token-based) |
| `/api/pwa/users/:email` | GET | User by email |
| `/api/pwa/users/:email/campus` | PUT | Update campus |
| `/api/pwa/users/:email/name` | PUT | Update outsider display name |

---

## 8. Current Build Status

Build status is **not verified** in this snapshot. To validate locally:

```bash
npm run lint
npm run build
```

---

## 9. What's DONE (Completed)

- Next.js App Router scaffolding with global `AppShell`.
- Supabase auth + session persistence + protected routes.
- Events/Fests listings and detail pages.
- Team/solo registration flow (without custom fields).
- Profile page with registration list, search, QR ticket display, and cancellation.
- Notification feed with polling + native OneSignal integration.
- Volunteer dashboard + QR scanner + shake-to-scan shortcut.
- PWA manifest, service worker, install prompt, offline route.
- Privacy/Terms pages.
- Capacitor Android project scaffold.

---

## 10. Known Gaps / TODO

- Render `custom_fields` in the registration flow (currently ignored).
- Club pages (`/clubs`, `/club/[id]`) are not implemented.
- Pull-to-refresh gesture on list pages.
- Event image carousel for multiple images.
- Expand loading skeleton usage on lists (currently spinner-based).
- Add 192x192 icon + iOS splash assets for stronger PWA coverage.

---

## 11. How to Run

```bash
# 1) Install deps
npm ci

# 2) Configure env vars
cp .env.local.example .env.local

# 3) Start dev server
npm run dev

# 4) Build for production
npm run build
npm run start
```

---

## 12. Relationship to Backend

This repo is **frontend-only**. All business data and registrations depend on the SOCIO backend (`NEXT_PUBLIC_API_URL`) and Supabase. Keep API availability in mind when testing or deploying.
