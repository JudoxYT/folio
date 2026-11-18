// Minimale service worker: maakt de Studio installeerbaar als app.
// Hij bewaart niets, zodat je altijd de nieuwste versie en je eigen gegevens ziet.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
