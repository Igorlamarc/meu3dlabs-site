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

