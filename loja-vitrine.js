/* ===== Meu 3D Labs — loja/vitrine: produtos, favoritos, autocomplete, filtros e flutuantes ===== */
var produtosLoja = [];
/* NOVO: cor selecionada em cada card da grade (slug → cor) */
var coresSelGrade = {};
function escL(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function precoLabel(v){v=parseFloat(v)||0;return v.toFixed(2).replace('.',',');}
/* ================= MÍDIA: imagem OU vídeo (loop, sem som) ================= */
function ehVideoUrl(u){
  return /\.(webm|mp4|mov|m4v)(\?|#|$)/i.test(String(u||'').split('#')[0]);
}
/* lazy=true → preload none + sem autoplay (o observer toca quando aparece) */
function midiaHtml(u, alt, lazy){
  var src = String(u||'').split('#')[0];
  if(!src) return '';
  if(ehVideoUrl(src)){
    if(lazy){
      return '<video class="m3l-video" src="'+escL(src)+'" muted loop playsinline preload="none" disablepictureinpicture aria-label="'+escL(alt||'')+'"></video>';
    }
    return '<video class="m3l-video" src="'+escL(src)+'" muted loop playsinline autoplay preload="metadata" disablepictureinpicture aria-label="'+escL(alt||'')+'"></video>';
  }
  return '<img src="'+escL(src)+'" alt="'+escL(alt||'')+'"'+(lazy?' loading="lazy"':'')+'>';
}
/* ===== SELO DE DIMENSÕES ===== */
function seloPeso(gramas){
  var g=parseFloat(gramas);
  if(!g||g<=0||isNaN(g))return '';
  if(g>=1000){
    var kg=g/1000;
    return (kg%1===0?kg.toFixed(0):kg.toFixed(1).replace('.',','))+' kg';
  }
  return Math.round(g)+' g';
}
function seloCm(valor){
  var v=parseFloat(valor);
  if(!v||v<=0||isNaN(v))return '';
  return (v%1===0?v.toFixed(0):v.toFixed(1).replace('.',','))+' cm';
}
function montarSeloDimensoes(p){
  if(!p)return '';
  var altura=seloCm(p.altura);
  var peso=seloPeso(p.peso);
  var comprimento=seloCm(p.profundidade!==undefined?p.profundidade:p.comprimento);
  var partes=[];
  if(altura){partes.push(altura);}
  else if(comprimento){partes.push(comprimento);}
  if(peso)partes.push(peso);
  if(!partes.length)return '';
  return '<span class="selo-dimensoes">'+partes.join(' · ')+'</span>';
}
/* NOVO: SELO DE MATERIAL (fica SEMPRE abaixo de dimensões) */
function montarSeloMaterial(p){
  if(!p)return '';
  var m=String(p.material||'').trim().toUpperCase();
  if(!m)return '';
  return '<span class="selo-material">'+escL(m)+'</span>';
}
var LOCAL_TESTE=(location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1');
/* ===== CSS injetado ===== */
(function(){
  var css=document.createElement('style');
  css.textContent=
  '#produtoOverlay{cursor:pointer;}' +
  '#produtoOverlay .produto-modal{cursor:default;}' +
  '@media(max-width:768px){' +
  '#produtoModalBody .btn-comprar,#produtoModalBody .btn-pedir{position:fixed;left:16px;right:16px;bottom:16px;z-index:99995;margin:0;width:auto;box-shadow:0 6px 20px rgba(0,0,0,.35);justify-content:center;}' +
  '#produtoOverlay .produto-modal{padding-bottom:0;}' +
  '}' +
  /* ===== SELOS EMPILHADOS: dimensões em cima, material embaixo ===== */
  '.produto-img .selos-card{position:absolute;top:10px;left:10px;z-index:4;display:flex;flex-direction:column;align-items:flex-start;gap:5px;pointer-events:none;max-width:calc(100% - 64px);}' +
  '.produto-img .selos-card .selo-dimensoes{position:static !important;top:auto !important;left:auto !important;margin:0 !important;}' +
  '.selo-material{display:inline-flex;align-items:center;background:#f26522;color:#fff;font-size:10px;font-weight:800;letter-spacing:.45px;line-height:1;padding:4px 9px;border-radius:20px;box-shadow:0 2px 8px rgba(242,101,34,.35);text-transform:uppercase;white-space:nowrap;}' +
  /* ===== BOLINHAS DE COR CLICÁVEIS ===== */
  '.produto-cores-dots{display:flex;align-items:center;gap:7px;margin-top:8px;flex-wrap:wrap;}' +
  '.produto-cores-dots .core-dot{width:17px;height:17px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px #d9dee8;cursor:pointer;transition:transform .15s,box-shadow .15s;}' +
  '.produto-cores-dots .core-dot:hover{transform:scale(1.18);box-shadow:0 0 0 2px #f26522;}' +
  '.produto-cores-dots .core-dot.on{transform:scale(1.2);box-shadow:0 0 0 2px #f26522,0 0 0 4px rgba(242,101,34,.22);}' +
  '.cor-sel-txt{font-size:11.5px;color:#0f7a44;font-weight:700;margin-top:5px;line-height:1.3;}' +
  '.cor-aviso-sel{font-size:11px;color:#b26a00;font-weight:700;margin-top:5px;line-height:1.35;}' +
  /* ===== VÍDEO DE PRODUTO (loop, sem som) ===== */
  '.produto-img .variante-slide video{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;user-select:none;transition:transform .4s ease;background:transparent;}' +
  '.produto:hover .produto-img .variante-slide video{transform:scale(1.05);}' +
  '.pm-img video{max-width:100%;max-height:420px;object-fit:contain;display:block;}' +
  '.dp-img video{width:100%;height:100%;object-fit:cover;display:block;}' +
  '.m3l-vcard video{width:100%;height:100px;object-fit:cover;display:block;background:#f0f2f7;pointer-events:none;}' +
  '.m3l-auto-item video{width:38px;height:38px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#f0f2f6;pointer-events:none;}' +
  '.produto.esgotado .produto-img video{opacity:.6;filter:grayscale(.3);}' +
  '@media (prefers-reduced-motion: reduce){.m3l-video{display:none !important;}}' +
  /* tela de produto não encontrado */
  '.m3l-404{padding:48px 0 64px;text-align:center;}' +
  '.m3l-404 .ico{font-size:56px;line-height:1;margin-bottom:14px;opacity:.85;}' +
  '.m3l-404 h1{font-size:clamp(20px,2.6vw,27px);font-weight:800;color:#0f1e3d;letter-spacing:-.4px;margin:0 0 10px;}' +
  '.m3l-404 p{font-size:14px;color:#5a6474;line-height:1.65;max-width:520px;margin:0 auto 22px;}' +
  '.m3l-404 .acoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}' +
  '.m3l-404 .acoes .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 22px;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;border:none;cursor:pointer;}' +
  '.m3l-404 .acoes .btn-primario{background:#f26522;color:#fff;}' +
  '.m3l-404 .acoes .btn-secundario{background:#eef1f6;color:#0f1e3d;}' +
  '.m3l-404 .slug{margin-top:18px;font-size:11.5px;color:#a0a8b8;font-family:monospace;word-break:break-all;}';
  document.head.appendChild(css);
})();
/* ===== OBSERVER: toca só os vídeos visíveis (economiza banda) ===== */
(function(){
  if(typeof IntersectionObserver==='undefined'){
    window.__m3lRegistrarVideos=function(){};
    return;
  }
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var v=en.target;
      if(en.isIntersecting){
        try{ v.play(); }catch(e){}
      }else{
        try{ v.pause(); }catch(e){}
      }
    });
  },{rootMargin:'160px 0px'});
  window.__m3lRegistrarVideos=function(raiz){
    var alvo=raiz||document;
    if(!alvo.querySelectorAll) return;
    alvo.querySelectorAll('video.m3l-video').forEach(function(v){
      if(v.__m3lObs) return;
      v.__m3lObs=1;
      obs.observe(v);
    });
  };
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
/* ===== Badge de estoque suavizado (sem expor "últimas 1 un.") ===== */
function badgeProduto(q){
  q=parseInt(q)||0;
  if(q<=0)return '<span class="badge esgotado">Sem estoque</span>';
  return '<span class="badge estoque">Em estoque</span>';
}
function urlProduto(slug){return LOCAL_TESTE?'produto.html?produto='+encodeURIComponent(slug||''):'/produto/'+encodeURIComponent(slug||'');}
function urlProdutoAbsoluta(slug){return 'https://meu3dlabs.com.br/produto/'+encodeURIComponent(slug||'');}
function slugDaURL(){
  var m=String(location.pathname||'').match(/\/produto\/([^\/?#]+)/i);
  if(m&&m[1]){
    try{return decodeURIComponent(m[1]);}catch(e){return m[1];}
  }
  var qp=new URLSearchParams(location.search);
  return qp.get('produto')||qp.get('slug')||'';
}
function renderNaoEncontrado(slug){
  var mr=document.querySelector('meta[name="robots"]');
  if(!mr){mr=document.createElement('meta');mr.setAttribute('name','robots');document.head.appendChild(mr);}
  mr.setAttribute('content','noindex, follow');
  document.title='Produto não encontrado | Meu 3D Labs';
  var md=document.querySelector('meta[name="description"]');
  if(md)md.setAttribute('content','O produto que você procura não está disponível ou foi removido. Veja outras peças prontas para entrega na Meu 3D Labs.');
  ['toolbarProdutos','sidebar','lojaGrid','semResultado','filtrosChips','btnLimparTopo'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.style.display='none';
  });
  var faixa=document.getElementById('faixaNovidades');
  if(faixa)faixa.style.display='none';
  var vistos=document.getElementById('faixaVistos');
  if(vistos)vistos.style.display='none';
  var destaque=document.getElementById('destaquePromo');
  if(destaque)destaque.style.display='none';
  var overlay=document.getElementById('produtoOverlay');
  if(overlay)overlay.classList.remove('show');
  var host=document.querySelector('#produtos .loja-main')||document.getElementById('produtos');
  if(!host)return;
  var msgWpp='Olá! Tentei abrir um produto na loja e ele não está mais disponível. Pode me ajudar?';
  var html='<div class="m3l-404">'+
    '<div class="ico">🔍</div>'+
    '<h1>Produto não encontrado</h1>'+
    '<p>Essa peça não está mais disponível — pode ter sido vendida ou removida do catálogo. Veja outras peças prontas para entrega ou peça uma sob medida.</p>'+
    '<div class="acoes">'+
      '<a class="btn btn-primario" href="/loja">🛍️ Ver a loja</a>'+
      '<a class="btn btn-secundario" href="https://wa.me/'+WHATSAPP_LOJA+'?text='+encodeURIComponent(msgWpp)+'" target="_blank" rel="noopener">💬 Falar no WhatsApp</a>'+
    '</div>'+
    (slug?'<div class="slug">/produto/'+escL(slug)+'</div>':'')+
  '</div>';
  var velho=host.querySelector('.m3l-404');
  if(velho)velho.remove();
  var box=document.createElement('div');
  box.innerHTML=html;
  host.insertBefore(box.firstChild,host.firstChild);
  host.scrollIntoView({behavior:'smooth',block:'start'});
}
/* ================= FAVORITOS ================= */
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
  if(categoriasAtivas.indexOf('favoritos')!==-1)aplicarFiltros();
  qtdPorCategoria();
}
/* Foto da cor escolhida, lendo a meta M3DVAR da descrição.
   Cai para a primeira foto do produto quando não houver vínculo. */
function fotoDaCorVitrine(prod, cor){
  if(!prod) return '';
  var imgs = prod.imagens || [];
  if(!imgs.length) return '';
  var limpa = function(u){ return String(u||'').split('#')[0]; };
  var primeira = limpa(imgs[0]);
  if(!cor) return primeira;
  var desc = String(prod.descricao||'');
  var marca = 'M3DVAR:';
  var pos = desc.indexOf(marca);
  if(pos === -1) return primeira;
  try{
    var mapa = JSON.parse(decodeURIComponent(desc.slice(pos + marca.length).trim()));
    var idxs = mapa[cor];
    if(idxs && idxs.length){
      var u = imgs[idxs[0]];
      if(u) return limpa(u);
    }
  }catch(e){}
  return primeira;
}
/* =====================================================================
   NOVO: SELEÇÃO DE COR DIRETO NA GRADE
   - clicar na bolinha seleciona a cor daquele produto
   - o botão Adicionar usa a cor escolhida
   - 1 cor → já entra com ela, sem clique
   - 2+ cores e nada escolhido → balão pedindo para escolher
   ===================================================================== */
function seletorSlug(slug){
  return '.produto[data-id="'+String(slug).replace(/"/g,'\\"')+'"]';
}
function selecionarCorGrade(slug, cor, ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  var s=String(slug), c=String(cor);
  if(coresSelGrade[s]===c){ delete coresSelGrade[s]; }
  else{ coresSelGrade[s]=c; }
  var card=document.querySelector(seletorSlug(s));
  if(!card)return;
  var escolhida=coresSelGrade[s]||'';
  card.querySelectorAll('.produto-cores-dots .core-dot').forEach(function(d){
    d.classList.toggle('on', String(d.getAttribute('data-cor'))===escolhida);
  });
  var linha=card.querySelector('.cor-sel-txt')||card.querySelector('.cor-aviso-sel');
  if(escolhida){
    if(!linha){
      linha=document.createElement('div');
      linha.className='cor-sel-txt';
      var dots=card.querySelector('.produto-cores-dots');
      if(dots&&dots.parentNode)dots.parentNode.insertBefore(linha,dots.nextSibling);
    }
    linha.className='cor-sel-txt';
    linha.textContent='🎨 Cor escolhida: '+escolhida;
  }else{
    if(linha){
      linha.className='cor-aviso-sel';
      linha.textContent='👆 Toque numa bolinha para escolher a cor';
    }
  }
  /* Troca a mídia da vitrine para a da cor escolhida (foto OU vídeo) */
  var prod=null;
  for(var i=0;i<produtosLoja.length;i++){
    if(String(produtosLoja[i].slug)===s){prod=produtosLoja[i];break;}
  }
  var slideEl=card.querySelector('.variante-slide');
  if(slideEl&&prod){
    var nova=fotoDaCorVitrine(prod,escolhida);
    var atual=slideEl.getAttribute('data-midia')||'';
    if(nova&&atual!==nova){
      slideEl.setAttribute('data-midia',nova);
      slideEl.style.transition='opacity .18s ease';
      slideEl.style.opacity='0';
      setTimeout(function(){
        slideEl.innerHTML=midiaHtml(nova,prod.nome,true);
        slideEl.style.opacity='1';
        if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(slideEl);
      },150);
    }
  }
}
function corSelecionadaDe(slug){
  return coresSelGrade[String(slug)]||'';
}
function addCarrinhoGrade(slug){
  var p=null;
  for(var i=0;i<produtosLoja.length;i++){
    if(String(produtosLoja[i].slug)===String(slug)){p=produtosLoja[i];break;}
  }
  if(!p){mostrarToast('Produto não encontrado.');return;}
  var cores=(p.cores||[]).filter(Boolean);
  var sel=corSelecionadaDe(slug);
  if(cores.length>1 && !sel){
    mostrarToast('🎨 Escolha uma cor nas bolinhas para adicionar.');
    var card=document.querySelector(seletorSlug(slug));
    if(card){
      var dots=card.querySelector('.produto-cores-dots');
      if(dots){
        dots.style.transition='box-shadow .25s';
        dots.style.boxShadow='0 0 0 3px rgba(242,101,34,.5)';
        dots.style.borderRadius='10px';
        setTimeout(function(){dots.style.boxShadow='';},1700);
      }
      var aviso=card.querySelector('.cor-aviso-sel');
      if(!aviso){
        aviso=document.createElement('div');
        aviso.className='cor-aviso-sel';
        aviso.textContent='👆 Toque numa bolinha para escolher a cor';
        if(dots&&dots.parentNode)dots.parentNode.insertBefore(aviso,dots.nextSibling);
      }
    }
    return;
  }
  var corFinal = cores.length>1 ? sel : (cores.length===1 ? cores[0] : '');
  var precoN=parseFloat(p.preco)||0;
  var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
  var venda=emPromo?parseFloat(p.precoPromo):precoN;
  var plabel='R$ '+precoLabel(venda);
  if(typeof addCarrinho==='function'){
    addCarrinho(p.slug,p.nome,plabel,venda,emPromo?precoN:'',corFinal);
  }
  mostrarToast('🛒 Adicionado ao carrinho!'+(corFinal?' ('+corFinal+')':''));
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
    var sr=document.getElementById('semResultado');
    if(sr)sr.style.display='none';
    return;
  }
  var favs=favLista();
  lista.forEach(function(p){
    var estoque=parseInt(p.estoque)||0;
    var esgotado=estoque<=0;
    var imgs=p.imagens||[];
    var cores=(p.cores||[]).filter(Boolean);
    var precoN=parseFloat(p.preco)||0;
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
    var precoVenda=emPromo?parseFloat(p.precoPromo):precoN;
    var plabel='R$ '+precoLabel(precoVenda);
    var cat=(p.categoria||'outros').toLowerCase();
    var isFav=favs.indexOf(p.slug)!==-1;
    var selCor=corSelecionadaDe(p.slug);
    var card=document.createElement('div');
    card.className='produto'+(esgotado?' esgotado':'');
    card.setAttribute('data-cat',cat);
    card.setAttribute('data-estoque',estoque<=0?'zero':'estoque');
    card.setAttribute('data-qtde',estoque);
    card.setAttribute('data-preco',precoVenda);
    card.setAttribute('data-nome',p.nome);
    card.setAttribute('data-id',p.slug);
    card.setAttribute('data-promo',emPromo?'1':'0');
    card.setAttribute('data-material',String(p.material||'').toLowerCase().trim());
    var pctFoto=emPromo?Math.round((1-parseFloat(p.precoPromo)/precoN)*100):0;
    var html='<div class="produto-img">'+badgeProduto(estoque)+(emPromo?'<span style="position:absolute;top:56px;right:10px;background:#c0392b;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;z-index:4;box-shadow:0 3px 8px rgba(0,0,0,.25);">-'+pctFoto+'%</span>':'');
    /* SELOS: dimensões em cima, material logo abaixo */
    var selos='';
    var temDim=montarSeloDimensoes(p);
    var temMat=montarSeloMaterial(p);
    if(temDim||temMat){
      html+='<div class="selos-card">'+temDim+temMat+'</div>';
    }
    html+='<button class="fav-btn'+(isFav?' on':'')+'" type="button" onclick="toggleFavorito(\''+p.slug+'\',this)" title="'+(isFav?'Remover dos favoritos':'Salvar nos favoritos')+'" aria-label="Favoritar">'+(isFav?'❤️':'♡')+'</button>';
    html+='<div class="variante-track">';
    if(imgs.length){
      html+='<a class="variante-slide" data-midia="'+escL(imgs[0])+'" href="'+urlProduto(p.slug)+'" style="cursor:pointer;">'+midiaHtml(imgs[0],p.nome,true)+'</a>';
    }else{
      html+='<a class="variante-slide" href="'+urlProduto(p.slug)+'" style="cursor:pointer;"><span style="font-size:42px;color:#b9c2d2;">📦</span></a>';
    }
    html+='</div></div><div class="produto-body">';
    html+='<span class="produto-cat">'+escL(labelCategoria(cat))+'</span>';
    html+='<h3><a href="'+urlProduto(p.slug)+'" style="color:inherit;text-decoration:none;">'+escL(p.nome)+'</a></h3>';
    if(p.descricao)html+='<p class="produto-desc">'+escL(p.descricao)+'</p>';
    /* CORES: bolinhas clicáveis quando há mais de uma */
    if(cores.length>1){
      html+='<div class="produto-cores-dots">';
      cores.forEach(function(c){
        var on=(String(c)===String(selCor));
        html+='<span class="core-dot'+(on?' on':'')+'" style="background:'+corHex(c)+'" data-cor="'+escL(c)+'" title="'+escL(c)+'" role="button" aria-label="Escolher cor '+escL(c)+'" onclick="selecionarCorGrade(\''+String(p.slug).replace(/'/g,"\\'")+'\',\''+String(c).replace(/'/g,"\\'")+'\',event)"></span>';
      });
      html+='</div>';
      if(selCor){
        html+='<div class="cor-sel-txt">🎨 Cor escolhida: '+escL(selCor)+'</div>';
      }else{
        html+='<div class="cor-aviso-sel">👆 Toque numa bolinha para escolher a cor</div>';
      }
    }else if(cores.length===1){
      html+='<div class="produto-cor"><span class="mini-swatch" style="background:'+corHex(cores[0])+'"></span> '+escL(cores[0])+'</div>';
    }
    if(!esgotado){
      var _pix='R$ '+precoLabel(precoVenda-(Math.round(precoVenda*0.05*100)/100));
      html+='<div style="font-size:12px;color:#4a5161;line-height:1.5;margin-top:5px;"><img src="img/logo/pix.png" alt="Pix" style="width:14px;height:14px;vertical-align:-3px;margin-right:4px;"><b style="color:#0f1e3d;">'+_pix+' no Pix</b> <span style="color:#8a94a8;">· 5% OFF</span></div>';
      html+='<div style="font-size:12px;color:#4a5161;line-height:1.5;margin-top:3px;">ou até <b style="color:#0f1e3d;">12x</b> no cartão <img src="img/logo/cartao.png" alt="Bandeiras aceitas" style="height:13px;vertical-align:-2px;margin-left:2px;"></div>';
    }
    if(emPromo){
      var pct=Math.round((1-parseFloat(p.precoPromo)/precoN)*100);
      html+='<div class="produto-preco" style="margin-top:2px;"><span style="text-decoration:line-through;color:#8a94a8;font-size:13px;font-weight:600;">R$ '+precoLabel(precoN)+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span> <span style="background:#c0392b;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:12px;">-'+pct+'%</span></div>';
    }else{
      html+='<div class="produto-preco" style="margin-top:2px;">'+plabel+'</div>';
    }
    if(esgotado){
      html+='<button class="btn-pedir" onclick="pedirPeca(\''+p.slug+'\')">🔔 Avise-me quando chegar</button>';
    }else{
      html+='<button class="btn-comprar" onclick="addCarrinhoGrade(\''+p.slug+'\')">'
      +'<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14.6l.1-.1L8.1 12h9.4c.7 0 1.3-.4 1.6-1L22 5H6.2l-.9-2H2v2h2l2.6 6.5L5.5 13c-.3.7-.3 1.5 0 2.2.4.9 1.3 1.5 2.3 1.5h11v-2H8.1c-.5 0-.9-.5-.9-1z"/></svg>'
      +'Adicionar</button>';
    }
    html+='</div>';
    card.innerHTML=html;
    grid.appendChild(card);
  });
  if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(grid);
}
function pedirPeca(slug){
  var p=produtosLoja.find(function(x){return x.slug===slug;});
  if(!p)return;
  var msg='Olá! 😊 Vi a peça "'+p.nome+'" na loja e ela está sem estoque no momento. Gostaria de saber quando estará disponível (ou encomendar uma).';
  window.open('https://wa.me/'+WHATSAPP_LOJA+'?text='+encodeURIComponent(msg),'_blank');
}
var produtoSel=null;
function mostrarToast(msg){var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('show');},2800);}
function fecharModalProduto(){document.getElementById('produtoOverlay').classList.remove('show');produtoSel=null;}
function trocarImgModal(idx){
  var pmImg=document.querySelector('#produtoModalBody .pm-img');
  if(!pmImg||!produtoSel)return;
  var imgs=produtoSel.imagens||[];
  if(imgs[idx])pmImg.innerHTML=midiaHtml(imgs[idx],produtoSel.nome,false);
  document.querySelectorAll('#produtoModalBody .sw').forEach(function(s){s.classList.toggle('ativo',parseInt(s.getAttribute('data-idx'))===idx);});
  if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(pmImg);
}
function abrirModalProduto(slug){
  var p=produtosLoja.find(function(x){return x.slug===slug;});if(!p)return;
  produtoSel=p;
  var imgs=p.imagens||[];var cores=(p.cores||[]).filter(Boolean);
  var esgotado=(parseInt(p.estoque)||0)<=0;
  var precoN=parseFloat(p.preco)||0;
  var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
  var precoVenda=emPromo?parseFloat(p.precoPromo):precoN;
  var plabel='R$ '+precoLabel(precoVenda);
  var html='<div class="pm-img">';
  if(imgs.length){html+=midiaHtml(imgs[0],p.nome,false);}else{html+='<div class="pm-noimg">📦</div>';}
  html+='</div><div class="pm-info">';
  html+='<span class="produto-cat">'+escL(labelCategoria(p.categoria))+'</span>';
  html+='<h3 style="font-size:20px;color:var(--navy);margin-bottom:8px;">'+escL(p.nome)+'</h3>';
  var selosModal='';
  var dm=montarSeloDimensoes(p);
  var mm=montarSeloMaterial(p);
  if(dm||mm)html+='<div class="selos-card" style="position:static;display:flex;flex-direction:column;align-items:flex-start;gap:5px;margin-bottom:8px;">'+dm+mm+'</div>';
  if(p.descricao)html+='<p class="pm-desc">'+escL(p.descricao)+'</p>';
  if(cores.length){
    html+='<div class="pm-cores"><span>Cores:</span>';
    if(cores.length>1&&imgs.length>1){
      cores.forEach(function(c,i){html+='<span class="sw'+(i===0?' ativo':'')+'" data-idx="'+i+'" data-cor-label="'+escL(c)+'" style="background:'+corHex(c)+'" onclick="trocarImgModal('+i+')" title="'+escL(c)+'"></span>';});
    }else{
      cores.forEach(function(c){html+='<span style="background:'+corHex(c)+';display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:middle;"></span> '+escL(c)+' ';});
    }
    html+='</div>';
  }
  if(emPromo){html+='<div class="pm-preco"><span style="text-decoration:line-through;color:#8a94a8;font-weight:600;font-size:14px;">R$ '+precoLabel(precoN)+'</span> <span style="color:#c0392b;font-weight:800;">R$ '+precoLabel(parseFloat(p.precoPromo))+'</span></div>';}else{html+='<div class="pm-preco">'+plabel+'</div>';}
  if(esgotado){
    html+='<button class="btn-pedir" onclick="pedirPeca(\''+p.slug+'\')">🔔 Avise-me quando chegar</button>';
  }else if(cores.length>1){
    html+='<a class="btn-comprar" href="'+urlProduto(p.slug)+'" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;">🎨 Escolher cor e comprar</a>';
  }else{
    var corUnica=cores.length===1?cores[0]:'';
    html+='<button class="btn-comprar" onclick="addCarrinhoModal(\''+p.slug+'\',\''+escL(p.nome).replace(/'/g,"\\'")+'\',\''+plabel+'\',\''+precoVenda+'\',\''+(emPromo?precoN:'')+'\',\''+escL(corUnica).replace(/'/g,"\\'")+'\')">🛒 Adicionar ao carrinho'+(corUnica?' ('+escL(corUnica)+')':'')+'</button>';
  }
  html+='</div>';
  document.getElementById('produtoModalBody').innerHTML=html;
  var ovP=document.getElementById('produtoOverlay');
  ovP.classList.add('show');
  ovP.onclick=function(ev){if(ev.target===ovP)fecharModalProduto();};
  if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(document.getElementById('produtoModalBody'));
}
function addCarrinhoModal(slug,nome,plabel,preco,precoOrig,corUnica){
  if(typeof addCarrinho==='function'){addCarrinho(slug,nome,plabel,preco,precoOrig,corUnica||'');}
  fecharModalProduto();
  mostrarToast('🛒 Adicionado ao carrinho!'+(corUnica?' ('+corUnica+')':''));
}
/* ===== Destaque de promoção ===== */
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
  if(imgs.length){html+=midiaHtml(imgs[0],melhor.nome,true);}
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
  var alvo=document.querySelector('.hero .container')||document.querySelector('.hero-loja .container');
  if(alvo){alvo.appendChild(bloco);}
  if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(bloco);
}
/* ===== Continue de onde parou ===== */
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
    a.innerHTML=(img?midiaHtml(img,x.nome,true):'<span class="m3l-vnoimg">📦</span>')
      +'<h4>'+escL(x.nome)+'</h4>'
      +'<span class="m3l-vpreco">'+(promo?'R$ '+precoLabel(x.precoPromo):'R$ '+precoLabel(rp))+'</span>';
    tr.appendChild(a);
  });
  var alvo=document.querySelector('.cat-visual-wrap .container')||document.querySelector('.hero .container')||document.querySelector('.hero-loja .container');
  if(alvo)alvo.appendChild(bloco);
  if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(bloco);
}
function vistosScroll(dir){
  var tr=document.getElementById('vistosTrack');
  if(tr&&tr.scrollBy)tr.scrollBy({left:dir*280,behavior:'smooth'});
}
/* ===== Busca sem resultado inteligente ===== */
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
        +(img?midiaHtml(img,p.nome,true):'<span class="m3l-vnoimg">📦</span>')
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
  if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(box);
}
/* ===== Aviso de boas-vindas ===== */
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
/* ===== Autocomplete no topo ===== */
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
          +(img?midiaHtml(img,'',true):'<span class="m3l-auto-noimg">📦</span>')
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
      if(window.__m3lRegistrarVideos)window.__m3lRegistrarVideos(dd);
    }
    input.addEventListener('input',render);
    input.addEventListener('focus',render);
    input.addEventListener('keydown',function(e){if(e.key==='Escape'||e.key==='Enter')fechar();});
    document.addEventListener('click',function(e){if(!wrap.contains(e.target))fechar();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);
  else iniciar();
})();
/* ================= CARREGAR PRODUTOS ================= */
function carregarProdutos(tentarNovamente){
  var grid=document.getElementById('lojaGrid');
  grid.innerHTML='<div class="loja-carregando"><span class="loja-spin"></span><br>Carregando produtos…</div>';
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
    aplicarFiltrosDaURL();
    aplicarFiltros();
    atualizarCarrinhoUI();
    var _slug=slugDaURL();
    var _qp=new URLSearchParams(window.location.search);
    var _irCarrinho=_qp.get('carrinho')==='1';
    if(_slug){
      var _p=produtosLoja.find(function(x){return String(x.slug)===String(_slug);});
      if(_p&&_irCarrinho){
        var _pn=parseFloat(_p.preco)||0;
        var _promo=_p.promo&&parseFloat(_p.precoPromo)>0&&parseFloat(_p.precoPromo)<_pn;
        var _pv=_promo?parseFloat(_p.precoPromo):_pn;
        var _pl='R$ '+precoLabel(_pv);
        var _po=_promo?_pn:'';
        var _cores=(_p.cores||[]).filter(Boolean);
        var _cor=_cores.length===1?_cores[0]:'';
        if(typeof addCarrinho==='function'){addCarrinho(_p.slug,_p.nome,_pl,_pv,_po,_cor);}
        if(typeof window.flutuanteAbrir==='function'){window.flutuanteAbrir();}
        else if(typeof abrirCarrinho==='function'){abrirCarrinho();}
      }else if(_p){
        abrirModalProduto(_p.slug);
      }else{
        renderNaoEncontrado(_slug);
      }
    }
  })
  .catch(function(e){
    if(tentarNovamente!==true){setTimeout(function(){carregarProdutos(true);},1500);return;}
    grid.innerHTML='<div class="loja-carregando">Não foi possível carregar a loja agora.<br>'
      +'<small style="color:#a93226;">'+escL(String((e&&e.message)?e.message:e))+'</small><br>'
      +'<button class="btn-comprar" style="margin-top:14px;" onclick="carregarProdutos()">🔄 Tentar novamente</button></div>';
  });
}
/* ================= FILTROS ================= */
var categoriasAtivas = ['todos'];
var buscaAtiva = '';
function buscarProdutos(){
  buscaAtiva=document.getElementById('buscaLoja').value.trim().toLowerCase();
  aplicarFiltros();
}
function qtdPorCategoria(){
  var prods=document.querySelectorAll('.produto');
  var qtds={todos:prods.length,chaveiros:0,religiosos:0,decoracao:0,miniaturas:0,colecionaveis:0,articulados:0,sensoriais:0,utilitarios:0,outros:0};
  prods.forEach(function(p){var c=p.getAttribute('data-cat');qtds[c]=(qtds[c]||0)+1;});
  var mapa={
    todos:['qtdTodos','qtdTodosS'],
    chaveiros:['qtdChaveiros','qtdChaveirosS'],
    religiosos:['qtdReligiosos','qtdReligiososS'],
    decoracao:['qtdDecoracao','qtdDecoracaoS'],
    miniaturas:['qtdMiniaturas','qtdMiniaturasS'],
    colecionaveis:['qtdColecionaveis','qtdColecionaveisS'],
    articulados:['qtdArticulados','qtdArticuladosS'],
    sensoriais:['qtdSensoriais','qtdSensoriaisS'],
    utilitarios:['qtdUtilitarios','qtdUtilitariosS'],
    outros:['qtdOutros','qtdOutrosS']
  };
  for(var k in mapa){
    mapa[k].forEach(function(id){
      var el=document.getElementById(id);
      if(el)el.textContent='('+qtds[k]+')';
    });
    if(k==='todos')continue;
    mapa[k].forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      var btn=el.closest('.cat-btn')||el.closest('.cat-card');
      if(btn)btn.style.display=(qtds[k]===0)?'none':'';
    });
  }
  qtdMateriais();
  var favq=favLista().filter(function(s){
    return !!document.querySelector('.produto[data-id="'+s+'"]');
  }).length;
  ['qtdFavoritos','qtdFavoritosS'].forEach(function(id){
    var qf=document.getElementById(id);
    if(!qf)return;
    qf.textContent='('+favq+')';
    var bf=qf.closest('.cat-btn')||qf.closest('.cat-card');
    if(bf)bf.style.display=(favq===0)?'none':'';
  });
}
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
  var cat = btn.getAttribute('data-cat');
  if(cat === 'todos'){
    categoriasAtivas = ['todos'];
  } else {
    var idxTodos = categoriasAtivas.indexOf('todos');
    if(idxTodos !== -1) categoriasAtivas.splice(idxTodos, 1);
    var idx = categoriasAtivas.indexOf(cat);
    if(idx === -1){
      categoriasAtivas.push(cat);
    } else {
      categoriasAtivas.splice(idx, 1);
    }
    if(categoriasAtivas.length === 0){
      categoriasAtivas = ['todos'];
    }
  }
  document.querySelectorAll('.cat-btn').forEach(function(b){
    var c = b.getAttribute('data-cat');
    b.classList.toggle('active', categoriasAtivas.indexOf(c) !== -1);
  });
  document.querySelectorAll('.cat-card').forEach(function(b){
    var c = b.getAttribute('data-cat');
    b.classList.toggle('active', categoriasAtivas.indexOf(c) !== -1);
  });
  aplicarFiltros();
}
function aplicarFiltrosDaURL(){
  var params = new URLSearchParams(window.location.search);
  var cat = params.get('cat') || params.get('categoria');
  if(!cat) {
    categoriasAtivas = ['todos'];
    sincronizarAtivosUI();
    return;
  }
  var lista = String(cat).split(',')
    .map(function(s){ return s.trim().toLowerCase(); })
    .filter(Boolean);
  if(!lista.length){ categoriasAtivas = ['todos']; sincronizarAtivosUI(); return; }
  var valoresDisponiveis = [];
  document.querySelectorAll('.cat-btn').forEach(function(b){ valoresDisponiveis.push(b.getAttribute('data-cat')); });
  var validas = [];
  lista.forEach(function(c){
    if(valoresDisponiveis.indexOf(c) !== -1 && validas.indexOf(c) === -1){
      validas.push(c);
    }
  });
  categoriasAtivas = validas.length ? validas : ['todos'];
  sincronizarAtivosUI();
}
function sincronizarAtivosUI(){
  document.querySelectorAll('.cat-btn').forEach(function(b){
    b.classList.toggle('active', categoriasAtivas.indexOf(b.getAttribute('data-cat')) !== -1);
  });
  document.querySelectorAll('.cat-card').forEach(function(b){
    b.classList.toggle('active', categoriasAtivas.indexOf(b.getAttribute('data-cat')) !== -1);
  });
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
    if(el.checked&&el.classList.contains('mat-check'))mats.push(el.value);
  });
  var favs=favLista();
  var prods=document.querySelectorAll('.produto');
  var visiveis=0;
  var soTodos = (categoriasAtivas.length === 1 && categoriasAtivas[0] === 'todos');
  prods.forEach(function(p){
    var ok=true;
    if(!soTodos){
      var catProd = p.getAttribute('data-cat');
      var ehFavorito = categoriasAtivas.indexOf('favoritos') !== -1;
      var passaCategoria = (categoriasAtivas.indexOf(catProd) !== -1);
      var passaFavorito = (ehFavorito && favs.indexOf(p.getAttribute('data-id')) !== -1);
      if(!passaCategoria && !passaFavorito) ok = false;
    }
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
  var cont=document.getElementById('contagem');
  if(cont)cont.textContent=visiveis;
  var temFiltro = buscaAtiva || !soTodos;
  if(!temFiltro){
    document.querySelectorAll('.check-item input').forEach(function(el){
      if(el.classList.contains('mat-check')){if(el.checked)temFiltro=true;}
      else if(!el.checked)temFiltro=true;
    });
  }
  var bt=document.getElementById('btnLimparTopo');
  if(bt)bt.style.display=temFiltro?'inline-flex':'none';
  var sem=document.getElementById('semResultado');
  if(sem)sem.style.display=(visiveis===0)?'block':'none';
  if(typeof popularSemSugestoes==='function')popularSemSugestoes(visiveis===0);
  montarChipsFiltros();
}
/* ===== chips de filtros ativos ===== */
function montarChipsFiltros(){
  var box=document.getElementById('filtrosChips');
  if(!box)return;
  var chips=[];
  if(!(categoriasAtivas.length===1 && categoriasAtivas[0]==='todos')){
    categoriasAtivas.forEach(function(c){
      var nome=(c==='favoritos')?'Favoritos':labelCategoria(c);
      chips.push({tipo:'cat',valor:c,label:nome});
    });
  }
  if(buscaAtiva){
    chips.push({tipo:'busca',valor:buscaAtiva,label:'"'+buscaAtiva+'"'});
  }
  var dispMarcados=[];
  var todosDispMarcados=true;
  document.querySelectorAll('.check-item input').forEach(function(el){
    if(['estoque','ultimas','zero'].indexOf(el.value)!==-1){
      if(el.checked)dispMarcados.push(el.value);
      else todosDispMarcados=false;
    }
  });
  if(!todosDispMarcados){
    var nomesDisp={estoque:'Em estoque',ultimas:'Últimas unidades',zero:'Sem estoque'};
    dispMarcados.forEach(function(v){chips.push({tipo:'disp',valor:v,label:nomesDisp[v]});});
  }
  var precosMarcados=[];
  var todosPrecosMarcados=true;
  document.querySelectorAll('.check-item input').forEach(function(el){
    if(['ate25','25a50','50a100','mais100'].indexOf(el.value)!==-1){
      if(el.checked)precosMarcados.push(el.value);
      else todosPrecosMarcados=false;
    }
  });
  if(!todosPrecosMarcados){
    var nomesPreco={ate25:'Até R$ 25','25a50':'R$ 25–50','50a100':'R$ 50–100',mais100:'Acima de R$ 100'};
    precosMarcados.forEach(function(v){chips.push({tipo:'preco',valor:v,label:nomesPreco[v]});});
  }
  var promoEl=null;
  document.querySelectorAll('.check-item input').forEach(function(el){
    if(el.value==='promo')promoEl=el;
  });
  if(promoEl&&promoEl.checked){chips.push({tipo:'promo',valor:'promo',label:'Promoção'});}
  var matsMarcados=[];
  document.querySelectorAll('.check-item input.mat-check').forEach(function(el){
    if(el.checked)matsMarcados.push(el.value.toUpperCase());
  });
  matsMarcados.forEach(function(v){chips.push({tipo:'mat',valor:v.toLowerCase(),label:v});});
  if(!chips.length){box.style.display='none';box.innerHTML='';return;}
  var html='';
  chips.forEach(function(c){
    html+='<span class="chip-filtro">'+escL(c.label)
      +'<button type="button" onclick="removerChip(\''+c.tipo+'\',\''+c.valor.replace(/'/g,"\\'")+'\')" aria-label="Remover filtro">✕</button></span>';
  });
  html+='<button type="button" class="chip-limpar" onclick="limparFiltros()">Limpar tudo</button>';
  box.innerHTML=html;
  box.style.display='flex';
}
function removerChip(tipo,valor){
  if(tipo==='cat'){
    var idx=categoriasAtivas.indexOf(valor);
    if(idx!==-1)categoriasAtivas.splice(idx,1);
    if(!categoriasAtivas.length)categoriasAtivas=['todos'];
    sincronizarAtivosUI();
  }else if(tipo==='busca'){
    buscaAtiva='';
    var b=document.getElementById('buscaLoja');if(b)b.value='';
    var t=document.getElementById('topBuscaInput');if(t)t.value='';
    var h=document.getElementById('buscaLojaHero');if(h)h.value='';
  }else if(tipo==='disp'||tipo==='preco'||tipo==='promo'||tipo==='mat'){
    document.querySelectorAll('.check-item input').forEach(function(el){
      if(tipo==='mat'&&el.classList.contains('mat-check')&&el.value===valor)el.checked=false;
      else if(tipo==='promo'&&el.value==='promo')el.checked=false;
      else if((tipo==='disp'||tipo==='preco')&&el.value===valor)el.checked=false;
    });
  }
  aplicarFiltros();
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
  var t=document.getElementById('topBuscaInput');if(t)t.value='';
  var h=document.getElementById('buscaLojaHero');if(h)h.value='';
  categoriasAtivas=['todos'];
  sincronizarAtivosUI();
  document.querySelectorAll('.check-item input').forEach(function(el){
    if(el.classList.contains('sem-limpar')||el.classList.contains('mat-check')){el.checked=false;}
    else{el.checked=false;}
  });
  document.querySelectorAll('.check-item input').forEach(function(el){
    if(['estoque','ultimas','zero','ate25','25a50','50a100','mais100','promo'].indexOf(el.value)!==-1){
      el.checked=true;
    }
  });
  var ord=document.getElementById('ordem');if(ord)ord.value='destaques';
  aplicarFiltros();
}
function abrirFiltros(){
  var s=document.getElementById('sidebar');if(s)s.classList.add('open');
  var o=document.getElementById('filtroOverlay');if(o)o.classList.add('open');
}
function fecharFiltros(){
  var s=document.getElementById('sidebar');if(s)s.classList.remove('open');
  var o=document.getElementById('filtroOverlay');if(o)o.classList.remove('open');
}
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