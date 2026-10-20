/* ============================================================
   Meu 3D Labs — loja-admin-extras.js
   Camada de recursos avançados do Admin Loja.
   Conecta-se por cima do script original sem alterá-lo:
   ações rápidas no card, ações em massa, filtros extras,
   ordenação, saúde da loja, backup, lista de preços,
   Ctrl+V de imagem e atalhos de teclado.
   ============================================================ */
(function(){
'use strict';

/* ===== 0. UTILIDADES ===== */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
function fmt(n){n=parseFloat(n)||0;return n.toFixed(2).replace('.',',');}
function toast(msg,tipo){if(window.mostrarToast)window.mostrarToast(msg,tipo);else alert(msg);}
function soma(){return typeof produtos!=='undefined'?produtos:[];}
function porId(id){var a=soma();for(var i=0;i<a.length;i++)if(String(a[i].id)===String(id))return a[i];return null;}
function linkPublico(p){return '/produto/'+(p.slug||'');}

/* Salva o produto inteiro com um campo alterado (PUT completo, como o form faz) */
async function gravarProduto(p){
  var dados={nome:p.nome,slug:p.slug,descricao:p.descricao||'',preco:p.preco,estoque:parseInt(p.estoque)||0,
    categoria:p.categoria||'outros',cores:p.cores||[],imagens:p.imagens||[],destaque:!!p.destaque,
    ativo:!!p.ativo,promo:!!p.promo,precoPromo:p.precoPromo||0};
  await window.api('/loja/produtos/'+p.id,'PUT',dados);
}

/* ===== 1. FILTROS ESPECIAIS + ORDENAÇÃO + CONTAGEM ===== */
var filtroEsp='';
var ordemAtual='padrao';
var CHIPS=[['sest','📦 Sem estoque'],['ult','⚠️ Últimas un.'],['promo','🏷️ Promoção'],['inativos','💤 Inativos'],['semfoto','📷 Sem foto'],['destaque','⭐ Destaques']];
function casouEsp(p){
  switch(filtroEsp){
    case 'sest':return !(parseInt(p.estoque)>0);
    case 'ult':return parseInt(p.estoque)>0&&parseInt(p.estoque)<=3;
    case 'promo':return !!p.promo&&parseFloat(p.precoPromo)>0;
    case 'inativos':return !p.ativo;
    case 'semfoto':return !(p.imagens&&p.imagens.length);
    case 'destaque':return !!p.destaque;
  }
  return true;
}
function cmpVal(k,p){return {nome:(p.nome||'').toLowerCase(),preco:parseFloat(p.preco)||0,precoPromo:parseFloat(p.precoPromo||p.preco)||0,estoque:parseInt(p.estoque)||0}[k];}
var _rg=window.renderGrade;
window.renderGrade=function(){
  _rg();
  var g=document.getElementById('grade');if(!g)return;
  var cards=Array.prototype.slice.call(g.children).filter(function(c){return c.className==='card';});
  var dados=[];
  cards.forEach(function(card){
    var m=(card.innerHTML||'').match(/abrirForm\('([^']+)'/);
    var p=m?porId(m[1]):null;
    dados.push({card:card,p:p});
        if(p){injetaQuick(card,p);}
    if(p&&filtroEsp&&!casouEsp(p))card.style.display='none';
  });
  if(ordemAtual!=='padrao'){
    var dir=(ordemAtual.indexOf('desc')!==-1||(ordemAtual==='nome-za'))?-1:1;
    var k=ordemAtual.split('-')[0];
    dados=dados.filter(function(d){return d.p;}).sort(function(a,b){
      var va=cmpVal(k,a.p),vb=cmpVal(k,b.p);
      return va<vb?-dir:(va>vb?dir:0);
    });
    dados.forEach(function(d){g.appendChild(d.card);});
  }
  var vis=dados.filter(function(d){return d.card.style.display!=='none';}).length;
  var ct=document.getElementById('lxCount');
  if(ct)ct.textContent=vis+' produto'+(vis===1?'':'s')+' exibido'+(vis===1?'':'s');
};
function injetaChips(){
  var f=document.getElementById('filtroCat');if(!f||document.getElementById('lxChips'))return;
  var box=document.createElement('div');box.id='lxChips';box.className='lx-chips';
  f.insertAdjacentElement('afterend',box);
  var sel=document.createElement('select');sel.id='lxOrdem';sel.className='lx-ordem';
  sel.innerHTML='<option value="padrao">🔀 Ordem: destaques + nome</option><option value="nome-az">Nome A → Z</option><option value="nome-za">Nome Z → A</option><option value="preco-asc">Menor preço</option><option value="preco-desc">Maior preço</option><option value="estoque-asc">Menor estoque</option>';
  sel.onchange=function(){ordemAtual=sel.value;window.renderGrade();};
  var br=document.querySelector('.busca-rapida');if(br)br.appendChild(sel);
}
function renderChips(){
  var box=document.getElementById('lxChips');if(!box)return;
  box.innerHTML='<span class="lx-count" id="lxCount"></span>'+CHIPS.map(function(c){
    return '<button type="button" class="lx-chip'+(filtroEsp===c[0]?' on':'')+'" data-k="'+c[0]+'">'+c[1]+'</button>';
  }).join('')+(filtroEsp?'<button type="button" class="lx-chip lx-off" data-k="">✕ limpar</button>':'');
  box.onclick=function(e){
    var b=e.target.closest('.lx-chip');if(!b)return;
    filtroEsp=(b.getAttribute('data-k')===filtroEsp)?'':b.getAttribute('data-k');
    renderChips();window.renderGrade();
  };
  var ct=document.getElementById('lxCount');if(ct)ct.textContent='';
}

/* ===== 2. AÇÕES RÁPIDAS NOS CARDS ===== */
function injetaQuick(card,p){
  if(card.querySelector('.lx-quick'))return;
  var q=document.createElement('div');q.className='lx-quick';
  var est=parseInt(p.estoque)||0;
  q.innerHTML=
    '<button type="button" class="lx-q'+(p.ativo?'':' lx-off-btn')+'" data-act="toggleativo" data-id="'+p.id+'" title="Ativar/Inativar na loja">'+(p.ativo?'🟢 Ativo':'💤 Inativo')+'</button>'+
    '<span class="lx-stk"><button type="button" data-act="estmenos" data-id="'+p.id+'">−</button><b>'+est+'</b><button type="button" data-act="estmais" data-id="'+p.id+'">+</button><small>un.</small></span>'+
    '<button type="button" class="lx-q lx-star'+(p.destaque?' on':'')+'" data-act="toggledestaque" data-id="'+p.id+'" title="Destaque na loja">'+(p.destaque?'⭐':'☆')+'</button>';
  var l=document.createElement('div');l.className='lx-link';
  l.innerHTML=
    '<button type="button" data-act="ver" data-id="'+p.id+'">👁️ Ver</button>'+
    '<button type="button" data-act="link" data-id="'+p.id+'">🔗 Link</button>'+
    '<button type="button" data-act="wa" data-id="'+p.id+'">💬 WhatsApp</button>';
  var ac=card.querySelector('.acoes');
  if(ac){ac.insertAdjacentElement('beforebegin',q);ac.insertAdjacentElement('afterend',l);}
}
var _grdListener=false;
function listenerGrade(){
  if(_grdListener)return;_grdListener=true;
  document.getElementById('grade').addEventListener('click',async function(e){
    var b=e.target.closest('[data-act]');if(!b)return;
    e.stopPropagation();
    var p=porId(b.getAttribute('data-id'));if(!p)return;
    var act=b.getAttribute('data-act');
    try{
      if(act==='toggleativo'){p.ativo=!p.ativo;await gravarProduto(p);toast(p.ativo?'🟢 Produto ativo na loja!':'💤 Produto inativado.',p.ativo?'ok':'');}
      else if(act==='toggledestaque'){p.destaque=!p.destaque;await gravarProduto(p);toast(p.destaque?'⭐ Em destaque!':'Destaque removido.',p.destaque?'ok':'');}
      else if(act==='estmenos'||act==='estmais'){
        var n=parseInt(p.estoque)||0;n+=(act==='estmais'?1:-1);if(n<0)n=0;
        p.estoque=n;await gravarProduto(p);toast('📦 Estoque: '+n+' un.',(n===0?'erro':'ok'));
      }
      else if(act==='ver'){window.open(linkPublico(p),'_blank');}
      else if(act==='link'){
        var url=location.origin?location.origin+location.pathname.replace(/[^/]*$/, '')+linkPublico(p):linkPublico(p);
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){toast('🔗 Link copiado! Cole onde quiser.','ok');});}
        else toast('Link: '+url);
      }
      else if(act==='wa'){
        var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<parseFloat(p.preco);
        var msg='✨ *'+(p.nome||'Produto')+'*\n'+
          (emPromo?'~~R$ '+fmt(p.preco)+'~~  *R$ '+fmt(p.precoPromo)+'* (promocional!) 🏷️\n':'R$ '+fmt(p.preco)+'\n')+
          ((p.cores&&p.cores.length)?'🎨 Cores: '+p.cores.join(', ')+'\n':'')+
          '\nViu no site: https://meu3dlabs.com.br/'+linkPublico(p)+'\n Quer encomendar ou tem alguma dúvida? É só chamar! 😊';
        window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
      }
      window.renderGrade();
    }catch(err){
      toast('Erro ao salvar: '+err.message,'erro');
      if(String(err.message).indexOf('autorizado')!==-1&&window.sair)window.sair();
    }
  });
}

/* ===== 3. SAÚDE DA LOJA ===== */
function injetaSaude(){
  var r=document.getElementById('resumo');if(!r||document.getElementById('lxSaude'))return;
  var d=document.createElement('div');d.id='lxSaude';d.className='lx-saude';r.insertAdjacentElement('afterend',d);
}
function renderSaude(){
  var box=document.getElementById('lxSaude');if(!box)return;
  var a=soma();
  if(!a.length){box.innerHTML='';return;}
  var ativos=a.filter(function(p){return p.ativo;});
  var prontos=ativos.filter(function(p){return p.imagens&&p.imagens.length&&parseFloat(p.preco)>0&&(p.descricao||'').trim().length>10;});
  var pct=ativos.length?Math.round(prontos.length/ativos.length*100):100;
  var probs=[
    ['semfoto',ativos.filter(function(p){return !(p.imagens&&p.imagens.length);}).length,'📷 sem foto'],
    ['sest',ativos.filter(function(p){return !(parseInt(p.estoque)>0);}).length,'📦 sem estoque'],
    ['promo',a.filter(function(p){return p.promo&&parseFloat(p.precoPromo)>0;}).length,'🏷️ em promoção'],
    ['inativos',a.length-ativos.length,'💤 inativos']
  ];
  var cor=pct>=90?'verde':(pct>=70?'laranja':'vermelho');
  box.innerHTML=
    '<div class="lx-s-top"><b>🩺 Loja em forma:</b><span class="lx-s-pct '+cor+'">'+pct+'%</span><small>dos '+ativos.length+' ativos estão prontos pra venda</small></div>'+
    '<div class="lx-s-bar"><div class="lx-s-fill" style="width:'+pct+'%"></div></div>'+
    '<div class="lx-s-probs">'+probs.filter(function(x){return x[1];}).map(function(x){
      return '<button type="button" class="lx-s-prob" data-k="'+x[0]+'">'+x[1]+' '+x[2]+' →</button>';
    }).join('')+'</div>';
  box.onclick=function(e){
    var b=e.target.closest('.lx-s-prob');if(!b)return;
    filtroEsp=b.getAttribute('data-k');renderChips();window.renderGrade();
    document.getElementById('lxChips').scrollIntoView({behavior:'smooth',block:'center'});
  };
}
var _rr=window.renderResumo;
window.renderResumo=function(){_rr();renderSaude();};
var _rfc=window.renderFiltroCat;
window.renderFiltroCat=function(){_rfc();injetaChips();renderChips();};

/* ===== 4. AÇÕES EM MASSA (usa a seleção do Mesclar) ===== */
function injetaMassa(){
  var barra=document.getElementById('barraMesclar');if(!barra||document.getElementById('lxMassa'))return;
  var d=document.createElement('div');d.className='lx-massa';
  d.innerHTML='<span class="lx-m-lab">⚡ Ou aplique em massa:</span>'+
    '<select id="lxMassaAcao"><option value="">Escolher ação...</option>'+
    '<option value="ativar">🟢 Ativar na loja</option>'+
    '<option value="inativar">💤 Inativar (sair da loja)</option>'+
    '<option value="categoria">📂 Mover para categoria…</option>'+
    '<option value="promo">🏷️ Aplicar promoção (% off)…</option>'+
    '<option value="remover-promo">Remover promoção</option>'+
    '<option value="estoque">📦 Somar estoque (+N, aceita −N)</option>'+
    '<option value="preco">💰 Definir preço (R$)…</option>'+
    '<option value="destaque-on">⭐ Marcar destaque</option>'+
    '<option value="destaque-off">☆ Remover destaque</option></select>'+
    '<input id="lxMassaValor" class="hidden" placeholder="valor…" list="lxCatList">'+
    '<datalist id="lxCatList">'+(typeof CATEGORIAS!=='undefined'?CATEGORIAS.map(function(c){return '<option value="'+c+'">';}).join(''):'')+'</datalist>'+
    '<button type="button" class="btn btn-laranja" id="lxMassaBtn">Aplicar</button>';
  barra.appendChild(d);
  var sel=d.querySelector('#lxMassaAcao'),val=d.querySelector('#lxMassaValor');
  sel.onchange=function(){val.classList.toggle('hidden',['categoria','promo','estoque','preco'].indexOf(sel.value)===-1);if(!val.classList.contains('hidden'))val.focus();};
  d.querySelector('#lxMassaBtn').onclick=aplicarMassa;
}
async function aplicarMassa(){
  var acao=(document.getElementById('lxMassaAcao')||{}).value||'';
  if(!acao){toast('Escolha uma ação.','erro');return;}
  var ids=typeof selecionados!=='undefined'?selecionados:[];
  if(ids.length<1){toast('Selecione produtos (clique na bolinha verde dos cards).','erro');return;}
  var val=(document.getElementById('lxMassaValor')||{}).value||'';
  var rotulo={ativar:'Ativar na loja',inativar:'Inativar (sair da loja)','remover-promo':'Remover promoção','destaque-on':'Marcar destaque','destaque-off':'Remover destaque',categoria:'Mover para categoria "'+val+'"',promo:'Aplicar '+val+'% de desconto',estoque:'Somar '+val+' un. ao estoque',preco:'Definir preço R$ '+val}[acao];
  if(!confirm(rotulo+'\n\nAplicar a '+ids.length+' produto(s) selecionado(s)?'))return;
  var feitos=0,erros=0;
  for(var i=0;i<ids.length;i++){
    var p=porId(ids[i]);if(!p){continue;}
    toast('⚡ Aplicando… '+(i+1)+'/'+ids.length);
    try{
      if(acao==='ativar')p.ativo=true;
      else if(acao==='inativar')p.ativo=false;
      else if(acao==='destaque-on')p.destaque=true;
      else if(acao==='destaque-off')p.destaque=false;
      else if(acao==='remover-promo'){p.promo=false;p.precoPromo=0;}
      else if(acao==='categoria'&&val.trim()){p.categoria=val.trim().toLowerCase();}
      else if(acao==='promo'&&parseFloat(val)>0&&parseFloat(p.preco)>0){p.promo=true;p.precoPromo=Math.round(parseFloat(p.preco)*(1-parseFloat(val)/100)*100)/100;}
      else if(acao==='estoque'){p.estoque=Math.max(0,(parseInt(p.estoque)||0)+parseInt(val||0));}
      else if(acao==='preco'&&parseFloat(val)>=0){p.preco=parseFloat(val);}
      await gravarProduto(p);feitos++;
    }catch(e){erros++;}
  }
  if(window.toggleMesclar)window.toggleMesclar(); /* sai do modo seleção */
  await window.carregar();
  toast(erros?('⚠️ Concluído com '+feitos+' ok, '+erros+' erro(s).'):'✅ Ação aplicada em '+feitos+' produto(s)!',erros?'erro':'ok');
}

/* ===== 5. BOTÕES: BACKUP + LISTA DE PREÇOS ===== */
function injetaBotoes(){
  var div=document.querySelector('.barra-acoes div[style]');
  if(div&&!document.getElementById('lxBtnBackup')){
    var b1=document.createElement('button');b1.type='button';b1.className='btn btn-cinza';b1.id='lxBtnBackup';b1.textContent='💾 Backup';b1.onclick=fazerBackup;
    var b2=document.createElement('button');b2.type='button';b2.className='btn btn-cinza';b2.id='lxBtnPrecos';b2.textContent='🖨️ Preços';b2.onclick=listaPrecos;
    div.insertBefore(b2,div.firstChild);div.insertBefore(b1,b2);
  }
}
function fazerBackup(){
  var blob=new Blob([JSON.stringify({gerado_em:new Date().toISOString(),produtos:soma()},null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='produtos-loja-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},2000);
  toast('💾 Backup de '+soma().length+' produtos baixado!','ok');
}
function listaPrecos(){
  var linhas=soma().sort(function(a,b){return (a.nome||'').localeCompare(b.nome||'');}).map(function(p){
    var emPromo=p.promo&&parseFloat(p.precoPromo)>0&&parseFloat(p.precoPromo)<parseFloat(p.preco);
    return '<tr'+(p.ativo?'':' style="opacity:.45"')+'><td>'+esc(p.nome)+(p.destaque?' ⭐':'')+(p.ativo?'':' <small>(inativo)</small>')+'</td><td>'+esc((p.cores||[]).join(', '))+'</td><td style="text-align:center;">'+(parseInt(p.estoque)||0)+'</td><td style="text-align:right;">'+(emPromo?'<s>R$ '+fmt(p.preco)+'</s> <b style="color:#c0392b">R$ '+fmt(p.precoPromo)+'</b>':'R$ '+fmt(p.preco))+'</td></tr>';
  }).join('');
  var w=window.open('','_blank');
  if(!w){toast('Permita pop-ups para gerar a lista.','erro');return;}
  w.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Lista de preços — Meu 3D Labs</title><style>body{font-family:Arial;color:#111;margin:22px;}h1{font-size:17px;}h1 span{color:#f26522;}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;}td,th{border:1px solid #bbb;padding:7px 9px;text-align:left;}th{background:#f0f3f8;}.rodape{margin-top:16px;font-size:10px;color:#888;}@media print{body{margin:8mm;}}</style></head><body>'+
    '<h1>Meu <span>3D</span> Labs — Lista de preços da loja</h1><small>Gerada em '+new Date().toLocaleString('pt-BR')+'</small>'+
    '<table><tr><th>Produto</th><th>Cores</th><th>Estoque</th><th>Preço</th></tr>'+linhas+'</table>'+
    '<div class="rodape">Documento interno — não entregar ao cliente</div></body></html>');
  w.document.close();w.focus();
  setTimeout(function(){try{w.print();}catch(e){}},450);
}

/* ===== 6. CTRL+V DE IMAGEM NO FORM ===== */
document.addEventListener('paste',function(e){
  if(!document.getElementById('fNome'))return; /* só com form aberto */
  var items=e.clipboardData&&e.clipboardData.items;if(!items)return;
  var files=[];
  for(var i=0;i<items.length;i++){if(items[i].type&&items[i].type.indexOf('image')===0){var f=items[i].getAsFile();if(f)files.push(f);}}
  if(files.length){e.preventDefault();window.enviarFotos(files);toast('📋 Imagem colada — enviando como foto do produto…');}
});

/* ===== 7. ATALHOS DE TECLADO ===== */
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){
    if(document.getElementById('fNome')){e.preventDefault();window.salvarProduto();}
    return;
  }
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  var tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  if(document.getElementById('fNome')){ /* form aberto */
    if(e.key==='Escape'){e.preventDefault();window.fecharForm();}
    return;
  }
  if(e.key==='/'){e.preventDefault();var bi=document.getElementById('buscaInput');if(bi)bi.focus();}
  else if(e.key==='n'||e.key==='N'){e.preventDefault();window.abrirForm();}
});

/* ===== 8. INICIALIZAÇÃO ===== */
injetaBotoes();
injetaMassa();
injetaSaude();
injetaChips();
renderChips();
listenerGrade();
})();