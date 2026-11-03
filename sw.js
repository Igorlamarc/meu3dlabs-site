/* Service worker do painel: network-first (nunca serve versão velha),
   cache só como fallback offline. API do backend NUNCA é cacheada. */
var CACHE = 'm3d-admin-v2';
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
  var req = e.request;
  var url = req.url;

  /* ✅ Só cacheia GET — resolve o TypeError do POST */
  if (req.method !== 'GET') return;

  /* ✅ API do backend nunca é cacheada */
  if (url.indexOf('/api/') !== -1) return;

  /* ✅ Extensões e origens externas ignoradas */
  if (url.indexOf('chrome-extension://') === 0) return;
  if (new URL(url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function(r){
      /* Só guarda respostas válidas */
      if (r && r.status === 200 && r.type === 'basic') {
        var cp = r.clone();
        caches.open(CACHE).then(function(c){ c.put(req, cp); }).catch(function(){});
      }
      return r;
    }).catch(function(){ return caches.match(req); })
  );
});