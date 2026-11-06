/* ============================================================
   MEU 3D LABS — acompanhar.js v1.3
   - Timeline por serviço: loja / encomenda / consultoria / assistência
   - Exibe data e hora do agendamento (consultoria e assistência)
   - QR Code do pedido no bloco de status
   ============================================================ */
var API_LOJA_PEDIDO = 'https://meu3dlabs-backend.onrender.com/api/loja/pedidos/';
var API_ORC_PEDIDO  = 'https://meu3dlabs-backend.onrender.com/api/orcamentos/pedido/';
var WA_NUM          = '5521966594803';

/* ==================== HELPERS ==================== */
function normalizar(v){
  return String(v || '').trim().replace(/^#+/, '').replace(/\s+/g, '').toUpperCase();
}
function escaparHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function fmtMoeda(v){
  var n = parseFloat(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}
function fmtData(iso){
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var dia = String(d.getDate()).padStart(2, '0');
  var mes = String(d.getMonth() + 1).padStart(2, '0');
  var ano = d.getFullYear();
  var hh  = String(d.getHours()).padStart(2, '0');
  var mm  = String(d.getMinutes()).padStart(2, '0');
  return dia + '/' + mes + '/' + ano + ' às ' + hh + ':' + mm;
}
function fmtAgendamento(data, hora){
  if (!data) return '';
  var m = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
  var d = m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(data);
  var h = hora ? String(hora).slice(0, 5) : '';
  return h ? (d + ' às ' + h) : d;
}

/* ==================== DETECÇÃO DE SERVIÇO ==================== */
function detectarServico(dados, tipo){
  if (tipo === 'loja') return 'loja';
  var s = String(
    dados.servico || dados.tipo_servico || dados.servico_escolhido ||
    dados.tipo || dados.tipo_peca || ''
  ).toLowerCase();
  if (s.indexOf('consult') !== -1) return 'consultoria';
  if (s.indexOf('assist') !== -1 || s.indexOf('manut') !== -1) return 'assistencia';
  if (s.indexOf('modelag') !== -1) return 'encomenda';   /* mesma timeline, intencional */
  return 'encomenda';
}

/* ==================== MAPEAMENTO DE STATUS ==================== */
function mapearLoja(v){
  var s = String(v || '').toLowerCase().trim();
  if (['cancelado','cancelada','sem-resposta','sem resposta','sem_resposta'].indexOf(s) > -1) return -1;
  if (s === 'pago' || s.indexOf('pago (') === 0) return 2;
  if (['pagamento_confirmado','confirmado','aprovado'].indexOf(s) > -1) return 2;
  if (s.indexOf('nota') > -1) return 3;              /* gerando nota */
  if (s.indexOf('embal') > -1) return 3;
  if (s.indexOf('saiu') > -1 || s === 'enviado' || s.indexOf('em_transporte') > -1) return 4;
  if (['entregue','finalizado','concluido','concluída','concluído'].indexOf(s) > -1) return 5;
  if (s.indexOf('não identificado') > -1 || s.indexOf('nao identificado') > -1) return 1;
  if (s.indexOf('compensa') > -1) return 1;
  if (s.indexOf('verifica') > -1 || s === 'em_verificacao') return 1;
  if (s.indexOf('aguardando') > -1) return 1;
  return 0;
}

function mapearEncomenda(v){
  var s = String(v || '').toLowerCase().trim();
  if (['cancelado','cancelada','sem-resposta','sem resposta','sem_resposta'].indexOf(s) > -1) return -1;
  /* Recusado = encerrado, mesmo tratamento de sem-resposta */
  if (s === 'recusado' || s === 'recusada') return -1;
  if (['entregue','finalizado','concluido','concluída','concluído'].indexOf(s) > -1) return 5;
  if (['pronto','pronto_entrega','pronto_para_entrega','aguardando_entrega','para_entrega'].indexOf(s) > -1) return 4;
  if (['producao','em_producao','impressao','imprimindo','em_produção','produção'].indexOf(s) > -1) return 3;
  if (['aprovado','aprovacao','confirmado','em_andamento','aprovada','aprovação'].indexOf(s) > -1) return 2;
  if (['pago','paid','pagamento_confirmado'].indexOf(s) > -1) return 2;   /* ← adicionar */
  if (['orcamento','orcado','orcamento_enviado','aguardando_aprovacao','orçamento','orçado'].indexOf(s) > -1) return 1;
  return 0;
}

function mapearConsultoria(v){
  var s = String(v || '').toLowerCase().trim();
  if (['cancelado','cancelada','sem-resposta','sem resposta','sem_resposta'].indexOf(s) > -1) return -1;
  if (s.indexOf('finaliz') > -1) return 6;                          /* consultoria finalizada */
  if (s.indexOf('atendimento') > -1) return 5;                      /* em atendimento */
  if (s.indexOf('agend') > -1) return 4;                            /* agendamento realizado */
  if (s.indexOf('consultoria paga') > -1 || s === 'paga' || s === 'pago') return 3;
  if (s.indexOf('aguardando pag') > -1 || s.indexOf('aguardandopag') > -1) return 2;
  if (s.indexOf('analis') > -1 || s.indexOf('avalia') > -1) return 1;
  return 0;                                                          /* novo */
}

function mapearAssistencia(v){
  var s = String(v || '').toLowerCase().trim();
  if (['cancelado','cancelada','sem-resposta','sem resposta','sem_resposta'].indexOf(s) > -1) return -1;
  if (s.indexOf('finaliz') > -1) return 5;                          /* finalizado */
  if (s.indexOf('aguardando pe') > -1 || s.indexOf('aguardandopeca') > -1) return 4;
  if (s.indexOf('a caminho') > -1 || s.indexOf('acaminho') > -1) return 3;
  if (s.indexOf('agend') > -1) return 2;                            /* agendamento realizado */
  if (s.indexOf('analis') > -1 || s.indexOf('avalia') > -1) return 1;
  return 0;                                                          /* novo */
}

function mapearStatus(servico, statusBruto){
  if (servico === 'loja') return mapearLoja(statusBruto);
  if (servico === 'consultoria') return mapearConsultoria(statusBruto);
  if (servico === 'assistencia') return mapearAssistencia(statusBruto);
  return mapearEncomenda(statusBruto);
}

/* ==================== RÓTULO DA PILL ==================== */
function tradPill(servico, s){
  var k = String(s || '').toLowerCase().trim();

  if (servico === 'loja'){
    if (k.indexOf('não identificado') > -1 || k.indexOf('nao identificado') > -1) return '⚠️ Pix não identificado';
    if (k.indexOf('compensa') > -1) return '⏳ Pix aguardando compensação';
    if (k.indexOf('verifica') > -1 || k === 'em_verificacao') return '🔍 Pix em verificação';
    if (k.indexOf('aguardando') > -1) return '⏳ Aguardando pagamento';
    if (k === 'pago') return '💰 Pago';
    if (k === 'pago (cartão)' || k === 'pago (cartao)') return '✅ Pago no cartão';
    if (k.indexOf('nota') > -1) return '🧾 Gerando nota fiscal';
    if (k.indexOf('embal') > -1) return '📦 Em embalagem';
    if (k.indexOf('saiu') > -1 || k === 'enviado' || k.indexOf('em_transporte') > -1) return '🚚 Saiu para entrega';
    if (k === 'entregue') return '✅ Entregue';
    return '📝 Pedido feito';
  }

  if (servico === 'consultoria'){
    if (k.indexOf('finaliz') > -1) return '✅ Consultoria finalizada';
    if (k.indexOf('atendimento') > -1) return '💻 Em atendimento';
    if (k.indexOf('agend') > -1) return '📅 Agendamento realizado';
    if (k.indexOf('consultoria paga') > -1 || k === 'paga' || k === 'pago') return '💰 Consultoria paga';
    if (k.indexOf('aguardando pag') > -1 || k.indexOf('aguardandopag') > -1) return '⏳ Aguardando pagamento';
    if (k.indexOf('analis') > -1) return '🔍 Em análise';
    return '📝 Recebido';
  }

  if (servico === 'assistencia'){
    if (k.indexOf('finaliz') > -1) return '✅ Finalizado';
    if (k.indexOf('aguardando pe') > -1 || k.indexOf('aguardandopeca') > -1) return '🔧 Aguardando peça';
    if (k.indexOf('a caminho') > -1 || k.indexOf('acaminho') > -1) return '🚗 A caminho do atendimento';
    if (k.indexOf('agend') > -1) return '📅 Agendamento realizado';
    if (k.indexOf('analis') > -1) return '🔍 Em análise';
    return '📝 Recebido';
  }

  /* encomenda */
  if (k.indexOf('aguardando_entrega') > -1 || k === 'para_entrega') return 'Pronto';
  if (k.indexOf('analise') > -1) return 'Em análise';
  if (k.indexOf('orc') === 0 || k === 'orçamento') return 'Em orçamento';
  if (k === 'aprovado' || k === 'em_andamento' || k === 'aprovacao' || k === 'aprovada') return 'Aprovado';
  if (k.indexOf('produ') === 0) return 'Em produção';
  if (k === 'pronto') return 'Pronto';
  if (k === 'entregue') return 'Entregue';
  return 'Recebido';
}

function etiquetaEntrega(e){
  var s = String(e || '').toLowerCase();
  if (s.indexOf('uber') > -1) return 'Entrega por aplicativo';
  if (s.indexOf('correio') > -1) return 'Envio pelos Correios';
  if (s.indexOf('retirada') > -1) return 'Retirada na loja';
  return s || 'Retirada na loja';
}

function detectarFormaPagamento(statusBruto){
  var s = String(statusBruto || '').toLowerCase();
  if (s.indexOf('cartão') > -1 || s.indexOf('cartao') > -1) return 'cartao';
  return 'pix';
}

/* ==================== MENSAGEM DO PIX (só loja) ==================== */
function htmlMensagemPix(status){
  var s = String(status || '').toLowerCase();

  if (s.indexOf('não identificado') > -1 || s.indexOf('nao identificado') > -1){
    var numero = (document.getElementById('sNumero') || {}).textContent || '';
    var textoZap = encodeURIComponent('Olá! Segue o comprovante do PIX do pedido ' + String(numero).trim());
    return '<div class="pix-msg pix-msg-vermelho">'
         +   '<h3>⚠️ Pix não localizado</h3>'
         +   '<p>Você informou que pagou via Pix, mas <b>ainda não identificamos o pagamento</b> no nosso extrato.<br><br>'
         +   '<b>Se você pagou, é só nos enviar o comprovante</b> e confirmamos na hora. Isso pode acontecer se:</p>'
         +   '<ul>'
         +     '<li>O pagamento foi agendado pelo banco</li>'
         +     '<li>O comprovante ainda não foi processado</li>'
         +     '<li>Você pagou com a conta de outra pessoa</li>'
         +   '</ul>'
         +   '<a class="pix-msg-btn" href="https://wa.me/' + WA_NUM + '?text=' + textoZap + '" target="_blank" rel="noopener">💬 Enviar comprovante no WhatsApp</a>'
         + '</div>';
  }
  if (s.indexOf('compensa') > -1){
    return '<div class="pix-msg pix-msg-amarelo">'
         +   '<h3>⏳ Aguardando compensação do Pix</h3>'
         +   '<p>Recebemos seu aviso de pagamento, mas o Pix ainda não caiu na nossa conta. '
         +   'Isso pode acontecer quando o pagamento é <b>agendado pelo banco</b> ou processado no '
         +   '<b>próximo dia útil</b> — é normal, não se preocupe.<br><br>'
         +   'Assim que o valor aparecer, confirmamos aqui e seu status muda para <b>Pago</b>. '
         +   'Você não precisa fazer nada.</p>'
         + '</div>';
  }
  if (s.indexOf('verifica') > -1 || s === 'em_verificacao'){
    return '<div class="pix-msg pix-msg-amarelo">'
         +   '<h3>🔍 Pix em verificação</h3>'
         +   '<p>Recebemos seu aviso de pagamento! Estamos conferindo o Pix no nosso extrato. '
         +   'Assim que confirmarmos, o status muda para <b>Pago</b> automaticamente e você '
         +   'recebe um e-mail de confirmação.</p>'
         + '</div>';
  }
  return '';
}

/* ==================== AÇÃO: JÁ FIZ O PAGAMENTO ==================== */
function htmlAcaoPix(statusBruto){
  var s = String(statusBruto || '').toLowerCase();
  if (s.indexOf('aguardando') === -1) return '';
  if (s.indexOf('verifica') > -1) return '';
  if (s.indexOf('compensa') > -1) return '';
  if (s.indexOf('não identificado') > -1 || s.indexOf('nao identificado') > -1) return '';
  return '<div class="pix-acao">'
       +   '<p class="pix-acao-txt">Já fez o pagamento? Avise a gente que confirmamos rapidinho.</p>'
       +   '<button type="button" class="pix-acao-btn" onclick="informarPixPago(this)">✅ Já fiz o pagamento</button>'
       + '</div>';
}

function informarPixPago(btn){
  var numero = String((document.getElementById('sNumero') || {}).textContent || '').trim();
  if (!numero) return;
  var rotulo = btn ? btn.textContent : '';
  if (btn){ btn.disabled = true; btn.textContent = 'Registrando…'; }
  fetch(API_LOJA_PEDIDO + encodeURIComponent(numero) + '/informar-pagamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  .then(function(r){
    return r.text().then(function(t){
      var d = {};
      try { d = JSON.parse(t); } catch(e){}
      return { status: r.status, dados: d };
    });
  })
  .then(function(res){
    if (res.status === 200){
      var msg = document.getElementById('buscaMsg');
      if (msg){
        msg.className = 'busca-msg ok';
        msg.textContent = 'Aviso registrado! Vamos conferir seu Pix.';
      }
      if (window.ultimoPedido && window.ultimoTipo){
        exibirPedido(window.ultimoPedido, window.ultimoTipo, numero);
      } else {
        buscarPedido();
      }
      return;
    }
    if (btn){ btn.disabled = false; btn.textContent = rotulo; }
    var motivo = (res.dados && (res.dados.detalhe || res.dados.erro)) || ('HTTP ' + res.status);
    var msg2 = document.getElementById('buscaMsg');
    if (msg2){
      msg2.className = 'busca-msg erro';
      msg2.textContent = 'Não foi possível registrar: ' + motivo;
    }
  })
  .catch(function(){
    if (btn){ btn.disabled = false; btn.textContent = rotulo; }
    var msg3 = document.getElementById('buscaMsg');
    if (msg3){
      msg3.className = 'busca-msg erro';
      msg3.textContent = 'Não foi possível registrar agora. Tente novamente.';
    }
  });
}

/* ==================== TIMELINE POR SERVIÇO ==================== */
function passosDoServico(servico){
  if (servico === 'loja'){
    return [
      { t:'Pedido feito',         d:'Recebemos seu pedido e estamos processando.' },
      { t:'Aguardando pagamento', d:'Conclua o pagamento para liberarmos o pedido.' },
      { t:'Pago',                 d:'Pagamento confirmado (Pix ou cartão).' },
      { t:'Em preparação',        d:'Nota fiscal e embalagem do seu pedido.' },
      { t:'Saiu para entrega',    d:'Seu pedido está a caminho de você.' },
      { t:'Entregue',             d:'Pedido entregue. Obrigado pela compra!' }
    ];
  }
  if (servico === 'consultoria'){
    return [
      { t:'Recebido',             d:'Recebemos sua solicitação de consultoria.' },
      { t:'Em análise',           d:'Estamos avaliando o seu caso.' },
      { t:'Aguardando pagamento', d:'Realize o pagamento para liberar o agendamento.' },
      { t:'Consultoria paga',     d:'Pagamento confirmado. Vamos agendar o atendimento.' },
      { t:'Agendamento',          d:'Data e horário do seu atendimento confirmados.' },
      { t:'Em atendimento',       d:'Sua consultoria está em andamento.' },
      { t:'Finalizada',           d:'Consultoria concluída. Obrigado pela confiança!' }
    ];
  }
  if (servico === 'assistencia'){
    return [
      { t:'Recebido',             d:'Recebemos sua solicitação de assistência.' },
      { t:'Em análise',           d:'Estamos avaliando o seu caso.' },
      { t:'Agendamento',          d:'Data e horário do atendimento confirmados.' },
      { t:'A caminho',            d:'Nossa equipe está indo até você.' },
      { t:'Aguardando peça',      d:'Atendimento feito, aguardando a peça chegar.' },
      { t:'Finalizado',           d:'Assistência concluída. Obrigado pela confiança!' }
    ];
  }
  /* encomenda */
  return [
    { t:'Recebido',     d:'Recebemos seu pedido e vamos analisar.' },
    { t:'Orçamento',    d:'Enviamos o orçamento com prazo e valor.' },
    { t:'Aprovado',     d:'Orçamento aprovado e produção confirmada.' },
    { t:'Em produção',  d:'Sua peça está sendo impressa.' },
    { t:'Pronto',       d:'Pedido finalizado, pronto para entrega.' },
    { t:'Entregue',     d:'Pedido entregue. Obrigado pela compra!' }
  ];
}

function montarTimeline(servico, status, dados){
  var passos = passosDoServico(servico);
  var agendamento = (dados && dados.data_agendamento)
    ? fmtAgendamento(dados.data_agendamento, dados.hora_agendamento)
    : '';

  var html = '';
  passos.forEach(function(p, idx){
    var cls = idx < status ? 'feito' : (idx === status ? 'ativo' : 'pendente');
    var desc = p.d;

    /* Mostra a data/hora no passo de agendamento */
    if ((p.t === 'Agendamento') && agendamento){
      desc = '📅 ' + agendamento;
    }

    html += '<div class="tl-step ' + cls + '" data-step="' + idx + '">'
          +   '<div class="tl-dot"><span class="tl-num">' + (idx + 1) + '</span></div>'
          +   '<div class="tl-info">'
          +     '<strong>' + p.t + '</strong>'
          +     '<span>' + desc + '</span>'
          +     '<span class="data-status">' + (status >= idx ? '✓ ' + p.t : '') + '</span>'
          +   '</div>'
          + '</div>';
  });
  document.getElementById('timeline').innerHTML = html;
}

/* ==================== QR CODE — PIX ==================== */
var PIX_CHAVE   = '+5521980284930';
var PIX_NOME    = 'MEU3DLABS';
var PIX_CIDADE  = 'NILOPOLIS';

function campoPix(id, valor){
  var v = String(valor == null ? '' : valor);
  return id + String(v.length).padStart(2, '0') + v;
}

function montarPayloadPix(valor, identificador){
  var gui     = campoPix('00', 'br.gov.bcb.pix');
  var chave   = campoPix('01', PIX_CHAVE);
  var merchant = campoPix('26', gui + chave);

  var payload = '000201'
              + merchant
              + '52040000'
              + '5303986'
              + campoPix('54', Number(valor || 0).toFixed(2))
              + '5802BR'
              + campoPix('59', PIX_NOME)
              + campoPix('60', PIX_CIDADE)
              + campoPix('62', campoPix('05', identificador))
              + '6304';

  /* CRC16-CCITT */
  var crc = 0xFFFF;
  for (var i = 0; i < payload.length; i++){
    crc ^= payload.charCodeAt(i) << 8;
    for (var j = 0; j < 8; j++){
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return payload + ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
}

function montarQr(numero, dados){
  var box = document.getElementById('qrBox');
  if (!box) return;

  var valor = dados && (dados.total || dados.valor);
  if (!valor) { box.innerHTML = ''; box.classList.remove('show'); return; }

  /* Identificador do Pix: só o número do pedido, sem hífens */
  var ident = String(numero).replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  var payload = montarPayloadPix(valor, ident);

  var src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=' + encodeURIComponent(payload);

  box.innerHTML =
    '<div class="qr-wrap">'
    + '<img src="' + src + '" alt="QR Code Pix do pedido ' + escaparHtml(numero) + '" loading="lazy" width="180" height="180">'
    + '<div class="qr-texto">'
    +   '<strong>Pague com Pix</strong>'
    +   '<span>Valor: <b>R$ ' + Number(valor).toFixed(2).replace('.', ',') + '</b></span>'
    +   '<span class="qr-sub">Aponte a câmera do seu banco para pagar.</span>'
    +   '<button type="button" class="qr-copiar" onclick="copiarPix()">📋 Copiar código Pix</button>'
    + '</div>'
    + '</div>';

  box._pixPayload = payload;
  box.classList.add('show');
}

function copiarPix(){
  var box = document.getElementById('qrBox');
  var payload = box && box._pixPayload;
  if (!payload) return;
  function ok(){
    var m = document.getElementById('buscaMsg');
    if (m){ m.className = 'busca-msg ok'; m.textContent = 'Código Pix copiado!'; }
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(payload).then(ok).catch(function(){
      var ta = document.createElement('textarea');
      ta.value = payload; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch(e){}
      document.body.removeChild(ta); ok();
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = payload; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta); ok();
  }
}

/* ==================== BUSCA ==================== */
function buscarPedido(){
  var input = document.getElementById('inputPedido');
  var msg   = document.getElementById('buscaMsg');
  var alvo  = normalizar(input.value);
  msg.className = 'busca-msg';
  msg.textContent = '';

  if (!alvo){
    msg.className = 'busca-msg erro';
    msg.textContent = 'Digite o número do pedido (ex: M3D-000001).';
    return;
  }

  document.getElementById('statusBox').classList.remove('show');
  msg.className = 'busca-msg carregando';
  msg.textContent = 'Consultando seu pedido…';

  fetch(API_LOJA_PEDIDO + encodeURIComponent(alvo))
    .then(function(r){
      if (r.status === 404){
        return fetch(API_ORC_PEDIDO + encodeURIComponent(alvo)).then(function(r2){
          if (r2.status === 404) return null;
          if (!r2.ok) throw { tipo:'servidor' };
          return r2.json().then(function(j){ return { dados:j, tipo:'encomenda' }; });
        });
      }
      if (!r.ok) throw { tipo:'servidor' };
      return r.json().then(function(j){ return { dados:j, tipo:'loja' }; });
    })
    .then(function(res){
      if (!res){
        document.getElementById('statusBox').classList.remove('show');
        msg.className = 'busca-msg erro';
        msg.textContent = 'Pedido não encontrado. Confira o número ou fale com a gente no WhatsApp.';
        return;
      }
      exibirPedido(res.dados, res.tipo, alvo);
      msg.className = 'busca-msg ok';
      msg.textContent = 'Pedido encontrado!';
    })
    .catch(function(){
      document.getElementById('statusBox').classList.remove('show');
      msg.className = 'busca-msg erro';
      msg.textContent = 'Não foi possível consultar agora. Tente novamente em instantes ou chame no WhatsApp.';
    });
}

/* ==================== EXIBIÇÃO ==================== */
function exibirPedido(dados, tipo, alvo){
  var numero = dados.pedido_id || dados.numero || dados.id || alvo;
  var statusBruto = dados.status || dados.estado || dados.etapa || '';
  var sRaw = String(statusBruto).toLowerCase().trim();

  var servico = detectarServico(dados, tipo);

  window.ultimoPedido = dados;
  window.ultimoTipo   = tipo;

  var ehCancelado = (sRaw === 'cancelado' || sRaw === 'cancelada' || sRaw === 'recusado' || sRaw === 'recusada');
  var ehSemResp   = (sRaw === 'sem-resposta' || sRaw === 'sem resposta' || sRaw === 'sem_resposta');
  var encerrado   = ehCancelado || ehSemResp;

  var status = encerrado ? -1 : mapearStatus(servico, statusBruto);

  document.getElementById('sNumero').textContent = numero;

  var box = document.getElementById('statusBox');
  box.classList.remove('cancelado','encerrado');
  var pill = document.getElementById('statusPill');
  pill.classList.remove('cancelado','encerrado');

  var msgBox = document.getElementById('pixMsgBox');
  if (msgBox) msgBox.innerHTML = '';

/* QR Code — só em pedido da loja aguardando Pix */
var qrBox = document.getElementById('qrBox');
if (qrBox) { qrBox.innerHTML = ''; qrBox.classList.remove('show'); qrBox._pixPayload = null; }

var precisaQr = (
  servico === 'loja' &&
  !encerrado &&
  (sRaw.indexOf('aguardando') > -1 ||
   sRaw.indexOf('verifica') > -1 ||
   sRaw.indexOf('compensa') > -1 ||
   sRaw.indexOf('identificado') > -1)
);
if (precisaQr) montarQr(numero, dados);

  if (ehCancelado){
    box.classList.add('cancelado');
    pill.classList.add('cancelado');
    pill.textContent = 'Cancelado';
    document.getElementById('timeline').innerHTML =
      '<div class="cancel-box"><strong>Este pedido foi cancelado.</strong>'
      + '<span>Se você já fez o pagamento ou quer entender o que aconteceu, chame a gente no WhatsApp que resolvemos rapidinho.</span></div>';
  } else if (ehSemResp){
    box.classList.add('encerrado');
    pill.classList.add('encerrado');
    pill.textContent = 'Encerrado';
    document.getElementById('timeline').innerHTML =
      '<div class="cancel-box encerrado-box"><strong>Este pedido foi encerrado.</strong>'
      + '<span>Quer retomar ou tirar dúvidas? Chame a gente no WhatsApp com o número do pedido e retomamos de onde parou.</span></div>';
  } else {
    pill.textContent = tradPill(servico, statusBruto);
    montarTimeline(servico, status, dados);
    if (servico === 'loja' && msgBox){
      msgBox.innerHTML = htmlMensagemPix(statusBruto) + htmlAcaoPix(statusBruto);
    }
  }

  /* --- Detalhes --- */
  var detBox = document.getElementById('detalhesBox');
  var html = '';

  if (tipo === 'loja'){
    var itens = Array.isArray(dados.itens) ? dados.itens : [];
    var linhasItens = '';
    itens.forEach(function(i){
      var qtd = parseInt(i.qtd) || 1;
      var preco = parseFloat(i.preco) || 0;
      var cor = i.cor ? ' <small style="color:#8a94a8;">(' + escaparHtml(i.cor) + ')</small>' : '';
      linhasItens += '<div class="det-item">'
                  +   '<span>' + qtd + 'x ' + escaparHtml(i.nome || 'Item') + cor + '</span>'
                  +   '<strong>' + fmtMoeda(preco * qtd) + '</strong>'
                  + '</div>';
    });
    if (!linhasItens) linhasItens = '<div class="det-item"><span>Sem itens informados</span></div>';

    var subtotal = parseFloat(dados.subtotal) || 0;
    var desconto = parseFloat(dados.desconto) || 0;
    var descPix  = parseFloat(dados.desconto_pix) || 0;
    var total    = parseFloat(dados.total) || 0;

    html += '<div class="det-lista">' + linhasItens + '</div>';
    html += '<div class="det-totais">';
    html +=   '<div class="det-linha"><span>Subtotal</span><span>' + fmtMoeda(subtotal) + '</span></div>';
    if (desconto > 0) html += '<div class="det-linha"><span>Cupom</span><span style="color:#0f7a44;">-' + fmtMoeda(desconto) + '</span></div>';
    if (descPix > 0)  html += '<div class="det-linha"><span>Desconto Pix (5%)</span><span style="color:#0f7a44;">-' + fmtMoeda(descPix) + '</span></div>';
    html +=   '<div class="det-linha det-total"><span>Total</span><span>' + fmtMoeda(total) + '</span></div>';
    html += '</div>';

    var formaPgto = detectarFormaPagamento(statusBruto);
    var formaTxt  = (formaPgto === 'cartao') ? 'Cartão (Mercado Pago)' : 'Pix';
    var descPixTxt = (formaPgto === 'cartao')
      ? 'Não se aplica'
      : (descPix > 0 ? '5% aplicado (-' + fmtMoeda(descPix) + ')' : '5% não aplicado');

    html += '<div class="det-info">';
    html +=   '<div class="det-linha"><span>Pagamento</span><span>' + escaparHtml(formaTxt) + '</span></div>';
    html +=   '<div class="det-linha"><span>Desconto Pix</span><span>' + escaparHtml(descPixTxt) + '</span></div>';
    html +=   '<div class="det-linha"><span>Entrega</span><span>' + escaparHtml(etiquetaEntrega(dados.entrega)) + '</span></div>';
    if (dados.endereco) html += '<div class="det-linha"><span>Endereço</span><span>' + escaparHtml(dados.endereco) + '</span></div>';
    if (dados.horario)  html += '<div class="det-linha"><span>Horário</span><span>' + escaparHtml(dados.horario) + '</span></div>';
    if (dados.created_at) html += '<div class="det-linha"><span>Data</span><span>' + fmtData(dados.created_at) + '</span></div>';
    html += '</div>';
  } else {
    var orc = dados;
    html += '<div class="det-info">';

    if (orc.tipo_peca) html += '<div class="det-linha"><span>Tipo de peça</span><span>' + escaparHtml(orc.tipo_peca) + '</span></div>';
    if (orc.quantidade) html += '<div class="det-linha"><span>Quantidade</span><span>' + escaparHtml(orc.quantidade) + '</span></div>';
    if (orc.descricao_peca) html += '<div class="det-linha"><span>Descrição</span><span>' + escaparHtml(String(orc.descricao_peca).split('|')[0].trim()) + '</span></div>';
    if (orc.prazo_desejado) html += '<div class="det-linha"><span>Prazo desejado</span><span>' + escaparHtml(orc.prazo_desejado) + '</span></div>';

    /* Agendamento (consultoria e assistência) */
    if (orc.data_agendamento){
      html += '<div class="det-linha det-agendamento"><span>📅 Agendado para</span><span>'
            + escaparHtml(fmtAgendamento(orc.data_agendamento, orc.hora_agendamento))
            + '</span></div>';
    }

    if (orc.created_at) html += '<div class="det-linha"><span>Data do pedido</span><span>' + fmtData(orc.created_at) + '</span></div>';
    html += '</div>';
  }

  detBox.innerHTML = '<h4>Detalhes do pedido</h4>' + html;

  var btnZap = document.getElementById('btnZap');
  if (btnZap){
    btnZap.href = 'https://wa.me/' + WA_NUM + '?text=' +
      encodeURIComponent('Olá! Quero falar sobre o pedido #' + numero);
  }

  box.classList.add('show');
}

/* ==================== COPIAR NÚMERO ==================== */
function copiarNumero(){
  var t = (document.getElementById('sNumero').textContent || '').trim();
  function ok(){
    var m = document.getElementById('buscaMsg');
    if (m){ m.className = 'busca-msg ok'; m.textContent = 'Número copiado!'; }
  }
  function fbCopia(txt){
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(ok).catch(function(){ fbCopia(t); ok(); });
  } else {
    fbCopia(t); ok();
  }
}

/* ==================== DEEP LINK POR URL ==================== */
(function(){
  var params = new URLSearchParams(window.location.search);
  var num = params.get('numero') || params.get('pedido') || params.get('codigo') || params.get('order');
  if (num){
    document.getElementById('inputPedido').value = String(num).replace(/#/g, '').trim();
    buscarPedido();
  }
})();