
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','G-NZTH0ZSLV0');


function fnAlvoLoja(){var g=document.getElementById('lojaGrid');if(!g)return null;return g.closest('section')||g;}
window.togglePromoChip=function(){
  var cb=document.querySelector('.check-item input[value="promo"]');
  if(!cb)return;
  cb.checked=!cb.checked;
  if(typeof aplicarFiltros==='function')aplicarFiltros();
  var alvo=fnAlvoLoja();
  if(cb.checked&&alvo)alvo.scrollIntoView({behavior:'smooth',block:'start'});
};
window.sincronizaChip=function(){};
window.inicioLoja=function(){
  var b=document.getElementById('btnLimparTopo');
  if(b){b.click();}
  document.querySelectorAll('.check-item input').forEach(function(el){el.checked=false;});
  if(typeof aplicarFiltros==='function')aplicarFiltros();
  var alvo=fnAlvoLoja();
  if(alvo)alvo.scrollIntoView({behavior:'smooth',block:'start'});
};
window.contatoWa=function(){
  var a=document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
  if(a)window.open(a.href,'_blank');
};
window.addEventListener('load',function(){
  document.querySelectorAll('.check-item input').forEach(function(el){el.checked=false;});
  document.querySelectorAll('.check-item input[value="promo"]').forEach(function(el){var w=el.closest('.check-item');if(w)w.style.display='none';});
  var c=document.getElementById('chipContato');
  if(c&&!document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]'))c.style.display='none';
  if(document.querySelectorAll('.produto').length&&typeof aplicarFiltros==='function')aplicarFiltros();
});



(function(){
var i=0,total=3,timer;
var track=document.getElementById('bnrTrack');
var dots=document.getElementById('bnrDots');
for(var d=0;d<total;d++){var b=document.createElement('button');b.className='bnr-dot'+(d===0?' bnr-on':'');b.onclick=(function(n){return function(){bnrGo(n)};})(d);dots.appendChild(b);}
function render(){track.style.transform='translateX(-'+(i*100)+'%)';var ds=dots.children;for(var k=0;k<ds.length;k++){ds[k].className='bnr-dot'+(k===i?' bnr-on':'');}}
function reset(){clearInterval(timer);timer=setInterval(function(){i=(i+1)%total;render();},6000);}
window.bnrNav=function(n){i=(i+n+total)%total;render();reset();};
window.bnrGo=function(n){i=n;render();reset();};
var box=document.getElementById('bnrCarousel');
box.addEventListener('mouseenter',function(){clearInterval(timer);});
box.addEventListener('mouseleave',reset);
var x0=null;
box.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
box.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(dx>40)bnrNav(-1);else if(dx<-40)bnrNav(1);x0=null;});
reset();
})();


(function(){
var tent=0;
(function espera(){
  if(window.produtosLoja&&produtosLoja.length&&typeof abrirModalProduto==='function'){montar();return;}
  if(++tent<200)setTimeout(espera,150);
})();
function montar(){
  var lista=produtosLoja.filter(function(p){return (parseInt(p.estoque)||0)>0;});
 lista=lista.slice(-8).reverse();
  if(!lista.length)return;
  var track=document.getElementById('fnTrack');
  lista.forEach(function(p){
    var precoN=parseFloat(p.preco)||0;
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
    var preco=emPromo?parseFloat(p.precoPromo):precoN;
    var card=document.createElement('div');
    card.className='fn-card';
    var html='<div class="fn-card-img"><span class="fn-badge">NOVO</span>'+(emPromo?'<span class="fn-promo">-'+Math.round((1-preco/precoN)*100)+'%</span>':'');
    if(p.imagens&&p.imagens.length){html+='<img src="'+p.imagens[0]+'" alt="'+escL(p.nome)+'" loading="lazy">';}
    else{html+='<div style="font-size:40px;text-align:center;padding-top:45px;">📦</div>';}
    html+='</div><div class="fn-card-body"><h4>'+escL(p.nome)+'</h4><div class="fn-preco">'+(emPromo?'<span class="antigo">R$ '+precoLabel(precoN)+'</span><span class="promo">R$ '+precoLabel(preco)+'</span>':'R$ '+precoLabel(precoN))+'</div></div>';
    card.innerHTML=html;
    card.onclick=function(){abrirModalProduto(p.slug);};
    track.appendChild(card);
  });
  document.getElementById('faixaNovidades').style.display='block';
}
window.fnScroll=function(d){
  var t=document.getElementById('fnTrack');
  t.scrollBy({left:d*(t.clientWidth*0.8),behavior:'smooth'});
};
})();


/* ================= ESTADO ================= */
var API_PEDIDOS='https://meu3dlabs-backend.onrender.com/api/loja/pedidos';
var carrinho=[];
try{carrinho=JSON.parse(localStorage.getItem('m3d_carrinho')||'[]');}catch(e){carrinho=[];}
var pedidoAtual=null;
var entregaSel='retirada';
var horarioSel='manha';
var TAXA_NOTURNO=10;
var cupomAtivo=null;
var clienteDados={nome:'',fone:''};
/* ================= CUPONS (estrutura pronta) ================= */
var CUPONS={
 /* Formato para ativar cupons futuramente (sem precisar mexer na estrutura):
 'BEMVINDO10': {tipo:'porcentagem', valor:10},
 'M3D5': {tipo:'fixo', valor:5}
 */
};
/* ================= VARIANTES ================= */
document.querySelectorAll('.produto').forEach(function(produto){
var sw=produto.querySelector('.variantes-lista');
if(!sw)return;
var track=produto.querySelector('.variante-track');
var swatches=sw.querySelectorAll('.sw');
function atualizar(idx){
track.style.transform='translateX(-'+idx*100+'%)';
swatches.forEach(function(s){s.classList.toggle('ativo',parseInt(s.getAttribute('data-idx'))===idx);});
var ativo=swatches[idx];
if(ativo){
produto.setAttribute('data-cor-label',ativo.getAttribute('data-cor-label'));
var corEl=produto.querySelector('.produto-cor');
if(corEl){
var mini=corEl.querySelector('.mini-swatch');
if(mini)mini.style.background=ativo.style.background||ativo.getAttribute('data-cor-label');
corEl.childNodes.forEach(function(n){if(n.nodeType===3)n.textContent=' '+ativo.getAttribute('data-cor-label');});
}
}
}
swatches.forEach(function(s){
s.addEventListener('click',function(e){
e.stopPropagation();
atualizar(parseInt(s.getAttribute('data-idx')));
});
});
if(window.matchMedia('(pointer: coarse)').matches){
var toque=0;
produto.addEventListener('click',function(e){
if(e.target.closest('.btn-comprar'))return;
if(!e.target.closest('.variantes-lista')){
toque++;
if(toque===1){
sw.classList.add('show');
setTimeout(function(){toque=0;},3000);
}
}
});
document.addEventListener('click',function(e){
if(!e.target.closest(produto)){sw.classList.remove('show');}
});
}
});
/* ================= CARRINHO ================= */
function pNome(id){var p=document.querySelector('.produto[data-id="'+id+'"]');return p?p.querySelector('.variantes-lista'):null;}
function produtoInfo(id){
var p=document.querySelector('.produto[data-id="'+id+'"]');
if(!p)return null;
return {nome:p.getAttribute('data-nome'),img:(p.querySelector('.variante-track img')||{getAttribute:function(){return '';}}).getAttribute('src')};
}
function addCarrinho(id,nome,precoLabel,precoNum){
var info=produtoInfo(id);
var img=info?info.img:'';
var cor='';
var sw=pNome(id);
if(sw&&sw.querySelector('.sw.ativo')){
cor=sw.querySelector('.sw.ativo').getAttribute('data-cor-label');
}
var chave=id+'|'+cor;
var achou=false;
carrinho.forEach(function(item){
if(item.chave===chave){item.qtd++;achou=true;}
});
if(!achou){
carrinho.push({chave:chave,id:id,nome:nome,cor:cor,precoNum:parseFloat(precoNum),precoLabel:precoLabel,qtd:1,img:img});
}
salvarCarrinho();
atualizarCarrinhoUI();
abrirCarrinho();
if(window.gtag)gtag('event','add_to_cart',{currency:'BRL',value:precoNum,items:[{item_id:id,item_name:nome,item_variant:cor||'',quantity:1,price:precoNum}]});
}
function removerItem(chave){
carrinho=carrinho.filter(function(i){return i.chave!==chave;});
salvarCarrinho();atualizarCarrinhoUI();
}
function mudarQtd(chave,delta){
carrinho.forEach(function(item){
if(item.chave===chave){
item.qtd+=delta;
if(item.qtd<1)item.qtd=1;
}
});
salvarCarrinho();atualizarCarrinhoUI();
}
function salvarCarrinho(){
localStorage.setItem('m3d_carrinho',JSON.stringify(carrinho));
}
function totalCarrinho(){
var t=0;carrinho.forEach(function(i){t+=i.precoNum*i.qtd;});return t;
}
function fmt(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function cupomDesconto(){return cupomAtivo?cupomAtivo.desc:0;}
function totalFinal(){var t=totalCarrinho()-cupomDesconto()+(horarioSel==='noturno'?TAXA_NOTURNO:0);return t<0?0:t;}
function atualizarCarrinhoUI(){
var n=0;carrinho.forEach(function(i){n+=i.qtd;});
var badge=document.getElementById('carrinhoBadge');
badge.textContent=n;badge.classList.toggle('show',n>0);
var body=document.getElementById('cartBody');
var footer=document.getElementById('cartFooter');
if(n===0){
cupomAtivo=null;
body.innerHTML='<div class="cart-vazio"><div class="cv-icon">🛒</div><p>Seu carrinho está vazio.</p><p style="font-size:13px;margin-top:6px;">Adicione peças da loja para começar.</p></div>';
footer.style.display='none';
return;
}
var html='';
carrinho.forEach(function(item){
html+='<div class="cart-item">'
+'<img src="'+item.img+'" alt="'+item.nome.replace(/"/g,'&quot;')+'">'
+'<div class="ci-info">'
+'<div class="ci-nome">'+item.nome+(item.cor?' <span style="color:var(--gray);font-weight:500;">('+item.cor+')</span>':'')+'</div>'
+'<div class="ci-preco">'+item.precoLabel+'</div>'
+'<div class="ci-qtd"><button onclick="mudarQtd(\''+item.chave+'\',-1)">−</button><span>'+item.qtd+'</span><button onclick="mudarQtd(\''+item.chave+'\',1)">+</button></div>'
+'</div>'
+'<button class="ci-remove" onclick="removerItem(\''+item.chave+'\')">Remover</button>'
+'</div>';
});
body.innerHTML=html;
footer.style.display='block';
document.getElementById('cartTotal').textContent=fmt(totalCarrinho());
}
function abrirCarrinho(){document.getElementById('cartDrawer').classList.add('open');document.getElementById('cartOverlay').classList.add('open');}
function fecharCarrinho(){document.getElementById('cartDrawer').classList.remove('open');document.getElementById('cartOverlay').classList.remove('open');}
/* ================= CHECKOUT ================= */
function abrirCheckout(){
if(totalCarrinho()<=0)return;
fecharCarrinho();
document.getElementById('modalTitulo').textContent='Finalizar pedido';
document.getElementById('modalBody').innerHTML=etapaResumo();
restaurarCupomUI();
abrirModal();
if(window.gtag)gtag('event','begin_checkout',{currency:'BRL',value:totalFinal()});
}
function etapaResumo(){
var html='';
html+='<div class="erro-box" id="erroBox"></div>';
html+='<div class="etapa-titulo">Seus dados</div>';
html+='<div class="campos-grid">'
+'<div class="campo"><label>Nome completo <span>*</span></label><input type="text" id="cliNome" placeholder="Seu nome" autocomplete="name" value="'+clienteDados.nome.replace(/"/g,'&quot;')+'" oninput="guardarNome(this)"></div>'
+'<div class="campo"><label>Celular / WhatsApp <span>*</span></label><input type="tel" id="cliFone" placeholder="(21) 99999-9999" maxlength="16" autocomplete="tel" value="'+clienteDados.fone.replace(/"/g,'&quot;')+'" oninput="guardarFone(this)"></div>'
+'</div>';
html+='<label class="check-item optin"><input type="checkbox" id="cliOptin"> Quero receber novidades e peças em estoque pelo WhatsApp</label>';
html+='<div class="etapa-titulo">Seus itens</div>';
carrinho.forEach(function(item){
html+='<div class="resumo-item"><span class="ri-nome">'+item.qtd+'x '+item.nome+(item.cor?' <span class="ri-cor">('+item.cor+')</span>':'')+'</span><span>'+fmt(item.precoNum*item.qtd)+'</span></div>';
});
html+='<div class="resumo-item"><span class="ri-nome">Subtotal</span><span>'+fmt(totalCarrinho())+'</span></div>';
html+='<div class="resumo-total"><span>Total</span><span class="valor">'+fmt(totalFinal())+'</span></div>';
html+='<div class="etapa-titulo">Cupom de desconto</div>';
html+='<div class="cupom-linha"><input type="text" id="cupomInput" placeholder="Digite seu cupom"><button class="btn-aplicar" onclick="aplicarCupom()">Aplicar</button></div>';
html+='<div class="cupom-msg" id="cupomMsg"></div>';
html+='<div class="etapa-titulo">Forma de entrega</div>';
html+='<div class="entrega-opcoes">'
+'<div class="entrega-op'+(entregaSel==='retirada'?' sel':'')+'" onclick="selEntrega(\'retirada\',this)"><input type="radio" name="entrega" '+(entregaSel==='retirada'?'checked':'')+'><div><div class="eo-titulo">Retirada em Nilópolis/RJ</div><div class="eo-desc"><strong>Sem custo.</strong> Combinamos o horário pelo WhatsApp.</div></div></div>'
+'<div class="entrega-op'+(entregaSel==='uber'?' sel':'')+'" onclick="selEntrega(\'uber\',this)"><input type="radio" name="entrega" '+(entregaSel==='uber'?'checked':'')+'><div><div class="eo-titulo">Uber Flash (somente RJ)</div><div class="eo-desc">Envio rápido, <strong>entrega por conta do cliente</strong>.</div></div></div>'
+'<div class="entrega-op'+(entregaSel==='correios'?' sel':'')+'" onclick="selEntrega(\'correios\',this)"><input type="radio" name="entrega" '+(entregaSel==='correios'?'checked':'')+'><div><div class="eo-titulo">Outro estado (Correios)</div><div class="eo-desc">Enviamos pelos Correios: <strong>consultamos o frete e o prazo antes de confirmar</strong>.</div></div></div>'
+'</div>';
html+='<div class="entrega-aviso">📦 <strong>Importante:</strong> fora do Rio de Janeiro, o pedido só é confirmado após o cálculo do frete e do prazo de envio. Vamos te passar o valor antes de qualquer pagamento.</div>';
html+='<div class="etapa-titulo">Forma de pagamento</div>';
html+='<div class="entrega-opcoes">'
+'<div class="entrega-op sel"><input type="radio" name="pagamento" checked><div><div class="eo-titulo">PIX</div><div class="eo-desc">QR code e chave na confirmação do pedido. Envie o comprovante no WhatsApp.</div></div></div>'
+'</div>';
html+='<div id="horarioBlock" style="display:'+(entregaSel==='correios'?'none':'block')+';">'
+'<div class="etapa-titulo">Horário preferido de retirada ou envio</div>'
+'<div class="entrega-opcoes">'
+'<div class="hor-op sel" onclick="selHorario(\'manha\',this)"><input type="radio" name="horario" checked><div><div class="eo-titulo">Manhã (09h às 12h)</div><div class="eo-desc">Sem custo adicional.</div></div></div>'
+'<div class="hor-op" onclick="selHorario(\'tarde\',this)"><input type="radio" name="horario"><div><div class="eo-titulo">Tarde (14h às 17h)</div><div class="eo-desc">Sem custo adicional.</div></div></div>'
+'<div class="hor-op" onclick="selHorario(\'noturno\',this)"><input type="radio" name="horario"><div><div class="eo-titulo">Noturno (19h às 22h) <b style="color:#f26522;">+ R$ 10,00</b></div><div class="eo-desc">Mediante disponibilidade, taxa de horário estendido.</div></div></div>'
+'</div></div>';
html+='<div id="enderecoBlock" style="display:'+(entregaSel==='correios'?'block':'none')+';">'
+'<div class="etapa-titulo">Endereço de entrega (Correios)</div>'
+'<div class="campos-grid">'
+'<div class="campo"><label>CEP <span>*</span></label><input type="text" id="cliCep" placeholder="00000-000" maxlength="9" oninput="mascaraCep(this)"></div>'
+'<div class="campo"><label>Cidade / UF <span>*</span></label><input type="text" id="cliCidade" placeholder="Cidade - UF"></div>'
+'<div class="campo full"><label>Rua / Endereço <span>*</span></label><input type="text" id="cliRua" placeholder="Rua, avenida..."></div>'
+'<div class="campo"><label>Número <span>*</span></label><input type="text" id="cliNumero" placeholder="Nº"></div>'
+'<div class="campo"><label>Bairro <span>*</span></label><input type="text" id="cliBairro" placeholder="Bairro"></div>'
+'<div class="campo full"><label>Complemento (opcional)</label><input type="text" id="cliComp" placeholder="Apto, bloco, referência..."></div>'
+'</div></div>';
html+='<label class="check-item optin" style="margin-top:14px;"><input type="checkbox" id="cliConfirma"> Confirmo que meus dados, itens e endereço estão corretos <span style="color:#c0392b;">*</span></label>';
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
function selEntrega(v,el){
entregaSel=v;
document.querySelectorAll('.entrega-op').forEach(function(o){o.classList.remove('sel');});
el.classList.add('sel');
var inp=el.querySelector('input');inp.checked=(inp.value==='estoque'||inp.value==='ultimas'||inp.value==='zero'||inp.value==='promo');
var eb=document.getElementById('enderecoBlock');
if(eb)eb.style.display=(v==='correios')?'block':'none';
var hb=document.getElementById('horarioBlock');
if(hb)hb.style.display=(v==='correios')?'none':'block';
}
function mascaraCep(el){
var d=el.value.replace(/\D/g,'').slice(0,8);
var v=d;
if(d.length>5)v=d.slice(0,5)+'-'+d.slice(5);
el.value=v;
}
function selHorario(v,el){
horarioSel=v;
document.querySelectorAll('.hor-op').forEach(function(o){o.classList.remove('sel');});
el.classList.add('sel');
var inp=el.querySelector('input');inp.checked=(inp.value==='estoque'||inp.value==='ultimas'||inp.value==='zero'||inp.value==='promo');
atualizarTotalResumo();
}
/* ================= CUPOM ================= */
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
var c=CUPONS[codigo];
var desconto=c.tipo==='porcentagem'?totalCarrinho()*c.valor/100:Math.min(c.valor,totalCarrinho());
cupomAtivo={codigo:codigo,desc:desconto};
msg.className='cupom-msg ok';
msg.textContent='Cupom aplicado com sucesso!';
criarChipCupom();
atualizarTotalResumo();
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
}
function removerCupom(){
cupomAtivo=null;
var chip=document.getElementById('cupomAplicado');
if(chip)chip.remove();
var msg=document.getElementById('cupomMsg');
if(msg){msg.className='cupom-msg';msg.textContent='';}
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
}
/* ================= PEDIDO ================= */
function arred(v){return Math.round(v*100)/100;}
function gerarPedido(){
var erroBox=document.getElementById('erroBox');
var inputNome=document.getElementById('cliNome');
var inputFone=document.getElementById('cliFone');
var nome=(inputNome?inputNome.value.trim():'');
var fone=(inputFone?inputFone.value.replace(/\D/g,''):'');
var optin=document.getElementById('cliOptin')?document.getElementById('cliOptin').checked:false;
var nota=document.getElementById('notaPedido')?document.getElementById('notaPedido').value.trim():'';
erroBox.classList.remove('show');erroBox.textContent='';
if(inputNome)inputNome.classList.remove('erro');
if(inputFone)inputFone.classList.remove('erro');
if(nome.length<3){
erroBox.textContent='Informe seu nome completo para gerar o pedido.';
erroBox.classList.add('show');
if(inputNome)inputNome.classList.add('erro');
return;
}
if(fone.length<10){
erroBox.textContent='Informe um celular válido com DDD. Exemplo: (21) 99999-9999.';
erroBox.classList.add('show');
if(inputFone)inputFone.classList.add('erro');
return;
}
var confirma=document.getElementById('cliConfirma')?document.getElementById('cliConfirma').checked:false;
if(!confirma){
erroBox.textContent='Marque a confirmação de que seus dados estão corretos para gerar o pedido.';
erroBox.classList.add('show');
return;
}
var endereco='';
if(entregaSel==='correios'){
var cep=document.getElementById('cliCep')?document.getElementById('cliCep').value.trim():'';
var cidade=document.getElementById('cliCidade')?document.getElementById('cliCidade').value.trim():'';
var rua=document.getElementById('cliRua')?document.getElementById('cliRua').value.trim():'';
var num=document.getElementById('cliNumero')?document.getElementById('cliNumero').value.trim():'';
var bairro=document.getElementById('cliBairro')?document.getElementById('cliBairro').value.trim():'';
var comp=document.getElementById('cliComp')?document.getElementById('cliComp').value.trim():'';
if(!cep||!cidade||!rua||!num||!bairro){
erroBox.textContent='Preencha o endereço completo (CEP, rua, número, bairro e cidade) para envio pelos Correios.';
erroBox.classList.add('show');
return;
}
endereco=rua+', '+num+' - '+bairro+' - '+cidade+' - CEP '+cep+(comp?' ('+comp+')':'');
}
var btn=document.querySelector('.btn-finalizar');
if(btn){btn.disabled=true;btn.textContent='Gerando pedido...';}
var numeroLocal='M3D-'+String(Math.floor(100000+Math.random()*900000));
var itens=carrinho.map(function(i){return {nome:i.nome,cor:i.cor||'',qtd:i.qtd,preco:i.precoNum};});
var payload={
nome_cliente:nome,
whatsapp:fone,
itens:itens,
subtotal:arred(totalCarrinho()),
cupom:cupomAtivo?cupomAtivo.codigo:null,
desconto:cupomAtivo?arred(cupomAtivo.desc):0,
total:arred(totalFinal()),
entrega:entregaSel,
endereco:endereco||null,
pagamento:'pix',
horario:entregaSel==='retirada'?horarioSel:null,
nota:nota||null,
optin:optin
};
function montarPedido(numero,registrado){
return {numero:numero,itens:itens,total:totalFinal(),subtotal:totalCarrinho(),cupom:cupomAtivo,entrega:entregaSel,endereco:endereco||'',pagamento:'pix',horario:entregaSel==='retirada'?horarioSel:null,nota:nota,nome:nome,fone:fone,optin:optin,registrado:registrado};
}
function limparCarrinhoAposPedido(){
  carrinho = [];
  salvarCarrinho();
  cupomAtivo = null;
  atualizarCarrinhoUI();
}
function mostrarPronto(){
  if(btn){btn.disabled=false;}
  if(pedidoAtual && pedidoAtual.registrado){
    limparCarrinhoAposPedido();
    if(window.gtag){gtag('event','purchase',{currency:'BRL',value:pedidoAtual.total,transaction_id:pedidoAtual.numero,items:(pedidoAtual.itens||[]).map(function(i){return {item_name:i.nome,item_variant:i.cor||'',price:i.preco,quantity:i.qtd};})});}
  }
  document.getElementById('modalTitulo').textContent='Pedido gerado';
  document.getElementById('modalBody').innerHTML=etapaPedido(pedidoAtual);
  mostrarPix(pedidoAtual.total);
}
fetch(API_PEDIDOS,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(payload)
})
.then(function(r){return r.json().then(function(d){return {ok:r.ok,dados:d};});})
.then(function(res){
if(!res.ok)throw new Error('api');
pedidoAtual=montarPedido((res.dados&&res.dados.pedido_id)?res.dados.pedido_id:numeroLocal,true);
mostrarPronto();
})
.catch(function(){
pedidoAtual=montarPedido(numeroLocal,false);
mostrarPronto();
});
}
function entregaTexto(e){
if(e==='retirada')return 'Retirada em Nilópolis/RJ';
if(e==='uber')return 'Uber Flash (por conta do cliente)';
return 'Correios (fora do RJ, aguardando frete)';
}
function etapaPedido(p){
var html='<div class="pedido-ok">'
+'<div class="ok-icon">✅</div>'
+'<h3>Pedido gerado com sucesso!</h3>'
+'<p>Guarde o número abaixo e envie no WhatsApp para confirmar.</p>'
+'<div class="pedido-numero"><span>#</span>'+p.numero+'<button class="btn-copiar-codigo" onclick="copiarCodigoPedido(\''+p.numero+'\')">📋 Copiar código</button></div>'
+'<div class="resumo-clean">'
+'<div class="rc-secao">'
+'<div class="rc-titulo">Seus dados</div>'
+'<div class="rc-linha"><span>Cliente</span><strong>'+p.nome+'</strong></div>'
+'<div class="rc-linha"><span>WhatsApp</span><strong>'+p.fone+'</strong></div>'
+'</div>'
+'<div class="rc-secao">'
+'<div class="rc-titulo">Itens</div>';
p.itens.forEach(function(i){
html+='<div class="rc-linha"><span>'+i.qtd+'x '+i.nome+(i.cor?' <em>('+i.cor+')</em>':'')+'</span><strong>'+fmt(i.preco*i.qtd)+'</strong></div>';
});
html+='</div>'
+'<div class="rc-secao">'
+'<div class="rc-linha"><span>Subtotal</span><strong>'+fmt(p.subtotal)+'</strong></div>';
if(p.cupom){
html+='<div class="rc-linha"><span>Cupom '+p.cupom.codigo+'</span><strong class="rc-desconto">-'+fmt(p.cupom.desc)+'</strong></div>';
}
html+='<div class="rc-linha rc-total"><span>Total</span><strong>'+fmt(p.total)+'</strong></div>'
+'</div>'
+'<div class="rc-secao">'
+'<div class="rc-linha"><span>Entrega</span><strong>'+entregaTexto(p.entrega)+'</strong></div>';
if(p.entrega!=='correios'&&p.horario){
html+='<div class="rc-linha"><span>Horário preferido</span><strong>'+(p.horario==='noturno'?'Noturno (19h às 22h) + R$ 10,00':(p.horario==='tarde'?'Tarde (14h às 17h)':'Manhã (09h às 12h)'))+'</strong></div>';
}
html+='<div class="rc-linha"><span>Pagamento</span><strong>PIX</strong></div>';
if(p.endereco){
html+='<div class="rc-linha"><span>Endereço</span><strong>'+String(p.endereco).replace(/</g,'&lt;')+'</strong></div>';
}
if(p.nota){
html+='<div class="rc-linha"><span>Observação</span><strong>'+p.nota+'</strong></div>';
}
if(p.optin){
html+='<div class="rc-linha"><span>Novidades</span><strong>Aceitou receber ofertas</strong></div>';
}
html+='</div>'
+'</div>';
if(!p.registrado){
html+='<div class="entrega-aviso" style="margin:0 0 14px;text-align:left;">⚠️ Não foi possível registrar o pedido automaticamente agora. Guarde o número e envie pelo WhatsApp normalmente, confirmamos por lá.</div>';
}
html+='<button class="btn-wa" onclick="enviarWhats()"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/></svg>Enviar pedido / comprovante no WhatsApp</button>'
+'<button class="btn-voltar" onclick="abrirCheckout()">← Voltar e ajustar</button>'
+'</div>';
return html;
}
function enviarWhats(){
if(!pedidoAtual)return;
var p=pedidoAtual;
var linhas=['Olá! Quero confirmar o pedido #'+p.numero+' na loja da Meu 3D Labs.',''];
linhas.push('👤 Cliente: '+p.nome);
linhas.push('📱 WhatsApp: '+p.fone);
linhas.push('');
linhas.push('Itens:');
p.itens.forEach(function(i){
linhas.push('- '+i.qtd+'x '+i.nome+(i.cor?' ('+i.cor+')':'')+' — '+fmt(i.preco*i.qtd));
});
linhas.push('');
if(p.cupom){linhas.push('Cupom '+p.cupom.codigo+': -'+fmt(p.cupom.desc));}
linhas.push('Subtotal: '+fmt(p.subtotal));
linhas.push('Total: '+fmt(p.total));
linhas.push('Entrega: '+entregaTexto(p.entrega));
if(p.entrega==='retirada'&&p.horario){linhas.push('Horário de retirada: '+(p.horario==='noturno'?'Noturno (19h-22h) + R$ 10,00':(p.horario==='tarde'?'Tarde (14h-17h)':'Manhã (09h-12h)')));}
if(p.endereco){linhas.push('Endereço: '+p.endereco);}
linhas.push('Pagamento: PIX');
linhas.push('Comprovante do PIX será enviado junto');
if(p.nota){linhas.push('Observação: '+p.nota);}
if(p.optin){linhas.push('Cliente aceitou receber novidades pelo WhatsApp');}
linhas.push('');
linhas.push('Número do pedido: #'+p.numero);
var msg=linhas.join('\n');
window.open('https://wa.me/5521966594803?text='+encodeURIComponent(msg),'_blank');
}
function abrirModal(){document.getElementById('modalOverlay').classList.add('open');}
function fecharModal(){document.getElementById('modalOverlay').classList.remove('open');pedidoAtual=null;entregaSel='retirada';horarioSel='manha';cupomAtivo=null;}

/* ================= LOJA DINÂMICA (API) ================= */
var API_LOJA = 'https://meu3dlabs-backend.onrender.com/api';
var WHATSAPP_LOJA = '5521966594803';
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
var produtosLoja = [];

function escL(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function precoLabel(v){v=parseFloat(v)||0;return v.toFixed(2).replace('.',',');}
function labelCategoria(cat){
  var labels={chaveiros:'Chaveiros',religiosos:'Religiosos',decoracao:'Decoração',miniaturas:'Miniaturas',colecionaveis:'Colecionáveis',articulados:'Articulados',sensoriais:'Sensoriais',utilitarios:'Utilitários',outros:'Outros'};
  return labels[cat]||cat.charAt(0).toUpperCase()+cat.slice(1);
}
function corHex(nome){
  if(!nome)return '#ccc';
  nome=String(nome).toLowerCase().replace(/[^a-z0-9]/g,'');
  if(nome.indexOf('#')===0)return nome;
  var mapa={
    preto:'#000000',black:'#000000',branco:'#ffffff',white:'#ffffff',
    cinza:'#9e9e9e',gray:'#9e9e9e',prata:'#c0c0c0',prateado:'#c0c0c0',silver:'#c0c0c0',
    vermelho:'#d32f2f',red:'#d32f2f',rosa:'#f48fb1',pink:'#f48fb1',
    laranja:'#f26522',orange:'#f26522',marrom:'#795548',brown:'#795548',
    amarelo:'#fbc02d',yellow:'#fbc02d',dourado:'#d4af37',ouro:'#d4af37',gold:'#d4af37',
    verde:'#2e7d32',green:'#2e7d32',verdeclaro:'#8bc34a',lightgreen:'#8bc34a',
    azul:'#1565c0',blue:'#1565c0',azulclaro:'#42a5f5',lightblue:'#42a5f5',azulmarinho:'#0d3b66',
    roxo:'#7b1fa2',purple:'#7b1fa2',violeta:'#9c27b0',lilas:'#ce93d8',
    bege:'#d6c6a8',beige:'#d6c6a8',creme:'#f5ecd9',turquesa:'#00bcd4',transparente:'#ffffff'
  };
  return mapa[nome]||'#ccc';
}
function badgeProduto(q){
  q=parseInt(q)||0;
  if(q<=0)return '<span class="badge esgotado">Sem estoque</span>';
  if(q<=3)return '<span class="badge ultimas">Últimas '+q+' un.</span>';
  return '<span class="badge estoque">Em estoque</span>';
}
function bindVariantes(card){
  var sw=card.querySelector('.variantes-lista');
  if(!sw)return;
  var track=card.querySelector('.variante-track');
  var swatches=sw.querySelectorAll('.sw');
  function atualizar(idx){
    track.style.transform='translateX(-'+idx*100+'%)';
    swatches.forEach(function(s){s.classList.toggle('ativo',parseInt(s.getAttribute('data-idx'))===idx);});
    var ativo=swatches[idx];
    if(ativo){
      card.setAttribute('data-cor-label',ativo.getAttribute('data-cor-label'));
      var corEl=card.querySelector('.produto-cor');
      if(corEl){
        var mini=corEl.querySelector('.mini-swatch');
        if(mini)mini.style.background=ativo.style.background||'#ccc';
        corEl.childNodes.forEach(function(n){if(n.nodeType===3)n.textContent=' '+ativo.getAttribute('data-cor-label');});
      }
    }
  }
  swatches.forEach(function(s){s.addEventListener('click',function(e){e.stopPropagation();atualizar(parseInt(s.getAttribute('data-idx')));});});
  if(window.matchMedia('(pointer: coarse)').matches){
    var toque=0;
    card.addEventListener('click',function(e){
      if(e.target.closest('.btn-comprar')||e.target.closest('.btn-pedir'))return;
      if(!e.target.closest('.variantes-lista')){
        toque++;
        if(toque===1){sw.classList.add('show');setTimeout(function(){toque=0;},3000);}
      }
    });
    document.addEventListener('click',function(e){if(!e.target.closest(card))sw.classList.remove('show');});
  }
}
function renderProdutos(lista){
  lista=lista.slice().sort(function(a,b){
    var dA=a.destaque?0:1;
    var dB=b.destaque?0:1;
    if(dA!==dB)return dA-dB;
    var esgA=(parseInt(a.estoque)||0)<=0?1:0;
    var esgB=(parseInt(b.estoque)||0)<=0?1:0;
    return esgA-esgB;
  });
  var grid=document.getElementById('lojaGrid');
  grid.innerHTML='';
  if(!lista.length){
    grid.innerHTML='<div class="sem-resultado" style="display:block;"><h3>Nenhum produto encontrado</h3><p>Nossa vitrine está sendo preparada. Volte em breve!</p></div>';
    document.getElementById('semResultado').style.display='none';
    return;
  }
  lista.forEach(function(p){
    var estoque=parseInt(p.estoque)||0;
    var esgotado=estoque<=0;
    var imgs=p.imagens||[];
    var cores=p.cores||[];
    var precoN=parseFloat(p.preco)||0;
    var plabel='R$ '+precoLabel(precoN);
    var cat=(p.categoria||'outros').toLowerCase();
    var card=document.createElement('div');
    card.className='produto'+(esgotado?' esgotado':'');
    card.setAttribute('data-cat',cat);
    card.setAttribute('data-estoque',estoque<=0?'zero':(estoque<=3?'ultimas':'estoque'));
    card.setAttribute('data-qtde',estoque);
    card.setAttribute('data-preco',precoN);
    card.setAttribute('data-nome',p.nome);
    card.setAttribute('data-id',p.slug);
  var emPromoFoto=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
var pctFoto=emPromoFoto?Math.round((1-parseFloat(p.precoPromo)/precoN)*100):0;
card.setAttribute('data-promo',emPromoFoto?'1':'0');
var html='<div class="produto-img">'+badgeProduto(estoque)+(emPromoFoto?'<span style="position:absolute;top:56px;right:10px;background:#c0392b;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;z-index:4;box-shadow:0 3px 8px rgba(0,0,0,.25);">-'+pctFoto+'%</span>':'');
    if(imgs.length){
      html+='<div class="variante-track">';
        html+='<button class="btn-shr" onclick="compartilharProduto(\''+p.slug+'\')" title="Compartilhar">🔗</button>';
    imgs.forEach(function(u,i){html+='<div class="variante-slide" style="cursor:pointer;" onclick="event.stopPropagation();abrirModalProduto(\''+p.slug+'\')"><img src="'+u+'" alt="'+escL(p.nome)+'" loading="lazy"></div>';});
      html+='</div>';
      if(imgs.length>1){
        html+='<div class="variantes-lista"><span class="vl-label">Cores:</span>';
        imgs.forEach(function(u,i){
          var corLabel=cores[i]||('Cor '+(i+1));
          var fundo=corHex(cores[i]);
          html+='<div class="sw'+(i===0?' ativo':'')+'" data-idx="'+i+'" data-cor-label="'+escL(corLabel)+'" data-img="'+u+'" style="background:'+fundo+'" title="'+escL(corLabel)+'"></div>';
        });
        html+='</div>';
      }
    }else{
      html+='<div class="variante-track"><div class="variante-slide" style="font-size:42px;color:#b9c2d2;">📦</div></div>';
    }
    html+='</div><div class="produto-body">';
    html+='<span class="produto-cat">'+escL(labelCategoria(cat))+'</span>';
    html+='<h3 style="cursor:pointer;" onclick="abrirModalProduto(\''+p.slug+'\')">'+escL(p.nome)+'</h3>';
    if(p.descricao)html+='<p class="produto-desc">'+escL(p.descricao)+'</p>';
    if(cores.length)html+='<div class="produto-cor"><span class="mini-swatch" style="background:'+corHex(cores[0])+'"></span> '+escL(cores[0]||'')+'</div>';
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
if(emPromo){var pct=Math.round((1-parseFloat(p.precoPromo)/precoN)*100);html+='<div class="produto-preco"><span style="text-decoration:line-through;color:#8a94a8;font-size:13px;font-weight:600;">R$ '+precoLabel(precoN)+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span> <span style="background:#c0392b;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:12px;">-'+pct+'%</span></div>';}else{html+='<div class="produto-preco">'+plabel+' <small>· unidade</small></div>';}
    if(esgotado){
      html+='<button class="btn-pedir" onclick="pedirPeca(\''+p.slug+'\')">🔔 Avise-me quando chegar</button>';
    }else{
      html+='<button class="btn-comprar" onclick="addCarrinho(\''+p.slug+'\',\''+escL(p.nome).replace(/'/g,"\'")+'\',\''+plabel+'\',\''+precoN+'\')">'
      +'<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14.6l.1-.1L8.1 12h9.4c.7 0 1.3-.4 1.6-1L22 5H6.2l-.9-2H2v2h2l2.6 6.5L5.5 13c-.3.7-.3 1.5 0 2.2.4.9 1.3 1.5 2.3 1.5h11v-2H8.1c-.5 0-.9-.5-.9-1z"/></svg>'
      +'Adicionar</button>';
    }
    html+='</div>';
    card.innerHTML=html;
    grid.appendChild(card);
    bindVariantes(card);
  });
}
function pedirPeca(slug){
  var p=produtosLoja.find(function(x){return x.slug===slug;});
  if(!p)return;
  var msg='Olá! 😊 Vi a peça "'+p.nome+'" na loja e ela está sem estoque no momento. Gostaria de saber quando estará disponível (ou encomendar uma).';
  window.open('https://wa.me/'+WHATSAPP_LOJA+'?text='+encodeURIComponent(msg),'_blank');
}

var produtoSel=null;
function mostrarToast(msg){var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show');},2600);}
function fallbackCopy(txt){var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(ta);}
function compartilharProduto(slug){
  var url='https://meu3dlabs-backend.onrender.com/produto/'+encodeURIComponent(slug);
  function ok(){mostrarToast('🔗 Link copiado! Envie no WhatsApp ou Instagram.');}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(ok).catch(function(){fallbackCopy(url);ok();});}
  else{fallbackCopy(url);ok();}
}
function fecharModalProduto(){document.getElementById('produtoOverlay').classList.remove('show');produtoSel=null;}
function trocarImgModal(idx){
  var pmImg=document.querySelector('#produtoModalBody .pm-img');
  if(!pmImg||!produtoSel)return;
  var imgs=produtoSel.imagens||[];
  if(imgs[idx])pmImg.innerHTML='<img src="'+imgs[idx]+'" alt="'+escL(produtoSel.nome)+'">';
  document.querySelectorAll('#produtoModalBody .sw').forEach(function(s){s.classList.toggle('ativo',parseInt(s.getAttribute('data-idx'))===idx);});
}
function abrirModalProduto(slug){
  var p=produtosLoja.find(function(x){return x.slug===slug;});if(!p)return;
  produtoSel=p;
  var imgs=p.imagens||[];var cores=p.cores||[];
  var esgotado=(parseInt(p.estoque)||0)<=0;
  var plabel='R$ '+precoLabel(parseFloat(p.preco)||0);
  var html='<div class="pm-img">';
  if(imgs.length){html+='<img src="'+imgs[0]+'" alt="'+escL(p.nome)+'">';}else{html+='<div class="pm-noimg">📦</div>';}
  html+='</div><div class="pm-info">';
  html+='<span class="produto-cat">'+escL(labelCategoria(p.categoria))+'</span>';
  html+='<h3 style="font-size:20px;color:var(--navy);margin-bottom:8px;">'+escL(p.nome)+'</h3>';
  if(p.descricao)html+='<p class="pm-desc">'+escL(p.descricao)+'</p>';
  if(cores.length){
    html+='<div class="pm-cores"><span>Cores:</span>';
    if(imgs.length>1){
      cores.forEach(function(c,i){html+='<span class="sw'+(i===0?' ativo':'')+'" data-idx="'+i+'" data-cor-label="'+escL(c)+'" style="background:'+corHex(c)+'" onclick="trocarImgModal('+i+')" title="'+escL(c)+'"></span>';});
    }else{
      cores.forEach(function(c){html+='<span style="background:'+corHex(c)+';display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:middle;"></span> '+escL(c);});
    }
    html+='</div>';
  }
  var pMod=(p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<parseFloat(p.preco));
if(pMod){html+='<div class="pm-preco"><span style="text-decoration:line-through;color:#8a94a8;font-weight:600;font-size:14px;">R$ '+precoLabel(parseFloat(p.preco))+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span> <small>· unidade</small></div>';}else{html+='<div class="pm-preco">'+plabel+' <small>· unidade</small></div>';}
  if(esgotado){html+='<button class="btn-pedir" onclick="pedirPeca(\''+p.slug+'\')">🔔 Avise-me quando chegar</button>';}
  else{html+='<button class="btn-comprar" onclick="addCarrinho(\''+p.slug+'\',\''+escL(p.nome).replace(/'/g,"\'")+'\',\''+plabel+'\',\''+parseFloat(p.preco)+'\')">🛒 Adicionar ao carrinho</button>';}
  html+='</div>';
  document.getElementById('produtoModalBody').innerHTML=html;
  document.getElementById('produtoOverlay').classList.add('show');
}

function carregarProdutos(){
  var grid=document.getElementById('lojaGrid');
  grid.innerHTML='<div class="loja-carregando">Carregando produtos…</div>';
  fetch(API_LOJA+'/loja/produtos')
  .then(function(r){return r.json();})
  .then(function(t){
    produtosLoja=(t.produtos||t)||[];
    if(!Array.isArray(produtosLoja))produtosLoja=[];
    renderProdutos(produtosLoja);
    qtdPorCategoria();
    aplicarFiltros();
        atualizarCarrinhoUI();
    var _pq=new URLSearchParams(window.location.search).get('produto');
    if(_pq&&produtosLoja.find(function(x){return x.slug===_pq;})){abrirModalProduto(_pq);}
  })
  .catch(function(){
    grid.innerHTML='<div class="loja-carregando">Erro ao carregar a loja. Tente novamente em instantes.</div>';
  });
}

/* ================= FILTROS ================= */
var categoriaAtiva='todos';
var buscaAtiva='';
function buscarProdutos(){buscaAtiva=document.getElementById('buscaLoja').value.trim().toLowerCase();aplicarFiltros();}
function qtdPorCategoria(){
var prods=document.querySelectorAll('.produto');
var qtds={todos:prods.length,chaveiros:0,religiosos:0,decoracao:0,miniaturas:0,colecionaveis:0,articulados:0,sensoriais:0,utilitarios:0,outros:0};
prods.forEach(function(p){var c=p.getAttribute('data-cat');qtds[c]=(qtds[c]||0)+1;});
var mapa={todos:'qtdTodos',chaveiros:'qtdChaveiros',religiosos:'qtdReligiosos',decoracao:'qtdDecoracao',miniaturas:'qtdMiniaturas',colecionaveis:'qtdColecionaveis',articulados:'qtdArticulados',sensoriais:'qtdSensoriais',utilitarios:'qtdUtilitarios',outros:'qtdOutros'};
for(var k in mapa){var el=document.getElementById(mapa[k]);if(el)el.textContent='('+qtds[k]+')';}
}
function selecionarCategoria(btn){
document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('active');});
btn.classList.add('active');
categoriaAtiva=btn.getAttribute('data-cat');
aplicarFiltros();
}
function aplicarFiltros(){
var disp=[];
var precos=[];
var promo=false;
document.querySelectorAll('.check-item input').forEach(function(el){
if(el.checked&&(el.value==='estoque'||el.value==='ultimas'||el.value==='zero'))disp.push(el.value);
if(el.checked&&(el.value==='ate25'||el.value==='25a50'||el.value==='50a100'||el.value==='mais100'))precos.push(el.value);
if(el.checked&&el.value==='promo')promo=true;
});
var prods=document.querySelectorAll('.produto');
var visiveis=0;
prods.forEach(function(p){
var ok=true;
if(categoriaAtiva!=='todos'&&p.getAttribute('data-cat')!==categoriaAtiva)ok=false;
if(ok&&disp.length>0){
var q=parseInt(p.getAttribute('data-qtde'))||0;
var dispOk=false;
if(disp.indexOf('estoque')>-1&&q>0)dispOk=true;
if(disp.indexOf('ultimas')>-1&&q>0&&q<=3)dispOk=true;
if(disp.indexOf('zero')>-1&&q===0)dispOk=true;
if(!dispOk)ok=false;
}
if(ok&&promo&&p.getAttribute('data-promo')!=='1')ok=false;
if(ok&&buscaAtiva&&(p.getAttribute('data-nome')||'').toLowerCase().indexOf(buscaAtiva)===-1)ok=false;
if(ok&&precos.length>0){
var preco=parseFloat(p.getAttribute('data-preco'));
var faixaOk=false;
if(precos.indexOf('ate25')>-1&&preco<=25)faixaOk=true;
if(precos.indexOf('25a50')>-1&&preco>25&&preco<=50)faixaOk=true;
if(precos.indexOf('50a100')>-1&&preco>50&&preco<=100)faixaOk=true;
if(precos.indexOf('mais100')>-1&&preco>100)faixaOk=true;
if(!faixaOk)ok=false;
}
if(ok){p.style.display='';visiveis++;}else{p.style.display='none';}
});
if(typeof sincronizaChip==='function')sincronizaChip();
document.getElementById('contagem').textContent=visiveis;
var temFiltro=buscaAtiva||categoriaAtiva!=='todos'||document.querySelector('.check-item input:not(:checked)');
var bt=document.getElementById('btnLimparTopo');
if(bt)bt.style.display=temFiltro?'inline-flex':'none';
document.getElementById('semResultado').style.display=(visiveis===0)?'block':'none';
}
function aplicarOrdem(){
var ordem=document.getElementById('ordem').value;
var grid=document.getElementById('lojaGrid');
var prods=Array.prototype.slice.call(grid.querySelectorAll('.produto'));
prods.sort(function(a,b){
if(ordem==='menor')return parseFloat(a.getAttribute('data-preco'))-parseFloat(b.getAttribute('data-preco'));
if(ordem==='maior')return parseFloat(b.getAttribute('data-preco'))-parseFloat(a.getAttribute('data-preco'));
if(ordem==='nome')return a.getAttribute('data-nome').localeCompare(b.getAttribute('data-nome'),'pt-BR');
return 0;
});
prods.forEach(function(p){grid.appendChild(p);});
}
function limparFiltros(){
  buscaAtiva='';
var bi=document.getElementById('buscaLoja');if(bi)bi.value='';
categoriaAtiva='todos';
document.querySelectorAll('.cat-btn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-cat')==='todos');});
document.querySelectorAll('.check-item input').forEach(function(el){el.checked=(el.value==='estoque'||el.value==='ultimas'||el.value==='zero'||el.value==='promo');});
document.querySelectorAll('.check-item input').forEach(function(el){el.checked=(el.value==='estoque'||el.value==='ultimas'||el.value==='zero'||inp.value==='promo'||el.value==='promo');});
document.getElementById('ordem').value='destaques';
aplicarFiltros();
}
function abrirFiltros(){document.getElementById('sidebar').classList.add('open');document.getElementById('filtroOverlay').classList.add('open');}
function fecharFiltros(){document.getElementById('sidebar').classList.remove('open');document.getElementById('filtroOverlay').classList.remove('open');}
carregarProdutos();
function copiarCodigoPedido(num){
  var t='Meu pedido na Meu 3D Labs: #'+num;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){alert('Código copiado! 📋');});
  }else{
    var ta=document.createElement('textarea');
    ta.value=t;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');alert('Código copiado! 📋');}catch(e){}
    document.body.removeChild(ta);
  }
}


window.flutuanteAbrir=function(){
var sel='[onclick*="abrirCarrinho"],[onclick*="AbrirCarrinho"],[onclick*="toggleCarrinho"],[onclick*="ToggleCarrinho"],[onclick*="verCarrinho"],[onclick*="VerCarrinho"],[onclick*="openCart"],[onclick*="toggleCart"],.cart-btn,#btnCarrinho,#cartBtn,[class*="cart-btn"]';
var alvo=document.querySelector(sel);
if(alvo){alvo.click();return;}
var els=document.querySelectorAll('button,a,[onclick]');
for(var i=0;i<els.length;i++){
var t=(els[i].textContent||'').trim();
if(/^Carrinho\s*\(/.test(t)&&els[i].getBoundingClientRect().width>0){els[i].click();return;}
}
};
function fnContaTopo(){
var els=document.querySelectorAll('button,a,[onclick]');
for(var i=0;i<els.length;i++){
var m=(els[i].textContent||'').match(/Carrinho\s*\((\d+)\)/);
if(m&&els[i].getBoundingClientRect().width>0)return parseInt(m[1]);
}
return -1;
}
function fnSyncCartFloat(){
var b=document.getElementById('badgeCartFloat');
if(!b)return;
var n=fnContaTopo();
if(n<0)return;
if(b.textContent!==String(n)){
b.textContent=n;
b.classList.add('pop');
setTimeout(function(){b.classList.remove('pop');},250);
}
b.style.display=n>0?'flex':'none';
}
window.addEventListener('load',function(){
fnSyncCartFloat();
setInterval(fnSyncCartFloat,700);
});


(function(){
  var cart=document.getElementById('cartFloat');
  if(!cart)return;
  var css=document.createElement('style');
  css.textContent='.cart-float.fn-dim{opacity:.12;filter:blur(3px);pointer-events:none;transform:scale(.92);transition:opacity .25s,filter .25s,transform .25s;}';
  document.head.appendChild(css);
  var ref=null;
  function efetivamenteVisivel(e){
    var el=e;
    while(el&&el!==document.body){
      var cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden')return false;
      if(parseFloat(cs.opacity)<.05)return false;
      el=el.parentElement;
    }
    var r=e.getBoundingClientRect();
    if(r.width<10||r.height<10)return false;
    if(r.bottom<=0||r.top>=window.innerHeight||r.right<=0||r.left>=window.innerWidth)return false;
    return true;
  }
  function achouModal(){
    var els=document.querySelectorAll('[id*="modal" i],[class*="modal" i],[class*="overlay" i],[class*="detalhe" i]');
    var vw=window.innerWidth,vh=window.innerHeight;
    for(var i=0;i<els.length;i++){
      var e=els[i];
      if(cart.contains(e))continue;
      var r=e.getBoundingClientRect();
      if(r.width<vw*.6||r.height<vh*.6)continue;
      if(!efetivamenteVisivel(e))continue;
      return e;
    }
    return null;
  }
  function limpa(){ref=null;cart.classList.remove('fn-dim');}
  document.addEventListener('click',function(ev){
    if(window.innerWidth>768)return;
    var card=ev.target.closest('.produto');
    if(!card)return;
    setTimeout(function(){
      var m=achouModal();
      if(m){ref=m;cart.classList.add('fn-dim');}
      else if(ref&&!efetivamenteVisivel(ref))limpa();
    },400);
  },true);
  setInterval(function(){
    if(!ref)return;
    if(!efetivamenteVisivel(ref))limpa();
  },300);
})();
