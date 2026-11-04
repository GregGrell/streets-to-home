// The staff app used to live at this address and installed an offline worker here.
// It now lives under /app/, so this replacement removes the old worker and its cache
// the next time a browser checks for an update, and reloads the page as the website.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
  })());
});
