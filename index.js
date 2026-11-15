/* ============================================================
   MEU 3D LABS — index.js v2.0
   Lógica da página inicial: carrosséis, stories, FAQ, menu
   mobile, botão topo, cookies e cards de produto (API).
   (Analytics e JSON-LD de SEO ficam no <head> do index.html)
   ============================================================ */

/* ---------- 0. HELPERS ---------- */
function m3dEsc(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function m3dBrl(v) {
  return 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');
}

function m3dMedidas(p) {
  var a = parseFloat(p.altura), g = parseFloat(p.peso), out = [];
  if (a > 0) out.push((a % 1 === 0 ? a.toFixed(0) : a.toFixed(1).replace('.', ',')) + ' cm');
  if (g > 0) out.push(
    g >= 1000
      ? ((g / 1000) % 1 === 0 ? (g / 1000).toFixed(0) : (g / 1000).toFixed(1).replace('.', ',')) + ' kg'
      : Math.round(g) + ' g'
  );
  return out.join(' · ');
}

/* ============================================================
   1. CARROSSEL DO PORTFÓLIO
   ============================================================ */
document.querySelectorAll('.carousel-track').forEach(function (track) {
  track.dataset.current = '0';
  var slides = track.children.length;
  var catBlock = track.closest('.cat-block');
  if (!catBlock) return;

  var dotsContainer = catBlock.querySelector('.carousel-dots');
  if (dotsContainer && slides > 1) {
    for (var i = 0; i < slides; i++) {
      var dot = document.createElement('div');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('data-i', i);
      dot.onclick = function () {
        var t = this.closest('.cat-block').querySelector('.carousel-track');
        irPara(t, parseInt(this.getAttribute('data-i'), 10));
      };
      dotsContainer.appendChild(dot);
    }
  }
});

function mover(btn, direction) {
  var track = btn.parentElement.querySelector('.carousel-track');
  if (!track) return;
  var current = parseInt(track.dataset.current, 10) || 0;
  var total = track.children.length;
  current += direction;
  if (current < 0) current = total - 1;
  if (current >= total) current = 0;
  track.dataset.current = current;
  track.style.transform = 'translateX(-' + current * 100 + '%)';
  atualizarDots(track, current);
}

function irPara(track, index) {
  track.dataset.current = index;
  track.style.transform = 'translateX(-' + index * 100 + '%)';
  atualizarDots(track, index);
}

function atualizarDots(track, current) {
  var catBlock = track.closest('.cat-block');
  if (!catBlock) return;
  var dotsContainer = catBlock.querySelector('.carousel-dots');
  if (!dotsContainer) return;
  dotsContainer.querySelectorAll('.dot').forEach(function (d) { d.classList.remove('active'); });
  var ad = dotsContainer.querySelector('.dot[data-i="' + current + '"]');
  if (ad) ad.classList.add('active');
}

/* Rotação automática do portfólio (4s) */
document.querySelectorAll('.carousel-track').forEach(function (track) {
  if (track.children.length > 1) {
    setInterval(function () {
      if (track.dataset.paused === 'true') return;
      var current = parseInt(track.dataset.current, 10) || 0;
      var total = track.children.length;
      current++;
      if (current >= total) current = 0;
      irPara(track, current);
    }, 4000);

    var wrap = track.closest('.carousel-wrap');
    if (wrap) {
      wrap.addEventListener('mouseenter', function () { track.dataset.paused = 'true'; });
      wrap.addEventListener('mouseleave', function () { track.dataset.paused = 'false'; });
    }
  }
});

/* ============================================================
   2. STORIES DE CLIENTES
   ============================================================ */
var storiesTrack = document.getElementById('storiesTrack');
var totalStories = 0;
var storiesDots = null;
var storiesCounter = null;

if (storiesTrack) {
  storiesTrack.dataset.current = '0';
  totalStories = storiesTrack.children.length;
  storiesDots = document.getElementById('storiesDots');
  storiesCounter = document.getElementById('storiesCounter');

  if (storiesDots) {
    for (var si = 0; si < totalStories; si++) {
      var sdot = document.createElement('div');
      sdot.className = 'dot' + (si === 0 ? ' active' : '');
      sdot.setAttribute('data-i', si);
      sdot.onclick = function () { irParaStory(parseInt(this.getAttribute('data-i'), 10)); };
      storiesDots.appendChild(sdot);
    }
  }
}

function moverStory(btn, direction) {
  if (!storiesTrack) return;
  var current = parseInt(storiesTrack.dataset.current, 10) || 0;
  current += direction;
  if (current < 0) current = totalStories - 1;
  if (current >= totalStories) current = 0;
  irParaStory(current);
}

function irParaStory(index) {
  if (!storiesTrack) return;
  storiesTrack.dataset.current = index;
  storiesTrack.style.transform = 'translateX(-' + index * 100 + '%)';

  if (storiesDots) {
    storiesDots.querySelectorAll('.dot').forEach(function (d) { d.classList.remove('active'); });
    var ad = storiesDots.querySelector('.dot[data-i="' + index + '"]');
    if (ad) ad.classList.add('active');
  }
  if (storiesCounter) {
    storiesCounter.textContent = (index + 1) + ' / ' + totalStories;
  }
}

/* Rotação automática dos stories (5s) */
if (storiesTrack && totalStories > 1) {
  setInterval(function () {
    if (storiesTrack.dataset.paused === 'true') return;
    var current = parseInt(storiesTrack.dataset.current, 10) || 0;
    current++;
    if (current >= totalStories) current = 0;
    irParaStory(current);
  }, 5000);

  var storiesWrap = storiesTrack.closest('.stories-carousel');
  if (storiesWrap) {
    storiesWrap.addEventListener('mouseenter', function () { storiesTrack.dataset.paused = 'true'; });
    storiesWrap.addEventListener('mouseleave', function () { storiesTrack.dataset.paused = 'false'; });
  }
}

/* ============================================================
   3. FAQ — ACORDEÃO (fecha os outros ao abrir um)
   ============================================================ */
function toggleFaq(el) {
  var item = el.parentElement;
  var isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(function (f) { f.classList.remove('open'); });
  if (!isOpen) item.classList.add('open');
}

/* ============================================================
   4. ANIMAÇÃO DE ENTRADA (fade-in ao rolar)
   ============================================================ */
if ('IntersectionObserver' in window) {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(function (el) { observer.observe(el); });
}

/* ============================================================
   5. MENU MOBILE (DRAWER)
   ============================================================ */
(function () {
  var menuToggle = document.getElementById('menuToggle');
  var drawer = document.getElementById('drawer');
  var drawerOverlay = document.getElementById('drawerOverlay');
  var drawerClose = document.getElementById('drawerClose');

  if (!menuToggle || !drawer || !drawerOverlay) return;

  function abrirDrawer() {
    menuToggle.classList.add('open');
    drawer.classList.add('open');
    drawerOverlay.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function fecharDrawer() {
    menuToggle.classList.remove('open');
    drawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', function () {
    if (drawer.classList.contains('open')) fecharDrawer();
    else abrirDrawer();
  });

  if (drawerClose) drawerClose.addEventListener('click', fecharDrawer);
  drawerOverlay.addEventListener('click', fecharDrawer);
  drawer.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', fecharDrawer);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharDrawer();
  });
})();

/* ============================================================
   6. GESTOS DE TOQUE — arrastar carrosséis e stories
   ============================================================ */
document.querySelectorAll('[data-swipe]').forEach(function (track) {
  var isStory = track.id === 'storiesTrack';
  var startX = 0;
  var currentX = 0;
  var isDragging = false;

  track.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    isDragging = true;
    track.dataset.paused = 'true';
  }, { passive: true });

  track.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', function () {
    if (!isDragging) return;
    var diff = currentX - startX;

    if (Math.abs(diff) > 50) {
      if (diff < 0) {
        /* arrastou para a esquerda → próximo */
        if (isStory) {
          var c = parseInt(storiesTrack.dataset.current, 10) || 0;
          c++;
          if (c >= totalStories) c = 0;
          irParaStory(c);
        } else {
          var btnNext = track.parentElement.querySelector('.next');
          if (btnNext) mover(btnNext, 1);
        }
      } else {
        /* arrastou para a direita → anterior */
        if (isStory) {
          var c2 = parseInt(storiesTrack.dataset.current, 10) || 0;
          c2--;
          if (c2 < 0) c2 = totalStories - 1;
          irParaStory(c2);
        } else {
          var btnPrev = track.parentElement.querySelector('.prev');
          if (btnPrev) mover(btnPrev, -1);
        }
      }
    }

    isDragging = false;
    startX = 0;
    currentX = 0;
    setTimeout(function () { track.dataset.paused = 'false'; }, 3000);
  }, { passive: true });
});

/* ============================================================
   7. BOTÃO VOLTAR AO TOPO
   ============================================================ */
(function () {
  var topBtn = document.getElementById('topBtn');
  if (!topBtn) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > window.innerHeight * 0.5) topBtn.classList.add('show');
    else topBtn.classList.remove('show');
  });

  topBtn.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ============================================================
   8. BANNER DE COOKIES
   ============================================================ */
(function () {
  var cookieBanner = document.getElementById('cookieBanner');
  if (!cookieBanner) return;

  if (!localStorage.getItem('m3d_cookies_aceitos')) {
    cookieBanner.classList.add('show');
  }
})();

function aceitarCookies() {
  localStorage.setItem('m3d_cookies_aceitos', 'sim');
  var banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('show');
}

/* ============================================================
   9. NOVIDADES NA LOJA (#novidadesGrid) — 4 produtos com card premium
   ============================================================ */
(function () {
  var alvo = document.getElementById('novidadesGrid');
  if (!alvo) return;

  fetch('https://meu3dlabs-backend.onrender.com/api/loja/produtos', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var lista = d.produtos || d || [];
      if (!Array.isArray(lista)) lista = [];

      lista = lista.filter(function (p) {
        return p.ativo !== false && (parseInt(p.estoque, 10) || 0) > 0;
      });

      /* destaque primeiro, depois os demais */
      lista.sort(function (a, b) {
        return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0);
      });

      var sel = lista.slice(0, 4);
      if (!sel.length) {
        var sec = alvo.closest('section');
        if (sec) sec.style.display = 'none';
        return;
      }

      var html = '';
      sel.forEach(function (p) {
        var precoN = parseFloat(p.preco) || 0;
        var promo = p.promo && parseFloat(p.precoPromo) > 0 && parseFloat(p.precoPromo) < precoN;
        var precoV = promo ? parseFloat(p.precoPromo) : precoN;
        var pix = Math.round(precoV * 0.95 * 100) / 100;
        var img = (p.imagens && p.imagens[0]) || '';
        var est = parseInt(p.estoque, 10) || 0;
        var m = m3dMedidas(p);
        var slug = p.slug || '';
      var M3D_LOCAL = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
var link = M3D_LOCAL ? ('produto.html?produto=' + encodeURIComponent(slug)) : ('produto/' + encodeURIComponent(slug));

        html += '<a class="product-card" href="' + link + '">'
          + '<div class="product-media">'
          + (img ? '<img src="' + m3dEsc(img) + '" alt="' + m3dEsc(p.nome) + '" loading="lazy">' : '')
          + (promo
              ? '<span class="product-badge badge-promo">-' + Math.round((1 - precoV / precoN) * 100) + '%</span>'
              : (est <= 3 ? '<span class="product-badge badge-last">Últimas ' + est + '</span>' : ''))
          + (m ? '<span class="product-dim">' + m + '</span>' : '')
          + '</div>'
          + '<div class="product-body">'
          + '<span class="product-cat">' + m3dEsc(p.categoria || '') + '</span>'
          + '<h3 class="product-title">' + m3dEsc(p.nome) + '</h3>'
          + '<div class="product-price">'
          + '<span class="product-price-now">' + m3dBrl(precoV) + '</span>'
          + (promo ? '<span class="product-price-was">' + m3dBrl(precoN) + '</span>' : '')
          + '</div>'
          + '<span class="product-pix">' + m3dBrl(pix) + ' no Pix · 5% OFF</span>'
          + '</div></a>';
      });

      alvo.innerHTML = html;
    })
    .catch(function () {
      var sec = alvo.closest('section');
      if (sec) sec.style.display = 'none';
    });
})();

/* ============================================================
   10. DESTAQUES DA LOJA (#destaquesGrid) — até 8 produtos
   ============================================================ */
(function () {
  var grid = document.getElementById('destaquesGrid');
  var section = document.getElementById('destaquesLoja');
  if (!grid || !section) return;

  fetch('https://meu3dlabs-backend.onrender.com/api/loja/produtos', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (t) {
      var lista = (t.produtos || t || []);
      if (!Array.isArray(lista)) lista = [];
      lista = lista.filter(function (p) { return p.ativo !== false; });

      var destaques = lista.filter(function (p) { return p.destaque; });
      var mostrar = destaques.length ? destaques : lista.slice(0, 4);
      if (!mostrar.length) return;

      var html = '';
      mostrar.slice(0, 8).forEach(function (p) {
        var img = (p.imagens && p.imagens[0]) || '';
        var nome = m3dEsc(p.nome);
        var preco = m3dBrl(p.preco);
        var link = 'produto/' + encodeURIComponent(p.slug || '');

        html += '<div class="dst-card">'
          + (img
              ? '<a class="dst-img" href="' + link + '"><img src="' + m3dEsc(img) + '" alt="' + nome + '" loading="lazy"></a>'
              : '<a class="dst-img dst-noimg" href="' + link + '">📦</a>')
          + '<div class="dst-body">'
          + '<h3>' + nome + '</h3>'
          + '<div class="dst-preco">' + preco + '</div>'
          + '<a class="btn dst-btn" href="' + link + '">Ver peça</a>'
          + '</div></div>';
      });

      grid.innerHTML = html;
      section.style.display = 'block';
    })
    .catch(function () {});
})();

/* ============================================================
   SEÇÕES RECOLHÍVEIS — abrir automaticamente quando o link
   aponta para uma seção fechada (menu, rodapé, âncoras)
   ============================================================ */
(function(){
  'use strict';

  function abrirPorHash(){
    var hash = window.location.hash;
    if(!hash || hash.length < 2) return;

    var id = hash.slice(1);
    var alvo = document.getElementById(id);
    if(!alvo) return;

    /* Sobe na árvore até achar um <details> que contenha o alvo */
    var details = alvo.closest('details.sec-collapse');
    if(!details) return;

    details.open = true;

    /* Rola até ela, com folga para o header fixo */
    setTimeout(function(){
      var topo = details.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: topo, behavior: 'smooth' });
    }, 80);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', abrirPorHash);
  }else{
    abrirPorHash();
  }

  /* Clique em link interno com hash (rodapé → #quem-somos, etc.) */
  document.addEventListener('click', function(e){
    var link = e.target.closest('a[href^="#"]');
    if(!link) return;

    var href = link.getAttribute('href');
    if(!href || href === '#' || href.length < 2) return;

    var id = href.slice(1);
    var alvo = document.getElementById(id);
    if(!alvo) return;

    var details = alvo.closest('details.sec-collapse');
    if(details && !details.open){
      e.preventDefault();
      details.open = true;
      setTimeout(function(){
        var topo = details.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: topo, behavior: 'smooth' });
        history.replaceState(null, '', '#' + id);
      }, 80);
    }
  });

  window.addEventListener('hashchange', abrirPorHash);
})();

/* ============================================================
   HERO CARROSSEL — produtos mais recentes da loja
   Ordenação em 3 níveis:
     1. data de criação (se a API fornecer)
     2. ordem inversa do array (último cadastrado primeiro)
     3. fallback: mantém a ordem retornada
   Atualiza automaticamente: a cada carregamento da página
   ============================================================ */
(function(){
  'use strict';

  var elCarrossel = document.getElementById('heroCarrossel');
  var elTrack     = document.getElementById('hcTrack');
  var elDots      = document.getElementById('hcDots');
  var elPrev      = document.getElementById('hcPrev');
  var elNext      = document.getElementById('hcNext');
  if(!elCarrossel || !elTrack) return;

  var API = 'https://meu3dlabs-backend.onrender.com/api/loja/produtos';
  var INTERVALO = 5000;      /* 5 segundos */
  var MAX_SLIDES = 6;        /* limita o peso do carregamento */

  var slides = [];
  var idx = 0;
  var timer = null;
  var pausado = false;

  /* ---------- HELPERS ---------- */
  function brl(v){
    return 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');
  }
  function esc(s){
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }
  function isLocal(){
    return location.protocol === 'file:' ||
           location.hostname === 'localhost' ||
           location.hostname === '127.0.0.1';
  }
  function linkProduto(slug){
    return isLocal()
      ? 'produto.html?produto=' + encodeURIComponent(slug)
      : 'produto/' + encodeURIComponent(slug);
  }

  /* ---------- EXTRAI DATA DE CRIAÇÃO ---------- */
  function dataCriacao(p){
    var campos = [
      'criadoEm','criado_em','createdAt','created_at',
      'dataCriacao','data_criacao','dt_cadastro','cadastradoEm'
    ];
    for(var i = 0; i < campos.length; i++){
      var v = p[campos[i]];
      if(v){
        var t = new Date(v).getTime();
        if(t && !isNaN(t)) return t;
      }
    }
    return 0;
  }

  /* ---------- ORDENA: MAIS RECENTE PRIMEIRO ---------- */
  function ordenarRecentes(lista){
    var comData = lista.filter(function(p){ return dataCriacao(p) > 0; });
    var semData = lista.filter(function(p){ return !dataCriacao(p); });

    if(comData.length){
      comData.sort(function(a, b){
        return dataCriacao(b) - dataCriacao(a);
      });
    }
    /* Sem data: assume que a API retorna em ordem de cadastro,
       então invertemos para pegar o último cadastrado primeiro */
    semData.reverse();

    return comData.concat(semData);
  }

  /* ---------- MONTA OS SLIDES ---------- */
  function montar(produtos){
    elTrack.innerHTML = '';
    elDots.innerHTML = '';
    slides = [];

    produtos.slice(0, MAX_SLIDES).forEach(function(p, i){
      var img = (p.imagens && p.imagens[0]) ? p.imagens[0] : '';
      if(!img) return;

      var precoN = parseFloat(p.preco) || 0;
      var promo = p.promo &&
                  parseFloat(p.precoPromo) > 0 &&
                  parseFloat(p.precoPromo) < precoN;
      var precoV = promo ? parseFloat(p.precoPromo) : precoN;
      var descPct = promo ? Math.round((1 - precoV / precoN) * 100) : 0;

      var a = document.createElement('a');
      a.className = 'hc-slide';
      a.href = linkProduto(p.slug || '');
      a.setAttribute('aria-label', 'Ver produto: ' + (p.nome || ''));

      var html = '';
      html += '<img src="' + esc(img) + '" alt="' + esc(p.nome) + '"' +
              (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + '>';
      if(promo && descPct > 0){
        html += '<span class="hc-badge">-' + descPct + '%</span>';
      }
      html += '<span class="hc-selo">' +
                '<span class="hc-nome">' + esc(p.nome) + '</span>' +
                '<span class="hc-preco">' + brl(precoV) + '</span>' +
              '</span>';

      a.innerHTML = html;
      elTrack.appendChild(a);
      slides.push(a);

      /* Bolinha */
      var b = document.createElement('button');
      b.className = 'hc-dot' + (i === 0 ? ' on' : '');
      b.setAttribute('aria-label', 'Ir para o produto ' + (i + 1));
      b.onclick = (function(n){
        return function(e){
          e.preventDefault();
          e.stopPropagation();
          irPara(n);
          reiniciar();
        };
      })(i);
      elDots.appendChild(b);
    });

    /* Esconde controles se houver 1 slide só */
    var soUm = slides.length <= 1;
    elDots.style.display = soUm ? 'none' : 'flex';
    if(elPrev) elPrev.style.display = soUm ? 'none' : '';
    if(elNext) elNext.style.display = soUm ? 'none' : '';

    if(slides.length) irPara(0);
  }

  /* ---------- NAVEGAÇÃO ---------- */
  function irPara(n){
    if(!slides.length) return;
    idx = (n + slides.length) % slides.length;
    elTrack.style.transform = 'translateX(-' + (idx * 100) + '%)';

    var dots = elDots.children;
    for(var i = 0; i < dots.length; i++){
      dots[i].className = 'hc-dot' + (i === idx ? ' on' : '');
    }
  }

  function proximo(){ irPara(idx + 1); }
  function anterior(){ irPara(idx - 1); }

  /* ---------- AUTOMÁTICO ---------- */
  function iniciar(){
    parar();
    if(slides.length <= 1) return;
    timer = setInterval(function(){
      if(!pausado && !document.hidden) proximo();
    }, INTERVALO);
  }
  function parar(){
    if(timer){ clearInterval(timer); timer = null; }
  }
  function reiniciar(){ iniciar(); }

  /* ---------- EVENTOS ---------- */
  if(elPrev) elPrev.addEventListener('click', function(e){
    e.preventDefault();
    anterior();
    reiniciar();
  });
  if(elNext) elNext.addEventListener('click', function(e){
    e.preventDefault();
    proximo();
    reiniciar();
  });

  /* Pausa no hover (desktop) */
  elCarrossel.addEventListener('mouseenter', function(){ pausado = true; });
  elCarrossel.addEventListener('mouseleave', function(){ pausado = false; });

  /* Swipe no mobile */
  var x0 = null;
  elCarrossel.addEventListener('touchstart', function(e){
    x0 = e.touches[0].clientX;
    pausado = true;
  }, { passive: true });

  elCarrossel.addEventListener('touchend', function(e){
    if(x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx) > 40){
      if(dx < 0) proximo();
      else anterior();
      reiniciar();
    }
    setTimeout(function(){ pausado = false; }, 3000);
    x0 = null;
  }, { passive: true });

  /* Pausa quando a aba está escondida */
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) parar();
    else iniciar();
  });

  /* ---------- CARREGA OS PRODUTOS ---------- */
  fetch(API, { cache: 'no-store' })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(d){
      var lista = d.produtos || d || [];
      if(!Array.isArray(lista)) lista = [];

      /* Filtra: ativo e com estoque */
      lista = lista.filter(function(p){
        return p.ativo !== false && (parseInt(p.estoque, 10) || 0) > 0;
      });

      /* Filtra: só com imagem (sem imagem não tem slide) */
      lista = lista.filter(function(p){
        return p.imagens && p.imagens.length && p.imagens[0];
      });

      if(!lista.length){
        /* Sem produtos: mantém o carrossel escondido e mostra a
           imagem padrão de fallback */
        elCarrossel.innerHTML =
          '<img src="img/portfolio/Hero.png" ' +
          'alt="Peça 3D personalizada feita pela Meu 3D Labs" ' +
          'fetchpriority="high" style="width:100%;height:100%;object-fit:cover;">' +
          '<span class="hero-selo">✦ Feito sob medida</span>';
        return;
      }

      /* Ordena: mais recentes primeiro */
      var ordenados = ordenarRecentes(lista);

      /* Monta e inicia */
      montar(ordenados);
      iniciar();
    })
    .catch(function(){
      /* Falha na API: fallback para a imagem estática */
      elCarrossel.innerHTML =
        '<img src="img/portfolio/Hero.png" ' +
        'alt="Peça 3D personalizada feita pela Meu 3D Labs" ' +
        'fetchpriority="high" style="width:100%;height:100%;object-fit:cover;">' +
        '<span class="hero-selo">✦ Feito sob medida</span>';
    });
})();