/* ============================================================
   Meu 3D Labs — admin-feed-hist.js
   Marcar postagens como feitas + histórico.
   Carregar DEPOIS do admin-feed-pro.js
   ============================================================ */
(function () {
  'use strict';

  var CHAVE = 'm3d_postados';
  var TIPOS = {
    blog:  { rot:'Blog',  ico:'📰' },
    feed:  { rot:'Feed',  ico:'📱' },
    story: { rot:'Story', ico:'⚡' }
  };

  /* ==================== STORE ==================== */
  function ler() {
    try {
      var r = JSON.parse(localStorage.getItem(CHAVE) || '[]');
      return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
  }
  function gravar(l) {
    try { localStorage.setItem(CHAVE, JSON.stringify(l)); } catch (e) {}
  }
  function chaveDe(tipo, alvo, data) {
    return tipo + '|' + String(alvo || '').trim() + '|' + String(data || '');
  }
  function achar(tipo, alvo, data) {
    var k = chaveDe(tipo, alvo, data), l = ler();
    for (var i = 0; i < l.length; i++) if (l[i].chave === k) return l[i];
    return null;
  }
  function marcar(tipo, alvo, data, titulo) {
    var k = chaveDe(tipo, alvo, data);
    if (achar(tipo, alvo, data)) return false;
    var l = ler();
    l.unshift({
      id: Date.now() + Math.floor(Math.random() * 999),
      chave: k,
      tipo: tipo,
      alvo: String(alvo || '').trim(),
      data: String(data || ''),
      titulo: titulo || '',
      marcado: new Date().toISOString()
    });
    gravar(l.slice(0, 400));
    return true;
  }
  function desmarcar(tipo, alvo, data) {
    var k = chaveDe(tipo, alvo, data);
    gravar(ler().filter(function (x) { return x.chave !== k; }));
  }

  /* ==================== HELPERS ==================== */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function isoData(d) {
    if (!d) return '';
    var dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.getFullYear() + '-' +
           String(dt.getMonth() + 1).padStart(2, '0') + '-' +
           String(dt.getDate()).padStart(2, '0');
  }
  function fmtBR(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function toast(msg, tipo) {
    if (typeof window.mostrarToast === 'function') window.mostrarToast(msg, tipo);
  }

  /* ==================== BOTÃO NO PLANO ==================== */
  function reforcarPlano() {
    var area = document.getElementById('bfPautaArea');
    if (!area) return;
    var plano = window.__bfPlano;
    var dias = area.querySelectorAll('.bf-plano-dia');
    if (!plano || !dias.length) return;

    for (var i = 0; i < dias.length; i++) {
      var dia = dias[i];
      var p = plano[i];
      if (!p) continue;

      var alvo = p.pauta ? p.pauta.nome : (p.tema ? p.tema.nome : 'Tema livre');
      var data = isoData(p.data);
      var jaTem = achar(p.formato, alvo, data);

      if (jaTem) dia.classList.add('postado');

      var btn = dia.querySelector('.bf-fiz');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bf-fiz';
        dia.appendChild(btn);
      }

      if (jaTem) {
        btn.textContent = '✓ Postado';
        btn.classList.add('feito');
        btn.setAttribute('data-h', i);
      } else {
        btn.textContent = '✓ Fiz';
        btn.classList.remove('feito');
        btn.setAttribute('data-h', i);
      }
    }
  }

  function clicarFizPlano(i) {
    var plano = window.__bfPlano || [];
    var p = plano[i];
    if (!p) return;

    var alvo = p.pauta ? p.pauta.nome : (p.tema ? p.tema.nome : 'Tema livre');
    var data = isoData(p.data);

    if (achar(p.formato, alvo, data)) {
      desmarcar(p.formato, alvo, data);
      toast('↩️ Desmarcado.', 'ok');
    } else {
      marcar(p.formato, alvo, data, alvo);
      toast('✅ Marcado como postado (' + TIPOS[p.formato].rot + ').', 'ok');
    }
    reforcarPlano();
  }

  /* ==================== BOTÃO NA PAUTA ==================== */
  function reforcarPauta() {
    var area = document.getElementById('bfPautaArea');
    if (!area) return;
    var painel = area.querySelector('.bf-pauta');
    if (!painel) return;
    var txt = document.getElementById('bfPromptTxt');
    if (!txt) return;
    if (painel.querySelector('.bf-acao-fiz')) return;

    var barra = painel.querySelector('.bf-prompt-acoes');
    if (!barra) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bf-acao-fiz';
    btn.textContent = '✓ Fiz';
    btn.onclick = clicarFizPauta;
    barra.appendChild(btn);
    sincronizarBotaoPauta(btn);
  }

  function dadosPautaAberta() {
    var chipFmt = document.querySelector('.bf-modo[data-fmt].on');
    var tipo = chipFmt ? chipFmt.getAttribute('data-fmt') : 'feed';

    var nome = '';
    var sel = document.querySelector('.bf-data.sel');
    if (sel) {
      var el = sel.querySelector('.bf-nome');
      if (el) nome = el.textContent.replace(/\s+/g, ' ').trim();
    }
    if (!nome) {
      var livre = document.querySelector('.bf-data.livre');
      if (livre) {
        var el2 = livre.querySelector('.bf-nome');
        if (el2) nome = el2.textContent.replace(/\s+/g, ' ').trim();
      }
    }
    if (!nome) nome = 'Tema livre';

    return { tipo: tipo, alvo: nome, data: isoData(new Date()) };
  }

  function sincronizarBotaoPauta(btn) {
    var d = dadosPautaAberta();
    var ex = achar(d.tipo, d.alvo, d.data);
    btn.classList.toggle('feito', !!ex);
    btn.textContent = ex ? '✓ Postado' : '✓ Fiz';
  }

  function clicarFizPauta() {
    var d = dadosPautaAberta();
    var btn = document.querySelector('.bf-acao-fiz');
    if (achar(d.tipo, d.alvo, d.data)) {
      desmarcar(d.tipo, d.alvo, d.data);
      toast('↩️ Desmarcado.', 'ok');
    } else {
      marcar(d.tipo, d.alvo, d.data, d.alvo);
      toast('✅ Marcado como postado (' + TIPOS[d.tipo].rot + ').', 'ok');
    }
    if (btn) sincronizarBotaoPauta(btn);
  }

  /* ==================== HISTÓRICO ==================== */
  var filtroHist = '';

  function abrirHistorico() {
    var area = document.getElementById('bfPautaArea');
    if (!area) return;

    if (window.__bfHistAberto) {
      area.innerHTML = '';
      window.__bfHistAberto = false;
      if (typeof window.bfFechar === 'function') { /* mantém estado */ }
      return;
    }
    window.__bfHistAberto = true;

    var l = ler();
    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>📋 Histórico de postagens</h3>');
    h.push('<p class="bf-sub">O que você marcou como feito. Fica salvo neste navegador. ' +
           'Use para não repetir e para saber o que já saiu.</p>');

    var q = { blog: 0, feed: 0, story: 0 };
    for (var i = 0; i < l.length; i++) if (q[l[i].tipo] !== undefined) q[l[i].tipo]++;

    h.push('<div class="bf-hist-resumo">');
    h.push('<div class="bf-hist-num"><b>' + l.length + '</b><span>Total</span></div>');
    h.push('<div class="bf-hist-num"><b>' + q.blog + '</b><span>Blog</span></div>');
    h.push('<div class="bf-hist-num"><b>' + q.feed + '</b><span>Feed</span></div>');
    h.push('<div class="bf-hist-num"><b>' + q.story + '</b><span>Story</span></div>');
    h.push('</div>');

    h.push('<div class="bf-hist-filtros">');
    h.push('<button type="button" class="bf-chip' + (filtroHist === '' ? ' on' : '') +
           '" onclick="bfHistFiltro(\'\')">Todos (' + l.length + ')</button>');
    h.push('<button type="button" class="bf-chip' + (filtroHist === 'blog' ? ' on' : '') +
           '" onclick="bfHistFiltro(\'blog\')">📰 Blog (' + q.blog + ')</button>');
    h.push('<button type="button" class="bf-chip' + (filtroHist === 'feed' ? ' on' : '') +
           '" onclick="bfHistFiltro(\'feed\')">📱 Feed (' + q.feed + ')</button>');
    h.push('<button type="button" class="bf-chip' + (filtroHist === 'story' ? ' on' : '') +
           '" onclick="bfHistFiltro(\'story\')">⚡ Story (' + q.story + ')</button>');
    h.push('</div>');

    var lista = l.filter(function (x) { return !filtroHist || x.tipo === filtroHist; });

    if (!lista.length) {
      h.push('<div class="bf-alerta aviso">Nenhuma postagem marcada' +
             (filtroHist ? ' neste tipo' : '') +
             '. Use o botão <b>✓ Fiz</b> no Plano de 7 dias ou em Sugerir pauta.</div>');
    } else {
      h.push('<div class="bf-hist">');
      for (var j = 0; j < lista.length; j++) {
        var it = lista[j];
        var tp = TIPOS[it.tipo] || { rot: it.tipo, ico: '•' };
        h.push('<div class="bf-hist-item">');
        h.push('<span class="bf-h-ico ' + it.tipo + '">' + tp.ico + '</span>');
        h.push('<span class="bf-h-corpo">');
        h.push('<span class="bf-h-nome">' + esc(it.alvo) + '</span>');
        h.push('<span class="bf-h-meta">' + tp.rot + ' · ' + fmtBR(it.data) +
               ' · marcado em ' + fmtBR(isoData(new Date(it.marcado))) + '</span>');
        h.push('</span>');
        h.push('<button type="button" class="bf-h-del" ' +
               'data-t="' + esc(it.tipo) + '" data-a="' + esc(it.alvo) + '" data-d="' + esc(it.data) + '" ' +
               'onclick="bfHistDel(this)">Remover</button>');
        h.push('</div>');
      }
      h.push('</div>');
    }

    h.push('<div class="bf-prompt-acoes" style="margin-top:14px;">');
    h.push('<button class="bf-btn ok" type="button" onclick="bfHistExportar()">⬇️ Exportar CSV</button>');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfHistFechar()">Fechar</button>');
    h.push('</div>');
    h.push('</div>');

    area.innerHTML = h.join('');
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fecharHistorico() {
    var area = document.getElementById('bfPautaArea');
    if (area) area.innerHTML = '';
    window.__bfHistAberto = false;
  }

  function filtroHistorico(f) {
    filtroHist = f;
    window.__bfHistAberto = false;
    abrirHistorico();
  }

  function removerHistorico(btn) {
    if (!btn) return;
    desmarcar(btn.getAttribute('data-t'), btn.getAttribute('data-a'), btn.getAttribute('data-d'));
    filtroHistorico(filtroHist);
    toast('🗑️ Removido do histórico.', 'ok');
  }

  function exportarHistorico() {
    var l = ler();
    if (!l.length) { toast('Nada para exportar.', 'erro'); return; }

    var linhas = ['Tipo;Pauta;Data prevista;Marcado em'];
    for (var i = 0; i < l.length; i++) {
      var it = l[i];
      var tp = TIPOS[it.tipo] || { rot: it.tipo };
      linhas.push([tp.rot, it.alvo, fmtBR(it.data), fmtBR(isoData(new Date(it.marcado)))].join(';'));
    }

    var blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    a.href = url;
    a.download = 'm3d-historico-' + d.getFullYear() +
                 String(d.getMonth() + 1).padStart(2, '0') +
                 String(d.getDate()).padStart(2, '0') + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('⬇️ CSV exportado (' + l.length + ' registros).', 'ok');
  }

  /* ==================== INJEÇÃO NA TOOLBAR ==================== */
  function injetarBotaoToolbar() {
    var tb = document.getElementById('bfToolbar');
    if (!tb || document.getElementById('bfBtnHist')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bfBtnHist';
    btn.className = 'bf-btn';
    btn.textContent = '📋 Histórico';
    btn.onclick = function () {
      if (window.__bfHistAberto) { fecharHistorico(); return; }
      window.__bfHistAberto = false;
      abrirHistorico();
    };
    tb.insertBefore(btn, tb.lastElementChild);
  }

  /* ==================== OBSERVER ==================== */
  var deb = null;

  function varrer() {
    injetarBotaoToolbar();
    if (window.__bfHistAberto) return;
    reforcarPlano();
    reforcarPauta();
  }

  function agendar() {
    clearTimeout(deb);
    deb = setTimeout(varrer, 90);
  }

  function iniciar() {
    var area = document.getElementById('bfPautaArea');
    if (area) new MutationObserver(agendar).observe(area, { childList: true, subtree: true });
    var tb = document.getElementById('bfToolbar');
    if (tb) new MutationObserver(agendar).observe(tb, { childList: true, subtree: true });
    agendar();
  }

  /* ==================== API ==================== */
  window.bfHistAbrir    = abrirHistorico;
  window.bfHistFechar   = fecharHistorico;
  window.bfHistFiltro   = filtroHistorico;
  window.bfHistDel      = removerHistorico;
  window.bfHistExportar = exportarHistorico;
  window.bfFizPlano     = clicarFizPlano;
  window.bfFizPauta     = clicarFizPauta;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(iniciar, 200); });
  } else {
    setTimeout(iniciar, 200);
  }

  var t = 0;
  var timer = setInterval(function () {
    t++;
    if (document.getElementById('bfToolbar') || t > 40) { clearInterval(timer); iniciar(); }
  }, 400);

  /* delegação: clique no ✓ Fiz do plano */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.bf-fiz');
    if (!b) return;
    var i = b.getAttribute('data-h');
    if (i === null) return;
    e.preventDefault();
    clicarFizPlano(parseInt(i, 10));
  }, true);

})();