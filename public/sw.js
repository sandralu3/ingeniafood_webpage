const CACHE_NAME = "ingenia-static-v2";
const OFFLINE_URLS = [
  "/",
  "/app-recetas",
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => Promise.resolve())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isHtmlNavigation(request) {
  if (request.mode === "navigate") return true;

  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isApiRequest =
    requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith("/api/");
  const isExternalDynamic =
    requestUrl.origin !== self.location.origin &&
    (requestUrl.hostname.includes("supabase") ||
      requestUrl.hostname.includes("openai") ||
      requestUrl.hostname.includes("googleapis") ||
      requestUrl.hostname.includes("generativelanguage"));

  if (isApiRequest || isExternalDynamic) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isHtmlNavigation(event.request) || requestUrl.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok && isHtmlNavigation(event.request)) {
            const copy = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => Promise.resolve());
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached ?? caches.match("/app-recetas"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => Promise.resolve());
          return networkResponse;
        })
        .catch(() => caches.match("/app-recetas").then((fallback) => fallback || Response.error()));
    })
  );
});
