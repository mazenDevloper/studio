// cplay2 offline cache: pages are network-first (always fresh online, cached copy offline);
// hashed build files are cache-first. API calls and other sites are never cached.
var CACHE = 'cplay2-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('cplay2-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf('/api/') === 0 || req.headers.has('range')) return;
  var put = function (res) { if (res && res.ok && res.status === 200 && res.type === 'basic') { var c = res.clone(); caches.open(CACHE).then(function (cache) { cache.put(req, c); }); } return res; };
  if (url.pathname.indexOf('/_next/static/') === 0 || /\.(woff2?|png|jpg|svg|ico)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(put); }));
    return;
  }
  e.respondWith(fetch(req).then(put).catch(function () {
    return caches.match(req).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('/media').then(function (m) { return m || Response.error(); });
      return Response.error();
    });
  }));
});
