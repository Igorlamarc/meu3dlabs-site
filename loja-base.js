/* ===== Meu 3D Labs — loja/base: Analytics, chips do topo, banners, faixa Novidades ===== */

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
var i=0,timer;
var track=document.getElementById('bnrTrack');
var dots=document.getElementById('bnrDots');
var total=track?track.querySelectorAll('.bnr-slide').length:3;
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


/* ===== Faixa Novidades: esteira automática, 12 itens, selo NOVO com prazo ===== */
(function(){
var FN_QTD=12;      /* quantos recém-chegados entram na esteira */
var FN_DIAS_NOVO=3; /* selo NOVO só em produtos com até 3 dias de cadastro */
var FN_VELOCIDADE=35; /* px por segundo — quer mais rápido? aumenta este número */
var tent=0;
var pausado=false;
var retomarTimer=null;
var ultimoToque=0;
function pausar(ms){
  pausado=true;
  clearTimeout(retomarTimer);
  if(ms)retomarTimer=setTimeout(function(){pausado=false;},ms);
}
function retomarAgora(){
  clearTimeout(retomarTimer);
  pausado=false;
}
(function espera(){
  if(window.produtosLoja&&produtosLoja.length&&typeof abrirModalProduto==='function'){montar();return;}
  if(++tent<200)setTimeout(espera,150);
})();
function fnEhNovo(p,idx){
  var dt=p.criadoEm||p.createdAt||p.criado_em||p.created_at||p.dataCriacao||null;
  if(dt){
    var d=new Date(dt);
    if(d.getTime()){
      var dias=(Date.now()-d.getTime())/86400000;
      return dias<=FN_DIAS_NOVO;
    }
  }
  /* Sem data de cadastro na API: selo nos 3 primeiros da esteira (mais recentes) */
  return idx<3;
}
function montar(){
  var lista=produtosLoja.filter(function(p){return (parseInt(p.estoque)||0)>0;});
  lista=lista.slice(-FN_QTD).reverse();
  if(!lista.length)return;
  var track=document.getElementById('fnTrack');
  lista.forEach(function(p,i){
    var precoN=parseFloat(p.preco)||0;
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<precoN;
    var preco=emPromo?parseFloat(p.precoPromo):precoN;
    var card=document.createElement('div');
    card.className='fn-card';
    var html='<div class="fn-card-img">'+(fnEhNovo(p,i)?'<span class="fn-badge">NOVO</span>':'')+(emPromo?'<span class="fn-promo">-'+Math.round((1-preco/precoN)*100)+'%</span>':'');
    if(p.imagens&&p.imagens.length){html+='<img src="'+p.imagens[0]+'" alt="'+escL(p.nome)+'" loading="lazy">';}
    else{html+='<div style="font-size:40px;text-align:center;padding-top:45px;">📦</div>';}
    html+='</div><div class="fn-card-body"><h4>'+escL(p.nome)+'</h4><div class="fn-preco">'+(emPromo?'<span class="antigo">R$ '+precoLabel(precoN)+'</span><span class="promo">R$ '+precoLabel(preco)+'</span>':'R$ '+precoLabel(precoN))+'</div></div>';
    card.innerHTML=html;
    card.onclick=function(){abrirModalProduto(p.slug);};
    track.appendChild(card);
  });
  document.getElementById('faixaNovidades').style.display='block';
  iniciarEsteira();
}
/* ===== Esteira: anda devagar e contínua; pausa no hover/toque; setas continuam ===== */
function iniciarEsteira(){
  var t=document.getElementById('fnTrack');
  var faixa=document.getElementById('faixaNovidades');
  if(!t||t._m3lEsteira)return;
  t._m3lEsteira=true;
  /* neutraliza scroll-snap do CSS, se existir (brigaria com o movimento) */
  t.style.scrollSnapType='none';
  /* duplica os cards: permite loop infinito sem "salto" visível */
  Array.prototype.slice.call(t.children).forEach(function(c){
    var cl=c.cloneNode(true);
    cl.onclick=c.onclick;
    t.appendChild(cl);
  });
  var setW=0;
  function medir(){setW=Math.max(t.scrollWidth/2,1);}
  medir();
  setInterval(medir,2000);
  /* pausa com mouse em cima; retoma ao tirar (a menos que tenha tocado há menos de 1s) */
  faixa.addEventListener('mouseenter',function(){if(Date.now()-ultimoToque>1000)pausado=true;});
  faixa.addEventListener('mouseleave',function(){if(Date.now()-ultimoToque>1000)retomarAgora();});
  t.addEventListener('touchstart',function(){ultimoToque=Date.now();pausado=true;},{passive:true});
  t.addEventListener('touchend',function(){pausar(4000);},{passive:true});
  /* pausa quando a faixa está fora da tela ou a aba escondida */
  var visivel=true;
  if('IntersectionObserver' in window){
    try{
      new IntersectionObserver(function(en){visivel=en[0].isIntersecting;},{threshold:0.05}).observe(t);
    }catch(e){}
  }
  /* volta invisível ao cruzar o fim do primeiro conjunto (loop sem "salto") */
  t.addEventListener('scroll',function(){
    if(setW>0){
      if(t.scrollLeft>=setW)t.scrollLeft-=setW;
      else if(t.scrollLeft<0)t.scrollLeft+=setW;
    }
  });
  var ult=0;
  function passo(ts){
    /* reavalia a cada frame: nunca desliga se as imagens demorarem a carregar */
    var pode=t.scrollWidth>t.clientWidth+40;
    if(ult&&ts>ult&&!document.hidden&&visivel&&!pausado&&pode){
      t.scrollLeft+=FN_VELOCIDADE*(ts-ult)/1000;
    }
    ult=ts;
    requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}
window.fnScroll=function(d){
  var t=document.getElementById('fnTrack');
  if(!t)return;
  pausar(4000);
  if(d<0&&t.scrollLeft<=0){t.scrollLeft=t.scrollWidth/2;}
  t.scrollBy({left:d*(t.clientWidth*0.8),behavior:'smooth'});
};
})();