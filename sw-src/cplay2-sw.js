// cplay2 offline cache, built with Workbox (sw-src → public/cplay2-sw.js: `npm run build:sw`).
//  - pages: network first (fresh online, the cached copy offline; /media when the page was never opened)
//  - hashed build files, fonts, icons: cache first
//  - the cloud bins (studio worker /bin/…): network first with a 4 s limit, the last copy offline
//  - logos / thumbnails (/img, ytimg, yt3, 365scores): shown from cache at once and refreshed behind (stale-while-revalidate)
// API calls and live streams are never cached.
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k === 'cplay2-v1').map(k => caches.delete(k))))
  .then(() => self.clients.claim())));

const ok = new CacheableResponsePlugin({ statuses: [0, 200] });
const same = url => url.origin === self.location.origin;

registerRoute(({ url, request }) => same(url) && request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'cplay2-pages', networkTimeoutSeconds: 6, plugins: [ok, new ExpirationPlugin({ maxEntries: 40 })] }));
registerRoute(({ url, request }) => same(url) && !request.headers.has('range') && (url.pathname.startsWith('/_next/static/') || /\.(woff2?|png|jpg|svg|ico|webp)$/.test(url.pathname)),
  new CacheFirst({ cacheName: 'cplay2-static', plugins: [ok, new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 86400 })] }));
registerRoute(({ url }) => url.hostname === 'studio.c-p.workers.dev' && url.pathname.startsWith('/bin/'),
  new NetworkFirst({ cacheName: 'cplay2-bins', networkTimeoutSeconds: 4, plugins: [ok, new ExpirationPlugin({ maxEntries: 30 })],
    // ?v=<time> makes every request unique: cache them under the bin alone
    matchOptions: { ignoreSearch: true } }));
registerRoute(({ url, request }) => request.destination === 'image' && (/^(i\.ytimg\.com|yt3\.ggpht\.com|imagecache\.365scores\.com)$/.test(url.hostname) || (url.hostname === 'studio.c-p.workers.dev' && url.pathname === '/img')),
  new StaleWhileRevalidate({ cacheName: 'cplay2-images', plugins: [ok, new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 14 * 86400, purgeOnQuotaError: true })] }));

setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') return (await caches.match('/media', { cacheName: 'cplay2-pages' })) || Response.error();
  return Response.error();
});
