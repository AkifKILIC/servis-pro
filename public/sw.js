// ServisPro Service Worker - Push Bildirimleri ve Arka Plan Yönetimi
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Bildirime tıklandığında doğrudan uygulamayı aç
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const scope = self.registration.scope || './';
  const targetUrl = event.notification.data?.url || `${scope}?mode=technician`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir sekme/pencere varsa odaklan
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Açık değilse yeni pencerede uygulamayı başlat
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Push bildirimi geldiğinde ekranda göster
self.addEventListener('push', (event) => {
  let data = { title: 'Yeni Servis İşi!', body: 'Yeni bir iş emri atandı.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const scope = self.registration.scope || './';
  const options = {
    body: data.body,
    icon: `${scope}favicon.svg`,
    badge: `${scope}favicon.svg`,
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: data.url || `${scope}?mode=technician`,
      ticketId: data.ticketId,
    },
    actions: [
      { action: 'open', title: 'İşi Aç' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
