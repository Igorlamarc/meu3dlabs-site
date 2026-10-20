/* ===== Meu 3D Labs — loja/vitrine: produtos, modal, compartilhar, filtros e flutuantes ===== */
var produtosLoja = [];
function escL(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function precoLabel(v){v=parseFloat(v)||0;return v.toFixed(2).replace('.',',');}
/* Detecta teste local: em localhost/file usa caminho relativo; no ar usa URL própria */
var LOCAL_TESTE=(location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1');
/* ===== CSS injetado: modal fixo no rodapé (mobile) + bolinhas de cores dos cards ===== */
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
  '.produto-cores-dots .core-dot{width:16px;height:16px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px #d9dee8;cursor:default;}';
  document.head.appendChild(css);
})();
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
/* URL da página de produto: local → produto.html?produto=slug | no ar → /produto/slug */
function urlProduto(slug){return LOCAL_TESTE?'produto.html?produto='+encodeURIComponent(slug||''):'/produto/'+encodeURIComponent(slug||'');}
function urlProdutoAbsoluta(slug){return 'https://meu3dlabs.com.br/produto/'+encodeURIComponent(slug||'');}
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
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
    var precoVenda=emPromo?parseFloat(p.precoPromo):precoN;
    var plabel='R$ '+precoLabel(precoVenda);
    var precoOrigArg=emPromo?precoN:'';
    var cat=(p.categoria||'outros').toLowerCase();
    var card=document.createElement('div');
    card.className='produto'+(esgotado?' esgotado':'');
    card.setAttribute('data-cat',cat);
    card.setAttribute('data-estoque',estoque<=0?'zero':(estoque<=3?'ultimas':'estoque'));
    card.setAttribute('data-qtde',estoque);
    card.setAttribute('data-preco',precoVenda);
    card.setAttribute('data-nome',p.nome);
    card.setAttribute('data-id',p.slug);
    var emPromoFoto=emPromo;
    var pctFoto=emPromoFoto?Math.round((1-parseFloat(p.precoPromo)/precoN)*100):0;
    card.setAttribute('data-promo',emPromoFoto?'1':'0');
    /* Card mostra SOMENTE a 1ª foto — sem troca de foto no card; as demais ficam na página do produto */
    var html='<div class="produto-img">'+badgeProduto(estoque)+(emPromoFoto?'<span style="position:absolute;top:56px;right:10px;background:#c0392b;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;z-index:4;box-shadow:0 3px 8px rgba(0,0,0,.25);">-'+pctFoto+'%</span>':'');
    html+='<div class="variante-track">';
    html+='<button class="btn-shr" onclick="compartilharProduto(\''+p.slug+'\')" title="Compartilhar">🔗</button>';
    if(imgs.length){
      html+='<a class="variante-slide" href="'+urlProduto(p.slug)+'" style="cursor:pointer;"><img src="'+escL(imgs[0])+'" alt="'+escL(p.nome)+'" loading="lazy"></a>';
    }else{
      html+='<a class="variante-slide" href="'+urlProduto(p.slug)+'" style="cursor:pointer;"><span style="font-size:42px;color:#b9c2d2;">📦</span></a>';
    }
    html+='</div>';
    html+='</div><div class="produto-body">';
    html+='<span class="produto-cat">'+escL(labelCategoria(cat))+'</span>';
    /* Título vira link nativo para a página de produto */
    html+='<h3><a href="'+urlProduto(p.slug)+'" style="color:inherit;text-decoration:none;">'+escL(p.nome)+'</a></h3>';
    if(p.descricao)html+='<p class="produto-desc">'+escL(p.descricao)+'</p>';
    /* Cores: 2+ cores → bolinhas indicativas; 1 cor → etiqueta simples; 0 → nada */
    if(cores.length>1){
      html+='<div class="produto-cores-dots">';
      cores.forEach(function(c){html+='<span class="core-dot" style="background:'+corHex(c)+'" title="'+escL(c)+'"></span>';});
      html+='</div>';
    }else if(cores.length===1){
      html+='<div class="produto-cor"><span class="mini-swatch" style="background:'+corHex(cores[0])+'"></span> '+escL(cores[0]||'')+'</div>';
    }
    if(emPromo){var pct=Math.round((1-parseFloat(p.precoPromo)/precoN)*100);html+='<div class="produto-preco"><span style="text-decoration:line-through;color:#8a94a8;font-size:13px;font-weight:600;">R$ '+precoLabel(precoN)+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span> <span style="background:#c0392b;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:12px;">-'+pct+'%</span></div>';}else{html+='<div class="produto-preco">'+plabel+' <small>· unidade</small></div>';}
    if(esgotado){
      html+='<button class="btn-pedir" onclick="pedirPeca(\''+p.slug+'\')">🔔 Avise-me quando chegar</button>';
    }else{
      html+='<button class="btn-comprar" onclick="addCarrinho(\''+p.slug+'\',\''+escL(p.nome).replace(/'/g,"\\'")+'\',\''+plabel+'\',\''+precoVenda+'\',\''+precoOrigArg+'\')">'
      +'<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14.6l.1-.1L8.1 12h9.4c.7 0 1.3-.4 1.6-1L22 5H6.2l-.9-2H2v2h2l2.6 6.5L5.5 13c-.3.7-.3 1.5 0 2.2.4.9 1.3 1.5 2.3 1.5h11v-2H8.1c-.5 0-.9-.5-.9-1z"/></svg>'
      +'Adicionar</button>';
    }
    html+='</div>';
    card.innerHTML=html;
    grid.appendChild(card);
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
/* Compartilhar: link da PÁGINA DE PRODUTO no site */
function compartilharProduto(slug){
  var url=urlProdutoAbsoluta(slug);
  function ok(){mostrarToast('🔗 Link copiado! Envie no WhatsApp ou Instagram.');}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(ok).catch(function(){fallbackCopy(url);ok();});}
  else{fallbackCopy(url);ok();}
}
function fecharModalProduto(){document.getElementById('produtoOverlay').classList.remove('show');produtoSel=null;}
/* Adicionar ao carrinho a partir do MODAL: adiciona, fecha o card e mostra a confirmação */
function addCarrinhoModal(slug,nome,plabel,preco,precoOrig){
  if(typeof addCarrinho==='function'){addCarrinho(slug,nome,plabel,preco,precoOrig);}
  fecharModalProduto();
  mostrarToast('🛒 Adicionado ao carrinho!');
}
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
  var precoN=parseFloat(p.preco)||0;
  var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
  var precoVenda=emPromo?parseFloat(p.precoPromo):precoN;
  var plabel='R$ '+precoLabel(precoVenda);
  var precoOrigArg=emPromo?precoN:'';
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
  if(emPromo){html+='<div class="pm-preco"><span style="text-decoration:line-through;color:#8a94a8;font-weight:600;font-size:14px;">R$ '+precoLabel(precoN)+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span> <small>· unidade</small></div>';}else{html+='<div class="pm-preco">'+plabel+' <small>· unidade</small></div>';}
  if(esgotado){html+='<button class="btn-pedir" onclick="pedirPeca(\''+p.slug+'\')">🔔 Avise-me quando chegar</button>';}
  else{html+='<button class="btn-comprar" onclick="addCarrinhoModal(\''+p.slug+'\',\''+escL(p.nome).replace(/'/g,"\\'")+'\',\''+plabel+'\',\''+precoVenda+'\',\''+precoOrigArg+'\')">🛒 Adicionar ao carrinho</button>';}
  html+='</div>';
  document.getElementById('produtoModalBody').innerHTML=html;
  var ovP=document.getElementById('produtoOverlay');
  ovP.classList.add('show');
  /* Clicar fora do balão (no fundo escuro) fecha o modal — PC e mobile */
  ovP.onclick=function(ev){if(ev.target===ovP)fecharModalProduto();};
}
function carregarProdutos(tentarNovamente){
  var grid=document.getElementById('lojaGrid');
  grid.innerHTML='<div class="loja-carregando">Carregando produtos…<br><small>(se a loja estiver "fria", pode levar até 1 minuto na primeira vez)</small></div>';
  /* Timeout de 60s: se o backend estiver frio, aborta em vez de girar para sempre */
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=ctrl?setTimeout(function(){try{ctrl.abort();}catch(e){}},60000):null;
  fetch(API_LOJA+'/loja/produtos',{cache:'no-store',signal:ctrl?ctrl.signal:undefined})
  .then(function(r){
    if(timer)clearTimeout(timer);
    return r.json();
  })
  .then(function(t){
    produtosLoja=(t.produtos||t)||[];
    if(!Array.isArray(produtosLoja))produtosLoja=[];
    renderProdutos(produtosLoja);
    qtdPorCategoria();
    aplicarFiltros();
    atualizarCarrinhoUI();
        /* Compra direta da página de produto (?produto=slug&carrinho=1): adiciona ao carrinho e abre o carrinho */
    var _qp=new URLSearchParams(window.location.search);
    var _pq=_qp.get('produto');
    var _irCarrinho=_qp.get('carrinho')==='1';
    if(_pq){
      var _p=produtosLoja.find(function(x){return x.slug===_pq;});
      if(_p&&_irCarrinho){
        var _est=parseInt(_p.estoque)||0;
        var _pn=parseFloat(_p.preco)||0;
        var _promo=_p.promo&&parseFloat(_p.precoPromo)>0&&parseFloat(_p.precoPromo)<_pn;
        var _pv=_promo?parseFloat(_p.precoPromo):_pn;
        var _pl='R$ '+precoLabel(_pv);
        var _po=_promo?_pn:'';
        if(typeof addCarrinho==='function'){addCarrinho(_p.slug,_p.nome,_pl,_pv,_po);}
        if(typeof window.flutuanteAbrir==='function'){window.flutuanteAbrir();}
        else if(typeof abrirCarrinho==='function'){abrirCarrinho();}
      }else if(_p){
        /* Link antigo sem carrinho=1: mantém o comportamento de sempre (abre o modal) */
        abrirModalProduto(_pq);
      }
    }
  })
  .catch(function(e){
    /* 1ª falha: tenta de novo automaticamente (resolve 304 vazio / oscilação) */
    if(tentarNovamente!==true){setTimeout(function(){carregarProdutos(true);},1500);return;}
    grid.innerHTML='<div class="loja-carregando">Não foi possível carregar a loja agora.<br>'
      +'<small style="color:#a93226;">'+escL(String((e&&e.message)?e.message:e))+'</small><br>'
      +'<button class="btn-comprar" style="margin-top:14px;" onclick="carregarProdutos()">🔄 Tentar novamente</button></div>';
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
  document.querySelectorAll('.check-item input').forEach(function(el){el.checked=false;});
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