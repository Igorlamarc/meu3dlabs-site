/* ============================================================
   MEU 3D LABS — site-imagens.js
   Aplica as imagens cadastradas no admin sobre o HTML estático.

   REGRA DE OURO: o HTML continua com a imagem atual escrita.
   Este script só SUBSTITUI se a API responder. API fora do ar,
   erro de rede ou JS desativado → fica a imagem estática.
   NUNCA fica sem imagem.

   Um slot pode ter 1 ou várias imagens:
   1 imagem  → entra direto, como sempre.
   Várias    → vira carrossel automático (fade), sem tocar no
               carrossel nativo da página.
   ============================================================ */
(function () {
  'use strict';

  var API = 'https://meu3dlabs-backend.onrender.com/api/site-imagens';
  var INTERVALO_TROCA = 6000;

  /* ------------------------------------------------------------
     MAPA: slot → onde encontrar o elemento na página
     tipo 'bg'    → background-image no próprio elemento
     tipo 'img'   → src de uma <img>
     tipo 'lista' → carrossel (children viram as imagens do slot)
     idx          → qual ocorrência do seletor usar (0 = primeira)
     ------------------------------------------------------------ */
  var MAPA = {
    'index/intent-presentear': { sel: '.intent-card[data-tone="orange"]', tipo: 'bg' },
    'index/intent-decorar':    { sel: '.intent-card[data-tone="navy"]',   tipo: 'bg' },
    'index/intent-fe':         { sel: '.intent-card[data-tone="sage"]',   tipo: 'bg' },
    'index/intent-uso-diario': { sel: '.intent-card[data-tone="plum"]',   tipo: 'bg' },

    'index/sob-medida':        { sel: '.sob-medida-hero-img img', tipo: 'img' },

    'index/quem-somos-1':      { sel: '.about-image img', idx: 0, tipo: 'img' },
    'index/quem-somos-2':      { sel: '.about-image img', idx: 1, tipo: 'img' },

    'index/stories':           { sel: '#storiesTrack', tipo: 'lista' },

    'index/consultoria-1':     { sel: '.consultoria-card img', idx: 0, tipo: 'img' },
    'index/consultoria-2':     { sel: '.consultoria-card img', idx: 1, tipo: 'img' },

    'loja/banners':            { sel: '#bnrTrack', tipo: 'lista' },
    'consultoria/banners':     { sel: '#bncTrack', tipo: 'lista' },
    'assistencia/banner':      { sel: '.banner-wrap img', tipo: 'img' }
  };

  function acharElemento(conf) {
    var lista = document.querySelectorAll(conf.sel);
    if (!lista.length) return null;
    return lista[conf.idx || 0] || null;
  }

  /* ============================================================
     PORTFÓLIO DINÂMICO
     Cada bloco .cat-block vira um slot com o slug do título.
     Ex.: "Personalizados" → index/portfolio/personalizados
     ============================================================ */
  function slugificar(txt) {
    return String(txt || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function mapaPortfolio() {
    var blocos = document.querySelectorAll('.cat-block');
    var out = {};

    Array.prototype.forEach.call(blocos, function (b, i) {
      var h = b.querySelector('.cat-header h3')
           || b.querySelector('.cat-header h2')
           || b.querySelector('h3');
      var titulo = h ? h.textContent.trim() : ('Bloco ' + (i + 1));
      var chave = 'index/portfolio/' + (slugificar(titulo) || ('bloco-' + (i + 1)));
      var track = b.querySelector('.carousel-track') || b;
      out[chave] = track;
    });

    return out;
  }

  /* ---------- Troca suave entre várias imagens ---------- */
  function iniciarCiclo(aplicar, total) {
    if (total < 2) return;

    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % total;
      aplicar(i);
    }, INTERVALO_TROCA);
  }

  /* ---------- TIPO: background (1 ou várias) ---------- */
  function aplicarBg(el, itens) {
    function pintar(n) {
      el.style.backgroundImage = 'url("' + itens[n].url + '")';
    }
    el.style.transition = 'background-image .45s ease';
    pintar(0);
    iniciarCiclo(pintar, itens.length);
  }

  /* ---------- TIPO: img (1 ou várias) ---------- */
  function aplicarImg(el, itens) {
    function pintar(n) {
      el.src = itens[n].url;
      if (itens[n].alt) el.alt = itens[n].alt;
    }
    el.removeAttribute('srcset');
    pintar(0);
    iniciarCiclo(pintar, itens.length);
  }

  /* ---------- TIPO: lista (carrossel) ----------
     Mesma quantidade: troca 1:1, preservando o carrossel nativo.
     Quantidade diferente: reconstrói e assume o controle.
     ------------------------------------------------------------ */
  function aplicarLista(trilho, itens) {
    var filhos = Array.prototype.slice.call(trilho.children);
    if (!itens.length) return;

    if (filhos.length === itens.length) {
      for (var i = 0; i < itens.length; i++) {
        var img = filhos[i].querySelector('img');
        if (img) {
          img.src = itens[i].url;
          if (itens[i].alt) img.alt = itens[i].alt;
        }
        if (itens[i].link) {
          var a = filhos[i].querySelector('a') || filhos[i];
          if (a.tagName === 'A') a.href = itens[i].link;
        }
      }
      return;
    }

    var modelo = filhos[0];
    if (!modelo) return;

    var container = trilho.parentElement;
    var html = '';

    itens.forEach(function (it) {
      var clone = modelo.cloneNode(true);
      var img = clone.querySelector('img');
      var alt = it.alt || '';
      if (img) {
        img.src = it.url;
        img.alt = alt;
        img.removeAttribute('srcset');
      }
      if (it.link) {
        var a = document.createElement('a');
        a.className = clone.className;
        a.href = it.link;
        a.appendChild(clone);
        html += a.outerHTML;
      } else {
        html += clone.outerHTML;
      }
    });

    trilho.innerHTML = html;
    trilho.style.transform = 'translateX(0%)';
    trilho.dataset.current = '0';

    assumirCarrossel(container, trilho, itens.length);
  }

  function assumirCarrossel(container, trilho, total) {
    if (!container || total < 2) return;

    var idx = 0;

    var dots = container.querySelector(
      '.bnr-dots, .bn-dots, .carousel-dots, .stories-dots'
    );

    if (dots) {
      dots.innerHTML = '';
      for (var d = 0; d < total; d++) {
        var dot = document.createElement('div');
        dot.className = 'dot' + (d === 0 ? ' active' : '');
        dot.setAttribute('data-i', d);
        dot.style.cursor = 'pointer';
        dot.onclick = (function (n) {
          return function () { irPara(n); };
        })(d);
        dots.appendChild(dot);
      }
    }

    function irPara(n) {
      idx = ((n % total) + total) % total;
      trilho.style.transform = 'translateX(-' + (idx * 100) + '%)';
      if (dots) {
        Array.prototype.forEach.call(dots.children, function (el, k) {
          el.classList.toggle('active', k === idx);
          el.classList.toggle('on', k === idx);
        });
      }
    }

    ['.bnr-prev', '.bnr-next', '.bn-prev', '.bn-next',
     '.carousel-btn.prev', '.carousel-btn.next',
     '.bb-prev', '.bb-next', '.stories-prev', '.stories-next'
    ].forEach(function (sel) {
      var btn = container.querySelector(sel);
      if (!btn) return;
      var novo = btn.cloneNode(true);
      var paraFrente = /next/i.test(sel);
      novo.onclick = function (e) {
        e.preventDefault();
        irPara(idx + (paraFrente ? 1 : -1));
      };
      btn.parentNode.replaceChild(novo, btn);
    });

    var x0 = null;
    trilho.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX;
    }, { passive: true });

    trilho.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) irPara(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });

    setInterval(function () {
      if (document.hidden) return;
      irPara(idx + 1);
    }, 5500);
  }

  /* ---------- Aplicação ---------- */
  function aplicar(slots) {
    var port = null;

    Object.keys(slots).forEach(function (slot) {
      var itens = slots[slot] || [];
      if (!itens.length) return;

      var conf = MAPA[slot];

      if (!conf && slot.indexOf('index/portfolio/') === 0) {
        if (!port) port = mapaPortfolio();
        if (port[slot]) conf = { tipo: 'lista', elDireto: port[slot] };
      }

      if (!conf) return;

      var el = conf.elDireto || acharElemento(conf);
      if (!el) return;

      try {
        if (conf.tipo === 'bg')    aplicarBg(el, itens);
        if (conf.tipo === 'img')   aplicarImg(el, itens);
        if (conf.tipo === 'lista') aplicarLista(el, itens);
      } catch (e) {
        /* qualquer falha mantém a imagem estática */
      }
    });
  }

  /* ---------- Bootstrap ---------- */
  function iniciar() {
    fetch(API, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.slots) aplicar(d.slots);
      })
      .catch(function () { /* mantém o HTML estático */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();