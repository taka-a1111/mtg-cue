// mtg_cue service worker ver1.0
// 画面の殻（index.html・アイコン）だけをキャッシュする。
// index.html は常にネットワーク優先で、失敗したときだけキャッシュを返す（更新が遅れないようにするため）。
// APIへの通信（Deepgram / OpenAI / Anthropic / Jev中継）は一切キャッシュしない。
const CACHE = "mtg-cue-v1";
const SHELL = ["/", "/index.html", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // APIのPOSTは素通し
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // 外部APIは素通し
  if (url.pathname.startsWith("/api/")) return;           // Jev中継は素通し

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("/index.html")))
  );
});
