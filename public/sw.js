/*
 * K service worker.
 * - Static assets: cache first (they are content-hashed).
 * - "Today" page: network first, cached copy when offline (daily input).
 * - Other pages: network only, offline page as fallback. Sensitive pages
 *   such as the journal history are never cached on the device.
 * - Push: shows the generic evening reminder.
 */
const VERSION = "v1";
const STATIC_CACHE = `k-static-${VERSION}`;
const PAGES_CACHE = `k-pages-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";
const CACHEABLE_PAGES = new Set(["/aujourdhui", OFFLINE_URL]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("k-") && key !== STATIC_CACHE && key !== PAGES_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(request, url) {
  try {
    const response = await fetch(request);
    // Only cache real pages, never redirects to the sign-in page.
    if (response.ok && !response.redirected && CACHEABLE_PAGES.has(url.pathname)) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const cached = CACHEABLE_PAGES.has(url.pathname) ? await caches.match(url.pathname) : undefined;
    return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "K", body: "Journal du soir : 5 minutes pour nommer 3 émotions.", url: "/journal" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    // keep the default reminder
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/aujourdhui", self.location.origin);
  if (target.origin !== self.location.origin) {
    return;
  }
  event.waitUntil(self.clients.openWindow(target.href));
});
