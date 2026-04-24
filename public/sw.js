const CACHE_NAME = "ingenia-static-v1";
const OFFLINE_URLS = ["/", "/app-recetas", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => Promise.resolve())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isApiRequest = requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith("/api/");
  const isExternalDynamic =
    requestUrl.origin !== self.location.origin &&
    (requestUrl.hostname.includes("supabase") ||
      requestUrl.hostname.includes("openai") ||
      requestUrl.hostname.includes("googleapis") ||
      requestUrl.hostname.includes("generativelanguage"));

  // Requests dinamicas: evita cachearlas para no devolver respuestas stale.
  if (isApiRequest || isExternalDynamic) {
    event.respondWith(fetch(event.request));
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
