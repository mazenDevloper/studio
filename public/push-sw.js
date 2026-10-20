// DriveCast goal alerts (Web Push from studio.c-p.workers.dev): the push carries no data; the alerts are fetched.
var API = 'https://studio.c-p.workers.dev';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  e.waitUntil((async function () {
    var list = [];
    try { list = (await (await fetch(API + '/push/latest', { cache: 'no-store' })).json()).alerts || []; } catch (x) {}
    if (!list.length) list = [{ id: 'x' + Date.now(), title: '⚽ DriveCast', body: 'تحديث جديد للمباريات' }];
    // the site open on screen: it plays its own goal animation too
    var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(function (w) { w.postMessage({ dcPush: list }); });
    for (var i = 0; i < Math.min(4, list.length); i++) {
      var a = list[i];
      await self.registration.showNotification(a.title, { body: a.body || '', tag: a.id, icon: 'https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png', data: { url: '/matches' } });
    }
  })());
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (ws) {
    for (var w of ws) { if ('focus' in w) { w.navigate && w.navigate('/matches'); return w.focus(); } }
    return self.clients.openWindow('/matches');
  }));
});
