/* ===== Meu 3D Labs — loja/vitrine: produtos, favoritos, autocomplete, filtros e flutuantes ===== */
var produtosLoja = [];
function escL(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function precoLabel(v){v=parseFloat(v)||0;return v.toFixed(2).replace('.',',');}
/* Detecta teste local: em localhost/file usa caminho relativo; no ar usa URL própria */
var LOCAL_TESTE=(location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1');
/* ===== CSS injetado: modal fixo no rodapé (mobile) + bolinhas de cores + spinner de carregamento ===== */
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
  '.loja-spin{display:inline-block;width:26px;height:26px;border:3px solid #e3e8ef;border-top-color:#f26522;border-radius:50%;animation:m3lSpin .8s linear infinite;margin-bottom:10px;}' +
  '@keyframes m3lSpin{to{transform:rotate(360deg);}}';
  document.head.appendChild(css);
})();
/* ===== NOVO: CSS dos favoritos, sugestões, histórico e aviso de boas-vindas ===== */
(function(){
  var css=document.createElement('style');
  css.textContent=
  /* coração de favorito nos cards */
  '.fav-btn{position:absolute;top:10px;right:10px;z-index:5;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid #f0d6c8;box-shadow:0 2px 6px rgba(15,30,61,.18);cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;transition:transform .15s;padding:0;}' +
  '.fav-btn:hover{transform:scale(1.15);}' +
  '.fav-btn.on{background:#ffe9ed;border-color:#f2b8c4;}' +
  /* cards do histórico "continue de onde parou" */
  '.m3l-vcard{flex:0 0 150px;background:#fff;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:.2s;text-decoration:none;}' +
  '.m3l-vcard:hover{border-color:#f26522;transform:translateY(-3px);box-shadow:0 6px 16px rgba(15,30,61,.12);}' +
  '.m3l-vcard img{width:100%;height:100px;object-fit:cover;background:#fff;display:block;}' +
  '.m3l-vnoimg{height:100px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#b9c2d2;}' +
  '.m3l-vcard h4{font-size:12px;color:#0f1e3d;font-weight:700;line-height:1.3;padding:7px 9px 0;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
  '.m3l-vpreco{font-size:13px;font-weight:800;color:#f26522;padding:2px 9px 9px;}' +
  /* sugestões dentro do "nenhum produto encontrado" */
  '.sem-sugestoes{margin-top:18px;}' +
  '.ss-titulo{font-size:14px;font-weight:800;color:#0f1e3d;margin-bottom:10px;}' +
  '.ss-cards{display:flex;gap:12px;flex-wrap:wrap;}' +
  '.ss-cards .m3l-vcard{flex:0 0 140px;}' +
  '.ss-cta{display:inline-block;margin-top:16px;background:#25d366;color:#fff;font-weight:700;font-size:14px;padding:11px 20px;border-radius:999px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,.35);transition:.2s;}' +
  '.ss-cta:hover{filter:brightness(1.05);transform:translateY(-1px);}' +
  /* aviso flutuante de boas-vindas (cooldown 1h) */
  '.m3l-boasvindas{position:fixed;left:16px;bottom:16px;z-index:99990;width:300px;max-width:calc(100vw - 32px);background:#fff;border:1.5px solid #f2b28f;border-radius:16px;padding:18px 16px 14px;box-shadow:0 12px 34px rgba(15,30,61,.25);animation:m3lSubir .35s ease;box-sizing:border-box;}' +
  '@keyframes m3lSubir{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}' +
  '.m3l-boasvindas .mb-close{position:absolute;top:8px;right:10px;background:none;border:none;font-size:14px;color:#8a94a8;cursor:pointer;padding:4px;}' +
  '.m3l-boasvindas .mb-close:hover{color:#c0392b;}' +
  '.m3l-boasvindas .mb-ico{font-size:24px;margin-bottom:4px;}' +
  '.m3l-boasvindas .mb-titulo{font-size:15px;font-weight:800;color:#0f1e3d;margin-bottom:5px;}' +
  '.m3l-boasvindas .mb-txt{font-size:12.5px;color:#4a5161;line-height:1.55;margin:0 0 10px;}' +
  '.m3l-boasvindas .mb-cta{display:block;background:linear-gradient(135deg,#f26522,#ff7c3d);color:#fff;font-weight:700;font-size:13px;text-align:center;padding:10px;border-radius:10px;text-decoration:none;transition:.2s;}' +
  '.m3l-boasvindas .mb-cta:hover{filter:brightness(1.05);}' +
  /* autocomplete no topo */
  '.m3l-auto{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1px solid #e2e6ee;border-radius:14px;box-shadow:0 14px 34px rgba(15,30,61,.22);z-index:9999;overflow:hidden;display:none;}' +
  '.m3l-auto-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 12px;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit;border-bottom:1px solid #f0f2f6;}' +
  '.m3l-auto-item:last-child{border-bottom:none;}' +
  '.m3l-auto-item:hover{background:#fff4ec;}' +
  '.m3l-auto-item img{width:38px;height:38px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#f0f2f6;}' +
  '.m3l-auto-noimg{width:38px;height:38px;border-radius:8px;background:#f0f2f6;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}' +
  '.m3l-auto-nome{flex:1;min-width:0;font-size:13px;font-weight:600;color:#0f1e3d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
  '.m3l-auto-preco{font-size:12.5px;font-weight:800;color:#f26522;white-space:nowrap;}' +
  '@media(max-width:640px){.m3l-boasvindas{left:12px;right:12px;bottom:100px;width:auto;}}';
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
/* ================= NOVO: FAVORITOS (localStorage m3d_favoritos) ================= */
var FAV_CHAVE='m3d_favoritos';
function favLista(){
  try{var a=JSON.parse(localStorage.getItem(FAV_CHAVE)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}
}
function toggleFavorito(slug,btn){
  var l=favLista();
  var i=l.indexOf(slug);
  if(i===-1){
    l.push(slug);
    if(btn){btn.classList.add('on');btn.textContent='❤️';}
    mostrarToast('❤️ Salvo nos seus favoritos!');
  }else{
    l.splice(i,1);
    if(btn){btn.classList.remove('on');btn.textContent='♡';}
    mostrarToast('Removido dos favoritos.');
  }
  try{localStorage.setItem(FAV_CHAVE,JSON.stringify(l));}catch(e){}
  if(categoriaAtiva==='favoritos')aplicarFiltros();
  qtdPorCategoria();
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
  var favs=favLista();
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
    var isFav=favs.indexOf(p.slug)!==-1;
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
    card.setAttribute('data-material',String(p.material||'').toLowerCase().trim());
    /* Card mostra SOMENTE a 1ª foto — sem troca de foto no card; as demais ficam na página do produto */
    var html='<div class="produto-img">'+badgeProduto(estoque)+(emPromoFoto?'<span style="position:absolute;top:56px;right:10px;background:#c0392b;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;z-index:4;box-shadow:0 3px 8px rgba(0,0,0,.25);">-'+pctFoto+'%</span>':'');
    /* NOVO: coração de favorito (agora é o único botão no canto da foto) */
    html+='<button class="fav-btn'+(isFav?' on':'')+'" type="button" onclick="toggleFavorito(\''+p.slug+'\',this)" title="'+(isFav?'Remover dos favoritos':'Salvar nos favoritos')+'" aria-label="Favoritar">'+(isFav?'❤️':'♡')+'</button>';
    html+='<div class="variante-track">';
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
    /* Pagamento em DUAS linhas: Pix (com valor) em cima; cartão (12x, sem valor) embaixo */
    if(!esgotado){
      var _pix='R$ '+precoLabel(precoVenda*0.95);
      html+='<div style="font-size:12px;color:#4a5161;line-height:1.5;margin-top:5px;"><img src="img/logo/pix.png" alt="Pix" style="width:14px;height:14px;vertical-align:-3px;margin-right:4px;"><b style="color:#0f1e3d;">'+_pix+' no Pix</b> <span style="color:#8a94a8;">· 5% OFF</span></div>';
      html+='<div style="font-size:12px;color:#4a5161;line-height:1.5;margin-top:3px;">ou até <b style="color:#0f1e3d;">12x</b> no cartão <img src="img/logo/cartao.png" alt="Bandeiras aceitas" style="height:13px;vertical-align:-2px;margin-left:2px;"></div>';
    }
    if(emPromo){var pct=Math.round((1-parseFloat(p.precoPromo)/precoN)*100);html+='<div class="produto-preco" style="margin-top:2px;"><span style="text-decoration:line-through;color:#8a94a8;font-size:13px;font-weight:600;">R$ '+precoLabel(precoN)+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span> <span style="background:#c0392b;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:12px;">-'+pct+'%</span></div>';}else{html+='<div class="produto-preco" style="margin-top:2px;">'+plabel+' <small>· unidade</small></div>';}
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
/* ===== CSS do destaque de promoção (faixa de oferta dinâmica) ===== */
(function(){
  var css=document.createElement('style');
  css.textContent=
  '.destaque-promo{display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#fff7f2,#ffeadf);border:1.5px solid #f2b28f;border-radius:16px;padding:14px 18px;margin-top:22px;cursor:pointer;box-shadow:0 4px 18px rgba(242,101,34,.12);transition:transform .15s,box-shadow .15s;box-sizing:border-box;}' +
  '.destaque-promo:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(242,101,34,.2);}' +
  '.destaque-promo .dp-img{width:84px;height:84px;border-radius:12px;overflow:hidden;flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #f0e0d4;}' +
  '.destaque-promo .dp-img img{width:100%;height:100%;object-fit:cover;}' +
  '.destaque-promo .dp-noimg{font-size:34px;}' +
  '.destaque-promo .dp-info{flex:1;min-width:0;}' +
  '.destaque-promo .dp-linha1{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;}' +
  '.destaque-promo .dp-tag{background:#f26522;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:12px;letter-spacing:.5px;}' +
  '.destaque-promo .dp-cat{font-size:11px;color:#8a94a8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}' +
  '.destaque-promo .dp-nome{font-size:16px;font-weight:800;color:#0f1e3d;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
  '.destaque-promo .dp-preco{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
  '.destaque-promo .dp-antigo{text-decoration:line-through;color:#8a94a8;font-size:14px;font-weight:600;}' +
  '.destaque-promo .dp-promo{color:#c0392b;font-size:20px;font-weight:800;}' +
  '.destaque-promo .dp-badge{background:#c0392b;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:12px;}' +
  '.destaque-promo .dp-cta{margin-left:auto;background:#0f1e3d;color:#fff;font-size:13px;font-weight:700;padding:9px 16px;border-radius:999px;white-space:nowrap;flex-shrink:0;}' +
  '@media(max-width:640px){' +
  '.destaque-promo{gap:12px;padding:12px 14px;}' +
  '.destaque-promo .dp-img{width:68px;height:68px;}' +
  '.destaque-promo .dp-nome{font-size:14px;}' +
  '.destaque-promo .dp-promo{font-size:17px;}' +
  '.destaque-promo .dp-cta{display:none;}' +
  '}';
  document.head.appendChild(css);
})();
/* ===== Destaque de promoção — faixa dinâmica com a maior oferta COM estoque ===== */
function montarDestaquePromo(){
  var antigo=document.getElementById('destaquePromo');
  if(antigo)antigo.remove();
  var melhor=null,melhorPct=0;
  produtosLoja.forEach(function(p){
    var estoque=parseInt(p.estoque)||0;
    var precoN=parseFloat(p.preco)||0;
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
    if(!emPromo||estoque<=0)return;
    var pct=Math.round((1-parseFloat(p.precoPromo)/precoN)*100);
    if(pct>melhorPct){melhorPct=pct;melhor=p;}
  });
  if(!melhor)return;
  var imgs=melhor.imagens||[];
  var cat=labelCategoria((melhor.categoria||'outros').toLowerCase());
  var html='<div class="dp-img">';
  if(imgs.length){html+='<img src="'+escL(imgs[0])+'" alt="'+escL(melhor.nome)+'" loading="lazy">';}
  else{html+='<span class="dp-noimg">📦</span>';}
  html+='</div><div class="dp-info">';
  html+='<div class="dp-linha1"><span class="dp-tag">⚡ OFERTA</span><span class="dp-cat">'+escL(cat)+'</span></div>';
  html+='<h3 class="dp-nome">'+escL(melhor.nome)+'</h3>';
  html+='<div class="dp-preco"><span class="dp-antigo">R$ '+precoLabel(parseFloat(melhor.preco))+'</span><span class="dp-promo">R$ '+precoLabel(parseFloat(melhor.precoPromo))+'</span><span class="dp-badge">-'+melhorPct+'%</span></div>';
  html+='</div><span class="dp-cta">Ver produto →</span>';
  var bloco=document.createElement('div');
  bloco.className='destaque-promo';
  bloco.id='destaquePromo';
  bloco.setAttribute('role','link');
  bloco.setAttribute('aria-label','Oferta em destaque: '+melhor.nome);
  bloco.innerHTML=html;
  bloco.onclick=function(){location.href=urlProduto(melhor.slug);};
  var alvo=document.querySelector('.hero .container');
  if(alvo){alvo.appendChild(bloco);}
  else{var lay=document.querySelector('.loja-layout');if(lay)lay.parentNode.insertBefore(bloco,lay);}
}
/* ===== NOVO: Continue de onde parou (lê o histórico do produto.html — m3d_vistos_recentes) ===== */
function montarVistos(){
  var antigo=document.getElementById('faixaVistos');
  if(antigo)antigo.remove();
  var hist=[];
  try{hist=JSON.parse(localStorage.getItem('m3d_vistos_recentes')||'[]');}catch(e){hist=[];}
  if(!Array.isArray(hist))hist=[];
  var itens=hist.map(function(s){
    var r=null;
    produtosLoja.forEach(function(p){if(p.ativo!==false&&String(p.slug)===String(s))r=p;});
    return r;
  }).filter(Boolean).slice(0,8);
  if(!itens.length)return;
  var bloco=document.createElement('div');
  bloco.className='fn-strip';
  bloco.id='faixaVistos';
  bloco.style.display='block';
  bloco.innerHTML='<div class="fn-head"><span class="fn-tag">HISTÓRICO</span><h2 class="fn-title">👀 Continue de onde parou</h2>'
    +'<div class="fn-arrows"><button class="fn-arrow" onclick="vistosScroll(-1)" aria-label="Anterior">‹</button><button class="fn-arrow" onclick="vistosScroll(1)" aria-label="Próximo">›</button></div></div>'
    +'<div class="fn-track" id="vistosTrack"></div>';
  var tr=bloco.querySelector('#vistosTrack');
  itens.forEach(function(x){
    var rp=parseFloat(x.preco)||0;
    var promo=x.promo&&parseFloat(x.precoPromo)>0&&parseFloat(x.precoPromo)<rp;
    var img=(x.imagens&&x.imagens[0])||'';
    var a=document.createElement('a');
    a.className='m3l-vcard';
    a.href=urlProduto(x.slug);
    a.innerHTML=(img?'<img src="'+escL(img)+'" alt="'+escL(x.nome)+'" loading="lazy">':'<span class="m3l-vnoimg">📦</span>')
      +'<h4>'+escL(x.nome)+'</h4>'
      +'<span class="m3l-vpreco">'+(promo?'R$ '+precoLabel(x.precoPromo):'R$ '+precoLabel(rp))+'</span>';
    tr.appendChild(a);
  });
  var alvo=document.querySelector('.hero .container');
  if(alvo)alvo.appendChild(bloco);
}
function vistosScroll(dir){
  var tr=document.getElementById('vistosTrack');
  if(tr&&tr.scrollBy)tr.scrollBy({left:dir*280,behavior:'smooth'});
}
/* ===== NOVO: busca sem resultado inteligente (sugestões + WhatsApp) ===== */
function popularSemSugestoes(vazio){
  var box=document.getElementById('semSugestoes');
  if(!box)return;
  var tx=document.getElementById('semTxt');
  if(!vazio){box.innerHTML='';if(tx)tx.textContent='Tente remover algum filtro para ver mais resultados.';return;}
  if(tx)tx.textContent=buscaAtiva?('Nada encontrado para "'+buscaAtiva+'". Veja sugestões abaixo ou peça sob medida.'):'Tente remover algum filtro para ver mais resultados.';
  var disp=produtosLoja.filter(function(p){return p.ativo!==false&&(parseInt(p.estoque)||0)>0;});
  var favs=disp.filter(function(p){return favLista().indexOf(p.slug)!==-1;});
  var dest=disp.filter(function(p){return p.destaque;});
  var hist=[];
  try{hist=JSON.parse(localStorage.getItem('m3d_vistos_recentes')||'[]');}catch(e){hist=[];}
  if(!Array.isArray(hist))hist=[];
  var ordem=hist.map(function(s){var r=null;disp.forEach(function(p){if(r===null&&String(p.slug)===String(s))r=p;});return r;}).filter(Boolean);
  var sug=favs.concat(ordem).concat(dest).concat(disp);
  var vistos={},fin=[];
  sug.forEach(function(p){if(!vistos[p.slug]){vistos[p.slug]=1;fin.push(p);}});
  fin=fin.slice(0,3);
  var html='';
  if(fin.length){
    html+='<div class="ss-titulo">Enquanto isso, talvez goste destas:</div><div class="ss-cards">';
    fin.forEach(function(p){
      var rp=parseFloat(p.preco)||0;
      var promo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<rp;
      var img=(p.imagens&&p.imagens[0])||'';
      html+='<a class="m3l-vcard" href="'+urlProduto(p.slug)+'">'
        +(img?'<img src="'+escL(img)+'" alt="'+escL(p.nome)+'" loading="lazy">':'<span class="m3l-vnoimg">📦</span>')
        +'<h4>'+escL(p.nome)+'</h4>'
        +'<span class="m3l-vpreco">'+(promo?'R$ '+precoLabel(p.precoPromo):'R$ '+precoLabel(rp))+'</span></a>';
    });
    html+='</div>';
  }
  var msg=buscaAtiva
    ?('Olá! Procurei "'+buscaAtiva+'" na loja e não encontrei. Quero pedir uma peça sob medida! 😊')
    :'Olá! Não encontrei o que procuro na loja. Quero um orçamento sob medida! 😊';
  html+='<a class="ss-cta" href="https://wa.me/'+WHATSAPP_LOJA+'?text='+encodeURIComponent(msg)+'" target="_blank" rel="noopener">💬 Não achou? Pede a sua pelo WhatsApp</a>';
  box.innerHTML=html;
}
/* ===== NOVO: aviso flutuante de boas-vindas (pendência antiga) — cooldown de 1h ===== */
(function(){
  var CHAVE='m3d_aviso_boasvindas';
  var COOLDOWN=60*60*1000;
  var ultimo=0;
  try{ultimo=parseInt(localStorage.getItem(CHAVE))||0;}catch(e){ultimo=0;}
  if(Date.now()-ultimo<COOLDOWN)return;
  setTimeout(function(){
    try{localStorage.setItem(CHAVE,String(Date.now()));}catch(e){}
    var d=document.createElement('div');
    d.className='m3l-boasvindas';
    d.innerHTML='<button class="mb-close" type="button" onclick="this.parentNode.remove()" aria-label="Fechar aviso">✕</button>'
      +'<div class="mb-ico">🛍️</div>'
      +'<div class="mb-titulo">Bem-vindo à loja!</div>'
      +'<p class="mb-txt">Aqui são peças <b>prontas para entrega</b> — quantidade limitada de cada modelo. Esgotou? A gente produz <b>sob encomenda</b>, é só pedir.</p>'
      +'<a class="mb-cta" href="enviar-projeto.html">✨ Pedir peça sob medida</a>';
    document.body.appendChild(d);
  },1600);
})();
/* ===== NOVO: busca com sugestões (autocomplete no topo) ===== */
(function(){
  function iniciar(){
    var input=document.getElementById('topBuscaInput');
    var wrap=document.getElementById('topBusca');
    if(!input||!wrap)return;
    wrap.style.position='relative';
    var dd=document.createElement('div');
    dd.className='m3l-auto';
    dd.style.display='none';
    wrap.appendChild(dd);
    function fechar(){dd.style.display='none';dd.innerHTML='';}
    function render(){
      var q=(input.value||'').trim().toLowerCase();
      if(q.length<2){fechar();return;}
      var res=produtosLoja.filter(function(p){
        return p.ativo!==false&&String(p.nome||'').toLowerCase().indexOf(q)>-1;
      }).slice(0,6);
      if(!res.length){fechar();return;}
      var h='';
      res.forEach(function(p){
        var rp=parseFloat(p.preco)||0;
        var promo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<rp;
        var img=(p.imagens&&p.imagens[0])||'';
        h+='<button type="button" class="m3l-auto-item" data-slug="'+escL(p.slug)+'">'
          +(img?'<img src="'+escL(img)+'" alt="">':'<span class="m3l-auto-noimg">📦</span>')
          +'<span class="m3l-auto-nome">'+escL(p.nome)+'</span>'
          +'<span class="m3l-auto-preco">'+(promo?'R$ '+precoLabel(p.precoPromo):'R$ '+precoLabel(rp))+'</span></button>';
      });
      dd.innerHTML=h;
      dd.style.display='block';
      dd.querySelectorAll('.m3l-auto-item').forEach(function(b){
        b.addEventListener('mousedown',function(ev){
          ev.preventDefault();
          fechar();
          location.href=urlProduto(b.getAttribute('data-slug'));
        });
      });
    }
    input.addEventListener('input',render);
    input.addEventListener('focus',render);
    input.addEventListener('keydown',function(e){if(e.key==='Escape'||e.key==='Enter')fechar();});
    document.addEventListener('click',function(e){if(!wrap.contains(e.target))fechar();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);
  else iniciar();
})();
function carregarProdutos(tentarNovamente){
  var grid=document.getElementById('lojaGrid');
  /* Carregamento limpo: só o texto essencial + spinner (sem detalhes técnicos pro cliente) */
  grid.innerHTML='<div class="loja-carregando"><span class="loja-spin"></span><br>Carregando produtos…</div>';
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
    if(typeof montarDestaquePromo==='function')montarDestaquePromo();
    if(typeof montarVistos==='function')montarVistos();
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
  for(var k in mapa){
    var el=document.getElementById(mapa[k]);
    if(el){
      el.textContent='('+qtds[k]+')';
      /* categoria zerada fica escondida; quando entra produto, volta a aparecer */
      var btn=el.closest('.cat-btn');
      if(btn&&k!=='todos'){btn.style.display=(qtds[k]===0)?'none':'';}
    }
  }
  qtdMateriais();
  /* NOVO: contagem e visibilidade da aba Favoritos */
  var favq=favLista().filter(function(s){
    return !!document.querySelector('.produto[data-id="'+s+'"]');
  }).length;
  var qf=document.getElementById('qtdFavoritos');
  if(qf){
    qf.textContent='('+favq+')';
    var bf=qf.closest('.cat-btn');
    if(bf)bf.style.display=(favq===0)?'none':'';
  }
}
/* contagem por material — material zerado fica escondido; grupo inteiro some se nada tiver material */
function qtdMateriais(){
  var prods=document.querySelectorAll('.produto');
  var qtds={pla:0,petg:0,tpu:0,abs:0};
  var total=0;
  prods.forEach(function(p){
    var m=(p.getAttribute('data-material')||'').toLowerCase().trim();
    if(qtds[m]!==undefined){qtds[m]++;total++;}
  });
  var mapa={pla:'qtdMatPla',petg:'qtdMatPetg',tpu:'qtdMatTpu',abs:'qtdMatAbs'};
  for(var k in mapa){
    var el=document.getElementById(mapa[k]);
    if(el){
      el.textContent='('+qtds[k]+')';
      var lbl=el.closest('.check-item');
      if(lbl)lbl.style.display=(qtds[k]===0)?'none':'';
    }
  }
  var grp=document.getElementById('grupoMaterial');
  if(grp)grp.style.display=(total===0)?'none':'';
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
  var mats=[];
  var promo=false;
  document.querySelectorAll('.check-item input').forEach(function(el){
    if(el.checked&&(el.value==='estoque'||el.value==='ultimas'||el.value==='zero'))disp.push(el.value);
    if(el.checked&&(el.value==='ate25'||el.value==='25a50'||el.value==='50a100'||el.value==='mais100'))precos.push(el.value);
    if(el.checked&&el.value==='promo')promo=true;
    /* materiais marcados filtram; sem nenhum marcado = mostra tudo */
    if(el.checked&&el.classList.contains('mat-check'))mats.push(el.value);
  });
  var favs=favLista();
  var prods=document.querySelectorAll('.produto');
  var visiveis=0;
  prods.forEach(function(p){
    var ok=true;
    if(categoriaAtiva!=='todos'&&p.getAttribute('data-cat')!==categoriaAtiva)ok=false;
    /* NOVO: aba Favoritos — mostra só os slugs salvos */
    if(ok&&categoriaAtiva==='favoritos'&&favs.indexOf(p.getAttribute('data-id'))===-1)ok=false;
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
    if(ok&&mats.length&&(mats.indexOf((p.getAttribute('data-material')||'').toLowerCase().trim())===-1))ok=false;
    if(ok){p.style.display='';visiveis++;}else{p.style.display='none';}
  });
  if(typeof sincronizaChip==='function')sincronizaChip();
  document.getElementById('contagem').textContent=visiveis;
  /* Botão "Limpar filtros" só aparece quando existe filtro DE VERDADE marcado */
  var temFiltro=buscaAtiva||categoriaAtiva!=='todos';
  if(!temFiltro){
    document.querySelectorAll('.check-item input').forEach(function(el){
      if(el.classList.contains('mat-check')){if(el.checked)temFiltro=true;}
      else if(!el.checked)temFiltro=true;
    });
  }
  var bt=document.getElementById('btnLimparTopo');
  if(bt)bt.style.display=temFiltro?'inline-flex':'none';
  document.getElementById('semResultado').style.display=(visiveis===0)?'block':'none';
  if(typeof popularSemSugestoes==='function')popularSemSugestoes(visiveis===0);
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