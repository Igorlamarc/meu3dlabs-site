/* ============================================================
   Meu 3D Labs — admin.js (Painel de Pedidos)
   ============================================================ */

/* ===== 1. CONFIGURAÇÃO ===== */
var API_URL = 'https://meu3dlabs-backend.onrender.com/api';

/* ⭐ LINK DE AVALIAÇÃO NO GOOGLE */
var LINK_AVALIACAO_GOOGLE = 'https://g.page/r/CcGSg0AxWsPnEAE/review';

/* ===== 2. ESTADO GLOBAL ===== */
var orcamentos = [];
var lojaPedidos = [];
var token = sessionStorage.getItem('m3d_admin_token');
var tipoAtivo = 'orcamentos';
var novosIds = [];
var filtroPrazoAtivo = 'todos';
var cacheProdutos = null;
var mensagemAtual = '';

/* 🆕 Filtro de visibilidade: 'ativos' | 'entregues' | 'encerrados' | 'todos' */
var filtroVisao = 'ativos';

try {
  window.API = API_URL;
  window.API_BASE = API_URL;
} catch (e) {}

/* ===== 3. UTILIDADES BASE E CLASSIFICAÇÃO ===== */

function servicoTipo(p) {
  var s = String(p.servico || p.tipo_servico || p.servico_escolhido || p.tipo_peca || p.tipo || '').toLowerCase();
  if (s.indexOf('modelag') !== -1) return 'modelagem';
  if (s.indexOf('consult') !== -1) return 'consultoria';
  if (s.indexOf('assist') !== -1 || s.indexOf('manut') !== -1) return 'assistencia';
  return 'orcamentos';
}

function getListaAtiva() {
  if (tipoAtivo === 'loja') return lojaPedidos;
  return orcamentos.filter(function(p) {
    var t = servicoTipo(p);
    if (t === 'modelagem') return false;
    return t === tipoAtivo;
  });
}

/* 🆕 Define se um pedido está encerrado (sai da visão principal) */
function ehEncerrado(p) {
  var s = String(p.status || statusPadrao());
  if (tipoAtivo === 'loja') {
    return s === 'entregue' || s === 'cancelado' || s === 'sem-resposta';
  }
  return s === 'entregue' || s === 'cancelado' || s === 'sem-resposta';
}

/* 🆕 Define se é "ativo" (aparece na visão principal) */
function ehAtivo(p) {
  return !ehEncerrado(p);
}

function escapar(texto) {
  var div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function fmtMoeda(v) {
  var n = parseFloat(v);
  if (isNaN(n)) return 'R$ 0';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  if (!iso) return '—';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return iso;
  }
}

function normalizarData(d) {
  if (d == null) return null;
  d = String(d).trim();
  if (!d || d === 'null' || d === 'undefined') return null;
  var m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  return d;
}

function statusPadrao() {
  return tipoAtivo === 'loja' ? 'feito' : 'novo';
}

function buscarImgProduto(nome) {
  if (!cacheProdutos || !nome) return '';
  var alvo = String(nome).toLowerCase().trim();
  for (var i = 0; i < cacheProdutos.length; i++) {
    var p = cacheProdutos[i];
    var pn = String(p.nome || '').toLowerCase().trim();
    if (pn && (alvo.indexOf(pn) !== -1 || pn.indexOf(alvo) !== -1)) {
      return (p.imagens && p.imagens[0]) || '';
    }
  }
  return '';
}

/* ===== 4. MODO ESCURO ===== */
function toggleDark() {
  document.body.classList.toggle('dark');
  var escuro = document.body.classList.contains('dark');
  localStorage.setItem('m3d_dark', escuro ? '1' : '0');
  document.getElementById('darkBtn').textContent = escuro ? '☀️' : '🌙';
}

if (localStorage.getItem('m3d_dark') === '1') {
  document.body.classList.add('dark');
}

/* ===== 5. LOGIN E SESSÃO ===== */
if (token) {
  document.getElementById('loginOverlay').style.display = 'none';
  if (document.body.classList.contains('dark')) document.getElementById('darkBtn').textContent = '☀️';
  iniciar();
} else {
  document.getElementById('senhaInput').focus();
}

function tentarLogin() {
  var senha = document.getElementById('senhaInput').value;
  var btn = document.querySelector('.login-box .btn');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  fetch(API_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha: senha })
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Senha incorreta');
    return res.json();
  })
  .then(function(dados) {
    token = dados.token;
    sessionStorage.setItem('m3d_admin_token', token);
    document.getElementById('loginOverlay').style.display = 'none';
    iniciar();
  })
  .catch(function(err) {
    document.getElementById('loginError').classList.add('show');
    document.getElementById('senhaInput').value = '';
    document.getElementById('senhaInput').focus();
    btn.disabled = false;
    btn.textContent = 'Entrar';
  });
}

function sair() {
  sessionStorage.removeItem('m3d_admin_token');
  location.reload();
}

function iniciar() {
  carregarPedidos();
  setInterval(carregarPedidosSilencioso, 30000);
}

/* ===== 6. CARREGAMENTO DE DADOS ===== */

function carregarPedidos() {
  var btn = document.getElementById('refreshBtn');
  if (btn) btn.disabled = true;
  var body = document.getElementById('tabelaBody');
  if (body) {
    body.innerHTML = '<tr class="loading-row"><td colspan="7"><div class="spinner"></div><br>Carregando pedidos...</td></tr>';
  }

  var h1 = { 'Authorization': 'Bearer ' + token };

  return Promise.all([
    fetch(API_URL + '/orcamentos?servico=encomenda', { headers: h1 }).then(function(res) {
      if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
      if (!res.ok) throw new Error('Erro ' + res.status);
      return res.json();
    }),
    fetch(API_URL + '/loja/pedidos', { headers: h1 }).then(function(res) {
      if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
      if (!res.ok) throw new Error('Erro ' + res.status);
      return res.json();
    })
  ])
  .then(function(resultados) {
    orcamentos = Array.isArray(resultados[0]) ? resultados[0] : [];
    lojaPedidos = Array.isArray(resultados[1]) ? resultados[1] : [];
    orcamentos = orcamentos.filter(function(p) {
      return servicoTipo(p) !== 'modelagem';
    });
    /* ✅ Sincroniza a referência global */
    window.orcamentos = orcamentos;
    window.lojaPedidos = lojaPedidos;

    ordenarListas();
    detectarNovos();
    verificarPrazosCriticos();
    renderizar();

    if (btn) btn.disabled = false;
    var agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var elUpd = document.getElementById('lastUpdate');
    if (elUpd) elUpd.textContent = 'Atualizado às ' + agora;
    var elErr = document.getElementById('errorBox');
    if (elErr) elErr.classList.remove('show');
  })
  .catch(function(err) {
    if (btn) btn.disabled = false;
    if (body) {
      body.innerHTML = '<tr class="loading-row"><td colspan="7">⚠️ Não foi possível carregar os pedidos.</td></tr>';
    }
    var box = document.getElementById('errorBox');
    if (box) {
      box.textContent = 'Erro ao conectar com a API: ' + err.message + '. Verifique se o backend no Render está online e tente novamente.';
      box.classList.add('show');
    }
  });
}

function carregarPedidosSilencioso() {
  var h1 = { 'Authorization': 'Bearer ' + token };
  return Promise.all([
    fetch(API_URL + '/orcamentos?servico=encomenda', { headers: h1 }).then(function(r) {
      if (r.status === 401) { sair(); throw new Error('Sessão expirada'); }
      if (!r.ok) throw new Error('Erro ' + r.status);
      return r.json();
    }),
    fetch(API_URL + '/loja/pedidos', { headers: h1 }).then(function(r) {
      if (r.status === 401) { sair(); throw new Error('Sessão expirada'); }
      if (!r.ok) throw new Error('Erro ' + r.status);
      return r.json();
    })
  ])
  .then(function(resultados) {
    orcamentos = Array.isArray(resultados[0]) ? resultados[0] : [];
    lojaPedidos = Array.isArray(resultados[1]) ? resultados[1] : [];
    orcamentos = orcamentos.filter(function(p) {
      return servicoTipo(p) !== 'modelagem';
    });
    window.orcamentos = orcamentos;
    window.lojaPedidos = lojaPedidos;

    ordenarListas();
    detectarNovos();
    verificarPrazosCriticos();
    renderizar();
  })
  .catch(function() {});
}

function carregarProdutosLoja() {
  fetch(API_URL + '/loja/produtos')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      cacheProdutos = Array.isArray(d) ? d : (d.produtos || []);
      renderizar();
    })
    .catch(function() {});
}
carregarProdutosLoja();

/* ===== 7. PRAZOS ===== */

function diasAtePrazo(p) {
  if (!p || !p.prazo_desejado) return null;
  var m = String(p.prazo_desejado).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
}

function classePrazo(p) {
  var status = p.status || 'novo';
  if (status === 'pronto' || status === 'entregue') return 'azul';
  if (status === 'cancelado' || status === 'sem-resposta') return 'x';
  var d = diasAtePrazo(p);
  if (d === null) return null;
  if (d < 0) return 'atrasado';
  if (d === 0) return 'hoje';
  if (d <= 2) return 'amarelo';
  return 'verde';
}

function badgeUrgencia(p) {
  var u = String(p.urgencia || '').toLowerCase();
  if (!u || u === 'null') return '';
  if (u.indexOf('muito') !== -1) return '<div><span class="urg-badge urg-vermelho">● Muito urgente</span></div>';
  if (u.indexOf('moder') !== -1 || u.indexOf('média') !== -1 || u.indexOf('media') !== -1) return '<div><span class="urg-badge urg-amarelo">● Urgência moderada</span></div>';
  return '<div><span class="urg-badge urg-verde">● Sem urgência</span></div>';
}

function badgePrazo(p) {
  var classe = classePrazo(p);
  if (!classe) return '<span class="prazo-none">—</span>';
  if (classe === 'azul') return '<span class="prazo-badge prazo-azul"><span class="p-dot"></span>✓ ' + (p.status === 'pronto' ? 'Pronto' : 'Entregue') + '</span>';
  if (classe === 'x') return '<span class="prazo-badge prazo-x"><span class="p-dot"></span>Encerrado</span>';
  var d = diasAtePrazo(p);
  if (classe === 'atrasado') return '<span class="prazo-badge prazo-atrasado"><span class="p-dot"></span>Atrasado há ' + Math.abs(d) + ' dia' + (Math.abs(d) > 1 ? 's' : '') + '</span>';
  if (classe === 'hoje') return '<span class="prazo-badge prazo-hoje"><span class="p-dot"></span>Vence hoje</span>';
  if (classe === 'amarelo') return '<span class="prazo-badge prazo-amarelo"><span class="p-dot"></span>Faltam ' + d + ' dia' + (d > 1 ? 's' : '') + '</span>';
  return '<span class="prazo-badge prazo-verde"><span class="p-dot"></span>Faltam ' + d + ' dias</span>';
}

function verificarPrazosCriticos() {
  var criticos = orcamentos.filter(function(p) {
    if (!ehAtivo(p)) return false;
    var c = classePrazo(p);
    return c === 'atrasado' || c === 'hoje';
  });
  if (criticos.length === 0) return;

  var jaAlertado = sessionStorage.getItem('m3d_alerta_prazo');
  var chaveAtual = criticos.length + '-' + criticos.map(function(p) { return p.id; }).sort().join(',');
  if (jaAlertado === chaveAtual) return;
  sessionStorage.setItem('m3d_alerta_prazo', chaveAtual);

  tocarAlerta();
  tocarAlerta();

  var banner = document.getElementById('notifyBanner');
  if (!banner) return;
  banner.classList.add('alerta-prazo');
  document.getElementById('notifyIcon').textContent = '⏰';
  document.getElementById('notifyTitle').textContent = criticos.length > 1 ? criticos.length + ' pedidos com prazo crítico!' : 'Pedido com prazo crítico!';
  document.getElementById('notifyText').textContent = 'Existem pedidos atrasados ou que vencem hoje. Verifique a coluna Prazo.';
  banner.classList.add('show');
  clearTimeout(banner._timer);
  banner._timer = setTimeout(fecharBanner, 10000);
  mostrarBalaoPrazo(criticos);
}

function mostrarBalaoPrazo(criticos) {
  var html = '';
  criticos.slice(0, 5).forEach(function(p) {
    var c = classePrazo(p);
    var d = diasAtePrazo(p);
    var rotulo = c === 'atrasado' ? '🔴 Atrasado há ' + Math.abs(d) + ' dia' + (Math.abs(d) > 1 ? 's' : '') : '⏰ Vence HOJE';
    html += '<div class="pm-item"><strong>' + escapar(p.pedido_id || ('#' + p.id)) + ' — ' + escapar(p.nome_cliente || 'Cliente') + '</strong>' +
            '<span>' + rotulo + ' · Prazo: ' + normalizarData(p.prazo_desejado) + '</span></div>';
  });
  if (criticos.length > 5) html += '<div class="pm-item"><span>+' + (criticos.length - 5) + ' outros pedidos críticos...</span></div>';
  document.getElementById('pmLista').innerHTML = html;
  document.getElementById('pmSub').textContent = criticos.length > 1 ? criticos.length + ' pedidos precisam da sua atenção agora.' : '1 pedido precisa da sua atenção agora.';
  document.getElementById('prazoOverlay').classList.add('show');
}

function fecharBalaoPrazo() {
  document.getElementById('prazoOverlay').classList.remove('show');
}

function irParaCriticos() {
  fecharBalaoPrazo();
  if (tipoAtivo === 'loja') mudarAba('orcamentos');
  setFiltroPrazo('atrasados');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFiltroPrazo(f) {
  filtroPrazoAtivo = f;
  document.querySelectorAll('.prazo-chip').forEach(function(c) {
    c.classList.toggle('active', c.getAttribute('data-filtro') === f);
  });
  aplicarFiltros();
}

/* ===== 8. ABAS, FILTROS E RENDERIZAÇÃO ===== */

var TITULOS_ABA = {
  orcamentos: '📋 Pedidos de orçamento',
  assistencia: '🔧 Pedidos de assistência',
  consultoria: '🎓 Pedidos de consultoria',
  modelagem: '🗂️ Modelagem 3D',
  loja: '🛍️ Pedidos da loja'
};

function mudarAba(tipo) {
  tipoAtivo = tipo;
  filtroPrazoAtivo = 'todos';
  filtroVisao = 'ativos';

  var main = document.getElementById('mainContent');
  var painelMod = document.getElementById('painelModelagem');

  var idsAbas = {
    orcamentos: 'tab-orc',
    assistencia: 'tab-assist',
    consultoria: 'tab-consult',
    modelagem: 'tab-modelagem',
    loja: 'tab-loja'
  };
  Object.keys(idsAbas).forEach(function(k) {
    var btn = document.getElementById(idsAbas[k]);
    if (btn) btn.classList.toggle('active', k === tipo);
  });

  if (tipo === 'modelagem') {
    if (main) main.style.display = 'none';
    if (painelMod) painelMod.style.display = 'block';
    if (window.modModelagem && window.modModelagem.carregar) {
      window.modModelagem.carregar();
    }
    return;
  }

  if (painelMod) painelMod.style.display = 'none';
  if (main) main.style.display = '';

  document.querySelectorAll('.prazo-chip').forEach(function(c) { c.classList.remove('active'); });
  var elTitulo = document.getElementById('tituloPainel');
  if (elTitulo) elTitulo.textContent = TITULOS_ABA[tipo] || '📋 Pedidos';
  var elBusca = document.getElementById('buscaInput');
  if (elBusca) elBusca.value = '';
  var elStatus = document.getElementById('statusFilter');
  if (elStatus) elStatus.value = '';
  montarFiltroStatus();
  montarThead();
  atualizarBarraVisao();
  renderizar();
}

/* 🆕 Barra de visão: Ativos / Entregues / Encerrados / Todos */
function atualizarBarraVisao() {
  var barra = document.getElementById('visaoChips');
  if (!barra) return;

  var lista = getListaAtiva();
  var nAtivos = lista.filter(ehAtivo).length;
  var nEntregues = lista.filter(function(p) {
    return String(p.status || statusPadrao()) === 'entregue';
  }).length;
  var nEncerrados = lista.filter(function(p) {
    var s = String(p.status || statusPadrao());
    return s === 'cancelado' || s === 'sem-resposta';
  }).length;
  var nTodos = lista.length;

  var opcoes = [
    { id: 'ativos',     rotulo: 'Ativos',     qtd: nAtivos },
    { id: 'entregues',  rotulo: 'Entregues',  qtd: nEntregues },
    { id: 'encerrados', rotulo: 'Encerrados', qtd: nEncerrados },
    { id: 'todos',      rotulo: 'Todos',      qtd: nTodos }
  ];

  barra.innerHTML = opcoes.map(function(o) {
    return '<button type="button" class="visao-chip' +
      (filtroVisao === o.id ? ' active' : '') +
      '" data-visao="' + o.id + '" onclick="setFiltroVisao(\'' + o.id + '\')">' +
      o.rotulo + ' <b>' + o.qtd + '</b></button>';
  }).join('');
}

function setFiltroVisao(v) {
  filtroVisao = v;
  atualizarBarraVisao();
  aplicarFiltros();
}

function montarFiltroStatus() {
  var sel = document.getElementById('statusFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos os status</option>';
  opcoesTodas().forEach(function(item) {
    sel.innerHTML += '<option value="' + item[0] + '">' + item[1] + '</option>';
  });
}

function montarThead() {
  var head = document.getElementById('tabelaHead');
  if (!head) return;
  if (tipoAtivo === 'loja') {
    head.innerHTML = '<tr><th>ID</th><th>Cliente</th><th>Contato</th><th>Itens</th><th>Recebido em</th><th>Status</th></tr>';
  } else {
    head.innerHTML = '<tr><th>ID</th><th>Cliente</th><th>Contato</th><th>Descrição</th><th>Recebido em</th><th>Prazo</th><th>Status</th></tr>';
  }
}

/* ✅ CORREÇÃO: novos no topo, o resto por prazo (ordem original) */
function ordenarListas() {
  /* Cria conjunto de ids novos para ordenação eficiente */
  var novosSet = {};
  (novosIds || []).forEach(function(id) { novosSet[String(id)] = true; });

  function prioridadePrazo(p) {
    var c = classePrazo(p);
    if (c === 'atrasado') return 0;
    if (c === 'hoje') return 1;
    if (c === 'amarelo') return 2;
    if (c === 'verde') return 3;
    return 4;
  }

  orcamentos.sort(function(a, b) {
    var aNovo = novosSet[String(a.id)] ? 0 : 1;
    var bNovo = novosSet[String(b.id)] ? 0 : 1;

    /* 🆕 Novos primeiro */
    if (aNovo !== bNovo) return aNovo - bNovo;

    /* Dentro do grupo: ordem por prazo (como era antes) */
    var pa = prioridadePrazo(a);
    var pb = prioridadePrazo(b);
    if (pa !== pb) return pa - pb;

    var ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    var tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });

  lojaPedidos.sort(function(a, b) {
    var aNovo = novosSet[String(a.id)] ? 0 : 1;
    var bNovo = novosSet[String(b.id)] ? 0 : 1;
    if (aNovo !== bNovo) return aNovo - bNovo;

    var ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    var tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
}

/* ✅ CORREÇÃO: filtra por visão (ativos/entregues/encerrados/todos) */
function filtrarPedidos() {
  var elBusca = document.getElementById('buscaInput');
  var elStatus = document.getElementById('statusFilter');
  var elIni = document.getElementById('filtroInicio');
  var elFim = document.getElementById('filtroFim');

  var busca = elBusca ? elBusca.value.toLowerCase().trim() : '';
  var filtroStatus = elStatus ? elStatus.value : '';
  var dtIni = elIni ? elIni.value : '';
  var dtFim = elFim ? elFim.value : '';

  var lista = getListaAtiva();

  /* 🆕 Aplica a visão selecionada */
  if (filtroVisao === 'ativos') {
    lista = lista.filter(ehAtivo);
  } else if (filtroVisao === 'entregues') {
    lista = lista.filter(function(p) {
      return String(p.status || statusPadrao()) === 'entregue';
    });
  } else if (filtroVisao === 'encerrados') {
    lista = lista.filter(function(p) {
      var s = String(p.status || statusPadrao());
      return s === 'cancelado' || s === 'sem-resposta';
    });
  }
  /* 'todos' não filtra */

  return lista.filter(function(p) {
    if (filtroStatus && (p.status || statusPadrao()) !== filtroStatus) return false;
    if (dtIni || dtFim) {
      var ts = p.created_at ? new Date(p.created_at).getTime() : 0;
      if (dtIni && ts < new Date(dtIni + 'T00:00:00').getTime()) return false;
      if (dtFim && ts > new Date(dtFim + 'T23:59:59').getTime()) return false;
    }
    if (tipoAtivo !== 'loja' && filtroPrazoAtivo !== 'todos') {
      var c = classePrazo(p);
      var d = diasAtePrazo(p);
      if (filtroPrazoAtivo === 'atrasados' && c !== 'atrasado') return false;
      if (filtroPrazoAtivo === 'hoje' && c !== 'hoje') return false;
      if (filtroPrazoAtivo === 'semana' && !(d !== null && d >= 0 && d <= 7)) return false;
    }
    if (!busca) return true;
    var texto = [];
    if (tipoAtivo === 'loja') {
      texto = [p.id, p.pedido_id, p.nome_cliente, p.whatsapp, p.entrega, p.nota, JSON.stringify(p.itens || [])];
    } else {
      texto = [p.id, p.nome_cliente, p.email, p.whatsapp, p.descricao_peca, p.pedido_id, p.tipo_peca, p.servico, p.tipo_servico];
    }
    return texto.filter(Boolean).join(' ').toLowerCase().indexOf(busca) !== -1;
  });
}

function aplicarFiltros() {
  var elBusca = document.getElementById('buscaInput');
  var elStatus = document.getElementById('statusFilter');
  var busca = elBusca ? elBusca.value.toLowerCase().trim() : '';
  var filtroStatus = elStatus ? elStatus.value : '';
  var body = document.getElementById('tabelaBody');
  if (!body) return;

  var filtrados = filtrarPedidos();
  verCache = [];
  verSeq = 0;

  if (filtrados.length === 0) {
    var msgVazio = '';
    if (filtroVisao === 'ativos') msgVazio = 'Nenhum pedido ativo no momento';
    else if (filtroVisao === 'entregues') msgVazio = 'Nenhum pedido entregue';
    else if (filtroVisao === 'encerrados') msgVazio = 'Nenhum pedido encerrado';
    else msgVazio = 'Nenhum pedido encontrado';

    body.innerHTML = '<tr class="loading-row"><td colspan="7"><div style="font-size:40px;margin-bottom:12px;">📭</div><p>' +
      msgVazio + (busca || filtroStatus || filtroPrazoAtivo !== 'todos' ? ' com esses filtros' : '') + '.</p></td></tr>';
    return;
  }

  var rotuloTipo = TITULOS_ABA[tipoAtivo]
    ? TITULOS_ABA[tipoAtivo].replace('📋 Pedidos de ', '').replace('🔧 Pedidos de ', '').replace('🎓 Pedidos de ', '').replace('🛍️ Pedidos da ', '').replace('Pedidos de ', '').replace('Pedidos da ', '')
    : 'Pedido';

  var html = '';

  filtrados.forEach(function(p) {
    var status = p.status || statusPadrao();
    var statusLabel = traduzirStatus(status);
    var data = formatarData(p.created_at);
    var idExibido = p.pedido_id || ('#' + p.id);
    var contato = p.whatsapp || p.email || '—';
    var ehNovo = novosIds.indexOf(String(p.id)) !== -1;
    var waLink = montarLinkWhatsApp(p.whatsapp || p.email);
    var waBtn = waLink ? '<a class="wa-link" href="' + waLink + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5 14.2c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.7-.1 1.3z"/></svg>WhatsApp</a>' : '';

    var podeExcluir = status === 'cancelado' || status === 'entregue' || status === 'sem-resposta' || String(status).indexOf('Aguardando') === 0;
    var delBtn = podeExcluir
      ? '<div style="margin-top:6px;"><button type="button" class="del-btn" data-id="' + p.id + '" onclick="excluirPedido(' + p.id + ')"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Excluir</button></div>'
      : '';

    var detalhes = tipoAtivo === 'loja' ? montarItensLoja(p) : montarDescricao(p.descricao_peca || '');

    var extra = [];
    if (tipoAtivo !== 'loja') {
      if (p.tipo_peca) extra.push(p.tipo_peca);
      if (p.quantidade) extra.push('Qtd: ' + p.quantidade);
      if (p.urgencia) extra.push('Urgência: ' + p.urgencia);
    }

    var imgDestaque = '';
    if (tipoAtivo === 'loja' && (p.itens || []).length) {
      var imgPrimeira = buscarImgProduto(p.itens[0].nome || p.itens[0].produto || '');
      if (imgPrimeira) imgDestaque = '<div style="text-align:center;margin-bottom:14px;"><img src="' + escapar(imgPrimeira) + '" alt="" style="max-width:100%;max-height:300px;border-radius:12px;border:1px solid var(--border);box-shadow:0 4px 14px rgba(15,30,61,.12);object-fit:contain;background:var(--light);"></div>';
    }

    var verTitulo = rotuloTipo + ' ' + idExibido;
    var verMeta = (p.nome_cliente || 'Cliente') + ' · ' + data;
    var verTemp = tipoAtivo === 'loja' ? montarTextoCompletoLoja(p) : montarTextoCompletoEncomenda(p);
    var verTxt = typeof verTemp === 'string' ? verTemp : verTemp.txt;
    var verHtml = typeof verTemp === 'string' ? escapar(verTemp).replace(/\n/g, '<br>') : verTemp.html;

    var badgeServico = '';
    if (tipoAtivo !== 'loja') {
      var svTxt = rotuloServico(p.servico || p.tipo_servico || p.tipo_peca || p.tipo || '');
      if (svTxt) badgeServico = '<div style="margin:4px 0 2px;">' + svTxt + '</div>';
    }

    if (imgDestaque) {
      if (typeof verHtml === 'string') { verHtml = imgDestaque + verHtml; }
      else { verHtml = { html: imgDestaque + verHtml.html, txt: verHtml.txt }; }
    }

    var verBtn = montarBotaoVerMais(verTitulo, verMeta, verTxt, verHtml, waLink);

    var classePrazoLinha = tipoAtivo !== 'loja' ? classePrazo(p) : null;
    var classeTr = classePrazoLinha === 'atrasado' ? ' class="tr-atrasado' + (ehNovo ? ' row-novo' : '') + '"' : (classePrazoLinha === 'hoje' ? ' class="tr-hoje' + (ehNovo ? ' row-novo' : '') + '"' : (ehNovo ? ' class="row-novo"' : ''));

    var celulaPrazo = tipoAtivo !== 'loja'
      ? '<td>' + badgePrazo(p) + (p.prazo_desejado ? '<div style="font-size:11px;color:var(--gray);margin-top:3px;">' + normalizarData(p.prazo_desejado) + '</div>' : '') + '</td>'
      : '';

    html += '<tr' + classeTr + '>' +
      '<td class="td-id">' + idExibido + (ehNovo ? '<span class="novo-badge">Novo</span>' : '') + badgeUrgencia(p) + '</td>' +
      '<td><div class="td-client">' + escapar(p.nome_cliente || '—') + '</div></td>' +
      '<td class="td-contact">' + escapar(contato) + waBtn + '</td>' +
      '<td class="td-desc">' + detalhes +
        (extra.length ? '<small>' + escapar(extra.join(' · ')) + '</small>' : '') +
        badgeServico + verBtn +
      '</td>' +
      '<td class="td-date">' + data + '</td>' +
      celulaPrazo +
      '<td>' +
        '<span class="status-pill status-' + classeStatusPill(status) + '" id="pill-' + p.id + '">' + statusLabel + '</span>' +
        '<div style="margin-top:6px;">' +
          '<select class="status-select" onchange="mudarStatus(' + p.id + ', this.value)">' +
            opcoesStatus(status) +
          '</select>' +
        '</div>' +
        delBtn +
      '</td>' +
    '</tr>';
  });

  body.innerHTML = html;
}

function renderizar() {
  renderizarStats();
  aplicarFiltros();
  atualizarBarraVisao();
}

/* ===== 9. ESTATÍSTICAS ===== */

function renderizarStats() {
  var grid = document.getElementById('statsGrid');
  if (!grid) return;

  var nEnc = 0, nAss = 0, nCon = 0, nMod = 0;
  orcamentos.forEach(function(p) {
    var t = servicoTipo(p);
    if (t === 'modelagem') nMod++;
    else if (t === 'assistencia') nAss++;
    else if (t === 'consultoria') nCon++;
    else nEnc++;
  });

  var elCountOrc = document.getElementById('countOrc');
  var elCountAssist = document.getElementById('countAssist');
  var elCountConsult = document.getElementById('countConsult');
  var elCountLoja = document.getElementById('countLoja');
  var elCountMod = document.getElementById('countModelagem');

  if (elCountOrc) elCountOrc.textContent = nEnc;
  if (elCountAssist) elCountAssist.textContent = nAss;
  if (elCountConsult) elCountConsult.textContent = nCon;
  if (elCountLoja) elCountLoja.textContent = lojaPedidos.length;
  if (elCountMod) elCountMod.textContent = nMod;

  var chips = document.getElementById('prazoChips');

  if (tipoAtivo === 'loja') {
    if (chips) chips.classList.remove('show');
    var totalL = lojaPedidos.length;
    var aguardando = lojaPedidos.filter(function(p) {
      return String(p.status || 'feito').indexOf('Aguardando') === 0;
    }).length;
    var feitos = lojaPedidos.filter(function(p) { return (p.status || 'feito') === 'feito'; }).length;
    var pagos = lojaPedidos.filter(function(p) {
      var s = p.status || 'feito';
      return s === 'pago' || s === 'Pago (Cartão)';
    }).length;
    var embalagens = lojaPedidos.filter(function(p) { return (p.status || 'feito') === 'embalagem'; }).length;
    var saidas = lojaPedidos.filter(function(p) { return (p.status || 'feito') === 'saiu'; }).length;
    var entreguesL = lojaPedidos.filter(function(p) { return (p.status || 'feito') === 'entregue'; }).length;
    var confirmados = lojaPedidos.filter(function(p) {
      var s = p.status || 'feito';
      return s === 'pago' || s === 'Pago (Cartão)' || s === 'embalagem' || s === 'saiu' || s === 'entregue';
    });
    var faturamento = confirmados.reduce(function(a, p) { return a + parseFloat(p.total || p.subtotal || 0); }, 0);

    grid.innerHTML =
      '<div class="stat-card orange"><div class="stat-ico">📦</div><div class="stat-label">Total na loja</div><div class="stat-value">' + totalL + '</div></div>' +
      '<div class="stat-card green"><div class="stat-ico">💰</div><div class="stat-label">Faturamento</div><div class="stat-value" style="font-size:20px;">' + fmtMoeda(faturamento) + '</div><div class="stat-detail">Pagamentos confirmados</div></div>' +
      '<div class="stat-card yellow"><div class="stat-ico">⏳</div><div class="stat-label">Aguardando pagamento</div><div class="stat-value">' + aguardando + '</div><div class="stat-detail">Pix + Cartão pendentes</div></div>' +
      '<div class="stat-card blue"><div class="stat-ico">📝</div><div class="stat-label">Pedido feito</div><div class="stat-value">' + feitos + '</div><div class="stat-detail">Aguardando confirmação</div></div>' +
      '<div class="stat-card yellow"><div class="stat-ico">💰</div><div class="stat-label">Pagos</div><div class="stat-value">' + pagos + '</div><div class="stat-detail">Pix + Cartão</div></div>' +
      '<div class="stat-card purple"><div class="stat-ico">📦</div><div class="stat-label">Em embalagem</div><div class="stat-value">' + embalagens + '</div><div class="stat-detail">Preparando o envio</div></div>' +
      '<div class="stat-card purple"><div class="stat-ico">🚚</div><div class="stat-label">Saiu</div><div class="stat-value">' + saidas + '</div></div>' +
      '<div class="stat-card green"><div class="stat-ico">✅</div><div class="stat-label">Entregues</div><div class="stat-value">' + entreguesL + '</div></div>';
  } else {
    if (chips) chips.classList.add('show');
    var lista = getListaAtiva();
    var listaAtiva = lista.filter(ehAtivo);
    var total = lista.length;
    var novos = listaAtiva.filter(function(p) { return (p.status || 'novo') === 'novo'; }).length;
    var atendimento = listaAtiva.filter(function(p) {
      var s = p.status || 'novo';
      return s === 'em-analise' || s === 'orcamento' || s === 'aprovado';
    }).length;
    var execucao = listaAtiva.filter(function(p) {
      var s = p.status || 'novo';
      return s === 'producao' || s === 'pronto';
    }).length;
    var concluidos = lista.filter(function(p) { return (p.status || 'novo') === 'entregue'; }).length;
    var encerrados = lista.filter(function(p) {
      var s = p.status || 'novo';
      return s === 'cancelado' || s === 'sem-resposta';
    }).length;
    var nAtrasados = listaAtiva.filter(function(p) { return classePrazo(p) === 'atrasado'; }).length;
    var nHoje = listaAtiva.filter(function(p) { return classePrazo(p) === 'hoje'; }).length;
    var nSemana = listaAtiva.filter(function(p) {
      var d = diasAtePrazo(p);
      return d !== null && d >= 0 && d <= 7;
    }).length;

    var elAtras = document.getElementById('chipAtrasados');
    var elHoje = document.getElementById('chipHoje');
    var elSem = document.getElementById('chipSemana');
    if (elAtras) elAtras.textContent = nAtrasados;
    if (elHoje) elHoje.textContent = nHoje;
    if (elSem) elSem.textContent = nSemana;

    var icoServico = tipoAtivo === 'assistencia' ? '🔧' : (tipoAtivo === 'consultoria' ? '🎓' : '📋');
    var lblServico = tipoAtivo === 'assistencia' ? 'Atendimentos' : (tipoAtivo === 'consultoria' ? 'Consultorias' : 'Total de pedidos');

    grid.innerHTML =
      '<div class="stat-card orange"><div class="stat-ico">' + icoServico + '</div><div class="stat-label">' + lblServico + '</div><div class="stat-value">' + total + '</div></div>' +
      '<div class="stat-card blue"><div class="stat-ico">🆕</div><div class="stat-label">Novos</div><div class="stat-value">' + novos + '</div><div class="stat-detail">Aguardando primeiro contato</div></div>' +
      '<div class="stat-card purple"><div class="stat-ico">🎯</div><div class="stat-label">Em atendimento</div><div class="stat-value">' + atendimento + '</div></div>' +
      '<div class="stat-card yellow"><div class="stat-ico">🛠️</div><div class="stat-label">Em execução</div><div class="stat-value">' + execucao + '</div></div>' +
      '<div class="stat-card green"><div class="stat-ico">✅</div><div class="stat-label">Concluídos</div><div class="stat-value">' + concluidos + '</div></div>' +
      '<div class="stat-card gray"><div class="stat-ico">🗃️</div><div class="stat-label">Encerrados</div><div class="stat-value">' + encerrados + '</div><div class="stat-detail">Cancelados + Sem resposta</div></div>' +
      '<div class="stat-card red"><div class="stat-ico">⏰</div><div class="stat-label">Prazo crítico</div><div class="stat-value">' + (nAtrasados + nHoje) + '</div><div class="stat-detail">Atrasados + vence hoje</div></div>';
  }

  setTimeout(function () {
    if (window.modModelagem && window.modModelagem.badge) {
      window.modModelagem.badge();
    }
  }, 60);
}

/* ===== 10. NOVOS PEDIDOS + ALERTA SONORO ===== */

function detectarNovos() {
  var chave = tipoAtivo === 'loja' ? 'm3d_vistos_loja' : 'm3d_vistos';
  var vistos = [];
  try { vistos = JSON.parse(localStorage.getItem(chave) || '[]'); } catch(e) { vistos = []; }

  var lista = tipoAtivo === 'loja' ? lojaPedidos : orcamentos;
  var idsAtuais = lista.map(function(p) { return String(p.id); });
  novosIds = idsAtuais.filter(function(id) { return vistos.indexOf(id) === -1; });

  if (novosIds.length > 0) {
    tocarAlerta();
    mostrarBanner(novosIds.length);
  }
  localStorage.setItem(chave, JSON.stringify(idsAtuais));

  /* ✅ Reordena agora que sabemos quem é novo */
  ordenarListas();
}

var _ctxAudio = null;
function ctxAudio() {
  if (!_ctxAudio) {
    try { _ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _ctxAudio;
}

function tocarAlerta() {
  try {
    var ctx = ctxAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);

    setTimeout(function() {
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.25, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 200);
  } catch(e) {}
}

function mostrarBanner(qtd) {
  var banner = document.getElementById('notifyBanner');
  if (!banner) return;
  banner.classList.remove('alerta-prazo');
  document.getElementById('notifyIcon').textContent = '🔔';
  document.getElementById('notifyTitle').textContent = qtd > 1 ? qtd + ' novos pedidos recebidos!' : 'Novo pedido recebido!';
  document.getElementById('notifyText').textContent = qtd > 1 ? 'Clientes acabaram de enviar pedidos. Responda em ordem de chegada.' : 'Um cliente acabou de enviar um pedido.';
  banner.classList.add('show');
  clearTimeout(banner._timer);
  banner._timer = setTimeout(fecharBanner, 8000);
}

function fecharBanner() {
  var b = document.getElementById('notifyBanner');
  if (b) b.classList.remove('show');
}

/* ===== 11. VER DETALHES (MODAL) ===== */

var verDados = { texto: '' };
var verCache = [];
var verSeq = 0;

function montarBotaoVerMais(titulo, meta, texto, html, wa) {
  verCache[verSeq] = {
    t: titulo == null ? '' : String(titulo),
    m: meta == null ? '' : String(meta),
    x: texto == null ? '' : String(texto),
    h: html || '',
    w: wa || ''
  };
  var i = verSeq;
  verSeq++;
  return '<button type="button" class="ver-mais-btn" onclick="abrirVerMais(' + i + ')">Ver detalhes</button>';
}

function abrirVerMais(i) {
  var d = verCache[i] || {};
  verDados.texto = d.x || '';
  document.getElementById('vmTitulo').textContent = d.t || '';
  document.getElementById('vmMeta').textContent = d.m || '';
  var el = document.getElementById('vmTexto');
  if (d.h) { el.innerHTML = d.h; }
  else { el.textContent = verDados.texto || '(sem mensagem)'; }

  var link = document.getElementById('vmWa');
  if (d.w) { link.href = d.w; link.style.display = ''; }
  else { link.style.display = 'none'; }

  document.getElementById('verOverlay').classList.add('show');
}

function fecharVerMais() {
  document.getElementById('verOverlay').classList.remove('show');
}

function copiarVerMais() {
  copiarTexto(verDados.texto, function() {
    var el = document.getElementById('vmTexto');
    var ant = el.style.background;
    el.style.background = '#e3f5ec';
    setTimeout(function() { el.style.background = ant; }, 900);
  });
}

function rotuloServico(s) {
  s = String(s == null ? '' : s).toLowerCase().trim();
  if (!s || s === 'null') return '';
  if (s.indexOf('modelag') !== -1) return '🗂️ Modelagem 3D';
  if (s.indexOf('consult') !== -1) return '🎓 Consultoria 3D';
  if (s.indexOf('assist') !== -1 || s.indexOf('manut') !== -1) return '🔧 Assistência Creality';
  if (s.indexOf('outros') !== -1) return 'Outros';
  return '🖨️ Impressão 3D';
}

function camposEncomenda(p) {
  p = p || {};

  function pega(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i] != null && String(sources[i]).trim() !== '') return String(sources[i]).trim();
    }
    return null;
  }
  function v(d) {
    if (d === null || d === undefined) return 'Pendente';
    d = String(d).trim();
    return (d === '' || d === 'null' || d === 'undefined') ? 'Pendente' : d;
  }

  var servico = rotuloServico(pega([p.servico, p.tipo_servico, p.servico_escolhido, p.tipo_peca, p.tipo])) || '🖨️ Impressão 3D';
  var desc = pega([p.descricao_peca, p.descricao, p.observacoes, p.nota, p.mensagem]) || '';
  var descMain = desc.split('|')[0].trim();
  var linksExtra = [];
  var partes = desc.split('|');
  for (var i = 1; i < partes.length; i++) {
    var x = partes[i].trim();
    if (x.indexOf('Links:') === 0 || x.indexOf('links:') === 0) {
      x.replace(/^links?:/i, '').split(',').forEach(function(u) { u = u.trim(); if (u) linksExtra.push(u); });
    }
  }

  return [
    ['Serviço solicitado', servico],
    ['Nome do cliente', v(pega([p.nome_cliente, p.nome, p.cliente]))],
    ['WhatsApp / Telefone', v(pega([p.whatsapp, p.telefone, p.celular, p.contato]))],
    ['E-mail', v(pega([p.email]))],
    ['Quantidade (peças)', v(pega([p.quantidade, p.qtd, p.pecas]))],
    ['O que quer criar', v(descMain)],
    ['Prazo desejado', v(normalizarData(pega([p.prazo_desejado, p.prazo, p.prazo_entrega, p.data_entrega])))],
    ['Nível de urgência', v(pega([p.urgencia, p.nivel_urgencia, p.urgente]))],
    ['Links de referência', v(linksExtra.length ? linksExtra.join(', ') : pega([p.links, p.links_referencia, p.referencias]))],
    ['Nº do pedido', v(pega([p.pedido_id, p.numero_pedido, p.n_pedido, p.codigo]))]
  ];
}

function montarTextoCompletoEncomenda(p) {
  var campos = camposEncomenda(p);
  var html = '<div class="vm-lista">';
  campos.forEach(function(c) {
    var pend = c[1] === 'Pendente';
    html += '<div class="vm-campo"><span class="vm-rot">' + escapar(c[0]) + '</span>' +
            (pend ? '<span class="vm-pendente">Pendente</span>' : '<span class="vm-valor">' + escapar(c[1]) + '</span>') + '</div>';
  });
  html += '</div>';
  var txt = campos.map(function(c) { return c[0] + ': ' + c[1]; }).join('\n');
  return { html: html, txt: txt };
}

function montarTextoCompletoLoja(p) {
  var linhas = [];
  (p.itens || []).forEach(function(item) {
    var qtd = item.qtd || item.quantidade || item.quant || 1;
    var nome = item.nome || item.produto || item.descricao || 'Item';
    var preco = parseFloat(item.preco || item.valor || 0);
    var cor = item.cor ? ' (' + item.cor + ')' : '';
    linhas.push(qtd + 'x ' + nome + cor + ' — ' + fmtMoeda(preco * qtd));
  });
  if (!linhas.length) linhas.push('Itens: Pendente');
  if (p.cupom && parseFloat(p.desconto) > 0) linhas.push('Cupom ' + p.cupom + ': -' + fmtMoeda(p.desconto));
  linhas.push('Total: ' + fmtMoeda(p.total || (parseFloat(p.subtotal) - parseFloat(p.desconto))));
  linhas.push('Entrega: ' + (etiquetaEntrega(p.entrega) || 'Pendente'));
  var tipoE = String(p.entrega || '').toLowerCase();
  if (tipoE.indexOf('correio') !== -1) {
    linhas.push('Endereço: ' + (p.endereco || 'Pendente'));
  }
  if (tipoE.indexOf('retirada') !== -1 || tipoE.indexOf('uber') !== -1) {
    linhas.push('Horário: ' + (p.horario || 'Pendente'));
  }
  return linhas.join('\n');
}

function montarDescricao(texto) {
  if (!texto) return '<span style="color:var(--gray)">—</span>';
  var partes = texto.split('|');
  var principal = partes[0].trim();
  var links = [];
  for (var i = 1; i < partes.length; i++) {
    var p = partes[i].trim();
    if (p.indexOf('Links:') === 0) {
      p.replace('Links:', '').split(',').forEach(function(u) {
        u = u.trim();
        if (u) links.push(u);
      });
    }
  }
  var html = '<span class="desc-text" title="' + escapar(texto) + '">' + escapar(principal) + '</span>';
  if (links.length) {
    html += '<small>' + links.map(function(l) {
      return '<a href="' + escapar(l) + '" target="_blank" rel="noopener">Ver referência</a>';
    }).join(' · ') + '</small>';
  }
  return html;
}

function montarItensLoja(p) {
  var itens = p.itens || [];
  if (!itens.length) return '<span style="color:var(--gray)">—</span>';

  var html = '';
  itens.forEach(function(item) {
    var qtd = item.qtd || item.quantidade || item.quant || 1;
    var nome = item.nome || item.produto || item.descricao || 'Item';
    var preco = parseFloat(item.preco || item.valor || 0);
    var cor = item.cor ? ' (' + item.cor + ')' : '';
    var img = buscarImgProduto(nome);
    var thumb = img ? '<img class="item-thumb" src="' + escapar(img) + '" alt="">' : '';
    html += '<span class="item-linha">' + thumb + '<span class="item-nome">' + escapar(String(qtd) + 'x ' + nome + cor) + '</span> · ' + fmtMoeda(preco * qtd) + '</span>';
  });
  if (p.cupom && parseFloat(p.desconto) > 0) {
    html += '<span class="item-linha" style="color:var(--gray);">Cupom ' + escapar(p.cupom) + ': -' + fmtMoeda(p.desconto) + '</span>';
  }
  html += '<span class="total-loja">Total: ' + fmtMoeda(p.total || (parseFloat(p.subtotal) - parseFloat(p.desconto))) + '</span>';
  html += '<span class="entrega-loja">' + etiquetaEntrega(p.entrega) + '</span>';
  if (p.nota) {
    html += '<small style="display:block;margin-top:4px;color:var(--gray);font-size:11px;">Obs: ' + escapar(p.nota) + '</small>';
  }
  return html;
}

function etiquetaEntrega(e) {
  var s = String(e || '').toLowerCase();
  if (s.indexOf('uber') > -1) return 'Entrega por aplicativo';
  if (s.indexOf('correio') > -1) return 'Envio pelos Correios';
  if (s.indexOf('retirada') > -1) return 'Retirada na loja';
  return s || 'Retirada na loja';
}

function montarLinkWhatsApp(contato) {
  if (!contato) return '';
  var digitos = contato.replace(/\D/g, '');
  if (digitos.length < 10) return '';
  if (digitos.length === 10 || digitos.length === 11) {
    if (digitos.indexOf('55') !== 0) digitos = '55' + digitos;
  }
  return 'https://wa.me/' + digitos;
}

/* ===== 12. STATUS: PILLS, OPÇÕES, MENSAGENS E BALCÃO ===== */

function classeStatusPill(s) {
  if (!s) s = statusPadrao();
  if (s === 'Pago (Cartão)') return 'pagocartao';
  if (String(s).indexOf('Aguardando') === 0) return 'aguardando';
  if (s === 'sem-resposta') return 'semresposta';
  return s;
}

function opcoesTodas() {
  if (tipoAtivo === 'loja') {
    return [
      ['feito', '📝 Pedido feito'],
      ['Aguardando pagamento (Pix)', '⏳ Aguardando pagamento (Pix)'],
      ['Aguardando pagamento (Cartão)', '⏳ Aguardando pagamento (Cartão)'],
      ['pago', '💰 Pago no Pix'],
      ['Pago (Cartão)', '✅ Pago no cartão'],
      ['embalagem', '📦 Em processo de embalagem'],
      ['saiu', '🚚 Saiu para entrega'],
      ['entregue', '🔵 Entregue'],
      ['sem-resposta', '📭 Sem resposta'],
      ['cancelado', '✕ Cancelado']
    ];
  }
  return [
    ['novo', 'Novo'],
    ['em-analise', 'Em análise'],
    ['orcamento', 'Em orçamento'],
    ['aprovado', 'Aprovado'],
    ['producao', 'Em produção'],
    ['pronto', 'Pronto'],
    ['entregue', 'Entregue'],
    ['sem-resposta', '📭 Sem resposta'],
    ['cancelado', '✕ Cancelado']
  ];
}

function opcoesStatus(atual) {
  return opcoesTodas().map(function(item) {
    return '<option value="' + item[0] + '"' + (item[0] === atual ? ' selected' : '') + '>' + item[1] + '</option>';
  }).join('');
}

function traduzirStatus(s) {
  var map = tipoAtivo === 'loja'
    ? {
        'Aguardando pagamento (Pix)': '⏳ Aguardando (Pix)',
        'Aguardando pagamento (Cartão)': '⏳ Aguardando (Cartão)',
        feito: '📝 Pedido feito',
        pago: '💰 Pago no Pix',
        'Pago (Cartão)': '✅ Pago no cartão',
        embalagem: '📦 Em embalagem',
        saiu: '🚚 Saiu para entrega',
        entregue: '🔵 Entregue',
        'sem-resposta': '📭 Sem resposta',
        cancelado: '✕ Cancelado'
      }
    : {
        novo: 'Novo',
        'em-analise': 'Em análise',
        orcamento: 'Em orçamento',
        aprovado: 'Aprovado',
        producao: 'Em produção',
        pronto: '🔵 Pronto',
        entregue: '🔵 Entregue',
        'sem-resposta': '📭 Sem resposta',
        cancelado: '✕ Cancelado'
      };
  return map[s] || s;
}

function excluirPedido(id) {
  var p = getListaAtiva().find(function(x) { return x.id === id; });
  var ref = p && p.pedido_id ? p.pedido_id : ('#' + id);
  if (!confirm('Excluir o pedido ' + ref + '?\n\nEsta ação não pode ser desfeita.')) return;

  var btn = document.querySelector('.del-btn[data-id="' + id + '"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Excluindo...'; }

  var endpoint = tipoAtivo === 'loja' ? '/loja/pedidos/' : '/orcamentos/';
  fetch(API_URL + endpoint + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) {
    if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
    if (!res.ok) throw new Error('Erro ' + res.status);
    return res.json();
  })
  .then(function() {
    if (tipoAtivo === 'loja') {
      lojaPedidos = lojaPedidos.filter(function(x) { return x.id !== id; });
      window.lojaPedidos = lojaPedidos;
    } else {
      orcamentos = orcamentos.filter(function(x) { return x.id !== id; });
      window.orcamentos = orcamentos;
    }
    renderizar();
  })
  .catch(function(err) {
    alert('Erro ao excluir: ' + err.message);
    carregarPedidos();
  });
}

function mudarStatus(id, novoStatus) {
  var p = getListaAtiva().find(function(x) { return x.id === id; });
  var nome = p ? (p.nome_cliente || '') : '';
  var pedidoRef = p && p.pedido_id ? p.pedido_id : ('#' + id);
  var contato = p ? (p.whatsapp || p.email || '') : '';
  var statusAnterior = p ? (p.status || statusPadrao()) : '';
  var endpoint = tipoAtivo === 'loja' ? '/loja/pedidos/' : '/orcamentos/';

  fetch(API_URL + endpoint + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ status: novoStatus })
  })
  .then(function(res) {
    if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
    if (!res.ok) throw new Error('Erro ' + res.status);
    return res.json();
  })
  .then(function() {
    if (p) p.status = novoStatus;
    renderizar();
    if (novoStatus !== statusAnterior) {
      mostrarBalcao(nome, pedidoRef, contato, novoStatus);
    }
  })
  .catch(function(err) {
    alert('Erro ao atualizar o status: ' + err.message);
    carregarPedidos();
  });
}

function montarMensagemEntregue(primeiroNome, id) {
  var msg = 'Olá, *' + primeiroNome + '*! Seu pedido *' + id + '* foi entregue 🎉\n'
    + 'Obrigado demais pela confiança — foi um prazer produzir sua peça! ⭐\n';
  if (LINK_AVALIACAO_GOOGLE) {
    msg += 'Se puder, deixe sua avaliação no Google — ajuda demais a nossa loja:\n' + LINK_AVALIACAO_GOOGLE + '\n';
  }
  msg += 'Se precisar de algo, ou quiser encomendar uma nova peça, é só chamar! 💛';
  return msg;
}

function montarMensagemStatus(nome, id, status) {
  var primeiroNome = (nome || '').trim().split(' ')[0] || 'Cliente';
  var msgEntregue = montarMensagemEntregue(primeiroNome, id);
  var msgSemResposta = 'Olá, *' + primeiroNome + '*! Passando por aqui para saber se ainda tem interesse no pedido *' + id + '* 😊\n'
    + 'Se quiser dar continuidade, é só responder esta mensagem que retomamos tudo do ponto onde paramos. '
    + 'Se preferir deixar para depois, sem problema nenhum! 💛';

  if (tipoAtivo === 'loja') {
    var mapLoja = {
      feito: 'Olá, *' + primeiroNome + '*! Recebemos seu pedido *' + id + '* ✅\nVamos conferir tudo e combinar com você por aqui o pagamento e a entrega. Qualquer dúvida, chama!',
      'Aguardando pagamento (Pix)': 'Olá, *' + primeiroNome + '*! Recebemos seu pedido *' + id + '* ✅\nPara concluir, realize o pagamento via PIX (5% de desconto) e envie o comprovante aqui junto com o número do pedido. Qualquer dúvida, chama!',
      'Aguardando pagamento (Cartão)': 'Olá, *' + primeiroNome + '*! Recebemos seu pedido *' + id + '* ✅\nFalta concluir o pagamento no cartão pelo link do Mercado Pago. Você pode retomar em Minha conta > Meus pedidos, ou pedir o link aqui.',
      pago: 'Olá, *' + primeiroNome + '*! Recebemos a confirmação do pagamento do pedido *' + id + '* via PIX 🎉\nAgora é só aguardar, vamos preparar tudo com capricho. Qualquer dúvida, é só chamar!',
      'Pago (Cartão)': 'Olá, *' + primeiroNome + '*! Confirmamos o pagamento do pedido *' + id + '* no cartão 🎉\nAgora é só aguardar, vamos preparar tudo com capricho. Qualquer dúvida, é só chamar!',
      embalagem: 'Olá, *' + primeiroNome + '*! Boa notícia: seu pedido *' + id + '* já está em processo de embalagem 📦\nEm breve ele sai para entrega. Qualquer dúvida, é só chamar!',
      saiu: 'Olá, *' + primeiroNome + '*! Seu pedido *' + id + '* saiu para entrega! 🚚\nFique de olho: em breve ele chega até você.',
      entregue: msgEntregue,
      'sem-resposta': msgSemResposta,
      cancelado: 'Olá, *' + primeiroNome + '*! Uma atualização sobre o pedido *' + id + '*: ele foi cancelado.\nSe quiser refazer o pedido, ajustar algo ou tirar qualquer dúvida, é só nos chamar — vamos adorar te atender! 💛'
    };
    return mapLoja[status] || '';
  }

  var map = {
    'em-analise': 'Olá, *' + primeiroNome + '*! Recebemos seu pedido *' + id + '* ✅\nEle já está em análise pela nossa equipe. Assim que tivermos o orçamento, retornamos aqui pelo WhatsApp. Fica de olho!',
    orcamento: 'Olá, *' + primeiroNome + '*! Recebemos seu pedido *' + id + '* ✅\nJá estamos preparando o orçamento e retornamos em breve aqui mesmo, pelo WhatsApp. Fica de olho!',
    aprovado: 'Olá, *' + primeiroNome + '*! Seu pedido *' + id + '* foi aprovado. 🎉\nEm breve iniciamos a produção. Qualquer dúvida, é só chamar!',
    producao: 'Olá, *' + primeiroNome + '*! Boa notícia: seu pedido *' + id + '* entrou em produção! 🖨️\n'
      + 'Se surgir qualquer dúvida, é só chamar a gente por aqui.\n\n'
      + 'Enquanto a sua peça fica pronta, dá uma olhada na nossa loja de pronta entrega — '
      + 'as peças saem no mesmo dia, com retirada aqui em Nilópolis ou entrega por aplicativo: '
      + 'https://meu3dlabs.com.br/loja\n\n'
      + 'Só o envio pelos Correios leva um pouco mais de tempo por causa da embalagem.',
    pronto: 'Olá, *' + primeiroNome + '*! Seu pedido *' + id + '* está pronto para retirada ou envio! 🎉\nÉ só combinar com a gente o melhor jeito de receber. 😉',
    entregue: msgEntregue,
    'sem-resposta': msgSemResposta,
    cancelado: 'Olá, *' + primeiroNome + '*! Uma atualização sobre o pedido *' + id + '*: ele foi cancelado.\nSe quiser refazer o pedido, ajustar algo ou tirar qualquer dúvida, é só nos chamar — vamos adorar te atender! 💛'
  };
  return map[status] || '';
}

function mostrarBalcao(nome, id, contato, status) {
  mensagemAtual = montarMensagemStatus(nome, id, status);
  if (!mensagemAtual) return;

  document.getElementById('sbTitulo').textContent = 'Status: ' + traduzirStatus(status);
  document.getElementById('sbMensagem').textContent = mensagemAtual;

  var wa = montarLinkWhatsApp(contato);
  var link = document.getElementById('sbWaLink');
  if (wa) {
    link.href = wa + '?text=' + encodeURIComponent(mensagemAtual);
    link.style.display = '';
  } else {
    link.style.display = 'none';
  }
  document.getElementById('statusOverlay').classList.add('show');
}

function fecharBalcao() {
  document.getElementById('statusOverlay').classList.remove('show');
}

function copiarMensagem() {
  copiarTexto(mensagemAtual, mostrarCopiado);
}

function mostrarCopiado() {
  var el = document.getElementById('sbCopiado');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.classList.remove('show'); }, 2000);
}

/* ===== 13. EXPORTAR CSV E RELATÓRIO PARA IA ===== */

function csvEscape(v) {
  v = String(v == null ? '' : v);
  return '"' + v.replace(/"/g, '""') + '"';
}

function exportarCSV() {
  var filtrados = filtrarPedidos();
  if (!filtrados.length) { alert('Nenhum pedido para exportar com os filtros atuais.'); return; }

  var linhas;
  if (tipoAtivo === 'loja') {
    linhas = [['ID', 'Pedido', 'Cliente', 'WhatsApp', 'Itens', 'Total', 'Entrega', 'Endereco', 'Horario', 'Status', 'Data']];
    filtrados.forEach(function(p) {
      var itens = (p.itens || []).map(function(i) { return (i.qtd || 1) + 'x ' + (i.nome || '') + (i.cor ? ' (' + i.cor + ')' : ''); }).join(' | ');
      linhas.push([p.id, p.pedido_id || '', p.nome_cliente || '', p.whatsapp || '', itens, p.total != null ? p.total : p.subtotal, p.entrega || '', p.endereco || '', p.horario || '', p.status || '', p.created_at || '']);
    });
  } else {
    linhas = [['ID', 'Pedido', 'Cliente', 'WhatsApp', 'Email', 'Servico', 'Qtd', 'Descricao', 'Urgencia', 'Prazo', 'Status', 'Data']];
    filtrados.forEach(function(p) {
      linhas.push([p.id, p.pedido_id || '', p.nome_cliente || '', p.whatsapp || '', p.email || '', p.tipo_peca || p.servico || '', p.quantidade || '', (p.descricao_peca || '').split('|')[0].trim(), p.urgencia || '', p.prazo_desejado || '', p.status || '', p.created_at || '']);
    });
  }

  var csv = linhas.map(function(r) { return r.map(csvEscape).join(';'); }).join('\r\n');
  var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var rotuloCsv = tipoAtivo === 'loja' ? 'pedidos-loja' : (tipoAtivo === 'assistencia' ? 'assistencias' : (tipoAtivo === 'consultoria' ? 'consultorias' : 'encomendas'));
  a.download = rotuloCsv + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

function abrirRelatorioIA() {
  var lista = filtrarPedidos();
  if (!lista.length) { alert('Nenhum pedido para gerar relatório com os filtros atuais.'); return; }

  var linhas = [];
  linhas.push('=== RELATÓRIO DE PEDIDOS — MEU 3D LABS ===');
  linhas.push('Aba: ' + (TITULOS_ABA[tipoAtivo] || 'Pedidos'));
  linhas.push('Visão: ' + filtroVisao);
  linhas.push('Gerado em: ' + new Date().toLocaleString('pt-BR'));
  linhas.push('Total de pedidos (com filtros atuais): ' + lista.length);
  linhas.push('');

  lista.forEach(function(p) {
    linhas.push('--- Pedido ' + (p.pedido_id || ('#' + p.id)) + ' ---');
    linhas.push('Cliente: ' + (p.nome_cliente || '—'));
    linhas.push('Contato: ' + (p.whatsapp || p.email || '—'));
    if (tipoAtivo !== 'loja') {
      linhas.push('Serviço: ' + (rotuloServico(p.servico || p.tipo_servico || p.tipo_peca || p.tipo) || '—'));
      linhas.push('O que quer criar: ' + ((p.descricao_peca || '').split('|')[0].trim() || '—'));
      linhas.push('Quantidade: ' + (p.quantidade || '—'));
      linhas.push('Prazo desejado: ' + (normalizarData(p.prazo_desejado) || '—'));
      linhas.push('Urgência: ' + (p.urgencia || 'Pendente'));
      linhas.push('Status: ' + traduzirStatus(p.status || 'novo'));
      linhas.push('Recebido em: ' + formatarData(p.created_at));
    } else {
      (p.itens || []).forEach(function(i) {
        linhas.push('Item: ' + (i.qtd || 1) + 'x ' + (i.nome || '') + (i.cor ? ' (' + i.cor + ')' : '') + ' — ' + fmtMoeda(parseFloat(i.preco || 0) * (i.qtd || 1)));
      });
      linhas.push('Total: ' + fmtMoeda(p.total || p.subtotal));
      linhas.push('Entrega: ' + (etiquetaEntrega(p.entrega) || '—'));
      var tipoR = String(p.entrega || '').toLowerCase();
      if (tipoR.indexOf('correio') !== -1) linhas.push('Endereço: ' + (p.endereco || 'Pendente'));
      if (tipoR.indexOf('retirada') !== -1 || tipoR.indexOf('uber') !== -1) linhas.push('Horário: ' + (p.horario || 'Pendente'));
      linhas.push('Status: ' + traduzirStatus(p.status || 'feito'));
      linhas.push('Recebido em: ' + formatarData(p.created_at));
    }
    linhas.push('');
  });

  linhas.push('=== FIM DO RELATÓRIO ===');
  document.getElementById('relatorioTexto').value = linhas.join('\n');
  document.getElementById('relatorioOverlay').classList.add('show');
}

function fecharRelatorio() {
  document.getElementById('relatorioOverlay').classList.remove('show');
}

function copiarRelatorio() {
  copiarTexto(document.getElementById('relatorioTexto').value, mostrarCopiado);
}

/* ===== 14. CÓPIA PARA A ÁREA DE TRANSFERÊNCIA ===== */

function copiarTexto(t, aoConcluir) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function() { if (aoConcluir) aoConcluir(); }).catch(function() { fbCopia(t); if (aoConcluir) aoConcluir(); });
  } else {
    fbCopia(t);
    if (aoConcluir) aoConcluir();
  }
}

function fbCopia(t) {
  var ta = document.createElement('textarea');
  ta.value = t;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

/* ===== 15. TECLA ESCAPE ===== */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    fecharVerMais();
    fecharRelatorio();
    fecharBalaoPrazo();
    if (window.modFecharStatus) window.modFecharStatus();
    if (window.modFecharDetalhe) window.modFecharDetalhe();
    if (window.encFecharStatus) window.encFecharStatus();
  }
});

/* ===== 16. EXPOSIÇÃO GLOBAL ===== */
try {
  window.orcamentos = orcamentos;
  window.lojaPedidos = lojaPedidos;
  window.mudarAba = mudarAba;
  window.carregarPedidos = carregarPedidos;
  window.renderizarStats = renderizarStats;
  window.renderizar = renderizar;
  window.aplicarFiltros = aplicarFiltros;
  window.filtrarPedidos = filtrarPedidos;
  window.servicoTipo = servicoTipo;
  window.mostrarBalcao = mostrarBalcao;
  window.montarMensagemStatus = montarMensagemStatus;
  window.traduzirStatus = traduzirStatus;
  window.fmtMoeda = fmtMoeda;
  window.escapar = escapar;
  window.opcoesTodas = opcoesTodas;
  window.classePrazo = classePrazo;
  window.getListaAtiva = getListaAtiva;
  window.ehEncerrado = ehEncerrado;
  window.ehAtivo = ehAtivo;
  window.setFiltroVisao = setFiltroVisao;
} catch (e) {}

/* =====================================================================
   BALCÃO DE STATUS DA ENCOMENDA (padrão visual da Modelagem)
   ===================================================================== */
(function () {
  var STATUS_ENC = [
    { id: 'novo',       label: 'Novo',          classe: 'status-novo' },
    { id: 'em-analise', label: 'Em análise',    classe: 'status-em-analise' },
    { id: 'orcamento',  label: 'Em orçamento',  classe: 'status-orcamento' },
    { id: 'aprovado',   label: 'Aprovado',      classe: 'status-aprovado' },
    { id: 'producao',   label: 'Em produção',   classe: 'status-producao' },
    { id: 'pronto',     label: 'Pronto',        classe: 'status-pronto' },
    { id: 'entregue',   label: 'Entregue',      classe: 'status-entregue' },
    { id: 'sem-resposta', label: 'Sem resposta', classe: 'status-semresposta' },
    { id: 'cancelado',  label: 'Cancelado',     classe: 'status-cancelado' }
  ];

  var encAtual = null;
  var encAcao = null;

  function info(id) {
    for (var i = 0; i < STATUS_ENC.length; i++) {
      if (STATUS_ENC[i].id === id) return STATUS_ENC[i];
    }
    return STATUS_ENC[0];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var _aplicarOriginal = window.aplicarFiltros;
  if (typeof _aplicarOriginal === 'function') {
    window.aplicarFiltros = function () {
      var r = _aplicarOriginal.apply(this, arguments);
      trocarSelectPorBotao();
      return r;
    };
  }

  function trocarSelectPorBotao() {
    var selects = document.querySelectorAll('.status-select');
    for (var i = 0; i < selects.length; i++) {
      var sel = selects[i];
      if (sel.dataset.trocado === '1') continue;
      sel.dataset.trocado = '1';
      sel.style.display = 'none';

      var m = (sel.getAttribute('onchange') || '').match(/mudarStatus\((\d+)/);
      if (!m) continue;
      var id = m[1];

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mod-btn st';
      btn.textContent = 'Status';
      btn.setAttribute('data-enc-status', id);
      btn.addEventListener('click', function () {
        abrirBalcaoEncomenda(this.getAttribute('data-enc-status'));
      });

      sel.parentNode.appendChild(btn);
    }
  }

  function buscarPedido(id) {
    var lista = window.getListaAtiva ? window.getListaAtiva() : [];
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(id)) return lista[i];
    }
    return null;
  }

  function abrirBalcaoEncomenda(id) {
    var p = buscarPedido(id);
    if (!p) return;
    encAtual = p;
    encAcao = null;

    var overlay = document.getElementById('encStatusOverlay');
    var corpo = document.getElementById('encStatusCorpo');
    var titulo = document.getElementById('encStatusTitulo');
    if (!overlay || !corpo) {
      if (window.mostrarBalcao) window.mostrarBalcao(p.nome_cliente, p.pedido_id || ('#' + p.id), p.whatsapp || p.email, p.status || 'novo');
      return;
    }

    if (titulo) {
      titulo.textContent = 'Status — ' + (p.pedido_id || ('#' + p.id)) + ' · ' + (p.nome_cliente || '');
    }

    var st = info(p.status || 'novo');
    var html = '';

    html += '<div class="m3d-transf-bloco">';
    html += '<div class="m3d-transf-linha"><strong>Status atual</strong><span>' +
      '<span class="status-pill ' + st.classe + '">' + esc(st.label) + '</span></span></div>';
    html += '</div>';

    html += '<div class="m3d-transf-bloco"><h4>Alterar para</h4><div class="mod-status-grid">';
    for (var i = 0; i < STATUS_ENC.length; i++) {
      var s = STATUS_ENC[i];
      html += '<button type="button" class="mod-status-opt' +
        (s.id === (p.status || 'novo') ? ' atual' : '') +
        '" data-enc-set="' + s.id + '">' +
        '<span class="status-pill ' + s.classe + '">' + esc(s.label) + '</span>' +
        '</button>';
    }
    html += '</div></div>';

    html += '<div id="encDinamico"></div>';

    corpo.innerHTML = html;
    overlay.classList.add('aberto');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    overlay.style.pointerEvents = 'auto';
    overlay.style.zIndex = '9999';

    var opts = corpo.querySelectorAll('[data-enc-set]');
    for (var j = 0; j < opts.length; j++) {
      opts[j].addEventListener('click', function () {
        selecionarStatusEncomenda(this.getAttribute('data-enc-set'));
      });
    }
  }

  function selecionarStatusEncomenda(statusId) {
    if (!encAtual) return;
    encAcao = statusId;

    var box = document.getElementById('encDinamico');
    if (!box) return;

    var opts = document.querySelectorAll('[data-enc-set]');
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle('sel', opts[i].getAttribute('data-enc-set') === statusId);
    }

    var p = encAtual;
    var msg = window.montarMensagemStatus
      ? window.montarMensagemStatus(p.nome_cliente, p.pedido_id || ('#' + p.id), statusId)
      : '';

    var html = '';

    if (msg) {
      html += '<div class="mod-msg-box">';
      html += '<div class="mod-msg-head">';
      html += '<span class="mod-msg-titulo">Mensagem para o cliente</span>';
      html += '<button type="button" class="mod-msg-copiar" id="encCopiar">📋 Copiar</button>';
      html += '</div>';
      html += '<textarea id="encMensagem" readonly rows="10">' + esc(msg) + '</textarea>';
      html += '</div>';
    }

    html += '<div class="mod-status-acoes">';
    html += '<button type="button" class="mod-btn-cancel" id="encCancelar">Cancelar</button>';
    html += '<button type="button" class="mod-btn-aplicar" id="encAplicar">' +
      'Confirmar "' + esc(info(statusId).label) + '"</button>';
    html += '</div>';

    box.innerHTML = html;

    var copiar = document.getElementById('encCopiar');
    if (copiar) copiar.addEventListener('click', function () {
      var ta = document.getElementById('encMensagem');
      if (!ta) return;
      ta.removeAttribute('readonly');
      ta.select();
      ta.setSelectionRange(0, 99999);
      try { document.execCommand('copy'); } catch (e) {}
      ta.setAttribute('readonly', 'readonly');
    });

    var cancelar = document.getElementById('encCancelar');
    if (cancelar) cancelar.addEventListener('click', function () {
      var d = document.getElementById('encDinamico');
      if (d) d.innerHTML = '';
      encAcao = null;
      var ops = document.querySelectorAll('[data-enc-set]');
      for (var k = 0; k < ops.length; k++) ops[k].classList.remove('sel');
    });

    var aplicar = document.getElementById('encAplicar');
    if (aplicar) aplicar.addEventListener('click', function () {
      if (!encAtual || !encAcao) return;
      fecharBalcaoEncomenda();
      if (typeof window.mudarStatus === 'function') {
        window.mudarStatus(encAtual.id, encAcao);
      }
    });
  }

  function fecharBalcaoEncomenda() {
    var o = document.getElementById('encStatusOverlay');
    if (!o) return;
    o.classList.remove('aberto');
    o.style.display = 'none';
  }

  window.encFecharStatus = fecharBalcaoEncomenda;

  document.addEventListener('click', function () {
    setTimeout(trocarSelectPorBotao, 120);
  });
})();