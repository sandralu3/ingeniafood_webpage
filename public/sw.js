const CACHE_NAME = "ingenia-static-v4";
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

self.addEventListener("push", (event) => {
  let payload = {
    title: "IngeniaFood",
    body: "Tienes una nueva notificación.",
    href: "/app-recetas/hoy",
    tag: "ingeniafood"
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: typeof parsed.title === "string" ? parsed.title : payload.title,
        body: typeof parsed.body === "string" ? parsed.body : payload.body,
        href: typeof parsed.href === "string" ? parsed.href : payload.href,
        tag: typeof parsed.tag === "string" ? parsed.tag : payload.tag
      };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) payload.body = text;
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      renotify: true,
      data: { href: payload.href }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    (event.notification.data && event.notification.data.href) || "/app-recetas/hoy";
  const targetUrl = new URL(href, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== targetUrl) {
            return client.navigate(targetUrl).then((navigated) => navigated?.focus?.() ?? client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
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
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (isHtmlNavigation(event.request)) {
              return caches.match("/app-recetas");
            }
            return Response.error();
          })
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
