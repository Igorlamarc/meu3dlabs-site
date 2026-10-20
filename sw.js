/* Service worker do painel: network-first (nunca serve versão velha),
   cache só como fallback offline. API do backend NUNCA é cacheada. */
var CACHE = 'm3d-admin-v1';
var ASSETS = ['admin.html','admin.css','admin.js','admin-extras.js','admin-extras.css','img/logo/logo.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e){
  var url = e.request.url;
  if (url.indexOf('/api/') !== -1) return; /* pedidos sempre da rede */
  e.respondWith(
    fetch(e.request).then(function(r){
      var cp = r.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, cp); });
      return r;
    }).catch(function(){ return caches.match(e.request); })
  );
});