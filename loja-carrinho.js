/* ===== Meu 3D Labs — loja/carrinho: estado, carrinho, checkout, cupom, pedido e PIX ===== */
/* ================= ESTADO ================= */
var API_PEDIDOS='https://meu3dlabs-backend.onrender.com/api/loja/pedidos';
var carrinho=[];
try{carrinho=JSON.parse(localStorage.getItem('m3d_carrinho')||'[]');}catch(e){carrinho=[];}
var pedidoAtual=null;
var entregaSel='retirada';
var horarioSel='manha';
var TAXA_NOTURNO=10;
var cupomAtivo=null;
var clienteDados={nome:'',fone:'',endereco:null};
/* ===== Integração com o login (loja-login.js): sincroniza dados do cliente logado ===== */
function formatarFoneM3l(d){
  d=String(d||'').replace(/\D/g,'').slice(0,11);
  var v='';
  if(d.length>0)v='('+d.slice(0,2);
  if(d.length>2)v+=') '+d.slice(2,7);
  if(d.length>6)v+='-'+d.slice(7,11);
  return v;
}
document.addEventListener('m3l-user-changed',function(ev){
  var u=ev&&ev.detail;
  if(!u)return;
  if(u.nome&&String(u.nome).trim()&&clienteDados.nome.trim()===''){clienteDados.nome=String(u.nome).trim();}
  if(u.fone&&String(u.fone).trim()&&clienteDados.fone.trim()===''){clienteDados.fone=formatarFoneM3l(u.fone);}
  if(u.endereco){
    if(!clienteDados.endereco)clienteDados.endereco={};
    ['cep','rua','numero','comp','bairro','cidade','uf'].forEach(function(k){
      var v=(u.endereco[k]!==undefined)?String(u.endereco[k]).trim():'';
      if(v&&!String(clienteDados.endereco[k]||'').trim()){clienteDados.endereco[k]=v;}
    });
  }
});
function m3lClienteLogado(){return (window.m3lUser&&window.m3lUser.email)?window.m3lUser:null;}
/* ===== Retomar checkout automaticamente após cadastro pelo convite ===== */
var m3lRetomarCheckout=false;
document.addEventListener('m3l-user-changed',function(ev){
  var u=ev&&ev.detail;
  if(m3lRetomarCheckout&&u&&u.email){
    m3lRetomarCheckout=false;
    abrirCheckout();
  }
});
/* ================= CUPONS (estrutura pronta) ================= */
var CUPONS={
 'MEUPRIMEIRO3D10': {tipo:'porcentagem', valor:10}
 /* Formato para adicionar outros cupons (sem precisar mexer na estrutura):
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
function addCarrinho(id,nome,precoLabel,precoNum,precoOriginal){
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
carrinho.push({chave:chave,id:id,nome:nome,cor:cor,precoNum:parseFloat(precoNum),precoLabel:precoLabel,qtd:1,img:img,precoOriginal:parseFloat(precoOriginal)||0});
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
/* ===== Totais de promoção ===== */
function totalCheio(){
var t=0;carrinho.forEach(function(i){t+=(i.precoOriginal&&i.precoOriginal>i.precoNum?i.precoOriginal:i.precoNum)*i.qtd;});return t;
}
function descontoPromo(){
return Math.round((totalCheio()-totalCarrinho())*100)/100;
}
/* ===== Migração: itens antigos do carrinho ganham dados de promoção lendo a API ===== */
function migrarPromoItens(){
if(typeof produtosLoja==='undefined'||!produtosLoja||!produtosLoja.length||typeof precoLabel!=='function')return;
var mudou=false;
carrinho.forEach(function(it){
var p=null;
for(var i=0;i<produtosLoja.length;i++){if(produtosLoja[i].slug===it.id){p=produtosLoja[i];break;}}
if(!p)return;
var cheio=parseFloat(p.preco)||0;
var emPromo=!!p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<cheio;
var venda=emPromo?parseFloat(p.precoPromo):cheio;
if(it.precoNum!==venda){it.precoNum=venda;it.precoLabel='R$ '+precoLabel(venda);mudou=true;}
var orig=emPromo?cheio:0;
if((it.precoOriginal||0)!==orig){it.precoOriginal=orig;mudou=true;}
});
if(mudou)salvarCarrinho();
}
function fmt(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function cupomDesconto(){return cupomAtivo?cupomAtivo.desc:0;}
/* ===== Desconto PIX (5% automático) ===== */
function totalAntesPix(){var t=totalCarrinho()-cupomDesconto();return t<0?0:t;}
function descontoPix(){var t=totalAntesPix();return t>0?Math.round(t*0.05*100)/100:0;}
function totalFinal(){var t=totalCarrinho()-cupomDesconto()-descontoPix()+(horarioSel==='noturno'?TAXA_NOTURNO:0);return t<0?0:t;}
function atualizarCarrinhoUI(){
migrarPromoItens();
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
var emPromoItem=item.precoOriginal&&item.precoOriginal>item.precoNum;
var precoHtml=item.precoLabel;
if(emPromoItem){
var pctC=Math.round((1-item.precoNum/item.precoOriginal)*100);
precoHtml='<span style="text-decoration:line-through;color:#8a94a8;font-size:12px;font-weight:600;margin-right:4px;">'+fmt(item.precoOriginal)+'</span>'
+'<span style="color:#c0392b;font-weight:800;">'+item.precoLabel+'</span>'
+' <span style="background:#c0392b;color:#fff;font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:10px;">-'+pctC+'%</span>';
}
html+='<div class="cart-item">'
+'<img src="'+item.img+'" alt="'+item.nome.replace(/"/g,'&quot;')+'">'
+'<div class="ci-info">'
+'<div class="ci-nome">'+item.nome+(item.cor?' <span style="color:var(--gray);font-weight:500;">('+item.cor+')</span>':'')+'</div>'
+'<div class="ci-preco">'+precoHtml+'</div>'
+'<div class="ci-qtd"><button onclick="mudarQtd(\''+item.chave+'\',-1)">−</button><span>'+item.qtd+'</span><button onclick="mudarQtd(\''+item.chave+'\',1)">+</button></div>'
+'</div>'
+'<button class="ci-remove" onclick="removerItem(\''+item.chave+'\')">Remover</button>'
+'</div>';
});
body.innerHTML=html;
footer.style.display='block';
document.getElementById('cartTotal').textContent=fmt(totalCarrinho());
var dp=descontoPromo();
var eco=document.getElementById('cartEconomia');
if(eco)eco.remove();
if(dp>0&&footer){
var d=document.createElement('div');
d.id='cartEconomia';
d.style.cssText='text-align:right;font-size:12.5px;color:#0f7a44;font-weight:700;margin:0 16px 6px;';
d.textContent='🎉 Você economiza '+fmt(dp)+' na promoção';
var ct=footer.querySelector('.cart-total');
if(ct)footer.insertBefore(d,ct);else footer.appendChild(d);
}
var pn=document.getElementById('cartPixNota');
if(pn)pn.remove();
if(footer){
var pnx=document.createElement('div');
pnx.id='cartPixNota';
pnx.style.cssText='text-align:right;font-size:11.5px;color:#0f7a44;font-weight:600;margin:0 16px 6px;';
pnx.textContent='💚 Pagando no PIX: 5% de desconto no checkout';
var ct2=footer.querySelector('.cart-total');
if(ct2)footer.insertBefore(pnx,ct2);else footer.appendChild(pnx);
}
}
/* ===== Botões flutuantes: somem quando carrinho ou modal abrem ===== */
function floatsOcultar(){
var fs=document.getElementById('floatStack');
if(fs)fs.style.display='none';
}
function floatsMostrar(){
var fs=document.getElementById('floatStack');
if(fs)fs.style.display='';
}
function abrirCarrinho(){
document.getElementById('cartDrawer').classList.add('open');
document.getElementById('cartOverlay').classList.add('open');
floatsOcultar();
}
function fecharCarrinho(){
document.getElementById('cartDrawer').classList.remove('open');
document.getElementById('cartOverlay').classList.remove('open');
floatsMostrar();
}
/* ================= CHECKOUT ================= */
var m3lSemCadastro=false;
function abrirCheckout(){
if(totalCarrinho()<=0)return;
fecharCarrinho();
var u=m3lClienteLogado();
if(!u&&!m3lSemCadastro){
mostrarConviteCadastro();
return;
}
if(u&&u.nome&&u.nome.trim()&&clienteDados.nome.trim()===''){clienteDados.nome=u.nome.trim();}
document.getElementById('modalTitulo').textContent='Finalizar pedido';
document.getElementById('modalBody').innerHTML=etapaResumo();
restaurarCupomUI();
abrirModal();
if(window.gtag)gtag('event','begin_checkout',{currency:'BRL',value:totalFinal()});
}
/* ===== Convite para cadastrar antes do checkout (visitante sem conta) ===== */
function mostrarConviteCadastro(){
document.getElementById('modalTitulo').textContent='🎁 Cadastre-se e ganhe 10% OFF';
document.getElementById('modalBody').innerHTML=
'<div style="text-align:center;padding:6px 0 2px;">'
+'<div style="font-size:44px;margin-bottom:8px;">🎁</div>'
+'<h3 style="margin:0 0 6px;color:#0f1e3d;font-size:1.1rem;font-weight:800;line-height:1.35;">Crie sua conta e ganhe 10% de desconto na primeira compra</h3>'
+'<p style="color:#4a5161;font-size:13.5px;line-height:1.5;margin:0 0 14px;">É grátis e leva 1 minuto. Depois de criar sua conta, <strong>confirme o e-mail</strong> que enviamos e seu <strong style="color:#f26522;">cupom exclusivo de 10%</strong> é liberado na hora — direto na tela de confirmação.</p>'
+'<button type="button" onclick="criarContaDoConvite()" style="width:100%;box-sizing:border-box;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#f26522,#e05512);color:#fff;font-weight:800;font-size:.95rem;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(242,101,34,.35);margin-bottom:10px;">✨ Criar conta e continuar comprando</button>'
+'<button type="button" onclick="continuarSemCadastro()" style="width:100%;box-sizing:border-box;padding:12px;border:1.5px solid #e2e6ee;border-radius:10px;background:#fff;color:#0f1e3d;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit;">Continuar sem cadastro</button>'
+'<p style="font-size:11.5px;color:#8a94a8;margin:10px 0 0;">O cupom de 10% é exclusivo para clientes cadastrados: liberado após a confirmação do e-mail e vale uma única vez.</p>'
+'</div>';
abrirModal();
}
function criarContaDoConvite(){
fecharModal();
m3lRetomarCheckout=true;
if(window.m3lAbrirCadastro){window.m3lAbrirCadastro();}
}
function continuarSemCadastro(){
m3lSemCadastro=true;
window.m3lCupomSugerido=null;
abrirCheckout();
}
function etapaResumo(){
var html='';
html+='<div class="erro-box" id="erroBox"></div>';
var end=clienteDados.endereco||{};
var ciduf=((end.cidade||'')+(end.uf?(' - '+end.uf):''));
var u=m3lClienteLogado();
if(u){
html+='<div style="display:flex;align-items:center;gap:6px;background:#eaf6ee;border:1px solid #cbe5d2;border-radius:10px;padding:10px 12px;font-size:13px;color:#186a35;margin-bottom:12px;">✅ Conectado como <strong>'+u.email+'</strong>'+((clienteDados.nome.trim()&&clienteDados.fone.trim())?' · nome e WhatsApp já preenchidos':(clienteDados.nome.trim()?' · seu nome já está preenchido':''))+'</div>';
}
html+='<div class="etapa-titulo">Seus dados</div>';
html+='<div class="campos-grid">'
+'<div class="campo"><label>Nome e sobrenome <span>*</span></label><input type="text" id="cliNome" placeholder="Nome e sobrenome" autocomplete="name" value="'+clienteDados.nome.replace(/"/g,'&quot;')+'" oninput="guardarNome(this)"></div>'
+'<div class="campo"><label>Celular / WhatsApp <span>*</span></label><input type="tel" id="cliFone" placeholder="(21) 99999-9999" maxlength="16" autocomplete="tel" value="'+clienteDados.fone.replace(/"/g,'&quot;')+'" oninput="guardarFone(this)"></div>'
+'</div>';
html+='<label class="check-item optin"><input type="checkbox" id="cliOptin"> Quero receber novidades e peças em estoque pelo WhatsApp</label>';
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
html+='<div class="etapa-titulo">Cupom de desconto</div>';
html+='<div class="cupom-linha"><input type="text" id="cupomInput" placeholder="Digite seu cupom" autocomplete="off" value="'+(window.m3lCupomSugerido?String(window.m3lCupomSugerido).replace(/"/g,'&quot;'):'')+'"><button class="btn-aplicar" onclick="aplicarCupom()">Aplicar</button></div>';
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
+'<div class="entrega-op sel"><input type="radio" name="pagamento" checked><div><div class="eo-titulo">PIX</div><div class="eo-desc"><strong>5% de desconto</strong> pagando no PIX — aplicado automaticamente no total. Envie o comprovante no WhatsApp.</div></div></div>'
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
+(end.cep?'<div style="font-size:12px;color:#0f7a44;font-weight:600;margin:-6px 0 8px;">✅ Preenchido do seu cadastro — confira antes de enviar</div>':'')
+'<div class="campos-grid">'
+'<div class="campo"><label>CEP <span>*</span></label><input type="text" id="cliCep" placeholder="00000-000" maxlength="9" value="'+String(end.cep||'').replace(/"/g,'&quot;')+'" oninput="mascaraCep(this)"></div>'
+'<div class="campo"><label>Cidade / UF <span>*</span></label><input type="text" id="cliCidade" placeholder="Cidade - UF" value="'+ciduf.replace(/"/g,'&quot;')+'"></div>'
+'<div class="campo full"><label>Rua / Endereço <span>*</span></label><input type="text" id="cliRua" placeholder="Rua, avenida..." value="'+String(end.rua||'').replace(/"/g,'&quot;')+'"></div>'
+'<div class="campo"><label>Número <span>*</span></label><input type="text" id="cliNumero" placeholder="Nº" value="'+String(end.numero||'').replace(/"/g,'&quot;')+'"></div>'
+'<div class="campo"><label>Bairro <span>*</span></label><input type="text" id="cliBairro" placeholder="Bairro" value="'+String(end.bairro||'').replace(/"/g,'&quot;')+'"></div>'
+'<div class="campo full"><label>Complemento (opcional)</label><input type="text" id="cliComp" placeholder="Apto, bloco, referência..." value="'+String(end.comp||'').replace(/"/g,'&quot;')+'"></div>'
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
var inp=el.querySelector('input');
if(inp)inp.checked=true;
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
var inp=el.querySelector('input');
if(inp)inp.checked=true;
atualizarTotalResumo();
}
/* ================= CUPOM ================= */
function cuponsUsados(){
try{var l=JSON.parse(localStorage.getItem('m3l_cupons_usados')||'[]');return Array.isArray(l)?l:[];}catch(e){return [];}}
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
erroBox.textContent='Informe seu nome e sobrenome para gerar o pedido.';
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
var endObj=null;
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
var cidufPartes=cidade.split(' - ');
var cid=(cidufPartes[0]||'').trim();
var ufP=(cidufPartes[1]||'').trim();
endereco=rua+', '+num+' - '+bairro+' - '+cidade+' - CEP '+cep+(comp?' ('+comp+')':'');
endObj={cep:cep.replace(/\D/g,''),rua:rua,numero:num,comp:comp,bairro:bairro,cidade:cid,uf:ufP};
}
var btn=document.querySelector('.btn-finalizar');
if(btn){btn.disabled=true;btn.textContent='Gerando pedido...';}
var numeroLocal='M3D-'+String(Math.floor(100000+Math.random()*900000));
var itens=carrinho.map(function(i){return {nome:i.nome,cor:i.cor||'',qtd:i.qtd,preco:i.precoNum};});
var itensExib=carrinho.map(function(i){return {nome:i.nome,cor:i.cor||'',qtd:i.qtd,preco:i.precoNum,cheio:(i.precoOriginal&&i.precoOriginal>i.precoNum)?i.precoOriginal:i.precoNum,img:i.img||''};});
var payload={
nome_cliente:nome,
whatsapp:fone,
email:(m3lClienteLogado()?m3lClienteLogado().email:null),
itens:itens,
subtotal:arred(totalCarrinho()),
cupom:cupomAtivo?cupomAtivo.codigo:null,
desconto:cupomAtivo?arred(cupomAtivo.desc):0,
desconto_pix:descontoPix(),
total:arred(totalFinal()),
entrega:entregaSel,
endereco:endereco||null,
pagamento:'pix',
horario:entregaSel==='retirada'?horarioSel:null,
nota:nota||null,
optin:optin
};
function montarPedido(numero,registrado){
var ul=m3lClienteLogado();
return {numero:numero,itens:itensExib,total:totalFinal(),subtotal:totalCarrinho(),cheio:totalCheio(),descPromo:descontoPromo(),descPix:descontoPix(),cupom:cupomAtivo,entrega:entregaSel,endereco:endereco||'',pagamento:'pix',horario:entregaSel==='retirada'?horarioSel:null,nota:nota,nome:nome,fone:fone,email:(ul?ul.email:''),optin:optin,registrado:registrado};
}
function limparCarrinhoAposPedido(){
  carrinho = [];
  salvarCarrinho();
  cupomAtivo = null;
  atualizarCarrinhoUI();
}
/* ===== Histórico do cliente: guarda o pedido em "Meus pedidos" (painel da conta) ===== */
function salvarMeuPedido(p){
  try{
    var lista=JSON.parse(localStorage.getItem('m3l_pedidos')||'[]');
    if(!Array.isArray(lista))lista=[];
    lista=lista.filter(function(x){return x.numero!==p.numero;});
    lista.push({
      numero:p.numero,
      data:new Date().toISOString(),
      total:p.total,
      registrado:!!p.registrado,
      itens:(p.itens||[]).map(function(i){return {nome:i.nome,cor:i.cor||'',qtd:i.qtd,img:i.img||''};})
    });
    if(lista.length>20)lista=lista.slice(-20);
    localStorage.setItem('m3l_pedidos',JSON.stringify(lista));
  }catch(e){}
}
function mostrarPronto(){
  if(btn){btn.disabled=false;}
  salvarMeuPedido(pedidoAtual);
  if(pedidoAtual && pedidoAtual.registrado){
    if(cupomAtivo){marcarCupomUsado(cupomAtivo.codigo);}
    if(window.m3lSalvarPerfil&&m3lClienteLogado()){
      var pd={whatsapp:fone};
      if(endObj){pd.cep=endObj.cep;pd.rua=endObj.rua;pd.numero=endObj.numero;pd.complemento=endObj.comp||'';pd.bairro=endObj.bairro;pd.cidade=endObj.cidade;if(endObj.uf)pd.uf=endObj.uf;}
      try{window.m3lSalvarPerfil(pd);}catch(e){}
    }
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
+(p.email?'<div class="rc-linha"><span>E-mail</span><strong>'+p.email+'</strong></div>':'')
+'</div>'
+'<div class="rc-secao">'
+'<div class="rc-titulo">Itens</div>';
p.itens.forEach(function(i){
var promoi=i.cheio&&i.cheio>i.preco;
var val='<strong>'+(promoi
?'<span style="text-decoration:line-through;color:#8a94a8;font-weight:600;font-size:12px;margin-right:6px;">'+fmt(i.cheio*i.qtd)+'</span><span style="color:#c0392b;">'+fmt(i.preco*i.qtd)+'</span>'
:fmt(i.preco*i.qtd))+'</strong>';
html+='<div class="rc-linha"><span>'+i.qtd+'x '+i.nome+(i.cor?' <em>('+i.cor+')</em>':'')+'</span>'+val+'</div>';
});
html+='</div>'
+'<div class="rc-secao">'
+'<div class="rc-linha"><span>Subtotal</span><strong>'+fmt(p.cheio)+'</strong></div>';
if(p.descPromo>0){
html+='<div class="rc-linha"><span>Desconto de promoção</span><strong style="color:#0f7a44;">-'+fmt(p.descPromo)+'</strong></div>';
}
if(p.cupom){
html+='<div class="rc-linha"><span>Cupom '+p.cupom.codigo+'</span><strong class="rc-desconto">-'+fmt(p.cupom.desc)+'</strong></div>';
}
if(p.descPix>0){
html+='<div class="rc-linha"><span>Desconto PIX (5%)</span><strong style="color:#0f7a44;">-'+fmt(p.descPix)+'</strong></div>';
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
if(p.email){linhas.push('📧 E-mail: '+p.email);}
linhas.push('');
linhas.push('Itens:');
p.itens.forEach(function(i){
linhas.push('- '+i.qtd+'x '+i.nome+(i.cor?' ('+i.cor+')':'')+' — '+fmt(i.preco*i.qtd)+(i.cheio>i.preco?' (promoção, de '+fmt(i.cheio*i.qtd)+')':''));
});
linhas.push('');
linhas.push('Subtotal: '+fmt(p.cheio));
if(p.descPromo>0){linhas.push('Desconto de promoção: -'+fmt(p.descPromo));}
if(p.cupom){linhas.push('Cupom '+p.cupom.codigo+': -'+fmt(p.cupom.desc));}
if(p.descPix>0){linhas.push('Desconto PIX (5%): -'+fmt(p.descPix));}
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
function abrirModal(){document.getElementById('modalOverlay').classList.add('open');floatsOcultar();}
function fecharModal(){document.getElementById('modalOverlay').classList.remove('open');floatsMostrar();pedidoAtual=null;entregaSel='retirada';horarioSel='manha';cupomAtivo=null;m3lSemCadastro=false;}
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