/* ============================================================
   Meu 3D Labs — admin-modern.js
   Camada aditiva de melhorias. Carregar DEPOIS de admin.js,
   admin-extras.js e admin-modelagem.js.
   Nao altera regra de negocio, estoque, preco ou fluxo de pedido.
   ============================================================ */
(function () {
  'use strict';
  if (window.__m3dModern) return;
  window.__m3dModern = true;

  /* ---------- 0. UTILIDADES ---------- */
  var K_DENS = 'm3d_dens';
  var ultimaCarga = Date.now();
  var selIds = {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function safe(fn) { try { fn(); } catch (e) { console.warn('[admin-modern]', e); } }
  function apiBase() { return window.API_URL || window.API_BASE || ''; }
  function tokenAtual() { try { return sessionStorage.getItem('m3d_admin_token') || ''; } catch (e) { return ''; } }
  function endpointPedidos() { return window.tipoAtivo === 'loja' ? '/loja/pedidos/' : '/orcamentos/'; }
  function listaAtiva() { return (window.getListaAtiva ? window.getListaAtiva() : []) || []; }

  /* ---------- 1. TOASTS ---------- */
  var toastWrap = null;

  function toasts() {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'm3d-toasts';
      document.body.appendChild(toastWrap);
    }
    return toastWrap;
  }

  function toast(msg, opts) {
    opts = opts || {};
    var tipo = opts.tipo || 'info';
    var icones = { ok: '✅', err: '⚠️', warn: '⏳', info: 'ℹ️' };

    var el = document.createElement('div');
    el.className = 'm3d-toast ' + tipo;

    var ico = document.createElement('div');
    ico.className = 't-ico';
    ico.textContent = icones[tipo] || 'ℹ️';

    var body = document.createElement('div');
    body.className = 't-body';
    if (opts.titulo) {
      var st = document.createElement('strong');
      st.textContent = opts.titulo;
      body.appendChild(st);
    }
    var sp = document.createElement('div');
    sp.textContent = String(msg == null ? '' : msg);
    body.appendChild(sp);

    el.appendChild(ico);
    el.appendChild(body);

    if (opts.acao) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 't-act';
      btn.textContent = opts.acao.rotulo;
      btn.addEventListener('click', function () { safe(function () { opts.acao.onClick(el); }); });
      el.appendChild(btn);
    }

    toasts().appendChild(el);

    var dur = opts.dur || (opts.acao ? 6000 : 4200);
    var timer = setTimeout(close, dur);

    function close() {
      clearTimeout(timer);
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.remove(); }, 220);
    }

    el._fechar = close;
    return el;
  }

  /* alert() nativo -> toast (nao bloqueia a tela) */
  var _alert = window.alert;
  window.alert = function (msg) {
    try { toast(msg, { tipo: 'warn', titulo: 'Atenção', dur: 6000 }); }
    catch (e) { _alert.call(window, msg); }
  };

  /* ---------- 2. EXCLUSAO COM DESFAZER (5s) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.del-btn') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    safe(function () { softDelete(btn); });
  }, true);

  function softDelete(btn) {
    var id = btn.getAttribute('data-id');
    if (!id) return;

    var p = null;
    listaAtiva().forEach(function (x) { if (String(x.id) === String(id)) p = x; });
    var ref = p && p.pedido_id ? p.pedido_id : ('#' + id);
    var tr = btn.closest('tr');
    var cancelado = false;
    var timer = null;

    if (tr) { tr.style.opacity = '.45'; tr.style.pointerEvents = 'none'; }

    toast('Pedido ' + ref + ' será excluído.', {
      tipo: 'warn',
      titulo: 'Excluindo…',
      dur: 6000,
      acao: {
        rotulo: 'Desfazer',
        onClick: function (el) {
          cancelado = true;
          clearTimeout(timer);
          if (tr) { tr.style.opacity = ''; tr.style.pointerEvents = ''; }
          el.classList.add('out');
          setTimeout(function () { if (el.parentNode) el.remove(); }, 200);
          toast('Exclusão cancelada.', { tipo: 'ok' });
        }
      }
    });

    timer = setTimeout(function () {
      if (cancelado) return;
      efetivarExclusao(id, ref, tr);
    }, 5000);
  }

  function efetivarExclusao(id, ref, tr) {
    fetch(apiBase() + endpointPedidos() + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + tokenAtual() }
    })
      .then(function (r) {
        if (r.status === 401) throw new Error('Sessão expirada — faça login novamente.');
        if (!r.ok) throw new Error('Erro ' + r.status);
        return r.json().catch(function () { return {}; });
      })
      .then(function () {
        delete selIds[String(id)];
        if (window.tipoAtivo === 'loja') {
          window.lojaPedidos = (window.lojaPedidos || []).filter(function (x) { return String(x.id) !== String(id); });
        } else {
          window.orcamentos = (window.orcamentos || []).filter(function (x) { return String(x.id) !== String(id); });
        }
        if (window.renderizar) window.renderizar();
        atualizarBulk();
        toast('Pedido ' + ref + ' excluído.', { tipo: 'ok' });
      })
      .catch(function (err) {
        if (tr) { tr.style.opacity = ''; tr.style.pointerEvents = ''; }
        toast('Não foi possível excluir ' + ref + ': ' + err.message, { tipo: 'err', titulo: 'Erro' });
        if (window.carregarPedidos) window.carregarPedidos();
      });
  }

  /* ---------- 3. SELECAO MULTIPLA + ACOES EM MASSA ---------- */
  var bulkBar = null;

  function idDaLinha(tr) {
    var s = tr.querySelector('select.status-select');
    if (!s) return null;
    var m = String(s.getAttribute('onchange') || '').match(/mudarStatus\((\d+)/);
    return m ? m[1] : null;
  }

  function barraBulk() {
    if (bulkBar) return bulkBar;
    bulkBar = document.createElement('div');
    bulkBar.className = 'm3d-bulkbar';
    bulkBar.innerHTML =
      '<span class="bb-n">0 selecionados</span>' +
      '<select class="bb-status" aria-label="Novo status"></select>' +
      '<button type="button" class="bb-btn bb-aplicar">Aplicar</button>' +
      '<button type="button" class="bb-btn ghost bb-limpar">Limpar</button>';
    document.body.appendChild(bulkBar);

    bulkBar.querySelector('.bb-limpar').addEventListener('click', function () { limparSelecao(); });
    bulkBar.querySelector('.bb-aplicar').addEventListener('click', function () { aplicarBulk(); });
    return bulkBar;
  }

  function injetarCheckboxes() {
    var body = $('#tabelaBody');
    if (!body) return;

    $$('#tabelaBody tr', document).forEach(function (tr) {
      var tdId = tr.querySelector('td.td-id');
      if (!tdId || tdId.querySelector('.row-check')) return;

      var id = idDaLinha(tr);
      if (!id) return;

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'row-check';
      cb.setAttribute('aria-label', 'Selecionar pedido');

      if (selIds[id]) { cb.checked = true; tr.classList.add('sel'); }

      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        tr.classList.toggle('sel', cb.checked);
        if (cb.checked) selIds[id] = true; else delete selIds[id];
        atualizarBulk();
      });

      tdId.insertBefore(cb, tdId.firstChild);
    });
  }

  function atualizarBulk() {
    var n = Object.keys(selIds).length;
    if (!bulkBar && !n) return;

    var bar = barraBulk();
    var sel = bar.querySelector('.bb-status');

    if (!sel.options.length) {
      var ops = (window.opcoesTodas ? window.opcoesTodas() : []) || [];
      sel.innerHTML = '<option value="">Mudar status para…</option>' + ops.map(function (o) {
        return '<option value="' + o[0] + '">' + o[1] + '</option>';
      }).join('');
    }

    bar.querySelector('.bb-n').textContent = n + (n === 1 ? ' selecionado' : ' selecionados');
    bar.classList.toggle('show', n > 0);
  }

  function limparSelecao() {
    selIds = {};
    $$('#tabelaBody tr.sel').forEach(function (tr) {
      tr.classList.remove('sel');
      var cb = tr.querySelector('.row-check');
      if (cb) cb.checked = false;
    });
    atualizarBulk();
  }

  function aplicarBulk() {
    var ids = Object.keys(selIds);
    if (!ids.length) return;

    var novo = bulkBar.querySelector('.bb-status').value;
    if (!novo) { toast('Escolha o status desejado antes de aplicar.', { tipo: 'warn' }); return; }

    var btn = bulkBar.querySelector('.bb-aplicar');
    var base = apiBase();
    var ep = endpointPedidos();
    var tk = tokenAtual();
    var falhas = 0;

    btn.disabled = true;
    btn.textContent = 'Aplicando…';

    Promise.all(ids.map(function (id) {
      return fetch(base + ep + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk },
        body: JSON.stringify({ status: novo })
      })
        .then(function (r) { if (!r.ok) falhas++; })
        .catch(function () { falhas++; });
    })).then(function () {
      btn.disabled = false;
      btn.textContent = 'Aplicar';
      selIds = {};
      atualizarBulk();
      if (window.carregarPedidos) window.carregarPedidos();

      var ok = ids.length - falhas;
      toast(
        falhas ? ok + ' de ' + ids.length + ' pedidos atualizados.' : ok + ' pedidos atualizados.',
        { tipo: falhas ? 'warn' : 'ok', titulo: 'Status em massa' }
      );
    });
  }

  /* ---------- 4. DENSIDADE ---------- */
  function aplicarDensidade() {
    var v = null;
    try { v = localStorage.getItem(K_DENS); } catch (e) {}
    document.body.classList.toggle('dens-compact', v === '1');
  }

  function alternarDensidade() {
    var ativo = document.body.classList.toggle('dens-compact');
    try { localStorage.setItem(K_DENS, ativo ? '1' : '0'); } catch (e) {}
    toast(ativo ? 'Tabela compacta.' : 'Tabela confortável.', { tipo: 'info', dur: 2500 });
  }

  aplicarDensidade();

  /* ---------- 5. SKELETON NO CARREGAMENTO ---------- */
  function injetarSkeleton() {
    setTimeout(function () {
      var body = $('#tabelaBody');
      if (!body) return;
      var lr = body.querySelector('.loading-row');
      if (!lr || !lr.querySelector('.spinner')) return;

      var cols = $$('#tabelaHead th').length || 7;
      var html = '';
      for (var i = 0; i < 6; i++) {
        html += '<tr><td colspan="' + cols + '">' +
          '<div style="display:flex;gap:14px;align-items:center;padding:7px 0;">' +
          '<span class="skel" style="width:72px;flex-shrink:0"></span>' +
          '<span class="skel" style="flex:1"></span>' +
          '<span class="skel" style="width:110px;flex-shrink:0"></span>' +
          '<span class="skel" style="width:70px;flex-shrink:0"></span>' +
          '</div></td></tr>';
      }
      body.innerHTML = html;
    }, 0);
  }

  /* ---------- 6. PALETA DE COMANDO (Ctrl+K) ---------- */
  var cmdEl = null, cmdItens = [], cmdIdx = 0;

  function focarBusca() {
    var b = $('#buscaInput');
    if (b) { b.focus(); b.select(); }
  }

  function limparFiltros() {
    var b = $('#buscaInput'); if (b) b.value = '';
    var s = $('#statusFilter'); if (s) s.value = '';
    var i = $('#filtroInicio'); if (i) i.value = '';
    var f = $('#filtroFim'); if (f) f.value = '';
    if (window.setFiltroVisao) window.setFiltroVisao('todos');
    else if (window.aplicarFiltros) window.aplicarFiltros();
  }

  function comandos() {
    return [
      { ico: '🔄', txt: 'Atualizar pedidos', hint: 'R', run: function () { window.carregarPedidos && window.carregarPedidos(); } },
      { ico: '⬇️', txt: 'Exportar CSV', hint: '', run: function () { window.exportarCSV && window.exportarCSV(); } },
      { ico: '🤖', txt: 'Relatório para IA', hint: '', run: function () { window.abrirRelatorioIA && window.abrirRelatorioIA(); } },
      { ico: '🌙', txt: 'Alternar modo escuro', hint: '', run: function () { window.toggleDark && window.toggleDark(); } },
      { ico: '↕️', txt: 'Densidade: compacta / confortável', hint: '', run: alternarDensidade },
      { ico: '🧹', txt: 'Limpar filtros e busca', hint: '', run: limparFiltros },
      { ico: '🔍', txt: 'Focar na busca', hint: '/', run: focarBusca },
      { ico: '📋', txt: 'Ir para Encomendas', hint: '', run: function () { window.mudarAba && window.mudarAba('orcamentos'); } },
      { ico: '🔧', txt: 'Ir para Assistência', hint: '', run: function () { window.mudarAba && window.mudarAba('assistencia'); } },
      { ico: '🎓', txt: 'Ir para Consultoria', hint: '', run: function () { window.mudarAba && window.mudarAba('consultoria'); } },
      { ico: '🗂️', txt: 'Ir para Modelagem 3D', hint: '', run: function () { window.mudarAba && window.mudarAba('modelagem'); } },
      { ico: '🛍️', txt: 'Ir para Loja', hint: '', run: function () { window.mudarAba && window.mudarAba('loja'); } }
    ];
  }

  function montarPaleta() {
    if (cmdEl) return cmdEl;
    cmdEl = document.createElement('div');
    cmdEl.className = 'm3d-cmdk';
    cmdEl.innerHTML =
      '<div class="m3d-cmdk-box">' +
        '<input class="m3d-cmdk-input" type="text" autocomplete="off" spellcheck="false" ' +
               'placeholder="Buscar pedido ou comando…  (Esc para fechar)">' +
        '<div class="m3d-cmdk-list"></div>' +
      '</div>';
    document.body.appendChild(cmdEl);

    var input = cmdEl.querySelector('.m3d-cmdk-input');
    input.addEventListener('input', function () { renderCmd(input.value); });
    input.addEventListener('keydown', cmdTecla);
    cmdEl.addEventListener('mousedown', function (e) { if (e.target === cmdEl) fecharPaleta(); });
    return cmdEl;
  }

  function renderCmd(q) {
    q = String(q || '').trim().toLowerCase();
    var itens = comandos().filter(function (c) {
      return !q || c.txt.toLowerCase().indexOf(q) !== -1;
    });

    if (q.length >= 2) {
      var achados = [];
      var lista = listaAtiva();
      for (var i = 0; i < lista.length && achados.length < 6; i++) {
        var p = lista[i];
        var alvo = [p.pedido_id, p.nome_cliente, p.whatsapp, p.email, p.email_cliente]
          .join(' ').toLowerCase();
        if (alvo.indexOf(q) === -1) continue;
        achados.push({
          ico: '🔎',
          txt: 'Pedido ' + (p.pedido_id || ('#' + p.id)) + ' — ' + (p.nome_cliente || ''),
          hint: 'filtrar',
          run: (function (pp) {
            return function () {
              var b = $('#buscaInput');
              if (b) {
                b.value = pp.pedido_id || ('#' + pp.id);
                b.dispatchEvent(new Event('input'));
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            };
          })(p)
        });
      }
      itens = achados.concat(itens);
    }

    cmdItens = itens;
    cmdIdx = 0;
    desenharLista();
  }

  function desenharLista() {
    var list = cmdEl.querySelector('.m3d-cmdk-list');
    if (!cmdItens.length) {
      list.innerHTML = '<div class="m3d-cmdk-empty">Nada encontrado.</div>';
      return;
    }
    list.innerHTML = cmdItens.map(function (c, i) {
      return '<div class="m3d-cmdk-item' + (i === cmdIdx ? ' active' : '') + '" data-i="' + i + '">' +
        '<span class="ci-ico">' + c.ico + '</span>' +
        '<span class="ci-txt">' + c.txt.replace(/[<>&]/g, '') + '</span>' +
        (c.hint ? '<span class="ci-hint">' + c.hint + '</span>' : '') +
        '</div>';
    }).join('');

    $$('.m3d-cmdk-item', list).forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cmdIdx = parseInt(el.getAttribute('data-i'), 10) || 0;
        $$('.m3d-cmdk-item', list).forEach(function (x) { x.classList.remove('active'); });
        el.classList.add('active');
      });
      el.addEventListener('click', function () {
        var c = cmdItens[parseInt(el.getAttribute('data-i'), 10) || 0];
        fecharPaleta();
        if (c && c.run) safe(c.run);
      });
    });
  }

  function cmdTecla(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdIdx = Math.min(cmdIdx + 1, cmdItens.length - 1);
      desenharLista();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdIdx = Math.max(cmdIdx - 1, 0);
      desenharLista();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var c = cmdItens[cmdIdx];
      fecharPaleta();
      if (c && c.run) safe(c.run);
    }
  }

  function abrirPaleta() {
    var el = montarPaleta();
    el.classList.add('show');
    var input = el.querySelector('.m3d-cmdk-input');
    input.value = '';
    renderCmd('');
    setTimeout(function () { input.focus(); }, 30);
  }

  function fecharPaleta() {
    if (cmdEl) cmdEl.classList.remove('show');
  }

  /* ---------- 7. ATALHOS ---------- */
  document.addEventListener('keydown', function (e) {
    var t = e.target || {};
    var tag = (t.tagName || '').toLowerCase();
    var editando = tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      abrirPaleta();
      return;
    }
    if (e.key === 'Escape') { fecharPaleta(); return; }
    if (editando) return;

    if (e.key === '/') { e.preventDefault(); focarBusca(); return; }
    if (e.key === 'r' || e.key === 'R') { if (window.carregarPedidos) window.carregarPedidos(); return; }
    if (e.key === '?') { e.preventDefault(); abrirPaleta(); }
  });

  /* ---------- 8. POLLING INTELIGENTE ---------- */
  var _fetch = window.fetch;
  if (typeof _fetch === 'function') {
    window.fetch = function (url, opts) {
      try {
        var u = String(url || '');
        var metodo = (opts && opts.method) ? String(opts.method).toUpperCase() : 'GET';
        var ehPoll = metodo === 'GET' &&
          (u.indexOf('/orcamentos?servico=encomenda') !== -1 || /\/loja\/pedidos(\?|$)/.test(u));

        /* aba oculta: segura a resposta para nao gastar requisicao nem mexer na tela */
        if (ehPoll && document.hidden) return new Promise(function () {});

        var p = _fetch.apply(this, arguments);
        if (!ehPoll) return p;

        return p.then(function (r) {
          if (r && r.ok) ultimaCarga = Date.now();
          return r;
        });
      } catch (e) {
        return _fetch.apply(this, arguments);
      }
    };
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) safe(function () { window.carregarPedidos && window.carregarPedidos(); });
  });

  /* ---------- 9. AVISO DE CONEXAO ---------- */
  var netbar = null;

  function barraNet() {
    if (netbar) return netbar;
    netbar = document.createElement('div');
    netbar.className = 'm3d-netbar';
    document.body.appendChild(netbar);
    return netbar;
  }

  window.addEventListener('offline', function () {
    var b = barraNet();
    b.className = 'm3d-netbar err show';
    b.textContent = '📡 Sem conexão — os dados podem estar desatualizados.';
  });

  window.addEventListener('online', function () {
    var b = barraNet();
    b.className = 'm3d-netbar show';
    b.textContent = '✓ Conexão restabelecida — atualizando…';
    setTimeout(function () { b.classList.remove('show'); }, 2600);
    safe(function () { window.carregarPedidos && window.carregarPedidos(); });
  });

  /* ---------- 10. TEMPO RELATIVO ---------- */
  var chipRel = null;

  function criarChipRel() {
    if (chipRel) return chipRel;
    var alvo = $('#lastUpdate');
    if (!alvo || !alvo.parentNode) return null;
    chipRel = document.createElement('span');
    chipRel.className = 'last-update';
    chipRel.id = 'm3dRel';
    alvo.parentNode.insertBefore(chipRel, alvo.nextSibling);
    return chipRel;
  }

  function tickRel() {
    var el = criarChipRel();
    if (!el) return;
    var s = Math.max(0, Math.round((Date.now() - ultimaCarga) / 1000));
    if (s < 60) el.textContent = 'há ' + s + 's';
    else if (s < 3600) el.textContent = 'há ' + Math.floor(s / 60) + 'min';
    else el.textContent = 'há ' + Math.floor(s / 3600) + 'h';
  }

  setInterval(tickRel, 5000);
  setTimeout(tickRel, 800);

  /* ---------- 11. CONTADOR DE PENDENTES (titulo + favicon) ---------- */
  var TITULO_BASE = document.title;
  var favOriginal = null;
  var ultimoPend = -1;

  (function prepararFavicon() {
    var l = document.querySelector('link[rel="icon"]');
    if (l) favOriginal = l.getAttribute('href');
  })();

  function pintarFavicon(n) {
    if (!favOriginal) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) return;

    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0, 64, 64);
        if (n > 0) {
          g.beginPath();
          g.arc(48, 16, 15, 0, Math.PI * 2);
          g.fillStyle = '#f26522';
          g.fill();
          g.fillStyle = '#ffffff';
          g.font = 'bold 20px Arial, Helvetica, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(n > 9 ? '9+' : String(n), 48, 17);
        }
        link.setAttribute('href', c.toDataURL('image/png'));
      } catch (e) {}
    };
    img.src = favOriginal;
  }

  function atualizarPendentes() {
    var lista = listaAtiva();
    var n = 0;

    lista.forEach(function (p) {
      var s = String(p.status || (window.tipoAtivo === 'loja' ? 'feito' : 'novo'));
      if (s === 'novo' || s === 'feito' ||
          s.indexOf('Aguardando') === 0 ||
          s === 'Pagamento em verificação (Pix)' ||
          s === 'Pix aguardando compensação') n++;
    });

    document.title = (n > 0 ? '(' + n + ') ' : '') + TITULO_BASE;

    if (n !== ultimoPend) {
      ultimoPend = n;
      safe(function () { pintarFavicon(n); });
    }
  }

  /* ---------- 12. GANCHOS NO RENDER ---------- */
  var _aplicar = window.aplicarFiltros;
  if (typeof _aplicar === 'function') {
    window.aplicarFiltros = function () {
      var r = _aplicar.apply(this, arguments);
      safe(injetarCheckboxes);
      safe(atualizarPendentes);
      safe(atualizarBulk);
      return r;
    };
  }

  var _carregar = window.carregarPedidos;
  if (typeof _carregar === 'function') {
    window.carregarPedidos = function () {
      safe(injetarSkeleton);
      return _carregar.apply(this, arguments);
    };
  }

  var _mudarAba = window.mudarAba;
  if (typeof _mudarAba === 'function') {
    window.mudarAba = function () {
      selIds = {};
      safe(atualizarBulk);
      return _mudarAba.apply(this, arguments);
    };
  }

  /* ---------- 13. PRIMEIRO DESENHO ---------- */
  setTimeout(function () {
    safe(injetarCheckboxes);
    safe(atualizarPendentes);
    safe(tickRel);
  }, 1200);

  console.log('[admin-modern] camada visual ativa');
})();