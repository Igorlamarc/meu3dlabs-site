/* ===== Meu 3D Labs — loja/carrinho: estado, login, variantes, carrinho e totais ===== */
/* ORDEM DE CARREGAMENTO no loja.html (a ordem importa):
   loja-carrinho.js (este) -> loja-checkout.js -> loja-pedido.js -> loja-pagamento.js */
/* ================= ESTADO (usado por todos os módulos da loja) ================= */
var carrinho=[];
try{carrinho=JSON.parse(localStorage.getItem('m3d_carrinho')||'[]');}catch(e){carrinho=[];}
var pedidoAtual=null;
var entregaSel='retirada';
var horarioSel='manha';
var pagamentoSel='pix';
var TAXA_NOTURNO=10;
var cupomAtivo=null;
var clienteDados={nome:'',fone:'',endereco:null};
var m3lSemCadastro=false;
var m3lRetomarCheckout=false;
/* ===== NOVO: controles de feedback visual do carrinho ===== */
var itemFlashChave=null;   /* última peça adicionada → flash no carrinho */
var m3dTituloBase='';      /* título original da aba (contador "(2) Loja…") */
var undoTimer=null;        /* timer do "Desfazer remoção" */
/* ===== Config compartilhada da loja ===== */
var API_LOJA = 'https://meu3dlabs-backend.onrender.com/api';
var WHATSAPP_LOJA = '5521966594803';
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
document.addEventListener('m3l-user-changed',function(ev){
  var u=ev&&ev.detail;
  if(m3lRetomarCheckout&&u&&u.email){
    m3lRetomarCheckout=false;
    abrirCheckout();
  }
});
/* ================= CSS (modal mobile + bolinhas + feedback do carrinho) ================= */
(function(){
  var css=document.createElement('style');
  css.textContent=
  '#produtoOverlay{cursor:pointer;}' +
  '#produtoOverlay .produto-modal{cursor:default;}' +
  '@media(max-width:768px){' +
  '#produtoModalBody .btn-comprar,#produtoModalBody .btn-pedir{position:fixed;left:16px;right:16px;bottom:16px;z-index:99995;margin:0;width:auto;box-shadow:0 6px 20px rgba(0,0,0,.35);justify-content:center;}' +
  '#produtoOverlay .produto-modal{padding-bottom:0;}' +
  '}' +
  '.produto-cores-dots{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap;}' +
  '.produto-cores-dots .core-dot{width:16px;height:16px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px #d9dee8;cursor:default;}' +
  /* NOVO: feedback visual do carrinho */
  '@keyframes ciFlash{0%{background:#fff2e8;}60%{background:#fff2e8;}100%{background:transparent;}}' +
  '.ci-flash{animation:ciFlash 1.8s ease;}' +
  '.ci-esgotado{opacity:.55;}' +
  '.ci-esgotado .ci-nome{text-decoration:line-through;}' +
  '.ci-aviso{font-size:11px;color:#c0392b;font-weight:700;margin-top:5px;line-height:1.4;}' +
  '.ci-qtd-aviso{font-size:10.5px;color:#8a94a8;font-weight:600;margin-top:3px;}' +
  '.ci-sub{font-size:11.5px;color:#4a5161;margin-top:3px;}' +
  '.ci-sub b{color:#0f1e3d;}' +
  '.undo-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(20px);background:#0f1e3d;color:#fff;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:14px;box-shadow:0 8px 26px rgba(15,30,61,.4);z-index:99997;opacity:0;pointer-events:none;transition:.25s;max-width:92vw;box-sizing:border-box;}' +
  '.undo-toast.show{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:auto;}' +
  '.undo-toast button{background:none;border:none;color:#f2b28f;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;padding:4px 6px;white-space:nowrap;}';
  document.head.appendChild(css);
})();
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
/* Estoque atual do produto (lendo a vitrine carregada da API).
   Retorna null quando a vitrine não está disponível (ex.: API fria) — nesse caso o carrinho
   comporta como antes, sem trava, para nunca bloquear a compra por falta de dado. */
function estoqueDoProduto(id){
  if(typeof produtosLoja==='undefined'||!produtosLoja||!produtosLoja.length)return null;
  for(var i=0;i<produtosLoja.length;i++){
    if(String(produtosLoja[i].slug)===String(id)){
      var q=parseInt(produtosLoja[i].estoque);
      return isNaN(q)?null:Math.max(q,0);
    }
  }
  return null;
}
/* Limita a quantidade de cada item do carrinho ao estoque atual.
   Cobre itens antigos salvos no localStorage quando o estoque mudou no admin. */
function travarEstoqueCarrinho(){
  var mudou=false;
  carrinho.forEach(function(it){
    var est=estoqueDoProduto(it.id);
    if(est===null)return;
    if(est>0&&it.qtd>est){it.qtd=est;mudou=true;}
  });
  if(mudou)salvarCarrinho();
}
function addCarrinho(id,nome,precoLabel,precoNum,precoOriginal){
  var est=estoqueDoProduto(id);
  if(est!==null){
    if(est<=0){
      if(typeof mostrarToast==='function')mostrarToast('Essa peça está sem estoque no momento. 🔔 Use "Avise-me quando chegar".');
      return;
    }
    var corPre='';
    var swPre=pNome(id);
    if(swPre&&swPre.querySelector('.sw.ativo')){corPre=swPre.querySelector('.sw.ativo').getAttribute('data-cor-label');}
    var chavePre=id+'|'+corPre;
    var qtdAtual=0;
    carrinho.forEach(function(item){if(item.chave===chavePre)qtdAtual=item.qtd;});
    if(qtdAtual>=est){
      if(typeof mostrarToast==='function')mostrarToast('Estoque limite: só há '+est+' unidade(s) dessa peça.');
      abrirCarrinho();
      return;
    }
  }
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
  itemFlashChave=chave; /* NOVO: flash no carrinho */
  salvarCarrinho();
  atualizarCarrinhoUI();
  abrirCarrinho();
  if(window.gtag)gtag('event','add_to_cart',{currency:'BRL',value:precoNum,items:[{item_id:id,item_name:nome,item_variant:cor||'',quantity:1,price:precoNum}]});
}
/* ===== NOVO: adicionar N unidades de uma vez (usado pelo seletor da página de produto) =====
   Soma o máximo possível dentro do estoque real; se já estiver no limite, avisa e abre o carrinho. */
function addCarrinhoQtd(id,nome,precoLabel,precoNum,precoOriginal,qtdDesejada){
  var est=estoqueDoProduto(id);
  var qtdAlvo=Math.max(1,parseInt(qtdDesejada)||1);
  if(est!==null&&est<=0){
    if(typeof mostrarToast==='function')mostrarToast('Essa peça está sem estoque no momento. 🔔 Use "Avise-me quando chegar".');
    return;
  }
  var info=produtoInfo(id);
  var img=info?info.img:'';
  var cor='';
  var sw=pNome(id);
  if(sw&&sw.querySelector('.sw.ativo')){cor=sw.querySelector('.sw.ativo').getAttribute('data-cor-label');}
  var chave=id+'|'+cor;
  var atual=0;
  carrinho.forEach(function(item){if(item.chave===chave)atual=item.qtd;});
  var limite=(est===null)?qtdAlvo+atual:est;
  var pode=limite-atual;
  var adicionar=Math.min(qtdAlvo,pode);
  if(adicionar<=0){
    if(typeof mostrarToast==='function')mostrarToast('Estoque limite: só há '+limite+' unidade(s) dessa peça.');
    abrirCarrinho();
    return;
  }
  var achou=false;
  carrinho.forEach(function(item){
    if(item.chave===chave){item.qtd+=adicionar;achou=true;}
  });
  if(!achou){
    carrinho.push({chave:chave,id:id,nome:nome,cor:cor,precoNum:parseFloat(precoNum),precoLabel:precoLabel,qtd:adicionar,img:img,precoOriginal:parseFloat(precoOriginal)||0});
  }
  itemFlashChave=chave;
  salvarCarrinho();
  atualizarCarrinhoUI();
  abrirCarrinho();
  if(window.gtag)gtag('event','add_to_cart',{currency:'BRL',value:(parseFloat(precoNum)||0)*adicionar,items:[{item_id:id,item_name:nome,item_variant:cor||'',quantity:adicionar,price:parseFloat(precoNum)||0}]});
}
function removerItem(chave){
  /* NOVO: remoção com possibilidade de desfazer (padrão Amazon/Shopee) */
  var idx=-1,item=null;
  carrinho.forEach(function(i,k){if(i.chave===chave){idx=k;item=i;}});
  if(idx<0)return;
  carrinho.splice(idx,1);
  salvarCarrinho();
  atualizarCarrinhoUI();
  mostrarUndoRemocao(item,idx);
}
function mudarQtd(chave,delta){
  var alvo=null;
  carrinho.forEach(function(item){if(item.chave===chave)alvo=item;});
  if(!alvo)return;
  if(delta>0){
    var est=estoqueDoProduto(alvo.id);
    if(est!==null){
      if(est<=0){
        if(typeof mostrarToast==='function')mostrarToast('Essa peça esgotou — remova do carrinho para finalizar.');
        return;
      }
      if(alvo.qtd>=est){
        if(typeof mostrarToast==='function')mostrarToast('Máximo de '+est+' unidade(s) em estoque.');
        return;
      }
    }
  }
  alvo.qtd+=delta;
  if(alvo.qtd<1)alvo.qtd=1;
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
/* ===== Utilitários e totais (usados pelo checkout, pedido e pagamento) ===== */
function fmt(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function cupomDesconto(){return cupomAtivo?cupomAtivo.desc:0;}
/* ===== Desconto PIX (5% automático) — só quando PIX está selecionado ===== */
function totalAntesPix(){var t=totalCarrinho()-cupomDesconto();return t<0?0:t;}
function descontoPix(){
if(pagamentoSel!=='pix')return 0;
var t=totalAntesPix();
return t>0?Math.round(t*0.05*100)/100:0;
}
function totalFinal(){var t=totalCarrinho()-cupomDesconto()-descontoPix()+(horarioSel==='noturno'?TAXA_NOTURNO:0);return t<0?0:t;}
/* ===== NOVO: toast de remoção com botão "Desfazer" (6 segundos) ===== */
function mostrarUndoRemocao(item,idx){
  var t=document.getElementById('undoToast');
  if(!t){
    t=document.createElement('div');
    t.id='undoToast';
    t.className='undo-toast';
    t.innerHTML='<span id="undoMsg"></span><button type="button" id="undoBtn">Desfazer</button>';
    document.body.appendChild(t);
  }
  clearTimeout(undoTimer);
  document.getElementById('undoMsg').textContent='🗑️ "'+(item.nome||'Item')+'" removido do carrinho';
  t.classList.add('show');
  document.getElementById('undoBtn').onclick=function(){
    clearTimeout(undoTimer);
    t.classList.remove('show');
    carrinho.splice(Math.min(idx,carrinho.length),0,item);
    itemFlashChave=item.chave;
    salvarCarrinho();
    atualizarCarrinhoUI();
  };
  undoTimer=setTimeout(function(){t.classList.remove('show');},6000);
}
function atualizarCarrinhoUI(){
migrarPromoItens();
travarEstoqueCarrinho();
var n=0;carrinho.forEach(function(i){n+=i.qtd;});
var badge=document.getElementById('carrinhoBadge');
badge.textContent=n;badge.classList.toggle('show',n>0);
/* NOVO: contador de itens no título da aba */
if(!m3dTituloBase)m3dTituloBase=document.title;
document.title=(n>0)?('('+n+') '+m3dTituloBase):m3dTituloBase;
var body=document.getElementById('cartBody');
var footer=document.getElementById('cartFooter');
if(n===0){
cupomAtivo=null;
body.innerHTML='<div class="cart-vazio"><div class="cv-icon">🛒</div><p>Seu carrinho está vazio.</p><p style="font-size:13px;margin-top:6px;">Adicione peças da loja para começar.</p></div>';
footer.style.display='none';
return;
}
var html='';
var esgotados=0;
carrinho.forEach(function(item){
var est=estoqueDoProduto(item.id);
var esgotadoItem=(est===0);
var noLimite=(est!==null&&est>0&&item.qtd>=est);
if(esgotadoItem)esgotados++;
var emPromoItem=item.precoOriginal&&item.precoOriginal>item.precoNum;
var precoHtml=item.precoLabel;
if(emPromoItem){
var pctC=Math.round((1-item.precoNum/item.precoOriginal)*100);
precoHtml='<span style="text-decoration:line-through;color:#8a94a8;font-size:12px;font-weight:600;margin-right:4px;">'+fmt(item.precoOriginal)+'</span>'
+'<span style="color:#c0392b;font-weight:800;">'+item.precoLabel+'</span>'
+' <span style="background:#c0392b;color:#fff;font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:10px;">-'+pctC+'%</span>';
}
html+='<div class="cart-item'+(esgotadoItem?' ci-esgotado':'')+(item.chave===itemFlashChave?' ci-flash':'')+'">'
+'<img src="'+item.img+'" alt="'+item.nome.replace(/"/g,'&quot;')+'">'
+'<div class="ci-info">'
+'<div class="ci-nome">'+item.nome+(item.cor?' <span style="color:var(--gray);font-weight:500;">('+item.cor+')</span>':'')+'</div>'
+'<div class="ci-preco">'+precoHtml+'</div>'
+(esgotadoItem
  ?'<div class="ci-aviso">⚠️ Esta peça esgotou depois que você adicionou — remova para finalizar.</div>'
  :'<div class="ci-qtd"><button onclick="mudarQtd(\''+item.chave+'\',-1)">−</button><span>'+item.qtd+'</span><button onclick="mudarQtd(\''+item.chave+'\',1)">+</button></div>'
   +(noLimite?'<div class="ci-qtd-aviso">📌 Estoque máximo atingido ('+est+' un.)</div>':'')
   +(item.qtd>1?'<div class="ci-sub">'+item.precoLabel+' × '+item.qtd+' = <b>'+fmt(item.precoNum*item.qtd)+'</b></div>':''))
+'</div>'
+'<button class="ci-remove" onclick="removerItem(\''+item.chave+'\')">Remover</button>'
+'</div>';
});
body.innerHTML=html;
itemFlashChave=null;
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
/* NOVO: botão Finalizar ciente dos itens esgotados */
var btnFin=footer.querySelector('.btn');
if(btnFin){
  if(esgotados===carrinho.length){
    btnFin.disabled=true;
    btnFin.textContent='Itens esgotados no carrinho';
    btnFin.style.opacity='0.55';
    btnFin.style.cursor='not-allowed';
  }else{
    btnFin.disabled=false;
    btnFin.textContent='Finalizar pedido';
    btnFin.style.opacity='';
    btnFin.style.cursor='';
    btnFin.onclick=function(){
      if(esgotados>0){
        if(typeof mostrarToast==='function')mostrarToast('Remova a peça esgotada do carrinho para finalizar o pedido.');
        return;
      }
      abrirCheckout();
    };
  }
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