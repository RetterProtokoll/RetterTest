const CACHE_NAME = 'retter-protokoll-cache-v33'; // Version erhöht für das Profil-Update

// 'templates.json' ist hier enthalten, um sie offline verfügbar zu machen
const ASSETS_TO_CACHE = [
  '/RetterProtokoll/',
  '/RetterProtokoll/index.html',
  '/RetterProtokoll/manifest.json',
  '/RetterProtokoll/logo.png',
  '/RetterProtokoll/templates.json'
];

// Install-Event: Holt die neuen Assets in den Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('RetterProtokoll: Sichere Anwendungsdaten für den Offline-Modus...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // Erzwingt, dass der neue SW sofort aktiv wird
  );
});

// Activate-Event: Räumt alten Cache auf
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('RetterProtokoll: Veralteten App-Cache gelöscht:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Übernimmt sofort die Kontrolle über alle offenen Tabs
  );
});

// Fetch-Event: Stale-While-Revalidate Strategie
// Lädt schnell aus dem Cache, aktualisiert ihn aber im Hintergrund, wenn Netz vorhanden ist.
self.addEventListener('fetch', (event) => {
  // Nur GET-Anfragen cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        
        // Starte den Netzwerk-Request im Hintergrund
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Wenn die Antwort gültig ist, spiegelt sie sich im Cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline-Fall: Fehler abfangen, wenn kein Netz da ist
          console.log('RetterProtokoll: Offline-Modus aktiv für:', event.request.url);
        });

        // Gib die Cache-Antwort zurück, falls vorhanden, andernfalls warte aufs Netzwerk
        return cachedResponse || fetchPromise;
      });
    })
  );
});
