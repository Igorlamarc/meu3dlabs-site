/* Service worker do painel: network-first (nunca serve versão velha),
   cache só como fallback offline. API do backend NUNCA é cacheada. */

var CACHE = 'm3d-admin-v5';

/* Precache tolerante: um arquivo ausente NÃO derruba a instalação */
var ASSETS = [
  'admin.html',
  'admin.css',
  'admin-extras.css',
  'admin-modelagem.css',
  'admin-modern.css',
  'admin-layout.css',
  'admin.js',
  'admin-extras.js',
  'admin-modelagem.js',
  'admin-modern.js',
  'admin-unify.js',
  'admin-mobile.js',
  'admin-orcamento-card.js',
  'admin-loja.html',
  'admin-loja.css',
  'admin-loja.js',
  'acompanhar.html',
  'acompanhar.css',
  'acompanhar.js',
  'img/logo/logo.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* cada arquivo é independente: um 404 não cancela os outros */
      return Promise.all(
        ASSETS.map(function (url) {
          return c.add(url).catch(function () {
            /* ignora arquivo ausente e segue */
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(
        ks.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = req.url;

  /* Só cacheia GET */
  if (req.method !== 'GET') return;

  /* API do backend nunca é cacheada */
  if (url.indexOf('/api/') !== -1) return;

  /* Extensões e origens externas ignoradas */
  if (url.indexOf('chrome-extension://') === 0) return;
  if (url.indexOf('http') !== 0) return;

  var origem;
  try { origem = new URL(url); } catch (err) { return; }
  if (origem.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(function (r) {
        /* Só guarda respostas válidas */
        if (r && r.status === 200 && r.type === 'basic') {
          var cp = r.clone();
          caches.open(CACHE)
            .then(function (c) { c.put(req, cp); })
            .catch(function () {});
        }
        return r;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          /* navegação sem cache: devolve o próprio pedido de rede */
          if (req.mode === 'navigate') {
            return caches.match('admin.html').then(function (pag) {
              return pag || Response.error();
            });
          }
          return Response.error();
        });
      })
  );
});

/* ============================================================
   WEB PUSH — notificações com o app fechado/tela bloqueada
   ============================================================ */

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }

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

self.addEventListener('notificationclick', function (e) {
  e.notification.close();

  var destino = (e.notification.data && e.notification.data.url) || '/admin.html';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.url.indexOf(self.location.origin) === 0) {
          return c.focus().then(function () {
            if (c.navigate) return c.navigate(destino);
            return c;
          });
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});