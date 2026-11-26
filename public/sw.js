// Service worker do EB Sistema: recebe os avisos (push) e abre o sistema ao tocar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'EB Sistema', {
    body: d.corpo || '',
    icon: '/app/icone-192.png',
    badge: '/app/icone-192.png',
    data: { url: d.url || '/admin' },
    tag: d.tag || undefined,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/admin', self.location.origin).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) if (c.url.startsWith(self.location.origin + '/admin')) { await c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
