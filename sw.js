/* Service worker do painel: network-first (nunca serve versão velha),
   cache só como fallback offline. API do backend NUNCA é cacheada. */
var CACHE = 'm3d-admin-v4';
var ASSETS = [
  'admin.html','admin.css','admin.js','admin-extras.js','admin-extras.css',
  'admin-modelagem.js','admin-modelagem.css',
  'admin-loja.js','admin-loja.css','admin-loja.html',
  'acompanhar.html','acompanhar.js','acompanhar.css',
  'img/logo/logo.png'
];

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

/* ============================================================
   WEB PUSH — notificações com o app fechado/tela bloqueada
   ============================================================ */

self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ d = {}; }

  var titulo = d.titulo || 'Meu 3D Labs';
  var corpo  = d.corpo  || 'Novo pedido recebido';

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/img/logo/logo.png',
      badge: '/favicon-32x32.png',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      tag: d.tag || 'pedido',
      renotify: true,
      data: { url: d.url || '/admin.html' }
    })
  );
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();

  var destino = (e.notification.data && e.notification.data.url) || '/admin.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(lista){
      for (var i = 0; i < lista.length; i++){
        var c = lista[i];
        if (c.url.indexOf(self.location.origin) === 0) {
          return c.focus().then(function(){
            if (c.navigate) return c.navigate(destino);
            return c;
          });
        }
      }
      return clients.openWindow(destino);
    })
  );
});