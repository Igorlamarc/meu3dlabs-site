
const API = 'https://meu3dlabs-backend.onrender.com/api';
const CATEGORIAS = ['chaveiros','religiosos','decoracao','miniaturas','colecionaveis','articulados','sensoriais','utilitarios','outros'];
const MATERIAIS = ['PLA','PETG','TPU','ABS'];

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

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function gerarSlug(t){
  return String(t||'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'')
    .slice(0,80)||'';
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
/* Badge de ficha técnica: mostra quantas dimensões estão preenchidas */
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
   BUSCA COM DEBOUNCE
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
    const img = (p.imagens && p.imagens.length) ? p.imagens[0] : null;
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

    const fotoHtml = img
      ? '<img src="' + img + '" loading="lazy" alt="' + esc(p.nome) + '">'
      : '<div class="sem-foto">📷 Sem foto<br>adicione no produto</div>';

    const countHtml = totalImgs > 1 ? '<span class="foto-count">🖼️ ' + totalImgs + '</span>' : '';

     /* ✅ Botões do card: Editar · Duplicar · Story · Excluir */
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
        await api('/loja/produtos/' + id, 'PUT', {
          nome: p.nome,
          slug: gerarSlug(p.nome),
          descricao: p.descricao || '',
          preco: p.preco,
          estoque: p.estoque,
          categoria: p.categoria || 'outros',
          cores: p.cores || [],
          imagens: p.imagens || [],
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
  ['Prateado','#c0c6cf']
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
}

function toggleCorChip(nome){
  const atuais = coresAtuais();
  const i = atuais.indexOf(nome);
  if(i === -1) atuais.push(nome);
  else atuais.splice(i, 1);
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

  if(modoLote){ modoLote = false; selecionados = []; atualizarBarraLote(); document.getElementById('btnLote').textContent = '☑️ Selecionar'; document.getElementById('btnLote').classList.remove('btn-laranja'); }
  if(mesclando){ mesclando = false; document.getElementById('barraMesclar').classList.add('hidden'); document.getElementById('btnMesclar').textContent = '🔗 Mesclar'; }

  const p = id ? produtos.find(x => x.id === id) : null;
  const ehDup = !!(id && duplicar && p);
  const fa = document.getElementById('formArea');

  document.getElementById('tituloLista').textContent = ehDup
    ? ('Duplicando: ' + p.nome)
    : (p ? 'Editando: ' + p.nome : 'Novo produto');

  const slugAtual = p ? gerarSlug(p.nome) : '';

  fa.innerHTML =
    '<div class="form-wrap">' +
      '<h3>' + (ehDup ? '📄 Duplicar produto' : (p ? '✏️ Editar produto' : '➕ Postar novo produto')) + '</h3>' +
      (ehDup ? '<p style="font-size:13px;color:#7a5c00;background:#fff4d6;padding:10px 12px;border-radius:8px;margin:-8px 0 16px;">Cópia de <b>' + esc(p.nome) + '</b>. Altere o nome, a cor ou a foto e clique em Salvar. O original não é alterado.</p>' : '') +
      '<div class="campos">' +

        '<div class="campo full"><label>Nome do produto *</label><input id="fNome" maxlength="80" placeholder="Ex.: Chaveiro personalizado" oninput="atualizarSlugPreview();document.getElementById(\'contadorNome\').textContent=this.value.length+\' / 80\';" value="' + (p ? esc(p.nome) : '') + '"></div>' +
        '<div class="campo full"><div class="slug-preview" id="contadorNome">0 / 80</div></div>' +
        '<div class="campo full"><div class="slug-preview" id="slugPreview">🔗 Slug: <span id="slugTexto">' + (slugAtual || 'será gerado do nome') + '</span></div></div>' +

        '<div class="campo full"><label>Descrição</label><textarea id="fDesc" maxlength="500" placeholder="Detalhes, material, tamanho..." oninput="document.getElementById(\'contadorDesc\').textContent=this.value.length+\' / 500\';">' + (p ? esc(p.descricao || '') : '') + '</textarea><div class="slug-preview" id="contadorDesc">0 / 500</div></div>' +

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

        '<div class="campo full promo-box">' +
          '<div class="promo-linha"><input type="checkbox" id="fPromo"' + (p && p.promo ? ' checked' : '') + ' onchange="document.getElementById(\'promoPrecoWrap\').style.display=this.checked?\'block\':\'none\';validarPrecoAoVivo();"> 🏷️ Produto em promoção</div>' +
          '<div id="promoPrecoWrap" style="display:' + (p && p.promo ? 'block' : 'none') + ';">' +
            '<label style="font-size:12px;font-weight:600;color:#4a5670;margin-bottom:5px;">Preço promocional (R$) — deve ser MENOR que o preço cheio</label>' +
            '<input id="fPrecoPromo" type="number" step="0.01" min="0" placeholder="0,00" value="' + (p && p.precoPromo != null ? p.precoPromo : '') + '" oninput="validarPrecoAoVivo()">' +
            '<div class="slug-preview" id="promoFeedback"></div>' +
          '</div>' +
        '</div>' +

        '<div class="campo full"><label>Fotos do produto <span style="font-weight:400;color:#8a94a8;">(a 1ª é a principal — toque na ⭐ para definir)</span></label>' +
          '<div class="upload-area" onclick="document.getElementById(\'fileInput\').click()">' +
            '<div class="icone">📷</div>' +
            '<div class="txt">Toque para escolher a foto ou GIF (ou vários)<br>JPG, PNG, WEBP ou GIF — até 8 MB por arquivo · GIFs animados vão sem compressão</div>' +
          '</div>' +
          '<input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="hidden" onchange="enviarFotos(this)">' +
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

  if(p){
    const iv = p.imagens || [];
    imagensTemp = iv.slice();
    renderPreview();
  }

  document.getElementById('fCores').value = p ? (p.cores || []).join(', ') : '';
  renderCoresPick();

  const cd = document.getElementById('contadorDesc');
  if(cd) cd.textContent = String(document.getElementById('fDesc').value.length) + ' / 500';

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
  const nome = document.getElementById('fNome').value.trim();
  const sp = document.getElementById('slugTexto');
  if(sp) sp.textContent = gerarSlug(nome) || 'digite o nome';
}

function fecharForm(){
  document.getElementById('formArea').innerHTML = '';
  document.getElementById('tituloLista').textContent = 'Produtos da loja';
  editandoId = null;
  imagensTemp = [];
}

/* ============================================================
   COMPRESSÃO DE IMAGEM
   ============================================================ */
function comprimirImagem(arquivo){
  return new Promise(function(resolve){
    if(!arquivo.type || arquivo.type.indexOf('image/') !== 0){ resolve(arquivo); return; }
    if(arquivo.type === 'image/gif'){ resolve(arquivo); return; }

    const img = new Image();
    const url = URL.createObjectURL(arquivo);

    img.onload = function(){
      URL.revokeObjectURL(url);
      const MAX = 1200;
      const w = img.width, h = img.height;

      if(w <= MAX && h <= MAX && arquivo.size <= 300000){ resolve(arquivo); return; }

      const esc = Math.min(MAX / w, MAX / h, 1);
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * esc);
      cv.height = Math.round(h * esc);

      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0, cv.width, cv.height);

      cv.toBlob(function(blob){
        if(!blob){ resolve(arquivo); return; }
        const nome = (arquivo.name || 'foto.jpg').replace(/\.[^.]+$/, '') + '.jpg';
        resolve(new File([blob], nome, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.82);
    };

    img.onerror = function(){ URL.revokeObjectURL(url); resolve(arquivo); };
    img.src = url;
  });
}

async function enviarFotos(fonte){
  const LIMITE_MB = 8;
  const LIMITE_BYTES = LIMITE_MB * 1024 * 1024;
  const arquivos = fonte && fonte.files ? Array.from(fonte.files) : Array.from(fonte || []);
  if(!arquivos.length) return;

  for(const arqOriginal of arquivos){
    const tamMB = (arqOriginal.size / (1024*1024)).toFixed(1);

    if(arqOriginal.size > LIMITE_BYTES){
      mostrarToast('❌ "' + (arqOriginal.name || 'arquivo') + '" tem ' + tamMB + ' MB — o limite é ' + LIMITE_MB + ' MB. Comprima o GIF (ex.: ezgif.com) e tente de novo.', 'erro');
      continue;
    }

    const arq = await comprimirImagem(arqOriginal);
    const fd = new FormData();
    fd.append('imagem', arq);

    try{
      const r = await fetch(API + '/loja/produtos/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      });
      const t = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(t.error || 'Falha no upload');
      imagensTemp.push(t.url);
      mostrarToast('📷 "' + (arq.name || 'Foto') + '" enviada (' + (arq.size/(1024*1024)).toFixed(1) + ' MB)!', 'ok');
    }catch(e){
      mostrarToast('Erro no upload de "' + (arq.name || 'arquivo') + '" (' + tamMB + ' MB): ' + e.message, 'erro');
    }
  }

  if(fonte && fonte.value !== undefined) fonte.value = '';
  renderPreview();
}

function renderPreview(){
  const pr = document.getElementById('preview');
  pr.innerHTML = '';
  imagensTemp.forEach((u, i) => {
    const d = document.createElement('div');
    d.className = 'mini' + (i === 0 ? ' sel-principal' : '');
    d.innerHTML = '<img src="' + u + '" alt="Foto ' + (i+1) + '">' +
      '<div class="mini-btns">' +
        (i > 0 ? '<button class="btn-star" title="Definir como principal" onclick="definirPrincipal(' + i + ')">★</button>' : '') +
        '<button title="Remover" onclick="removerImg(' + i + ')">×</button>' +
      '</div>' +
      (i === 0 ? '<div class="lb-principal">PRINCIPAL</div>' : '');
    pr.appendChild(d);
  });
}

function definirPrincipal(i){
  if(i <= 0) return;
  const u = imagensTemp.splice(i, 1)[0];
  imagensTemp.unshift(u);
  renderPreview();
  mostrarToast('⭐ Foto definida como principal!', 'ok');
}

function removerImg(i){
  imagensTemp.splice(i, 1);
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

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const esp = lerEspecificacao();

  const dados = {
    nome: nome,
    slug: gerarSlug(nome),
    descricao: document.getElementById('fDesc').value.trim(),
    preco: preco,
    estoque: parseInt(document.getElementById('fEstoque').value) || 0,
    categoria: document.getElementById('fCategoria').value,
    cores: coresAtuais(),
    imagens: imagensTemp,
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

  try{
    if(editandoId){
      await api('/loja/produtos/' + editandoId, 'PUT', dados);
    }else{
      await api('/loja/produtos', 'POST', dados);
    }
    fecharForm();
    await carregar();
    mostrarToast('✅ Produto salvo!', 'ok');
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

  let imagens = (principal.imagens || []).slice();
  let cores = (principal.cores || []).slice();

  secundarios.forEach(s => {
    (s.imagens || []).forEach(u => { if(imagens.indexOf(u) === -1) imagens.push(u); });
    (s.cores || []).forEach(c => { if(cores.indexOf(c) === -1) cores.push(c); });
  });

  const dados = {
    nome: principal.nome,
    slug: gerarSlug(principal.nome),
    descricao: principal.descricao || '',
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
   Gera card 1080x1920 com imagem inteira (sem cortar), nome,
   preço em destaque, promoção e formas de pagamento.
   ============================================================ */

let produtoStoryAtual = null;
let storyProdutoBlobUrl = null;

/* ---------- helpers ---------- */
function storyCarregarImagem(src){
  return new Promise(function(resolve, reject){
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){ resolve(img); };
    img.onerror = function(){ reject(new Error('img')); };
    img.src = src;
  });
}

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

/* Monta a linha de dimensões: "12,7 cm · 146 g" (só altura + peso) */
function storyDimensoes(p){
  var partes = [];

  var alt = parseFloat(p.altura) || 0;
  if(alt > 0){
    partes.push(String(alt).replace('.', ',') + ' cm');
  }

  var peso = parseFloat(p.peso) || 0;
  if(peso > 0){
    var pesoTxt = peso >= 1000
      ? (peso / 1000).toFixed(2).replace('.', ',') + ' kg'
      : String(peso).replace('.', ',') + ' g';
    partes.push(pesoTxt);
  }

  return partes.join('  ·  ');
}

/* ---------- gerador do card ---------- */
function storyDesenharCard(p){
  return new Promise(function(resolve, reject){
    var W = 1080, H = 1920;
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');

    var preco      = parseFloat(p.preco) || 0;
    var precoPromo = parseFloat(p.precoPromo) || 0;
    var emPromo    = !!p.promo && precoPromo > 0 && precoPromo < preco;
    var precoFinal = emPromo ? precoPromo : preco;
    var desconto   = emPromo ? Math.round((1 - precoPromo / preco) * 100) : 0;
    var catTxt     = storyNomeCategoria(p.categoria);

    var imgProd = null;
    var imgLogo = null;

    function seguir(){
      /* ============ FUNDO ============ */
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
      for(var x = 0; x <= W; x += 60){
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for(var y = 0; y <= H; y += 60){
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      /* ============ ÁREA DA IMAGEM (inteira, sem cortar) ============ */
      var rx = 60, ry = 210, rw = W - 120, rh = 720, raio = 32;

      if(imgProd){
        /* fundo desfocado preenchendo o quadro */
        ctx.save();
        storyPathArredondado(ctx, rx, ry, rw, rh, raio);
        ctx.clip();

        var escF = Math.max(rw / imgProd.width, rh / imgProd.height);
        var dwF = imgProd.width * escF;
        var dhF = imgProd.height * escF;
        var dxF = rx + (rw - dwF) / 2;
        var dyF = ry + (rh - dhF) / 2;

        if(ctx.filter !== undefined){
          try{ ctx.filter = 'blur(42px)'; }catch(e){}
        }
        ctx.drawImage(imgProd, dxF, dyF, dwF, dhF);
        if(ctx.filter !== undefined){
          try{ ctx.filter = 'none'; }catch(e){}
        }
        ctx.fillStyle = 'rgba(10,20,40,0.58)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.restore();

        /* imagem inteira sobre o fundo */
        var escC = Math.min(rw / imgProd.width, rh / imgProd.height);
        var dwC = imgProd.width * escC;
        var dhC = imgProd.height * escC;
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
        ctx.drawImage(imgProd, dxC, dyC, dwC, dhC);
        ctx.restore();

        ctx.save();
        storyPathArredondado(ctx, dxC, dyC, dwC, dhC, 20);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        /* ============ BADGE DE DIMENSÕES (sobre a imagem, canto sup. esq.) ============ */
        var dimTxt = storyDimensoes(p);
        if(dimTxt){
          var badgeH   = 58;
          var badgePad = 24;
          var icoLarg  = 30;
          var badgeX   = rx + 20;                                    // 20px da borda da imagem
          var badgeY   = ry + 20;                                    // 20px do topo da imagem

          ctx.font = 'bold 30px Inter, Arial, sans-serif';
          var largTxt   = ctx.measureText(dimTxt).width;
          var largBadge = badgePad + icoLarg + 10 + largTxt + badgePad;

          /* fundo escuro translúcido (igual à loja) */
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 3;
          ctx.fillStyle = 'rgba(15,30,61,0.88)';
          ctx.beginPath();
          if(ctx.roundRect){
            ctx.roundRect(badgeX, badgeY, largBadge, badgeH, badgeH / 2);
          }else{
            ctx.rect(badgeX, badgeY, largBadge, badgeH);
          }
          ctx.fill();
          ctx.restore();

          /* ícone de régua */
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
          ctx.moveTo(icoX + 6, icoY + 10);
          ctx.lineTo(icoX + 6, icoY + 3);
          ctx.moveTo(icoX + 13, icoY + 10);
          ctx.lineTo(icoX + 13, icoY + 5);
          ctx.stroke();
          ctx.lineCap = 'butt';

          /* texto */
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

      /* ============ CATEGORIA (pílula) ============ */
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

      /* ============ SELO DE DESCONTO ============ */
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

      /* ============ NOME DO PRODUTO ============ */
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

      /* ============ PREÇO (elemento principal) ============ */
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

      /* ============ FORMAS DE PAGAMENTO ============ */
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = '600 32px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
          ctx.fillText('Pix com 5% OFF  ·  Cartão em até 12x', 60, yPag);

   

      /* ============ RODAPÉ: logo + marca + site ============ */
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
        ctx.drawImage(imgLogo, xLogo, yLogoCentro - tamLogo / 2, tamLogo, tamLogo);
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

      resolve(cv);
    }

    var primeiraImg = (p.imagens && p.imagens.length) ? p.imagens[0] : null;

    var pImg = primeiraImg
      ? storyCarregarImagem(primeiraImg).then(function(i){ imgProd = i; }).catch(function(){})
      : Promise.resolve();

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

    Promise.all([pImg, pLogo])
      .then(function(){ seguir(); })
      .catch(function(){ seguir(); });
  });
}

/* ---------- abrir modal ---------- */
/* ---------- abrir modal ---------- */
function abrirStoryProduto(id){
  var p = produtos.find(function(x){ return x.id === id; });
  if(!p){ mostrarToast('Produto não encontrado.', 'erro'); return; }

  produtoStoryAtual = p;

  var overlay = document.getElementById('storyOverlay');
  var preview = document.getElementById('storyPreview');
  var hint    = document.getElementById('storyHint');
  var btn     = document.getElementById('btnStoryProduto');
  var campo   = document.getElementById('storyNome');

  if(!overlay) return;

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  hint.textContent = 'Gerando card…';
  preview.removeAttribute('src');

  /* Campo de nome: preenche com o nome do produto */
  if(campo){
    campo.value = p.nome || '';
    campo.setAttribute('data-normal', p.nome || '');
  }

  storyRegenerar();
}

/* ---------- regenerar o card com o nome atual ---------- */
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

  /* Cópia do produto com o nome do card (não altera o original) */
  var copia = Object.assign({}, produtoStoryAtual);
  var campo = document.getElementById('storyNome');
  if(campo && campo.value.trim()){
    copia.nome = campo.value.trim();
  }

  storyDesenharCard(copia)
    .then(function(canvas){
      return new Promise(function(res){
        canvas.toBlob(function(blob){
          if(!blob){ res(null); return; }
          storyProdutoBlobUrl = URL.createObjectURL(blob);
          if(preview) preview.src = storyProdutoBlobUrl;
          res(blob);
        }, 'image/png', 1);
      });
    })
    .then(function(){
      if(hint) hint.textContent = 'Card 1080×1920 pronto para o Instagram Stories. O nome acima vale só para este card — a loja não muda.';
      if(btn){
        btn.style.display = (navigator.canShare && storyProdutoBlobUrl) ? 'inline-flex' : 'none';
      }
    })
    .catch(function(){
      if(hint) hint.textContent = 'Não foi possível gerar o card. Tente novamente.';
      mostrarToast('Não foi possível gerar o card.', 'erro');
    });
}

/* ---------- digitar no campo: regenera com debounce ---------- */
var storyNomeTimer = null;
function storyAtualizarNome(valor){
  clearTimeout(storyNomeTimer);
  storyNomeTimer = setTimeout(function(){
    storyRegenerar();
  }, 450);
}

/* ---------- voltar ao nome original do produto ---------- */
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
  if(storyProdutoBlobUrl){
    URL.revokeObjectURL(storyProdutoBlobUrl);
    storyProdutoBlobUrl = null;
  }
  produtoStoryAtual = null;
}

function baixarStoryProduto(){
  if(!storyProdutoBlobUrl || !produtoStoryAtual){
    mostrarToast('Card ainda não está pronto.', 'erro');
    return;
  }

  var nome = 'meu3dlabs-' + String(produtoStoryAtual.nome || 'produto')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  var a = document.createElement('a');
  a.href = storyProdutoBlobUrl;
  a.download = nome + '-story.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  mostrarToast('Card baixado! Poste no Stories.', 'ok');
}

function compartilharStoryProduto(){
  if(!storyProdutoBlobUrl){
    mostrarToast('Card ainda não está pronto.', 'erro');
    return;
  }
  fetch(storyProdutoBlobUrl)
    .then(function(r){ return r.blob(); })
    .then(function(blob){
      var file = new File([blob], 'meu3dlabs-produto.png', { type: 'image/png' });
      if(navigator.canShare && navigator.canShare({ files: [file] })){
        return navigator.share({
          files: [file],
          title: produtoStoryAtual ? produtoStoryAtual.nome : 'Meu 3D Labs',
          text: produtoStoryAtual ? produtoStoryAtual.nome : ''
        });
      }
      throw new Error('sem-suporte');
    })
    .catch(function(){
      mostrarToast('Seu navegador não permite isso. Use "Baixar card".', 'erro');
    });
}

/* fecha ao clicar fora ou apertar Esc */
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
})();