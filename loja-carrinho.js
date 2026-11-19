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
/* =====================================================================
   PRONTA ENTREGA + PRODUÇÃO
   O contador é liberado: estoque é o que sai pronto, o excedente entra
   em produção. O carrinho NÃO trava mais no estoque.
   TETO_POR_ITEM evita erro de digitação (ex.: 9999 unidades).
   ===================================================================== */
var TETO_POR_ITEM = 99;
/* ===== Config compartilhada da loja ===== */
var API_LOJA = 'https://meu3dlabs-backend.onrender.com/api';
var WHATSAPP_LOJA = '5521966594803';
/* =====================================================================
   VÍNCULO FOTO ↔ COR
   O admin grava a meta no fim da descrição do produto:
      "texto real|M3DVAR:%7B%22Vermelho%22%3A%5B0%2C1%5D%7D"
   Os valores são ÍNDICES do array "imagens" do produto.
   ===================================================================== */
var M3D_MARCA_VAR = 'M3DVAR:';
var m3dDeepLinkFeito = false;
function m3dUrlLimpa(u){ return String(u||'').split('#')[0]; }
function m3dDescricaoLimpa(d){ return String(d||'').split('|')[0].trim(); }
function m3dProdutoPorSlug(slug){
  if(typeof produtosLoja==='undefined'||!produtosLoja||!produtosLoja.length)return null;
  for(var i=0;i<produtosLoja.length;i++){
    if(String(produtosLoja[i].slug)===String(slug))return produtosLoja[i];
  }
  return null;
}
/* cor → [urls] a partir da descrição + imagens do produto */
function m3dLerVariacoes(prod){
  var out={};
  if(!prod)return out;
  var desc=String(prod.descricao||'');
  var pos=desc.indexOf(M3D_MARCA_VAR);
  if(pos===-1)return out;
  try{
    var mapa=JSON.parse(decodeURIComponent(desc.slice(pos+M3D_MARCA_VAR.length).trim()));
    var imgs=(prod.imagens||[]).map(m3dUrlLimpa);
    Object.keys(mapa||{}).forEach(function(cor){
      var urls=(mapa[cor]||[]).map(function(idx){ return imgs[idx]; }).filter(Boolean);
      if(urls.length)out[cor]=urls;
    });
  }catch(e){}
  return out;
}
/* foto principal da cor; cai para a primeira imagem do produto */
function m3dFotoDaCor(prod, cor){
  var imgs=(prod&&prod.imagens)?prod.imagens.map(m3dUrlLimpa):[];
  var fallback=imgs.length?imgs[0]:'';
  if(!prod||!cor)return fallback;
  var vars=m3dLerVariacoes(prod);
  var doCor=vars[cor];
  if(doCor&&doCor.length)return doCor[0];
  return fallback;
}
/* valida se a cor realmente existe no cadastro do produto */
function m3dCorValida(prod, cor){
  if(!cor)return '';
  if(!prod)return String(cor);
  var cores=(prod.cores||[]);
  for(var i=0;i<cores.length;i++){
    if(String(cores[i])===String(cor))return String(cores[i]);
  }
  return '';
}
/* =====================================================================
   LIMPEZA DE LINHA SEM COR
   O loja.html (vitrine) também processa "?produto=…&carrinho=1" e cria uma
   linha SEM cor. Quando a mesma peça existe COM cor, essa linha é fantasma
   e precisa sair — senão o cliente vê dois brinquedos no carrinho.
   ===================================================================== */
function m3dConsolidarCores(){
  var comCor={};
  carrinho.forEach(function(it){
    if(it && it.cor) comCor[String(it.id)]=true;
  });
  var mudou=false;
  for(var i=carrinho.length-1;i>=0;i--){
    var it=carrinho[i];
    if(!it) continue;
    if(!it.cor && comCor[String(it.id)]){
      carrinho.splice(i,1);
      mudou=true;
    }
  }
  if(mudou)salvarCarrinho();
  return mudou;
}
function m3dRemoverLinhasSemCor(id){
  var mudou=false;
  for(var i=carrinho.length-1;i>=0;i--){
    var it=carrinho[i];
    if(!it) continue;
    if(String(it.id)===String(id) && !it.cor){
      carrinho.splice(i,1);
      mudou=true;
    }
  }
  if(mudou)salvarCarrinho();
  return mudou;
}
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
  '.ci-aviso{font-size:11px;color:#c0392b;font-weight:700;margin-top:5px;line-height:1.4;}' +
  '.ci-qtd-aviso{font-size:10.5px;color:#8a5a00;font-weight:700;margin-top:3px;line-height:1.4;background:#fff4d6;border-radius:8px;padding:4px 8px;display:inline-block;}' +
  '.ci-sub{font-size:11.5px;color:#4a5161;margin-top:3px;}' +
  '.ci-sub b{color:#0f1e3d;}' +
  '.undo-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(20px);background:#0f1e3d;color:#fff;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:14px;box-shadow:0 8px 26px rgba(15,30,61,.4);z-index:99997;opacity:0;pointer-events:none;transition:.25s;max-width:92vw;box-sizing:border-box;}' +
  '.undo-toast.show{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:auto;}' +
  '.undo-toast button{background:none;border:none;color:#f2b28f;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;padding:4px 6px;white-space:nowrap;}' +
  /* NOVO: etiqueta de cor no item do carrinho */
  '.ci-cor{display:inline-block;background:rgba(15,30,61,.07);color:#0f1e3d;font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle;letter-spacing:.2px;}' +
  /* NOVO: cor ausente (produto com cores sem seleção) */
  '.ci-semcor{display:inline-block;background:#fff4d6;color:#8a5a00;font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle;border:1px solid #f0dca8;}';
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
/* produtoInfo(id, cor)
   - cor informada → usa a FOTO daquela cor (meta M3DVAR)
   - sem cor → tenta o swatch ativo da vitrine, depois a foto da cor do produto
   - sem produto na vitrine → cai para a API (produtosLoja) */
function produtoInfo(id, cor){
  var el=document.querySelector('.produto[data-id="'+id+'"]');
  var prod=m3dProdutoPorSlug(id);
  var corFinal=cor||'';
  if(!corFinal){
    var sw=pNome(id);
    if(sw&&sw.querySelector('.sw.ativo'))corFinal=sw.querySelector('.sw.ativo').getAttribute('data-cor-label')||'';
  }
  var img='';
  if(prod){
    img=m3dFotoDaCor(prod, corFinal);
  }
  if(!img&&el){
    var im=el.querySelector('.variante-track img');
    img=im?im.getAttribute('src'):'';
  }
  var nome=el?el.getAttribute('data-nome'):(prod?prod.nome:'');
  if(!el&&!prod)return null;
  return {nome:nome,img:img,cor:corFinal};
}
/* Estoque atual do produto (pronta entrega).
   Retorna null quando a vitrine não está disponível (ex.: API fria). */
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
/* =====================================================================
   TRAVA DE ESTOQUE — DESATIVADA
   Antes esta função CORTava a quantidade dos itens antigos do carrinho
   quando o estoque caía no admin. Com a mecânica de pronta entrega +
   produção isso não pode mais acontecer: o cliente escolheu 5, ele recebe
   5 (1 pronta entrega + 4 sob encomenda).
   Mantida como no-op para não quebrar chamadas existentes.
   ===================================================================== */
function travarEstoqueCarrinho(){
  return false;
}
/* addCarrinho(id, nome, precoLabel, precoNum, precoOriginal, corForcada)
   corForcada é opcional — usada pelo deep link da página de produto.
   NÃO trava mais no estoque: o excedente vira produção sob encomenda. */
function addCarrinho(id,nome,precoLabel,precoNum,precoOriginal,corForcada){
  var prod=m3dProdutoPorSlug(id);
  var corPre = corForcada ? m3dCorValida(prod, corForcada) : '';
  if(!corPre){
    var swPre=pNome(id);
    if(swPre&&swPre.querySelector('.sw.ativo')){corPre=swPre.querySelector('.sw.ativo').getAttribute('data-cor-label')||'';}
  }
  var cor=corPre;
  var info=produtoInfo(id, cor);
  var img=info?info.img:'';
  if(!img&&prod) img=m3dFotoDaCor(prod, cor);
  var chave=id+'|'+cor;
  var achou=false;
  var qtdAntes=0;
  carrinho.forEach(function(item){
    if(item.chave===chave){qtdAntes=item.qtd;}
  });
  if(qtdAntes>=TETO_POR_ITEM){
    if(typeof mostrarToast==='function')mostrarToast('Limite de '+TETO_POR_ITEM+' unidades por item. Para volumes maiores, fale no WhatsApp.');
    abrirCarrinho();
    return;
  }
  carrinho.forEach(function(item){
  if(item.chave===chave){item.qtd++;achou=true;}
  });
  if(!achou){
  carrinho.push({chave:chave,id:id,nome:nome,cor:cor,precoNum:parseFloat(precoNum),precoLabel:precoLabel,qtd:1,img:img,precoOriginal:parseFloat(precoOriginal)||0});
  }
  /* NOVO: com cor definida, a linha "sem cor" da vitrine não tem razão de existir */
  if(cor) m3dRemoverLinhasSemCor(id);
  itemFlashChave=chave; /* NOVO: flash no carrinho */
  salvarCarrinho();
  atualizarCarrinhoUI();
  abrirCarrinho();
  if(window.gtag)gtag('event','add_to_cart',{currency:'BRL',value:precoNum,items:[{item_id:id,item_name:nome,item_variant:cor||'',quantity:1,price:precoNum}]});
}
/* ===== Adicionar N unidades de uma vez (seletor da página de produto / deep link) =====
   Soma a quantidade desejada dentro do TETO_POR_ITEM. Estoque não bloqueia:
   o que passa do estoque entra como produção sob encomenda. */
function addCarrinhoQtd(id,nome,precoLabel,precoNum,precoOriginal,qtdDesejada,corForcada,modoDefinir){
  var prod=m3dProdutoPorSlug(id);
  var corPre = corForcada ? m3dCorValida(prod, corForcada) : '';
  if(!corPre){
    var swPre=pNome(id);
    if(swPre&&swPre.querySelector('.sw.ativo')){corPre=swPre.querySelector('.sw.ativo').getAttribute('data-cor-label')||'';}
  }
  var cor=corPre;
  var info=produtoInfo(id, cor);
  var img=info?info.img:'';
  if(!img&&prod) img=m3dFotoDaCor(prod, cor);
  var chave=id+'|'+cor;
  var atual=0;
  carrinho.forEach(function(item){if(item.chave===chave)atual=item.qtd;});
  var qtdAlvo=Math.max(1,parseInt(qtdDesejada)||1);
  var adicionar;
  if(modoDefinir){
    /* deep link: a vitrine pode ter adicionado 1 linha antes — assume a maior quantidade */
    adicionar=Math.min(qtdAlvo,TETO_POR_ITEM);
  }else{
    adicionar=Math.min(qtdAlvo,Math.max(0,TETO_POR_ITEM-atual));
  }
  if(adicionar<=0){
    if(typeof mostrarToast==='function')mostrarToast('Limite de '+TETO_POR_ITEM+' unidades por item. Para volumes maiores, fale no WhatsApp.');
    abrirCarrinho();
    return;
  }
  var achou=false;
  carrinho.forEach(function(item){
    if(item.chave===chave){
      if(modoDefinir) item.qtd=Math.max(item.qtd,adicionar);
      else item.qtd=Math.min(TETO_POR_ITEM,item.qtd+adicionar);
      achou=true;
    }
  });
  if(!achou){
    carrinho.push({chave:chave,id:id,nome:nome,cor:cor,precoNum:parseFloat(precoNum),precoLabel:precoLabel,qtd:adicionar,img:img,precoOriginal:parseFloat(precoOriginal)||0});
  }else if(img){
    /* se o item já existia, garante que a foto corresponde à cor */
    carrinho.forEach(function(item){ if(item.chave===chave && !item.img) item.img=img; });
  }
  /* NOVO: com cor definida, a linha "sem cor" da vitrine não tem razão de existir */
  if(cor) m3dRemoverLinhasSemCor(id);
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
  if(delta>0&&alvo.qtd>=TETO_POR_ITEM){
    if(typeof mostrarToast==='function')mostrarToast('Limite de '+TETO_POR_ITEM+' unidades por item. Para volumes maiores, fale no WhatsApp.');
    return;
  }
  alvo.qtd=Math.min(TETO_POR_ITEM,alvo.qtd+delta);
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
/* NOVO: garante que a foto do item corresponde à cor salva */
var fotoCor=m3dFotoDaCor(p, it.cor);
if(fotoCor&&it.img!==fotoCor){it.img=fotoCor;mudou=true;}
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
/* NOVO: limpa linhas sem cor quando a mesma peça já existe com cor */
m3dConsolidarCores();
migrarPromoItens();
var n=0;carrinho.forEach(function(i){n+=i.qtd;});
var badge=document.getElementById('carrinhoBadge');
if(badge){badge.textContent=n;badge.classList.toggle('show',n>0);}
/* NOVO: contador de itens no título da aba */
if(!m3dTituloBase)m3dTituloBase=document.title;
document.title=(n>0)?('('+n+') '+m3dTituloBase):m3dTituloBase;
var body=document.getElementById('cartBody');
var footer=document.getElementById('cartFooter');
if(!body||!footer)return;
if(n===0){
cupomAtivo=null;
body.innerHTML='<div class="cart-vazio"><div class="cv-icon">🛒</div><p>Seu carrinho está vazio.</p><p style="font-size:13px;margin-top:6px;">Adicione peças da loja para começar.</p></div>';
footer.style.display='none';
return;
}
var html='';
carrinho.forEach(function(item){
var est=estoqueDoProduto(item.id);
var pronta=(est!==null&&est>0)?est:0;
var producao=Math.max(0,item.qtd-pronta);
var avisoProducao='';
if(pronta<=0){
  avisoProducao='<div class="ci-qtd-aviso">🖨️ '+item.qtd+' un. sob encomenda — combinamos o prazo no WhatsApp</div>';
}else if(producao>0){
  avisoProducao='<div class="ci-qtd-aviso">✅ '+pronta+' pronta'+(pronta>1?'s':'')+' entrega + 🖨️ '+producao+' sob encomenda</div>';
}
var emPromoItem=item.precoOriginal&&item.precoOriginal>item.precoNum;
var precoHtml=item.precoLabel;
if(emPromoItem){
var pctC=Math.round((1-item.precoNum/item.precoOriginal)*100);
precoHtml='<span style="text-decoration:line-through;color:#8a94a8;font-size:12px;font-weight:600;margin-right:4px;">'+fmt(item.precoOriginal)+'</span>'
+'<span style="color:#c0392b;font-weight:800;">'+item.precoLabel+'</span>'
+' <span style="background:#c0392b;color:#fff;font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:10px;">-'+pctC+'%</span>';
}
html+='<div class="cart-item'+(item.chave===itemFlashChave?' ci-flash':'')+'">'
+'<img src="'+(item.img||'')+'" alt="'+String(item.nome||'').replace(/"/g,'&quot;')+'">'
+'<div class="ci-info">'
+'<div class="ci-nome">'+item.nome+(item.cor?'<span class="ci-cor">'+item.cor+'</span>':'')+'</div>'
+'<div class="ci-preco">'+precoHtml+'</div>'
+'<div class="ci-qtd"><button onclick="mudarQtd(\''+item.chave+'\',-1)">−</button><span>'+item.qtd+'</span><button onclick="mudarQtd(\''+item.chave+'\',1)">+</button></div>'
+avisoProducao
+(item.qtd>1?'<div class="ci-sub">'+item.precoLabel+' × '+item.qtd+' = <b>'+fmt(item.precoNum*item.qtd)+'</b></div>':'')
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
/* Botão Finalizar — não bloqueia mais por item esgotado: vira encomenda */
var btnFin=footer.querySelector('.btn');
if(btnFin){
  btnFin.disabled=false;
  btnFin.textContent='Finalizar pedido';
  btnFin.style.opacity='';
  btnFin.style.cursor='';
  btnFin.onclick=function(){ abrirCheckout(); };
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
var d=document.getElementById('cartDrawer');
var o=document.getElementById('cartOverlay');
if(d)d.classList.add('open');
if(o)o.classList.add('open');
floatsOcultar();
}
function fecharCarrinho(){
var d=document.getElementById('cartDrawer');
var o=document.getElementById('cartOverlay');
if(d)d.classList.remove('open');
if(o)o.classList.remove('open');
floatsMostrar();
}
/* =====================================================================
   DEEP LINK DA PÁGINA DE PRODUTO
   URL: loja.html?produto=SLUG&carrinho=1&qtd=2&cor=Verde
   - espera a vitrine carregar (produtosLoja)
   - adiciona com a cor e a foto corretas
   - remove a linha SEM cor criada pela própria vitrine
   - limpa os parâmetros para não duplicar ao recarregar
   ===================================================================== */
function m3dParamURL(nome){
  try{ var p=new URLSearchParams(location.search); return p.get(nome); }catch(e){ return null; }
}
function m3dLimparParametrosCarrinho(){
  try{
    var u=new URL(location.href);
    ['produto','carrinho','qtd','cor'].forEach(function(k){ u.searchParams.delete(k); });
    var qs=u.searchParams.toString();
    history.replaceState(null,'',u.pathname+(qs?('?'+qs):'')+u.hash);
  }catch(e){}
}
function m3dPrecoLabelSeguro(v){
  if(typeof precoLabel==='function'){ try{ return precoLabel(v); }catch(e){} }
  var n=parseFloat(v)||0;
  return n.toFixed(2).replace('.',',');
}
function m3dProcessarDeepLink(){
  if(m3dDeepLinkFeito)return;
  var slug=m3dParamURL('produto');
  if(!slug)return;
  if(String(m3dParamURL('carrinho'))!=='1')return;
  var qtd=parseInt(m3dParamURL('qtd'),10)||1;
  var cor=m3dParamURL('cor')||'';
  var tentativas=0;
  (function tentar(){
    if(m3dDeepLinkFeito)return;
    var prod=m3dProdutoPorSlug(slug);
    if(!prod){
      if(++tentativas<40){ setTimeout(tentar,250); return; }
      if(typeof mostrarToast==='function')mostrarToast('Não encontramos essa peça na loja. Veja o catálogo completo.');
      m3dDeepLinkFeito=true;
      m3dLimparParametrosCarrinho();
      return;
    }
    m3dDeepLinkFeito=true;
    var cheio=parseFloat(prod.preco)||0;
    var emPromo=!!prod.promo&&parseFloat(prod.precoPromo)>0&&parseFloat(prod.precoPromo)<cheio;
    var venda=emPromo?parseFloat(prod.precoPromo):cheio;
    var label='R$ '+m3dPrecoLabelSeguro(venda);
      var corOk=m3dCorValida(prod, cor);
    var temCores=(prod.cores&&prod.cores.length);
    if(temCores && !corOk){
      /* produto com variações: nunca adicionar sem cor definida */
      if(typeof mostrarToast==='function')mostrarToast('🎨 Escolha uma cor antes de comprar.');
      m3dLimparParametrosCarrinho();
      return;
    }
    addCarrinhoQtd(prod.slug, prod.nome, label, venda, emPromo?cheio:0, qtd, corOk, true);
    /* NOVO: limpa a linha sem cor que a vitrine criou ao ler os mesmos parâmetros */
    if(corOk) m3dRemoverLinhasSemCor(prod.slug);
    atualizarCarrinhoUI();
    /* NOVO: repetição defensiva — se a vitrine adicionar depois, limpa de novo */
    setTimeout(function(){
      if(corOk && m3dRemoverLinhasSemCor(prod.slug)) atualizarCarrinhoUI();
    },400);
    setTimeout(function(){
      if(corOk && m3dRemoverLinhasSemCor(prod.slug)) atualizarCarrinhoUI();
    },1200);
    m3dLimparParametrosCarrinho();
  })();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){ setTimeout(m3dProcessarDeepLink,0); });
}else{
  setTimeout(m3dProcessarDeepLink,0);
}