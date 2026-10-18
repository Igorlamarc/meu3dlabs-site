/* ===== Meu 3D Labs — loja/pagamento: PIX (QR Code) + CARTÃO (Mercado Pago — formulário embutido + fallback Checkout Pro) ===== */
/* ORDEM DE CARREGAMENTO no loja.html (a ordem importa):
   loja-carrinho.js -> loja-checkout.js -> loja-pedido.js -> SDK do Mercado Pago -> loja-pagamento.js (este, por último) */
var API_BASE_PAG='https://meu3dlabs-backend.onrender.com/api';
var API_CARTAO=API_BASE_PAG+'/loja/pagamentos/cartao';
var API_CARTAO_DIRETO=API_BASE_PAG+'/loja/pagamentos/cartao-direto';
var API_CHAVE_PUBLICA=API_BASE_PAG+'/loja/pagamentos/chave-publica';
/* Ambiente limpo para o iframe do Mercado Pago: o efeito de vidro fosco (backdrop-filter)
   do overlay desenha iframes de forma defeituosa em alguns navegadores — desativado só aqui. */
(function(){
  var st=document.createElement('style');
  st.id='m3lBrickAmbiente';
  st.textContent=
  '#modalOverlay{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}';
  document.head.appendChild(st);
})();
/* ===== PIX ===== */
var CHAVE_PIX = '+5521980284930';
var NOME_PIX = 'MEU3DLABS';
var CIDADE_PIX = 'NILOPOLIS';
function pLen(s){ s = String(s); return String(s.length).padStart(2,'0'); }
function pCampo(id, v){ v = String(v); return id + pLen(v) + v; }
function crc16(str){
  var crc = 0xFFFF;
  for(var i = 0; i < str.length; i++){
    crc ^= str.charCodeAt(i) << 8;
    for(var j = 0; j < 8; j++){
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
function montarPix(valor){
  var txid = 'MEU3D' + Date.now().toString().slice(-8);
  var v = parseFloat(String(valor == null ? '' : valor).replace('R$','').trim().replace(',', '.'));
  if(isNaN(v)) v = 0;
  var mai = pCampo('00','br.gov.bcb.pix') + pCampo('01', CHAVE_PIX);
  var payload = '000201' + pCampo('26', mai) + '52040000' + '5303986';
  if(v > 0) payload += pCampo('54', v.toFixed(2));
  payload += '5802BR' + pCampo('59', NOME_PIX) + pCampo('60', CIDADE_PIX);
  payload += pCampo('62', pCampo('05', txid));
  return payload + '6304' + crc16(payload + '6304');
}
function copiarPix(){
  var c = document.getElementById('pixCopiaECola');
  if(!c) return;
  c.select(); c.setSelectionRange(0, 99999);
  if(navigator.clipboard) navigator.clipboard.writeText(c.value).catch(function(){});
}
function mostrarPix(valor){
  var box = document.getElementById('pixArea');
  if(!box){
    box = document.createElement('div');
    box.id = 'pixArea';
    box.style.cssText = 'text-align:center;margin:16px 0;padding:16px;border:2px dashed #f26522;border-radius:12px;background:#fff8f4;';
    document.getElementById('modalBody').appendChild(box);
  }
  var pix = montarPix(valor);
  box.innerHTML =
    '<h4 style="margin:0 0 4px;color:#0f1e3d;">💰 Pagamento via PIX</h4>' +
    '<p style="font-size:13px;color:#4a5161;margin:0 0 12px;">Pague e envie o comprovante no WhatsApp junto com o nº do pedido.</p>' +
    '<div id="pixQr" style="display:flex;justify-content:center;margin-bottom:10px;"></div>' +
    '<p style="font-size:12.5px;color:#4a5161;margin:0 0 4px;">Valor: <b style="color:#0f1e3d;">' + fmt(valor) + '</b></p>' +
    '<p style="font-size:12.5px;color:#4a5161;margin:0 0 8px;">Chave PIX: <b>21980284930</b></p>' +
    '<textarea readonly id="pixCopiaECola" style="width:100%;font-size:11px;color:#555;border:1px solid #ddd;border-radius:8px;padding:8px;box-sizing:border-box;resize:none;" rows="3"></textarea>' +
    '<br><button type="button" onclick="copiarPix()" style="margin-top:8px;background:#f26522;color:#fff;border:none;padding:9px 18px;border-radius:8px;font-weight:700;cursor:pointer;">📋 Copiar código PIX</button>';
  document.getElementById('pixCopiaECola').value = pix;
  if(window.QRCode){ new QRCode(document.getElementById('pixQr'), { text: pix, width: 200, height: 200 }); }
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
/* ===== CARTÃO (Mercado Pago) =====
   Fluxo principal: formulário de cartão EMBUTIDO (Card Payment Brick) dentro do modal da loja —
   sem redirecionamento, aprovação/reprovação na hora.
   Fallback automático: se o formulário não carregar, aparece o botão "Pagar pelo Mercado Pago"
   que usa o Checkout Pro (redirecionamento) — o fluxo antigo continua funcionando.
   IMPORTANTE: o formulário roda dentro de um IFRAME seguro do Mercado Pago. Ele precisa ser
   montado DEPOIS que a animação de abertura do modal terminar, senão se mede errado e as
   escritas saem desalinhadas/ sobrepostas. Por isso há a espera de 450ms antes de montar. */
var pagamentoCartaoAtual=null;
var chavePublicaMP=null;
var mpInstancia=null;
var brickCartaoController=null;
var m3lBrickTimer=null;
function desmontarBrickCartao(){
  if(m3lBrickTimer){ clearTimeout(m3lBrickTimer); m3lBrickTimer=null; }
  if(brickCartaoController){
    try{ brickCartaoController.unmount(); }catch(e){}
    brickCartaoController=null;
  }
}
/* Fecha o modal limpando o formulário do Mercado Pago (wrapper sobre o fecharModal do checkout) */
(function(){
  var fecharOriginal=window.fecharModal;
  if(typeof fecharOriginal==='function'){
    window.fecharModal=function(){
      desmontarBrickCartao();
      return fecharOriginal.apply(this,arguments);
    };
  }
})();
function iniciarPagamentoCartao(p){
  pagamentoCartaoAtual=p;
  try{sessionStorage.setItem('m3l_pedido_cartao',JSON.stringify({numero:p.numero,total:p.total,registrado:true,itens:p.itens||[],forma:'cartao',pendente:false}));}catch(e){}
  document.getElementById('modalTitulo').textContent='Pagamento com cartão';
  var mb=document.getElementById('modalBody');
  mb.innerHTML=
    '<div style="text-align:center;padding:4px 2px 0;">'
    +'<div style="font-size:13px;color:#4a5161;margin-bottom:12px;">Pedido <b>#'+p.numero+'</b> · Valor <b style="color:#0f1e3d;">'+fmt(p.total)+'</b> · cartão de crédito em até 12x</div>'
    +'<div style="background:#0f1e3d;color:#fff;border-radius:12px 12px 0 0;padding:14px 16px 12px;text-align:left;">'
    +'<div style="font-weight:800;font-size:.95rem;">💳 Pague com cartão de crédito</div>'
    +'<div style="font-size:11.5px;color:#9fb0d0;margin-top:2px;">🔒 Ambiente seguro do Mercado Pago · processado dentro da Meu 3D Labs</div>'
    +'</div>'
    +'<div id="m3lBrickCartao" style="border:2px solid #0f1e3d;border-top:none;border-radius:0 0 12px 12px;background:#f5f7fb;padding:14px 10px 10px;min-height:180px;">'
    +'<div id="m3lBrickAguarde" style="text-align:center;color:#5a6472;font-size:13px;padding:30px 10px;">Carregando formulário seguro...</div>'
    +'</div>'
    +'<div id="m3lBrickErro" style="display:none;background:#fdecea;color:#b3261e;border:1px solid #f4c7c3;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.45;margin-top:10px;"></div>'
    +'<div id="m3lBrickFallback" style="margin-top:12px;"></div>'
    +'</div>';
  /* Espera a animação de abertura do modal terminar antes de montar o iframe do Mercado Pago */
  if(m3lBrickTimer){ clearTimeout(m3lBrickTimer); }
  m3lBrickTimer=setTimeout(function(){
    m3lBrickTimer=null;
    abrirBrickCartao(p);
  },450);
}
function obterChavePublica(){
  if(chavePublicaMP)return Promise.resolve(chavePublicaMP);
  return fetch(API_CHAVE_PUBLICA)
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,dados:d};});})
    .then(function(res){
      if(res.ok&&res.dados&&res.dados.public_key){ chavePublicaMP=res.dados.public_key; return chavePublicaMP; }
      throw new Error('chave publica ausente no servidor');
    });
}
function abrirBrickCartao(p){
  var cont=document.getElementById('m3lBrickCartao');
  if(!cont)return; /* modal foi fechado antes de montar: aborta */
  if(typeof window.MercadoPago!=='function'){
    mostrarFallbackCheckoutPro(p,'O formulário do Mercado Pago não carregou (conexão ou bloqueio do navegador).');
    return;
  }
  obterChavePublica()
    .then(function(chave){
      if(!mpInstancia){ mpInstancia=new MercadoPago(chave,{locale:'pt-BR'}); }
      var bricks=mpInstancia.bricks();
      var u=m3lClienteLogado();
      var config={
        initialization:{
          amount:Math.round((parseFloat(p.total)||0)*100)/100
        },
        customization:{
          visual:{
            hideFormTitle:true,
            style:{
              theme:'default'
            }
          }
        },
        callbacks:{
          onReady:function(){
            var ag=document.getElementById('m3lBrickAguarde');
            if(ag)ag.style.display='none';
          },
          onSubmit:function(cardFormData){
            return processarPagamentoDireto(p,cardFormData);
          },
          onError:function(err){
            console.warn('pagamento: erro no formulário do Mercado Pago',err);
          }
        }
      };
      if(u&&u.email){ config.initialization.payer={email:u.email}; }
      return bricks.create('cardPayment','m3lBrickCartao',config)
        .then(function(controller){ brickCartaoController=controller; });
    })
    .catch(function(e){
      console.warn('pagamento: formulário embutido indisponível',e);
      mostrarFallbackCheckoutPro(p,'O formulário do Mercado Pago não pôde ser carregado agora.');
    });
}
function processarPagamentoDireto(p,cardFormData){
  return new Promise(function(resolve){
    fetch(API_CARTAO_DIRETO,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        pedido_id:p.numero,
        token:cardFormData.token,
        payment_method_id:cardFormData.paymentMethodId,
        issuer_id:cardFormData.issuerId,
        installments:cardFormData.installments,
        payer_email:cardFormData.cardholderEmail
      })
    })
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,dados:d};});})
    .then(function(res){
      var d=res.dados||{};
      if(res.ok&&d.status==='aprovado'){
        pagamentoAprovado(p,d.pagamento_id);
      }else if(res.ok&&d.status==='pendente'){
        pagamentoPendente(d.message||'Pagamento em análise pelo Mercado Pago.');
      }else{
        pagamentoReprovado(d.message||d.error||'O pagamento não foi aprovado. Verifique os dados do cartão e tente novamente.');
      }
      resolve();
    })
    .catch(function(){
      pagamentoReprovado('Erro de conexão ao processar o pagamento. Tente novamente.');
      resolve();
    });
  });
}
function pagamentoAprovado(p,payId){
  desmontarBrickCartao();
  try{
    var c=localStorage.getItem('m3l_cupom_pendente');
    if(c){ marcarCupomUsado(c); localStorage.removeItem('m3l_cupom_pendente'); }
  }catch(e){}
  limparCarrinhoAposPedido();
  salvarMeuPedido({numero:p.numero,total:p.total,registrado:true,forma:'cartao',pendente:false,itens:p.itens||[]});
  if(window.gtag){
    gtag('event','purchase',{
      currency:'BRL',
      value:p.total,
      transaction_id:p.numero,
      items:(p.itens||[]).map(function(i){return {item_name:i.nome,item_variant:i.cor||'',price:i.preco||0,quantity:i.qtd||1};})
    });
  }
  mostrarConfirmacaoCartao(p.numero,{itens:p.itens||[],total:p.total});
}
function pagamentoPendente(msg){
  desmontarBrickCartao();
  var p=pagamentoCartaoAtual||{};
  salvarMeuPedido({numero:p.numero,total:p.total,registrado:true,forma:'cartao',pendente:true,itens:p.itens||[]});
  var mb=document.getElementById('modalBody');
  if(mb){
    mb.innerHTML='<div style="text-align:center;padding:20px 8px;">'
      +'<div style="font-size:44px;margin-bottom:8px;">⏳</div>'
      +'<h3 style="margin:0 0 6px;color:#0f1e3d;font-size:1.05rem;font-weight:800;">Pagamento em análise</h3>'
      +'<p style="font-size:13px;color:#4a5161;line-height:1.55;margin:0 0 14px;">'+String(msg||'').replace(/</g,'&lt;')+'</p>'
      +'<p style="font-size:12.5px;color:#5a6472;line-height:1.5;margin:0 0 16px;">O pedido <b>#'+(p.numero||'')+'</b> continua <b style="color:#b26a00;">Aguardando pagamento</b> e, quando o Mercado Pago aprovar, vira <b style="color:#0f7a44;">Pago</b> automaticamente.</p>'
      +'<button class="btn-wa" onclick="waAposCartao(\''+(p.numero||'')+'\')"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/></svg>Falar com a loja no WhatsApp</button>'
      +'<button class="btn-voltar" onclick="fecharModal()">Continuar na loja</button>'
      +'</div>';
  }
  bannerStatusCartao('💳 Pagamento em análise pelo Mercado Pago. Assim que for aprovado, o pedido vira Pago automaticamente.','#0f1e3d');
}
function pagamentoReprovado(msg){
  var box=document.getElementById('m3lBrickErro');
  if(box){ box.style.display='block'; box.textContent='⚠️ '+msg; }
  var cont=document.getElementById('m3lBrickCartao');
  if(cont)cont.scrollIntoView({behavior:'smooth',block:'center'});
  bannerStatusCartao('⚠️ '+msg,'#c0392b');
}
/* ===== Fallback: Checkout Pro (redirecionamento) quando o formulário embutido não carrega ===== */
function mostrarFallbackCheckoutPro(p,motivo){
  var cont=document.getElementById('m3lBrickCartao');
  if(cont){
    cont.innerHTML='<div style="text-align:center;color:#5a6472;font-size:13px;line-height:1.5;padding:8px 6px;">'+String(motivo||'').replace(/</g,'&lt;')+'<br>Você pode concluir pelo checkout do Mercado Pago:</div>';
  }
  var fb=document.getElementById('m3lBrickFallback');
  if(fb){
    fb.innerHTML='<button type="button" id="btnPagarCartao" onclick="pagarComCartaoAgora()" style="width:100%;max-width:320px;box-sizing:border-box;background:linear-gradient(135deg,#f26522,#e05512);color:#fff;border:none;padding:14px 18px;border-radius:10px;font-weight:800;font-size:.95rem;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(242,101,34,.35);">💳 Pagar pelo Mercado Pago</button>';
  }
}
function pagarComCartaoAgora(){
  var p=pagamentoCartaoAtual;
  if(!p||!p.registrado){
    alert('Não foi possível iniciar o pagamento agora. Envie o pedido pelo WhatsApp que a gente confirma por lá.');
    return;
  }
  var btnC=document.getElementById('btnPagarCartao');
  if(btnC){ btnC.disabled=true; btnC.textContent='Abrindo checkout seguro...'; }
  fetch(API_CARTAO,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pedido_id:p.numero})
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,dados:d}; }); })
  .then(function(res){
    if(res.ok && res.dados && res.dados.init_point){
      window.location.href=res.dados.init_point;
    }else{
      if(btnC){ btnC.disabled=false; btnC.textContent='💳 Pagar pelo Mercado Pago'; }
      alert('Não foi possível iniciar o pagamento agora ('+((res.dados&&res.dados.error)||'erro')+'). Tente novamente ou finalize no WhatsApp.');
    }
  })
  .catch(function(){
    if(btnC){ btnC.disabled=false; btnC.textContent='💳 Pagar pelo Mercado Pago'; }
    alert('Erro de conexão ao iniciar o pagamento. Tente novamente ou finalize no WhatsApp.');
  });
}
/* ===== Retomar pagamento de pedido pendente (botão "Tentar pagamento" no painel Minha conta) ===== */
/* Global: o loja-login.js chama esta função pelo painel "Meus pedidos". Abre o modal com o formulário embutido. */
function tentarPagamentoCartao(numero){
  if(!numero)return;
  try{
    var ovl=document.getElementById('m3lLoginOv');
    if(ovl)ovl.classList.remove('open');
  }catch(e){}
  var dados=null;
  try{
    var lista=JSON.parse(localStorage.getItem('m3l_pedidos')||'[]');
    if(Array.isArray(lista)){lista.forEach(function(pp){if(pp&&pp.numero===numero)dados=pp;});}
  }catch(e){}
  desmontarBrickCartao();
  abrirModal();
  iniciarPagamentoCartao({numero:numero,total:(dados&&dados.total)||0,registrado:true,itens:(dados&&dados.itens)||[],forma:'cartao'});
}
function bannerStatusCartao(texto,corFundo){
  var b=document.createElement('div');
  b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;padding:14px 16px;text-align:center;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;background:'+corFundo+';box-shadow:0 4px 14px rgba(0,0,0,.18);';
  b.textContent=texto;
  document.body.appendChild(b);
  setTimeout(function(){ if(b&&b.parentElement) b.remove(); },12000);
}
/* ===== Tela de confirmação (aprovado — no modal, sem sair da loja) ===== */
function mostrarConfirmacaoCartao(pid,dados){
  var d=dados||{};
  var itensVis=(d.itens||[]).filter(function(i){return (i.preco||0)>0;});
  var html='<div class="pedido-ok">'
    +'<div class="ok-icon">✅</div>'
    +'<h3>Pagamento aprovado no cartão!</h3>'
    +'<p>Obrigado pela compra — seu pedido está confirmado.</p>';
  if(pid){
    html+='<div class="pedido-numero"><span>#</span>'+pid+'<button class="btn-copiar-codigo" onclick="copiarCodigoPedido(\''+pid+'\')">📋 Copiar código</button></div>';
  }
  if(itensVis.length){
    html+='<div class="resumo-clean"><div class="rc-secao"><div class="rc-titulo">Itens</div>';
    itensVis.forEach(function(i){
      html+='<div class="rc-linha"><span>'+i.qtd+'x '+i.nome+(i.cor?' <em>('+i.cor+')</em>':'')+'</span><strong>'+fmt((i.preco||0)*i.qtd)+'</strong></div>';
    });
    if(d.total){ html+='<div class="rc-linha rc-total"><span>Total</span><strong>'+fmt(d.total)+'</strong></div>'; }
    html+='</div></div>';
  }else if(d.total){
    html+='<div class="resumo-clean"><div class="rc-secao"><div class="rc-linha rc-total"><span>Total</span><strong>'+fmt(d.total)+'</strong></div></div></div>';
  }
  html+='<p style="font-size:13px;color:#4a5161;line-height:1.5;margin:14px 0 0;">Vamos te chamar no WhatsApp para combinar a entrega. 🚚</p>'
    +'<button class="btn-wa" onclick="waAposCartao(\''+(pid||'')+'\')"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/></svg>Falar com a loja no WhatsApp</button>'
    +'<button class="btn-voltar" onclick="fecharModal()">Continuar na loja</button>'
    +'</div>';
  document.getElementById('modalTitulo').textContent='🎉 Pagamento aprovado';
  document.getElementById('modalBody').innerHTML=html;
  abrirModal();
}
function waAposCartao(pid){
  var msg='Olá! Acabei de pagar'+(pid?(' o pedido #'+pid):'')+' no cartão. Podemos combinar a entrega?';
  window.open('https://wa.me/'+WHATSAPP_LOJA+'?text='+encodeURIComponent(msg),'_blank');
}
/* ===== Retorno do Checkout Pro (fallback): banner de status quando o cliente volta do Mercado Pago ===== */
(function(){
  try{
    var q=new URLSearchParams(window.location.search);
    if(q.get('pagamento')!=='cartao')return;
    var st=q.get('status');
    var pid=q.get('pedido')||'';
    var dados=null;
    try{dados=JSON.parse(sessionStorage.getItem('m3l_pedido_cartao')||'null');}catch(e){dados=null;}
    try{sessionStorage.removeItem('m3l_pedido_cartao');}catch(e){}
    if(st==='aprovado'){
      try{
        var c=localStorage.getItem('m3l_cupom_pendente');
        if(c){ marcarCupomUsado(c); localStorage.removeItem('m3l_cupom_pendente'); }
      }catch(e){}
      limparCarrinhoAposPedido();
      if(dados){ salvarMeuPedido(dados); }
      if(window.gtag){
        gtag('event','purchase',{
          currency:'BRL',
          value:(dados&&dados.total)||0,
          transaction_id:pid,
          items:((dados&&dados.itens)||[]).map(function(i){return {item_name:i.nome,item_variant:i.cor||'',price:i.preco||0,quantity:i.qtd||1};})
        });
      }
      mostrarConfirmacaoCartao(pid,dados);
    }else if(st==='falhou'){
      try{localStorage.removeItem('m3l_cupom_pendente');}catch(e){}
      bannerStatusCartao('⚠️ O pagamento no cartão não foi concluído. Você pode tentar novamente no painel Minha conta > Meus pedidos.','#c0392b');
    }else if(st==='pendente'){
      bannerStatusCartao('💳 Pagamento em análise pelo Mercado Pago. Assim que for aprovado, o pedido vira Pago automaticamente.','#0f1e3d');
    }else{
      return;
    }
    try{window.history.replaceState({},'',window.location.pathname);}catch(e){}
  }catch(e){}
})();