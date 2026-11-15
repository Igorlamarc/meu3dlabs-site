/* ============================================================
   MEU 3D LABS — enviar-projeto.js v3.1
   Formulário condicional com 3 serviços, prazo via date,
   urgência com taxas (0 / +10 / +20), arquivo 3D obrigatório
   com modal de modelagem e atalho que mantém o cliente na página.
   Assistência técnica é 100% remota (sem opção presencial).
   Cadastro simples (padrão) vs completo com conta Firebase.
   Cliente já logado: seletor some e dados vêm prontos.
   ============================================================ */

(function(){
  'use strict';

  /* ==================== CONFIG ==================== */
  var API_ORCAMENTOS = 'https://meu3dlabs-backend.onrender.com/api/orcamentos';
  var API_VERIFICACAO = 'https://meu3dlabs-backend.onrender.com/api/auth/enviar-verificacao';
  var WA_NUM = '5521966594803';

  var TAXA_URGENCIA = { 'sem-urgencia': 0, 'moderada': 10, 'muito-urgente': 20 };
  var MAPA_URGENCIA = {
    'sem-urgencia': 'Sem urgência (sem taxa)',
    'moderada': 'Urgência moderada (+ R$ 10)',
    'muito-urgente': 'Muito urgente (+ R$ 20)'
  };

  var servicoAtual = 'impressao';
  var tipoCadastro = 'simples';
  var clienteLogado = null;

  /* ==================== FIREBASE ==================== */
  var FB_CONFIG = {
    apiKey: "AIzaSyAZwBSpyU9KAsrvqjVaFIShbdhoPu-C11s",
    authDomain: "meu3dlabs-loja.firebaseapp.com",
    projectId: "meu3dlabs-loja",
    storageBucket: "meu3dlabs-loja.firebasestorage.app",
    messagingSenderId: "429562795244",
    appId: "1:429562795244:web:d9d54e2b30941ab8eb81c9"
  };

  var fbAuth = null;
  var fbDb = null;

  (function iniciarFirebase(){
    try{
      if(typeof firebase === 'undefined'){
        console.warn('[enviar-projeto] SDK do Firebase não carregado.');
        return;
      }
      if(!firebase.apps || !firebase.apps.length){
        firebase.initializeApp(FB_CONFIG);
      }
      if(typeof firebase.auth === 'function') fbAuth = firebase.auth();
      if(typeof firebase.firestore === 'function') fbDb = firebase.firestore();
      if(fbAuth) fbAuth.languageCode = 'pt-BR';
    }catch(e){
      console.warn('[enviar-projeto] Firebase não iniciou:', e && e.message);
    }
  })();

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

  function formatarTelefone(v){
    var d = String(v || '').replace(/\D/g, '').slice(0, 11);
    if(d.length <= 2) return d.length ? '(' + d : '';
    if(d.length <= 6) return '(' + d.slice(0,2) + ') ' + d.slice(2);
    if(d.length <= 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
    return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
  }

  /* ==================== MÁSCARAS DO CADASTRO ==================== */
  function mascararCep(input){
    var v = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
  }

  function mascararCpf(input){
    var d = input.value.replace(/\D/g, '').slice(0, 11);
    if(d.length > 9){
      input.value = d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9);
    } else if(d.length > 6){
      input.value = d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6);
    } else if(d.length > 3){
      input.value = d.slice(0,3) + '.' + d.slice(3);
    } else {
      input.value = d;
    }
  }

  /* ==================== ESTADO DE LOGIN ==================== */
  function aplicarEstadoLogado(u){
    clienteLogado = u || null;

    var blocoVisitante = $('blocoVisitante');
    var blocoLogado    = $('blocoLogado');
    var lblObg         = $('lblEmailObg');

    if(u){
      if(blocoVisitante) blocoVisitante.style.display = 'none';
      if(blocoLogado) blocoLogado.style.display = 'block';

      tipoCadastro = 'logado';

      var nome  = (u.displayName || '').trim();
      var email = u.email || '';

      var lcNome   = $('lcNome');
      var lcEmail  = $('lcEmail');
      var lcAvatar = $('lcAvatar');

      if(lcNome)  lcNome.textContent = nome || 'Cliente';
      if(lcEmail) lcEmail.textContent = email || '—';

      if(lcAvatar){
        var partes = nome.split(/\s+/);
        var ini = ((partes[0] || '').charAt(0) + (partes[1] || '').charAt(0)).toUpperCase();
        lcAvatar.textContent = ini || '👤';
      }

      var nomeEl  = $('nome');
      var emailEl = $('email');
      if(nomeEl && !nomeEl.value.trim() && nome) nomeEl.value = nome;
      if(emailEl && !emailEl.value.trim() && email) emailEl.value = email;

      if(lblObg) lblObg.style.display = 'none';

      if(fbDb){
        fbDb.collection('clientes').doc(u.uid).get()
          .then(function(doc){
            if(!doc.exists) return;
            var d = doc.data() || {};

            var wEl = $('whatsapp');
            if(wEl && !wEl.value && d.whatsapp){
              wEl.value = formatarTelefone(d.whatsapp);
            }
            if(d.foto && lcAvatar){
              lcAvatar.style.background = 'none';
              lcAvatar.innerHTML = '<img src="' + d.foto + '" alt="">';
            }
            atualizarProgresso();
          })
          .catch(function(){});
      }

    } else {
      if(blocoVisitante) blocoVisitante.style.display = 'block';
      if(blocoLogado) blocoLogado.style.display = 'none';

      if(tipoCadastro === 'logado') tipoCadastro = 'simples';
    }

    atualizarProgresso();
  }

  /* ==================== TIPO DE CADASTRO ==================== */
  function selecionarCadastro(card){
    if(!card) return;
    if(clienteLogado) return;   /* cliente logado não escolhe cadastro */

    document.querySelectorAll('.cadastro-card').forEach(function(c){
      c.classList.remove('selected');
    });
    card.classList.add('selected');
    tipoCadastro = card.getAttribute('data-cadastro') || 'simples';

    var beneficios = $('cadastroBeneficios');
    var extra = $('cadastroExtra');
    var lblObg = $('lblEmailObg');

    if(tipoCadastro === 'completo'){
      if(beneficios) beneficios.style.display = 'block';
      if(extra) extra.style.display = 'block';
      if(lblObg) lblObg.style.display = '';
    } else {
      if(beneficios) beneficios.style.display = 'none';
      if(extra) extra.style.display = 'none';
      if(lblObg) lblObg.style.display = 'none';
    }
    atualizarProgresso();
  }

  function abrirCadastroCompleto(){
    if(clienteLogado) return;

    var cardCompleto = document.querySelector('.cadastro-card[data-cadastro="completo"]');
    if(cardCompleto) selecionarCadastro(cardCompleto);

    var extra = $('cadastroExtra');
    if(extra){
      setTimeout(function(){
        extra.scrollIntoView({ behavior:'smooth', block:'center' });
        var s = $('cadSenha');
        if(s) s.focus();
      }, 240);
    }
    toast('⭐ Preencha os dados da conta para garantir os descontos.');
  }

  function ceStatus(msg, tipo){
    var el = $('ceStatus');
    if(!el) return;
    if(!msg){
      el.className = 'ce-status';
      el.textContent = '';
      return;
    }
    el.className = 'ce-status show ' + (tipo || 'info');
    el.textContent = msg;
  }

  function cadastroComGoogle(){
    if(!fbAuth){
      ceStatus('Não foi possível iniciar o Google. Atualize a página e tente novamente.', 'err');
      return;
    }
    var btn = $('btnCadGoogle');
    var rotulo = btn ? btn.innerHTML : '';
    if(btn){ btn.disabled = true; btn.textContent = 'Conectando…'; }

    fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(function(cred){
        var u = cred.user;
        var nomeEl = $('nome');
        var emailEl = $('email');
        if(u.displayName && nomeEl && !nomeEl.value.trim()) nomeEl.value = u.displayName;
        if(u.email && emailEl) emailEl.value = u.email;
        ceStatus('✓ Conectado como ' + (u.email || '') + '. Complete os dados restantes.', 'ok');
        atualizarProgresso();
      })
      .catch(function(e){
        var m = {
          'auth/popup-closed-by-user': 'Você fechou a janela antes de concluir.',
          'auth/popup-blocked': 'O navegador bloqueou a janela. Permita popups e tente novamente.',
          'auth/cancelled-popup-request': 'Operação cancelada.',
          'auth/account-exists-with-different-credential': 'Esse e-mail já tem conta com outro método.'
        };
        ceStatus(m[e && e.code] || 'Não foi possível conectar com o Google.', 'err');
      })
      .then(function(){
        if(btn){ btn.disabled = false; btn.innerHTML = rotulo; }
      });
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

    if(tipoCadastro === 'completo'){
      var em = $('email');
      if(em) campos.push(!!em.value.trim());
    }

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
    var emailVal = emailEl ? emailEl.value.trim() : '';
    var emailOk = !emailVal || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);

    if(tipoCadastro === 'completo' && !emailVal){
      mostrarErro('campoEmail', 'err-email');
      var errEm = $('err-email');
      if(errEm) errEm.textContent = 'Informe um e-mail para criar sua conta.';
      ok = false;
    } else if(!emailOk){
      mostrarErro('campoEmail', 'err-email');
      var errEm2 = $('err-email');
      if(errEm2) errEm2.textContent = 'E-mail inválido.';
      ok = false;
    } else {
      limparErro('campoEmail', 'err-email');
    }

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
      linhas.push('Formato: Remoto (videochamada)');

      var prio = document.querySelector('input[name="prioridade"]:checked');
      if(prio) linhas.push('Prioridade: ' + (prio.value === 'urgente' ? 'Urgente' : 'Normal'));
    }

    if(tipoCadastro === 'completo'){
      linhas.push('Cadastro: completo (cupom 10% 1ª compra na loja + 5% no 1º projeto)');
    } else if(tipoCadastro === 'logado'){
      linhas.push('Cliente: já cadastrado');
    } else {
      linhas.push('Cadastro: simples');
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

    if(tipoCadastro === 'completo'){
      txt += '\n*Cadastro:* completo 🎁 (cupom 10% 1ª compra na loja + 5% 1º projeto)';
    } else if(tipoCadastro === 'logado'){
      txt += '\n*Cliente:* já cadastrado';
    }

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

  /* ==================== CONTA (CADASTRO COMPLETO) ==================== */
  function criarContaSeCompleto(){
    /* Cliente logado: usa o usuário atual */
    if(clienteLogado) return Promise.resolve(clienteLogado);
    if(tipoCadastro !== 'completo') return Promise.resolve(null);
    if(!fbAuth) return Promise.resolve(null);

    var emailCad = $('email') ? $('email').value.trim() : '';
    var senha    = $('cadSenha') ? $('cadSenha').value : '';
    var senha2   = $('cadSenha2') ? $('cadSenha2').value : '';
    var nomeCli  = $('nome') ? $('nome').value.trim() : '';

    if(fbAuth.currentUser) return Promise.resolve(fbAuth.currentUser);

    if(!emailCad) return Promise.reject(new Error('Informe um e-mail para criar a conta.'));
    if(senha.length < 6) return Promise.reject(new Error('A senha precisa ter pelo menos 6 caracteres.'));
    if(senha !== senha2) return Promise.reject(new Error('As senhas não conferem.'));

    return fbAuth.createUserWithEmailAndPassword(emailCad, senha)
      .then(function(cred){
        return cred.user.updateProfile({ displayName: nomeCli })
          .then(function(){ return cred.user; });
      })
      .then(function(user){
        user.getIdToken(true)
          .then(function(tk){
            return fetch(API_VERIFICACAO, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: tk })
            });
          })
          .catch(function(){ user.sendEmailVerification().catch(function(){}); });
        return user;
      })
      .catch(function(e){
        if(e && e.code === 'auth/email-already-in-use'){
          return fbAuth.signInWithEmailAndPassword(emailCad, senha)
            .then(function(c){ return c.user; });
        }
        if(e && e.code === 'auth/weak-password'){
          throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        }
        if(e && e.code === 'auth/invalid-email'){
          throw new Error('E-mail inválido.');
        }
        throw e;
      });
  }

  function salvarPerfilFirestore(usuario){
    if(!usuario || !fbDb) return Promise.resolve();

    /* Cliente logado: só atualiza o WhatsApp se foi preenchido */
    if(clienteLogado){
      var w = $('whatsapp').value.replace(/\D/g, '');
      if(!w) return Promise.resolve();
      return fbDb.collection('clientes').doc(usuario.uid)
        .set({ whatsapp: w }, { merge: true })
        .catch(function(){});
    }

    var dados = {
      nome: $('nome').value.trim(),
      email: usuario.email || ($('email') ? $('email').value.trim() : ''),
      whatsapp: $('whatsapp').value.replace(/\D/g, '')
    };

    var dia = $('cadDia') ? parseInt($('cadDia').value, 10) : null;
    var mes = $('cadMes') ? parseInt($('cadMes').value, 10) : null;
    var cep = $('cadCep') ? $('cadCep').value.replace(/\D/g, '') : '';
    var cpf = $('cadCpf') ? $('cadCpf').value.replace(/\D/g, '') : '';

    if(dia) dados.nascimentoDia = dia;
    if(mes) dados.nascimentoMes = mes;
    if(cep) dados.cep = cep;
    if(cpf) dados.cpf = cpf;

    return fbDb.collection('clientes').doc(usuario.uid)
      .set(dados, { merge: true })
      .then(function(){
        return fbDb.collection('clientes_publico').doc(usuario.uid)
          .set({ email: String(dados.email || '').toLowerCase(), foto: '' }, { merge: true })
          .catch(function(){});
      })
      .catch(function(err){
        console.warn('[enviar-projeto] perfil não salvo:', err && err.message);
      });
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
      descricao: montarDescricao(),
      tipo_cadastro: tipoCadastro,
      cliente_novo: tipoCadastro === 'completo'
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
      payload.formato = 'remoto';
    }

    criarContaSeCompleto()
      .then(function(usuario){
        if(usuario){
          payload.uid = usuario.uid;
          return salvarPerfilFirestore(usuario).then(function(){ return usuario; });
        }
        return null;
      })
      .catch(function(err){
        if(err && err.message){
          ceStatus(err.message + ' Enviando como cadastro simples.', 'err');
          toast('⚠️ ' + err.message);
        }
        payload.tipo_cadastro = 'simples';
        payload.cliente_novo = false;
        return null;
      })
      .then(function(){
        return fetch(API_ORCAMENTOS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
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

    /* Cadastro: mantém estado de logado ou volta para simples */
    if(clienteLogado){
      tipoCadastro = 'logado';
      var bVis = $('blocoVisitante');
      var bLog = $('blocoLogado');
      if(bVis) bVis.style.display = 'none';
      if(bLog) bLog.style.display = 'block';
    } else {
      document.querySelectorAll('.cadastro-card').forEach(function(c){
        c.classList.remove('selected');
      });
      var cadSimples = document.querySelector('.cadastro-card[data-cadastro="simples"]');
      if(cadSimples){
        cadSimples.classList.add('selected');
        tipoCadastro = 'simples';
      }
      var beneficios = $('cadastroBeneficios');
      if(beneficios) beneficios.style.display = 'none';
      var extraCad = $('cadastroExtra');
      if(extraCad) extraCad.style.display = 'none';
      var lblObg = $('lblEmailObg');
      if(lblObg) lblObg.style.display = 'none';
    }

    ['cadSenha','cadSenha2','cadDia','cadCep','cadCpf'].forEach(function(id){
      var elx = $(id);
      if(elx) elx.value = '';
    });
    var cadMesEl = $('cadMes');
    if(cadMesEl) cadMesEl.value = '';
    ceStatus('');

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
  window.selecionarCadastro = selecionarCadastro;
  window.abrirCadastroCompleto = abrirCadastroCompleto;
  window.cadastroComGoogle = cadastroComGoogle;
  window.mascararCep = mascararCep;
  window.mascararCpf = mascararCpf;
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
    var p = $('prazo');
    if(p){
      p.setAttribute('min', hojeISO());

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

    var prazoEl = $('prazo');
    if(prazoEl){
      prazoEl.addEventListener('change', function(){
        var campo = $('campoPrazo');
        if(campo) campo.classList.remove('campo-erro');
        var errP = $('err-prazo');
        if(errP) errP.style.display = 'none';
      });
    }

    /* Estado de login */
    if(fbAuth){
      fbAuth.onAuthStateChanged(function(u){
        aplicarEstadoLogado(u);
      });
    } else {
      aplicarEstadoLogado(null);
    }

    atualizarProgresso();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();