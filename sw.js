/* =========================================================================
   sw.js — Servis çalışanı: uygulamayı çevrimdışı çalıştırır ve
   tablete "uygulama gibi" kurulabilir hâle getirir.

   NOT: Servis çalışanları yalnızca http(s) üzerinden çalışır; dosyaya çift
   tıklayarak (file://) açtığında devreye girmez — uygulama yine çalışır,
   sadece çevrimdışı önbelleği olmaz.
   ========================================================================= */
const CACHE = 'arapca-atolye-v2';
const ASSETS = [
  './',
  './index.html',
  './test.html',
  './studio.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js',
  './js/letterforms.js',
  './js/i18n.js',
  './js/custom-paths.js',
  './js/custom-data.js',
  './js/custom-learn.js',
  './js/custom-audio.js',
  './js/overrides.js',
  './js/backup.js',
  './js/admin.js',
  './js/admin-audio.js',
  './js/course.js',
  './js/storage.js',
  './js/speech.js',
  './js/audio.js',
  './js/confetti.js',
  './js/skeleton.js',
  './js/tracing.js',
  './js/strokecheck.js',
  './js/assembly.js',
  './js/app.js',
  './js/learn.js',
  './js/studio.js',
  './js/projectfile.js',
  './fonts/naskh.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      /* Tek tek ekle: eksik dosya (ör. isteğe bağlı yazı tipi) kurulumu bozmasın */
      Promise.all(ASSETS.map((u) => c.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* Ağ öncelikli, başarısızsa önbellek: geliştirirken eski dosya takılmasın,
     çevrimdışıyken de uygulama açılsın. */
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
