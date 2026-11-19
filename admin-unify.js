/* ============================================================
   Meu 3D Labs — admin-unify.js
   Carregar DEPOIS de admin.js, admin-extras.js,
   admin-modelagem.js e admin-modern.js.

   Objetivo: a aba Modelagem deixa de ser uma "página separada"
   e passa a viver dentro do mesmo painel, com a barra de ações
   e as abas sempre visíveis.

   Não altera regra de negócio, preço, estoque nem fluxo.
   ============================================================ */
(function () {
  'use strict';
  if (window.__m3dUnify) return;
  window.__m3dUnify = true;

  function safe(fn) {
    try { return fn(); } catch (e) { console.warn('[unify]', e); }
  }

  /* Elementos que só fazem sentido nas abas de pedidos */
  var OCULTAR_NA_MODELAGEM = [
    'statsGrid',      /* cards de estatística */
    'visaoChips',     /* Ativos / Entregues / Encerrados */
    'prazoChips',     /* Atrasados / Hoje / Semana */
    'm3lResumo',      /* resumo do dia */
    'm3lKanban',      /* quadro Kanban */
    'vazio'
  ];

  /* Botões da barra que não se aplicam à Modelagem */
  var BOTOES_SO_PEDIDOS = ['m3lBtnKanban', 'm3lBtnColunas'];

  function aplicarModoModelagem(ativo) {
    var painel = document.getElementById('painelModelagem');
    var main = document.getElementById('mainContent');

    if (ativo) {
      /* mantém o container visível: barra, abas e título continuam no lugar */
      if (main) main.style.display = '';

      OCULTAR_NA_MODELAGEM.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      document.querySelectorAll('#mainContent .table-wrap').forEach(function (el) {
        el.style.display = 'none';
      });

      BOTOES_SO_PEDIDOS.forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.style.display = 'none';
      });

      var t = document.getElementById('tituloPainel');
      if (t) t.textContent = '🗂️ Modelagem 3D';

      if (painel) painel.style.display = 'block';
    } else {
      if (painel) painel.style.display = 'none';

      OCULTAR_NA_MODELAGEM.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = '';
      });

      document.querySelectorAll('#mainContent .table-wrap').forEach(function (el) {
        el.style.display = '';
      });

      BOTOES_SO_PEDIDOS.forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.style.display = '';
      });
    }
  }

  /* ============================================================
     MESCLAR MODELAGEM NO ESTADO GLOBAL
     Sem isso, Kanban, Números, Backup e busca global ignoram
     todas as solicitações de modelagem.
     ============================================================ */
  function mesclarModelagem() {
    var mod = window.modModelagem;
    if (!mod || !Array.isArray(mod.itens)) return;

    var st = window.servicoTipo || function () { return 'orcamentos'; };

    /* mantém o que já existe, tirando modelagem duplicada */
    var base = (window.orcamentos || []).filter(function (p) {
      return st(p) !== 'modelagem';
    });

    window.orcamentos = base.concat(mod.itens);
  }

  function atualizarContadores() {
    var mod = window.modModelagem;
    var n = (mod && mod.itens) ? mod.itens.length : 0;
    ['countModelagem', 'countModelagem2', 'tab-modelagem-count'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = n;
    });
  }

  /* ============================================================
     VESTIR O MÓDULO DE MODELAGEM
     Envolve o carregar() dele para mesclar sempre que atualizar.
     ============================================================ */
  function vestirModelagem() {
    var mod = window.modModelagem;
    if (!mod || typeof mod.carregar !== 'function') return false;
    if (mod.__vestido) return true;

    var original = mod.carregar;
    mod.carregar = function () {
      var r = original.apply(this, arguments);
      return Promise.resolve(r)
        .then(function () {
          safe(mesclarModelagem);
          safe(atualizarContadores);
        })
        .catch(function () {});
    };
    mod.__vestido = true;
    return true;
  }

  /* tenta vestir por até 10 segundos, caso o módulo ainda não exista */
  (function tentar() {
    var n = 0;
    var iv = setInterval(function () {
      n++;
      if (vestirModelagem() || n > 40) {
        clearInterval(iv);
        safe(mesclarModelagem);
        safe(atualizarContadores);
      }
    }, 250);
  })();

  /* ============================================================
     MUDAR ABA — mantém o painel unificado
     ============================================================ */
  var _mudarAba = window.mudarAba;
  if (typeof _mudarAba === 'function') {
    window.mudarAba = function (tipo) {
      var r = _mudarAba.apply(this, arguments);
      safe(function () { aplicarModoModelagem(tipo === 'modelagem'); });
      if (tipo === 'modelagem') {
        safe(mesclarModelagem);
        safe(atualizarContadores);
      }
      return r;
    };
  }

  /* ============================================================
     GARANTIA: nenhuma promise de polling fica pendurada
     (a camada admin-modern devolve promise que nunca resolve
     quando a aba está oculta — isso trava o Promise.all)
     ============================================================ */
  var _fetch = window.fetch;
  if (typeof _fetch === 'function') {
    window.fetch = function (url, opts) {
      var p = _fetch.apply(this, arguments);
      var u = String(url || '');
      var m = (opts && opts.method) ? String(opts.method).toUpperCase() : 'GET';
      var ehPoll = (m === 'GET') && (u.indexOf('/orcamentos') !== -1 || u.indexOf('/loja/pedidos') !== -1);

      if (!ehPoll || !p || typeof p.then !== 'function') return p;

      return new Promise(function (resolve, reject) {
        var fim = false;
        var t = setTimeout(function () {
          if (fim) return;
          fim = true;
          reject(new Error('timeout'));
        }, 15000);
        p.then(
          function (r) { if (!fim) { fim = true; clearTimeout(t); resolve(r); } },
          function (e) { if (!fim) { fim = true; clearTimeout(t); reject(e); } }
        );
      });
    };
  }

  /* ============================================================
     META MENSAL — alinhar as duas chaves antigas
     ============================================================ */
  function alinharMeta() {
    try {
      var a = localStorage.getItem('m3l_meta');
      var b = localStorage.getItem('m3d_meta_mensal');
      if (!a && b) localStorage.setItem('m3l_meta', b);
      if (a && !b) localStorage.setItem('m3d_meta_mensal', a);
      if (a && b && a !== b) {
        var na = parseFloat(a) || 0;
        var nb = parseFloat(b) || 0;
        var v = String(na > nb ? na : nb);
        localStorage.setItem('m3l_meta', v);
        localStorage.setItem('m3d_meta_mensal', v);
      }
    } catch (e) {}
  }
  alinharMeta();

  /* ============================================================
     GANCHO NO RENDER
     ============================================================ */
  var _render = window.renderizar;
  if (typeof _render === 'function') {
    window.renderizar = function () {
      var r = _render.apply(this, arguments);
      safe(atualizarContadores);
      safe(alinharMeta);
      return r;
    };
  }

  /* ============================================================
     ESTADO INICIAL
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      safe(function () {
        var ativo = window.tipoAtivo === 'modelagem';
        aplicarModoModelagem(ativo);
      });
    }, 400);
  });

  console.log('[admin-unify] painel unificado ativo');
})();