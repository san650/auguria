/* Auguria service worker — offline-first cache. */
const VERSION = "v47";
const CACHE = `auguria-${VERSION}`;
// Splash PNGs and the non-Latin Cormorant Garamond subsets are intentionally
// absent: only one splash matches a given device's media query, and the
// cyrillic/vietnamese subsets never load on a Spanish-only site. Both are
// runtime-cached by the SWR fetch handler if anything ever requests them.
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
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtGmSqn7B6DxjY.woff2",
  "./fonts/cormorantgaramond-co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrEtImSqn7B6D.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYp3tKky2F7i6C.woff2",
  "./fonts/cormorantgaramond-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYqXtKky2F7g.woff2",
  "./fonts/italiana-QldNNTtLsx4E__B0XQmWaXx0xKVu.woff2",
  "./icons/tarot/0.svg",
  "./icons/tarot/1.svg",
  "./icons/tarot/2.svg",
  "./icons/tarot/3.svg",
  "./icons/tarot/4.svg",
  "./icons/tarot/5.svg",
  "./icons/tarot/6.svg",
  "./icons/tarot/7.svg",
  "./icons/tarot/8.svg",
  "./icons/tarot/9.svg",
  "./icons/tarot/10.svg",
  "./icons/tarot/11.svg",
  "./icons/tarot/back.svg",
];

self.addEventListener("install", (event) => {
  // `cache: 'reload'` forces each precache fetch to bypass the HTTP cache.
  // GitHub Pages serves with Cache-Control: max-age=600, so without this
  // bumping VERSION inside a 10-minute window would silently precache the
  // pre-bump bytes from the browser HTTP cache.
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Respond to the page asking which build it's running. Used by the
// tiny version stamp in the corner of the UI.
self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: VERSION });
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        // Only cache successful, same-origin, non-opaque responses. Without
        // this guard a 404 or 5xx would overwrite a known-good cached asset
        // — next request would serve the error instead of the working copy.
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
