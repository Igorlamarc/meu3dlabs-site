/* ==========================================================================
   Meu 3D Labs — Página de Modelagem 3D
   Arquivo: modelagem-3d.js
   Dependências: modelagem-3d.html + modelagem-3d.css
   ==========================================================================
   ALTERAÇÕES DESTA VERSÃO
   • Prazo desejado agora é <input type="date"> obrigatório com min = hoje
   • E-mail do cliente adicionado e obrigatório
   • Tamanho, Cor e Quantidade obrigatórios nas 3 faixas
   • Validação em português com foco automático no campo com erro
   ========================================================================== */
(function () {
  'use strict';

  /* ========================================================================
     01. CONFIGURAÇÃO
     ======================================================================== */
  var API_BASE = 'https://meu3dlabs-backend.onrender.com/api';
  var WA_NUM = '5521966594803';
  var MAX_NOMES = 20;
  var LIMITE_NOME_CHARS = 60;

  var FAIXAS = {
    simples: {
      nome: 'Simples',
      titulo: '📋 Briefing — Modelagem Simples',
      desc: 'Chaveiro, nome em relevo, lembrancinha. Valor fechado de R$ 50 e 1 rodada de ajuste incluída.'
    },
    media: {
      nome: 'Média',
      titulo: '📋 Briefing — Modelagem Média',
      desc: 'Personagem, retrato ou peça com detalhes. De R$ 50 a R$ 150 e 2 rodadas de ajuste incluídas.'
    },
    complexa: {
      nome: 'Complexa',
      titulo: '📋 Briefing — Modelagem Complexa',
      desc: 'Bonecos com encaixes, multicolor ou composições. Mínimo de 24 horas técnicas, valor a combinar.'
    }
  };

  /* ========================================================================
     02. ESTADO
     ======================================================================== */
  var faixaAtual = 'media';
  var nomesAdicionados = 0;
  var enviando = false;

  /* ========================================================================
     03. ELEMENTOS EM CACHE
     ======================================================================== */
  var el = {
    form: null,
    titulo: null,
    subtitulo: null,
    headTitulo: null,
    headDesc: null,
    listaNomes: null,
    btnAddNome: null,
    contadorNomes: null,
    btnEnviar: null,
    toast: null
  };

  /* ========================================================================
     04. UTILITÁRIOS
     ======================================================================== */
  function $(id) {
    return document.getElementById(id);
  }

  function valorDe(id) {
    var campo = $(id);
    return campo ? String(campo.value || '').trim() : '';
  }

  function rotuloSelect(id) {
    var select = $(id);
    if (!select) return '';
    var opt = select.options[select.selectedIndex];
    if (!opt || !opt.value) return '';
    return String(opt.text || '').trim();
  }

  function toast(mensagem) {
    if (!el.toast) el.toast = $('toastPg');
    if (!el.toast) return;
    el.toast.textContent = mensagem;
    el.toast.classList.add('show');
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, 3400);
  }

  /* Foco + destaque no campo com erro */
  function focarErro(id) {
    var campo = $(id);
    if (!campo) return;
    campo.focus({ preventScroll: false });
    var grupo = campo.closest('.form-group');
    if (grupo) {
      grupo.classList.add('campo-erro');
      setTimeout(function () { grupo.classList.remove('campo-erro'); }, 2400);
    }
  }

  /* Data de hoje em YYYY-MM-DD (fuso local) */
  function hojeISO() {
    var d = new Date();
    var mes = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mes + '-' + dia;
  }

  /* Formata YYYY-MM-DD → DD/MM/YYYY para a mensagem */
  function dataBR(iso) {
    if (!iso) return '';
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  /* ========================================================================
     05. TROCA DE FAIXA
     ======================================================================== */
  function selecionarFaixa(faixa) {
    if (!FAIXAS[faixa]) return;
    faixaAtual = faixa;

    var botoes = document.querySelectorAll('.fs-btn');
    for (var i = 0; i < botoes.length; i++) {
      botoes[i].classList.toggle('ativo', botoes[i].getAttribute('data-faixa') === faixa);
    }

    var blocos = document.querySelectorAll('.bloco-faixa');
    for (var j = 0; j < blocos.length; j++) {
      var ehAtual = blocos[j].getAttribute('data-bloco') === faixa;
      blocos[j].hidden = !ehAtual;
      blocos[j].style.display = ehAtual ? '' : 'none';
    }

    var cfg = FAIXAS[faixa];
    if (el.headTitulo) el.headTitulo.textContent = cfg.titulo;
    if (el.headDesc) el.headDesc.textContent = cfg.desc;
    if (el.titulo) el.titulo.textContent = 'Orçamento — Modelagem ' + cfg.nome;
    if (el.subtitulo) {
      el.subtitulo.textContent =
        'Você está solicitando orçamento para a faixa ' + cfg.nome +
        '. Preencha os campos abaixo e enviaremos o valor exato.';
    }

    if (faixa !== 'simples' && el.listaNomes) {
      el.listaNomes.innerHTML = '';
      nomesAdicionados = 0;
      atualizarContadorNomes();
    }
  }

  function irParaFormularioComFaixa(faixa) {
    selecionarFaixa(faixa);
    var alvo = $('formulario');
    if (alvo) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ========================================================================
     06. CAMPO DE NOMES — OPCIONAL, ATÉ 20
     ======================================================================== */
  function atualizarContadorNomes() {
    if (!el.contadorNomes) return;
    el.contadorNomes.textContent = nomesAdicionados + ' de ' + MAX_NOMES + ' nomes';
    el.contadorNomes.classList.toggle('limite', nomesAdicionados >= MAX_NOMES);
    if (el.btnAddNome) {
      var cheio = nomesAdicionados >= MAX_NOMES;
      el.btnAddNome.disabled = cheio;
      el.btnAddNome.textContent = cheio
        ? 'Limite de ' + MAX_NOMES + ' nomes atingido'
        : '+ Adicionar nome';
    }
  }

  function adicionarNome(valorInicial) {
    if (!el.listaNomes) return;
    if (nomesAdicionados >= MAX_NOMES) {
      toast('⚠️ Limite de ' + MAX_NOMES + ' nomes atingido.');
      return;
    }

    var linha = document.createElement('div');
    linha.className = 'nome-linha';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'nome-campo';
    input.placeholder = 'Ex.: Ana, Família Silva, Lucas 1';
    input.setAttribute('maxlength', String(LIMITE_NOME_CHARS));
    input.setAttribute('aria-label', 'Nome que deve aparecer na peça número ' + (nomesAdicionados + 1));
    if (valorInicial) input.value = valorInicial;

    var btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'btn-remover-nome';
    btnRemover.setAttribute('aria-label', 'Remover este nome');
    btnRemover.textContent = '✕';
    btnRemover.addEventListener('click', function () {
      linha.remove();
      nomesAdicionados = Math.max(0, nomesAdicionados - 1);
      atualizarContadorNomes();
    });

    linha.appendChild(input);
    linha.appendChild(btnRemover);
    el.listaNomes.appendChild(linha);
    nomesAdicionados++;
    atualizarContadorNomes();
    if (!valorInicial) input.focus();
  }

  function coletarNomes() {
    if (!el.listaNomes) return [];
    var nomes = [];
    var campos = el.listaNomes.querySelectorAll('.nome-campo');
    for (var i = 0; i < campos.length; i++) {
      var v = String(campos[i].value || '').trim();
      if (v) nomes.push(v);
    }
    return nomes;
  }

  /* ========================================================================
     07. ACORDEÃO DO FAQ
     ======================================================================== */
  function iniciarAcordeaoFaq() {
    var itens = document.querySelectorAll('.faq-wrap .faq-item');
    if (!itens.length) return;
    for (var k = 0; k < itens.length; k++) {
      itens[k].addEventListener('toggle', function () {
        if (!this.open) return;
        for (var m = 0; m < itens.length; m++) {
          if (itens[m] !== this && itens[m].open) {
            itens[m].open = false;
          }
        }
      });
    }
  }

  /* ========================================================================
     08. MONTAGEM DA MENSAGEM DO WHATSAPP
     ======================================================================== */
  function montarMensagem() {
    var nome = valorDe('fNome');
    var whats = valorDe('fWhats');
    var email = valorDe('fEmail');
    var ideia = valorDe('fIdeia');
    var ref = valorDe('fRef');
    var prazo = dataBR(valorDe('fPrazo'));
    var obs = valorDe('fObs');

    var msg = '📐 *SOLICITAÇÃO DE ORÇAMENTO — MODELAGEM 3D*\n\n';
    msg += '*Faixa:* ' + FAIXAS[faixaAtual].nome + '\n';
    msg += '*Nome:* ' + nome + '\n';
    msg += '*WhatsApp:* ' + whats + '\n';
    if (email) msg += '*E-mail:* ' + email + '\n';

    if (faixaAtual === 'simples') {
      var tipoS = rotuloSelect('sTipo');
      var qtdS = valorDe('sQtd');
      var corS = valorDe('sCor');
      var tamS = valorDe('sTamanho');
      var nomes = coletarNomes();
      if (tipoS) msg += '*Tipo de peça:* ' + tipoS + '\n';
      if (nomes.length > 0) {
        msg += '\n*📝 Nomes que devem aparecer na peça (' + nomes.length + '):*\n';
        for (var i = 0; i < nomes.length; i++) {
          msg += (i + 1) + '. ' + nomes[i] + '\n';
        }
      } else {
        msg += '\n*📝 Nomes na peça:* não se aplica (peça sem texto)\n';
      }
      if (qtdS) msg += '\n*Quantidade de peças:* ' + qtdS + '\n';
      if (corS) msg += '*Cor desejada:* ' + corS + '\n';
      if (tamS) msg += '*Tamanho aproximado:* ' + tamS + '\n';
    }

    if (faixaAtual === 'media') {
      var tipoM = rotuloSelect('mTipo');
      var estiloM = rotuloSelect('mEstilo');
      var refM = valorDe('mRef');
      var corM = valorDe('mCor');
      var tamM = valorDe('mTamanho');
      var qtdM = valorDe('mQtd');
      if (tipoM) msg += '*Tipo de projeto:* ' + tipoM + '\n';
      if (estiloM) msg += '*Estilo desejado:* ' + estiloM + '\n';
      if (refM) msg += '*Referência:* ' + refM + '\n';
      if (corM) msg += '*Cor desejada:* ' + corM + '\n';
      if (tamM) msg += '*Tamanho aproximado:* ' + tamM + '\n';
      if (qtdM) msg += '*Quantidade:* ' + qtdM + '\n';
    }

    if (faixaAtual === 'complexa') {
      var tipoC = rotuloSelect('cTipo');
      var elementosC = valorDe('cElementos');
      var encaixeC = rotuloSelect('cEncaixe');
      var multiC = rotuloSelect('cMulticolor');
      var usoC = rotuloSelect('cUso');
      var tamC = valorDe('cTamanho');
      var qtdC = valorDe('cQtd');
      if (tipoC) msg += '*Tipo de projeto:* ' + tipoC + '\n';
      if (elementosC) msg += '*Elementos do projeto:* ' + elementosC + '\n';
      if (encaixeC) msg += '*Encaixes / partes móveis:* ' + encaixeC + '\n';
      if (multiC) msg += '*Multicolorida:* ' + multiC + '\n';
      if (usoC) msg += '*Finalidade:* ' + usoC + '\n';
      if (tamC) msg += '*Tamanho total aproximado:* ' + tamC + '\n';
      if (qtdC) msg += '*Quantidade:* ' + qtdC + '\n';
    }

    if (ideia) msg += '\n*💡 Ideia do projeto:*\n' + ideia + '\n';
    if (ref) msg += '\n*📎 Referências:*\n' + ref + '\n';
    if (prazo) msg += '\n*📅 Prazo desejado:*\n' + prazo + '\n';
    if (obs) msg += '\n*📝 Observações:*\n' + obs + '\n';

    msg += '\n---\n';
    msg += '_Confirmo que entendi que a modelagem 3D é um serviço pago, com valores a partir de R$ 50 e referência técnica de R$ 50/h, e que a execução depende da aprovação do orçamento e confirmação do pagamento antecipado._';
    return msg;
  }

  /* ========================================================================
     09. MONTAGEM DO PAYLOAD DA API
     ======================================================================== */
  function montarPayload() {
    var payload = {
      servico: 'modelagem',
      status: 'novo',
      faixa: faixaAtual,
      cliente: valorDe('fNome'),
      nome: valorDe('fNome'),
      nome_cliente: valorDe('fNome'),
      whatsapp: valorDe('fWhats'),
      telefone: valorDe('fWhats'),
      contato: valorDe('fWhats'),
      email: valorDe('fEmail'),
      ideia: valorDe('fIdeia'),
      descricao: valorDe('fIdeia'),
      descricao_peca: valorDe('fIdeia'),
      referenciaEnvio: valorDe('fRef'),
      prazo: valorDe('fPrazo'),
      prazo_desejado: valorDe('fPrazo'),
      observacao: valorDe('fObs'),
      origem: 'site-modelagem',
      mensagemEnviada: montarMensagem(),
      mensagem_enviada: montarMensagem()
    };

    if (faixaAtual === 'simples') {
      payload.tipoPeca = rotuloSelect('sTipo');
      payload.tipo_peca = payload.tipoPeca;
      payload.nomes = coletarNomes();
      var qtdS = valorDe('sQtd');
      if (qtdS) { payload.quantidade = Number(qtdS) || qtdS; }
      payload.cor = valorDe('sCor');
      payload.tamanho = valorDe('sTamanho');
    }

    if (faixaAtual === 'media') {
      payload.tipoProjeto = rotuloSelect('mTipo');
      payload.tipo_projeto = payload.tipoProjeto;
      payload.estilo = rotuloSelect('mEstilo');
      payload.referencia = valorDe('mRef');
      payload.cor = valorDe('mCor');
      payload.tamanho = valorDe('mTamanho');
      var qtdM = valorDe('mQtd');
      if (qtdM) { payload.quantidade = Number(qtdM) || qtdM; }
    }

    if (faixaAtual === 'complexa') {
      payload.tipoProjeto = rotuloSelect('cTipo');
      payload.tipo_projeto = payload.tipoProjeto;
      payload.elementos = valorDe('cElementos');
      payload.encaixe = rotuloSelect('cEncaixe');
      payload.multicolor = rotuloSelect('cMulticolor');
      payload.finalidade = rotuloSelect('cUso');
      payload.tamanho = valorDe('cTamanho');
      var qtdC = valorDe('cQtd');
      if (qtdC) { payload.quantidade = Number(qtdC) || qtdC; }
    }

    return payload;
  }

  /* ========================================================================
     10. VALIDAÇÃO
     ======================================================================== */

  /* Valida os campos da faixa ativa. Retorna null se OK ou {id, msg} */
  function validarFaixa() {
    if (faixaAtual === 'simples') {
      if (!valorDe('sTipo'))  return { id: 'sTipo',     msg: '⚠️ Selecione o tipo de peça.' };
      if (!valorDe('sQtd'))   return { id: 'sQtd',      msg: '⚠️ Informe a quantidade de peças.' };
      if (!valorDe('sCor'))   return { id: 'sCor',      msg: '⚠️ Informe a cor desejada.' };
      if (!valorDe('sTamanho')) return { id: 'sTamanho', msg: '⚠️ Informe o tamanho aproximado da peça.' };
      return null;
    }

    if (faixaAtual === 'media') {
      if (!valorDe('mTipo'))    return { id: 'mTipo',    msg: '⚠️ Selecione o tipo de projeto.' };
      if (!valorDe('mRef'))     return { id: 'mRef',     msg: '⚠️ Informe a referência do personagem ou projeto.' };
      if (!valorDe('mCor'))     return { id: 'mCor',     msg: '⚠️ Informe a cor desejada.' };
      if (!valorDe('mTamanho')) return { id: 'mTamanho', msg: '⚠️ Informe o tamanho aproximado da peça.' };
      if (!valorDe('mQtd'))     return { id: 'mQtd',     msg: '⚠️ Informe a quantidade.' };
      return null;
    }

    if (faixaAtual === 'complexa') {
      if (!valorDe('cTipo'))     return { id: 'cTipo',     msg: '⚠️ Selecione o tipo de projeto.' };
      if (!valorDe('cEncaixe'))  return { id: 'cEncaixe',  msg: '⚠️ Informe se o projeto precisa de encaixes.' };
      if (!valorDe('cUso'))      return { id: 'cUso',      msg: '⚠️ Informe como você vai usar a peça.' };
      if (!valorDe('cTamanho'))  return { id: 'cTamanho',  msg: '⚠️ Informe o tamanho total aproximado.' };
      if (!valorDe('cQtd'))      return { id: 'cQtd',      msg: '⚠️ Informe a quantidade.' };
      return null;
    }

    return null;
  }

  function validarEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v);
  }

  function validar() {
    /* Dados pessoais */
    if (!valorDe('fNome')) {
      toast('⚠️ Informe seu nome para contato.');
      focarErro('fNome');
      return false;
    }
    if (!valorDe('fWhats')) {
      toast('⚠️ Informe seu WhatsApp.');
      focarErro('fWhats');
      return false;
    }
    var email = valorDe('fEmail');
    if (!email) {
      toast('⚠️ Informe seu e-mail.');
      focarErro('fEmail');
      return false;
    }
    if (!validarEmail(email)) {
      toast('⚠️ Esse e-mail não parece válido. Confira e tente de novo.');
      focarErro('fEmail');
      return false;
    }

    /* Campos da faixa ativa (cor, tamanho, quantidade, etc.) */
    var erroFaixa = validarFaixa();
    if (erroFaixa) {
      toast(erroFaixa.msg);
      focarErro(erroFaixa.id);
      return false;
    }

    /* Ideia */
    if (!valorDe('fIdeia')) {
      toast('⚠️ Descreva sua ideia para que possamos avaliar.');
      focarErro('fIdeia');
      return false;
    }

    /* Prazo — obrigatório e não pode ser passado */
    var prazo = valorDe('fPrazo');
    if (!prazo) {
      toast('⚠️ Selecione o prazo desejado no calendário.');
      focarErro('fPrazo');
      return false;
    }
    if (prazo < hojeISO()) {
      toast('⚠️ O prazo não pode ser anterior a hoje.');
      focarErro('fPrazo');
      return false;
    }

    /* Ciência do serviço pago */
    var ciencia = $('fCiencia');
    if (!ciencia || !ciencia.checked) {
      toast('⚠️ Marque que entendeu que a modelagem é um serviço pago.');
      if (ciencia) ciencia.focus();
      return false;
    }

    return true;
  }

  /* ========================================================================
     11. ENVIO — API + WhatsApp
     ======================================================================== */
  function enviarParaApi(payload) {
    return fetch(API_BASE + '/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().catch(function () { return {}; });
    });
  }

  function abrirWhatsApp(url) {
    var janela = window.open(url, '_blank');
    if (!janela || janela.closed || typeof janela.closed === 'undefined') {
      window.location.href = url;
    }
  }

  function enviar(ev) {
    if (ev) ev.preventDefault();
    if (enviando) return;
    if (!validar()) return;

    enviando = true;

    var payload = montarPayload();
    var url = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(payload.mensagemEnviada);

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        event_category: 'modelagem_3d',
        event_label: faixaAtual
      });
    }

    if (el.btnEnviar) {
      el.btnEnviar.disabled = true;
      el.btnEnviar.textContent = '📩 Enviando…';
    }
    toast('📩 Enviando seu briefing…');

    var jaAbriu = false;
    function abrirUmaVez() {
      if (jaAbriu) return;
      jaAbriu = true;
      abrirWhatsApp(url);
    }
    var timeoutWa = setTimeout(abrirUmaVez, 2500);

    enviarParaApi(payload)
      .then(function (res) {
        clearTimeout(timeoutWa);
        var numero = res && (res.pedido_id || res.codigo || res.numero || res.id);
        toast('✅ Solicitação registrada' + (numero ? ' · ' + numero : '') + '. Abrindo WhatsApp…');
        abrirUmaVez();
      })
      .catch(function (erro) {
        clearTimeout(timeoutWa);
        toast('📩 Abrindo WhatsApp com seu briefing…');
        abrirUmaVez();
        if (window.console && console.warn) {
          console.warn('[modelagem-3d] Falha ao registrar no admin:', erro.message);
        }
      })
      .then(function () {
        setTimeout(function () {
          enviando = false;
          if (el.btnEnviar) {
            el.btnEnviar.disabled = false;
            el.btnEnviar.textContent = '📩 Enviar briefing e solicitar orçamento';
          }
        }, 4000);
      });
  }

  /* ========================================================================
     12. SCROLL SUAVE
     ======================================================================== */
  function iniciarScrollSuave() {
    var links = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (!href || href.length < 2) return;
        var alvo = document.querySelector(href);
        if (!alvo) return;
        e.preventDefault();
        alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* ========================================================================
     13. PRAZO — calendário com mínimo de hoje
     ======================================================================== */
  function configurarPrazo() {
    var campo = $('fPrazo');
    if (!campo) return;

    var hoje = hojeISO();
    campo.setAttribute('min', hoje);
    campo.setAttribute('type', 'date');
    campo.setAttribute('required', 'required');

    /* Se o usuário digitar/colar uma data passada, limpa */
    campo.addEventListener('change', function () {
      if (campo.value && campo.value < hoje) {
        toast('⚠️ O prazo não pode ser anterior a hoje.');
        campo.value = '';
        focarErro('fPrazo');
      }
    });
  }

  /* ========================================================================
     14. INICIALIZAÇÃO
     ======================================================================== */
  function iniciar() {
    el.form = $('formBriefing');
    el.titulo = $('formTitulo');
    el.subtitulo = $('formSubtitulo');
    el.headTitulo = $('formHeadTitulo');
    el.headDesc = $('formHeadDesc');
    el.listaNomes = $('listaNomes');
    el.btnAddNome = $('btnAddNome');
    el.contadorNomes = $('contadorNomes');
    el.btnEnviar = $('btnEnviar');
    el.toast = $('toastPg');

    configurarPrazo();

    var ctasVitrine = document.querySelectorAll('.faixa-cta');
    for (var i = 0; i < ctasVitrine.length; i++) {
      ctasVitrine[i].addEventListener('click', function () {
        var faixa = this.getAttribute('data-faixa');
        if (faixa) irParaFormularioComFaixa(faixa);
      });
    }

    var botoesFaixa = document.querySelectorAll('.fs-btn');
    for (var j = 0; j < botoesFaixa.length; j++) {
      botoesFaixa[j].addEventListener('click', function () {
        var faixa = this.getAttribute('data-faixa');
        if (faixa) selecionarFaixa(faixa);
      });
    }

    if (el.btnAddNome) {
      el.btnAddNome.addEventListener('click', function () {
        adicionarNome();
      });
    }

    if (el.listaNomes) {
      el.listaNomes.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var alvo = e.target;
          if (alvo && alvo.classList && alvo.classList.contains('nome-campo')) {
            e.preventDefault();
            if (nomesAdicionados < MAX_NOMES) adicionarNome();
          }
        }
      });
    }

    iniciarAcordeaoFaq();

    if (el.form) {
      el.form.addEventListener('submit', enviar);
    }

    iniciarScrollSuave();
    selecionarFaixa('media');
    atualizarContadorNomes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();