const API = 'https://meu3dlabs-backend.onrender.com/api';
const CATEGORIAS = ['chaveiros','religiosos','decoracao','miniaturas','colecionaveis','articulados','sensoriais','utilitarios','outros'];
const MATERIAIS = ['PLA','PETG','TPU','ABS'];
const SLUG_MAX = 70;
const ACEITA_ARQUIVO = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/x-m4v';
let token = localStorage.getItem('m3d_token') || '';
let produtos = [];
let editandoId = null;
let imagensTemp = [];
let mesclando = false;
let modoLote = false;
let selecionados = [];
let filtroCategoria = '';
let filtroRapido = '';
let buscaTimer = null;
let slugEditadoManual = false;

/* ===== VÍNCULO FOTO ↔ COR =====
   A API não tem campo "variacoes" (confirmado: 21 campos, sem ele).
   O vínculo é gravado no fim do campo "descricao", após um "|", com a marca M3DVAR.
   produto.html e vitrine já fazem descricao.split('|')[0], então nada aparece no site.
   Guardamos ÍNDICES das imagens (não URLs): curto e sempre consistente com imagens[].
   ================================================================= */
var MARCA_VAR = 'M3DVAR:';
let variacoesTemp = {};   /* cor → [urls limpas] (a primeira é a principal) */
let corPendente = null;

function urlLimpa(u){ return String(u || '').split('#')[0]; }
function descricaoLimpa(d){ return String(d || '').split('|')[0].trim(); }

function lerVariacoesDaDescricao(desc){
  var s = String(desc || '');
  var i = s.indexOf(MARCA_VAR);
  if(i === -1) return null;
  try{
    var bruto = s.slice(i + MARCA_VAR.length).trim();
    return JSON.parse(decodeURIComponent(bruto));
  }catch(e){ return null; }
}

function corDaFoto(u){
  var alvo = urlLimpa(u);
  var achou = '';
  Object.keys(variacoesTemp).forEach(function(c){
    if(!achou && (variacoesTemp[c] || []).indexOf(alvo) > -1) achou = c;
  });
  return achou;
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function gerarSlug(t){
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
    .replace(/^-+/g, '') || '';
}

async function api(path, opts, body){
  const conf = { method: opts || 'GET', headers: {} };
  if(token) conf.headers['Authorization'] = 'Bearer ' + token;
  if(body !== undefined){
    conf.headers['Content-Type'] = 'application/json';
    conf.body = JSON.stringify(body);
  }
  const r = await fetch(API + path, conf);
  const t = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(t.error || 'Erro na requisição');
  return t;
}

function mostrarToast(msg, tipo){
  const t = document.getElementById('toast');
  t.className = '';
  t.textContent = msg;
  if(tipo) t.classList.add(tipo);
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.classList.remove('show'); }, 3200);
}

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]
  ));
}

function fmt(n){
  n = parseFloat(n) || 0;
  return n.toFixed(2).replace('.', ',');
}

/* ============================================================
   MÍDIA: imagem ou vídeo
   ============================================================ */
function urlEhVideo(u){
  return /\.(webm|mp4|mov|m4v)(\?|#|$)/i.test(urlLimpa(u));
}

function previewMidia(u){
  var src = urlLimpa(u);
  if(urlEhVideo(src)){
    return '<video src="' + esc(src) + '" muted loop playsinline autoplay preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>';
  }
  return '<img src="' + esc(src) + '" alt="">';
}

/* ============================================================
   MODO NOTURNO
   ============================================================ */
function alternarNoturno(){
  document.body.classList.toggle('dark');
  const ativo = document.body.classList.contains('dark');
  localStorage.setItem('m3d_adminloja_noturno', ativo ? '1' : '0');
  document.getElementById('btnNoturno').textContent = ativo ? '☀️ Claro' : '🌙 Noturno';
}

if(localStorage.getItem('m3d_adminloja_noturno') === '1'){
  document.addEventListener('DOMContentLoaded', function(){
    document.body.classList.add('dark');
    const b = document.getElementById('btnNoturno');
    if(b) b.textContent = '☀️ Claro';
  });
}

/* ============================================================
   LOGIN
   ============================================================ */
function fazerLogin(){
  const senha = document.getElementById('senha').value.trim();
  if(!senha) return;
  const btn = document.getElementById('btnLogin');
  btn.disabled = true; btn.textContent = 'Entrando...';

  fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  })
  .then(r => r.json().then(t => ({ ok: r.ok, t })))
  .then(({ok, t}) => {
    if(!ok || !t.token){
      document.getElementById('loginErr').style.display = 'block';
      btn.disabled = false; btn.textContent = 'Entrar';
      return;
    }
    token = t.token;
    localStorage.setItem('m3d_token', token);
    entrar();
  })
  .catch(() => {
    document.getElementById('loginErr').textContent = 'Erro de conexão com o servidor';
    document.getElementById('loginErr').style.display = 'block';
    btn.disabled = false; btn.textContent = 'Entrar';
  });
}

function sair(){
  token = '';
  localStorage.removeItem('m3d_token');
  document.getElementById('senha').value = '';
  document.getElementById('loginErr').style.display = 'none';
  document.getElementById('painel').classList.add('hidden');
  document.getElementById('telaLogin').classList.remove('hidden');
}

function entrar(){
  document.getElementById('telaLogin').classList.add('hidden');
  document.getElementById('painel').classList.remove('hidden');
  carregar();
  setTimeout(injetarBotoesFerramentas, 400);
}

/* ============================================================
   CARREGAMENTO
   ============================================================ */
async function carregar(){
  const g = document.getElementById('grade');
  g.innerHTML = '<div class="carregando">Carregando produtos...</div>';
  try{
    const t = await api('/loja/produtos/admin');
    produtos = t.produtos || [];
    render();
  }catch(e){
    if(String(e.message).indexOf('Não autorizado') !== -1){
      sair();
      document.getElementById('loginErr').textContent = 'Sessão expirada. Entre novamente.';
      document.getElementById('loginErr').style.display = 'block';
    }else{
      g.innerHTML = '<div class="carregando">Erro ao carregar: ' + esc(e.message) + '</div>';
    }
  }
}

/* ============================================================
   RESUMO / FILTRO
   ============================================================ */
function badgeEstoque(q){
  q = parseInt(q) || 0;
  if(q <= 0) return '<span class="badge zero">Sem estoque</span>';
  if(q <= 3) return '<span class="badge ult">Últimas ' + q + ' un.</span>';
  return '<span class="badge ok">Em estoque (' + q + ')</span>';
}

function badgeFicha(p){
  var tem = 0;
  if((parseFloat(p.altura) || 0) > 0) tem++;
  if((parseFloat(p.largura) || 0) > 0) tem++;
  if((parseFloat(p.profundidade) || 0) > 0) tem++;
  if((parseFloat(p.peso) || 0) > 0) tem++;
  if(tem === 4){
    return ' <span class="badge ficha-ok" title="Ficha técnica completa">📐 Completa</span>';
  }
  if(tem === 0){
    return ' <span class="badge ficha-zero" title="Sem dimensões cadastradas">📐 Sem ficha</span>';
  }
  return ' <span class="badge ficha-parcial" title="Ficha incompleta">📐 ' + tem + '/4</span>';
}

function renderResumo(){
  const r = document.getElementById('resumo');
  const total = produtos.length;
  const ativos = produtos.filter(p => p.ativo).length;
  const inativos = total - ativos;
  const semEstoque = produtos.filter(p => !(parseInt(p.estoque) > 0)).length;
  const promos = produtos.filter(p => p.promo && parseFloat(p.precoPromo) > 0).length;

  let html = '';
  html += '<div class="resumo-item' + (filtroRapido === '' ? ' ativo' : '') + '" onclick="setFiltroRapido(\'\')"><span class="num">' + total + '</span><span class="rot">total</span></div>';
  html += '<div class="resumo-item' + (filtroRapido === 'ativos' ? ' ativo' : '') + '" onclick="setFiltroRapido(\'ativos\')"><span class="num num-verde">' + ativos + '</span><span class="rot">ativos</span></div>';
  if(inativos) html += '<div class="resumo-item' + (filtroRapido === 'inativos' ? ' ativo' : '') + '" onclick="setFiltroRapido(\'inativos\')"><span class="num num-laranja">' + inativos + '</span><span class="rot">inativos</span></div>';
  if(semEstoque) html += '<div class="resumo-item' + (filtroRapido === 'semEstoque' ? ' ativo' : '') + '" onclick="setFiltroRapido(\'semEstoque\')"><span class="num num-vermelho">' + semEstoque + '</span><span class="rot">sem estoque</span></div>';
  if(promos) html += '<div class="resumo-item' + (filtroRapido === 'promo' ? ' ativo' : '') + '" onclick="setFiltroRapido(\'promo\')"><span class="num num-vermelho">🏷️ ' + promos + '</span><span class="rot">em promoção</span></div>';

    const semFicha = produtos.filter(p => {
    var t = 0;
    if((parseFloat(p.altura) || 0) > 0) t++;
    if((parseFloat(p.largura) || 0) > 0) t++;
    if((parseFloat(p.profundidade) || 0) > 0) t++;
    if((parseFloat(p.peso) || 0) > 0) t++;
    return t < 4;
  }).length;
  if(semFicha) html += '<div class="resumo-item' + (filtroRapido === 'semFicha' ? ' ativo' : '') + '" onclick="setFiltroRapido(\'semFicha\')"><span class="num num-laranja">📐 ' + semFicha + '</span><span class="rot">ficha incompleta</span></div>';

  r.innerHTML = html;
}

function setFiltroRapido(f){
  filtroRapido = (filtroRapido === f) ? '' : f;
  renderResumo();
  renderGrade();
}

function renderFiltroCat(){
  const f = document.getElementById('filtroCat');
  let html = '<button class="' + (filtroCategoria === '' ? 'ativo' : '') + '" onclick="filtrarCat(\'\')">Todas</button>';
  CATEGORIAS.forEach(c => {
    const qtd = produtos.filter(p => p.categoria === c).length;
    if(qtd) html += '<button class="' + (filtroCategoria === c ? 'ativo' : '') + '" onclick="filtrarCat(\'' + c + '\')">' + c.charAt(0).toUpperCase() + c.slice(1) + ' (' + qtd + ')</button>';
  });
  f.innerHTML = html;
}

function filtrarCat(cat){
  filtroCategoria = cat;
  renderFiltroCat();
  renderGrade();
}

function render(){
  renderResumo();
  renderFiltroCat();
  renderGrade();
}

/* ============================================================
   BUSCA
   ============================================================ */
function buscaComDebounce(){
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(renderGrade, 220);
}

/* ============================================================
   GRADE
   ============================================================ */
function renderGrade(){
  const g = document.getElementById('grade');
  const termo = (document.getElementById('buscaInput') ? document.getElementById('buscaInput').value : '').toLowerCase().trim();
  const ordem = document.getElementById('ordemSelect') ? document.getElementById('ordemSelect').value : 'padrao';

  let lista = produtos.slice();

  if(filtroCategoria) lista = lista.filter(p => p.categoria === filtroCategoria);
  if(filtroRapido === 'ativos') lista = lista.filter(p => p.ativo);
  if(filtroRapido === 'inativos') lista = lista.filter(p => !p.ativo);
  if(filtroRapido === 'semEstoque') lista = lista.filter(p => !(parseInt(p.estoque) > 0));
  if(filtroRapido === 'promo') lista = lista.filter(p => p.promo && parseFloat(p.precoPromo) > 0);
    if(filtroRapido === 'semFicha'){
    lista = lista.filter(p => {
      var t = 0;
      if((parseFloat(p.altura) || 0) > 0) t++;
      if((parseFloat(p.largura) || 0) > 0) t++;
      if((parseFloat(p.profundidade) || 0) > 0) t++;
      if((parseFloat(p.peso) || 0) > 0) t++;
      return t < 4;
    });
  }

  if(termo){
    lista = lista.filter(p =>
      (p.nome||'').toLowerCase().indexOf(termo) !== -1 ||
      (p.categoria||'').toLowerCase().indexOf(termo) !== -1
    );
  }

  document.getElementById('vazio').classList.toggle('hidden', lista.length > 0);
  g.innerHTML = '';
  if(!lista.length){
    if(produtos.length){
      g.innerHTML = '<div class="carregando" style="grid-column:1/-1;">Nenhum produto encontrado para "' + esc(termo) + '".</div>';
    }
    return;
  }

  lista.sort((a, b) => {
    if(ordem === 'nome') return (a.nome||'').localeCompare(b.nome||'');
    if(ordem === 'preco-asc') return (parseFloat(a.preco)||0) - (parseFloat(b.preco)||0);
    if(ordem === 'preco-desc') return (parseFloat(b.preco)||0) - (parseFloat(a.preco)||0);
    if(ordem === 'estoque-asc') return (parseInt(a.estoque)||0) - (parseInt(b.estoque)||0);
    if(ordem === 'recentes') return String(b.id||'').localeCompare(String(a.id||''));
    if(a.destaque && !b.destaque) return -1;
    if(!a.destaque && b.destaque) return 1;
    return (a.nome || '').localeCompare(b.nome || '');
  });

  const fragment = document.createDocumentFragment();
  lista.forEach(p => {
    const img = (p.imagens && p.imagens.length) ? urlLimpa(p.imagens[0]) : null;
    const totalImgs = (p.imagens && p.imagens.length) ? p.imagens.length : 0;
    const emPromo = !!p.promo && parseFloat(p.precoPromo) > 0 && parseFloat(p.precoPromo) < parseFloat(p.preco);

    const card = document.createElement('div');
    card.className = 'card';

    let selHtml = '';
    const marcado = selecionados.indexOf(p.id) !== -1;
    if(mesclando || modoLote){
      card.style.outline = marcado ? '2px solid #f26522' : '1px solid #dde3ee';
      selHtml = '<div class="sel-check" style="' + (marcado ? 'background:#f26522;color:#fff;' : '') + '" onclick="toggleSel(\'' + p.id + '\', event)">' + (marcado ? '✓' : '') + '</div>';
    }

    const tagPromo = emPromo
      ? '<span class="tag-promo">-' + Math.round((1 - parseFloat(p.precoPromo) / parseFloat(p.preco)) * 100) + '%</span>'
      : '';

    let fotoHtml;
    if(!img){
      fotoHtml = '<div class="sem-foto">📷 Sem foto<br>adicione no produto</div>';
    }else if(urlEhVideo(img)){
      fotoHtml = '<video src="' + esc(img) + '" muted loop playsinline autoplay preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>';
    }else{
      fotoHtml = '<img src="' + img + '" loading="lazy" alt="' + esc(p.nome) + '">';
    }

    const countHtml = totalImgs > 1 ? '<span class="foto-count">🖼️ ' + totalImgs + '</span>' : '';
    const coresHtml = (p.cores && p.cores.length)
      ? '<div style="font-size:11px;color:#8a94a8;font-weight:600;margin-top:2px;">🎨 ' + esc(p.cores.join(' · ')) + '</div>'
      : '';

    const acoesHtml = (mesclando || modoLote)
      ? '<div style="flex:1;text-align:center;color:#8a94a8;font-size:12px;padding:6px;">Toque na bolinha para selecionar</div>'
      : '<button style="background:#0f1e3d;color:#fff" onclick="abrirForm(\'' + p.id + '\')">Editar</button>' +
        '<button style="background:#eef1f6;color:#0f1e3d" onclick="abrirForm(\'' + p.id + '\',true)">Duplicar</button>' +
        '<button style="background:#E1306C;color:#fff" onclick="abrirStoryProduto(\'' + p.id + '\')" title="Gerar card para o Instagram">📲 Story</button>' +
        '<button style="background:#fde8e5;color:#c0392b" onclick="excluirProduto(\'' + p.id + '\')">Excluir</button>';

    card.innerHTML =
      selHtml + tagPromo +
      '<div class="foto">' + fotoHtml + countHtml + '</div>' +
      '<div class="info">' +
        '<div class="nome">' + esc(p.nome) + (p.destaque ? ' ⭐' : '') + '</div>' +
        '<div class="cat">' + esc(p.categoria || 'outros') + (p.ativo ? '' : ' · <b style="color:#c0392b">inativo</b>') + '</div>' +
        coresHtml +
        (emPromo
          ? '<div class="preco"><span class="preco-antigo">R$ ' + fmt(p.preco) + '</span>R$ ' + fmt(p.precoPromo) + '</div>'
          : '<div class="preco">R$ ' + fmt(p.preco) + '</div>') +
        '<div class="badge-linha">' + badgeEstoque(p.estoque) + (emPromo ? ' <span class="badge promo">Promoção</span>' : '') + badgeFicha(p) + '</div>' +
      '</div>' +
      '<div class="acoes">' + acoesHtml + '</div>';

    fragment.appendChild(card);
  });

  g.appendChild(fragment);
  atualizarBarraLote();
}

/* ============================================================
   AÇÕES EM LOTE
   ============================================================ */
function toggleLote(){
  modoLote = !modoLote;
  selecionados = [];
  if(modoLote && mesclando){
    mesclando = false;
    document.getElementById('barraMesclar').classList.add('hidden');
    document.getElementById('btnMesclar').textContent = '🔗 Mesclar';
  }
  document.getElementById('formArea').innerHTML = '';
  editandoId = null;
  imagensTemp = [];

  if(modoLote){
    document.getElementById('tituloLista').textContent = 'Selecione os produtos';
    document.getElementById('btnLote').textContent = '✕ Cancelar';
    document.getElementById('btnLote').classList.add('btn-laranja');
  }else{
    document.getElementById('tituloLista').textContent = 'Produtos da loja';
    document.getElementById('btnLote').textContent = '☑️ Selecionar';
    document.getElementById('btnLote').classList.remove('btn-laranja');
  }
  atualizarBarraLote();
  renderGrade();
}

function atualizarBarraLote(){
  const barra = document.getElementById('barraLot');
  const count = document.getElementById('blCount');
  if(!barra) return;
  if(modoLote && selecionados.length > 0){
    barra.classList.add('show');
    if(count) count.textContent = selecionados.length;
  }else{
    barra.classList.remove('show');
  }
}

async function loteAcao(acao){
  if(!selecionados.length){
    mostrarToast('Selecione ao menos um produto.', 'erro');
    return;
  }
  const qtd = selecionados.length;
  let msg = '';
  if(acao === 'ativar') msg = 'Ativar ' + qtd + ' produto(s) na loja?';
  if(acao === 'desativar') msg = 'Desativar ' + qtd + ' produto(s) da loja?';
  if(acao === 'excluir') msg = 'Excluir ' + qtd + ' produto(s) permanentemente?\n\nEssa ação não pode ser desfeita.';
  if(!confirm(msg)) return;

  let ok = 0, falhas = 0;
  for(const id of selecionados.slice()){
    const p = produtos.find(x => x.id === id);
    if(!p) continue;
    try{
      if(acao === 'excluir'){
        await api('/loja/produtos/' + id, 'DELETE');
      }else{
        /* preserva a descrição completa, que carrega a meta M3DVAR */
        await api('/loja/produtos/' + id, 'PUT', {
          nome: p.nome,
          slug: p.slug || gerarSlug(p.nome),
          descricao: p.descricao || '',
          preco: p.preco,
          estoque: p.estoque,
          categoria: p.categoria || 'outros',
          cores: p.cores || [],
          imagens: (p.imagens || []).map(urlLimpa),
          destaque: p.destaque || false,
          ativo: (acao === 'ativar'),
          promo: p.promo || false,
          precoPromo: p.precoPromo || 0,
          material: p.material || '',
          altura: p.altura != null ? p.altura : null,
          largura: p.largura != null ? p.largura : null,
          profundidade: p.profundidade != null ? p.profundidade : null,
          peso: p.peso != null ? p.peso : null
        });
      }
      ok++;
    }catch(e){
      falhas++;
    }
  }

  selecionados = [];
  modoLote = false;
  document.getElementById('btnLote').textContent = '☑️ Selecionar';
  document.getElementById('btnLote').classList.remove('btn-laranja');
  document.getElementById('tituloLista').textContent = 'Produtos da loja';
  atualizarBarraLote();
  await carregar();

  if(falhas){
    mostrarToast('✅ ' + ok + ' produto(s) processado(s) · ❌ ' + falhas + ' falhou(ram)', 'erro');
  }else{
    mostrarToast('✅ ' + ok + ' produto(s) processado(s)!', 'ok');
  }
}

/* ============================================================
   SELEÇÃO
   ============================================================ */
function toggleSel(id, ev){
  if(ev) ev.stopPropagation();
  const i = selecionados.indexOf(id);
  if(i === -1) selecionados.push(id);
  else selecionados.splice(i, 1);
  if(mesclando) atualizarBarraMesclar();
  atualizarBarraLote();
  renderGrade();
}

/* ============================================================
   SELETOR DE CORES
   ============================================================ */
const CORES_USADAS = [
  ['Preto','#111111'],['Branco','#f5f5f5'],['Cinza','#9aa4b8'],
  ['Vermelho','#d73a49'],['Laranja','#f26522'],['Amarelo','#e8c33a'],
  ['Verde','#25a858'],['Azul','#1f6feb'],['Roxo','#8250df'],
  ['Rosa','#e066a8'],['Marrom','#8a5a2b'],['Dourado','#d4af37'],
  ['Prata','#c0c6cf']
];

function coresAtuais(){
  try{
    return (document.getElementById('fCores').value || '').split(',').map(s => s.trim()).filter(Boolean);
  }catch(e){ return []; }
}

function renderCoresPick(){
  const box = document.getElementById('coresPick');
  if(!box) return;
  const atuais = coresAtuais();
  let html = '';
  CORES_USADAS.forEach(function(c){
    const sel = atuais.indexOf(c[0]) !== -1;
    html += '<span class="cor-chip' + (sel ? ' sel' : '') + '" onclick="toggleCorChip(\'' + c[0] + '\')"><span class="dot" style="background:' + c[1] + '"></span>' + c[0] + '</span>';
  });
  box.innerHTML = html;
  atualizarCoresPreview();
  renderFotosPorCor();
}

/* ============================================================
   VÍNCULO FOTO ↔ COR (usa a galeria, sem reenviar)
   ============================================================ */
function renderFotosPorCor(){
  var box = document.getElementById('fotosPorCor');
  if(!box) return;

  var cores = coresAtuais();
  if(!cores.length){
    box.innerHTML = '<div style="font-size:12.5px;color:#8a94a8;padding:6px 0;">Selecione ao menos uma cor acima para vincular as fotos.</div>';
    return;
  }
  if(!imagensTemp.length){
    box.innerHTML = '<div style="font-size:12.5px;color:#b26a00;background:#fff4d6;border-radius:10px;padding:10px 12px;line-height:1.5;">📷 A galeria está vazia. Envie as fotos no bloco <b>Fotos do produto</b> logo abaixo e volte aqui — as fotos aparecem automaticamente para você vincular, sem reenviar.</div>';
    return;
  }

  var semVinculo = cores.filter(function(c){ return !(variacoesTemp[c] || []).length; });

  var html = '';
  html += '<div style="font-size:12px;color:#5a6472;line-height:1.55;margin-bottom:10px;">Toque numa foto para dizer a qual cor ela pertence. A <b>primeira marcada</b> é a principal daquela cor (★). Toque de novo em outra marcada para promovê-la. Cada foto pertence a uma cor só.</div>';
  html += '<div style="font-size:11.5px;color:#0f1e3d;background:#eef1f6;border-radius:8px;padding:7px 10px;margin-bottom:10px;font-weight:600;">🖼️ ' + imagensTemp.length + ' foto(s) na galeria · ' + (cores.length - semVinculo.length) + ' de ' + cores.length + ' cor(es) com foto vinculada</div>';

  cores.forEach(function(cor){
    var vinculadas = variacoesTemp[cor] || [];

    html += '<div style="border:1.5px solid #e2e6ee;border-radius:12px;padding:12px;margin-bottom:10px;background:#fff;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;flex-wrap:wrap;">';
    html += '<strong style="font-size:13.5px;color:#0f1e3d;">' + esc(cor) + '</strong>';
    if(vinculadas.length){
      html += '<span style="font-size:11.5px;font-weight:700;color:#0f7a44;">✓ ' + vinculadas.length + ' foto(s) · principal definida</span>';
    }else{
      html += '<span style="font-size:11.5px;font-weight:700;color:#b26a00;">sem foto — usa a galeria geral</span>';
    }
    html += '</div>';

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    imagensTemp.forEach(function(u){
      var alvo = urlLimpa(u);
      var idxV = vinculadas.indexOf(alvo);
      var on = idxV > -1;
      var principal = (idxV === 0);
      var borda = principal ? '#f26522' : (on ? '#0f7a44' : '#e2e6ee');

      html += '<div style="position:relative;width:78px;height:78px;border-radius:9px;overflow:hidden;border:2.5px solid ' + borda + ';opacity:' + (on ? '1' : '.45') + ';background:#f8f9fc;">';
      html += '<button type="button" data-acao="vinc" data-cor="' + esc(cor) + '" data-url="' + esc(alvo) + '" title="' + (on ? (principal ? 'Principal desta cor' : 'Tornar principal') : 'Marcar como ' + esc(cor)) + '" style="position:absolute;inset:0;border:none;padding:0;background:none;cursor:pointer;display:block;width:100%;height:100%;z-index:2;">';
      html += '</button>';
      html += previewMidia(alvo);
      if(on){
        html += '<span style="position:absolute;top:0;left:0;background:' + (principal ? '#f26522' : '#0f7a44') + ';color:#fff;font-size:11px;font-weight:800;padding:1px 7px;border-bottom-right-radius:8px;pointer-events:none;z-index:3;">' + (principal ? '★' : '#' + idxV) + '</span>';
        html += '<button type="button" data-acao="rem" data-cor="' + esc(cor) + '" data-url="' + esc(alvo) + '" title="Desvincular" style="position:absolute;top:0;right:0;width:20px;height:20px;border:none;background:rgba(15,30,61,.9);color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0;z-index:4;">×</button>';
      }
      html += '</div>';
    });
    html += '</div>';

    html += '<div style="margin-top:8px;"><button type="button" data-acao="add" data-cor="' + esc(cor) + '" style="background:none;border:none;color:#f26522;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;padding:0;">+ Enviar foto nova para ' + esc(cor) + '</button></div>';
    html += '</div>';
  });

  if(semVinculo.length && imagensTemp.length){
    html += '<div style="font-size:11.5px;color:#8a94a8;line-height:1.5;margin-top:2px;">Cor sem foto continua mostrando a galeria geral para o cliente — nada quebra.</div>';
  }

  box.innerHTML = html;
}

document.addEventListener('click', function(e){
  var btn = e.target.closest('#fotosPorCor [data-acao][data-cor]');
  if(!btn) return;
  var cor = btn.getAttribute('data-cor');
  var acao = btn.getAttribute('data-acao');
  var url = btn.getAttribute('data-url');
  if(acao === 'vinc') vincularFotoCor(cor, url);
  if(acao === 'rem') desvincularFotoCor(cor, url);
  if(acao === 'add') escolherFotoCor(cor);
});

function vincularFotoCor(cor, url){
  if(!cor || !url) return;
  var alvo = urlLimpa(url);

  /* cada foto pertence a uma cor só — remove das outras */
  Object.keys(variacoesTemp).forEach(function(c){
    if(c === cor) return;
    var k = (variacoesTemp[c] || []).indexOf(alvo);
    if(k > -1) variacoesTemp[c].splice(k, 1);
    if(!variacoesTemp[c].length) delete variacoesTemp[c];
  });

  if(!variacoesTemp[cor]) variacoesTemp[cor] = [];
  var arr = variacoesTemp[cor];
  var i = arr.indexOf(alvo);

  if(i === -1){
    arr.push(alvo);
    mostrarToast('📌 ' + cor + ': foto vinculada' + (arr.length === 1 ? ' como principal ★' : ''), 'ok');
  }else if(i > 0){
    arr.splice(i, 1);
    arr.unshift(alvo);
    mostrarToast('★ ' + cor + ': nova foto principal', 'ok');
  }
  renderFotosPorCor();
}

function desvincularFotoCor(cor, url){
  if(!variacoesTemp[cor]) return;
  var alvo = urlLimpa(url);
  var i = variacoesTemp[cor].indexOf(alvo);
  if(i > -1) variacoesTemp[cor].splice(i, 1);
  if(!variacoesTemp[cor].length) delete variacoesTemp[cor];
  renderFotosPorCor();
}

function escolherFotoCor(cor){
  corPendente = cor;
  var inp = document.getElementById('fileInputCor');
  if(!inp) return;
  inp.value = '';
  inp.click();
}

async function enviarFotosCor(fonte){
  var cor = corPendente;
  if(!cor) return;

  var arquivos = fonte && fonte.files ? Array.from(fonte.files) : [];
  if(!arquivos.length){ corPendente = null; return; }

  for(var ai = 0; ai < arquivos.length; ai++){
    var original = arquivos[ai];
    var url = await processarMidia(original);
    if(!url) continue;
    if(imagensTemp.indexOf(url) === -1) imagensTemp.push(url);
    if(!variacoesTemp[cor]) variacoesTemp[cor] = [];
    if(variacoesTemp[cor].indexOf(url) === -1) variacoesTemp[cor].push(url);
    mostrarToast('📷 Enviada e vinculada em ' + cor, 'ok');
  }

  if(fonte) fonte.value = '';
  corPendente = null;
  renderPreview();
}

/* Meta gravada na descrição: cor → índices das imagens */
function montarVariacoesMeta(){
  var mapa = {};
  coresAtuais().forEach(function(c){
    var idx = (variacoesTemp[c] || []).map(function(u){
      return imagensTemp.indexOf(urlLimpa(u));
    }).filter(function(i){ return i > -1; });
    if(idx.length) mapa[c] = idx;
  });
  return mapa;
}

function montarDescricaoComMeta(textoBase){
  var base = descricaoLimpa(textoBase);
  var mapa = montarVariacoesMeta();
  if(!Object.keys(mapa).length) return base;
  return base + '|' + MARCA_VAR + encodeURIComponent(JSON.stringify(mapa));
}

function toggleCorChip(nome){
  const atuais = coresAtuais();
  const i = atuais.indexOf(nome);
  if(i === -1){
    atuais.push(nome);
  }else{
    atuais.splice(i, 1);
    delete variacoesTemp[nome];
  }
  document.getElementById('fCores').value = atuais.join(', ');
  renderCoresPick();
}

function toggleOutraCor(){
  const inp = document.getElementById('fCorOutra');
  inp.classList.toggle('hidden');
  if(!inp.classList.contains('hidden')) inp.focus();
}

function adicionarCorDigitada(){
  const inp = document.getElementById('fCorOutra');
  const v = (inp.value || '').trim();
  if(!v) return;
  const atuais = coresAtuais();
  if(atuais.indexOf(v) === -1) atuais.push(v);
  document.getElementById('fCores').value = atuais.join(', ');
  inp.value = '';
  atualizarCoresPreview();
  renderFotosPorCor();
}

function atualizarCoresPreview(){
  const pv = document.getElementById('coresPreview');
  if(!pv) return;
  const a = coresAtuais();
  pv.textContent = a.length ? ('Selecionadas: ' + a.join(', ')) : 'Nenhuma cor selecionada ainda.';
}

/* ============================================================
   FORMULÁRIO
   ============================================================ */
function abrirForm(id, duplicar){
  editandoId = (id && !duplicar) ? id : null;
  imagensTemp = [];
  variacoesTemp = {};
  corPendente = null;
  slugEditadoManual = false;

  if(modoLote){ modoLote = false; selecionados = []; atualizarBarraLote(); document.getElementById('btnLote').textContent = '☑️ Selecionar'; document.getElementById('btnLote').classList.remove('btn-laranja'); }
  if(mesclando){ mesclando = false; document.getElementById('barraMesclar').classList.add('hidden'); document.getElementById('btnMesclar').textContent = '🔗 Mesclar'; }

  const p = id ? produtos.find(x => x.id === id) : null;
  const ehDup = !!(id && duplicar && p);
  const fa = document.getElementById('formArea');

  document.getElementById('tituloLista').textContent = ehDup
    ? ('Duplicando: ' + p.nome)
    : (p ? 'Editando: ' + p.nome : 'Novo produto');

  const slugInicial = p ? (ehDup ? gerarSlug(p.nome) : (p.slug || gerarSlug(p.nome))) : '';
  const descBase = p ? descricaoLimpa(p.descricao || '') : '';

  fa.innerHTML =
    '<div class="form-wrap">' +
      '<h3>' + (ehDup ? '📄 Duplicar produto' : (p ? '✏️ Editar produto' : '➕ Postar novo produto')) + '</h3>' +
      (ehDup ? '<p style="font-size:13px;color:#7a5c00;background:#fff4d6;padding:10px 12px;border-radius:8px;margin:-8px 0 16px;">Cópia de <b>' + esc(p.nome) + '</b>. Altere o nome, a cor ou a foto e clique em Salvar. O original não é alterado.</p>' : '') +
      '<div class="campos">' +
        '<div class="campo full"><label>Nome do produto *</label><input id="fNome" maxlength="80" placeholder="Ex.: Chaveiro personalizado" oninput="atualizarSlugPreview();document.getElementById(\'contadorNome\').textContent=this.value.length+\' / 80\';" value="' + (p ? esc(p.nome) : '') + '"></div>' +
        '<div class="campo full"><div class="slug-preview" id="contadorNome">0 / 80</div></div>' +
        '<div class="campo full">' +
          '<label for="fSlug">Slug (link do produto) <span style="font-weight:400;color:#8a94a8;">— gerado do nome, editável</span></label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input id="fSlug" type="text" maxlength="70" placeholder="sera-gerado-do-nome" value="' + esc(slugInicial) + '" oninput="slugEditadoManual=true;atualizarSlugPreview();" style="flex:1;min-width:0;padding:12px 14px;border:1.5px solid #dde3ee;border-radius:9px;font-size:13.5px;color:#0f1e3d;font-family:inherit;">' +
            '<button type="button" onclick="regerarSlugDoNome()" title="Gerar novamente a partir do nome" style="flex-shrink:0;padding:12px 14px;border:1.5px solid #dde3ee;border-radius:9px;background:#f0f3f8;color:#0f1e3d;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;white-space:nowrap;">↻ Regerar</button>' +
          '</div>' +
          '<div class="slug-preview" id="slugPreview">🔗 /loja/<span id="slugTexto">' + esc(slugInicial || 'será gerado do nome') + '</span></div>' +
        '</div>' +
        '<div class="campo full"><label>Descrição</label><textarea id="fDesc" maxlength="500" placeholder="Detalhes, material, tamanho..." oninput="document.getElementById(\'contadorDesc\').textContent=this.value.length+\' / 500\';" style="padding:12px 14px;border:1.5px solid #dde3ee;border-radius:9px;font-size:13.5px;color:#0f1e3d;font-family:inherit;">' + esc(descBase) + '</textarea><div class="slug-preview" id="contadorDesc">0 / 500</div></div>' +
        '<div class="campo"><label>Preço (R$) *</label><input id="fPreco" type="number" step="0.01" min="0" placeholder="0,00" value="' + (p ? p.preco : '') + '" oninput="validarPrecoAoVivo()"></div>' +
        '<div class="campo"><label>Estoque (unidades)</label><input id="fEstoque" type="number" min="0" step="1" placeholder="0 = sem estoque" value="' + (p ? p.estoque : 0) + '"></div>' +
        '<div class="campo"><label>Material</label><select id="fMaterial">' +
          '<option value=""' + (p && !p.material ? ' selected' : '') + '>Não informado</option>' +
          MATERIAIS.map(m => '<option value="' + m + '"' + (p && p.material === m ? ' selected' : '') + '>' + m + '</option>').join('') +
        '</select></div>' +
        '<div class="campo"><label>Peso (gramas) <span style="font-weight:400;color:#8a94a8;">(opcional)</span></label><input id="fPeso" type="number" step="0.1" min="0" placeholder="Ex.: 15" value="' + (p && p.peso != null ? p.peso : '') + '"></div>' +
        '<div class="campo full" style="margin-top:6px;">' +
          '<div class="specs-toggle" onclick="toggleSpecs(this)">' +
            '<span>📐 Dimensões da peça (cm)</span>' +
            '<span class="seta">▼</span>' +
          '</div>' +
          '<div class="specs-corpo">' +
            '<div class="campo-mini"><span class="mini-label">Altura</span><input id="fAltura" type="number" step="0.1" min="0" placeholder="0,0" value="' + (p && p.altura != null ? p.altura : '') + '"></div>' +
            '<div class="campo-mini"><span class="mini-label">Largura</span><input id="fLargura" type="number" step="0.1" min="0" placeholder="0,0" value="' + (p && p.largura != null ? p.largura : '') + '"></div>' +
            '<div class="campo-mini"><span class="mini-label">Profundidade</span><input id="fProfundidade" type="number" step="0.1" min="0" placeholder="0,0" value="' + (p && p.profundidade != null ? p.profundidade : '') + '"></div>' +
          '</div>' +
        '</div>' +
        '<div class="campo"><label>Categoria</label><select id="fCategoria">' +
          CATEGORIAS.map(c => '<option value="' + c + '"' + (p && p.categoria === c ? ' selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>').join('') +
        '</select></div>' +
        '<div class="campo full"><label>Cores (toque para selecionar)</label>' +
          '<div class="cores-pick" id="coresPick"></div>' +
          '<div style="margin-top:8px;"><button type="button" class="btn-cinza-mini" onclick="toggleOutraCor()">+ Outra cor</button></div>' +
          '<input id="fCorOutra" class="hidden" style="margin-top:6px;padding:10px;border:1px solid #dde3ee;border-radius:8px;width:100%;box-sizing:border-box;" placeholder="Escreva o nome da cor e aperte Enter" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adicionarCorDigitada();}">' +
          '<input type="hidden" id="fCores">' +
          '<div class="slug-preview" id="coresPreview"></div>' +
        '</div>' +
        '<div class="campo full">' +
          '<label>🎨 Qual foto é de cada cor <span style="font-weight:400;color:#8a94a8;">— marque na galeria, sem reenviar</span></label>' +
          '<div id="fotosPorCor"></div>' +
          '<input type="file" id="fileInputCor" accept="' + ACEITA_ARQUIVO + '" multiple class="hidden" onchange="enviarFotosCor(this)">' +
        '</div>' +
        '<div class="campo full promo-box">' +
          '<div class="promo-linha"><input type="checkbox" id="fPromo"' + (p && p.promo ? ' checked' : '') + ' onchange="document.getElementById(\'promoPrecoWrap\').style.display=this.checked?\'block\':\'none\';validarPrecoAoVivo();"> 🏷️ Produto em promoção</div>' +
          '<div id="promoPrecoWrap" style="display:' + (p && p.promo ? 'block' : 'none') + ';">' +
            '<label style="font-size:12px;font-weight:600;color:#4a5670;margin-bottom:5px;">Preço promocional (R$) — deve ser MENOR que o preço cheio</label>' +
            '<input id="fPrecoPromo" type="number" step="0.01" min="0" placeholder="0,00" value="' + (p && p.precoPromo != null ? p.precoPromo : '') + '" oninput="validarPrecoAoVivo()">' +
            '<div class="slug-preview" id="promoFeedback"></div>' +
          '</div>' +
        '</div>' +
        '<div class="campo full"><label>Fotos e vídeos do produto <span style="font-weight:400;color:#8a94a8;">(a 1ª é a principal da vitrine — toque na ⭐ para definir)</span></label>' +
          '<div class="upload-area" onclick="document.getElementById(\'fileInput\').click()">' +
            '<div class="icone">📷</div>' +
            '<div class="txt">Toque para escolher foto, GIF ou vídeo (ou vários)<br>JPG, PNG, WEBP, GIF, MP4 ou MOV — vídeo vira loop sem som</div>' +
          '</div>' +
          '<input type="file" id="fileInput" accept="' + ACEITA_ARQUIVO + '" multiple class="hidden" onchange="enviarFotos(this)">' +
          '<div class="imgs-preview" id="preview"></div>' +
        '</div>' +
        '<div class="campo"><label><input type="checkbox" id="fDestaque"' + (p && p.destaque ? ' checked' : '') + '> ⭐ Destaque (aparece primeiro)</label></div>' +
        '<div class="campo"><label><input type="checkbox" id="fAtivo"' + (p === null || p.ativo ? ' checked' : '') + '> Ativo na loja</label></div>' +
      '</div>' +
      '<div class="form-acoes">' +
        '<button class="btn btn-verde" id="btnSalvar" onclick="salvarProduto()">💾 Salvar produto</button>' +
        '<button class="btn btn-cinza" onclick="fecharForm()">Cancelar</button>' +
      '</div>' +
      '<div class="sub-msg" id="subMsg"></div>' +
    '</div>';

  fa.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* Reconstrói galeria e vínculos */
  if(p){
    imagensTemp = (p.imagens || []).map(urlLimpa);
    var mapa = lerVariacoesDaDescricao(p.descricao);
    if(mapa){
      Object.keys(mapa).forEach(function(c){
        var urls = (mapa[c] || []).map(function(i){ return imagensTemp[i]; }).filter(Boolean);
        if(urls.length) variacoesTemp[c] = urls;
      });
    }
  }

  document.getElementById('fCores').value = p ? (p.cores || []).join(', ') : '';
  renderPreview();
  renderCoresPick();

  const cd = document.getElementById('contadorDesc');
  if(cd) cd.textContent = (descBase.length) + ' / 500';
  const cn = document.getElementById('contadorNome');
  if(cn) cn.textContent = String(document.getElementById('fNome').value.length) + ' / 80';
}

function toggleSpecs(el){
  el.classList.toggle('aberto');
  const corpo = el.nextElementSibling;
  if(corpo) corpo.classList.toggle('aberto');
}

function validarPrecoAoVivo(){
  const promoOn = document.getElementById('fPromo') && document.getElementById('fPromo').checked;
  const fb = document.getElementById('promoFeedback');
  if(!promoOn || !fb) return;
  const preco = parseFloat(document.getElementById('fPreco').value) || 0;
  const promo = parseFloat(document.getElementById('fPrecoPromo').value) || 0;
  if(!promo) { fb.textContent = ''; return; }
  if(preco > 0 && promo >= preco){
    fb.style.color = '#c0392b';
    fb.textContent = '⚠️ O preço promocional deve ser MENOR que o preço cheio.';
  }else if(preco > 0){
    const desc = Math.round((1 - promo / preco) * 100);
    fb.style.color = '#1d8a4f';
    fb.textContent = '✅ Desconto de ' + desc + '% — de R$ ' + fmt(preco) + ' por R$ ' + fmt(promo);
  }
}

function atualizarSlugPreview(){
  var nome = document.getElementById('fNome').value.trim();
  var inp = document.getElementById('fSlug');
  var sp = document.getElementById('slugTexto');
  var auto = gerarSlug(nome);
  if(inp && !slugEditadoManual) inp.value = auto;
  var atual = inp ? (inp.value || auto) : auto;
  if(sp) sp.textContent = atual || 'será gerado do nome';
}

function regerarSlugDoNome(){
  var inp = document.getElementById('fSlug');
  if(inp){ inp.value = gerarSlug(document.getElementById('fNome').value.trim()); }
  slugEditadoManual = false;
  atualizarSlugPreview();
  mostrarToast('🔗 Slug regerado a partir do nome.', 'ok');
}

function fecharForm(){
  document.getElementById('formArea').innerHTML = '';
  document.getElementById('tituloLista').textContent = 'Produtos da loja';
  editandoId = null;
  imagensTemp = [];
  variacoesTemp = {};
  corPendente = null;
  slugEditadoManual = false;
}

/* ============================================================
   COMPRESSÃO / CONVERSÃO DE IMAGEM — WebP
   - GIF passa intacto (canvas mataria a animação)
   - demais: redimensiona para no máx. 1200px no maior lado
     e converte para WebP q0.82 (preserva transparência)
   - navegador sem suporte a WebP → cai para JPEG
   - USAR_WEBP = false → volta ao comportamento antigo (JPEG)
   ============================================================ */
var USAR_WEBP = true;
var _suportaWebp = null;

function navegadorGeraWebp(){
  if(_suportaWebp !== null) return _suportaWebp;
  try{
    var c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    _suportaWebp = (c.toDataURL('image/webp').indexOf('data:image/webp') === 0);
  }catch(e){
    _suportaWebp = false;
  }
  return _suportaWebp;
}

function comprimirImagem(arquivo){
  return new Promise(function(resolve){
    /* não é imagem → sobe como veio */
    if(!arquivo.type || arquivo.type.indexOf('image/') !== 0){ resolve(arquivo); return; }
    /* GIF animado → canvas mataria a animação */
    if(arquivo.type === 'image/gif'){ resolve(arquivo); return; }

    var usaWebp = USAR_WEBP && navegadorGeraWebp();
    var formato = usaWebp ? 'image/webp' : 'image/jpeg';

    var img = new Image();
    var url = URL.createObjectURL(arquivo);

    img.onload = function(){
      URL.revokeObjectURL(url);
      var MAX = 1200;
      var w = img.width, h = img.height;
      var esc = (w > MAX || h > MAX) ? Math.min(MAX / w, MAX / h) : 1;

      var cv = document.createElement('canvas');
      cv.width  = Math.max(1, Math.round(w * esc));
      cv.height = Math.max(1, Math.round(h * esc));
      var cx = cv.getContext('2d');

      /* fundo branco só quando vira JPEG — WebP guarda transparência */
      if(formato === 'image/jpeg'){
        cx.fillStyle = '#ffffff';
        cx.fillRect(0, 0, cv.width, cv.height);
      }
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, 0, 0, cv.width, cv.height);

      var base = (arquivo.name || 'foto').replace(/\.[^.]+$/, '');

      cv.toBlob(function(blob){
        if(!blob){ resolve(arquivo); return; }
        var tipoFinal = blob.type || formato;
        var extFinal  = (tipoFinal.indexOf('webp') !== -1) ? '.webp' : '.jpg';
        resolve(new File([blob], base + extFinal, { type: tipoFinal }));
      }, formato, 0.82);
    };

    img.onerror = function(){ URL.revokeObjectURL(url); resolve(arquivo); };
    img.src = url;
  });
}

/* ============================================================
   VÍDEO / GIF → WEBM (loop, sem áudio, estilo GIF)
   ============================================================ */
var VIDEO_MAX_SEG    = 10;        /* duração máxima gerada */
var VIDEO_MAX_LADO   = 720;       /* maior lado em px */
var VIDEO_FPS        = 25;
var VIDEO_BITRATE    = 1200000;   /* ~1,2 Mbps */
var VIDEO_MAX_ORIG_MB = 200;      /* limite do arquivo enviado */

function ehVideoArquivo(f){
  return !!(f && /^video\//i.test(f.type || ''));
}
function ehGifArquivo(f){
  return !!(f && (f.type === 'image/gif' || /\.gif$/i.test(f.name || '')));
}
function mimeWebmSuportado(){
  if(typeof MediaRecorder === 'undefined') return '';
  var lista = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for(var i = 0; i < lista.length; i++){
    try{ if(MediaRecorder.isTypeSupported(lista[i])) return lista[i]; }catch(e){}
  }
  return '';
}

/* lê dimensão e duração do vídeo */
function dimensaoVideo(file){
  return new Promise(function(resolve, reject){
    var url = URL.createObjectURL(file);
    var v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = function(){
      var w = v.videoWidth, h = v.videoHeight, d = v.duration;
      URL.revokeObjectURL(url);
      if(!w || !h){ reject(new Error('vídeo sem dimensão')); return; }
      resolve({ w: w, h: h, dur: isFinite(d) ? d : 0 });
    };
    v.onerror = function(){
      URL.revokeObjectURL(url);
      reject(new Error('o navegador não abriu este formato de vídeo'));
    };
    v.src = url;
  });
}

/* MP4 / MOV / WEBM → WEBM curto em loop */
async function videoParaWebm(file){
  var mime = mimeWebmSuportado();
  if(!mime) throw new Error('este navegador não grava WebM (use Chrome ou Edge)');

  var info = await dimensaoVideo(file);
  var dur  = info.dur > 0 ? Math.min(info.dur, VIDEO_MAX_SEG) : VIDEO_MAX_SEG;
  var esc  = Math.min(1, VIDEO_MAX_LADO / Math.max(info.w, info.h));

  var cv = document.createElement('canvas');
  cv.width  = Math.max(2, Math.round(info.w * esc));
  cv.height = Math.max(2, Math.round(info.h * esc));
  var cx = cv.getContext('2d');

  var url = URL.createObjectURL(file);
  var v = document.createElement('video');
  v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';

  await new Promise(function(res, rej){
    v.onloadeddata = res;
    v.onerror = function(){ rej(new Error('não consegui abrir o vídeo')); };
  });

  var stream = cv.captureStream(VIDEO_FPS);
  var chunks = [];
  var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE });
  rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
  var fim = new Promise(function(res){ rec.onstop = res; });

  rec.start();
  await v.play();

  var inicio = performance.now();
  await new Promise(function(res){
    function tick(){
      if(v.ended || (performance.now() - inicio) / 1000 >= dur){ res(); return; }
      cx.drawImage(v, 0, 0, cv.width, cv.height);
      requestAnimationFrame(tick);
    }
    tick();
  });

  try{ v.pause(); }catch(e){}
  await new Promise(function(r){ setTimeout(r, 120); });
  try{ rec.stop(); }catch(e){}
  await fim;
  stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
  URL.revokeObjectURL(url);

  var blob = new Blob(chunks, { type: 'video/webm' });
  if(!blob.size) throw new Error('gravação vazia');
  var base = String(file.name || 'video').replace(/\.[^.]+$/, '').slice(0, 40);
  return new File([blob], base + '.webm', { type: 'video/webm' });
}

/* GIF animado → WEBM */
async function gifParaWebm(file){
  if(typeof ImageDecoder === 'undefined'){
    throw new Error('este navegador não decodifica GIF animado (use Chrome ou Edge)');
  }
  var mime = mimeWebmSuportado();
  if(!mime) throw new Error('este navegador não grava WebM');

  var data = await file.arrayBuffer();
  var dec = new ImageDecoder({ data: data, type: 'image/gif' });
  await dec.tracks.ready;
  var info = dec.tracks.selectedTrack;
  var total = info ? info.frameCount : 0;
  if(!total) throw new Error('GIF sem quadros');

  var frames = [];
  var acumulado = 0;
  for(var i = 0; i < total && acumulado < VIDEO_MAX_SEG; i++){
    var r = await dec.decode({ frameIndex: i, completeFramesOnly: true });
    var img = r.image;
    var seg = (img.duration || 100000) / 1e6;
    if(!(seg > 0)) seg = 0.1;
    frames.push({ img: img, seg: seg });
    acumulado += seg;
  }
  if(!frames.length) throw new Error('GIF vazio');

  var w0 = frames[0].img.displayWidth  || frames[0].img.codedWidth;
  var h0 = frames[0].img.displayHeight || frames[0].img.codedHeight;
  var esc = Math.min(1, VIDEO_MAX_LADO / Math.max(w0, h0));

  var cv = document.createElement('canvas');
  cv.width  = Math.max(2, Math.round(w0 * esc));
  cv.height = Math.max(2, Math.round(h0 * esc));
  var cx = cv.getContext('2d');

  var stream = cv.captureStream(VIDEO_FPS);
  var chunks = [];
  var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE });
  rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
  var fim = new Promise(function(res){ rec.onstop = res; });

  rec.start();
  var inicio = performance.now();
  var idx = 0, limite = 0;

  await new Promise(function(res){
    function tick(){
      var decorrido = (performance.now() - inicio) / 1000;
      while(limite < decorrido && idx < frames.length - 1){
        limite += frames[idx].seg;
        idx++;
      }
      cx.drawImage(frames[idx].img, 0, 0, cv.width, cv.height);
      if(decorrido < acumulado) requestAnimationFrame(tick);
      else res();
    }
    tick();
  });

  await new Promise(function(r){ setTimeout(r, 120); });
  try{ rec.stop(); }catch(e){}
  await fim;
  stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
  frames.forEach(function(f){ try{ f.img.close(); }catch(e){} });

  var blob = new Blob(chunks, { type: 'video/webm' });
  if(!blob.size) throw new Error('gravação vazia');
  var base = String(file.name || 'gif').replace(/\.[^.]+$/, '').slice(0, 40);
  return new File([blob], base + '.webm', { type: 'video/webm' });
}

async function converterParaWebm(file){
  if(ehVideoArquivo(file)) return videoParaWebm(file);
  if(ehGifArquivo(file))   return gifParaWebm(file);
  return null;
}

/* ============================================================
   UPLOAD
   ============================================================ */
async function subirArquivo(arq){
  var fd = new FormData();
  fd.append('imagem', arq);
  var r = await fetch(API + '/loja/produtos/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd
  });
  var t = await r.json().catch(function(){ return {}; });
  if(!r.ok){
    var msg = t.error || ('Falha no upload (HTTP ' + r.status + ')');
    if(/formato n[ãa]o permitido/i.test(msg)){
      msg = ehVideoArquivo(arq)
        ? 'O servidor recusou o vídeo. Libere video/webm e video/mp4 na rota /loja/produtos/upload e no bucket de storage.'
        : msg;
    }
    throw new Error(msg);
  }
  if(!t.url) throw new Error('O servidor não devolveu a URL do arquivo.');
  return urlLimpa(t.url);
}

/* Trata qualquer arquivo: vídeo/GIF → WebM, imagem → WebP.
   Devolve a URL final ou '' em caso de falha. */
async function processarMidia(original){
  var LIMITE_FINAL    = 8 * 1024 * 1024;
  var LIMITE_ORIGINAL = VIDEO_MAX_ORIG_MB * 1024 * 1024;
  var ehMidia = ehVideoArquivo(original) || ehGifArquivo(original);

  if(ehMidia){
    if(original.size > LIMITE_ORIGINAL){
      mostrarToast('"' + (original.name || 'arquivo') + '" passou de ' + VIDEO_MAX_ORIG_MB + ' MB.', 'erro');
      return '';
    }
    mostrarToast('🎞️ Convertendo "' + (original.name || 'vídeo') + '"… leva alguns segundos.', 'ok');
    var convertido = null;
    try{
      convertido = await converterParaWebm(original);
    }catch(e){
      if(ehVideoArquivo(original)){
        mostrarToast('Não deu para converter: ' + e.message, 'erro');
        return '';
      }
      convertido = original; /* GIF: se falhar, sobe o original */
    }
    if(convertido.size > LIMITE_FINAL){
      mostrarToast('O WebM ficou com ' + (convertido.size / 1048576).toFixed(1) + ' MB. Grave um vídeo mais curto.', 'erro');
      return '';
    }
    try{
      var okM = await subirArquivo(convertido);
      mostrarToast('🎞️ "' + convertido.name + '" enviado!', 'ok');
      return okM;
    }catch(e){
      mostrarToast('Erro no upload: ' + e.message, 'erro');
      return '';
    }
  }

  if(original.size > LIMITE_FINAL){
    mostrarToast('❌ "' + (original.name || 'arquivo') + '" tem ' + (original.size / 1048576).toFixed(1) + ' MB — o limite é 8 MB.', 'erro');
    return '';
  }
  var arq = await comprimirImagem(original);
  try{
    var ok = await subirArquivo(arq);
    mostrarToast('📷 "' + (arq.name || 'Foto') + '" enviada!', 'ok');
    return ok;
  }catch(e){
    mostrarToast('Erro no upload de "' + (arq.name || 'arquivo') + '": ' + e.message, 'erro');
    return '';
  }
}

async function enviarFotos(fonte){
  var arquivos = fonte && fonte.files ? Array.from(fonte.files) : Array.from(fonte || []);
  if(!arquivos.length) return;

  for(var i = 0; i < arquivos.length; i++){
    var url = await processarMidia(arquivos[i]);
    if(url) imagensTemp.push(url);
  }

  if(fonte && fonte.value !== undefined) fonte.value = '';
  renderPreview();
}

function renderPreview(){
  const pr = document.getElementById('preview');
  if(!pr) return;
  pr.innerHTML = '';

  imagensTemp.forEach((u, i) => {
    const d = document.createElement('div');
    d.className = 'mini' + (i === 0 ? ' sel-principal' : '');
    const cor = corDaFoto(u);
    const ehVid = urlEhVideo(u);

    d.innerHTML = previewMidia(u) +
      (cor ? '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,30,61,.85);color:#fff;font-size:9.5px;font-weight:800;text-align:center;padding:2px 0;z-index:2;">' + esc(cor) + '</div>' : '') +
      (ehVid ? '<div style="position:absolute;top:2px;left:2px;background:rgba(15,30,61,.85);color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:6px;z-index:2;">🎞️</div>' : '') +
      '<div class="mini-btns">' +
        (i > 0 ? '<button class="btn-star" title="Definir como principal da vitrine" onclick="definirPrincipal(' + i + ')">★</button>' : '') +
        '<button title="Remover" onclick="removerImg(' + i + ')">×</button>' +
      '</div>' +
      (i === 0 ? '<div class="lb-principal">PRINCIPAL</div>' : '');

    pr.appendChild(d);
  });

  renderFotosPorCor();
}

function definirPrincipal(i){
  if(i <= 0) return;
  const u = imagensTemp.splice(i, 1)[0];
  imagensTemp.unshift(u);
  renderPreview();
  mostrarToast('⭐ Foto principal da vitrine atualizada!', 'ok');
}

function removerImg(i){
  const url = urlLimpa(imagensTemp[i]);
  imagensTemp.splice(i, 1);
  if(url){
    Object.keys(variacoesTemp).forEach(function(c){
      const k = (variacoesTemp[c] || []).indexOf(url);
      if(k > -1) variacoesTemp[c].splice(k, 1);
      if(!variacoesTemp[c].length) delete variacoesTemp[c];
    });
  }
  renderPreview();
}

function mostrarMsg(txt, ok){
  const m = document.getElementById('subMsg');
  if(!m) return;
  m.className = 'sub-msg ' + (ok ? 'ok' : 'erro');
  m.textContent = txt;
  setTimeout(() => { m.className = 'sub-msg'; m.textContent = ''; }, 4000);
}

function lerEspecificacao(){
  return {
    material: document.getElementById('fMaterial').value || '',
    altura: parseFloat(document.getElementById('fAltura').value) || null,
    largura: parseFloat(document.getElementById('fLargura').value) || null,
    profundidade: parseFloat(document.getElementById('fProfundidade').value) || null,
    peso: parseFloat(document.getElementById('fPeso').value) || null
  };
}

/* ============================================================
   SALVAR
   ============================================================ */
async function salvarProduto(){
  const nome = document.getElementById('fNome').value.trim();
  if(!nome){ mostrarToast('Digite o nome do produto.', 'erro'); return; }

  const preco = parseFloat(document.getElementById('fPreco').value) || 0;
  const promoOn = document.getElementById('fPromo').checked;
  const precoPromo = promoOn ? (parseFloat(document.getElementById('fPrecoPromo').value) || 0) : 0;

  if(promoOn && precoPromo <= 0){ mostrarToast('Informe um preço promocional válido.', 'erro'); return; }
  if(promoOn && preco > 0 && precoPromo >= preco){ mostrarToast('O preço promocional deve ser MENOR que o preço cheio.', 'erro'); return; }

  /* Trava de segurança: nunca apagar todas as fotos por acidente */
  if(imagensTemp.length === 0 && editandoId){
    const orig = produtos.find(x => x.id === editandoId);
    if(orig && (orig.imagens || []).length){
      if(!confirm('Atenção: este produto tinha ' + orig.imagens.length + ' foto(s) e você está salvando sem nenhuma imagem.\n\nDeseja continuar mesmo assim?')) return;
    }
  }

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const esp = lerEspecificacao();
  const slugCampo = document.getElementById('fSlug') ? document.getElementById('fSlug').value.trim() : '';
  const descBase = document.getElementById('fDesc').value;

  const dados = {
    nome: nome,
    slug: slugCampo || gerarSlug(nome),
    descricao: montarDescricaoComMeta(descBase),
    preco: preco,
    estoque: parseInt(document.getElementById('fEstoque').value) || 0,
    categoria: document.getElementById('fCategoria').value,
    cores: coresAtuais(),
    imagens: imagensTemp.map(urlLimpa),
    destaque: document.getElementById('fDestaque').checked,
    ativo: document.getElementById('fAtivo').checked,
    promo: promoOn,
    precoPromo: precoPromo,
    material: esp.material,
    altura: esp.altura,
    largura: esp.largura,
    profundidade: esp.profundidade,
    peso: esp.peso
  };

  const tinhaMeta = variacoesTemp && Object.keys(variacoesTemp).length;

  try{
    if(editandoId){
      await api('/loja/produtos/' + editandoId, 'PUT', dados);
    }else{
      await api('/loja/produtos', 'POST', dados);
    }
    fecharForm();
    await carregar();

    /* Confere se a meta voltou do servidor */
    if(tinhaMeta){
      var salvo = produtos.find(function(x){ return x.slug === dados.slug; });
      if(salvo && lerVariacoesDaDescricao(salvo.descricao)){
        mostrarToast('✅ Produto salvo com os vínculos de cor!', 'ok');
      }else{
        mostrarToast('⚠️ Produto salvo, mas o vínculo de cor não voltou. Verifique com o suporte.', 'erro');
      }
    }else{
      mostrarToast('✅ Produto salvo!', 'ok');
    }
  }catch(e){
    mostrarToast('Erro ao salvar: ' + e.message, 'erro');
  }

  btn.disabled = false; btn.textContent = '💾 Salvar produto';
}

async function excluirProduto(id){
  const p = produtos.find(x => x.id === id);
  if(!confirm('Excluir o produto "' + (p ? p.nome : '') + '"? Essa ação não pode ser desfeita.')) return;
  try{
    await api('/loja/produtos/' + id, 'DELETE');
    await carregar();
    mostrarToast('🗑️ Produto excluído.', 'ok');
  }catch(e){
    mostrarToast('Erro ao excluir: ' + e.message, 'erro');
  }
}

/* ============================================================
   MESCLAR
   ============================================================ */
function toggleMesclar(){
  mesclando = !mesclando;
  selecionados = [];
  if(mesclando && modoLote){
    modoLote = false;
    document.getElementById('btnLote').textContent = '☑️ Selecionar';
    document.getElementById('btnLote').classList.remove('btn-laranja');
    atualizarBarraLote();
  }
  document.getElementById('formArea').innerHTML = '';
  editandoId = null;
  imagensTemp = [];

  if(mesclando){
    document.getElementById('tituloLista').textContent = 'Selecione os produtos para mesclar';
    document.getElementById('btnMesclar').textContent = '✕ Cancelar';
    document.getElementById('barraMesclar').classList.remove('hidden');
  }else{
    document.getElementById('tituloLista').textContent = 'Produtos da loja';
    document.getElementById('btnMesclar').textContent = '🔗 Mesclar';
    document.getElementById('barraMesclar').classList.add('hidden');
  }
  atualizarBarraMesclar();
  renderGrade();
}

function atualizarBarraMesclar(){
  const sel = document.getElementById('selPrincipal');
  const ct = document.getElementById('ctSel');
  if(!sel) return;
  ct.textContent = '(' + selecionados.length + ')';
  sel.innerHTML = '';
  selecionados.forEach(id => {
    const p = produtos.find(x => x.id === id);
    if(p){
      const o = document.createElement('option');
      o.value = id;
      o.textContent = p.nome + (p.cores && p.cores.length ? '  ·  ' + p.cores.join(', ') : '');
      sel.appendChild(o);
    }
  });
}

async function mesclarSelecionados(){
  if(selecionados.length < 2){
    mostrarToast('Selecione pelo menos 2 produtos para mesclar.', 'erro');
    return;
  }
  const sel = document.getElementById('selPrincipal');
  const principalId = sel.value;
  const principal = produtos.find(x => x.id === principalId);
  if(!principal){ mostrarToast('Selecione o produto principal.', 'erro'); return; }

  const secundarios = selecionados
    .filter(id => id !== principalId)
    .map(id => produtos.find(x => x.id === id))
    .filter(Boolean);

  if(!secundarios.length){
    mostrarToast('Selecione pelo menos 2 produtos diferentes.', 'erro');
    return;
  }

  if(!confirm('Mesclar ' + (secundarios.length + 1) + ' produtos em "' + principal.nome + '"?\n\nFotos e cores serão unidas no produto principal, o estoque será somado e os demais produtos serão excluídos.')) return;

  let imagens = (principal.imagens || []).map(urlLimpa);
  let cores = (principal.cores || []).slice();
  let metaCor = {};   /* cor → [índices no array final de imagens] */

  /* 1ª passada: empilha imagens na ordem final */
  [principal].concat(secundarios).forEach(function(prod){
    (prod.imagens || []).forEach(function(raw){
      var limpa = urlLimpa(raw);
      if(imagens.indexOf(limpa) === -1) imagens.push(limpa);
    });
    (prod.cores || []).forEach(function(c){ if(cores.indexOf(c) === -1) cores.push(c); });
  });

  /* 2ª passada: traduz a meta de cada produto para índices do array final */
  [principal].concat(secundarios).forEach(function(prod){
    var mat = lerVariacoesDaDescricao(prod.descricao);
    if(!mat) return;
    var imgsProd = (prod.imagens || []).map(urlLimpa);
    Object.keys(mat).forEach(function(c){
      if(!metaCor[c]) metaCor[c] = [];
      (mat[c] || []).forEach(function(i){
        var u = imgsProd[i];
        var pos = imagens.indexOf(u);
        if(pos > -1 && metaCor[c].indexOf(pos) === -1) metaCor[c].push(pos);
      });
    });
  });

  var descricaoFinal = descricaoLimpa(principal.descricao || '');
  if(Object.keys(metaCor).length){
    descricaoFinal += '|' + MARCA_VAR + encodeURIComponent(JSON.stringify(metaCor));
  }

  const dados = {
    nome: principal.nome,
    slug: principal.slug || gerarSlug(principal.nome),
    descricao: descricaoFinal,
    preco: principal.preco,
    estoque: (parseInt(principal.estoque) || 0) + secundarios.reduce((a, s) => a + (parseInt(s.estoque) || 0), 0),
    categoria: principal.categoria || 'outros',
    cores: cores,
    imagens: imagens,
    destaque: principal.destaque || false,
    ativo: principal.ativo,
    promo: principal.promo || false,
    precoPromo: principal.precoPromo || 0,
    material: principal.material || '',
    altura: principal.altura != null ? principal.altura : null,
    largura: principal.largura != null ? principal.largura : null,
    profundidade: principal.profundidade != null ? principal.profundidade : null,
    peso: principal.peso != null ? principal.peso : null
  };

  try{
    await api('/loja/produtos/' + principalId, 'PUT', dados);
    for(const s of secundarios){
      await api('/loja/produtos/' + s.id, 'DELETE');
    }
    mesclando = false;
    selecionados = [];
    document.getElementById('btnMesclar').textContent = '🔗 Mesclar';
    document.getElementById('barraMesclar').classList.add('hidden');
    document.getElementById('tituloLista').textContent = 'Produtos da loja';
    await carregar();
    mostrarToast('✅ Produtos mesclados em "' + principal.nome + '"!', 'ok');
  }catch(e){
    mostrarToast('Erro ao mesclar: ' + e.message, 'erro');
  }
}

/* ============================================================
   FERRAMENTAS: REOTIMIZAR FOTOS / GIFS → VÍDEO
   ============================================================ */
var reotimizando = false;

function injetarBotoesFerramentas(){
  if(!document.getElementById('btnReotimizar')){
    var btn = document.createElement('button');
    btn.id = 'btnReotimizar';
    btn.type = 'button';
    btn.textContent = '⚡ Reotimizar fotos';
    btn.title = 'Converte todas as fotos da loja para WebP e reduz o peso do site';
    btn.style.cssText = 'background:#f26522;border:none;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;white-space:nowrap;';
    btn.onclick = reotimizarTodasImagens;

    var alvo = document.getElementById('btnNoturno');
    if(alvo && alvo.parentNode){
      alvo.parentNode.insertBefore(btn, alvo.nextSibling);
    }else{
      var alvo2 = document.getElementById('btnLote');
      if(alvo2 && alvo2.parentNode) alvo2.parentNode.insertBefore(btn, alvo2);
      else {
        var painel = document.getElementById('painel');
        if(painel) painel.insertBefore(btn, painel.firstChild);
      }
    }
  }

  if(!document.getElementById('btnReotimizarMidia')){
    var btn2 = document.createElement('button');
    btn2.id = 'btnReotimizarMidia';
    btn2.type = 'button';
    btn2.textContent = '🎞️ GIFs → vídeo';
    btn2.title = 'Converte os GIFs antigos em WebM em loop, sem som';
    btn2.style.cssText = 'background:#0f7a44;border:none;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;white-space:nowrap;';
    btn2.onclick = reotimizarMidia;

    var base = document.getElementById('btnReotimizar');
    if(base && base.parentNode) base.parentNode.insertBefore(btn2, base.nextSibling);
  }
}

function _painelReotimizar(titulo){
  if(document.getElementById('reoptOverlay')) return;
  var ov = document.createElement('div');
  ov.id = 'reoptOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,30,61,.62);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML =
    '<div style="background:#fff;border-radius:18px;max-width:470px;width:100%;padding:28px 24px;box-shadow:0 20px 60px rgba(15,30,61,.35);font-family:inherit;">' +
      '<div style="font-size:18px;font-weight:800;color:#0f1e3d;margin-bottom:6px;">' + esc(titulo || 'Reotimizar') + '</div>' +
      '<div id="reoptStatus" style="font-size:13px;color:#5a6472;line-height:1.6;margin-bottom:14px;">Preparando…</div>' +
      '<div style="height:10px;background:#eef1f6;border-radius:20px;overflow:hidden;margin-bottom:14px;">' +
        '<div id="reoptBar" style="height:100%;width:0%;background:linear-gradient(90deg,#f26522,#ff8a3d);transition:width .25s;"></div>' +
      '</div>' +
      '<div id="reoptLog" style="font-size:11.5px;color:#8a94a8;max-height:130px;overflow-y:auto;line-height:1.55;font-family:monospace;"></div>' +
      '<div id="reoptAcoes" style="margin-top:18px;display:none;">' +
        '<button type="button" id="reoptFechar" style="width:100%;padding:12px;border:none;border-radius:10px;background:#0f1e3d;color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;">Fechar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
  document.getElementById('reoptFechar').onclick = function(){
    var o = document.getElementById('reoptOverlay');
    if(o) o.remove();
  };
}

function _reoptStatus(txt){
  var el = document.getElementById('reoptStatus');
  if(el) el.textContent = txt;
}

function _reoptBarra(pct){
  var el = document.getElementById('reoptBar');
  if(el) el.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function _reoptLog(txt){
  var box = document.getElementById('reoptLog');
  if(!box) return;
  var linha = document.createElement('div');
  linha.textContent = txt;
  box.appendChild(linha);
  box.scrollTop = box.scrollHeight;
}

function _reoptFim(titulo, logFinal){
  _reoptStatus(titulo);
  _reoptBarra(100);
  if(logFinal) _reoptLog(logFinal);
  var ac = document.getElementById('reoptAcoes');
  if(ac) ac.style.display = 'block';
}

function baixarImagemComoFile(url){
  return fetch(url, { mode: 'cors', cache: 'no-store' })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    })
    .then(function(blob){
      var nome = String(url).split('?')[0].split('/').pop() || 'foto.jpg';
      return new File([blob], nome, { type: blob.type || 'image/jpeg' });
    });
}

async function subirImagemOtimizada(arq){
  return await subirArquivo(arq);
}

async function reotimizarTodasImagens(){
  if(reotimizando) return;

  var totalFotos = produtos.reduce(function(a, p){ return a + ((p.imagens || []).length); }, 0);
  if(!totalFotos){
    mostrarToast('Nenhuma foto encontrada para reotimizar.', 'erro');
    return;
  }

  var jaWebp = produtos.reduce(function(a, p){
    return a + (p.imagens || []).filter(function(u){ return /\.webp($|\?)/i.test(urlLimpa(u)); }).length;
  }, 0);
  var videos = produtos.reduce(function(a, p){
    return a + (p.imagens || []).filter(urlEhVideo).length;
  }, 0);

  var msg = 'Reotimizar TODAS as fotos da loja para WebP?\n\n' +
            '• ' + totalFotos + ' foto(s) no catálogo\n' +
            '• ' + jaWebp + ' já estão em WebP e serão puladas\n' +
            (videos ? '• ' + videos + ' vídeo(s) serão pulados\n' : '') +
            '\nCada foto é baixada, convertida e enviada de novo.\n' +
            'Pode levar vários minutos. Não feche esta aba.';
  if(!confirm(msg)) return;

  reotimizando = true;
  _painelReotimizar('⚡ Reotimizar fotos');
  _reoptBarra(0);
  _reoptStatus('Iniciando…');

  var feitas = 0, convertidas = 0, puladas = 0, falhas = 0, produtosAlterados = 0;

  try{
    for(var pi = 0; pi < produtos.length; pi++){
      var p = produtos[pi];
      var imgs = (p.imagens || []).map(urlLimpa);
      if(!imgs.length) continue;

      _reoptStatus('Produto ' + (pi + 1) + ' de ' + produtos.length + ' · ' + p.nome);

      var novas = imgs.slice();
      var mudouProduto = false;

      for(var ii = 0; ii < imgs.length; ii++){
        var antiga = imgs[ii];
        feitas++;

        if(/\.webp($|\?)/i.test(antiga) || urlEhVideo(antiga)){
          puladas++;
          _reoptBarra((feitas / totalFotos) * 100);
          continue;
        }

        _reoptLog('→ ' + p.nome + ' · foto ' + (ii + 1) + '/' + imgs.length);

        try{
          var file = await baixarImagemComoFile(antiga);
          var comp = await comprimirImagem(file);
          var novaUrl = await subirImagemOtimizada(comp);

          if(novaUrl && novaUrl !== antiga){
            novas[ii] = novaUrl;
            mudouProduto = true;
            convertidas++;
            _reoptLog('   ✓ ok');
          }else{
            puladas++;
            _reoptLog('   · sem alteração');
          }
        }catch(e){
          falhas++;
          _reoptLog('   ✗ ' + (e.message || 'erro'));
          /* mantém a original nesta posição — a ordem nunca muda */
        }

        _reoptBarra((feitas / totalFotos) * 100);
      }

      if(mudouProduto){
        try{
          await api('/loja/produtos/' + p.id, 'PUT', {
            nome: p.nome,
            slug: p.slug || gerarSlug(p.nome),
            descricao: p.descricao || '',
            preco: p.preco,
            estoque: p.estoque,
            categoria: p.categoria || 'outros',
            cores: p.cores || [],
            imagens: novas,
            destaque: p.destaque || false,
            ativo: p.ativo,
            promo: p.promo || false,
            precoPromo: p.promo ? (p.precoPromo || 0) : 0,
            material: p.material || '',
            altura: p.altura != null ? p.altura : null,
            largura: p.largura != null ? p.largura : null,
            profundidade: p.profundidade != null ? p.profundidade : null,
            peso: p.peso != null ? p.peso : null
          });
          p.imagens = novas;
          produtosAlterados++;
          _reoptLog('   ✅ produto atualizado');
        }catch(e){
          falhas++;
          _reoptLog('   ✗ erro ao salvar produto: ' + (e.message || 'erro'));
        }
      }
    }

    _reoptFim('Concluído.', '✅ ' + convertidas + ' convertida(s) · ' + puladas + ' pulada(s) · ❌ ' + falhas + ' falha(s) · ' + produtosAlterados + ' produto(s) atualizado(s)');

    if(convertidas){
      mostrarToast('✅ ' + convertidas + ' foto(s) convertidas para WebP!', 'ok');
      await carregar();
    }else if(falhas){
      mostrarToast('⚠️ Nenhuma foto convertida. ' + falhas + ' falha(s).', 'erro');
    }else{
      mostrarToast('Tudo já estava otimizado.', 'ok');
    }
  }catch(e){
    _reoptFim('Interrompido.', '❌ ' + (e.message || 'erro inesperado'));
    mostrarToast('Reotimização interrompida: ' + e.message, 'erro');
  }

  reotimizando = false;
}

/* ============================================================
   REOTIMIZAR GIFs ANTIGOS → WEBM
   ============================================================ */
async function reotimizarMidia(){
  if(reotimizando) return;

  var alvos = [];
  produtos.forEach(function(p){
    (p.imagens || []).forEach(function(u, i){
      var limpa = urlLimpa(u);
      if(/\.gif($|\?)/i.test(limpa)) alvos.push({ prod: p, indice: i, url: limpa });
    });
  });

  if(!alvos.length){
    mostrarToast('Nenhum GIF no catálogo. Tudo já está em vídeo.', 'ok');
    return;
  }
  if(typeof ImageDecoder === 'undefined' || !mimeWebmSuportado()){
    mostrarToast('Este navegador não converte GIF. Use Chrome ou Edge.', 'erro');
    return;
  }
  if(!confirm('Converter ' + alvos.length + ' GIF(s) para WebM (loop sem som)?\n\nO peso cai cerca de 90%. Não feche a aba.')) return;

  reotimizando = true;
  _painelReotimizar('🎞️ GIFs → vídeo');
  _reoptBarra(0);
  _reoptStatus('Iniciando…');

  var convertidos = 0, falhas = 0, produtosAlterados = 0;
  var tocados = {};

  try{
    for(var a = 0; a < alvos.length; a++){
      var alvo = alvos[a];
      _reoptStatus('GIF ' + (a + 1) + ' de ' + alvos.length);
      _reoptLog('→ ' + alvo.prod.nome + ' · ' + alvo.url.split('/').pop());

      try{
        var file = await baixarImagemComoFile(alvo.url);
        var webm = await gifParaWebm(file);
        var nova = await subirImagemOtimizada(webm);
        if(!nova) throw new Error('upload vazio');

        alvo.prod.imagens[alvo.indice] = nova;
        tocados[alvo.prod.id] = alvo.prod;
        convertidos++;
        _reoptLog('   ✓ ' + (webm.size / 1024).toFixed(0) + ' kB');
      }catch(e){
        falhas++;
        _reoptLog('   ✗ ' + (e.message || 'erro'));
      }

      _reoptBarra(((a + 1) / alvos.length) * 100);
    }

    for(var id in tocados){
      var p = tocados[id];
      try{
        await api('/loja/produtos/' + p.id, 'PUT', {
          nome: p.nome,
          slug: p.slug || gerarSlug(p.nome),
          descricao: p.descricao || '',
          preco: p.preco,
          estoque: p.estoque,
          categoria: p.categoria || 'outros',
          cores: p.cores || [],
          imagens: (p.imagens || []).map(urlLimpa),
          destaque: p.destaque || false,
          ativo: p.ativo,
          promo: p.promo || false,
          precoPromo: p.promo ? (p.precoPromo || 0) : 0,
          material: p.material || '',
          altura: p.altura != null ? p.altura : null,
          largura: p.largura != null ? p.largura : null,
          profundidade: p.profundidade != null ? p.profundidade : null,
          peso: p.peso != null ? p.peso : null
        });
        produtosAlterados++;
      }catch(e){
        falhas++;
        _reoptLog('   ✗ salvar ' + p.nome + ': ' + e.message);
      }
    }

    _reoptFim('Concluído.', '🎞️ ' + convertidos + ' convertido(s) · ❌ ' + falhas + ' falha(s) · ' + produtosAlterados + ' produto(s) atualizado(s)');

    if(convertidos){
      mostrarToast('✅ ' + convertidos + ' GIF(s) viraram vídeo!', 'ok');
      await carregar();
    }else{
      mostrarToast('Nenhum GIF convertido.', 'erro');
    }
  }catch(e){
    _reoptFim('Interrompido.', '❌ ' + (e.message || 'erro'));
  }

  reotimizando = false;
}

/* ============================================================
   DRAG & DROP
   ============================================================ */
document.addEventListener('dragover', function(e){
  const area = e.target.closest('.upload-area');
  if(area){ e.preventDefault(); area.style.borderColor = '#f26522'; area.style.background = '#fff8f4'; }
});

document.addEventListener('dragleave', function(e){
  const area = e.target.closest('.upload-area');
  if(area){ area.style.borderColor = '#c6cfdd'; area.style.background = ''; }
});

document.addEventListener('drop', function(e){
  const area = e.target.closest('.upload-area');
  if(!area) return;
  e.preventDefault(); e.stopPropagation();
  area.style.borderColor = '#c6cfdd'; area.style.background = '';
  const files = e.dataTransfer && e.dataTransfer.files;
  if(files && files.length) enviarFotos(files);
});

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
if(token) entrar();

function irParaAdmin(){
  const t = localStorage.getItem('m3d_token')
         || sessionStorage.getItem('m3d_token') || '';
  if(t){ try{ localStorage.setItem('m3d_admin_token', t); }catch(e){} }
  window.location.href = 'admin.html';
}

/* ============================================================
   COMPARTILHAR PRODUTO NO INSTAGRAM STORIES
   ============================================================ */
let produtoStoryAtual = null;
let storyProdutoBlobUrl = null;

/* ============================================================
   STORY — MÍDIA DE PRODUTO (imagem / GIF / vídeo)  [v2]
   Correções desta versão:
   - vídeo só é aceito quando realmente está reproduzindo
   - re-play automático a cada quadro (fim do frame congelado)
   - videoWidth/videoHeight lidos no loadedmetadata
   - detecta canvas contaminado por CORS e avisa em vez de gerar preto
   - fallback para poster/imagem se o vídeo falhar
   ============================================================ */
var STORY_DURACAO_SEG = 6;
var STORY_FPS = 30;
var STORY_BITRATE_MBPS = 8;
var STORY_TIMEOUT_MIDIA_MS = 15000;

/* ============================================================
   STORY — ESCOLHA DE MÍDIA POR CONTEXTO
   modo 'card'  → PNG do card: usa FOTO (nunca vídeo)
   modo ausente → vídeo: mantém vídeo > GIF > imagem
   ============================================================ */
function storyMidiaDoCard(p, modo){
  if(modo !== 'card') return storyEscolherMidia(p);
  var urls = (p && p.imagens) ? p.imagens.map(urlLimpa) : [];
  var i, u;
  /* 1ª escolha: foto real (ignora vídeo e GIF) */
  for(i = 0; i < urls.length; i++){
    u = urls[i];
    if(u && !urlEhVideo(u) && !/\.gif(\?|#|$)/i.test(u)) return { url: u, tipo: 'imagem' };
  }
  /* 2ª escolha: GIF — no PNG entra o primeiro quadro, como imagem */
  for(i = 0; i < urls.length; i++){
    u = urls[i];
    if(u && !urlEhVideo(u)) return { url: u, tipo: 'imagem' };
  }
  /* 3ª escolha: só existe vídeo — usa o frame do vídeo */
  for(i = 0; i < urls.length; i++){
    u = urls[i];
    if(u && urlEhVideo(u)) return { url: u, tipo: 'video' };
  }
  return { url: null, tipo: 'none' };
}

function storyCarregarImagem(src){
  return new Promise(function(resolve, reject){
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){ resolve(img); };
    img.onerror = function(){ reject(new Error('img')); };
    img.src = src;
  });
}

/* ---------- VÍDEO ---------- */
function storyCarregarVideo(src, tentativaCors){
  var comCors = (tentativaCors !== false);
  return new Promise(function(resolve, reject){
    var v = document.createElement('video');
    if(comCors) v.crossOrigin = 'anonymous';
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('muted', '');
    v.preload = 'auto';

    var finalizado = false;
    var timer = setTimeout(function(){ falhar(new Error('timeout ao abrir o vídeo')); }, STORY_TIMEOUT_MIDIA_MS);

    function limpar(){
      clearTimeout(timer);
    }
    function falhar(e){
      if(finalizado) return;
      finalizado = true;
      limpar();
      try{ v.removeAttribute('src'); v.load(); }catch(_){}
      reject(e);
    }
    function sucesso(){
      if(finalizado) return;
      if(!v.videoWidth || !v.videoHeight){
        falhar(new Error('vídeo sem dimensão'));
        return;
      }
      finalizado = true;
      limpar();
      resolve(v);
    }

    v.addEventListener('loadedmetadata', function(){
      /* ainda não dá para desenhar: espera o primeiro frame */
      if(v.readyState >= 2){ tocar(); }
    });
    v.addEventListener('loadeddata', tocar);

    function tocar(){
      if(finalizado) return;
      if(!v.videoWidth || !v.videoHeight) return;
      var p;
      try{ p = v.play(); }catch(e){ p = null; }
      if(p && typeof p.then === 'function'){
        p.then(sucesso).catch(function(){
          /* autoplay barrado: o adapter re-tenta durante a gravação,
             mas só vale continuar se já existe frame decodificado */
          if(v.readyState >= 2) sucesso();
          else falhar(new Error('autoplay bloqueado'));
        });
      }else{
        sucesso();
      }
    }

    v.addEventListener('error', function(){
      falhar(new Error(comCors ? 'erro de CORS/vídeo' : 'formato de vídeo não suportado'));
    });

    v.src = src;
    try{ v.load(); }catch(_){}
  }).catch(function(e){
    /* se falhou com CORS, tenta sem — pode ser só header faltando no bucket.
       O canvas vai ficar contaminado, então só usamos como último recurso. */
    if(comCors) return storyCarregarVideo(src, false);
    throw e;
  });
}

/* ---------- GIF ---------- */
function storyDecodificarGif(src){
  return new Promise(function(resolve, reject){
    if(typeof ImageDecoder === 'undefined'){ reject(new Error('sem ImageDecoder')); return; }
    fetch(src, { mode: 'cors', cache: 'force-cache' })
      .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function(buf){
        var dec = new ImageDecoder({ data: buf, type: 'image/gif' });
        dec.tracks.ready.then(function(){
          var info = dec.tracks.selectedTrack;
          var total = info ? info.frameCount : 0;
          var frames = [];
          var acumulado = 0;
          function passo(i){
            if(i >= total || acumulado >= STORY_DURACAO_SEG){
              resolve({ frames: frames, duracao: acumulado });
              return;
            }
            dec.decode({ frameIndex: i, completeFramesOnly: true })
              .then(function(r){
                var im = r.image;
                var seg = (im.duration || 100000) / 1e6;
                if(!(seg > 0)) seg = 0.1;
                frames.push({ img: im, seg: seg });
                acumulado += seg;
                passo(i + 1);
              })
              .catch(function(){ resolve({ frames: frames, duracao: acumulado }); });
          }
          if(!total){ reject(new Error('GIF vazio')); return; }
          passo(0);
        }).catch(reject);
      })
      .catch(reject);
  });
}

/* ---------- adaptadores ---------- */
function storyMidiaImagem(img){
  return {
    tipo: 'imagem', animado: false,
    largura: img.width, altura: img.height,
    garantirPlay: function(){},
    desenhar: function(ctx, x, y, w, h, t){
      var k = 1 + 0.05 * (Math.min(t || 0, STORY_DURACAO_SEG) / STORY_DURACAO_SEG);
      var dw = w * k, dh = h * k;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    },
    desenharFundo: function(ctx, x, y, w, h){
      var esc = Math.max(w / img.width, h / img.height);
      var dw = img.width * esc, dh = img.height * esc;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    },
    dispose: function(){}
  };
}

function storyMidiaGif(g){
  var f0 = g.frames[0].img;
  var w = f0.displayWidth || f0.codedWidth;
  var h = f0.displayHeight || f0.codedHeight;
  var dur = g.duracao > 0 ? g.duracao : 1;
  function quadro(t){
    var alvo = ((t || 0) % dur);
    var acc = 0;
    for(var i = 0; i < g.frames.length; i++){
      acc += g.frames[i].seg;
      if(alvo < acc) return g.frames[i].img;
    }
    return g.frames[g.frames.length - 1].img;
  }
  return {
    tipo: 'gif', animado: true,
    largura: w, altura: h,
    garantirPlay: function(){},
    desenhar: function(ctx, x, y, ww, hh, t){
      try{ ctx.drawImage(quadro(t), x, y, ww, hh); }catch(e){}
    },
    desenharFundo: function(ctx, x, y, ww, hh, t){
      try{ ctx.drawImage(quadro(t), x, y, ww, hh); }catch(e){}
    },
    dispose: function(){
      g.frames.forEach(function(f){ try{ f.img.close(); }catch(e){} });
    }
  };
}

function storyMidiaVideo(v){
  var w = v.videoWidth || 720;
  var h = v.videoHeight || 720;

  function garantirPlay(){
    if(v.ended){ try{ v.currentTime = 0; }catch(e){} }
    if(v.paused){
      var p;
      try{ p = v.play(); }catch(e){ p = null; }
      if(p && typeof p.catch === 'function') p.catch(function(){});
    }
  }

  return {
    tipo: 'video', animado: true,
    elemento: v,
    largura: w, altura: h,
    garantirPlay: garantirPlay,
    reiniciar: function(){
      try{ v.currentTime = 0; }catch(e){}
      garantirPlay();
    },
    desenhar: function(ctx, x, y, ww, hh){
      garantirPlay();
      try{ ctx.drawImage(v, x, y, ww, hh); }catch(e){}
    },
    desenharFundo: function(ctx, x, y, ww, hh){
      garantirPlay();
      try{ ctx.drawImage(v, x, y, ww, hh); }catch(e){}
    },
    dispose: function(){
      try{ v.pause(); }catch(e){}
      try{ v.removeAttribute('src'); v.load(); }catch(e){}
    }
  };
}

/* ============================================================
   STORY — SELEÇÃO DE MÍDIA
   Regra: vídeo > GIF > imagem. Procura o vídeo em QUALQUER campo
   do produto, não só em imagens[0].
   ============================================================ */
var STORY_EXT_VIDEO = /\.(webm|mp4|mov|m4v|ogv|ogg)(\?|#|$)/i;
var STORY_EXT_IMG   = /\.(jpe?g|png|webp|avif|bmp)(\?|#|$)/i;

function storyListaUrls(obj, saida){
  var urls = saida || [];
  function push(v){
    if(!v) return;
    if(typeof v === 'string'){
      if(/^(https?:|\/\/|data:)/i.test(v.trim())) urls.push(v.trim());
      return;
    }
    if(Array.isArray(v)){ v.forEach(push); return; }
    if(typeof v === 'object'){
      ['url','src','arquivo','file','caminho','href','publicUrl','public_url','path']
        .forEach(function(k){ if(v[k]) push(v[k]); });
    }
  }
  if(!obj) return urls;
  [
    /* campos de vídeo primeiro */
    'video','videoUrl','video_url','videoPrincipal','video_story','storyVideo',
    'midia','midiaUrl','midia_url','webm','mp4','arquivoVideo','arquivos',
    /* depois imagem/gif */
    'imagens','imagem','imagemUrl','imagem_url','fotos','galeria','thumbnail','capa'
  ].forEach(function(k){ push(obj[k]); });
  return urls;
}

function storyEscolherMidia(p){
  var urls = storyListaUrls(p);
  var video = null, gif = null, img = null, desconhecido = null;

  for(var i = 0; i < urls.length; i++){
    var u = urlLimpa(urls[i]);
    if(video) continue;
    if(STORY_EXT_VIDEO.test(u)){ video = u; continue; }
    if(/\.gif(\?|#|$)/i.test(u)){ if(!gif) gif = u; continue; }
    if(STORY_EXT_IMG.test(u)){ if(!img) img = u; continue; }
    if(!desconhecido) desconhecido = u;
  }

  if(video) return { url: video, tipo: 'video' };
  if(gif)   return { url: gif,   tipo: 'gif' };
  if(img)   return { url: img,   tipo: 'imagem' };

  /* sem extensão reconhecível: tenta vídeo primeiro, o loader cai para imagem */
  if(desconhecido) return { url: desconhecido, tipo: 'auto' };
  return { url: null, tipo: 'none' };
}

/* diagnóstico — rode no console do admin: storyDebugMidia() */
function storyDebugMidia(){
  if(!produtoStoryAtual){ console.log('Abra o Story de um produto primeiro.'); return; }
  var todas = storyListaUrls(produtoStoryAtual);
  var escolha = storyEscolherMidia(produtoStoryAtual);
  console.table(todas.map(function(u){
    return {
      url: u,
      video: STORY_EXT_VIDEO.test(u),
      gif: /\.gif(\?|#|$)/i.test(u),
      imagem: STORY_EXT_IMG.test(u)
    };
  }));
  console.log('ESCOLHIDA →', escolha.tipo, escolha.url);
  return escolha;
}

function storyCarregarMidia(url, tipoDica){
  var vazio = {
    tipo: 'none', animado: false, largura: 0, altura: 0,
    garantirPlay: function(){}, desenhar: function(){}, desenharFundo: null,
    dispose: function(){}
  };
  if(!url) return Promise.resolve(vazio);

  var limpa = urlLimpa(url);

  if(tipoDica === 'gif' || /\.gif(\?|#|$)/i.test(limpa)){
    /* ... bloco GIF igual ao atual ... */
  }

  if(tipoDica === 'video' || tipoDica === 'auto' || urlEhVideo(limpa)){
    return storyCarregarVideo(limpa)
      .then(storyMidiaVideo)
      .catch(function(){
        if(tipoDica !== 'auto') return storyCarregarImagem(limpa).then(storyMidiaImagem).catch(function(){ return vazio; });
        /* 'auto' sem extensão: se não é vídeo, tenta imagem */
        return storyCarregarImagem(limpa).then(storyMidiaImagem).catch(function(){ return vazio; });
      });
  }

  if(urlEhVideo(limpa)){
    return storyCarregarVideo(limpa)
      .then(storyMidiaVideo)
      .catch(function(){
        /* último recurso: usa a imagem/poster para não gravar tela vazia */
        return storyCarregarImagem(limpa)
          .then(storyMidiaImagem)
          .catch(function(){ return vazio; });
      });
  }

  return storyCarregarImagem(limpa)
    .then(storyMidiaImagem)
    .catch(function(){ return vazio; });
}

/* ============================================================
   STORY — DESENHO DO CARD
   ============================================================ */
function storyQuebrarLinhas(ctx, texto, maxLargura){
  var palavras = String(texto || '').split(/\s+/);
  var linhas = [];
  var atual = '';
  for(var i = 0; i < palavras.length; i++){
    var teste = atual ? atual + ' ' + palavras[i] : palavras[i];
    if(ctx.measureText(teste).width > maxLargura && atual){
      linhas.push(atual);
      atual = palavras[i];
    }else{
      atual = teste;
    }
  }
  if(atual) linhas.push(atual);
  return linhas;
}

function storyPathArredondado(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function storyNomeCategoria(cat){
  var c = String(cat || 'outros');
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function storyDimensoes(p){
  var partes = [];
  var alt = parseFloat(p.altura) || 0;
  if(alt > 0) partes.push(String(alt).replace('.', ',') + ' cm');
  var peso = parseFloat(p.peso) || 0;
  if(peso > 0){
    var pesoTxt = peso >= 1000
      ? (peso / 1000).toFixed(2).replace('.', ',') + ' kg'
      : String(peso).replace('.', ',') + ' g';
    partes.push(pesoTxt);
  }
  return partes.join('  ·  ');
}

function storyDesenharQuadro(ctx, W, H, p, midia, imgLogo, t, cache){
  var preco      = parseFloat(p.preco) || 0;
  var precoPromo = parseFloat(p.precoPromo) || 0;
  var emPromo    = !!p.promo && precoPromo > 0 && precoPromo < preco;
  var precoFinal = emPromo ? precoPromo : preco;
  var desconto   = emPromo ? Math.round((1 - precoPromo / preco) * 100) : 0;
  var catTxt     = storyNomeCategoria(p.categoria);

  var g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0f1e3d');
  g.addColorStop(0.55, '#16294f');
  g.addColorStop(1, '#1d3a6b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  var rg = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, W * 0.9);
  rg.addColorStop(0, 'rgba(242,101,34,0.26)');
  rg.addColorStop(1, 'rgba(242,101,34,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for(var x = 0; x <= W; x += 60){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for(var y = 0; y <= H; y += 60){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  var rx = 60, ry = 210, rw = W - 120, rh = 720, raio = 32;

  if(midia && midia.tipo !== 'none'){
    ctx.save();
    storyPathArredondado(ctx, rx, ry, rw, rh, raio);
    ctx.clip();
    if(cache && cache.fundo){
      ctx.drawImage(cache.fundo, rx, ry, rw, rh);
    }else if(midia.desenharFundo){
      midia.desenharFundo(ctx, rx, ry, rw, rh, t);
    }else{
      midia.desenhar(ctx, rx, ry, rw, rh, t);
    }
    ctx.fillStyle = 'rgba(10,20,40,0.58)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();

    var escC = Math.min(rw / midia.largura, rh / midia.altura);
    var dwC = midia.largura * escC;
    var dhC = midia.altura * escC;
    var dxC = rx + (rw - dwC) / 2;
    var dyC = ry + (rh - dhC) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 44;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    storyPathArredondado(ctx, dxC, dyC, dwC, dhC, 20);
    ctx.fill();
    ctx.restore();

    ctx.save();
    storyPathArredondado(ctx, dxC, dyC, dwC, dhC, 20);
    ctx.clip();
    midia.desenhar(ctx, dxC, dyC, dwC, dhC, t);
    ctx.restore();

    ctx.save();
    storyPathArredondado(ctx, dxC, dyC, dwC, dhC, 20);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    var dimTxt = storyDimensoes(p);
    if(dimTxt){
      var badgeH = 58, badgePad = 24, icoLarg = 30;
      var badgeX = rx + 20, badgeY = ry + 20;
      ctx.font = 'bold 30px Inter, Arial, sans-serif';
      var largTxt = ctx.measureText(dimTxt).width;
      var largBadge = badgePad + icoLarg + 10 + largTxt + badgePad;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'rgba(15,30,61,0.88)';
      ctx.beginPath();
      if(ctx.roundRect){ ctx.roundRect(badgeX, badgeY, largBadge, badgeH, badgeH / 2); }
      else { ctx.rect(badgeX, badgeY, largBadge, badgeH); }
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#ff8a3d';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      var icoX = badgeX + badgePad;
      var icoY = badgeY + badgeH / 2;
      ctx.beginPath();
      ctx.moveTo(icoX, icoY + 10);
      ctx.lineTo(icoX + 20, icoY + 10);
      ctx.lineTo(icoX + 20, icoY - 10);
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(icoX + 6, icoY + 10); ctx.lineTo(icoX + 6, icoY + 3);
      ctx.moveTo(icoX + 13, icoY + 10); ctx.lineTo(icoX + 13, icoY + 5);
      ctx.stroke();
      ctx.lineCap = 'butt';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(dimTxt, icoX + icoLarg + 10, icoY + 1);
    }
  }else{
    ctx.save();
    storyPathArredondado(ctx, rx, ry, rw, rh, raio);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.font = '180px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', W / 2, ry + rh / 2);
  }

  ctx.font = 'bold 30px Inter, Arial, sans-serif';
  var largCat = ctx.measureText(catTxt.toUpperCase()).width + 56;
  var catX = 60, catY = 990;
  ctx.fillStyle = 'rgba(242,101,34,0.20)';
  ctx.beginPath();
  if(ctx.roundRect){ ctx.roundRect(catX, catY, largCat, 58, 29); }
  else { ctx.rect(catX, catY, largCat, 58); }
  ctx.fill();
  ctx.strokeStyle = 'rgba(242,101,34,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ff8a3d';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(catTxt.toUpperCase(), catX + 28, catY + 30);

  if(emPromo){
    ctx.font = 'bold 32px Inter, Arial, sans-serif';
    var txtDesc = '-' + desconto + '% OFF';
    var largDesc = ctx.measureText(txtDesc).width + 52;
    var descX = W - 60 - largDesc;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    if(ctx.roundRect){ ctx.roundRect(descX, catY, largDesc, 58, 29); }
    else { ctx.rect(descX, catY, largDesc, 58); }
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txtDesc, descX + largDesc / 2, catY + 30);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  var linhas = storyQuebrarLinhas(ctx, p.nome, W - 120);
  var maxLinhas = 3;
  if(linhas.length > maxLinhas){
    linhas = linhas.slice(0, maxLinhas);
    linhas[maxLinhas - 1] = linhas[maxLinhas - 1].replace(/\s+\S*$/, '') + '…';
  }
  var yNome = catY + 92;
  linhas.forEach(function(l, i){
    ctx.fillText(l, 60, yNome + i * 72);
  });

  var yPreco = yNome + linhas.length * 72 + 34;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  if(emPromo){
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 36px Inter, Arial, sans-serif';
    var txtAntigo = 'R$ ' + fmt(preco);
    ctx.fillText(txtAntigo, 60, yPreco);
    var wAntigo = ctx.measureText(txtAntigo).width;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, yPreco + 26);
    ctx.lineTo(60 + wAntigo, yPreco + 26);
    ctx.stroke();
    yPreco += 56;
  }
  ctx.fillStyle = '#ff8a3d';
  ctx.font = 'bold 108px Inter, Arial, sans-serif';
  ctx.fillText('R$ ' + fmt(precoFinal), 60, yPreco);

  var yPag = yPreco + 122;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '600 32px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Pix com 5% OFF  ·  Cartão em até 12x', 60, yPag);

  var yRodape = H - 155;
  var tamLogo = 88;
  var yLogoCentro = yRodape + 26;
  var yLinha = yLogoCentro - (tamLogo / 2) - 34;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, yLinha);
  ctx.lineTo(W - 60, yLinha);
  ctx.stroke();

  var xLogo = 100;
  if(imgLogo){
    try{ ctx.drawImage(imgLogo, xLogo, yLogoCentro - tamLogo / 2, tamLogo, tamLogo); }catch(e){}
  }
  var xTexto = xLogo + (imgLogo ? tamLogo + 22 : 0);
  ctx.font = 'bold 54px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Meu', xTexto, yLogoCentro);
  var wMeu = ctx.measureText('Meu').width;
  ctx.fillStyle = '#ff8a3d';
  ctx.fillText('3D', xTexto + wMeu, yLogoCentro);
  var w3D = ctx.measureText('3D').width;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Labs', xTexto + wMeu + w3D, yLogoCentro);

  ctx.font = '600 34px Inter, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('meu3dlabs.com.br', W - 60, yLogoCentro);
}

/* ============================================================
   STORY — PREPARAR CENA
   ============================================================ */
function storyCanvasContaminado(ctx){
  try{
    ctx.getImageData(0, 0, 1, 1);
    return false;
  }catch(e){
    return true;
  }
}

function storyPrepararCena(p, modo){
  return new Promise(function(resolve, reject){
    var W = 1080, H = 1920;
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');
    var imgLogo = null;
    var midia = null;
    var liberado = false;

    var pLogo = fetch(API + '/logo-base64')
      .then(function(r){ return r.json(); })
      .then(function(t){
        if(!t || !t.dataUrl) throw new Error('sem-logo');
        return storyCarregarImagem(t.dataUrl);
      })
      .then(function(i){ imgLogo = i; })
      .catch(function(){
        return storyCarregarImagem('img/logo/logo.png')
          .then(function(i){ imgLogo = i; })
          .catch(function(){});
      });

       var escolhaMidia = storyMidiaDoCard(p, modo);
    console.log('[story] mídia escolhida:', escolhaMidia.tipo, escolhaMidia.url);

    var pMidia = storyCarregarMidia(escolhaMidia.url, escolhaMidia.tipo)
      .then(function(m){ midia = m; })
      .catch(function(){
        midia = {
          tipo: 'none', animado: false, largura: 0, altura: 0,
          garantirPlay: function(){}, desenhar: function(){},
          desenharFundo: null, dispose: function(){}
        };
      });

    Promise.all([pLogo, pMidia]).then(function(){
      var cache = { fundo: null };

      /* fundo desfocado em cache — mantém 30 fps no celular */
      if(midia && midia.tipo !== 'none'){
        try{
          var bk = document.createElement('canvas');
          bk.width = 360;
          bk.height = 240;
          var bx = bk.getContext('2d');
          if(bx.filter !== undefined){
            try{ bx.filter = 'blur(16px)'; }catch(e){}
          }
          if(midia.desenharFundo){
            midia.desenharFundo(bx, -20, -20, bk.width + 40, bk.height + 40, 0);
          }else{
            midia.desenhar(bx, -20, -20, bk.width + 40, bk.height + 40, 0);
          }
          if(bx.filter !== undefined){
            try{ bx.filter = 'none'; }catch(e){}
          }
          if(!storyCanvasContaminado(bx)) cache.fundo = bk;
        }catch(e){ cache.fundo = null; }
      }

      resolve({
        canvas: cv,
        ctx: ctx,
        W: W,
        H: H,
        temAnimacao: !!(midia && midia.animado),
        duracao: STORY_DURACAO_SEG,
        garantirPlay: function(){
          if(midia && midia.garantirPlay) midia.garantirPlay();
        },
        reiniciarMidia: function(){
          if(midia && midia.reiniciar) midia.reiniciar();
        },
        desenhar: function(t){
          storyDesenharQuadro(ctx, W, H, p, midia, imgLogo, t || 0, cache);
        },
        canvasLimpo: function(){ return !storyCanvasContaminado(ctx); },
        dispose: function(){
          if(liberado) return;
          liberado = true;
          if(midia && midia.dispose) midia.dispose();
        }
      });
    }).catch(reject);
  });
}

function storyDesenharCard(p){
   return storyPrepararCena(p, 'card').then(function(cena){
    cena.desenhar(0);
    var cv = cena.canvas;
    try{ cena.dispose(); }catch(e){}
    return cv;
  });
}

/* ============================================================
   STORY — GRAVAÇÃO DO VÍDEO
   ============================================================ */
var STORY_MIME_CACHE = null;
function storyMimeVideo(){
  if(STORY_MIME_CACHE !== null) return STORY_MIME_CACHE;
  STORY_MIME_CACHE = '';
  if(typeof MediaRecorder === 'undefined') return '';
  var lista = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for(var i = 0; i < lista.length; i++){
    try{
      if(MediaRecorder.isTypeSupported(lista[i])){ STORY_MIME_CACHE = lista[i]; break; }
    }catch(e){}
  }
  return STORY_MIME_CACHE;
}

function storyGravarVideo(cena){
  return new Promise(function(resolve, reject){
    var mime = storyMimeVideo();
    if(!mime){ reject(new Error('este navegador não grava vídeo')); return; }
    if(!cena.canvas.captureStream){
      reject(new Error('captureStream indisponível neste navegador'));
      return;
    }

    var stream;
    try{ stream = cena.canvas.captureStream(STORY_FPS); }
    catch(e){ reject(new Error('não foi possível capturar o canvas')); return; }

    var rec;
    try{
      rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: STORY_BITRATE_MBPS * 1000000
      });
    }catch(e){
      try{ rec = new MediaRecorder(stream); }
      catch(e2){ reject(new Error('MediaRecorder recusou o formato')); return; }
    }

    var chunks = [];
    rec.ondataavailable = function(e){
      if(e.data && e.data.size) chunks.push(e.data);
    };
    var parou = new Promise(function(res){ rec.onstop = res; });

    /* primeiro frame + mídia posicionada no início */
    if(cena.reiniciarMidia) cena.reiniciarMidia();
    if(cena.garantirPlay) cena.garantirPlay();
    cena.desenhar(0);

    function parar(){
      try{ rec.stop(); }catch(e){}
    }

    try{ rec.start(250); }
    catch(e){ reject(new Error('não foi possível iniciar a gravação')); return; }

    var inicio = performance.now();
    var encerrando = false;

    function tick(){
      if(encerrando) return;
      var t = (performance.now() - inicio) / 1000;

      if(t >= STORY_DURACAO_SEG){
        encerrando = true;
        cena.desenhar(STORY_DURACAO_SEG);
        setTimeout(parar, 280);
        return;
      }

      if(cena.garantirPlay) cena.garantirPlay();
      cena.desenhar(t);

      if(document.hidden){
        /* aba oculta trava o rAF e o recorder para de receber frames.
           Seguimos em frente para não gerar vídeo truncado. */
        setTimeout(tick, 1000 / STORY_FPS);
        return;
      }
      requestAnimationFrame(tick);
    }
    tick();

    parou.then(function(){
      stream.getTracks().forEach(function(tr){ try{ tr.stop(); }catch(e){} });
      var tipoFinal = (rec.mimeType || mime).split(';')[0];
      var blob = new Blob(chunks, { type: tipoFinal });
      if(!blob.size){
        reject(new Error('gravação vazia — mantenha a aba visível durante a geração'));
        return;
      }
      resolve({
        blob: blob,
        mime: tipoFinal,
        ext: (tipoFinal.indexOf('mp4') !== -1) ? 'mp4' : 'webm'
      });
    });
  });
}

/* ============================================================
   STORY — UI
   ============================================================ */
var storyVideoBlobUrl = null;
var storyGravando = false;

function nomeArquivoStory(p){
  return 'meu3dlabs-' + String((p && p.nome) || 'produto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function baixarBlobUrl(url, nome){
  var a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function storyInjetarBotoesVideo(){
  var ov = document.getElementById('storyOverlay');
  if(!ov) return;
  if(document.getElementById('btnStoryVideo')) return;

  var ref = document.getElementById('btnStoryProduto');
  var pai = (ref && ref.parentNode) ? ref.parentNode : ov;

  var btn = document.createElement('button');
  btn.id = 'btnStoryVideo';
  btn.type = 'button';
  btn.textContent = '🎬 Baixar vídeo (Stories)';
  btn.title = 'Gera o mesmo card com a imagem, GIF ou vídeo do produto animado';
  btn.style.cssText = 'margin-left:8px;background:#0f1e3d;border:none;color:#fff;padding:12px 18px;border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;';
  btn.onclick = storyGerarVideo;
  if(ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
  else pai.appendChild(btn);

  var box = document.createElement('div');
  box.id = 'storyVideoBox';
  box.style.cssText = 'display:none;margin-top:14px;text-align:center;';
  box.innerHTML =
    '<video id="storyPreviewVideo" playsinline muted loop controls ' +
      'style="width:100%;max-width:260px;border-radius:14px;background:#0f1e3d;display:block;margin:0 auto 10px;"></video>' +
    '<div id="storyVideoInfo" style="font-size:12px;color:#5a6472;line-height:1.5;margin-bottom:8px;"></div>' +
    '<button type="button" id="storyVideoBaixar" ' +
      'style="display:inline-block;background:#0f7a44;color:#fff;padding:10px 18px;border-radius:9px;font-weight:700;font-size:13px;border:none;cursor:pointer;font-family:inherit;">⬇️ Baixar vídeo</button>';
  pai.appendChild(box);

  document.getElementById('storyVideoBaixar').onclick = function(){
    if(!storyVideoBlobUrl || !produtoStoryAtual) return;
    var vid = document.getElementById('storyPreviewVideo');
    var ext = (vid && /webm/i.test(vid.src)) ? 'webm' : 'mp4';
    baixarBlobUrl(storyVideoBlobUrl, nomeArquivoStory(produtoStoryAtual) + '-story.' + ext);
  };
}

function storyGerarVideo(){
  if(!produtoStoryAtual) return;
  if(storyGravando){ mostrarToast('Aguarde a gravação terminar.', 'erro'); return; }
  if(!storyMimeVideo()){
    mostrarToast('Este navegador não grava vídeo. Use Chrome, Edge ou Safari.', 'erro');
    return;
  }

  var btn  = document.getElementById('btnStoryVideo');
  var hint = document.getElementById('storyHint');
  storyGravando = true;
  if(btn){ btn.disabled = true; btn.textContent = '🎬 Gravando…'; }
  if(hint) hint.textContent = 'Gravando ' + STORY_DURACAO_SEG + 's. Mantenha esta aba visível.';

  var copia = Object.assign({}, produtoStoryAtual);
  var campo = document.getElementById('storyNome');
  if(campo && campo.value.trim()) copia.nome = campo.value.trim();

  storyPrepararCena(copia)
    .then(function(cena){
      if(!cena.canvasLimpo()){
        try{ cena.dispose(); }catch(e){}
        throw new Error('o arquivo de mídia bloqueia a leitura do canvas (CORS). Libere o domínio meu3dlabs.com.br no bucket e tente de novo.');
      }
      return storyGravarVideo(cena).then(function(res){
        try{ cena.dispose(); }catch(e){}
        return res;
      });
    })
    .then(function(res){
      if(storyVideoBlobUrl) URL.revokeObjectURL(storyVideoBlobUrl);
      storyVideoBlobUrl = URL.createObjectURL(res.blob);

      var nome = nomeArquivoStory(copia) + '-story.' + res.ext;
      var box  = document.getElementById('storyVideoBox');
      var vid  = document.getElementById('storyPreviewVideo');
      var info = document.getElementById('storyVideoInfo');

      if(box) box.style.display = 'block';
      if(vid){ vid.src = storyVideoBlobUrl; try{ vid.play(); }catch(e){} }
      if(info){
        info.textContent = (res.ext === 'mp4')
          ? '✅ MP4 gerado — formato aceito pelo Instagram.'
          : '⚠️ WebM gerado. O Instagram não aceita WebM: converta para MP4 antes de postar (ou gere pelo Safari).';
      }
      if(hint){
        hint.textContent = (res.ext === 'mp4')
          ? 'Vídeo pronto para o Stories.'
          : 'Vídeo pronto. Converta para MP4 antes de subir no Instagram.';
      }
      baixarBlobUrl(storyVideoBlobUrl, nome);
      mostrarToast('🎬 Vídeo do card gerado!', 'ok');
    })
    .catch(function(e){
      if(hint) hint.textContent = 'Não foi possível gerar o vídeo: ' + e.message;
      mostrarToast('Falha no vídeo: ' + e.message, 'erro');
    })
    .then(function(){
      storyGravando = false;
      if(btn){ btn.disabled = false; btn.textContent = '🎬 Baixar vídeo (Stories)'; }
    });
}

function ajustarBotaoStory(){
  var btn = document.getElementById('btnStoryProduto');
  if(!btn) return;
  btn.textContent = '🔗 Copiar link do produto';
  btn.setAttribute('title', 'Copia o link da página do produto para colar no Instagram');
  btn.onclick = function(ev){
    if(ev && ev.preventDefault) ev.preventDefault();
    copiarLinkProduto();
    return false;
  };
  if(btn.tagName === 'A') btn.setAttribute('href', 'javascript:void(0)');
  storyInjetarBotoesVideo();
}

function abrirStoryProduto(id){
  var p = produtos.find(function(x){ return x.id === id; });
  if(!p){ mostrarToast('Produto não encontrado.', 'erro'); return; }
  produtoStoryAtual = p;

  var overlay = document.getElementById('storyOverlay');
  var preview = document.getElementById('storyPreview');
  var hint    = document.getElementById('storyHint');
  var campo   = document.getElementById('storyNome');
  if(!overlay) return;

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  if(hint) hint.textContent = 'Gerando card…';
  if(preview) preview.removeAttribute('src');

  if(campo){
    campo.value = p.nome || '';
    campo.setAttribute('data-normal', p.nome || '');
  }

  if(storyVideoBlobUrl){
    URL.revokeObjectURL(storyVideoBlobUrl);
    storyVideoBlobUrl = null;
  }
  var box = document.getElementById('storyVideoBox');
  if(box) box.style.display = 'none';
  var vid = document.getElementById('storyPreviewVideo');
  if(vid) vid.removeAttribute('src');

  ajustarBotaoStory();
  storyRegenerar();
}

function storyRegenerar(){
  if(!produtoStoryAtual) return;
  var preview = document.getElementById('storyPreview');
  var hint    = document.getElementById('storyHint');
  var btn     = document.getElementById('btnStoryProduto');

  if(hint) hint.textContent = 'Gerando card…';
  if(preview) preview.removeAttribute('src');
  if(storyProdutoBlobUrl){
    URL.revokeObjectURL(storyProdutoBlobUrl);
    storyProdutoBlobUrl = null;
  }

  var copia = Object.assign({}, produtoStoryAtual);
  var campo = document.getElementById('storyNome');
  if(campo && campo.value.trim()) copia.nome = campo.value.trim();

  storyDesenharCard(copia)
    .then(function(canvas){
      return new Promise(function(res){
        try{
          canvas.toBlob(function(blob){
            if(!blob){ res(null); return; }
            storyProdutoBlobUrl = URL.createObjectURL(blob);
            if(preview) preview.src = storyProdutoBlobUrl;
            res(blob);
          }, 'image/png', 1);
        }catch(e){
          res(null);
        }
      });
    })
    .then(function(){
      if(hint) hint.textContent = 'Card 1080×1920 pronto. Baixe o card ou gere a versão em vídeo. O nome acima vale só para este card — a loja não muda.';
      if(btn) btn.style.display = storyProdutoBlobUrl ? 'inline-flex' : 'none';
      storyInjetarBotoesVideo();
    })
    .catch(function(){
      if(hint) hint.textContent = 'Não foi possível gerar o card. Tente novamente.';
      mostrarToast('Não foi possível gerar o card.', 'erro');
    });
}

var storyNomeTimer = null;
function storyAtualizarNome(valor){
  clearTimeout(storyNomeTimer);
  storyNomeTimer = setTimeout(function(){ storyRegenerar(); }, 450);
}

function storyResetarNome(){
  var campo = document.getElementById('storyNome');
  if(!campo || !produtoStoryAtual) return;
  campo.value = produtoStoryAtual.nome || '';
  storyRegenerar();
}

function fecharStoryProduto(){
  var overlay = document.getElementById('storyOverlay');
  if(!overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';

  if(storyProdutoBlobUrl){ URL.revokeObjectURL(storyProdutoBlobUrl); storyProdutoBlobUrl = null; }
  if(storyVideoBlobUrl){ URL.revokeObjectURL(storyVideoBlobUrl); storyVideoBlobUrl = null; }

  var vid = document.getElementById('storyPreviewVideo');
  if(vid) vid.removeAttribute('src');
  var box = document.getElementById('storyVideoBox');
  if(box) box.style.display = 'none';

  produtoStoryAtual = null;
}

function baixarStoryProduto(){
  if(!storyProdutoBlobUrl || !produtoStoryAtual){
    mostrarToast('Card ainda não está pronto.', 'erro');
    return;
  }
  baixarBlobUrl(storyProdutoBlobUrl, nomeArquivoStory(produtoStoryAtual) + '-story.png');
  mostrarToast('Card baixado! Poste no Stories.', 'ok');
}

/* ============================================================
   COPIAR LINK DO PRODUTO
   ============================================================ */
function urlPublicaProduto(p){
  if(!p) return '';
  var slug = String(p.slug || gerarSlug(p.nome) || '').trim();
  if(!slug) return 'https://meu3dlabs.com.br/loja';
  return 'https://meu3dlabs.com.br/produto/' + encodeURIComponent(slug);
}

function copiarLinkProduto(){
  if(!produtoStoryAtual){
    feedbackStory('Produto não identificado.', true);
    return;
  }
  var link = urlPublicaProduto(produtoStoryAtual);
  var btn = document.getElementById('btnStoryProduto');

  function confirmar(){
    if(btn){
      btn.textContent = '✅ Link copiado!';
      btn.disabled = true;
      setTimeout(function(){
        btn.textContent = '🔗 Copiar link do produto';
        btn.disabled = false;
      }, 2200);
    }
    feedbackStory('Link copiado: ' + link, false);
    mostrarToast('🔗 Link copiado!', 'ok');
  }

  function fallback(){
    var ta = document.createElement('textarea');
    ta.value = link;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, 99999);
    var ok = false;
    try{ ok = document.execCommand('copy'); }catch(e){ ok = false; }
    document.body.removeChild(ta);
    if(ok){ confirmar(); }
    else { feedbackStory('Não foi possível copiar automaticamente. Link: ' + link, true); }
  }

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(confirmar).catch(fallback);
  }else{
    fallback();
  }
}

function feedbackStory(msg, erro){
  var el = document.getElementById('storyFeedback');
  if(!el){
    var alvo = document.getElementById('storyHint') || document.getElementById('storyPreview');
    var b = document.getElementById('btnStoryProduto');
    var pai = alvo ? alvo.parentNode : (b ? b.parentNode : document.getElementById('storyOverlay'));
    if(!pai) return;
    el = document.createElement('div');
    el.id = 'storyFeedback';
    el.style.cssText = 'margin-top:10px;font-size:12.5px;line-height:1.5;word-break:break-all;padding:8px 10px;border-radius:8px;transition:background .2s;';
    if(alvo) alvo.parentNode.insertBefore(el, alvo.nextSibling);
    else pai.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = erro ? '#fdecea' : '#e8f5ec';
  el.style.color = erro ? '#a93226' : '#0f7a44';
  el.style.border = '1px solid ' + (erro ? '#f4c7c3' : '#b7e0c6');
  clearTimeout(el._t);
  el._t = setTimeout(function(){
    el.textContent = '';
    el.style.background = 'transparent';
    el.style.border = '1px solid transparent';
  }, 6000);
}

(function(){
  var ov = document.getElementById('storyOverlay');
  if(ov){
    ov.addEventListener('click', function(e){
      if(e.target === ov) fecharStoryProduto();
    });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') fecharStoryProduto();
  });
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(injetarBotoesFerramentas, 300);
    setTimeout(storyInjetarBotoesVideo, 700);
  });
})();