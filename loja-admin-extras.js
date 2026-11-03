/* ============================================================
   Meu 3D Labs — loja-admin-extras.js
   Camada de recursos avançados do Admin Loja.

   ✅ v2 — Compatível com admin-loja.html novo (2026-11)

   O QUE MUDOU NESTA VERSÃO
   • REMOVIDO: ações rápidas duplicadas (ativo/estoque/destaque)
     → o admin-loja.html novo já tem essas ações nativas
   • REMOVIDO: ordenação duplicada (#lxOrdem)
     → o admin-loja.html novo já tem #ordemSelect
   • CORRIGIDO: gravarProduto agora envia material, peso e dimensões
     → antes apagava esses campos a cada toggle
   • CORRIGIDO: guardas de null em todos os seletores
   • CORRIGIDO: ações em massa agora funcionam com toggleLote() E toggleMesclar()
   • CORRIGIDO: contador de chips não é mais zerado
   • MANTIDO: chips de filtro, saúde da loja, ações em massa,
     backup, lista de preços, Ctrl+V, atalhos
   ============================================================ */
(function(){
'use strict';

/* ===== 0. UTILIDADES ===== */
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}
function fmt(n){n=parseFloat(n)||0;return n.toFixed(2).replace('.',',');}
function toast(msg,tipo){if(window.mostrarToast)window.mostrarToast(msg,tipo);else alert(msg);}
function soma(){return typeof produtos!=='undefined'?produtos:[];}
function porId(id){var a=soma();for(var i=0;i<a.length;i++)if(String(a[i].id)===String(id))return a[i];return null;}
function linkPublico(p){return '/produto/'+(p.slug||'');}
function el(id){return document.getElementById(id);}

/* ─────────────────────────────────────────────────────────────
   GRAVAR PRODUTO — ✅ CORRIGIDO
   Envia TODOS os campos, incluindo material, peso e dimensões.
   Antes, qualquer toggle apagava esses dados no banco.
   ───────────────────────────────────────────────────────────── */
async function gravarProduto(p){
  var dados={
    nome: p.nome,
    slug: p.slug || '',
    descricao: p.descricao || '',
    preco: parseFloat(p.preco) || 0,
    estoque: parseInt(p.estoque) || 0,
    categoria: p.categoria || 'outros',
    cores: p.cores || [],
    imagens: p.imagens || [],
    destaque: !!p.destaque,
    ativo: !!p.ativo,
    promo: !!p.promo,
    precoPromo: parseFloat(p.precoPromo) || 0,
    /* ✅ Campos que antes eram apagados silenciosamente */
    material: p.material || '',
    altura: p.altura != null ? p.altura : null,
    largura: p.largura != null ? p.largura : null,
    profundidade: p.profundidade != null ? p.profundidade : null,
    peso: p.peso != null ? p.peso : null
  };
  await window.api('/loja/produtos/' + p.id, 'PUT', dados);
}

/* ===== 1. CHIPS DE FILTRO ESPECIAL ===== */
var filtroEsp = '';
var CHIPS = [
  ['sest', '📦 Sem estoque'],
  ['ult', '⚠️ Últimas un.'],
  ['promo', '🏷️ Promoção'],
  ['inativos', '💤 Inativos'],
  ['semfoto', '📷 Sem foto'],
  ['destaque', '⭐ Destaques']
];

function casouEsp(p){
  switch(filtroEsp){
    case 'sest': return !(parseInt(p.estoque) > 0);
    case 'ult': return parseInt(p.estoque) > 0 && parseInt(p.estoque) <= 3;
    case 'promo': return !!p.promo && parseFloat(p.precoPromo) > 0;
    case 'inativos': return !p.ativo;
    case 'semfoto': return !(p.imagens && p.imagens.length);
    case 'destaque': return !!p.destaque;
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────
   WRAP de renderGrade — ✅ COM GUARDAS
   Só aplica filtro especial e conta visíveis.
   NÃO reordena (o admin-loja.html novo já tem #ordemSelect).
   ───────────────────────────────────────────────────────────── */
var _rgOriginal = window.renderGrade;
if(typeof _rgOriginal === 'function'){
  window.renderGrade = function(){
    _rgOriginal.apply(this, arguments);

    var g = el('grade');
    if(!g) return;

    var cards = Array.prototype.slice.call(g.children).filter(function(c){
      return c.classList && c.classList.contains('card');
    });

    var visiveis = 0;

    cards.forEach(function(card){
      var m = (card.innerHTML || '').match(/abrirForm\('([^']+)'/);
      var p = m ? porId(m[1]) : null;

      if(p && filtroEsp && !casouEsp(p)){
        card.style.display = 'none';
      }else{
        if(card.style.display === 'none' && !filtroEsp) card.style.display = '';
        if(card.style.display !== 'none') visiveis++;
      }
    });

    var ct = el('lxCount');
    if(ct) ct.textContent = visiveis + ' produto' + (visiveis === 1 ? '' : 's') + ' exibido' + (visiveis === 1 ? '' : 's');
  };
}

/* ─────────────────────────────────────────────────────────────
   Injeção dos chips
   ✅ Não cria mais o <select> de ordenação (duplicava #ordemSelect)
   ───────────────────────────────────────────────────────────── */
function injetaChips(){
  var f = el('filtroCat');
  if(!f || el('lxChips')) return;
  var box = document.createElement('div');
  box.id = 'lxChips';
  box.className = 'lx-chips';
  f.insertAdjacentElement('afterend', box);
}

function renderChips(){
  var box = el('lxChips');
  if(!box) return;

  box.innerHTML =
    '<span class="lx-count" id="lxCount"></span>' +
    CHIPS.map(function(c){
      return '<button type="button" class="lx-chip' + (filtroEsp === c[0] ? ' on' : '') + '" data-k="' + c[0] + '">' + c[1] + '</button>';
    }).join('') +
    (filtroEsp ? '<button type="button" class="lx-chip lx-off" data-k="">✕ limpar</button>' : '');

  /* ✅ Handler idempotente — não re-liga em cada render */
  if(!box._ligado){
    box._ligado = true;
    box.onclick = function(e){
      var b = e.target.closest('.lx-chip');
      if(!b) return;
      var k = b.getAttribute('data-k');
      filtroEsp = (k === filtroEsp) ? '' : k;
      renderChips();
      if(typeof window.renderGrade === 'function') window.renderGrade();
    };
  }
}

/* ===== 2. SAÚDE DA LOJA ===== */
function injetaSaude(){
  var r = el('resumo');
  if(!r || el('lxSaude')) return;
  var d = document.createElement('div');
  d.id = 'lxSaude';
  d.className = 'lx-saude';
  r.insertAdjacentElement('afterend', d);
}

function renderSaude(){
  var box = el('lxSaude');
  if(!box) return;

  var a = soma();
  if(!a.length){ box.innerHTML = ''; return; }

  var ativos = a.filter(function(p){ return p.ativo; });

  var prontos = ativos.filter(function(p){
    return p.imagens && p.imagens.length
        && parseFloat(p.preco) > 0
        && (p.descricao || '').trim().length > 10;
  });

  var pct = ativos.length ? Math.round(prontos.length / ativos.length * 100) : 100;

  var probs = [
    ['semfoto', ativos.filter(function(p){ return !(p.imagens && p.imagens.length); }).length, '📷 sem foto'],
    ['sest', ativos.filter(function(p){ return !(parseInt(p.estoque) > 0); }).length, '📦 sem estoque'],
    ['promo', a.filter(function(p){ return p.promo && parseFloat(p.precoPromo) > 0; }).length, '🏷️ em promoção'],
    ['inativos', a.length - ativos.length, '💤 inativos']
  ];

  var cor = pct >= 90 ? 'verde' : (pct >= 70 ? 'laranja' : 'vermelho');

  box.innerHTML =
    '<div class="lx-s-top">' +
      '<b>🩺 Loja em forma:</b>' +
      '<span class="lx-s-pct ' + cor + '">' + pct + '%</span>' +
      '<small>dos ' + ativos.length + ' ativos estão prontos pra venda</small>' +
    '</div>' +
    '<div class="lx-s-bar"><div class="lx-s-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="lx-s-probs">' +
      probs.filter(function(x){ return x[1]; }).map(function(x){
        return '<button type="button" class="lx-s-prob" data-k="' + x[0] + '">' + x[1] + ' ' + x[2] + ' →</button>';
      }).join('') +
    '</div>';

  if(!box._ligado){
    box._ligado = true;
    box.onclick = function(e){
      var b = e.target.closest('.lx-s-prob');
      if(!b) return;
      filtroEsp = b.getAttribute('data-k');
      renderChips();
      if(typeof window.renderGrade === 'function') window.renderGrade();
      var chips = el('lxChips');
      if(chips) chips.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }
}

/* ===== 3. AÇÕES EM MASSA =====
   ✅ Compatível com toggleLote() (novo) E toggleMesclar() (antigo)
   ===== */
function injetaMassa(){
  var barra = el('barraMesclar');
  if(!barra || el('lxMassa')) return;

  var d = document.createElement('div');
  d.className = 'lx-massa';
  d.id = 'lxMassa';

  d.innerHTML =
    '<span class="lx-m-lab">⚡ Ou aplique em massa:</span>' +
    '<select id="lxMassaAcao">' +
      '<option value="">Escolher ação...</option>' +
      '<option value="ativar">🟢 Ativar na loja</option>' +
      '<option value="inativar">💤 Inativar (sair da loja)</option>' +
      '<option value="categoria">📂 Mover para categoria…</option>' +
      '<option value="promo">🏷️ Aplicar promoção (% off)…</option>' +
      '<option value="remover-promo">Remover promoção</option>' +
      '<option value="estoque">📦 Somar estoque (+N, aceita −N)</option>' +
      '<option value="preco">💰 Definir preço (R$)…</option>' +
      '<option value="destaque-on">⭐ Marcar destaque</option>' +
      '<option value="destaque-off">☆ Remover destaque</option>' +
    '</select>' +
    '<input id="lxMassaValor" class="hidden" placeholder="valor…" list="lxCatList">' +
    '<datalist id="lxCatList">' +
      (typeof CATEGORIAS !== 'undefined' ? CATEGORIAS.map(function(c){ return '<option value="' + c + '">'; }).join('') : '') +
    '</datalist>' +
    '<button type="button" class="btn btn-laranja" id="lxMassaBtn">Aplicar</button>';

  barra.appendChild(d);

  var sel = d.querySelector('#lxMassaAcao');
  var val = d.querySelector('#lxMassaValor');

  sel.onchange = function(){
    var precisaValor = ['categoria','promo','estoque','preco'].indexOf(sel.value) !== -1;
    val.classList.toggle('hidden', !precisaValor);
    if(precisaValor) val.focus();
  };

  d.querySelector('#lxMassaBtn').onclick = aplicarMassa;
}

async function aplicarMassa(){
  var acao = (el('lxMassaAcao') || {}).value || '';
  if(!acao){ toast('Escolha uma ação.', 'erro'); return; }

  var ids = typeof selecionados !== 'undefined' ? selecionados : [];
  if(ids.length < 1){
    toast('Selecione os produtos (botão "☑️ Selecionar" ou "🔗 Mesclar").', 'erro');
    return;
  }

  var val = (el('lxMassaValor') || {}).value || '';

  var rotulos = {
    ativar: 'Ativar na loja',
    inativar: 'Inativar (sair da loja)',
    'remover-promo': 'Remover promoção',
    'destaque-on': 'Marcar destaque',
    'destaque-off': 'Remover destaque',
    categoria: 'Mover para categoria "' + val + '"',
    promo: 'Aplicar ' + val + '% de desconto',
    estoque: 'Somar ' + val + ' un. ao estoque',
    preco: 'Definir preço R$ ' + val
  };

  if(!confirm(rotulos[acao] + '\n\nAplicar a ' + ids.length + ' produto(s) selecionado(s)?')) return;

  var feitos = 0, erros = 0;

  for(var i = 0; i < ids.length; i++){
    var p = porId(ids[i]);
    if(!p) continue;

    toast('⚡ Aplicando… ' + (i + 1) + '/' + ids.length);

    try{
      if(acao === 'ativar') p.ativo = true;
      else if(acao === 'inativar') p.ativo = false;
      else if(acao === 'destaque-on') p.destaque = true;
      else if(acao === 'destaque-off') p.destaque = false;
      else if(acao === 'remover-promo'){ p.promo = false; p.precoPromo = 0; }
      else if(acao === 'categoria' && val.trim()){ p.categoria = val.trim().toLowerCase(); }
      else if(acao === 'promo' && parseFloat(val) > 0 && parseFloat(p.preco) > 0){
        p.promo = true;
        p.precoPromo = Math.round(parseFloat(p.preco) * (1 - parseFloat(val) / 100) * 100) / 100;
      }
      else if(acao === 'estoque'){
        p.estoque = Math.max(0, (parseInt(p.estoque) || 0) + parseInt(val || 0));
      }
      else if(acao === 'preco' && parseFloat(val) >= 0){
        p.preco = parseFloat(val);
      }

      await gravarProduto(p);
      feitos++;
    }catch(e){
      erros++;
    }
  }

  /* ✅ Sai do modo de seleção — funciona com as DUAS funções */
  if(typeof window.toggleLote === 'function' && typeof modoLote !== 'undefined' && modoLote){
    window.toggleLote();
  }else if(typeof window.toggleMesclar === 'function' && typeof mesclando !== 'undefined' && mesclando){
    window.toggleMesclar();
  }

  if(typeof window.carregar === 'function') await window.carregar();

  toast(
    erros
      ? ('⚠️ Concluído: ' + feitos + ' ok, ' + erros + ' erro(s).')
      : ('✅ Ação aplicada em ' + feitos + ' produto(s)!'),
    erros ? 'erro' : 'ok'
  );
}

/* ===== 4. BACKUP + LISTA DE PREÇOS ===== */
function injetaBotoes(){
  var div = document.querySelector('.barra-acoes div[style]');
  if(!div || el('lxBtnBackup')) return;

  var b1 = document.createElement('button');
  b1.type = 'button';
  b1.className = 'btn btn-cinza';
  b1.id = 'lxBtnBackup';
  b1.textContent = '💾 Backup';
  b1.onclick = fazerBackup;

  var b2 = document.createElement('button');
  b2.type = 'button';
  b2.className = 'btn btn-cinza';
  b2.id = 'lxBtnPrecos';
  b2.textContent = '🖨️ Preços';
  b2.onclick = listaPrecos;

  div.insertBefore(b2, div.firstChild);
  div.insertBefore(b1, b2);
}

function fazerBackup(){
  var blob = new Blob(
    [JSON.stringify({ gerado_em: new Date().toISOString(), produtos: soma() }, null, 2)],
    { type: 'application/json' }
  );
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'produtos-loja-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  toast('💾 Backup de ' + soma().length + ' produtos baixado!', 'ok');
}

function listaPrecos(){
  var linhas = soma()
    .slice()
    .sort(function(a, b){ return (a.nome || '').localeCompare(b.nome || ''); })
    .map(function(p){
      var emPromo = p.promo && parseFloat(p.precoPromo) > 0 && parseFloat(p.precoPromo) < parseFloat(p.preco);
      return '<tr' + (p.ativo ? '' : ' style="opacity:.45"') + '>' +
        '<td>' + esc(p.nome) + (p.destaque ? ' ⭐' : '') + (p.ativo ? '' : ' <small>(inativo)</small>') + '</td>' +
        '<td>' + esc((p.cores || []).join(', ')) + '</td>' +
        '<td style="text-align:center;">' + (parseInt(p.estoque) || 0) + '</td>' +
        '<td style="text-align:right;">' +
          (emPromo
            ? '<s>R$ ' + fmt(p.preco) + '</s> <b style="color:#c0392b">R$ ' + fmt(p.precoPromo) + '</b>'
            : 'R$ ' + fmt(p.preco)) +
        '</td>' +
      '</tr>';
    }).join('');

  var w = window.open('', '_blank');
  if(!w){ toast('Permita pop-ups para gerar a lista.', 'erro'); return; }

  w.document.write(
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    '<title>Lista de preços — Meu 3D Labs</title>' +
    '<style>body{font-family:Arial;color:#111;margin:22px;}h1{font-size:17px;}h1 span{color:#f26522;}' +
    'table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;}' +
    'td,th{border:1px solid #bbb;padding:7px 9px;text-align:left;}th{background:#f0f3f8;}' +
    '.rodape{margin-top:16px;font-size:10px;color:#888;}@media print{body{margin:8mm;}}</style>' +
    '</head><body>' +
    '<h1>Meu <span>3D</span> Labs — Lista de preços da loja</h1>' +
    '<small>Gerada em ' + new Date().toLocaleString('pt-BR') + '</small>' +
    '<table><tr><th>Produto</th><th>Cores</th><th>Estoque</th><th>Preço</th></tr>' + linhas + '</table>' +
    '<div class="rodape">Documento interno — não entregar ao cliente</div>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
  setTimeout(function(){ try{ w.print(); }catch(e){} }, 450);
}

/* ===== 5. CTRL+V DE IMAGEM NO FORM ===== */
document.addEventListener('paste', function(e){
  if(!el('fNome')) return;
  var items = e.clipboardData && e.clipboardData.items;
  if(!items) return;

  var files = [];
  for(var i = 0; i < items.length; i++){
    if(items[i].type && items[i].type.indexOf('image') === 0){
      var f = items[i].getAsFile();
      if(f) files.push(f);
    }
  }

  if(files.length){
    e.preventDefault();
    if(typeof window.enviarFotos === 'function') window.enviarFotos(files);
    toast('📋 Imagem colada — enviando como foto do produto…');
  }
});

/* ===== 6. ATALHOS DE TECLADO ===== */
document.addEventListener('keydown', function(e){
  /* Ctrl+S — salva o formulário, se aberto e não estiver já salvando */
  if((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')){
    if(el('fNome') && typeof window.salvarProduto === 'function'){
      e.preventDefault();
      var btn = el('btnSalvar');
      if(btn && btn.disabled) return;  /* ✅ evita duplo POST */
      window.salvarProduto();
    }
    return;
  }

  if(e.ctrlKey || e.metaKey || e.altKey) return;

  var tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select') return;

  /* Com form aberto: só Escape */
  if(el('fNome')){
    if(e.key === 'Escape'){
      e.preventDefault();
      if(typeof window.fecharForm === 'function') window.fecharForm();
    }
    return;
  }

  if(e.key === '/'){
    e.preventDefault();
    var bi = el('buscaInput');
    if(bi) bi.focus();
  }
  else if(e.key === 'n' || e.key === 'N'){
    e.preventDefault();
    if(typeof window.abrirForm === 'function') window.abrirForm();
  }
});

/* ===== 7. INICIALIZAÇÃO (com delay para garantir que o HTML montou) ===== */
function iniciar(){
  injetaBotoes();
  injetaMassa();
  injetaSaude();
  injetaChips();
  renderChips();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', iniciar);
}else{
  /* ✅ Reaplica em cada render do painel (após login) */
  iniciar();
}

/* Reaplica as injeções quando o painel é renderizado novamente */
var _carregarOrig = window.carregar;
if(typeof _carregarOrig === 'function'){
  window.carregar = async function(){
    var resultado = await _carregarOrig.apply(this, arguments);
    setTimeout(iniciar, 80);
    return resultado;
  };
}

})();