/* Levegő PWA service worker — app shell cache + friss adat a /data/ alól */
const CACHE_VERSION = "levego-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * @param {Request} request
 * @param {Response} response
 */
async function putInCache(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response);
}

/**
 * Hálózat először, cache tartalék (navigáció és /data/).
 * @param {Request} request
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (request.method === "GET" && response.ok) {
      void putInCache(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await caches.match("/");
      if (shell) return shell;
    }
    throw new Error("Offline and no cache match");
  }
}

/**
 * Cache először, háttérben frissítés (statikus assetek).
 * @param {Request} request
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void putInCache(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    void networkPromise;
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;
  throw new Error("Offline and no cache match");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || url.pathname.startsWith("/data/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
