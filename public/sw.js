/* ──────────────────────────────────────────────────────────
   SOCIO PWA — Service Worker v4
   • Cache-first for immutable Next.js bundles (/_next/static/)
   • Stale-while-revalidate for API data
   • Cache-first for core navigations, network-first fallback for others
   • Cache-first for images / fonts / CSS
   ────────────────────────────────────────────────────────── */

const CACHE_STATIC = "socio-static-v5";   // Next.js chunks, fonts, CSS
const CACHE_PAGES = "socio-pages-v5";     // HTML navigations
const CACHE_IMAGES = "socio-images-v5";   // images
const CACHE_API = "socio-api-v5";         // API data (stale-while-revalidate)
const OFFLINE_URL = "/offline";

const ALL_CACHES = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, CACHE_API];

const CORE_ROUTES = [
  "/",
  "/offline",
  "/auth",
  "/discover",
  "/events",
  "/fests",
  "/notifications",
  "/privacy",
  "/terms",
];

const STATIC_SHELL_ASSETS = [
  "/manifest.json",
  "/applogo.png",
  "/logo.svg",
  "/favicon.svg",
];

const PRECACHE_URLS = [...new Set([...CORE_ROUTES, ...STATIC_SHELL_ASSETS])];

/* ── Install — pre-cache shell ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: "reload" })))
      )
    )
  );
  self.skipWaiting();
});

/* ── Activate — clean old caches ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Helpers ── */
function isNavigation(request) {
  return request.mode === "navigate";
}

function isSameOrigin(url) {
  return new URL(url).origin === self.location.origin;
}

function isNextStatic(url) {
  return url.includes("/_next/static/");
}

function isNextData(url) {
  return url.includes("/_next/data/");
}

function isImage(request) {
  return (
    request.destination === "image" ||
    /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)(\?|$)/i.test(request.url)
  );
}

function isStaticAsset(request) {
  return ["style", "script", "font"].includes(request.destination);
}

function isAPIRoute(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const origin = parsed.origin;
  const isBackend = 
    origin === "https://socio2026v2server.vercel.app" ||
    hostname.endsWith(".vercel.app") || 
    hostname === "localhost" || 
    hostname === "127.0.0.1";
    
  return url.includes("/api/pwa/") || (isBackend && parsed.pathname.startsWith("/api/"));
}

function isNoStoreAPIRoute(parsed) {
  const { pathname, hostname, origin } = parsed;
  const isBackend = 
    origin === "https://socio2026v2server.vercel.app" ||
    hostname.endsWith(".vercel.app") || 
    hostname === "localhost" || 
    hostname === "127.0.0.1";
  return (
    pathname.startsWith("/api/pwa/volunteer/") ||
    pathname === "/api/pwa/users/me" ||
    pathname.includes("/scan-qr") ||
    (isBackend && (
      pathname.startsWith("/api/volunteer/") ||
      pathname === "/api/users/me"
    ))
  );
}

function isCoreRoutePath(pathname) {
  if (CORE_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith("/event/")) return true;
  if (pathname.startsWith("/fest/")) return true;
  return false;
}

/* ── Fetch handler ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  // Never touch auth routes
  if (request.url.includes("/auth/callback")) return;

  const url = request.url;
  const parsed = new URL(url);

  /* 1. Next.js immutable static bundles — cache-first (they're fingerprinted) */
  if (isNextStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  /* 2. API data — stale-while-revalidate */
  if (isNoStoreAPIRoute(parsed)) {
    event.respondWith(fetch(request).catch(() => new Response("{}", { status: 504 })));
    return;
  }

  if (isAPIRoute(url)) {
    event.respondWith(
      caches.open(CACHE_API).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached || new Response("{}", { status: 504 }));

          return cached || networkFetch;
        })
      )
    );
    return;
  }

  /* 3. Next.js data routes (ISR JSON) — network-first, cache fallback */
  if (isNextData(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_PAGES).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* 4. Navigation — network-first to avoid stale HTML hydration mismatches */
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_PAGES).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((r) => r || caches.match(OFFLINE_URL))
            .then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  /* 5. Images — cache-first */
  if (isImage(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_IMAGES).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  /* 6. Other static assets (CSS, JS, fonts) — cache-first */
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }
});

/* ── Runtime controls ── */
self.addEventListener("message", (event) => {
  if (event?.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event?.data === "WARM_CACHE") {
    event.waitUntil(
      caches.open(CACHE_PAGES).then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
    );
  }
});

/* ── Push notifications ── */
self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { body: event.data ? event.data.text() : "" };
    }
  })();

  const title = payload.title || "SOCIO";
  const options = {
    body: payload.body || "You have a new update.",
    icon: payload.icon || "/logo.svg",
    badge: payload.badge || "/logo.svg",
    tag: payload.tag || "socio-notification",
    data: {
      url: payload.url || payload.actionUrl || "/notifications",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
