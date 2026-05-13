/* Auguria service worker — offline-first cache. */
const VERSION = "auguria-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./fonts/fonts.css",
  "./fonts/cinzel-8vIJ7ww63mVu7gt7-GT7PkRXM8Xx.woff2",
  "./fonts/cinzel-8vIJ7ww63mVu7gt79mT7PkRXMw.woff2",
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtFmSqn7B6DxjY.woff2",
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtGmSqn7B6DxjY.woff2",
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtHmSqn7B6DxjY.woff2",
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtImSqn7B6D.woff2",
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtMmSqn7B6DxjY.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYp3tKky2F7i6C.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYpHtKky2F7i6C.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYpntKky2F7i6C.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYqXtKky2F7g.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrXtKky2F7i6C.woff2",
  "./fonts/italiana-QldNNTtLsx4E__B0XQmWaXx0xKVu.woff2",
  "./icons/splash/splash-1125x2436.png",
  "./icons/splash/splash-1170x2532.png",
  "./icons/splash/splash-1179x2556.png",
  "./icons/splash/splash-1242x2208.png",
  "./icons/splash/splash-1242x2688.png",
  "./icons/splash/splash-1284x2778.png",
  "./icons/splash/splash-1290x2796.png",
  "./icons/splash/splash-640x1136.png",
  "./icons/splash/splash-750x1334.png",
  "./icons/splash/splash-828x1792.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
