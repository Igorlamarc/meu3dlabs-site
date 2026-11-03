/* ==========================================================================
   Meu 3D Labs — admin-modelagem.js
   Aba "Modelagem 3D" do painel administrativo.
   Carregar DEPOIS de admin.js.
   ========================================================================== */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  /* ========================================================================
     01. CONSTANTES
     ======================================================================== */
  var API_URL = (typeof window.API === 'string' && window.API) ||
                (typeof window.API_BASE === 'string' && window.API_BASE) ||
                'https://meu3dlabs-backend.onrender.com/api';
  window.API = API_URL;
  window.API_BASE = API_URL;

  var LS_TOKEN = 'm3d_admin_token';

  var FAIXAS = {
    simples:  { nome: 'Simples',  cor: 'm3d-faixa-simples' },
    media:    { nome: 'Média',    cor: 'm3d-faixa-media' },
    complexa: { nome: 'Complexa', cor: 'm3d-faixa-complexa' }
  };

  var MOD_STATUS = [
    { id: 'novo',        label: 'Novo',                     classe: 'status-novo' },
    { id: 'em-analise',  label: 'Em análise',               classe: 'status-em-analise' },
    { id: 'orcamento',   label: 'Orçamento enviado',        classe: 'status-orcamento' },
    { id: 'aprovado',    label: 'Aprovado',                 classe: 'status-aprovado' },
    { id: 'pago',        label: 'Pago',                     classe: 'status-pago' },
    { id: 'producao',    label: 'Em produção',              classe: 'status-producao' },
    { id: 'pronto',      label: 'Pronto',                   classe: 'status-pronto' },
    { id: 'transferido', label: 'Transferido p/ encomenda', classe: 'status-transferido' },
    { id: 'recusado',    label: 'Recusado',                 classe: 'status-recusado' }
  ];

  var LOJA_URL = 'https://meu3dlabs.com.br/loja';

  /* ========================================================================
     02. ESTADO
     ======================================================================== */
  var modItens = [];
  var modFiltro = 'todos';
  var modCarregando = false;
  var modAtual = null;
  var modAcaoAtual = null;

  /* Filtros combinados */
  var modFiltroPrazo = 'todos';
  var modBuscaTxt = '';
  var modDataIni = '';
  var modDataFim = '';
  var modStatusSel = 'todos';

  /* ========================================================================
     03. HELPERS
     ======================================================================== */
  function modToken() {
    return sessionStorage.getItem(LS_TOKEN) || localStorage.getItem(LS_TOKEN) || '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function brl(v) {
    var n = Number(v) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function modStatusInfo(id) {
    for (var i = 0; i < MOD_STATUS.length; i++) {
      if (MOD_STATUS[i].id === id) return MOD_STATUS[i];
    }
    return MOD_STATUS[0];
  }

  function modNumero(p) {
    if (!p) return '';
    return p.codigo || p.numero || p.pedido_id || ('M3D-' + String(p.id || '').slice(-4));
  }

  function modCliente(p) {
    if (!p) return '—';
    return p.cliente || p.nome_cliente || p.nome || '—';
  }

  function modWhats(p) {
    if (!p) return '';
    return p.whatsapp || p.telefone || p.contato || '';
  }

  function dataRecebido(p) {
    if (!p) return null;
    var raw = p.criadoEm || p.criado_em || p.created_at || p.dataCriacao || p.data;
    if (!raw) return null;
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function modData(p) {
    var d = dataRecebido(p);
    if (!d) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function diasAte(p) {
    var raw = p && p.prazo;
    if (!raw) return null;
    var d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - hoje) / 86400000);
  }

  function soDigitos(s) { return String(s || '').replace(/\D/g, ''); }

  function waLink(p, texto) {
    var num = soDigitos(modWhats(p));
    if (!num) return '';
    if (num.length <= 11 && num.indexOf('55') !== 0) num = '55' + num;
    return 'https://wa.me/' + num + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  function toast(msg, tipo) {
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast(msg, tipo);
      return;
    }
    var t = document.getElementById('toast');
    if (!t) { console.log('[modelagem]', msg); return; }
    t.textContent = msg;
    t.className = 'toast show' + (tipo === 'erro' ? ' erro' : '');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.className = 'toast'; }, 3200);
  }

  function ehModelagem(p) {
    if (!p) return false;
    var s = String(p.servico || p.tipo_servico || p.servico_escolhido || '').toLowerCase().trim();
    if (!s) return !!(p.faixa);
    if (s === 'modelagem' || s === 'modelagem3d' || s === 'modelagem-3d') return true;
    if (s.indexOf('modelag') !== -1) return true;
    if (p.faixa) return true;
    return false;
  }

  /* ========================================================================
     04. FILTROS COMBINADOS
     ======================================================================== */
  function filtrar() {
    var lista = modItens.slice();

    if (modStatusSel !== 'todos') {
      lista = lista.filter(function (p) { return (p.status || 'novo') === modStatusSel; });
    }

    if (modBuscaTxt) {
      var q = modBuscaTxt.toLowerCase();
      lista = lista.filter(function (p) {
        var blob = [
          p.id, p.codigo, p.pedido_id,
          p.cliente, p.nome_cliente, p.nome,
          p.whatsapp, p.telefone, p.contato,
          p.ideia, p.faixa
        ].join(' ').toLowerCase();
        return blob.indexOf(q) !== -1;
      });
    }

    if (modDataIni) {
      var ini = new Date(modDataIni + 'T00:00:00');
      lista = lista.filter(function (p) {
        var d = dataRecebido(p);
        return d && d >= ini;
      });
    }

    if (modDataFim) {
      var fim = new Date(modDataFim + 'T23:59:59');
      lista = lista.filter(function (p) {
        var d = dataRecebido(p);
        return d && d <= fim;
      });
    }

    if (modFiltroPrazo !== 'todos') {
      lista = lista.filter(function (p) {
        var dias = diasAte(p);
        if (dias === null) return false;
        if (modFiltroPrazo === 'atrasados') return dias < 0;
        if (modFiltroPrazo === 'hoje') return dias === 0;
        if (modFiltroPrazo === 'semana') return dias >= 0 && dias <= 7;
        return true;
      });
    }

    return lista;
  }

  function modAplicarFiltros() {
    var busca = document.getElementById('modBusca');
    var ini = document.getElementById('modFiltroInicio');
    var fim = document.getElementById('modFiltroFim');
    var sel = document.getElementById('modStatusFilter');

    modBuscaTxt = busca ? busca.value.trim() : '';
    modDataIni = ini ? ini.value : '';
    modDataFim = fim ? fim.value : '';
    modStatusSel = sel ? sel.value : 'todos';

    modRenderTabela();
    modRenderStats();
  }

  function modSetFiltroPrazo(valor) {
    modFiltroPrazo = valor;
    var chips = document.querySelectorAll('[data-mod-prazo]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].getAttribute('data-mod-prazo') === valor);
    }
    modAplicarFiltros();
  }

  /* ========================================================================
     05. RENDER DA TABELA
     ======================================================================== */
  function modRenderFiltros() {
    var box = document.getElementById('modFiltros');
    if (!box) return;

    var c = { todos: modItens.length };
    for (var i = 0; i < MOD_STATUS.length; i++) c[MOD_STATUS[i].id] = 0;
    modItens.forEach(function (p) {
      var st = p.status || 'novo';
      if (c[st] === undefined) c[st] = 0;
      c[st]++;
    });

    var html = '<button type="button" class="mod-filtro' +
      (modFiltro === 'todos' ? ' ativo' : '') +
      '" data-filtro="todos">Todos <b>' + c.todos + '</b></button>';

    for (var j = 0; j < MOD_STATUS.length; j++) {
      var s = MOD_STATUS[j];
      var qtd = c[s.id] || 0;
      if (qtd === 0 && s.id !== 'novo') continue;
      html += '<button type="button" class="mod-filtro' +
        (modFiltro === s.id ? ' ativo' : '') +
        '" data-filtro="' + s.id + '">' + s.label + ' <b>' + qtd + '</b></button>';
    }

    box.innerHTML = html;

    var bts = box.querySelectorAll('.mod-filtro');
    for (var k = 0; k < bts.length; k++) {
      bts[k].addEventListener('click', function () {
        modFiltro = this.getAttribute('data-filtro');
        modStatusSel = modFiltro;
        var sel = document.getElementById('modStatusFilter');
        if (sel) sel.value = modFiltro;
        modRenderTabela();
      });
    }
  }

  function modBadgePrazo(p) {
    var dias = diasAte(p);
    if (dias === null) return '<span style="color:#8a94a8;">—</span>';

    var raw = p.prazo;
    var d = new Date(raw);
    var dataTxt = isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');

    var classe, rotulo;

    if (dias < 0) {
      classe = 'prazo-atrasado';
      rotulo = 'Atrasado há ' + Math.abs(dias) + 'd';
    } else if (dias === 0) {
      classe = 'prazo-hoje';
      rotulo = 'Vence hoje';
    } else if (dias <= 2) {
      classe = 'prazo-amarelo';
      rotulo = 'Faltam ' + dias + 'd';
    } else if (dias <= 7) {
      classe = 'prazo-verde';
      rotulo = 'Faltam ' + dias + 'd';
    } else {
      classe = 'prazo-verde';
      rotulo = 'Faltam ' + dias + ' dias';
    }

    return '<span class="prazo-badge ' + classe + '">' + rotulo + '</span>' +
      (dataTxt ? '<div style="font-size:11px;color:var(--gray);margin-top:3px;">' + dataTxt + '</div>' : '');
  }

  function modRenderTabela() {
    var corpo = document.getElementById('modTbody');
    if (!corpo) return;

    var lista = filtrar();

    if (!lista.length) {
      corpo.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#8a94a8;">' +
        'Nenhuma solicitação de modelagem' +
        (modFiltro !== 'todos' || modBuscaTxt || modDataIni || modDataFim || modFiltroPrazo !== 'todos'
          ? ' com esses filtros' : ' ainda') + '.</td></tr>';
      modRenderFiltros();
      return;
    }

    lista.sort(function (a, b) {
      var da = dataRecebido(a), db = dataRecebido(b);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    var html = '';
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      var st = modStatusInfo(p.status);
      var faixa = FAIXAS[p.faixa] || { nome: p.faixa || '—', cor: '' };
      var valor = p.valorOrcamento || p.valor_orcamento || 0;
      var wa = waLink(p, '');
      var num = modNumero(p);
      var pid = String(p.id);

      html += '<tr>';
      html += '<td><strong>' + esc(num) + '</strong></td>';
      html += '<td>' + esc(modCliente(p)) + '</td>';

      html += '<td>';
      if (wa) {
        html += '<a href="' + esc(wa) + '" target="_blank" rel="noopener" class="mod-wa">💬 ' + esc(modWhats(p)) + '</a>';
      } else {
        html += esc(modWhats(p) || '—');
      }
      html += '</td>';

      html += '<td><span class="m3d-faixa-badge ' + esc(faixa.cor) + '">' + esc(faixa.nome) + '</span></td>';

      /* Recebido em */
      html += '<td>' + esc(modData(p)) + '</td>';

      /* Prazo */
      html += '<td>' + modBadgePrazo(p) + '</td>';

      /* Orçamento — APENAS UMA VEZ */
      html += '<td>' + (valor
        ? '<strong>' + esc(brl(valor)) + '</strong>'
        : '<span class="mod-sem-valor">—</span>') + '</td>';

      /* Status */
      html += '<td><span class="status-pill ' + esc(st.classe) + '">' + esc(st.label) + '</span></td>';

      /* Ações */
      html += '<td class="mod-acoes">' +
        '<button type="button" class="mod-btn ver" data-mod-ver="' + esc(pid) + '">Ver</button>' +
        '<button type="button" class="mod-btn st" data-mod-status="' + esc(pid) + '">Status</button>' +
        (p.status === 'pronto' && !p.encomenda_id
          ? '<button type="button" class="mod-btn transf" data-mod-transf="' + esc(pid) + '">📦 Encomenda</button>'
          : '') +
        '</td>';

      html += '</tr>';
    }

    corpo.innerHTML = html;
    modRenderFiltros();
    modLigarAcoes();
  }

  function modLigarAcoes() {
    var ver = document.querySelectorAll('[data-mod-ver]');
    for (var i = 0; i < ver.length; i++) {
      ver[i].addEventListener('click', function () {
        modAbrirDetalhe(this.getAttribute('data-mod-ver'));
      });
    }

    var sts = document.querySelectorAll('[data-mod-status]');
    for (var j = 0; j < sts.length; j++) {
      sts[j].addEventListener('click', function () {
        modAbrirStatus(this.getAttribute('data-mod-status'));
      });
    }

    var transfs = document.querySelectorAll('[data-mod-transf]');
    for (var k = 0; k < transfs.length; k++) {
      transfs[k].addEventListener('click', function () {
        var p = modBuscar(this.getAttribute('data-mod-transf'));
        if (p) modTransferir(p);
      });
    }
  }

  /* ========================================================================
     06. MÉTRICAS
     ======================================================================== */
  function modRenderStats() {
    var grid = document.getElementById('modStatsGrid');
    if (!grid) return;

    var lista = modItens;
    var total = lista.length;
    var novos = 0, analise = 0, emOrc = 0, aprovados = 0, producao = 0, prontos = 0;
    var faturado = 0, recebido = 0;
    var atrasados = 0, venceHoje = 0, semana = 0;

    lista.forEach(function (p) {
      var s = p.status || 'novo';
      if (s === 'novo') novos++;
      if (s === 'em-analise') analise++;
      if (s === 'orcamento') emOrc++;
      if (s === 'aprovado' || s === 'pago') aprovados++;
      if (s === 'producao') producao++;
      if (s === 'pronto') prontos++;

      faturado += Number(p.valorOrcamento || p.valor_orcamento || 0);
      recebido += Number(p.valorPago || p.valor_pago || 0);

      var d = diasAte(p);
      if (d !== null) {
        if (d < 0) atrasados++;
        else if (d === 0) venceHoje++;
        else if (d <= 7) semana++;
      }
    });

    var cards = [
      { rot: 'Total',             val: total,                    cor: '#0f1e3d', ico: '🗂️' },
      { rot: 'Novos',             val: novos,                    cor: '#f26522', ico: '🆕' },
      { rot: 'Em análise',        val: analise,                  cor: '#e8a33d', ico: '🔍' },
      { rot: 'Orçamento enviado', val: emOrc,                    cor: '#c2410c', ico: '📩' },
      { rot: 'Aprovados/Pagos',   val: aprovados,                cor: '#1d4ed8', ico: '✅' },
      { rot: 'Em produção',       val: producao,                 cor: '#5b21b6', ico: '🛠️' },
      { rot: 'Prontos',           val: prontos,                  cor: '#0369a1', ico: '🎉' },
      { rot: 'Faturado',          val: brl(faturado),            cor: '#0f7a44', ico: '💰' },
      { rot: 'Recebido',          val: brl(recebido),            cor: '#0f7a44', ico: '💵' },
      { rot: 'A receber',         val: brl(faturado - recebido), cor: '#c2410c', ico: '⏳' }
    ];

    grid.innerHTML = cards.map(function (c) {
      return '<div class="stat-card"><div class="stat-ico">' + c.ico + '</div>' +
        '<div class="stat-label">' + c.rot + '</div>' +
        '<div class="stat-value" style="color:' + c.cor + '">' + c.val + '</div></div>';
    }).join('');

    var elAtras = document.getElementById('modChipAtrasados');
    var elHoje = document.getElementById('modChipHoje');
    var elSem = document.getElementById('modChipSemana');
    if (elAtras) elAtras.textContent = atrasados;
    if (elHoje) elHoje.textContent = venceHoje;
    if (elSem) elSem.textContent = semana;
  }

  function modRenderStatusSelect() {
    var sel = document.getElementById('modStatusFilter');
    if (!sel) return;
    var atual = sel.value || 'todos';
    var html = '<option value="todos">Todos os status</option>';
    for (var i = 0; i < MOD_STATUS.length; i++) {
      html += '<option value="' + MOD_STATUS[i].id + '">' + MOD_STATUS[i].label + '</option>';
    }
    sel.innerHTML = html;
    sel.value = atual;
  }

  /* ========================================================================
     07. DETALHE
     ======================================================================== */
  function modLinha(rotulo, valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    return '<div class="m3d-transf-linha"><strong>' + esc(rotulo) + '</strong><span>' + esc(valor) + '</span></div>';
  }

  function modTagNomes(nomes) {
    if (!nomes || !nomes.length) return '';
    var s = '<span class="m3d-nomes-txt">';
    for (var i = 0; i < nomes.length; i++) {
      s += '<span class="m3d-nome-tag">' + esc(nomes[i]) + '</span>';
    }
    return s + '</span>';
  }

  function modAbrirDetalhe(id) {
    var p = modBuscar(id);
    if (!p) return;

    var overlay = document.getElementById('modDetalheOverlay');
    var corpo = document.getElementById('modDetalheCorpo');
    var titulo = document.getElementById('modDetalheTitulo');
    if (!overlay || !corpo) return;

    if (titulo) titulo.textContent = 'Modelagem ' + modNumero(p);

    var st = modStatusInfo(p.status);
    var faixa = FAIXAS[p.faixa] || { nome: p.faixa || '—', cor: '' };
    var html = '';

    html += '<div class="m3d-transf-bloco">';
    html += '<div class="m3d-transf-linha"><strong>Cliente</strong><span><b>' + esc(modCliente(p)) + '</b></span></div>';
    html += modLinha('WhatsApp', modWhats(p));
    html += '<div class="m3d-transf-linha"><strong>Faixa</strong><span><span class="m3d-faixa-badge ' +
      esc(faixa.cor) + '">' + esc(faixa.nome) + '</span></span></div>';
    html += '<div class="m3d-transf-linha"><strong>Status</strong><span><span class="status-pill ' +
      esc(st.classe) + '">' + esc(st.label) + '</span></span></div>';
    html += modLinha('Recebido em', modData(p));
    html += modLinha('Prazo', p.prazo);
    html += '</div>';

    html += '<div class="m3d-transf-bloco"><h4>Detalhes do pedido</h4>';

    if (p.faixa === 'simples') {
      html += modLinha('Tipo de peça', p.tipoPeca || p.tipo_peca);
      if (p.nomes && p.nomes.length) {
        html += '<div class="m3d-transf-linha"><strong>Nomes na peça</strong><span>' + modTagNomes(p.nomes) + '</span></div>';
      } else {
        html += modLinha('Nomes na peça', 'Não se aplica (peça sem texto)');
      }
      html += modLinha('Quantidade', p.quantidade);
      html += modLinha('Cor', p.cor);
      html += modLinha('Tamanho', p.tamanho);
    }

    if (p.faixa === 'media') {
      html += modLinha('Tipo de projeto', p.tipoProjeto || p.tipo_projeto);
      html += modLinha('Estilo', p.estilo);
      html += modLinha('Referência', p.referencia);
      html += modLinha('Cor', p.cor);
      html += modLinha('Tamanho', p.tamanho);
      html += modLinha('Quantidade', p.quantidade);
    }

    if (p.faixa === 'complexa') {
      html += modLinha('Tipo de projeto', p.tipoProjeto || p.tipo_projeto);
      html += modLinha('Elementos', p.elementos);
      html += modLinha('Encaixes', p.encaixe);
      html += modLinha('Multicolorida', p.multicolor);
      html += modLinha('Finalidade', p.finalidade);
      html += modLinha('Tamanho total', p.tamanho);
      html += modLinha('Quantidade', p.quantidade);
    }

    html += modLinha('Ideia', p.ideia);
    html += modLinha('Referências', p.referenciaEnvio || p.referencia_envio);
    html += modLinha('Observação', p.observacao);
    html += '</div>';

    if (p.valorOrcamento || p.valorPago) {
      html += '<div class="m3d-transf-bloco"><h4>Financeiro</h4>';
      if (p.valorOrcamento) html += modLinha('Valor do orçamento', brl(p.valorOrcamento));
      if (p.valorPago) html += modLinha('Valor pago', brl(p.valorPago));
      html += '</div>';
    }

    if (p.encomendaId) {
      html += '<div class="m3d-transf-bloco"><h4>Encomenda gerada</h4>' +
        modLinha('Pedido', p.encomendaNumero || p.encomendaId) + '</div>';
    }

    corpo.innerHTML = html;
    modAbrir('modDetalheOverlay');
  }

  /* ========================================================================
     08. BALCÃO DE STATUS
     ======================================================================== */
  function modMensagem(p, statusId) {
    var nome = modCliente(p).split(' ')[0] || 'cliente';
    var pedido = modNumero(p);

    switch (statusId) {
      case 'novo':
        return 'Olá, ' + nome + '! Recebemos sua solicitação de modelagem 3D ✅\n\n' +
          'Pedido: ' + pedido + '\n\n' +
          'Já está com a nossa equipe. Enquanto isso, se quiser dar uma olhada no que ' +
          'a gente já tem pronto pra entrega imediata, passa na nossa loja: ' + LOJA_URL + '\n\n' +
          'Assim que avaliarmos, voltamos aqui pelo WhatsApp.';
      case 'em-analise':
        return 'Olá, ' + nome + '! Recebemos seu pedido ' + pedido + ' ✅\n\n' +
          'Ele já está em análise pela nossa equipe. Assim que tivermos o orçamento, ' +
          'retornamos aqui pelo WhatsApp. Fica de olho!';
      case 'orcamento':
        return 'Olá, ' + nome + '! Seu orçamento está pronto 🎯\n\n' +
          'Pedido: ' + pedido + '\n' +
          'Valor: *R$ {VALOR}*\n\n' +
          'O que está incluído:\n' +
          '• Modelagem completa do projeto\n' +
          '• Rodadas de ajuste previstas na faixa contratada\n' +
          '• Entrega do arquivo em STL e/ou 3MF\n' +
          '• Prazo: {PRAZO}\n\n' +
          'A execução começa após a confirmação do pagamento. ' +
          'Se estiver de acordo, me confirma por aqui que envio os dados de pagamento.';
      case 'aprovado':
        return 'Olá, ' + nome + '! Orçamento aprovado ✅\n\n' +
          'Pedido: ' + pedido + '\n' +
          'Valor: *R$ {VALOR}*\n\n' +
          'Seguem os dados para pagamento. A modelagem entra na programação ' +
          'assim que o pagamento for confirmado.\n\n' +
          'Pix (com desconto) ou cartão em até 12x. Me diz qual você prefere que ' +
          'eu passo os dados certinhos.';
      case 'pago':
        return 'Olá, ' + nome + '! Pagamento confirmado ✅\n\n' +
          'Pedido: ' + pedido + '\n' +
          'Valor pago: *R$ {VALOR}*\n\n' +
          'Sua modelagem já entrou na programação. ' +
          'Assim que tivermos a prévia, mando aqui para sua aprovação.';
      case 'producao':
        return 'Olá, ' + nome + '! Sua modelagem está em produção 🔄\n\n' +
          'Pedido: ' + pedido + '\n\n' +
          'Estamos trabalhando no seu modelo. Quando estiver pronto, ' +
          'te aviso aqui pelo WhatsApp com a prévia para aprovação.\n\n' +
          'Enquanto a sua peça fica pronta, dá uma olhada na nossa loja de pronta entrega — ' +
          'as peças saem no mesmo dia, com retirada aqui em Nilópolis ou entrega por aplicativo: ' + LOJA_URL + '\n\n' +
          'Só o envio pelos Correios leva um pouco mais de tempo por causa da embalagem.';
      case 'pronto':
        return 'Olá, ' + nome + '! Sua modelagem está pronta 🎉\n\n' +
          'Pedido: ' + pedido + '\n\n' +
          'Segue o arquivo STL/3MF em anexo, pronto para impressão. ' +
          'Qualquer dúvida sobre o arquivo, me chama por aqui.\n\n' +
          'Se quiser a peça física impressa, me avisa que eu monto o orçamento de impressão.';
      case 'transferido':
        return 'Olá, ' + nome + '! Pedido registrado ✅\n\n' +
          'Pedido: ' + pedido + '\n\n' +
          'Seu projeto foi transferido para a nossa fila de encomendas. ' +
          'Em breve enviamos o acompanhamento por aqui.';
      case 'recusado':
        return 'Olá, ' + nome + '! Sem problemas 😊\n\n' +
          'Pedido: ' + pedido + '\n\n' +
          'Entendi que o orçamento não ficou do jeito que você esperava. ' +
          'Se quiser, posso tentar ajustar o escopo para caber melhor no seu orçamento — ' +
          'é só me dizer.\n\n' +
          'Fico à disposição!';
      default:
        return '';
    }
  }

  function modAbrirStatus(id) {
    var p = modBuscar(id);
    if (!p) return;

    modAtual = p;
    modAcaoAtual = null;

    var overlay = document.getElementById('modStatusOverlay');
    var corpo = document.getElementById('modStatusCorpo');
    var titulo = document.getElementById('modStatusTitulo');
    if (!overlay || !corpo) return;

    if (titulo) titulo.textContent = 'Status — ' + modNumero(p) + ' · ' + modCliente(p);

    var st = modStatusInfo(p.status);
    var html = '';

    html += '<div class="m3d-transf-bloco">';
    html += '<div class="m3d-transf-linha"><strong>Status atual</strong><span>' +
      '<span class="status-pill ' + esc(st.classe) + '">' + esc(st.label) + '</span></span></div>';
    html += '</div>';

    html += '<div class="m3d-transf-bloco"><h4>Alterar para</h4><div class="mod-status-grid">';
    for (var i = 0; i < MOD_STATUS.length; i++) {
      var s = MOD_STATUS[i];
      html += '<button type="button" class="mod-status-opt' +
        (s.id === p.status ? ' atual' : '') +
        '" data-mod-set="' + s.id + '">' +
        '<span class="status-pill ' + esc(s.classe) + '">' + esc(s.label) + '</span>' +
        '</button>';
    }
    html += '</div></div>';

    html += '<div id="modDinamico"></div>';

    corpo.innerHTML = html;
    modAbrir('modStatusOverlay');

    var opts = corpo.querySelectorAll('[data-mod-set]');
    for (var j = 0; j < opts.length; j++) {
      opts[j].addEventListener('click', function () {
        modSelecionarStatus(this.getAttribute('data-mod-set'));
      });
    }
  }

  function modSelecionarStatus(statusId) {
    if (!modAtual) return;
    modAcaoAtual = statusId;

    var box = document.getElementById('modDinamico');
    if (!box) return;

    var opts = document.querySelectorAll('[data-mod-set]');
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle('sel', opts[i].getAttribute('data-mod-set') === statusId);
    }

    var p = modAtual;
    var precisaValor = (statusId === 'orcamento' || statusId === 'aprovado' || statusId === 'pago');
    var valorAtual = statusId === 'pago' ? (p.valorPago || '') : (p.valorOrcamento || '');
    var msg = modMensagem(p, statusId);
    var html = '';

    if (precisaValor) {
      var label = statusId === 'pago' ? 'Valor pago pelo cliente' : 'Valor do orçamento';
      var hint = statusId === 'pago'
        ? 'Normalmente o valor integral aprovado. Ajuste se houve desconto ou entrada.'
        : 'Este valor entra automaticamente na mensagem enviada ao cliente.';
      html += '<div class="m3d-valor-box">';
      html += '<label>' + esc(label) + '</label>';
      html += '<div class="m3d-valor-wrap">';
      html += '<span class="m3d-valor-prefix">R$</span>';
      html += '<input type="number" id="modValorInput" min="0" step="0.01" value="' + esc(valorAtual) + '" placeholder="0,00">';
      html += '</div>';
      html += '<p class="m3d-valor-hint">' + esc(hint) + '</p>';
      html += '</div>';
    }

    if (msg) {
      html += '<div class="mod-msg-box">';
      html += '<div class="mod-msg-head">';
      html += '<span class="mod-msg-titulo">Mensagem para o cliente</span>';
      html += '<button type="button" class="mod-msg-copiar" id="modCopiar">📋 Copiar</button>';
      html += '</div>';
      html += '<textarea id="modMensagem" readonly rows="10">' + esc(msg) + '</textarea>';
      html += '</div>';
    }

    if (statusId === 'transferido' && !p.encomendaId) {
      html += '<div class="m3d-transf-aviso">' +
        '⚠️ Ao confirmar, será criada uma <b>encomenda</b> com status "Novo", ' +
        'já com os dados do cliente. O registro de modelagem fica marcado como transferido.</div>';
    }
    if (statusId === 'transferido' && p.encomendaId) {
      html += '<div class="m3d-transf-aviso">' +
        '✅ Este pedido já foi transferido. Encomenda gerada: <b>' +
        esc(p.encomendaNumero || p.encomendaId) + '</b></div>';
    }

    html += '<div class="mod-status-acoes">';
    html += '<button type="button" class="mod-btn-cancel" id="modCancelar">Cancelar</button>';
    html += '<button type="button" class="mod-btn-aplicar" id="modAplicar">' +
      'Confirmar "' + esc(modStatusInfo(statusId).label) + '"</button>';
    html += '</div>';

    box.innerHTML = html;

    var btnCopiar = document.getElementById('modCopiar');
    if (btnCopiar) btnCopiar.addEventListener('click', modCopiarMensagem);

    var btnCancelar = document.getElementById('modCancelar');
    if (btnCancelar) btnCancelar.addEventListener('click', function () {
      var d = document.getElementById('modDinamico');
      if (d) d.innerHTML = '';
      modAcaoAtual = null;
      var ops = document.querySelectorAll('[data-mod-set]');
      for (var k = 0; k < ops.length; k++) ops[k].classList.remove('sel');
    });

    var btnAplicar = document.getElementById('modAplicar');
    if (btnAplicar) btnAplicar.addEventListener('click', modAplicarStatus);

    var inputValor = document.getElementById('modValorInput');
    if (inputValor) {
      inputValor.addEventListener('input', function () {
        var v = Number(this.value) || 0;
        var nova = modMensagem(p, statusId).replace(/\{VALOR\}/g, brl(v).replace('R$ ', ''));
        var ta = document.getElementById('modMensagem');
        if (ta) ta.value = nova;
      });
    }
  }

  function modCopiarMensagem() {
    var ta = document.getElementById('modMensagem');
    if (!ta) return;
    var texto = ta.value;

    function fallback() {
      ta.removeAttribute('readonly');
      ta.select();
      ta.setSelectionRange(0, 99999);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.setAttribute('readonly', 'readonly');
      toast(ok ? 'Mensagem copiada ✅' : 'Selecione e copie manualmente', ok ? 'ok' : 'erro');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        toast('Mensagem copiada ✅');
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  function modAplicarStatus() {
    if (!modAtual || !modAcaoAtual) return;

    var p = modAtual;
    var sid = modAcaoAtual;

    if (sid === 'transferido') {
      modTransferir(p);
      return;
    }

    var inputValor = document.getElementById('modValorInput');
    var valor = inputValor ? Number(inputValor.value) || 0 : 0;

    if ((sid === 'orcamento' || sid === 'aprovado') && valor <= 0) {
      toast('Informe o valor do orçamento', 'erro');
      if (inputValor) inputValor.focus();
      return;
    }
    if (sid === 'pago' && valor <= 0) {
      toast('Informe o valor pago', 'erro');
      if (inputValor) inputValor.focus();
      return;
    }

    var msg = modMensagem(p, sid).replace(/\{VALOR\}/g, brl(valor).replace('R$ ', ''));

    var dados = {
      status: sid,
      servico: p.servico || 'modelagem',
      mensagem_enviada: msg
    };
    if (sid === 'orcamento' || sid === 'aprovado') {
      dados.valor_orcamento = valor;
    }
    if (sid === 'pago') {
      dados.valor_pago = valor;
    }

    modSalvar(p.id, dados, 'Status alterado para "' + modStatusInfo(sid).label + '" ✅');
  }

  function modSalvar(id, dados, mensagemOk) {
    var btn = document.getElementById('modAplicar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    fetch(API_URL + '/orcamentos/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + modToken()
      },
      body: JSON.stringify(dados)
    })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().catch(function () { return {}; });
    })
    .then(function () {
      toast(mensagemOk || 'Salvo ✅');
      modFechar('modStatusOverlay');
      modCarregar(true);
    })
    .catch(function (e) {
      toast('Erro ao salvar: ' + e.message, 'erro');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    });
  }

  /* ========================================================================
     09. TRANSFERÊNCIA
     ======================================================================== */
  function modTransferir(p) {
    if (p.encomendaId) {
      toast('Este pedido já foi transferido', 'erro');
      return;
    }

    var msg = modMensagem(p, 'transferido');

    var payload = {
      servico: 'encomenda',
      status: 'novo',
      nome_cliente: modCliente(p),
      whatsapp: modWhats(p),
      descricao_peca: 'Modelagem 3D aprovada — ' + modNumero(p) + (p.ideia ? ' · ' + p.ideia : ''),
      observacao: 'Transferido da modelagem ' + modNumero(p) +
        (p.valorOrcamento ? ' · Valor: ' + brl(p.valorOrcamento) : ''),
      mensagem_enviada: msg
    };

    var btn = document.getElementById('modAplicar');
    if (btn) { btn.disabled = true; btn.textContent = 'Transferindo…'; }

    fetch(API_URL + '/orcamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + modToken()
      },
      body: JSON.stringify(payload)
    })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (novo) {
      var novoId = novo && (novo.id || (novo.orcamento && novo.orcamento.id));
      var novoNum = novo && (novo.pedido_id || novo.codigo || novo.numero || novoId);

      return fetch(API_URL + '/orcamentos/' + encodeURIComponent(p.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + modToken()
        },
        body: JSON.stringify({
          status: 'transferido',
          servico: p.servico || 'modelagem',
          encomenda_id: novoId || null,
          encomenda_numero: novoNum || null,
          mensagem_enviada: msg
        })
      }).then(function () { return { id: novoId, numero: novoNum }; });
    })
    .then(function (info) {
      toast('Transferido para encomenda ✅' + (info.numero ? ' · ' + info.numero : ''));
      modFechar('modStatusOverlay');
      modCarregar(true);
      if (typeof window.carregarPedidos === 'function') {
        setTimeout(function () { window.carregarPedidos(); }, 800);
      }
    })
    .catch(function (e) {
      toast('Erro na transferência: ' + e.message, 'erro');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    });
  }

  /* ========================================================================
     10. API
     ======================================================================== */
  function modBuscar(id) {
    for (var i = 0; i < modItens.length; i++) {
      if (String(modItens[i].id) === String(id)) return modItens[i];
    }
    return null;
  }

  function modCarregar(silencioso) {
    if (modCarregando) return Promise.resolve();
    modCarregando = true;

    var tbody = document.getElementById('modTbody');
    if (tbody && !silencioso) {
      tbody.innerHTML = '<tr class="loading-row"><td colspan="9">' +
        '<div class="spinner"></div><br>Carregando solicitações...</td></tr>';
    }

    var tk = modToken();
    if (!tk) {
      modCarregando = false;
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#a93226;">' +
          'Sessão expirada. Faça login novamente.</td></tr>';
      }
      return Promise.resolve();
    }

    return fetch(API_URL + '/orcamentos?servico=modelagem', {
      headers: { 'Authorization': 'Bearer ' + tk }
    })
    .then(function (r) {
      if (r.status === 401) throw new Error('Sessão expirada');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var lista = Array.isArray(data) ? data : (data.orcamentos || data.pedidos || []);
      modItens = lista.filter(ehModelagem);
      modRenderStatusSelect();
      modRenderTabela();
      modRenderStats();
      modAtualizarBadge();
      modCarregando = false;
    })
    .catch(function (e) {
      modCarregando = false;
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#a93226;">' +
          'Erro ao carregar: ' + esc(e.message) + '</td></tr>';
      }
      if (!silencioso) toast('Erro ao carregar modelagens', 'erro');
    });
  }

  /* ========================================================================
     11. BADGE
     ======================================================================== */
  function modAtualizarBadge() {
    var total = modItens.length;

    /* Todos os possíveis IDs do contador de modelagem */
    ['countModelagem', 'countModelagem2', 'tab-modelagem-count'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = total;
    });

    /* Espelha os contadores reais do admin.js em TODAS as barras */
    var pares = [
      ['countOrc',     ['countOrc2']],
      ['countAssist',  ['countAssist2']],
      ['countConsult', ['countConsult2']],
      ['countLoja',    ['countLoja2']]
    ];

    pares.forEach(function (par) {
      var orig = document.getElementById(par[0]);
      if (!orig) return;
      par[1].forEach(function (id) {
        var esp = document.getElementById(id);
        if (esp) esp.textContent = orig.textContent;
      });
    });
  }

  /* ========================================================================
     12. CSV E RELATÓRIO IA
     ======================================================================== */
  function modExportarCSV() {
    var lista = filtrar();
    if (!lista.length) { alert('Nenhum item para exportar.'); return; }

    var linhas = [['ID','Cliente','WhatsApp','Faixa','Recebido','Prazo','Orçamento','Status','Ideia']];

    lista.forEach(function (p) {
      var d = dataRecebido(p);
      var raw = p.prazo;
      var dp = raw ? new Date(raw) : null;
      linhas.push([
        p.codigo || p.pedido_id || p.id,
        p.cliente || p.nome_cliente || p.nome || '',
        p.whatsapp || p.telefone || p.contato || '',
        p.faixa || '',
        d ? d.toLocaleDateString('pt-BR') : '',
        dp && !isNaN(dp.getTime()) ? dp.toLocaleDateString('pt-BR') : '',
        p.valorOrcamento || p.valor_orcamento || '',
        p.status || 'novo',
        (p.ideia || '').replace(/[\n\r;]/g, ' ')
      ]);
    });

    var csv = linhas.map(function (l) {
      return l.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\n');

    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelagem-3d-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function modAbrirRelatorioIA() {
    var lista = filtrar();
    var txt = 'RELATÓRIO — MODELAGEM 3D — ' + new Date().toLocaleString('pt-BR') + '\n\n';
    txt += 'Total de solicitações: ' + lista.length + '\n\n';

    var porStatus = {};
    lista.forEach(function (p) {
      var s = p.status || 'novo';
      porStatus[s] = (porStatus[s] || 0) + 1;
    });

    txt += 'POR STATUS:\n';
    Object.keys(porStatus).forEach(function (k) {
      txt += '  ' + k + ': ' + porStatus[k] + '\n';
    });

    txt += '\nDETALHAMENTO:\n';
    lista.forEach(function (p) {
      var d = dataRecebido(p);
      txt += '\n--- ' + (p.codigo || p.pedido_id || p.id) + ' ---\n';
      txt += 'Cliente: ' + (p.cliente || p.nome || '-') + '\n';
      txt += 'Faixa: ' + (p.faixa || '-') + '\n';
      txt += 'Status: ' + (p.status || 'novo') + '\n';
      txt += 'Recebido: ' + (d ? d.toLocaleDateString('pt-BR') : '-') + '\n';
      txt += 'Orçamento: ' + (p.valorOrcamento || 0) + '\n';
      txt += 'Ideia: ' + (p.ideia || '-') + '\n';
    });

    var w = window.open('', '_blank');
    if (w) {
      w.document.write('<pre style="font-family:monospace;padding:24px;white-space:pre-wrap;font-size:13px;">' +
        txt.replace(/</g, '&lt;') + '</pre>');
    }
  }

  /* ========================================================================
     13. MODAIS — abrir/fechar
     ======================================================================== */
  function modAbrir(id) {
    var o = document.getElementById(id);
    if (!o) return;
    o.classList.add('aberto');
    o.classList.add('show');
    o.style.display = 'flex';
    o.style.opacity = '1';
    o.style.visibility = 'visible';
    o.style.pointerEvents = 'auto';
    o.style.zIndex = '9999';
  }

  function modFechar(id) {
    var o = document.getElementById(id);
    if (!o) return;
    o.classList.remove('aberto');
    o.classList.remove('show');
    o.style.display = 'none';
    o.style.opacity = '';
    o.style.visibility = '';
    o.style.pointerEvents = '';
    o.style.zIndex = '';
  }

  window.modFecharStatus = function () { modFechar('modStatusOverlay'); };
  window.modFecharDetalhe = function () { modFechar('modDetalheOverlay'); };

  /* ========================================================================
     14. INICIALIZAÇÃO
     ======================================================================== */
  function modIniciar() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        modFechar('modStatusOverlay');
        modFechar('modDetalheOverlay');
      }
    });

    ['modStatusOverlay', 'modDetalheOverlay'].forEach(function (id) {
      var o = document.getElementById(id);
      if (o) {
        o.addEventListener('click', function (e) {
          if (e.target === o) modFechar(id);
        });
      }
    });

    var recarregar = document.getElementById('modRecarregar');
    if (recarregar) {
      recarregar.addEventListener('click', function () {
        toast('Atualizando…');
        modCarregar();
      });
    }

    /* Filtros */
    var busca = document.getElementById('modBusca');
    if (busca) busca.addEventListener('input', modAplicarFiltros);
    var iniF = document.getElementById('modFiltroInicio');
    if (iniF) iniF.addEventListener('change', modAplicarFiltros);
    var fimF = document.getElementById('modFiltroFim');
    if (fimF) fimF.addEventListener('change', modAplicarFiltros);
    var stF = document.getElementById('modStatusFilter');
    if (stF) stF.addEventListener('change', modAplicarFiltros);

    /* Aba clicada → carrega */
    var btnAba = document.getElementById('tab-modelagem');
    if (btnAba) {
      btnAba.addEventListener('click', function () {
        setTimeout(function () { modCarregar(modItens.length > 0); }, 150);
      });
    }

    modRenderStatusSelect();

    window.modModelagem = {
      carregar: modCarregar,
      badge: modAtualizarBadge,
      status: MOD_STATUS,
      abrirStatus: modAbrirStatus,
      abrirDetalhe: modAbrirDetalhe,
      aplicarFiltros: modAplicarFiltros,
      setFiltroPrazo: modSetFiltroPrazo,
      exportarCSV: modExportarCSV,
      abrirRelatorioIA: modAbrirRelatorioIA,
      get itens() { return modItens; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', modIniciar);
  } else {
    modIniciar();
  }

})();