/* ===== Meu 3D Labs — loja/checkout: tela de finalização (dados, entrega, pagamento, cupom, modal) ===== */
/* IMPORTANTE: carregar DEPOIS do loja-carrinho.js e ANTES do loja-pedido.js no loja.html */

/* ================= API PIX ================= */
var API_LOJA = 'https://meu3dlabs-backend.onrender.com/api/loja';

/* ================= CUPONS ================= */
var CUPONS={
  'MEUPRIMEIRO3D10': {tipo:'porcentagem', valor:10}
  /* Formato para adicionar outros cupons:
  'BEMVINDO10': {tipo:'porcentagem', valor:10},
  'M3D5': {tipo:'fixo', valor:5}
  */
};

/* ============================================================
   RESOLUÇÃO DE DADOS DO CLIENTE
   Lê em cascata: clienteDados (digitado) -> window.m3lUser (Auth/Firestore)
   -> cache local do navegador (m3l_perfil_local).
   Assim o prefill não depende mais da ordem de carregamento do perfil.
   ============================================================ */
function m3lPerfilLocalSalvo(){
  try{
    var raw=localStorage.getItem('m3l_perfil_local');
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function m3lFormatarFoneCheckout(v){
  var d=String(v||'').replace(/\D/g,'').slice(0,11);
  if(!d)return '';
  if(d.length<3)return d;
  var s='('+d.slice(0,2)+')';
  if(d.length>2)s+=' '+d.slice(2,7);
  if(d.length>6)s+='-'+d.slice(7,11);
  return s;
}
function m3lFormatarCepCheckout(v){
  var d=String(v||'').replace(/\D/g,'').slice(0,8);
  return d.length>5?(d.slice(0,5)+'-'+d.slice(5)):d;
}
function m3lEscAttr(v){
  return String(v==null?'':v).replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
function dadosCheckout(){
  var u=window.m3lUser||{};
  var cache=m3lPerfilLocalSalvo();
  var cacheOk=!!(cache&&(!cache.uid||!u.uid||cache.uid===u.uid));

  var nome=String(clienteDados.nome||'').trim()
    || String(u.nome||'').trim()
    || (cacheOk?String(cache.nome||'').trim():'');

  var fone=String(clienteDados.fone||'').replace(/\D/g,'')
    || String(u.fone||'').replace(/\D/g,'')
    || (cacheOk?String(cache.whatsapp||'').replace(/\D/g,''):'');

  var end=clienteDados.endereco||{};
  if(!end.cep&&!end.rua){
    if(u.endereco&&(u.endereco.cep||u.endereco.rua)){
      end=u.endereco;
    }else if(cacheOk&&cache.endereco&&(cache.endereco.cep||cache.endereco.rua)){
      end=cache.endereco;
    }
  }
  return {nome:nome,fone:fone,end:end||{}};
}
/* Espelha o resolvido dentro do clienteDados, para guardarNome/guardarFone
   continuarem consistentes e para o salvamento não regravar vazio. */
function sincronizarClienteDados(){
  var d=dadosCheckout();
  if(!String(clienteDados.nome||'').trim()&&d.nome)clienteDados.nome=d.nome;
  if(!String(clienteDados.fone||'').replace(/\D/g,'')&&d.fone)clienteDados.fone=String(d.fone).replace(/\D/g,'');
  if((!clienteDados.endereco||(!clienteDados.endereco.cep&&!clienteDados.endereco.rua))&&(d.end.cep||d.end.rua)){
    clienteDados.endereco=d.end;
  }
  try{
    localStorage.setItem('m3l_perfil_local',JSON.stringify({
      uid:(window.m3lUser&&window.m3lUser.uid)||null,
      nome:clienteDados.nome||'',
      whatsapp:String(clienteDados.fone||'').replace(/\D/g,''),
      endereco:clienteDados.endereco||null
    }));
  }catch(e){}
}

/* ================= CHECKOUT ================= */
function abrirCheckout(){
  if(totalCarrinho()<=0)return;
  fecharCarrinho();
  var u=m3lClienteLogado();
  if(!u){
    mostrarConviteCadastro();
    return;
  }
  sincronizarClienteDados();
  document.getElementById('modalTitulo').textContent='Finalizar pedido';
  document.getElementById('modalBody').innerHTML=etapaResumo();
  restaurarCupomUI();
  ligarSalvamentoPerfil();
  abrirModal();
  if(window.gtag)gtag('event','begin_checkout',{currency:'BRL',value:totalFinal()});
}

/* ===== Convite obrigatório: entrar ou criar conta antes do checkout ===== */
function mostrarConviteCadastro(){
  document.getElementById('modalTitulo').textContent='🔐 Entre para finalizar';
  document.getElementById('modalBody').innerHTML=
  '<div style="text-align:center;padding:6px 0 2px;">'
  +'<div style="font-size:46px;margin-bottom:10px;">🔐</div>'
  +'<h3 style="margin:0 0 6px;color:#0f1e3d;font-size:1.1rem;font-weight:800;line-height:1.35;">Falta só um passo para fechar seu pedido</h3>'
  +'<p style="color:#4a5161;font-size:13.5px;line-height:1.55;margin:0 0 16px;">Entre na sua conta ou crie uma agora. É rápido e <strong>seu carrinho continua aqui</strong> — nada se perde.</p>'
  +'<button type="button" onclick="criarContaDoConvite()" style="width:100%;box-sizing:border-box;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#f26522,#e05512);color:#fff;font-weight:800;font-size:.95rem;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(242,101,34,.35);margin-bottom:12px;">✨ Criar minha conta</button>'
  +'<div style="display:flex;align-items:center;gap:10px;margin:0 0 12px;color:#9aa3b2;font-size:.72rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">'
  +'<span style="flex:1;height:1px;background:#e2e6ee;"></span><span>ou</span><span style="flex:1;height:1px;background:#e2e6ee;"></span>'
  +'</div>'
  +'<button type="button" onclick="loginDoConvite()" style="width:100%;box-sizing:border-box;padding:13px;border:1.5px solid #0f1e3d;border-radius:10px;background:#fff;color:#0f1e3d;font-weight:800;font-size:.93rem;cursor:pointer;font-family:inherit;margin-bottom:14px;">Já tem cadastro? <span style="color:#f26522;">Faça o login aqui</span></button>'
  +'<p style="font-size:11.5px;color:#8a94a8;line-height:1.55;margin:0;">🎁 Ao criar sua conta e confirmar o e-mail, você recebe um <strong style="color:#f26522;">cupom de 10%</strong> para usar nesta compra.</p>'
  +'</div>';
  abrirModal();
}
function criarContaDoConvite(){
  fecharModal();
  m3lRetomarCheckout=true;
  if(window.m3lAbrirCadastro){window.m3lAbrirCadastro();}
}
function loginDoConvite(){
  fecharModal();
  m3lRetomarCheckout=true;
  if(window.m3lAbrirLogin){window.m3lAbrirLogin();}
  else if(window.m3lAbrirCadastro){window.m3lAbrirCadastro();}
}

/* ===== Tela de finalização ===== */
function etapaResumo(){
  var d=dadosCheckout();
  var end=d.end||{};
  var ciduf=((end.cidade||'')+(end.uf?(' - '+end.uf):''));

  var html='';
  html+='<div class="erro-box" id="erroBox"></div>';

  var u=m3lClienteLogado();
  if(u){
    var jaPreenchido='';
    if(d.nome&&d.fone)jaPreenchido=' · nome e WhatsApp já preenchidos';
    else if(d.nome)jaPreenchido=' · seu nome já está preenchido';
    html+='<div style="display:flex;align-items:center;gap:6px;background:#eaf6ee;border:1px solid #cbe5d2;border-radius:10px;padding:10px 12px;font-size:13px;color:#186a35;margin-bottom:12px;">✅ Conectado como <strong>'+u.email+'</strong>'+jaPreenchido+'</div>';
  }

  /* ---------- SEUS DADOS ---------- */
  html+='<div class="etapa-titulo">Seus dados</div>';
  html+='<div class="campos-grid">'
  +'<div class="campo"><label>Nome e sobrenome <span>*</span></label><input type="text" id="cliNome" placeholder="Nome e sobrenome" autocomplete="name" enterkeyhint="next" value="'+m3lEscAttr(d.nome)+'" oninput="guardarNome(this)"></div>'
  +'<div class="campo"><label>Celular / WhatsApp <span>*</span></label><input type="tel" id="cliFone" placeholder="(21) 99999-9999" maxlength="16" autocomplete="tel" inputmode="numeric" enterkeyhint="done" value="'+m3lEscAttr(m3lFormatarFoneCheckout(d.fone))+'" oninput="guardarFone(this)"></div>'
  +'</div>';
  html+='<label class="check-item optin"><input type="checkbox" id="cliOptin"> Quero receber novidades e peças em estoque pelo WhatsApp</label>';

  /* ---------- SEUS ITENS ---------- */
  html+='<div class="etapa-titulo">Seus itens</div>';
  carrinho.forEach(function(item){
    var emPromoItem=item.precoOriginal&&item.precoOriginal>item.precoNum;
    var pctI=emPromoItem?Math.round((1-item.precoNum/item.precoOriginal)*100):0;
    var valorItem=emPromoItem
      ?'<span style="text-decoration:line-through;color:#8a94a8;font-size:12px;font-weight:600;margin-right:4px;">'+fmt(item.precoOriginal*item.qtd)+'</span><span style="color:#c0392b;font-weight:800;">'+fmt(item.precoNum*item.qtd)+'</span><span style="background:#c0392b;color:#fff;font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:10px;margin-left:6px;">-'+pctI+'%</span>'
      :fmt(item.precoNum*item.qtd);
    html+='<div class="resumo-item"><span class="ri-nome">'+item.qtd+'x '+item.nome+(item.cor?' <span class="ri-cor">('+item.cor+')</span>':'')+'</span><span>'+valorItem+'</span></div>';
  });
  html+='<div class="resumo-item"><span class="ri-nome">Subtotal</span><span>'+fmt(totalCheio())+'</span></div>';
  if(descontoPromo()>0){
    html+='<div class="resumo-item promo-linha"><span class="ri-nome">Desconto de promoção</span><span style="color:#0f7a44;font-weight:700;">-'+fmt(descontoPromo())+'</span></div>';
  }
  html+='<div class="resumo-total"><span>Total</span><span class="valor">'+fmt(totalFinal())+'</span></div>';

  /* ---------- CUPOM ---------- */
  html+='<div class="etapa-titulo">Cupom de desconto</div>';
  html+='<div class="cupom-linha"><input type="text" id="cupomInput" placeholder="Digite seu cupom" autocomplete="off" value="'+(window.m3lCupomSugerido?m3lEscAttr(window.m3lCupomSugerido):'')+'"><button class="btn-aplicar" onclick="aplicarCupom()">Aplicar</button></div>';
  html+='<div class="cupom-msg" id="cupomMsg"></div>';

  /* ---------- FORMA DE ENTREGA ---------- */
  html+='<div class="etapa-titulo">Forma de entrega</div>';
  html+='<div class="entrega-opcoes" id="entregaOpcoes">'
  +'<div class="entrega-op'+(entregaSel==='retirada'?' sel':'')+'" onclick="selEntrega(\'retirada\',this)"><input type="radio" name="entrega" '+(entregaSel==='retirada'?'checked':'')+'><div><div class="eo-titulo">Retirada em Nilópolis/RJ</div><div class="eo-desc"><strong>Sem custo.</strong> Combinamos o horário pelo WhatsApp.</div></div></div>'
  +'<div class="entrega-op'+(entregaSel==='uber'?' sel':'')+'" onclick="selEntrega(\'uber\',this)"><input type="radio" name="entrega" '+(entregaSel==='uber'?'checked':'')+'><div><div class="eo-titulo">Uber Flash (somente RJ)</div><div class="eo-desc">Envio rápido, <strong>entrega por conta do cliente</strong>.</div></div></div>'
  +'<div class="entrega-op'+(entregaSel==='correios'?' sel':'')+'" onclick="selEntrega(\'correios\',this)"><input type="radio" name="entrega" '+(entregaSel==='correios'?'checked':'')+'><div><div class="eo-titulo">Outro estado (Correios)</div><div class="eo-desc">Enviamos pelos Correios: <strong>consultamos o frete e o prazo antes de confirmar</strong>.</div></div></div>'
  +'</div>';
  html+='<div class="entrega-aviso">📦 <strong>Importante:</strong> fora do Rio de Janeiro, o pedido só é confirmado após o cálculo do frete e do prazo de envio. Vamos te passar o valor antes de qualquer pagamento.</div>';

  /* ---------- ENDEREÇO: LOGO ABAIXO DO AVISO DOS CORREIOS ---------- */
  html+='<div id="enderecoBlock" style="display:'+(entregaSel==='correios'?'block':'none')+';">'
  +'<div class="etapa-titulo">Endereço de entrega (Correios)</div>'
  +(end.cep?'<div style="font-size:12px;color:#0f7a44;font-weight:600;margin:-6px 0 8px;">✅ Preenchido do seu cadastro — confira antes de enviar</div>':'')
  +'<div class="campos-grid">'
  +'<div class="campo"><label>CEP <span>*</span></label><input type="text" id="cliCep" placeholder="00000-000" maxlength="9" inputmode="numeric" autocomplete="postal-code" value="'+m3lEscAttr(m3lFormatarCepCheckout(end.cep))+'" oninput="mascaraCep(this);buscarCepCheckout(this.value)"></div>'
  +'<div class="campo"><label>Cidade / UF <span>*</span></label><input type="text" id="cliCidade" placeholder="Cidade - UF" autocomplete="address-level2" value="'+m3lEscAttr(ciduf)+'"></div>'
  +'<div class="campo full"><label>Rua / Endereço <span>*</span></label><input type="text" id="cliRua" placeholder="Rua, avenida..." autocomplete="address-line1" value="'+m3lEscAttr(end.rua||'')+'"></div>'
  +'<div class="campo"><label>Número <span>*</span></label><input type="text" id="cliNumero" placeholder="Nº" inputmode="numeric" autocomplete="address-line2" value="'+m3lEscAttr(end.numero||'')+'"></div>'
  +'<div class="campo"><label>Bairro <span>*</span></label><input type="text" id="cliBairro" placeholder="Bairro" autocomplete="address-level3" value="'+m3lEscAttr(end.bairro||'')+'"></div>'
  +'<div class="campo full"><label>Complemento (opcional)</label><input type="text" id="cliComp" placeholder="Apto, bloco, referência..." autocomplete="address-line3" value="'+m3lEscAttr(end.comp||end.complemento||'')+'"></div>'
  +'</div></div>';

  /* ---------- HORÁRIO (só retirada/uber) ---------- */
  html+='<div id="horarioBlock" style="display:'+(entregaSel==='correios'?'none':'block')+';">'
  +'<div class="etapa-titulo">Horário preferido de retirada ou envio</div>'
  +'<div class="entrega-opcoes">'
  +'<div class="hor-op'+(horarioSel==='manha'?' sel':'')+'" onclick="selHorario(\'manha\',this)"><input type="radio" name="horario" '+(horarioSel==='manha'?'checked':'')+'><div><div class="eo-titulo">Manhã (09h às 12h)</div><div class="eo-desc">Sem custo adicional.</div></div></div>'
  +'<div class="hor-op'+(horarioSel==='tarde'?' sel':'')+'" onclick="selHorario(\'tarde\',this)"><input type="radio" name="horario" '+(horarioSel==='tarde'?'checked':'')+'><div><div class="eo-titulo">Tarde (14h às 17h)</div><div class="eo-desc">Sem custo adicional.</div></div></div>'
  +'<div class="hor-op'+(horarioSel==='noturno'?' sel':'')+'" onclick="selHorario(\'noturno\',this)"><input type="radio" name="horario" '+(horarioSel==='noturno'?'checked':'')+'><div><div class="eo-titulo">Noturno (19h às 22h) <b style="color:#f26522;">+ R$ 10,00</b></div><div class="eo-desc">Mediante disponibilidade, taxa de horário estendido.</div></div></div>'
  +'</div></div>';

  /* ---------- FORMA DE PAGAMENTO ---------- */
  html+='<div class="etapa-titulo">Forma de pagamento</div>';
  html+='<div class="entrega-opcoes" id="pagamentoOpcoes">'
  +'<div class="entrega-op'+(pagamentoSel==='pix'?' sel':'')+'" onclick="selPagamento(\'pix\',this)"><input type="radio" name="pagamento" '+(pagamentoSel==='pix'?'checked':'')+'><div><div class="eo-titulo">PIX 💚</div><div class="eo-desc"><strong>5% de desconto</strong> — QR Code gerado na hora. Seu pedido fica registrado e você acompanha pelo site.</div></div></div>'
  +'<div class="entrega-op'+(pagamentoSel==='cartao'?' sel':'')+'" onclick="selPagamento(\'cartao\',this)"><input type="radio" name="pagamento" '+(pagamentoSel==='cartao'?'checked':'')+'><div><div class="eo-titulo">Cartão de crédito 💳</div><div class="eo-desc">Até <strong>12x</strong> no checkout seguro do Mercado Pago. Sem o desconto do PIX.</div></div></div>'
  +'</div>';

  html+='<label class="check-item optin" style="margin-top:16px;background:#fff8f4;border:2px solid #f2b28f;border-radius:10px;padding:12px 14px;font-weight:800;color:#0f1e3d;cursor:pointer;"><input type="checkbox" id="cliConfirma"> Confirmo que meus dados, itens e endereço estão corretos <span style="color:#c0392b;">*</span></label>';
  html+='<div class="etapa-titulo">Observações (opcional)</div>';
  html+='<textarea class="nota-field" id="notaPedido" placeholder="Ex: prefiro retirar à tarde, presente, combinar outra cor..."></textarea>';
  html+='<button class="btn-finalizar" onclick="gerarPedido()">Gerar meu pedido</button>';
  return html;
}

function guardarNome(el){clienteDados.nome=el.value;}
function guardarFone(el){
  clienteDados.fone = el.value.replace(/\D/g, '');
  mascaraFone(el);
}
function mascaraFone(el){
  var d = el.value.replace(/\D/g, '').slice(0, 11);
  var v = '';
  if (d.length > 0) v = '(' + d.slice(0, 2);
  if (d.length > 2) v += ') ' + d.slice(2, 7);
  if (d.length > 6) v += '-' + d.slice(7, 11);
  el.value = v;
}

/* ===== Entrega: mostra endereço, preenche o que estiver vazio e foca o CEP ===== */
function selEntrega(v,el){
  entregaSel=v;
  document.querySelectorAll('#entregaOpcoes .entrega-op').forEach(function(o){o.classList.remove('sel');});
  el.classList.add('sel');
  var inp=el.querySelector('input');
  if(inp)inp.checked=true;

  var eb=document.getElementById('enderecoBlock');
  if(eb)eb.style.display=(v==='correios')?'block':'none';
  var hb=document.getElementById('horarioBlock');
  if(hb)hb.style.display=(v==='correios')?'none':'block';

  if(v==='correios'){
    preencherEnderecoSeVazio();
    if(eb){
      try{eb.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}
      var cep=document.getElementById('cliCep');
      if(cep&&!cep.value){
        setTimeout(function(){try{cep.focus();}catch(e){}},140);
      }
    }
  }
}

/* ===== Seleção Pix / Cartão: troca o total na hora (5% só no PIX) ===== */
function selPagamento(v,el){
  pagamentoSel=v;
  document.querySelectorAll('#pagamentoOpcoes .entrega-op').forEach(function(o){o.classList.remove('sel');});
  el.classList.add('sel');
  var inp=el.querySelector('input');
  if(inp)inp.checked=true;
  atualizarTotalResumo();
}

function mascaraCep(el){
  var d=el.value.replace(/\D/g,'').slice(0,8);
  var v=d;
  if(d.length>5)v=d.slice(0,5)+'-'+d.slice(5);
  el.value=v;
}

/* ===== Busca automática de CEP no checkout (ViaCEP) =====
   Só preenche campo vazio — nunca sobrescreve o que o cliente digitou
   ou o endereço que veio do cadastro. */
var cepTimerCheckout=null;
function buscarCepCheckout(valor){
  var d=String(valor||'').replace(/\D/g,'');
  clearTimeout(cepTimerCheckout);
  if(d.length!==8)return;
  cepTimerCheckout=setTimeout(function(){
    fetch('https://viacep.com.br/ws/'+d+'/json/')
    .then(function(r){return r.json();})
    .then(function(dd){
      if(!dd||dd.erro||!dd.logradouro)return;
      var rua=document.getElementById('cliRua');
      if(rua&&!rua.value.trim())rua.value=dd.logradouro||'';
      var bai=document.getElementById('cliBairro');
      if(bai&&!bai.value.trim())bai.value=dd.bairro||'';
      var cid=document.getElementById('cliCidade');
      if(cid&&!cid.value.trim())cid.value=(dd.localidade||'')+(dd.uf?(' - '+dd.uf):'');
      salvarDadosPerfil();
    })
    .catch(function(){});
  },400);
}

/* Preenche os campos de endereço ainda vazios com o dado resolvido
   (cadastro ou cache local). Chamado ao clicar em Correios. */
function preencherEnderecoSeVazio(){
  var d=dadosCheckout();
  var end=d.end||{};
  var set=function(id,val){
    var el=document.getElementById(id);
    if(el&&!String(el.value||'').trim()&&val)el.value=val;
  };
  set('cliCep',m3lFormatarCepCheckout(end.cep));
  set('cliRua',end.rua||'');
  set('cliNumero',end.numero||'');
  set('cliBairro',end.bairro||'');
  set('cliCidade',((end.cidade||'')+(end.uf?(' - '+end.uf):'')));
  set('cliComp',end.comp||end.complemento||'');
}

/* Se o perfil chegar com o checkout já aberto, completa os campos vazios
   em vez de re-renderizar (preserva o que o cliente digitou). */
function preencherCamposCheckoutSeVazios(){
  var ov=document.getElementById('modalOverlay');
  if(!ov||!ov.classList.contains('open'))return;
  var d=dadosCheckout();
  var set=function(id,val){
    var el=document.getElementById(id);
    if(el&&!String(el.value||'').trim()&&val)el.value=val;
  };
  set('cliNome',d.nome);
  set('cliFone',m3lFormatarFoneCheckout(d.fone));
  preencherEnderecoSeVazio();

  if(String(clienteDados.nome||'').trim()===''&&d.nome)clienteDados.nome=d.nome;
  if(String(clienteDados.fone||'').replace(/\D/g,'')===''&&d.fone)clienteDados.fone=String(d.fone).replace(/\D/g,'');
}
document.addEventListener('m3l-user-changed',function(){
  sincronizarClienteDados();
  preencherCamposCheckoutSeVazios();
});

function selHorario(v,el){
  horarioSel=v;
  document.querySelectorAll('.hor-op').forEach(function(o){o.classList.remove('sel');});
  el.classList.add('sel');
  var inp=el.querySelector('input');
  if(inp)inp.checked=true;
  atualizarTotalResumo();
}

/* ===== Persistência: grava no perfil o que o cliente digitou ===== */
function salvarDadosPerfil(){
  if(typeof window.m3lSalvarPerfil!=='function')return;
  var g=function(id){var el=document.getElementById(id);return el?String(el.value||'').trim():'';};
  var ciduf=g('cliCidade');
  var partes=ciduf.split(' - ');
  window.m3lSalvarPerfil({
    whatsapp:String(clienteDados.fone||'').replace(/\D/g,''),
    cep:g('cliCep').replace(/\D/g,''),
    rua:g('cliRua'),
    numero:g('cliNumero'),
    bairro:g('cliBairro'),
    cidade:(partes[0]||'').trim(),
    uf:(partes[1]||'').trim(),
    complemento:g('cliComp')
  }).catch(function(){});
}
function ligarSalvamentoPerfil(){
  var body=document.getElementById('modalBody');
  if(!body)return;
  ['cliNome','cliFone','cliCep','cliRua','cliNumero','cliBairro','cliCidade','cliComp'].forEach(function(id){
    var el=document.getElementById(id);
    if(!el||el._m3lSalvaPerfil)return;
    el._m3lSalvaPerfil=true;
    el.addEventListener('focusout',function(){
      sincronizarClienteDados();
      salvarDadosPerfil();
    });
  });
}

/* ================= CUPOM ================= */
function cuponsUsados(){
  try{var l=JSON.parse(localStorage.getItem('m3l_cupons_usados')||'[]');return Array.isArray(l)?l:[];}catch(e){return [];}
}
function marcarCupomUsado(cod){
  if(!cod)return;
  var l=cuponsUsados();
  if(l.indexOf(cod)===-1){l.push(cod);localStorage.setItem('m3l_cupons_usados',JSON.stringify(l));}
}
function aplicarCupom(){
  var input=document.getElementById('cupomInput');
  var msg=document.getElementById('cupomMsg');
  var codigo=(input.value||'').trim().toUpperCase();
  var chip=document.getElementById('cupomAplicado');
  msg.className='cupom-msg';
  if(!codigo){msg.className='cupom-msg erro';msg.textContent='Digite um cupom para aplicar.';return;}
  if(chip)chip.remove();
  if(!CUPONS[codigo]){
    cupomAtivo=null;
    msg.className='cupom-msg erro';
    msg.textContent='Cupom não encontrado. Você ainda pode finalizar normalmente.';
    atualizarTotalResumo();
    return;
  }
  if(codigo==='MEUPRIMEIRO3D10'&&!m3lClienteLogado()){
    cupomAtivo=null;
    msg.className='cupom-msg erro';
    msg.textContent='🎟️ O cupom de primeira compra é exclusivo para clientes cadastrados — crie sua conta para usar.';
    atualizarTotalResumo();
    return;
  }
  if(cuponsUsados().indexOf(codigo)>-1){
    cupomAtivo=null;
    msg.className='cupom-msg erro';
    msg.textContent='Este cupom já foi utilizado — ele vale uma única vez.';
    atualizarTotalResumo();
    return;
  }
  var c=CUPONS[codigo];
  var desconto=c.tipo==='porcentagem'?totalCarrinho()*c.valor/100:Math.min(c.valor,totalCarrinho());
  cupomAtivo={codigo:codigo,desc:desconto};
  msg.className='cupom-msg ok';
  msg.textContent='Cupom aplicado com sucesso!';
  criarChipCupom();
  atualizarTotalResumo();
}
/* ===== Trava do cupom: campo cinza + botão vira Remover ===== */
function travarCampoCupom(travar){
  var inp=document.getElementById('cupomInput');
  var btn=document.querySelector('.btn-aplicar');
  if(inp){inp.disabled=travar;inp.style.background=travar?'#f0f2f6':'';inp.style.color=travar?'#9aa3b2':'';inp.style.cursor=travar?'not-allowed':'';}
  if(btn){
    if(travar){
      btn.textContent='Remover';
      btn.onclick=removerCupom;
      btn.style.opacity='';
      btn.style.cursor='pointer';
    }else{
      btn.textContent='Aplicar';
      btn.onclick=aplicarCupom;
      btn.style.opacity='';
      btn.style.cursor='';
    }
  }
}
function criarChipCupom(){
  if(!cupomAtivo||document.getElementById('cupomAplicado'))return;
  var linha=document.querySelector('.cupom-linha');
  if(!linha)return;
  var chip=document.createElement('span');
  chip.className='cupom-aplicado';
  chip.id='cupomAplicado';
  chip.innerHTML='🎟️ '+cupomAtivo.codigo+' · -'+fmt(cupomAtivo.desc)+' <button onclick="removerCupom()" title="Remover cupom">✕</button>';
  linha.parentElement.appendChild(chip);
  travarCampoCupom(true);
}
function removerCupom(){
  cupomAtivo=null;
  var chip=document.getElementById('cupomAplicado');
  if(chip)chip.remove();
  var msg=document.getElementById('cupomMsg');
  if(msg){msg.className='cupom-msg';msg.textContent='';}
  var inp=document.getElementById('cupomInput');
  if(inp)inp.value='';
  travarCampoCupom(false);
  atualizarTotalResumo();
}
function restaurarCupomUI(){
  criarChipCupom();
  atualizarTotalResumo();
}
function atualizarTotalResumo(){
  var el=document.querySelector('.resumo-total .valor');
  if(el)el.textContent=fmt(totalFinal());
  document.querySelectorAll('.resumo-item.desc').forEach(function(l){l.remove();});
  document.querySelectorAll('.resumo-item.taxa').forEach(function(l){l.remove();});
  if(horarioSel==='noturno'){
    var boxt=document.querySelector('.resumo-total');
    if(boxt){
      var linhat=document.createElement('div');
      linhat.className='resumo-item taxa';
      linhat.innerHTML='<span class="ri-nome">Taxa horário noturno</span><span style="color:#f26522;font-weight:700;">+'+fmt(TAXA_NOTURNO)+'</span>';
      boxt.parentElement.insertBefore(linhat,boxt);
    }
  }
  if(cupomAtivo){
    var box=document.querySelector('.resumo-total');
    if(box){
      var d=document.createElement('div');
      d.className='resumo-item desc';
      d.innerHTML='<span class="ri-nome">Cupom '+cupomAtivo.codigo+'</span><span style="color:#0f7a44;font-weight:700;">-'+fmt(cupomAtivo.desc)+'</span>';
      box.parentElement.insertBefore(d,box);
    }
  }
  if(descontoPix()>0){
    var boxp=document.querySelector('.resumo-total');
    if(boxp){
      var dpix=document.createElement('div');
      dpix.className='resumo-item desc';
      dpix.innerHTML='<span class="ri-nome">Desconto PIX (5%)</span><span style="color:#0f7a44;font-weight:700;">-'+fmt(descontoPix())+'</span>';
      boxp.parentElement.insertBefore(dpix,boxp);
    }
  }
}

function abrirModal(){document.getElementById('modalOverlay').classList.add('open');floatsOcultar();}
function fecharModal(){document.getElementById('modalOverlay').classList.remove('open');floatsMostrar();pedidoAtual=null;entregaSel='retirada';horarioSel='manha';pagamentoSel='pix';cupomAtivo=null;m3lSemCadastro=false;}

/* ============================================================
   PIX — PEDIDO REGISTRADO (Opção A)
   Fluxo: cria pedido → mostra QR + código → cliente "Já paguei"
   → acompanhar.html?pedido=CODIGO
   ============================================================ */

/* Guarda o código do pedido no navegador do cliente */
function guardarPedidoLocal(codigo, dados){
  try{
    var l = JSON.parse(localStorage.getItem('m3l_meus_pedidos') || '[]');
    if(!Array.isArray(l)) l = [];
    l = l.filter(function(x){ return x && x.codigo !== codigo; });
    l.unshift({ codigo: codigo, quando: Date.now(), total: dados && dados.total });
    localStorage.setItem('m3l_meus_pedidos', JSON.stringify(l.slice(0, 12)));
  }catch(e){}
}

/* Vai para a página de acompanhamento */
function irParaAcompanhamento(codigo){
  guardarPedidoLocal(codigo, { total: totalFinal() });
  try{ carrinho.length = 0; if(typeof salvarCarrinho === 'function') salvarCarrinho(); }catch(e){}
  fecharModal();
  location.href = 'acompanhar.html?pedido=' + encodeURIComponent(codigo);
}

/* Monta o bloco visual do Pix: código + QR + copia-e-cola + botão "Já paguei" */
function blocoPixPedido(codigo, valor, textoPix){
  var h = '';
  h += '<div style="text-align:center;padding:8px 0 4px;">';
  h += '<div style="display:inline-block;background:#e8f5ee;color:#1d7a45;font-size:12px;font-weight:800;padding:6px 16px;border-radius:20px;margin-bottom:14px;">💚 PAGUE COM PIX</div>';
  h += '<div style="background:#f5f7fa;border:1.5px dashed #c6cfdd;border-radius:12px;padding:14px;margin-bottom:14px;">';
  h += '<div style="font-size:11px;font-weight:700;color:#8a94a8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Número do pedido</div>';
  h += '<div style="font-size:19px;font-weight:800;color:#0f1e3d;letter-spacing:1px;">' + codigo + '</div>';
  h += '</div>';
  h += '<div id="pixQrBox" style="display:flex;justify-content:center;margin-bottom:14px;"></div>';
  h += '<div style="font-size:13px;color:#4a5161;margin-bottom:4px;">Valor a pagar</div>';
  h += '<div style="font-size:26px;font-weight:800;color:#f26522;margin-bottom:14px;">' + fmt(valor) + '</div>';
  if(textoPix){
    h += '<div style="display:flex;gap:6px;margin-bottom:14px;">';
    h += '<input type="text" id="pixCopiaCola" readonly value="' + String(textoPix).replace(/"/g,'&quot;') + '" style="flex:1;min-width:0;padding:10px;border:1.5px solid #dde3ee;border-radius:8px;font-size:11px;font-family:monospace;color:#4a5161;background:#fff;">';
    h += '<button type="button" onclick="copiarPixCopiaCola()" style="padding:10px 14px;border:none;border-radius:8px;background:#0f1e3d;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">Copiar</button>';
    h += '</div>';
  }
  h += '<button type="button" onclick="marcarPixPago(\'' + codigo + '\')" style="width:100%;box-sizing:border-box;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#1d8a4f,#23a95f);color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(29,138,79,.35);margin-bottom:10px;">✅ Já paguei</button>';
  h += '<p style="font-size:11.5px;color:#8a94a8;line-height:1.5;margin:0;">Assim que confirmarmos o pagamento, o status muda em <strong>Acompanhar pedido</strong>. Você pode fechar esta janela.</p>';
  h += '</div>';
  return h;
}

/* Desenha o QR no div #pixQrBox (usa qrcodejs já carregado no loja.html) */
function desenharQrPix(textoPix){
  var box = document.getElementById('pixQrBox');
  if(!box || !textoPix) return;
  box.innerHTML = '';
  if(typeof QRCode === 'undefined'){
    box.innerHTML = '<div style="font-size:12px;color:#8a94a8;">QR indisponível — use o código copia e cola.</div>';
    return;
  }
  new QRCode(box, {
    text: textoPix,
    width: 190,
    height: 190,
    colorDark: '#0f1e3d',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function copiarPixCopiaCola(){
  var inp = document.getElementById('pixCopiaCola');
  if(!inp) return;
  inp.select();
  try{ document.execCommand('copy'); }catch(e){}
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(inp.value).catch(function(){});
  }
  if(typeof mostrarToast === 'function') mostrarToast('Código Pix copiado!', 'ok');
}

/* Cliente clica "Já paguei" */
function marcarPixPago(codigo){
  var btn = document.querySelector('#modalBody button[onclick*="marcarPixPago"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Registrando...'; }
  fetch(API_LOJA + '/pedidos/' + encodeURIComponent(codigo) + '/informar-pagamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(function(r){ return r.json().then(function(t){ return { ok: r.ok, t: t }; }); })
  .then(function(res){
    if(res.ok){
      irParaAcompanhamento(codigo);
    }else{
      if(btn){ btn.disabled = false; btn.textContent = '✅ Já paguei'; }
      if(typeof mostrarToast === 'function') mostrarToast('Não foi possível registrar. Tente novamente.', 'erro');
    }
  })
  .catch(function(){
    if(btn){ btn.disabled = false; btn.textContent = '✅ Já paguei'; }
    if(typeof mostrarToast === 'function') mostrarToast('Erro de conexão. Tente novamente.', 'erro');
  });
}