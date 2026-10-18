/* ===== Meu 3D Labs — loja/pedido: geração do pedido, PIX, confirmação, WhatsApp e histórico ===== */
/* ORDEM DE CARREGAMENTO no loja.html (a ordem importa):
   loja-carrinho.js -> loja-checkout.js -> loja-pedido.js (este) -> loja-pagamento.js */
var API_PEDIDOS='https://meu3dlabs-backend.onrender.com/api/loja/pedidos';
/* ===== Histórico do cliente: guarda o pedido em "Meus pedidos" (painel da conta) ===== */
/* Global: o loja-pagamento.js também chama quando o pagamento no cartão é aprovado.
   Campos: forma ('pix'|'cartao') e pendente (true = aguardando pagamento do cartão). */
function salvarMeuPedido(p){
  try{
    var lista=JSON.parse(localStorage.getItem('m3l_pedidos')||'[]');
    if(!Array.isArray(lista))lista=[];
    lista=lista.filter(function(x){return x.numero!==p.numero;});
    lista.push({
      numero:p.numero,
      data:p.data||new Date().toISOString(),
      total:p.total,
      registrado:!!p.registrado,
      forma:p.forma||'pix',
      pendente:!!p.pendente,
      itens:(p.itens||[]).map(function(i){return {nome:i.nome,cor:i.cor||'',qtd:i.qtd,img:i.img||''};})
    });
    if(lista.length>20)lista=lista.slice(-20);
    localStorage.setItem('m3l_pedidos',JSON.stringify(lista));
  }catch(e){}
}
/* ===== Consome carrinho + cupom (após confirmação/pagamento) ===== */
/* Global: o loja-pagamento.js também chama no retorno aprovado do Mercado Pago. */
function limparCarrinhoAposPedido(){
  carrinho = [];
  salvarCarrinho();
  cupomAtivo = null;
  atualizarCarrinhoUI();
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
pagamento:pagamentoSel,
forma:pagamentoSel,
horario:entregaSel==='retirada'?horarioSel:null,
nota:nota||null,
optin:optin,
numero_local:numeroLocal
};
function montarPedido(numero,registrado){
var ul=m3lClienteLogado();
return {numero:numero,itens:itensExib,total:totalFinal(),subtotal:totalCarrinho(),cheio:totalCheio(),descPromo:descontoPromo(),descPix:descontoPix(),cupom:cupomAtivo,entrega:entregaSel,endereco:endereco||'',pagamento:pagamentoSel,forma:pagamentoSel,horario:entregaSel==='retirada'?horarioSel:null,nota:nota,nome:nome,fone:fone,email:(ul?ul.email:''),optin:optin,registrado:registrado};
}
function salvarPerfilDoPedido(){
if(window.m3lSalvarPerfil&&m3lClienteLogado()){
var pd={whatsapp:fone};
if(endObj){pd.cep=endObj.cep;pd.rua=endObj.rua;pd.numero=endObj.numero;pd.complemento=endObj.comp||'';pd.bairro=endObj.bairro;pd.cidade=endObj.cidade;if(endObj.uf)pd.uf=endObj.uf;}
try{window.m3lSalvarPerfil(pd);}catch(e){}
}
}
function mostrarPronto(){
if(btn){btn.disabled=false;}
var ehCartao=(pedidoAtual.forma==='cartao');
if(!ehCartao){salvarMeuPedido(pedidoAtual);}
if(pedidoAtual.registrado){
if(ehCartao){
/* Cartão: pedido fica "Aguardando pagamento (Cartão)" no ADMIN e pendente no histórico
   "Meus pedidos". Cupom e carrinho são consumidos só quando o pagamento for aprovado
   (retorno do Mercado Pago). Se o cliente desistir, ele pode retomar pelo painel. */
try{if(cupomAtivo)localStorage.setItem('m3l_cupom_pendente',cupomAtivo.codigo);}catch(e){}
salvarMeuPedido({numero:pedidoAtual.numero,total:pedidoAtual.total,registrado:true,forma:'cartao',pendente:true,itens:pedidoAtual.itens});
salvarPerfilDoPedido();
iniciarPagamentoCartao(pedidoAtual);
return;
}
if(cupomAtivo){marcarCupomUsado(cupomAtivo.codigo);}
limparCarrinhoAposPedido();
salvarPerfilDoPedido();
if(window.gtag){gtag('event','purchase',{currency:'BRL',value:pedidoAtual.total,transaction_id:pedidoAtual.numero,items:(pedidoAtual.itens||[]).map(function(i){return {item_name:i.nome,item_variant:i.cor||'',price:i.preco,quantity:i.qtd};})});}
}
document.getElementById('modalTitulo').textContent='Pedido gerado';
document.getElementById('modalBody').innerHTML=etapaPedido(pedidoAtual);
if(!ehCartao){mostrarPix(pedidoAtual.total);}
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
function pagamentoTexto(f){
return f==='cartao'?'Cartão de crédito (Mercado Pago)':'PIX';
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
html+='<div class="rc-linha"><span>Pagamento</span><strong>'+pagamentoTexto(p.forma)+'</strong></div>';
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
+'<button class="btn-voltar" onclick="fecharModal()">Continuar comprando</button>'
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
linhas.push('Pagamento: '+pagamentoTexto(p.forma));
if(p.forma==='cartao'){
linhas.push('O pagamento será concluído no checkout do Mercado Pago');
}else{
linhas.push('Comprovante do PIX será enviado junto');
}
if(p.nota){linhas.push('Observação: '+p.nota);}
if(p.optin){linhas.push('Cliente aceitou receber novidades pelo WhatsApp');}
linhas.push('');
linhas.push('Número do pedido: #'+p.numero);
var msg=linhas.join('\n');
window.open('https://wa.me/5521966594803?text='+encodeURIComponent(msg),'_blank');
}