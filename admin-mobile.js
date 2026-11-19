/* ============================================================
   Meu 3D Labs — admin-mobile.js
   Carregar DEPOIS de admin.js, admin-extras.js,
   admin-modelagem.js, admin-modern.js e admin-unify.js.

   Por que existe: o layout de cartão não pode depender apenas de
   media query. Este script mede a largura real e liga/desliga a
   classe `m3d-cards` no <html>, que é o que o admin-layout.css
   usa como gatilho.

   Também reinjeta a classe depois de cada redesenho da tabela
   (o painel recarrega a cada 30s e apaga/recria as linhas).

   Não altera regra de negócio, preço, estoque nem fluxo.
   ============================================================ */
(function () {
  'use strict';
  if (window.__m3dMobile) return;
  window.__m3dMobile = true;

  var LIMITE = 1100;      /* abaixo disso, vira cartão */
  var raiz = document.documentElement;
  var timerObs = null;
  var timerResize = null;
  var ultimoModo = null;

  /* Largura efetiva.
     O menor valor entre janela, área visível e tela física.
     O `screen.width` como teto garante que num celular caia em
     modo cartão mesmo se o viewport for interpretado errado. */
  function larguraEfetiva() {
    var w1 = window.innerWidth || 0;
    var w2 = (document.documentElement && document.documentElement.clientWidth) || 0;
    var w3 = (window.screen && window.screen.width) || 0;
    var lista = [];
    if (w1 > 0) lista.push(w1);
    if (w2 > 0) lista.push(w2);
    if (w3 > 0) lista.push(w3);
    if (!lista.length) return 1280;
    return Math.min.apply(null, lista);
  }

  function aplicar() {
    var largura = larguraEfetiva();
    var modoCartao = largura <= LIMITE;

    if (modoCartao) {
      raiz.classList.add('m3d-cards');
    } else {
      raiz.classList.remove('m3d-cards');
    }

    if (ultimoModo !== modoCartao) {
      ultimoModo = modoCartao;
      /* avisa o CSS e evita transição estranha ao trocar de modo */
      document.body.classList.toggle('m3d-compact-mode', modoCartao);
    }
  }

  /* Reaplica depois de qualquer redesenho da tabela */
  function observar() {
    var alvos = ['tabelaBody', 'modTbody'];
    alvos.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.__m3dObs) return;
      el.__m3dObs = new MutationObserver(function () {
        clearTimeout(timerObs);
        timerObs = setTimeout(aplicar, 60);
      });
      el.__m3dObs.observe(el, { childList: true, subtree: true });
    });
  }

  /* Redimensionar / girar o celular */
  function aoRedimensionar() {
    clearTimeout(timerResize);
    timerResize = setTimeout(function () {
      aplicar();
      observar();
    }, 120);
  }

  window.addEventListener('resize', aoRedimensionar);
  window.addEventListener('orientationchange', aoRedimensionar);
  window.addEventListener('load', function () {
    aplicar();
    observar();
  });

  document.addEventListener('DOMContentLoaded', function () {
    aplicar();
    observar();
  });

  /* Primeiras execuções: antes e depois do painel montar */
  aplicar();
  setTimeout(aplicar, 120);
  setTimeout(function () {
    aplicar();
    observar();
  }, 600);
  setTimeout(function () {
    aplicar();
    observar();
  }, 1800);

  /* Se o painel trocar de aba, a estrutura muda */
  var _mudarAba = window.mudarAba;
  if (typeof _mudarAba === 'function') {
    window.mudarAba = function () {
      var r = _mudarAba.apply(this, arguments);
      setTimeout(function () {
        aplicar();
        observar();
      }, 160);
      return r;
    };
  }

  /* Exposição para depuração no console */
  window.m3dMobile = {
    aplicar: aplicar,
    largura: larguraEfetiva,
    modo: function () {
      return raiz.classList.contains('m3d-cards') ? 'cartao' : 'tabela';
    }
  };

  console.log('[admin-mobile] ativo — largura detectada:', larguraEfetiva());
})();