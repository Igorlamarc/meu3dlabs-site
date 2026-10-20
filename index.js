/* ============================================================
   Meu 3D Labs — index.js
   Lógica da página inicial: carrosséis, stories, FAQ, menu
   mobile, botão topo, cookies e destaques da loja.
   (Analytics e JSON-LD de SEO ficam no <head> do index.html)
   ============================================================ */

/* ---------- Carrossel do portfólio: cria os dots ---------- */
document.querySelectorAll('.carousel-track').forEach(function(track){
  track.dataset.current='0';
  var slides=track.children.length;
  var catBlock=track.closest('.cat-block');
  var dotsContainer=catBlock.querySelector('.carousel-dots');
  if(dotsContainer&&slides>1){
    for(var i=0;i<slides;i++){
      var dot=document.createElement('div');
      dot.className='dot'+(i===0?' active':'');
      dot.setAttribute('data-i',i);
      dot.onclick=function(){
        var t=this.closest('.cat-block').querySelector('.carousel-track');
        irPara(t,parseInt(this.getAttribute('data-i')));
      };
      dotsContainer.appendChild(dot);
    }
  }
});

/* ---------- Carrossel do portfólio: funções de navegação ---------- */
function mover(btn,direction){
  var track=btn.parentElement.querySelector('.carousel-track');
  var current=parseInt(track.dataset.current);
  var total=track.children.length;
  current+=direction;
  if(current<0)current=total-1;
  if(current>=total)current=0;
  track.dataset.current=current;
  track.style.transform='translateX(-'+current*100+'%)';
  atualizarDots(track,current);
}
function irPara(track,index){
  track.dataset.current=index;
  track.style.transform='translateX(-'+index*100+'%)';
  atualizarDots(track,index);
}
function atualizarDots(track,current){
  var catBlock=track.closest('.cat-block');
  var dotsContainer=catBlock.querySelector('.carousel-dots');
  if(dotsContainer){
    dotsContainer.querySelectorAll('.dot').forEach(function(d){d.classList.remove('active');});
    var ad=dotsContainer.querySelector('.dot[data-i="'+current+'"]');
    if(ad)ad.classList.add('active');
  }
}

/* ---------- Carrossel do portfólio: rotação automática (4s) ---------- */
document.querySelectorAll('.carousel-track').forEach(function(track){
  if(track.children.length>1){
    var intervalId=setInterval(function(){
      if(track.dataset.paused==='true')return;
      var current=parseInt(track.dataset.current);
      var total=track.children.length;
      current++;
      if(current>=total)current=0;
      irPara(track,current);
    },4000);
    track.dataset.intervalId=intervalId;
    var wrap=track.closest('.carousel-wrap');
    if(wrap){
      wrap.addEventListener('mouseenter',function(){track.dataset.paused='true';});
      wrap.addEventListener('mouseleave',function(){track.dataset.paused='false';});
    }
  }
});

/* ---------- Stories de clientes: cria os dots ---------- */
var storiesTrack=document.getElementById('storiesTrack');
if(storiesTrack){
  storiesTrack.dataset.current='0';
  var totalStories=storiesTrack.children.length;
  var storiesDots=document.getElementById('storiesDots');
  var storiesCounter=document.getElementById('storiesCounter');
  if(storiesDots){
    for(var i=0;i<totalStories;i++){
      var dot=document.createElement('div');
      dot.className='dot'+(i===0?' active':'');
      dot.setAttribute('data-i',i);
      dot.onclick=function(){irParaStory(parseInt(this.getAttribute('data-i')));};
      storiesDots.appendChild(dot);
    }
  }
}

/* ---------- Stories de clientes: funções de navegação ---------- */
function moverStory(btn,direction){
  var current=parseInt(storiesTrack.dataset.current);
  current+=direction;
  if(current<0)current=totalStories-1;
  if(current>=totalStories)current=0;
  irParaStory(current);
}
function irParaStory(index){
  storiesTrack.dataset.current=index;
  storiesTrack.style.transform='translateX(-'+index*100+'%)';
  if(storiesDots){
    storiesDots.querySelectorAll('.dot').forEach(function(d){d.classList.remove('active');});
    var ad=storiesDots.querySelector('.dot[data-i="'+index+'"]');
    if(ad)ad.classList.add('active');
  }
  storiesCounter.textContent=(index+1)+' / '+totalStories;
}

/* ---------- Stories de clientes: rotação automática (5s) ---------- */
if(storiesTrack&&totalStories>1){
  setInterval(function(){
    if(storiesTrack.dataset.paused==='true')return;
    var current=parseInt(storiesTrack.dataset.current);
    current++;
    if(current>=totalStories)current=0;
    irParaStory(current);
  },5000);
  var storiesWrap=storiesTrack.closest('.stories-carousel');
  if(storiesWrap){
    storiesWrap.addEventListener('mouseenter',function(){storiesTrack.dataset.paused='true';});
    storiesWrap.addEventListener('mouseleave',function(){storiesTrack.dataset.paused='false';});
  }
}

/* ---------- FAQ: acordeão ---------- */
function toggleFaq(el){
  var item=el.parentElement;
  var isOpen=item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(function(f){f.classList.remove('open');});
  if(!isOpen){item.classList.add('open');}
}

/* ---------- Animação de entrada (fade-in ao rolar) ---------- */
var observer=new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting){entry.target.classList.add('visible');}
  });
},{threshold:0.1});
document.querySelectorAll('.fade-in').forEach(function(el){observer.observe(el);});

/* ---------- Menu mobile (drawer) ---------- */
var menuToggle=document.getElementById('menuToggle');
var drawer=document.getElementById('drawer');
var drawerOverlay=document.getElementById('drawerOverlay');
var drawerClose=document.getElementById('drawerClose');
function abrirDrawer(){
  menuToggle.classList.add('open');
  drawer.classList.add('open');
  drawerOverlay.classList.add('open');
}
function fecharDrawer(){
  menuToggle.classList.remove('open');
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
}
menuToggle.addEventListener('click',abrirDrawer);
drawerClose.addEventListener('click',fecharDrawer);
drawerOverlay.addEventListener('click',fecharDrawer);
drawer.querySelectorAll('a').forEach(function(link){link.addEventListener('click',fecharDrawer);});

/* ---------- Gestos de toque: arrastar carrosséis e stories ---------- */
document.querySelectorAll('[data-swipe]').forEach(function(track){
  var isStory=track.id==='storiesTrack';
  var startX=0,currentX=0,isDragging=false;
  track.addEventListener('touchstart',function(e){
    startX=e.touches[0].clientX;
    isDragging=true;
    track.dataset.paused='true';
  },{passive:true});
  track.addEventListener('touchmove',function(e){
    if(!isDragging)return;
    currentX=e.touches[0].clientX;
  },{passive:true});
  track.addEventListener('touchend',function(){
    if(!isDragging)return;
    var diff=currentX-startX;
    if(Math.abs(diff)>50){
      if(diff<0){
        if(isStory){
          var c=parseInt(storiesTrack.dataset.current);
          c++;
          if(c>=totalStories)c=0;
          irParaStory(c);
        }else{
          var btn=track.parentElement.querySelector('.next');
          if(btn)mover(btn,1);
        }
      }else{
        if(isStory){
          var c=parseInt(storiesTrack.dataset.current);
          c--;
          if(c<0)c=totalStories-1;
          irParaStory(c);
        }else{
          var btn=track.parentElement.querySelector('.prev');
          if(btn)mover(btn,-1);
        }
      }
    }
    isDragging=false;
    startX=0;
    currentX=0;
    setTimeout(function(){track.dataset.paused='false';},3000);
  },{passive:true});
});

/* ---------- Botão voltar ao topo ---------- */
var topBtn=document.getElementById('topBtn');
window.addEventListener('scroll',function(){
  if(window.scrollY>window.innerHeight*0.5){topBtn.classList.add('show');}
  else{topBtn.classList.remove('show');}
});

/* ---------- Banner de cookies ---------- */
var cookieBanner=document.getElementById('cookieBanner');
if(!localStorage.getItem('m3d_cookies_aceitos')){cookieBanner.classList.add('show');}
function aceitarCookies(){
  localStorage.setItem('m3d_cookies_aceitos','sim');
  cookieBanner.classList.remove('show');
}

/* ---------- Destaques da loja (carrega da API) ---------- */
(function(){
  fetch('https://meu3dlabs-backend.onrender.com/api/loja/produtos')
  .then(function(r){return r.json();})
  .then(function(t){
    var lista=(t.produtos||t||[]).filter(function(p){return p.ativo!==false;});
    var destaques=lista.filter(function(p){return p.destaque;});
    var mostrar=destaques.length?destaques:lista.slice(0,4);
    if(!mostrar.length)return;
    var grid=document.getElementById('destaquesGrid');
    var html='';
    mostrar.slice(0,8).forEach(function(p){
      var img=(p.imagens&&p.imagens[0])||'';
      var nome=String(p.nome||'').replace(/</g,'&lt;');
      var preco='R$ '+(parseFloat(p.preco)||0).toFixed(2).replace('.',',');
      var link='loja.html?produto='+encodeURIComponent(p.slug);
      html+='<div class="dst-card">'
        +(img?'<a class="dst-img" href="'+link+'"><img src="'+img+'" alt="'+nome+'" loading="lazy"></a>':'<a class="dst-img dst-noimg" href="'+link+'">📦</a>')
        +'<div class="dst-body"><h3>'+nome+'</h3>'
        +'<div class="dst-preco">'+preco+'</div>'
        +'<a class="btn dst-btn" href="'+link+'">Ver peça</a>'
        +'</div></div>';
    });
    grid.innerHTML=html;
    document.getElementById('destaquesLoja').style.display='block';
  }).catch(function(){});
})();

/* ---------- Header fixo no mobile (compensa a altura) ---------- */
(function(){
  var h=document.querySelector('header');
  function ajusta(){
    if(window.innerWidth<=768&&h){document.body.style.paddingTop=h.offsetHeight+'px';}
    else{document.body.style.paddingTop='';}
  }
  ajusta();
  window.addEventListener('resize',ajusta);
  window.addEventListener('load',ajusta);
})();