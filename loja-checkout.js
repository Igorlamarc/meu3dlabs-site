/* ===== Meu 3D Labs — loja/checkout: tela de finalização (dados, entrega, pagamento, cupom, modal) ===== */
/* IMPORTANTE: carregar DEPOIS do loja-carrinho.js e ANTES do loja-pedido.js no loja.html */
/* ================= CUPONS (estrutura pronta) ================= */
var CUPONS={
 'MEUPRIMEIRO3D10': {tipo:'porcentagem', valor:10}
 /* Formato para adicionar outros cupons (sem precisar mexer na estrutura):
 'BEMVINDO10': {tipo:'porcentagem', valor:10},
 'M3D5': {tipo:'fixo', valor:5}
 */
};
/* ================= CHECKOUT ================= */
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
html+='<div class="entrega-opcoes" id="entregaOpcoes">'
+'<div class="entrega-op'+(entregaSel==='retirada'?' sel':'')+'" onclick="selEntrega(\'retirada\',this)"><input type="radio" name="entrega" '+(entregaSel==='retirada'?'checked':'')+'><div><div class="eo-titulo">Retirada em Nilópolis/RJ</div><div class="eo-desc"><strong>Sem custo.</strong> Combinamos o horário pelo WhatsApp.</div></div></div>'
+'<div class="entrega-op'+(entregaSel==='uber'?' sel':'')+'" onclick="selEntrega(\'uber\',this)"><input type="radio" name="entrega" '+(entregaSel==='uber'?'checked':'')+'><div><div class="eo-titulo">Uber Flash (somente RJ)</div><div class="eo-desc">Envio rápido, <strong>entrega por conta do cliente</strong>.</div></div></div>'
+'<div class="entrega-op'+(entregaSel==='correios'?' sel':'')+'" onclick="selEntrega(\'correios\',this)"><input type="radio" name="entrega" '+(entregaSel==='correios'?'checked':'')+'><div><div class="eo-titulo">Outro estado (Correios)</div><div class="eo-desc">Enviamos pelos Correios: <strong>consultamos o frete e o prazo antes de confirmar</strong>.</div></div></div>'
+'</div>';
html+='<div class="entrega-aviso">📦 <strong>Importante:</strong> fora do Rio de Janeiro, o pedido só é confirmado após o cálculo do frete e do prazo de envio. Vamos te passar o valor antes de qualquer pagamento.</div>';
html+='<div class="etapa-titulo">Forma de pagamento</div>';
html+='<div class="entrega-opcoes" id="pagamentoOpcoes">'
+'<div class="entrega-op'+(pagamentoSel==='pix'?' sel':'')+'" onclick="selPagamento(\'pix\',this)"><input type="radio" name="pagamento" '+(pagamentoSel==='pix'?'checked':'')+'><div><div class="eo-titulo">PIX 💚</div><div class="eo-desc"><strong>5% de desconto</strong> — QR Code gerado na hora do pedido. Envie o comprovante no WhatsApp.</div></div></div>'
+'<div class="entrega-op'+(pagamentoSel==='cartao'?' sel':'')+'" onclick="selPagamento(\'cartao\',this)"><input type="radio" name="pagamento" '+(pagamentoSel==='cartao'?'checked':'')+'><div><div class="eo-titulo">Cartão de crédito 💳</div><div class="eo-desc">Até <strong>12x</strong> no checkout seguro do Mercado Pago. Sem o desconto do PIX.</div></div></div>'
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
function abrirModal(){document.getElementById('modalOverlay').classList.add('open');floatsOcultar();}
function fecharModal(){document.getElementById('modalOverlay').classList.remove('open');floatsMostrar();pedidoAtual=null;entregaSel='retirada';horarioSel='manha';pagamentoSel='pix';cupomAtivo=null;m3lSemCadastro=false;}