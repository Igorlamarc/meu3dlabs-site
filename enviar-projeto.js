/* ============================================================
   MEU 3D LABS — enviar-projeto.js v2.2
   Formulário condicional com 3 serviços, prazo via date,
   urgência com taxas (0 / +10 / +20), arquivo 3D obrigatório
   com modal de modelagem e atalho que mantém o cliente na página.
   Assistência técnica é 100% remota (sem opção presencial).
   ============================================================ */

(function(){
  'use strict';

  /* ==================== CONFIG ==================== */
  var API_ORCAMENTOS = 'https://meu3dlabs-backend.onrender.com/api/orcamentos';
  var WA_NUM = '5521966594803';
  var TAXA_URGENCIA = { 'sem-urgencia': 0, 'moderada': 10, 'muito-urgente': 20 };
  var MAPA_URGENCIA = {
    'sem-urgencia': 'Sem urgência (sem taxa)',
    'moderada': 'Urgência moderada (+ R$ 10)',
    'muito-urgente': 'Muito urgente (+ R$ 20)'
  };
  var servicoAtual = 'impressao';

  /* ==================== HELPERS ==================== */
  function $(id){ return document.getElementById(id); }

  function toast(msg){
    var t = $('toastPagina');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function(){ t.classList.remove('show'); }, 2800);
  }

  function mostrarErro(campoId, msgId){
    var campo = $(campoId);
    var msg = $(msgId);
    if(campo) campo.classList.add('campo-erro');
    if(msg) msg.style.display = 'block';
  }

  function limparErro(campoId, msgId){
    var campo = $(campoId);
    var msg = $(msgId);
    if(campo) campo.classList.remove('campo-erro');
    if(msg) msg.style.display = 'none';
  }

  function dataBR(iso){
    if(!iso) return '';
    var p = String(iso).split('-');
    if(p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function hojeISO(){
    var d = new Date();
    return d.getFullYear()
      + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ==================== MÁSCARA WHATSAPP ==================== */
  function formatarWhatsApp(input){
    var v = input.value.replace(/\D/g, '');
    if(v.length > 11) v = v.slice(0, 11);
    if(v.length <= 2){
      input.value = v.length ? '(' + v : '';
    } else if(v.length <= 6){
      input.value = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    } else if(v.length <= 10){
      input.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
    } else {
      input.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    }
  }

  /* ==================== SERVIÇO ==================== */
  function selecionarServico(card){
    if(!card) return;
    document.querySelectorAll('.servico-card').forEach(function(c){
      c.classList.remove('selected');
    });
    card.classList.add('selected');
    servicoAtual = card.getAttribute('data-servico') || 'impressao';

    var imp = $('campos-impressao');
    var con = $('campos-consultoria');
    var ass = $('campos-assistencia');

    if(imp) imp.style.display = 'none';
    if(con) con.style.display = 'none';
    if(ass) ass.style.display = 'none';

    if(servicoAtual === 'impressao' && imp) imp.style.display = '';
    else if(servicoAtual === 'consultoria' && con) con.style.display = '';
    else if(servicoAtual === 'assistencia' && ass) ass.style.display = '';

    document.querySelectorAll('.campo-erro').forEach(function(el){
      el.classList.remove('campo-erro');
    });
    document.querySelectorAll('.erro-msg').forEach(function(el){
      el.style.display = 'none';
    });

    atualizarProgresso();
  }

  /* ==================== RADIO PILLS ==================== */
  function marcarPill(input){
    if(!input) return;
    var name = input.name;
    document.querySelectorAll('input[name="' + name + '"]').forEach(function(r){
      var label = r.closest('.radio-pill');
      if(label) label.classList.toggle('selected', r.checked);
    });
    atualizarProgresso();
  }

  /* ==================== ARQUIVO 3D ==================== */
  function marcarArquivo(input){
    if(!input) return;
    document.querySelectorAll('.arquivo-card').forEach(function(c){
      c.classList.remove('selected');
    });
    var card = input.closest('.arquivo-card');
    if(card) card.classList.add('selected');

    var errArq = $('err-arquivo');
    if(errArq) errArq.style.display = 'none';

    if(input.value === 'nao'){
      abrirModalModelagem();
    } else {
      fecharModalModelagem();
    }
    atualizarProgresso();
  }

  function abrirModalModelagem(){
    var m = $('modalModelagem');
    if(!m) return;
    m.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function fecharModalModelagem(){
    var m = $('modalModelagem');
    if(!m) return;
    m.classList.remove('show');
    document.body.style.overflow = '';
  }

  function temArquivoPronto(){
    var sel = document.querySelector('input[name="temArquivo"]:checked');
    return sel ? sel.value === 'sim' : false;
  }

  /* ==================== ATALHO: SOLICITAR MODELAGEM ==================== */
  /* Mantém o cliente na página. Fecha o modal, confirma a escolha
     "Não, preciso de modelagem" e leva o foco para a descrição,
     onde ele detalha o projeto e a modelagem é orçada junto. */
  function solicitarModelagemAqui(){
    fecharModalModelagem();

    var radioNao = document.querySelector('input[name="temArquivo"][value="nao"]');
    if(radioNao){
      radioNao.checked = true;
      document.querySelectorAll('.arquivo-card').forEach(function(c){
        c.classList.remove('selected');
      });
      var cardNao = radioNao.closest('.arquivo-card');
      if(cardNao) cardNao.classList.add('selected');
    }

    var alvo = $('campoDescricao');
    if(alvo){
      setTimeout(function(){
        alvo.scrollIntoView({ behavior:'smooth', block:'center' });
        var txt = $('descricao');
        if(txt) txt.focus();
      }, 260);
    }

    toast('📐 Continue aqui: descreva a peça e orçamos a modelagem junto.');
    atualizarProgresso();
  }

  /* ==================== URGÊNCIA ==================== */
  function marcarUrgencia(input){
    if(!input) return;
    document.querySelectorAll('.urgencia-card').forEach(function(c){
      c.classList.remove('selected');
    });
    var card = input.closest('.urgencia-card');
    if(card) card.classList.add('selected');

    var errU = $('err-urgencia');
    if(errU) errU.style.display = 'none';

    atualizarProgresso();
  }

  /* ==================== SELECT "OUTRO" ==================== */
  function atualizarOutro(sel){
    var box = $('cons-outro-box');
    if(box) box.style.display = (sel && sel.value === 'outro') ? 'block' : 'none';
  }

  function atualizarOutroAss(sel){
    var box = $('ass-outro-box');
    if(box) box.style.display = (sel && sel.value === 'outro') ? 'block' : 'none';
  }

  /* ==================== LINKS DINÂMICOS ==================== */
  var linkCount = 1;

  function adicionarLink(){
    var container = $('links-container');
    if(!container) return;
    if(linkCount >= 5){
      toast('Máximo de 5 links.');
      return;
    }
    linkCount++;
    var div = document.createElement('div');
    div.className = 'link-item';
    div.innerHTML = '<input type="url" name="link-' + linkCount + '" placeholder="https://makerworld.com/…" oninput="atualizarProgresso()">'
      + '<button type="button" onclick="removerLink(this)" aria-label="Remover link">✕</button>';
    container.appendChild(div);
    atualizarProgresso();
  }

  function removerLink(btn){
    var item = btn.closest('.link-item');
    if(item) item.remove();
    atualizarProgresso();
  }

  /* ==================== PROGRESSO ==================== */
  function atualizarProgresso(){
    var campos = [];

    var nome = $('nome');
    var whats = $('whatsapp');
    if(nome) campos.push(nome.value.trim().length >= 2);
    if(whats) campos.push(whats.value.replace(/\D/g, '').length >= 10);

    if(servicoAtual === 'impressao'){
      var qtd = $('quantidade');
      var desc = $('descricao');
      var prazoEl = $('prazo');
      var arqSel = document.querySelector('input[name="temArquivo"]:checked');
      var urgSel = document.querySelector('input[name="urgencia"]:checked');
      if(qtd) campos.push(parseInt(qtd.value, 10) > 0);
      if(desc) campos.push(desc.value.trim().length >= 10);
      if(prazoEl) campos.push(prazoEl.value !== '');
      if(arqSel) campos.push(true);
      if(urgSel) campos.push(true);
    } else if(servicoAtual === 'consultoria'){
      var horas = $('horas');
      var tema = $('cons-tema');
      if(horas) campos.push(horas.value !== '');
      if(tema) campos.push(tema.value.trim().length >= 10);
    } else if(servicoAtual === 'assistencia'){
      var modelo = $('ass-modelo-modelo');
      var prob = $('ass-problema');
      if(modelo) campos.push(modelo.value !== '');
      if(prob) campos.push(prob.value.trim().length >= 10);
    }

    var preenchidos = campos.filter(Boolean).length;
    var pct = campos.length ? Math.round((preenchidos / campos.length) * 100) : 0;
    var barra = $('progressoBarra');
    if(barra) barra.style.width = pct + '%';
  }

  /* ==================== VALIDAÇÃO ==================== */
  function validarCampos(){
    var ok = true;

    var nome = $('nome');
    if(!nome || !nome.value.trim() || nome.value.trim().length < 2){
      mostrarErro('campoNome', 'err-nome');
      ok = false;
    } else limparErro('campoNome', 'err-nome');

    var whats = $('whatsapp');
    var whatsNums = whats ? whats.value.replace(/\D/g, '') : '';
    if(whatsNums.length < 10 || whatsNums.length > 11){
      mostrarErro('campoWhatsapp', 'err-whatsapp');
      ok = false;
    } else limparErro('campoWhatsapp', 'err-whatsapp');

    var emailEl = $('email');
    if(emailEl && emailEl.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())){
      mostrarErro('campoEmail', 'err-email');
      ok = false;
    } else limparErro('campoEmail', 'err-email');

    if(servicoAtual === 'impressao'){
      var qtd = $('quantidade');
      if(!qtd || !qtd.value || parseInt(qtd.value, 10) < 1){
        mostrarErro('campoQuantidade', 'err-quantidade');
        ok = false;
      } else limparErro('campoQuantidade', 'err-quantidade');

      var desc = $('descricao');
      if(!desc || !desc.value.trim() || desc.value.trim().length < 10){
        mostrarErro('campoDescricao', 'err-descricao');
        ok = false;
      } else limparErro('campoDescricao', 'err-descricao');

      var prazo = $('prazo');
      if(!prazo || !prazo.value){
        mostrarErro('campoPrazo', 'err-prazo');
        ok = false;
      } else if(prazo.value < hojeISO()){
        mostrarErro('campoPrazo', 'err-prazo');
        var errP = $('err-prazo');
        if(errP) errP.textContent = 'A data não pode ser anterior a hoje.';
        ok = false;
      } else limparErro('campoPrazo', 'err-prazo');

      var arqSel = document.querySelector('input[name="temArquivo"]:checked');
      if(!arqSel){
        var errArq = $('err-arquivo');
        if(errArq) errArq.style.display = 'block';
        ok = false;
      } else {
        var errArq2 = $('err-arquivo');
        if(errArq2) errArq2.style.display = 'none';
      }

      var urgSel = document.querySelector('input[name="urgencia"]:checked');
      if(!urgSel){
        var errU = $('err-urgencia');
        if(errU) errU.style.display = 'block';
        ok = false;
      } else {
        var errU2 = $('err-urgencia');
        if(errU2) errU2.style.display = 'none';
      }
    }

    if(servicoAtual === 'consultoria'){
      var horas = $('horas');
      if(!horas || !horas.value){
        mostrarErro('campoHoras', 'err-horas');
        ok = false;
      } else limparErro('campoHoras', 'err-horas');

      var tema = $('cons-tema');
      if(!tema || !tema.value.trim() || tema.value.trim().length < 10){
        mostrarErro('campoConsTema', 'err-cons-tema');
        ok = false;
      } else limparErro('campoConsTema', 'err-cons-tema');
    }

    if(servicoAtual === 'assistencia'){
      var modelo = $('ass-modelo-modelo');
      if(!modelo || !modelo.value){
        mostrarErro('campoModelo', 'err-ass-modelo');
        ok = false;
      } else limparErro('campoModelo', 'err-ass-modelo');

      var prob = $('ass-problema');
      if(!prob || !prob.value.trim() || prob.value.trim().length < 10){
        mostrarErro('campoProblema', 'err-ass-problema');
        ok = false;
      } else limparErro('campoProblema', 'err-ass-problema');
    }

    if(!ok){
      var primeiroErro = document.querySelector('.campo-erro');
      if(primeiroErro) primeiroErro.scrollIntoView({ behavior:'smooth', block:'center' });
    }

    return ok;
  }

  /* ==================== MONTAR DESCRIÇÃO ==================== */
  function montarDescricao(){
    var linhas = [];

    if(servicoAtual === 'impressao'){
      linhas.push('Quantidade: ' + $('quantidade').value);
      linhas.push('Descrição: ' + $('descricao').value.trim());

      var prazoEl = $('prazo');
      if(prazoEl && prazoEl.value){
        linhas.push('Prazo desejado: ' + dataBR(prazoEl.value));
      }

      var urgEl = document.querySelector('input[name="urgencia"]:checked');
      if(urgEl){
        linhas.push('Nível de urgência: ' + (MAPA_URGENCIA[urgEl.value] || urgEl.value));
      }

      if(temArquivoPronto()){
        linhas.push('Já possui arquivo 3D: sim');
      } else {
        linhas.push('Já possui arquivo 3D: não — precisa de modelagem (serviço pago, orçado separadamente)');
      }

      var links = [];
      document.querySelectorAll('#links-container input').forEach(function(inp){
        if(inp.value.trim()) links.push(inp.value.trim());
      });
      if(links.length) linhas.push('Links: ' + links.join(' | '));
    }

    if(servicoAtual === 'consultoria'){
      var horasVal = $('horas').value;
      if(horasVal === 'outro'){
        var extra = $('cons-outro-texto');
        horasVal = (extra && extra.value.trim()) ? extra.value.trim() : 'período a combinar';
      } else {
        horasVal = horasVal + ' hora(s)';
      }
      linhas.push('Período: ' + horasVal);
      linhas.push('Tema: ' + $('cons-tema').value.trim());

      var nivel = document.querySelector('input[name="nivel"]:checked');
      if(nivel){
        var mapNivel = { 'iniciante':'Iniciante', 'intermediario':'Intermediário', 'avancado':'Avançado' };
        linhas.push('Nível: ' + (mapNivel[nivel.value] || nivel.value));
      }
    }

    if(servicoAtual === 'assistencia'){
      var modVal = $('ass-modelo-modelo').value;
      if(modVal === 'outro'){
        var outroAss = $('ass-outro-texto');
        modVal = (outroAss && outroAss.value.trim()) ? outroAss.value.trim() : 'modelo a confirmar';
      }
      linhas.push('Impressora: ' + modVal);
      linhas.push('Problema: ' + $('ass-problema').value.trim());
      /* Assistência é 100% remota — formato fixo, sem campo no formulário */
      linhas.push('Formato: Remoto (videochamada)');

      var prio = document.querySelector('input[name="prioridade"]:checked');
      if(prio) linhas.push('Prioridade: ' + (prio.value === 'urgente' ? 'Urgente' : 'Normal'));
    }

    return linhas.join('\n');
  }

  /* ==================== TEXTO WHATSAPP ==================== */
  function montarTextoWhatsApp(pedidoId){
    var nome = $('nome').value.trim();
    var whats = $('whatsapp').value.trim();
    var email = $('email').value.trim();

    var servicoNome = {
      'impressao':'Impressão 3D',
      'consultoria':'Consultoria 3D',
      'assistencia':'Assistência Creality'
    }[servicoAtual] || servicoAtual;

    var txt = '🆕 *Novo projeto — ' + servicoNome + '*\n';
    txt += '\n*Pedido:* ' + pedidoId;
    txt += '\n*Nome:* ' + nome;
    txt += '\n*WhatsApp:* ' + whats;
    if(email) txt += '\n*E-mail:* ' + email;
    txt += '\n\n' + montarDescricao();
    txt += '\n\n_Enviado pelo site meu3dlabs.com.br_';

    return txt;
  }

  /* ==================== GERAR ID ==================== */
  function gerarPedidoId(){
    var d = new Date();
    var dia = String(d.getDate()).padStart(2, '0');
    var mes = String(d.getMonth() + 1).padStart(2, '0');
    var aleat = Math.floor(Math.random() * 9000) + 1000;
    return 'M3D-' + aleat + '-' + dia + mes;
  }

  /* ==================== ENVIAR ==================== */
  function enviarProjeto(ev){
    if(ev) ev.preventDefault();
    if(!validarCampos()) return;

    var btn = $('btnEnviar');
    var btnTxt = btn ? btn.querySelector('.btn-txt') : null;
    if(btn){
      btn.disabled = true;
      btn.classList.add('loading');
    }
    if(btnTxt) btnTxt.textContent = 'Enviando…';

    var payload = {
      nome: $('nome').value.trim(),
      whatsapp: $('whatsapp').value.trim(),
      email: $('email').value.trim() || null,
      servico: servicoAtual,
      descricao: montarDescricao()
    };

    if(servicoAtual === 'impressao'){
      var urgVal = document.querySelector('input[name="urgencia"]:checked');
      var urgKey = urgVal ? urgVal.value : 'sem-urgencia';
      payload.quantidade = parseInt($('quantidade').value, 10) || 1;
      payload.prazo = $('prazo').value || null;
      payload.urgencia = urgKey;
      payload.taxa_urgencia = TAXA_URGENCIA[urgKey] || 0;
      payload.tem_arquivo = temArquivoPronto();
      payload.precisa_modelagem = !temArquivoPronto();
      var links = [];
      document.querySelectorAll('#links-container input').forEach(function(inp){
        if(inp.value.trim()) links.push(inp.value.trim());
      });
      payload.links = links;
    }

    if(servicoAtual === 'consultoria'){
      payload.horas = $('horas').value;
      payload.tema = $('cons-tema').value.trim();
      var nivelSel = document.querySelector('input[name="nivel"]:checked');
      payload.nivel = nivelSel ? nivelSel.value : 'iniciante';
    }

    if(servicoAtual === 'assistencia'){
      payload.modelo = $('ass-modelo-modelo').value;
      payload.problema = $('ass-problema').value.trim();
      var prioSel = document.querySelector('input[name="prioridade"]:checked');
      payload.prioridade = prioSel ? prioSel.value : 'normal';
      /* Assistência é 100% remota — formato fixo */
      payload.formato = 'remoto';
    }

    fetch(API_ORCAMENTOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(res){
      var idRes = res && (res.pedido_id || res.id || res.numero);
      var pedidoId = (idRes && String(idRes).trim()) ? String(idRes).trim() : gerarPedidoId();
      sucesso(pedidoId, false);
    })
    .catch(function(err){
      if(window.console && console.warn){
        console.warn('[enviar-projeto] Falha ao registrar:', err && err.message);
      }
      var pedidoId = gerarPedidoId();
      sucesso(pedidoId, true);
    })
    .then(function(){
      if(btn){
        btn.disabled = false;
        btn.classList.remove('loading');
      }
      if(btnTxt) btnTxt.textContent = 'Enviar projeto e falar no WhatsApp';
    });
  }

  /* ==================== SUCESSO ==================== */
  function sucesso(pedidoId, offline){
    var txt = montarTextoWhatsApp(pedidoId);
    var waUrl = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(txt);

    var overlay = $('successOverlay');
    var idEl = $('successPedidoId');
    var btnWa = $('btnSucessoWa');

    if(idEl) idEl.textContent = pedidoId;
    if(btnWa) btnWa.href = waUrl;
    if(overlay) overlay.classList.add('show');

    window.open(waUrl, '_blank');

    if(offline){
      toast('Projeto preparado. Se o WhatsApp não abrir, clique no botão.');
    }

    /* --- Reset completo do formulário --- */
    var form = $('projetoForm');
    if(form) form.reset();

    var prazoReset = $('prazo');
    if(prazoReset){
      prazoReset.value = '';
      prazoReset.setAttribute('min', hojeISO());
    }

    fecharModalModelagem();

    document.querySelectorAll('.servico-card').forEach(function(c){
      c.classList.remove('selected');
    });
    var primeiro = document.querySelector('.servico-card[data-servico="impressao"]');
    if(primeiro){
      primeiro.classList.add('selected');
      servicoAtual = 'impressao';
    }
    var imp = $('campos-impressao');
    var con = $('campos-consultoria');
    var ass = $('campos-assistencia');
    if(imp) imp.style.display = '';
    if(con) con.style.display = 'none';
    if(ass) ass.style.display = 'none';

    document.querySelectorAll('.arquivo-card').forEach(function(c){
      c.classList.remove('selected');
    });
    var primeiroArq = document.querySelector('.arquivo-card input[value="sim"]');
    if(primeiroArq){
      primeiroArq.checked = true;
      var cardArq = primeiroArq.closest('.arquivo-card');
      if(cardArq) cardArq.classList.add('selected');
    }

    document.querySelectorAll('.urgencia-card').forEach(function(c){
      c.classList.remove('selected');
    });
    var urgPadrao = document.querySelector('.urgencia-card input[value="sem-urgencia"]');
    if(urgPadrao){
      urgPadrao.checked = true;
      var cardUrg = urgPadrao.closest('.urgencia-card');
      if(cardUrg) cardUrg.classList.add('selected');
    }

    document.querySelectorAll('.radio-pill').forEach(function(p){
      var inp = p.querySelector('input');
      p.classList.toggle('selected', !!(inp && inp.checked));
    });

    var container = $('links-container');
    if(container){
      var itens = container.querySelectorAll('.link-item');
      for(var i = itens.length - 1; i > 0; i--){
        itens[i].remove();
      }
      var primeiroInput = container.querySelector('input');
      if(primeiroInput) primeiroInput.value = '';
      linkCount = 1;
    }

    var consOutro = $('cons-outro-box');
    if(consOutro) consOutro.style.display = 'none';
    var consOutroTxt = $('cons-outro-texto');
    if(consOutroTxt) consOutroTxt.value = '';
    var assOutro = $('ass-outro-box');
    if(assOutro) assOutro.style.display = 'none';
    var assOutroTxt = $('ass-outro-texto');
    if(assOutroTxt) assOutroTxt.value = '';

    document.querySelectorAll('.campo-erro').forEach(function(el){
      el.classList.remove('campo-erro');
    });
    document.querySelectorAll('.erro-msg').forEach(function(el){
      el.style.display = 'none';
    });

    var progresso = $('progressoBarra');
    if(progresso) progresso.style.width = '0%';
  }

  function fecharSucesso(){
    var overlay = $('successOverlay');
    if(overlay) overlay.classList.remove('show');
  }

  /* ==================== EXPOR PARA O HTML ==================== */
  window.enviarProjeto = enviarProjeto;
  window.selecionarServico = selecionarServico;
  window.marcarPill = marcarPill;
  window.marcarArquivo = marcarArquivo;
  window.abrirModalModelagem = abrirModalModelagem;
  window.fecharModalModelagem = fecharModalModelagem;
  window.solicitarModelagemAqui = solicitarModelagemAqui;
  window.marcarUrgencia = marcarUrgencia;
  window.atualizarOutro = atualizarOutro;
  window.atualizarOutroAss = atualizarOutroAss;
  window.adicionarLink = adicionarLink;
  window.removerLink = removerLink;
  window.formatarWhatsApp = formatarWhatsApp;
  window.atualizarProgresso = atualizarProgresso;
  window.fecharSucesso = fecharSucesso;

  /* ==================== EVENTOS GLOBAIS ==================== */
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      fecharSucesso();
      fecharModalModelagem();
    }
  });

  var overlay = document.getElementById('successOverlay');
  if(overlay){
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) fecharSucesso();
    });
  }

  var modalMod = document.getElementById('modalModelagem');
  if(modalMod){
    modalMod.addEventListener('click', function(e){
      if(e.target === modalMod) fecharModalModelagem();
    });
  }

  /* ==================== INICIALIZAÇÃO ==================== */
  function iniciar(){
    /* Data mínima = hoje */
    var p = $('prazo');
    if(p){
      p.setAttribute('min', hojeISO());

      /* Clique em qualquer área do campo abre o calendário nativo.
         O guard impede disparo duplo quando o clique foi no próprio
         indicador (que já abre por padrão). */
      p.addEventListener('click', function(e){
        if(typeof p.showPicker !== 'function') return;
        if(e.target === p) return;
        try{ p.showPicker(); }catch(err){}
      });

      p.addEventListener('change', function(){
        if(p.value && p.value < hojeISO()){
          var errP = $('err-prazo');
          toast('A data não pode ser anterior a hoje.');
          p.value = '';
          if(errP){
            errP.textContent = 'A data não pode ser anterior a hoje.';
            errP.style.display = 'block';
          }
        }
      });
    }

    /* Limpa erro ao digitar */
    var mapaErros = {
      'nome': ['campoNome', 'err-nome'],
      'whatsapp': ['campoWhatsapp', 'err-whatsapp'],
      'email': ['campoEmail', 'err-email']
    };
    Object.keys(mapaErros).forEach(function(id){
      var el = $(id);
      if(!el) return;
      el.addEventListener('input', function(){
        var par = mapaErros[id];
        limparErro(par[0], par[1]);
      });
    });

    /* Limpa erro do prazo ao alterar */
    var prazoEl = $('prazo');
    if(prazoEl){
      prazoEl.addEventListener('change', function(){
        var campo = $('campoPrazo');
        if(campo) campo.classList.remove('campo-erro');
        var errP = $('err-prazo');
        if(errP) errP.style.display = 'none';
      });
    }

    atualizarProgresso();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

})();