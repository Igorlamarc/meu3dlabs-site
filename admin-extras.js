/* ============================================================
   Meu 3D Labs — admin-extras.js
   Camada de recursos avançados do painel (Fase A + B).
   Conecta-se por cima do admin.js sem alterá-lo:
   notas, tags, histórico, kanban, números, ficha, backup,
   busca global, atalhos, resumo do dia, meta mensal, PWA.

   Dados locais (notas/tags/histórico/meta) ficam neste
   navegador — prefixo m3l_ no localStorage.
   ============================================================ */
(function(){
'use strict';

/* ===== 0. UTILIDADES ===== */
function $(s,c){return (c||document).querySelector(s);}
function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
function esc(t){var d=document.createElement('div');d.textContent=(t==null?'':String(t));return d.innerHTML;}
function hoje0(){var d=new Date();d.setHours(0,0,0,0);return d.getTime();}
function fmtV(v){var n=parseFloat(v);return isNaN(n)?'R$ 0':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function fmtDT(ts){var d=new Date(ts);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function LS(k,d){try{var v=localStorage.getItem(k);return v===null?JSON.parse(d):JSON.parse(v);}catch(e){return JSON.parse(d);}}
function SS(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function todosPedidos(){return (window.orcamentos||[]).concat(window.lojaPedidos||[]);}
function pedPorId(id){var a=todosPedidos();for(var i=0;i<a.length;i++)if(String(a[i].id)===String(id))return a[i];return null;}
function chaveDeTitulo(t){var m=String(t||'').trim().split(/\s+/);return m[m.length-1]||'x';}
function chaveDePedido(p){return String(p.pedido_id||('#'+p.id));}
function pedPorChave(k){var a=todosPedidos();for(var i=0;i<a.length;i++){var x=a[i];if(chaveDePedido(x)===k||String(x.id)===k)return x;}return null;}
function notasDe(k){return LS('m3l_nota_'+k,'');}
function tagsDe(k){return LS('m3l_tags_'+k,'[]');}
function histDe(k){return LS('m3l_hist_'+k,'[]');}
function metaDe(){return parseFloat(localStorage.getItem('m3l_meta'))||2000;}
var PALETA=['#f26522','#1f6feb','#8250df','#0f9d8f','#d9a406','#d73a49','#2f9e44','#7a55c7'];
function corTag(t){var h=0;for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))>>>0;return PALETA[h%PALETA.length];}
function CONF(s){return ['pago','Pago (Cartão)','embalagem','saiu','entregue'].indexOf(String(s))!==-1;}
function LABEL_ABA(){return {orcamentos:'📋 Encomendas',assistencia:'🔧 Assistência',consultoria:'🎓 Consultoria',loja:'🛍️ Loja'};}
function tradStat(s){
  var m={'novo':'Novo','em-analise':'Em análise','orcamento':'Em orçamento','aprovado':'Aprovado','producao':'Em produção','pronto':'Pronto','entregue':'Entregue','sem-resposta':'Sem resposta','cancelado':'Cancelado','feito':'Pedido feito','pago':'Pago no Pix','Pago (Cartão)':'Pago no cartão','embalagem':'Em embalagem','saiu':'Saiu para entrega'};
  return m[s]||s;
}

/* ===== 1. BOTÕES NA BARRA SUPERIOR ===== */
function injectTopButtons(){
  var box=$('.top-bar .actions');
  if(!box||$('#m3lBtnKanban'))return;
  function btn(id,txt,cor,fn,title){
    var b=document.createElement('button');
    b.type='button';b.className='refresh-btn';b.id=id;b.textContent=txt;b.title=title||'';
    b.style.background=cor;
    b.onclick=fn;box.insertBefore(b,$('.refresh-btn',box));
    return b;
  }
  btn('m3lBtnBusca','🔍 Buscar','#0f9d8f',abrirBusca,'Busca global (Ctrl+K)');
  btn('m3lBtnKanban','🗂️ Kanban','#1f6feb',toggleKanban,'Visão Kanban (K)');
  btn('m3lBtnNum','📊 Números','#8250df',abrirNum,'Gráficos e clientes');
  btn('m3lBtnBackup','💾 Backup','#57606a',fazerBackup,'Baixar cópia de segurança');
}

/* ===== 2. RESUMO DO DIA ===== */
function injectResumo(){
  var tabs=$('#tabs');if(!tabs||$('#m3lResumo'))return;
  var d=document.createElement('div');d.id='m3lResumo';tabs.insertAdjacentElement('afterend',d);
}
function resumoPop(){
  var el=$('#m3lResumo');if(!el)return;
  if(!window.orcamentos){el.innerHTML='';return;}
  var t0=hoje0();
  var nov=0,fat=0;
  todosPedidos().forEach(function(p){var ts=p.created_at?new Date(p.created_at).getTime():0;if(ts>=t0)nov++;});
  (window.lojaPedidos||[]).forEach(function(p){var ts=p.created_at?new Date(p.created_at).getTime():0;if(ts>=t0&&CONF(p.status||'feito'))fat+=parseFloat(p.total||p.subtotal||0);});
  var prod=0;
  try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(String(k).indexOf('m3l_hist_')===0){histDe(String(k).slice(9)).forEach(function(h){if(h.ts>=t0&&['producao','embalagem','saiu'].indexOf(h.para)!==-1)prod++;});}}}catch(e){}
  var crit=0;(window.orcamentos||[]).forEach(function(p){if(window.classePrazo){var c=window.classePrazo(p);if(c==='atrasado'||c==='hoje')crit++;}});
  var zero=!nov&&!prod&&!fat&&!crit;
  el.innerHTML=zero
    ?'<div class="r-item zero">☀️ Nada novo por aqui — produção em dia!</div>'
    :'<div class="r-item"><div class="r-num">'+nov+'</div><div class="r-lab">🆕 novos hoje</div></div>'+
     '<div class="r-item"><div class="r-num">'+prod+'</div><div class="r-lab">🛠️ produção hoje</div></div>'+
     '<div class="r-item"><div class="r-num">'+fmtV(fat)+'</div><div class="r-lab">💰 faturado hoje</div></div>'+
     '<div class="r-item'+(crit?' alerta':'')+'"><div class="r-num">'+crit+'</div><div class="r-lab">⏰ prazo crítico</div></div>';
}

/* ===== 3. META MENSAL + COMPARATIVO (LOJA) ===== */
function fatLojaMes(anoMes){
  var t=0;
  (window.lojaPedidos||[]).forEach(function(p){
    if(!CONF(p.status||'feito'))return;
    var d=p.created_at?new Date(p.created_at):null;if(!d||isNaN(d))return;
    if(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')===anoMes)t+=parseFloat(p.total||p.subtotal||0);
  });
  return t;
}
function metaPop(){
  var grid=$('#statsGrid');if(!grid)return;
  var old=$('#m3lCardMeta');if(old)old.remove();
  if(window.tipoAtivo!=='loja'||!window.lojaPedidos)return;
  var agora=new Date();
  var mesA=agora.getFullYear()+'-'+String(agora.getMonth()+1).padStart(2,'0');
  var dAnt=new Date(agora.getFullYear(),agora.getMonth()-1,1);
  var mesB=dAnt.getFullYear()+'-'+String(dAnt.getMonth()+1).padStart(2,'0');
  var fatA=fatLojaMes(mesA),fatB=fatLojaMes(mesB);
  var delta=fatB>0?Math.round((fatA-fatB)/fatB*100):null;
  var qtd=0;(window.lojaPedidos||[]).forEach(function(p){if(!CONF(p.status||'feito'))return;var d=p.created_at?new Date(p.created_at):null;if(d&&!isNaN(d)&&d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')===mesA)qtd++;});
  var ticket=qtd>0?fatA/qtd:0;
  var cardFat=null;$$('.stat-card',grid).forEach(function(c){var l=$('.stat-label',c);if(l&&l.textContent==='Faturamento')cardFat=c;});
  if(cardFat){var det=$('.stat-detail',cardFat);if(det)det.innerHTML='▲▼ '+(delta===null?'sem base p/ comparar':(delta>=0?'▲ ':'▼ ')+Math.abs(delta)+'% vs mês anterior')+' · Ticket '+fmtV(ticket);}
  var meta=metaDe(),pct=meta>0?Math.min(100,Math.round(fatA/meta*100)):0;
  var c=document.createElement('div');c.className='stat-card green';c.id='m3lCardMeta';c.style.cursor='pointer';c.title='Clique para definir a meta do mês';
  c.innerHTML='<div class="stat-ico">🎯</div><div class="stat-label">Meta do mês</div><div class="stat-value" style="font-size:20px;">'+fmtV(fatA)+' / '+fmtV(meta)+'</div>'+
    '<div class="meta-bar"><div class="meta-fill" style="width:'+pct+'%"></div></div><div class="stat-detail">'+pct+'% da meta atingida</div>';
  c.onclick=function(){var v=prompt('Meta de faturamento do mês (R$):',String(meta));if(v!==null){var n=parseFloat(v.replace(',','.'));if(!isNaN(n)&&n>0){localStorage.setItem('m3l_meta',String(n));metaPop();}}};
  grid.appendChild(c);
}

/* ===== 4. HISTÓRICO DE STATUS (wrap mudarStatus) ===== */
function wrapMudarStatus(){
  var _ms=window.mudarStatus;if(!_ms)return;
  window.mudarStatus=function(id,novo){
    var p=pedPorId(id),ant=p?String(p.status||''):'';
    var r=_ms(id,novo);
    if(ant&&ant!==String(novo)){
      var k=String(id),h=histDe(k);
      h.push({de:ant,para:String(novo),ts:Date.now()});
      if(h.length>50)h=h.slice(-50);
      SS('m3l_hist_'+k,h);
    }
    return r;
  };
}

/* ===== 5. POS-RENDER (resumo + meta + kanban) ===== */
var _refreshT=null;
function wrapRender(){
  var _rs=window.renderizarStats;if(_rs)window.renderizarStats=function(){_rs();agenda();};
  var _r=window.renderizar;if(_r)window.renderizar=function(){_r();agenda();};
  function agenda(){clearTimeout(_refreshT);_refreshT=setTimeout(function(){resumoPop();metaPop();if(kanbanAberto)renderKanban();},60);}
}

/* ===== 6. MODAL DE DETALHES ENRIQUECIDO (tags/notas/histórico/ficha) ===== */
function wrapAbrirVerMais(){
  var _av=window.abrirVerMais;if(!_av)return;
  window.abrirVerMais=function(i){_av(i);setTimeout(function(){enriquecer(i);},0);};
}
function enriquecer(i){
  var modal=$('#verOverlay .ver-modal');if(!modal)return;
  var old=$('#m3lModalExtras',modal);if(old)old.remove();
  var d=(window.verCache||[])[i]||{};
  var k=chaveDeTitulo(d.t),p=pedPorChave(k);
  var box=document.createElement('div');box.id='m3lModalExtras';
  var tags=tagsDe(k);
  var chips=tags.map(function(t){var c=corTag(t);return '<span class="tag-chip" style="color:'+c+';background:'+c+'1c;border:1px solid '+c+'55">'+esc(t)+'<button type="button" class="tag-x" data-t="'+esc(t)+'">×</button></span>';}).join('');
  var hist=histDe(String(p?p.id:'')).slice().reverse().map(function(h){
    return '<div class="hist-item"><span>'+esc(tradStat(h.de))+' → <b>'+esc(tradStat(h.para))+'</b></span><span>'+fmtDT(h.ts)+'</span></div>';
  }).join('')||'<span class="m3l-vazio">Sem mudanças de status registradas ainda (o histórico começa agora).</span>';
  box.innerHTML='<div class="m3l-secao"><div class="m3l-rot">🏷️ Tags internas</div><div class="m3l-tags">'+chips+
    '<input class="tag-in" id="m3lTagIn" placeholder="Nova tag (VIP, Correio...)..."><button type="button" class="tag-add" id="m3lTagAdd">+</button></div></div>'+
    '<div class="m3l-secao"><div class="m3l-rot">📝 Nota interna — só para você</div><textarea class="nota-txt" id="m3lNotaTxt" placeholder="Ex.: cliente prefere azul; combinar envio sexta...">'+esc(notasDe(k))+'</textarea></div>'+
    '<div class="m3l-secao"><div class="m3l-rot">🕘 Histórico de status</div><div class="m3l-hist">'+hist+'</div></div>'+
    '<div class="m3l-secao"><button type="button" class="m3l-btn-ficha" id="m3lBtnFicha">🖨️ Imprimir ficha de produção</button></div>';
  modal.appendChild(box);
  var nota=$('#m3lNotaTxt',box),nt=null;
  nota.addEventListener('input',function(){clearTimeout(nt);nt=setTimeout(function(){localStorage.setItem('m3l_nota_'+k,JSON.stringify(nota.value));},400);});
  function flushNota(){localStorage.setItem('m3l_nota_'+k,JSON.stringify(nota.value));}
  function addTag(){
    var inp=$('#m3lTagIn',box),t=(inp.value||'').trim();
    if(!t)return;flushNota();
    var ts=tagsDe(k);if(ts.indexOf(t)===-1){ts.push(t);SS('m3l_tags_'+k,ts);}
    enriquecer(i);
  }
  $('#m3lTagAdd',box).onclick=addTag;
  $('#m3lTagIn',box).addEventListener('keydown',function(e){if(e.key==='Enter')addTag();});
  $$('.tag-x',box).forEach(function(b){b.onclick=function(){
    flushNota();
    var ts=tagsDe(k).filter(function(t){return t!==b.getAttribute('data-t');});
    SS('m3l_tags_'+k,ts);enriquecer(i);
  };});
  $('#m3lBtnFicha',box).onclick=function(){if(p)abrirFicha(p);else alert('Não encontrei os dados completos deste pedido.');};
}

/* ===== 7. FICHA DE PRODUÇÃO IMPRIMÍVEL ===== */
function abrirFicha(p){
  var win=window.open('','_blank');
  if(!win){alert('Permita pop-ups para gerar a ficha.');return;}
  var k=chaveDePedido(p);
  var loja=p.itens&&p.itens.length;
  var itens=(p.itens||[]).map(function(it){var q=it.qtd||it.quantidade||1;return '<tr><td>'+q+'x</td><td>'+esc((it.nome||it.produto||'Item')+(it.cor?' ('+it.cor+')':''))+'</td><td>'+fmtV(parseFloat(it.preco||0)*q)+'</td></tr>';}).join('');
  var prazo=p.prazo_desejado?String(p.prazo_desejado).match(/^(\d{4})-(\d{2})-(\d{2})/)?p.prazo_desejado.slice(8,10)+'/'+p.prazo_desejado.slice(5,7)+'/'+p.prazo_desejado.slice(0,4):p.prazo_desejado:'—';
  var serv=window.rotuloServico?window.rotuloServico(p.servico||p.tipo_servico||p.tipo_peca||p.tipo):'';
  var desc=(p.descricao_peca||'').split('|')[0].trim();
  var tags=tagsDe(k).join(' · ');
  var nota=notasDe(k);
  var cls=window.classePrazo?window.classePrazo(p):'';
  var prazoCls=cls==='atrasado'?'ficha-atrasado':(cls==='hoje'?'ficha-hoje':'');
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha '+esc(chaveDePedido(p))+'</title><style>'+
   'body{font-family:Arial,sans-serif;color:#111;margin:24px;}h1{font-size:18px;margin:0 0 2px;}h1 span{color:#f26522;}'+
   '.id{font-size:26px;font-weight:800;margin:10px 0 2px;}.sub{color:#555;font-size:12px;margin-bottom:14px;}'+
   'table{width:100%;border-collapse:collapse;margin:10px 0;}td,th{border:1px solid #bbb;padding:7px 9px;font-size:13px;text-align:left;}th{background:#f0f3f8;}'+
   '.bloco{border:1.5px solid #333;border-radius:8px;padding:10px 12px;margin:10px 0;font-size:13px;}'+
   '.bloco b.rot{display:block;font-size:10px;text-transform:uppercase;color:#666;margin-bottom:3px;}'+
   '.prazo{font-size:18px;font-weight:800;}'+'.ficha-atrasado{color:#c00;}'+'.ficha-hoje{color:#b3541e;}'+
   '.rodape{margin-top:18px;font-size:10px;color:#888;border-top:1px dashed #ccc;padding-top:6px;}'+
   '@media print{body{margin:8mm;}}</style></head><body>'+
   '<h1>Meu <span>3D</span> Labs — Ficha de produção</h1>'+
   '<div class="id">'+esc(chaveDePedido(p))+'</div>'+
   '<div class="sub">Gerada em '+new Date().toLocaleString('pt-BR')+' · '+esc(loja?'Pedido da loja':(serv||'Encomenda'))+'</div>'+
   '<table><tr><th>Cliente</th><td>'+esc(p.nome_cliente||'—')+'</td><th>Contato</th><td>'+esc(p.whatsapp||p.email||'—')+'</td></tr>'+
   (loja?'':'<tr><th>Serviço</th><td colspan="3">'+esc(serv||'—')+'</td></tr>')+
   (loja?'':'<tr><th>O que fazer</th><td colspan="3">'+esc(desc||'—')+'</td></tr>')+
   (p.quantidade?'<tr><th>Quantidade</th><td colspan="3">'+esc(p.quantidade)+'</td></tr>':'')+
   (p.urgencia?'<tr><th>Urgência</th><td colspan="3">'+esc(p.urgencia)+'</td></tr>':'')+'</table>'+
   (loja?'<div class="bloco"><b class="rot">Itens do pedido</b><table style="margin:4px 0 0;"><tr><th>Qtd</th><th>Item</th><th>Valor</th></tr>'+itens+
     (p.cupom&&parseFloat(p.desconto)>0?'<tr><td></td><td>Cupom '+esc(p.cupom)+'</td><td>-'+fmtV(p.desconto)+'</td></tr>':'')+
     '<tr><td></td><td><b>TOTAL</b></td><td><b>'+fmtV(p.total||(parseFloat(p.subtotal)-parseFloat(p.desconto||0)))+'</b></td></tr></table></div>':'')+
   '<div class="bloco"><b class="rot">Prazo</b><span class="prazo '+prazoCls+'">'+esc(prazo)+'</span>'+(p.entrega?'<br><small>Entrega: '+esc(p.entrega)+(p.horario?' · '+esc(p.horario):'')+(p.endereco?' · '+esc(p.endereco):'')+'</small>':'')+'</div>'+
   (tags?'<div class="bloco"><b class="rot">Tags</b>'+esc(tags)+'</div>':'')+
   (nota?'<div class="bloco"><b class="rot">Nota interna</b>'+esc(nota)+'</div>':'')+
   '<div class="rodape">Meu 3D Labs · Ficha interna de produção — não entregar ao cliente</div>'+
   '</body></html>';
  win.document.write(html);win.document.close();win.focus();
  setTimeout(function(){try{win.print();}catch(e){}},450);
}

/* ===== 8. KANBAN ===== */
var kanbanAberto=false;
var KMAP_ENC=[['novo','🆕 Novos','novo'],['atend','🎯 Atendimento','em-analise'],['aprov','✅ Aprovado','aprovado'],['prod','🛠️ Produção','producao'],['pronto','📦 Pronto','pronto'],['entregue','🚀 Entregue','entregue'],['fim','🗃️ Encerrados','cancelado']];
var KMAP_LOJA=[['feito','📝 Pedido feito','feito'],['aguard','⏳ Aguardando pgto','Aguardando pagamento (Pix)'],['pago','💰 Pago','pago'],['embal','📦 Embalagem','embalagem'],['saiu','🚚 Saiu','saiu'],['entregue','🔵 Entregue','entregue'],['cancel','✕ Cancelado','cancelado']];
function injectKanban(){
  var tw=$('.table-wrap');if(!tw||$('#m3lKanban'))return;
  var d=document.createElement('div');d.id='m3lKanban';d.style.display='none';
  tw.insertAdjacentElement('afterend',d);
}
function colKey(p,isLoja){
  var s=String(p.status||(isLoja?'feito':'novo'));
  if(isLoja){
    if(s==='feito')return 'feito';
    if(s.indexOf('Aguardando')===0)return 'aguard';
    if(s==='pago'||s==='Pago (Cartão)')return 'pago';
    if(s==='embalagem')return 'embal';
    if(s==='saiu')return 'saiu';
    if(s==='entregue')return 'entregue';
    return 'cancel';
  }
  if(s==='novo')return 'novo';
  if(s==='em-analise'||s==='orcamento')return 'atend';
  if(s==='aprovado')return 'aprov';
  if(s==='producao')return 'prod';
  if(s==='pronto')return 'pronto';
  if(s==='entregue')return 'entregue';
  return 'fim';
}
function toggleKanban(){
  kanbanAberto=!kanbanAberto;
  var k=$('#m3lKanban'),tw=$('.table-wrap');
  if(k)k.style.display=kanbanAberto?'flex':'none';
  if(tw)tw.style.display=kanbanAberto?'none':'block';
  var b=$('#m3lBtnKanban');if(b)b.style.outline=kanbanAberto?'2px solid #ff8a3d':'none';
  if(kanbanAberto)renderKanban();
}
function renderKanban(){
  var cont=$('#m3lKanban');if(!cont)return;
  var isLoja=window.tipoAtivo==='loja';
  var mapa=isLoja?KMAP_LOJA:KMAP_ENC;
  var grupos={};mapa.forEach(function(c){grupos[c[0]]=[];});
  (window.tipoAtivo==='loja'?(window.lojaPedidos||[]):(todosPedidos().filter(function(p){return !window.servicoTipo||window.servicoTipo(p)===window.tipoAtivo;}))).forEach(function(p){
    var g=grupos[colKey(p,isLoja)];if(g)g.push(p);
  });
  cont.innerHTML='';
  mapa.forEach(function(c){
    var col=document.createElement('div');col.className='k-col';
    col.innerHTML='<div class="k-head">'+c[1]+'<span class="k-count">'+grupos[c[0]].length+'</span></div>';
    var body=document.createElement('div');body.className='k-body';
    (grupos[c[0]]||[]).forEach(function(p){body.appendChild(kCard(p,isLoja));});
    if(!(grupos[c[0]]||[]).length)body.innerHTML='<div class="k-vazio">—</div>';
    col.appendChild(body);
    col.addEventListener('dragover',function(e){e.preventDefault();col.classList.add('over');});
    col.addEventListener('dragleave',function(){col.classList.remove('over');});
    col.addEventListener('drop',function(e){
      e.preventDefault();col.classList.remove('over');
      var id=e.dataTransfer.getData('text/plain');if(!id)return;
      var pp=pedPorId(id);if(!pp)return;
      if(colKey(pp,isLoja)===c[0])return;
      window.mudarStatus(pp.id,c[2]);
    });
    cont.appendChild(col);
  });
}
function kCard(p,isLoja){
  var d=document.createElement('div');
  d.className='k-card';d.draggable=true;d.dataset.id=p.id;
  var cls=window.classePrazo?window.classePrazo(p):null;
  var flags=cls==='atrasado'?' 🔴':(cls==='hoje'?' ⏰':'');
  var tags=tagsDe(chaveDePedido(p)).map(function(t){var c=corTag(t);return '<span class="tag-chip mini" style="color:'+c+';background:'+c+'1c;border:1px solid '+c+'55">'+esc(t)+'</span>';}).join('');
  d.innerHTML='<div class="k-topo"><span class="k-titulo">'+esc(chaveDePedido(p))+flags+'</span>'+
    '<button type="button" class="k-ico" title="Imprimir ficha">🖨️</button></div>'+
    '<div class="k-nome">'+esc(p.nome_cliente||'—')+'</div>'+
    (isLoja?'<div class="k-info">💰 '+fmtV(p.total||p.subtotal)+'</div>':
      '<div class="k-info">'+(p.prazo_desejado?'📅 '+esc(String(p.prazo_desejado).slice(8,10)+'/'+p.prazo_desejado.slice(5,7)+'/'+p.prazo_desejado.slice(0,4)):'📅 sem prazo')+'</div>')+
    (tags?'<div class="k-tags">'+tags+'</div>':'');
  d.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',String(p.id));d.classList.add('drag');});
  d.addEventListener('dragend',function(){d.classList.remove('drag');});
  $('.k-ico',d).onclick=function(e){e.stopPropagation();abrirFicha(p);};
  d.onclick=function(){abrirDetalhesPorId(p);};
  return d;
}
function abrirDetalhesPorId(p){
  var idEx=chaveDePedido(p),vc=window.verCache||[];
  for(var i=0;i<vc.length;i++){if(vc[i]&&vc[i].t&&vc[i].t.slice(-idEx.length)===idEx){window.abrirVerMais(i);return;}}
}

/* ===== 9. MODAL NÚMEROS ===== */
function abrirNum(){
  var ov=$('#m3lNumOverlay');
  if(!ov){
    ov=document.createElement('div');ov.className='ver-overlay';ov.id='m3lNumOverlay';
    ov.innerHTML='<div class="ver-modal"><button type="button" class="vm-close" id="m3lNumX">✕</button><div id="m3lNumBody"></div></div>';
    ov.addEventListener('click',function(e){if(e.target===ov)fecharNum();});
    document.body.appendChild(ov);
    $('#m3lNumX',ov).onclick=fecharNum;
  }
  var isLoja=window.tipoAtivo==='loja';
  var agora=new Date(),meses=[],vals=[];
  for(var m=11;m>=0;m--){
    var d=new Date(agora.getFullYear(),agora.getMonth()-m,1);
    var key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    meses.push({key:key,lab:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()],atual:m===0});
    vals.push(0);
  }
  var lista=isLoja?(window.lojaPedidos||[]):todosPedidos().filter(function(p){return !window.servicoTipo||window.servicoTipo(p)===window.tipoAtivo;});
  lista.forEach(function(p){
    var dt=p.created_at?new Date(p.created_at):null;if(!dt||isNaN(dt))return;
    var key=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');
    var idx=-1;for(var i=0;i<meses.length;i++)if(meses[i].key===key)idx=i;
    if(idx<0)return;
    if(isLoja){if(CONF(p.status||'feito'))vals[idx]+=parseFloat(p.total||p.subtotal||0);}
    else vals[idx]++;
  });
  var max=Math.max.apply(null,vals.concat([1]));
  var barras=meses.map(function(mm,i){
    var pct=Math.round(vals[i]/max*100);
    return '<div class="g-col"><div class="g-bar'+(mm.atual?' g-atual':'')+'" style="height:'+Math.max(pct,2)+'%" title="'+(isLoja?fmtV(vals[i]):vals[i]+' pedidos')+' — '+mm.lab+'"></div><div class="g-lab">'+mm.lab+'</div></div>';
  }).join('');
  var cli={};
  lista.forEach(function(p){
    var key=String(p.whatsapp||p.email||p.nome_cliente||'—');
    var c=cli[key]||(cli[key]={nome:p.nome_cliente||key,n:0,total:0});
    c.n++;c.total+=parseFloat(p.total||p.subtotal||0)||0;
  });
  var top=Object.keys(cli).map(function(k){return cli[k];}).sort(function(a,b){return b.n-a.n;}).slice(0,5);
  var topHtml=top.map(function(c,i){
    return '<div class="top-cli"><span class="tc-pos">'+(i+1)+'º</span><span class="tc-nome">'+esc(c.nome)+'</span><span class="tc-n">'+c.n+' pedido'+(c.n>1?'s':'')+'</span>'+(isLoja?'<span class="tc-total">'+fmtV(c.total)+'</span>':'')+'</div>';
  }).join('')||'<span class="m3l-vazio">Sem pedidos ainda.</span>';
  var tagsCt={};
  todosPedidos().forEach(function(p){tagsDe(chaveDePedido(p)).forEach(function(t){tagsCt[t]=(tagsCt[t]||0)+1;});});
  var tagsHtml=Object.keys(tagsCt).sort().map(function(t){var c=corTag(t);return '<span class="tag-chip" style="color:'+c+';background:'+c+'1c;border:1px solid '+c+'55">'+esc(t)+' · '+tagsCt[t]+'</span>';}).join('')||'<span class="m3l-vazio">Nenhuma tag criada ainda (crie no modal de detalhes).</span>';
  var fatA=fatLojaMes(meses[11].key),fatB=fatLojaMes(meses[10].key);
  var delta=fatB>0?Math.round((fatA-fatB)/fatB*100):null;
  var headLoja=isLoja?'<div class="num-cards"><div class="num-card"><b>'+fmtV(fatA)+'</b><span>mês atual</span></div><div class="num-card"><b>'+fmtV(fatB)+'</b><span>mês anterior</span></div><div class="num-card"><b>'+(delta===null?'—':(delta>=0?'▲ ':'▼ ')+Math.abs(delta)+'%')+'</b><span>comparativo</span></div><div class="num-card"><b>'+(meses[11].v||'')+'</b><span>&nbsp;</span></div></div>':'';
  $('#m3lNumBody',ov).innerHTML=
    '<h3>📊 Números — '+esc((LABEL_ABA()[window.tipoAtivo]||'').replace(/^[^\w]+\s/,''))+'</h3>'+
    headLoja+
    '<div class="m3l-rot" style="margin-top:14px;">'+(isLoja?'Faturamento por mês (pagamentos confirmados — últimos 12 meses)':'Pedidos por mês (aba atual — últimos 12 meses)')+'</div>'+
    '<div class="g-wrap">'+barras+'</div>'+
    '<div class="m3l-rot" style="margin-top:18px;">🏆 Top clientes</div><div class="m3l-top">'+topHtml+'</div>'+
    '<div class="m3l-rot" style="margin-top:18px;">🏷️ Tags em uso</div><div class="m3l-tags" style="margin-top:8px;">'+tagsHtml+'</div>';
  ov.classList.add('show');
}
function fecharNum(){var ov=$('#m3lNumOverlay');if(ov)ov.classList.remove('show');}

/* ===== 10. BUSCA GLOBAL (Ctrl+K) ===== */
function abrirBusca(){
  var ov=$('#m3lBuscaOverlay');
  if(!ov){
    ov=document.createElement('div');ov.className='ver-overlay';ov.id='m3lBuscaOverlay';
    ov.innerHTML='<div class="ver-modal bg-modal"><button type="button" class="vm-close" id="m3lBuscaX">✕</button>'+
      '<input class="bg-input" id="m3lBuscaIn" placeholder="Buscar pedido por ID, nome, contato... (todas as abas)">'+
      '<div class="bg-res" id="m3lBuscaRes"></div></div>';
    ov.addEventListener('click',function(e){if(e.target===ov)fecharBusca();});
    document.body.appendChild(ov);
    $('#m3lBuscaX',ov).onclick=fecharBusca;
    var inp=$('#m3lBuscaIn',ov),ult=[];
    inp.addEventListener('input',function(){ult=buscaRender(inp.value);});
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&ult.length){irParaResultado(ult[0]);}
    });
  }
  ov.classList.add('show');
  var i=$('#m3lBuscaIn',ov);i.value='';buscaRender('');setTimeout(function(){i.focus();},50);
}
function fecharBusca(){var ov=$('#m3lBuscaOverlay');if(ov)ov.classList.remove('show');}
function buscaRender(termo){
  termo=String(termo||'').toLowerCase().trim();
  var res=$('#m3lBuscaRes');if(!res)return[];
  var out=[];
  if(termo){
    todosPedidos().forEach(function(p){
      var isLoja=!!(p.itens&&p.itens.length);
      var aba=isLoja?'loja':(window.servicoTipo?window.servicoTipo(p):'orcamentos');
      var hay=[p.id,p.pedido_id,p.nome_cliente,p.whatsapp,p.email,p.descricao_peca,(p.itens||[]).map(function(i){return i.nome;}).join(' ')].filter(Boolean).join(' ').toLowerCase();
      if(hay.indexOf(termo)===-1)return;
      out.push({p:p,aba:aba});
    });
  }
  var show=out.slice(0,12);
  res.innerHTML=show.length?show.map(function(r){
    return '<div class="bg-item" data-ref="'+esc(r.aba+'|'+r.p.id)+'"><span class="bg-aba">'+esc(LABEL_ABA()[r.aba]||'')+'</span><b>'+esc(chaveDePedido(r.p))+'</b> — '+esc(r.p.nome_cliente||'—')+'<small>'+esc(tradStat(r.p.status||(r.aba==='loja'?'feito':'novo')))+' · '+esc(r.p.created_at?new Date(r.p.created_at).toLocaleDateString('pt-BR'):'—')+'</small></div>';
  }).join(''):(termo?'<div class="m3l-vazio">Nada encontrado.</div>':'<div class="m3l-vazio">Digite para buscar em todas as abas.</div>');
  $$('.bg-item',res).forEach(function(el){el.onclick=function(){
    var parts=el.getAttribute('data-ref').split('|');
    var pp=pedPorId(parts[1]);if(pp)irParaResultado({p:pp,aba:parts[0]});
  };});
  return out;
}
function irParaResultado(r){
  fecharBusca();
  window.mudarAba(r.aba);
  var bi=$('#buscaInput');if(bi)bi.value=chaveDePedido(r.p);
  if(window.aplicarFiltros)window.aplicarFiltros();
}

/* ===== 11. BACKUP JSON ===== */
function fazerBackup(){
  var locais={};
  try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(String(k).indexOf('m3l_')===0)locais[k]=localStorage.getItem(k);}}catch(e){}
  var dados={gerado_em:new Date().toISOString(),orcamentos:window.orcamentos||[],lojaPedidos:window.lojaPedidos||[],produtos:window.cacheProdutos||[],dados_locais_do_navegador:locais};
  var blob=new Blob([JSON.stringify(dados,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='backup-meu3dlabs-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},2000);
  alert('✅ Backup baixado!\n\nInclui: '+(window.orcamentos||[]).length+' encomendas, '+(window.lojaPedidos||[]).length+' pedidos da loja'+(window.cacheProdutos?', '+(window.cacheProdutos||[]).length+' produtos':'')+' e seus dados locais (notas, tags, histórico, meta).');
}

/* ===== 12. CHIP "SUMIU +2 DIAS" ===== */
function injectChipSumiu(){
  var box=$('#prazoChips');if(!box||$('#m3lChipSumiu'))return;
  var b=document.createElement('button');
  b.type='button';b.className='prazo-chip';b.id='m3lChipSumiu';b.setAttribute('data-filtro','sumiu2');
  b.innerHTML='📭 Sumiu +2d';
  b.onclick=function(){
    var ativo=b.classList.contains('active');
    var sf=$('#statusFilter');
    if(ativo){sf.value='';window.setFiltroPrazo('todos');}
    else{sf.value='sem-resposta';window.setFiltroPrazo('sumiu2');}
  };
  box.appendChild(b);
}
function wrapAplicarFiltros(){
  var _af=window.aplicarFiltros;if(!_af)return;
  window.aplicarFiltros=function(){
    _af();
    var sf=$('#statusFilter');
    if(sf&&sf.value==='sem-resposta'){
      var ps=window.filtrarPedidos?window.filtrarPedidos():[];
      var trs=$$('#tabelaBody tr');
      ps.forEach(function(p,idx){
        var tr=trs[idx];if(!tr||!tr.classList.contains('td-desc')===false){}
        if(!tr||tr.tagName!=='TR')return;
        var h=histDe(String(p.id)).filter(function(x){return x.para==='sem-resposta';});
        var base=(h.length?h[h.length-1].ts:(p.created_at?new Date(p.created_at).getTime():0));
        var velho=base&&(hoje0()-base)>=2*86400000;
        tr.classList.toggle('m3l-velho',!!velho);
      });
    }
  };
}

/* ===== 13. ATALHOS DE TECLADO ===== */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){fecharBusca();fecharNum();return;}
  if(e.ctrlKey||e.metaKey){
    if(String(e.key).toLowerCase()==='k'){e.preventDefault();abrirBusca();}
    return;
  }
  var tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  if($$('.ver-overlay.show,.status-overlay.show,.prazo-overlay.show').length)return;
  switch(e.key){
    case '1':if(window.mudarAba)window.mudarAba('orcamentos');break;
    case '2':if(window.mudarAba)window.mudarAba('assistencia');break;
    case '3':if(window.mudarAba)window.mudarAba('consultoria');break;
    case '4':if(window.mudarAba)window.mudarAba('loja');break;
    case 'r':case 'R':if(window.carregarPedidos)window.carregarPedidos();break;
    case 'k':case 'K':toggleKanban();break;
    case '/':e.preventDefault();var bi=$('#buscaInput');if(bi)bi.focus();break;
  }
});

/* ===== 14. PWA ===== */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
}

/* ===== 15. INICIALIZAÇÃO ===== */
injectTopButtons();
injectResumo();
injectKanban();
injectChipSumiu();
wrapMudarStatus();
wrapRender();
wrapAbrirVerMais();
wrapAplicarFiltros();
})();