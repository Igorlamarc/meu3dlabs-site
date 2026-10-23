/* ============================================================
   Meu 3D Labs — admin-extras.js
   Camada de recursos avançados do painel.
   notas, tags, histórico, kanban, números, ficha, backup,
   busca global, atalhos, resumo do dia, meta mensal, PWA,
   editar pedido, valor com sinal 30%, pagamentos e gráficos.
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

/* ===== 4. HISTÓRICO DE STATUS ===== */
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

/* ===== 5. POS-RENDER ===== */
var _refreshT=null;
function wrapRender(){
  var _rs=window.renderizarStats;if(_rs)window.renderizarStats=function(){_rs();agenda();};
  var _r=window.renderizar;if(_r)window.renderizar=function(){_r();agenda();};
  function agenda(){clearTimeout(_refreshT);_refreshT=setTimeout(function(){resumoPop();metaPop();if(kanbanAberto)renderKanban();},60);}
}

/* ===== 6. MODAL DE DETALHES ENRIQUECIDO ===== */
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
    '<input class="tag-in" id="m3lTagIn" placeholder="Nova tag (VIP, Correio...)"><button type="button" class="tag-add" id="m3lTagAdd">+</button></div></div>'+
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

/* ===== 7. FICHA DE PRODUÇÃO ===== */
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
  var valorTotal=parseFloat(p.valor)||0;
  var valorPago=parseFloat(p.valor_pago)||0;
  var falta=valorTotal-valorPago;
  var fin='';
  if(!loja&&valorTotal>0){
    fin='<div class="bloco"><b class="rot">Financeiro</b>Total: <b>'+fmtV(valorTotal)+'</b> · Pago: <b>'+fmtV(valorPago)+'</b> · Falta: <b>'+(falta>0?fmtV(falta):'Quitado')+'</b></div>';
  }
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
   fin+
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
    '<h3>📊 Números — '+esc((LABEL_ABA()[window.tipoAtivo]||'').replace(/^[^\w]+\s/,''))+'</h3>'+headLoja+
    '<div class="m3l-rot" style="margin-top:14px;">'+(isLoja?'Faturamento por mês (pagamentos confirmados — últimos 12 meses)':'Pedidos por mês (aba atual — últimos 12 meses)')+'</div>'+
    '<div class="g-wrap">'+barras+'</div>'+
    '<div class="m3l-rot" style="margin-top:18px;">🏆 Top clientes</div><div class="m3l-top">'+topHtml+'</div>'+
    '<div class="m3l-rot" style="margin-top:18px;">🏷️ Tags em uso</div><div class="m3l-tags" style="margin-top:8px;">'+tagsHtml+'</div>';
  ov.classList.add('show');
}
function fecharNum(){var ov=$('#m3lNumOverlay');if(ov)ov.classList.remove('show');}

/* ===== 10. BUSCA GLOBAL ===== */
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
  alert('✅ Backup baixado!\n\nInclui: '+(window.orcamentos||[]).length+' encomendas, '+(window.lojaPedidos||[]).length+' pedidos da loja'+(window.cacheProdutos?', '+(window.cacheProdutos||[]).length+' produtos':'')+' e seus dados locais.');
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
        var tr=trs[idx];
        if(!tr||tr.tagName!=='TR')return;
        var h=histDe(String(p.id)).filter(function(x){return x.para==='sem-resposta';});
        var base=(h.length?h[h.length-1].ts:(p.created_at?new Date(p.created_at).getTime():0));
        var velho=base&&(hoje0()-base)>=2*86400000;
        tr.classList.toggle('m3l-velho',!!velho);
      });
    }
  };
}

/* ===== 13. ATALHOS ===== */
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

/* ===== 15. INIT ===== */
injectTopButtons();
injectResumo();
injectKanban();
injectChipSumiu();
wrapMudarStatus();
wrapRender();
wrapAbrirVerMais();
wrapAplicarFiltros();
})();

/* ==========================================================================
   EXTRAS 2 — Editar · Valor com sinal 30% · Pagamentos · Gráficos
   Segunda IIFE isolada.
   ========================================================================== */
(function(){
'use strict';

/* ---------- ESTADO ---------- */
var EDI_ID = null;
var VAL_ID = null;
var VAL_CALLBACK = null;
var PAG_ID = null;
var GRAF_ANO = new Date().getFullYear();
var META_MENSAL_PADRAO = 1000;
var CHAVE_META = 'm3d_meta_mensal';
var SINAL_PCT = 30;

/* ---------- CSS INJETADO ---------- */
(function(){
  var css = document.createElement('style');
  css.textContent =
  '.btn-edit{background:#e8eef9;color:#0f1e3d;border:1.5px solid #c5d2e8;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;white-space:nowrap;margin-left:4px;}' +
  '.btn-edit:hover{background:#0f1e3d;color:#fff;border-color:#0f1e3d;}' +
  '.btn-pag{background:#e6f7ee;color:#0f7a44;border:1.5px solid #a8dfc2;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s;white-space:nowrap;margin-left:4px;}' +
  '.btn-pag:hover{background:#0f7a44;color:#fff;border-color:#0f7a44;}' +
  '.valor-cell{font-weight:800;font-size:12.5px;line-height:1.35;white-space:nowrap;}' +
  '.valor-cell.total{color:#0f1e3d;}' +
  '.valor-cell.pago{color:#0f7a44;font-weight:700;font-size:11.5px;}' +
  '.valor-cell.falta{color:#c0392b;font-weight:700;font-size:11.5px;}' +
  '.valor-cell.quitado{color:#0f7a44;font-weight:800;font-size:11.5px;}' +
  '.valor-cell.vazio{color:#b9c2d2;font-weight:600;font-style:italic;font-size:12.5px;}' +
  '.ed-form{display:flex;flex-direction:column;gap:4px;margin:14px 0;}' +
  '.ed-lbl{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#6b7690;margin-top:8px;}' +
  '.ed-input{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #dde3ec;border-radius:9px;font-family:inherit;font-size:14px;color:#0f1e3d;background:#fff;outline:none;transition:.2s;}' +
  '.ed-input:focus{border-color:#f26522;box-shadow:0 0 0 3px rgba(242,101,34,.12);}' +
  '.ed-textarea{resize:vertical;min-height:80px;}' +
  '.valor-input-wrap{display:flex;align-items:center;gap:8px;margin:8px 0 4px;}' +
  '.valor-prefix{font-size:20px;font-weight:800;color:#0f1e3d;}' +
  '.valor-input{font-size:22px;font-weight:800;color:#0f1e3d;letter-spacing:-.5px;}' +
  '.valor-sugestoes{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px;}' +
  '.valor-sug{background:#f0f3f8;border:1.5px solid #dde3ec;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;color:#0f1e3d;cursor:pointer;font-family:inherit;transition:.2s;}' +
  '.valor-sug:hover{background:#0f1e3d;color:#fff;border-color:#0f1e3d;}' +
  '.sinal-box{background:#f7f9fc;border:1.5px solid #e3e8ef;border-radius:12px;padding:14px 16px;margin:12px 0 6px;}' +
  '.sinal-linha{display:flex;justify-content:space-between;align-items:center;padding:5px 0;}' +
  '.sinal-lbl{font-size:12.5px;font-weight:700;color:#6b7690;}' +
  '.sinal-val{font-size:17px;font-weight:800;color:#0f7a44;letter-spacing:-.4px;}' +
  '.sinal-val.saldo{color:#c0392b;}' +
  '.sinal-nota{font-size:11px;color:#8a94a8;margin-top:8px;line-height:1.45;font-weight:600;}' +
  '.pag-resumo{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0;}' +
  '.pag-card{background:#f7f9fc;border:1px solid #e3e8ef;border-radius:10px;padding:10px 12px;}' +
  '.pag-card-lbl{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#6b7690;margin-bottom:3px;}' +
  '.pag-card-val{font-size:16px;font-weight:800;color:#0f1e3d;letter-spacing:-.4px;}' +
  '.pag-card.ok .pag-card-val{color:#0f7a44;}' +
  '.pag-card.falta .pag-card-val{color:#c0392b;}' +
  '.pag-hist{display:flex;flex-direction:column;gap:8px;margin-top:10px;max-height:220px;overflow-y:auto;}' +
  '.pag-item{display:flex;justify-content:space-between;align-items:center;background:#f7f9fc;border:1px solid #e3e8ef;border-left:4px solid #0f7a44;border-radius:8px;padding:9px 12px;}' +
  '.pag-item-val{font-size:14px;font-weight:800;color:#0f7a44;}' +
  '.pag-item-data{font-size:11.5px;color:#8a94a8;font-weight:600;}' +
  '.pag-item-del{background:none;border:none;color:#c0392b;cursor:pointer;font-size:14px;padding:2px 6px;}' +
  '.pag-item-del:hover{background:#fdeaea;border-radius:6px;}' +
  '.graph-btn{background:linear-gradient(135deg,#0f1e3d,#1c3158);color:#fff !important;border:none;}' +
  '.graph-btn:hover{filter:brightness(1.15);}' +
  '.graf-overlay{position:fixed;inset:0;background:rgba(10,20,40,.75);z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;overflow-y:auto;}' +
  '.graf-overlay.show{display:flex !important;}' +
  '.graf-modal{background:#fff;border-radius:18px;max-width:980px;width:100%;max-height:92vh;overflow-y:auto;padding:26px 26px 30px;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.35);}' +
  '.graf-close{position:absolute;top:14px;right:16px;background:none;border:none;font-size:18px;color:#8a94a8;cursor:pointer;padding:6px;}' +
  '.graf-close:hover{color:#c0392b;}' +
  '.graf-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px;padding-right:30px;}' +
  '.graf-head h2{font-size:21px;color:#0f1e3d;font-weight:800;margin:0;letter-spacing:-.4px;}' +
  '.graf-anos{display:flex;gap:6px;flex-wrap:wrap;}' +
  '.graf-ano{background:#f0f3f8;border:1.5px solid #dde3ec;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;color:#0f1e3d;cursor:pointer;font-family:inherit;transition:.2s;}' +
  '.graf-ano.on{background:#f26522;border-color:#f26522;color:#fff;}' +
  '.graf-ano:hover:not(.on){border-color:#f26522;}' +
  '.graf-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;}' +
  '.gk{background:#f7f9fc;border:1px solid #e3e8ef;border-radius:14px;padding:14px 16px;}' +
  '.gk-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7690;margin-bottom:4px;}' +
  '.gk-val{font-size:23px;font-weight:800;color:#0f1e3d;letter-spacing:-.6px;line-height:1.15;}' +
  '.gk-sub{font-size:11.5px;color:#8a94a8;margin-top:3px;font-weight:600;}' +
  '.gk.verde .gk-val{color:#0f7a44;}' +
  '.gk.laranja .gk-val{color:#f26522;}' +
  '.gk.vermelho .gk-val{color:#c0392b;}' +
  '.graf-bloco{margin-bottom:26px;}' +
  '.graf-bloco h4{font-size:14px;font-weight:800;color:#0f1e3d;margin:0 0 14px;}' +
  '.graf-ano-lbl{color:#f26522;}' +
  '.graf-barras{display:flex;align-items:flex-end;gap:8px;height:190px;padding:0 4px;border-bottom:2px solid #e3e8ef;}' +
  '.gb-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px;min-width:0;}' +
  '.gb-stack{width:100%;max-width:46px;display:flex;flex-direction:column-reverse;border-radius:7px 7px 0 0;overflow:hidden;transition:.3s;cursor:default;}' +
  '.gb-part{width:100%;min-height:2px;}' +
  '.gb-part.enc{background:linear-gradient(180deg,#f26522,#ff8a3d);}' +
  '.gb-part.loja{background:linear-gradient(180deg,#2f9e44,#0f7a44);}' +
  '.gb-part.zero{background:#e3e8ef;}' +
  '.gb-val{font-size:10.5px;font-weight:800;color:#0f1e3d;white-space:nowrap;}' +
  '.gb-mes{font-size:10.5px;font-weight:700;color:#8a94a8;margin-top:4px;}' +
  '.graf-legenda{display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;}' +
  '.gl-item{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#6b7690;}' +
  '.gl-dot{width:11px;height:11px;border-radius:3px;}' +
  '.gl-dot.enc{background:linear-gradient(180deg,#f26522,#ff8a3d);}' +
  '.gl-dot.loja{background:linear-gradient(180deg,#2f9e44,#0f7a44);}' +
  '.graf-metas{display:flex;flex-direction:column;gap:11px;}' +
  '.gm-row{display:flex;align-items:center;gap:12px;}' +
  '.gm-mes{font-size:12.5px;font-weight:700;color:#0f1e3d;width:44px;flex-shrink:0;}' +
  '.gm-track{flex:1;height:16px;background:#f0f3f8;border-radius:99px;overflow:hidden;position:relative;}' +
  '.gm-fill{height:100%;background:linear-gradient(90deg,#25a35a,#0f7a44);border-radius:99px;transition:width .5s;}' +
  '.gm-fill.baixo{background:linear-gradient(90deg,#f5b301,#e0a000);}' +
  '.gm-fill.zero{background:#e3e8ef;}' +
  '.gm-pct{font-size:12px;font-weight:800;color:#0f1e3d;width:52px;text-align:right;flex-shrink:0;}' +
  '.graf-anual{display:flex;flex-direction:column;gap:10px;}' +
  '.ga-row{display:flex;align-items:center;gap:12px;}' +
  '.ga-ano{font-size:13px;font-weight:800;color:#0f1e3d;width:52px;flex-shrink:0;}' +
  '.ga-track{flex:1;height:20px;background:#f0f3f8;border-radius:99px;overflow:hidden;}' +
  '.ga-fill{height:100%;background:linear-gradient(90deg,#0f1e3d,#2a4472);border-radius:99px;transition:width .5s;}' +
  '.ga-val{font-size:12.5px;font-weight:800;color:#0f1e3d;width:130px;text-align:right;flex-shrink:0;}' +
  '.graf-meta-config{display:flex;align-items:center;gap:10px;margin-bottom:18px;padding:12px 14px;background:#fff8f2;border:1.5px solid #f2b28f;border-radius:12px;flex-wrap:wrap;}' +
  '.graf-meta-config label{font-size:12.5px;font-weight:700;color:#0f1e3d;}' +
  '.graf-meta-config input{width:110px;padding:7px 10px;border:1.5px solid #dde3ec;border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;color:#0f1e3d;outline:none;}' +
  '@media(max-width:620px){' +
  '.graf-modal{padding:20px 16px 24px;border-radius:14px;}' +
  '.graf-barras{height:150px;gap:4px;}' +
  '.gb-mes{font-size:9px;}' +
  '.gk-val{font-size:19px;}' +
  '.pag-resumo{grid-template-columns:1fr;}' +
  '}';
  document.head.appendChild(css);
})();

/* ---------- HELPERS ---------- */
function esc2(s){var d=document.createElement('div');d.textContent=(s==null?'':String(s));return d.innerHTML;}
function fmtBRL(v){var n=parseFloat(v)||0;return 'R$ '+n.toFixed(2).replace('.',',');}
function fmtBRLcurto(v){
  var n=parseFloat(v)||0;
  if(n>=1000000)return 'R$ '+(n/1000000).toFixed(1).replace('.',',')+'M';
  if(n>=1000)return 'R$ '+(n/1000).toFixed(1).replace('.',',')+'k';
  return 'R$ '+n.toFixed(0);
}
function nomeMes(i){return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]||'';}
function listaPedidos(){return (window.orcamentos||[]);}
function apiBase(){return 'https://meu3dlabs-backend.onrender.com/api';}
function tokenAtual(){return sessionStorage.getItem('m3d_admin_token')||localStorage.getItem('m3d_admin_token')||'';}
function metaMensal(){
  var v=parseFloat(localStorage.getItem(CHAVE_META));
  return isNaN(v)||v<=0?META_MENSAL_PADRAO:v;
}
function valorTotalDe(p){return parseFloat(p.valor)||0;}
function valorPagoDe(p){
  if(p.valor_pago!=null&&p.valor_pago!=='')return parseFloat(p.valor_pago)||0;
  var arr=Array.isArray(p.pagamentos)?p.pagamentos:[];
  var s=0;arr.forEach(function(x){s+=parseFloat(x.valor)||0;});
  return s;
}
function pagamentosDe(p){return Array.isArray(p.pagamentos)?p.pagamentos:[];}
function ehLoja(p){return !!(p&&p.itens&&p.itens.length);}
function CONF(s){return ['pago','Pago (Cartão)','embalagem','saiu','entregue'].indexOf(String(s))!==-1;}

/* ---------- 1. ID REAL DA LINHA ---------- */
function idDaTr(tr){
  var d=tr.getAttribute('data-id');
  if(d)return d;
  var tds=tr.querySelectorAll('td');
  if(!tds.length)return '';
  var txt=String(tds[0].textContent||'').trim();
  var ref=txt.replace(/\s*Novo\s*/i,'').replace(/●.*/,'').trim();
  var lista=listaPedidos();
  for(var i=0;i<lista.length;i++){
    var p=lista[i];
    if(String(p.pedido_id)===ref)return String(p.id);
    if('#'+p.id===ref)return String(p.id);
  }
  if(/^\d+$/.test(ref))return ref;
  return '';
}

/* ---------- 2. COLUNA VALOR ---------- */
function garantirHeaderValor(){
  var thead=document.getElementById('tabelaHead');
  if(!thead||thead.querySelector('.th-valor'))return;
  var tr=thead.querySelector('tr');if(!tr)return;
  var ths=tr.querySelectorAll('th');if(!ths.length)return;
  var th=document.createElement('th');
  th.className='th-valor';
  th.textContent='Valor';
  tr.insertBefore(th,ths[ths.length-1]);
}

function aplicarColunaValor(){
  garantirHeaderValor();
  var isLoja=(typeof window.tipoAtivo!=='undefined'&&window.tipoAtivo==='loja');
  if(isLoja)return;
  document.querySelectorAll('#tabelaBody tr').forEach(function(tr){
    if(tr.querySelector('.valor-cell'))return;
    var tds=tr.querySelectorAll('td');
    if(tds.length<6)return;
    var id=idDaTr(tr);
    var p=null;
    listaPedidos().forEach(function(x){if(String(x.id)===String(id))p=x;});
    if(!p)return;
    var total=valorTotalDe(p);
    var pago=valorPagoDe(p);
    var falta=total-pago;
    var html;
    if(total<=0){
      html='<span class="valor-cell vazio">—</span>';
    }else{
      html='<div class="valor-cell total">'+fmtBRL(total)+'</div>'+
           '<div class="valor-cell pago">pago '+fmtBRL(pago)+'</div>'+
           (falta>0.005
             ?'<div class="valor-cell falta">falta '+fmtBRL(falta)+'</div>'
             :'<div class="valor-cell quitado">✔ quitado</div>');
    }
    var td=document.createElement('td');
    td.className='valor-col';
    td.innerHTML=html;
    var stCell=tr.querySelector('.status-select');
    var alvo=stCell?stCell.closest('td'):tds[tds.length-1];
    if(alvo&&alvo.parentNode)alvo.parentNode.insertBefore(td,alvo);
    else tr.appendChild(td);
  });
}

/* ---------- 3. BOTÕES EDITAR + PAGAMENTOS ---------- */
var STATUS_FECHADOS=['entregue','cancelado','Cancelado'];

function aplicarBotoesEditar(){
  var isLoja=(typeof window.tipoAtivo!=='undefined'&&window.tipoAtivo==='loja');
  if(isLoja)return;
  document.querySelectorAll('#tabelaBody tr').forEach(function(tr){
    var sel=tr.querySelector('.status-select');
    if(!sel)return;
    var cel=sel.closest('td');
    if(!cel)return;
    var id=idDaTr(tr);
    if(!id)return;
    var p=null;
    listaPedidos().forEach(function(x){if(String(x.id)===String(id))p=x;});
    var st=p?String(p.status||''):'';
    var fechado=STATUS_FECHADOS.indexOf(st)!==-1;

    if(p&&valorTotalDe(p)>0&&st!=='cancelado'&&st!=='Cancelado'&&!cel.querySelector('.btn-pag')){
      var bp=document.createElement('button');
      bp.type='button';
      bp.className='btn-pag';
      bp.textContent='💰 Pagamentos';
      bp.title='Lançar pagamentos recebidos';
      bp.onclick=function(ev){ev.stopPropagation();window.abrirPagamentos(id);};
      cel.appendChild(bp);
    }
    if(!fechado&&!cel.querySelector('.btn-edit')){
      var b=document.createElement('button');
      b.type='button';
      b.className='btn-edit';
      b.textContent='✏️ Editar';
      b.title='Editar dados e quantidade deste pedido';
      b.onclick=function(ev){ev.stopPropagation();window.abrirEditar(id);};
      cel.appendChild(b);
    }
    if(fechado){
      var be=cel.querySelector('.btn-edit');
      if(be)be.remove();
    }
    if(st==='cancelado'||st==='Cancelado'){
      var bp2=cel.querySelector('.btn-pag');
      if(bp2)bp2.remove();
    }
  });
}

/* ---------- 4. MODAL EDITAR ---------- */
window.abrirEditar=function(id){
  var p=null;
  listaPedidos().forEach(function(x){if(String(x.id)===String(id))p=x;});
  if(!p){alert('Não encontrei este pedido na lista. Clique em 🔄 Atualizar e tente de novo.');return;}
  EDI_ID=id;
  var m=document.getElementById('edMeta');
  if(m)m.textContent='Pedido '+(p.pedido_id||('#'+id))+' · '+(p.nome_cliente||'—')+' · recebido em '+(p.created_at?new Date(p.created_at).toLocaleString('pt-BR'):'—');
  var e;
  e=document.getElementById('edNome');if(e)e.value=p.nome_cliente||'';
  e=document.getElementById('edWhats');if(e)e.value=p.whatsapp||'';
  e=document.getElementById('edQtd');if(e)e.value=p.quantidade||1;
  e=document.getElementById('edDesc');if(e)e.value=p.descricao_peca||'';
  e=document.getElementById('edPrazo');if(e)e.value=p.prazo_desejado?String(p.prazo_desejado).substring(0,10):'';
  var ov=document.getElementById('editOverlay');
  if(ov)ov.classList.add('show');
};

window.fecharEditar=function(){
  var ov=document.getElementById('editOverlay');
  if(ov)ov.classList.remove('show');
  EDI_ID=null;
};

window.salvarEdicao=function(){
  if(!EDI_ID)return;
  var btn=document.getElementById('edSalvar');
  if(btn){btn.disabled=true;btn.textContent='Salvando...';}
  var g=function(x){var el=document.getElementById(x);return el?el.value:'';};
  var corpo={
    nome_cliente:String(g('edNome')).trim(),
    whatsapp:String(g('edWhats')).trim(),
    quantidade:parseInt(g('edQtd'))||1,
    descricao_peca:String(g('edDesc')).trim(),
    prazo_desejado:g('edPrazo')||null
  };
  fetch(apiBase()+'/orcamentos/'+EDI_ID,{
    method:'PUT',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokenAtual()},
    body:JSON.stringify(corpo)
  })
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(){
    var idSalvo=EDI_ID;
    if(btn){btn.disabled=false;btn.textContent='💾 Salvar alterações';}
    window.fecharEditar();
    if(typeof window.carregarPedidos==='function')window.carregarPedidos();
    if(typeof window.mostrarToast==='function')window.mostrarToast('✅ Pedido #'+idSalvo+' atualizado!');
    else alert('✅ Pedido #'+idSalvo+' atualizado!');
  })
  .catch(function(e){
    if(btn){btn.disabled=false;btn.textContent='💾 Salvar alterações';}
    alert('Não foi possível salvar: '+e.message+'\n\nConfirme se o backend já foi atualizado.');
  });
};

/* ---------- 5. MODAL VALOR + SINAL ---------- */
var _mudarStatusOriginal=null;
function instalarHookStatus(){
  if(_mudarStatusOriginal)return;
  if(typeof window.mudarStatus!=='function')return;
  _mudarStatusOriginal=window.mudarStatus;
  window.mudarStatus=function(id,novoStatus){
    var p=null;
    listaPedidos().forEach(function(x){if(String(x.id)===String(id))p=x;});
    if(novoStatus==='aprovado'){
      var jaTem=p&&valorTotalDe(p)>0;
      if(jaTem)return _mudarStatusOriginal.apply(this,arguments);
      window.abrirValorModal(id,function(){
        _mudarStatusOriginal.call(window,id,novoStatus);
      });
      return;
    }
    return _mudarStatusOriginal.apply(this,arguments);
  };
}

window.abrirValorModal=function(id,callback){
  var p=null;
  listaPedidos().forEach(function(x){if(String(x.id)===String(id))p=x;});
  if(!p)return;
  VAL_ID=id;
  VAL_CALLBACK=callback||null;
  var m=document.getElementById('valorMeta');
  if(m)m.textContent='Pedido '+(p.pedido_id||('#'+id))+' · '+(p.nome_cliente||'cliente')+' · '+(p.quantidade||1)+' un.';
  var inp=document.getElementById('valorInput');
  if(inp)inp.value=p.valor?String(p.valor).replace('.',','):'';
  var sug=document.getElementById('valorSugestoes');
  if(sug){
    sug.innerHTML='';
    [100,150,200,270,350,500].forEach(function(v){
      var b=document.createElement('button');
      b.type='button';b.className='valor-sug';b.textContent=fmtBRL(v);
      b.onclick=function(){if(inp)inp.value=v.toFixed(2).replace('.',',');window.recalcularSinal();};
      sug.appendChild(b);
    });
  }
  window.recalcularSinal();
  var ov=document.getElementById('valorOverlay');
  if(ov)ov.classList.add('show');
  setTimeout(function(){if(inp)inp.focus();},120);
};

window.recalcularSinal=function(){
  var el=document.getElementById('valorInput');
  var txt=String(el?el.value:'').replace(/\./g,'').replace(',','.');
  var total=parseFloat(txt)||0;
  var sinal=total*SINAL_PCT/100;
  var saldo=total-sinal;
  var sv=document.getElementById('sinalValor');
  var sd=document.getElementById('saldoValor');
  if(sv)sv.textContent=fmtBRL(sinal);
  if(sd)sd.textContent=fmtBRL(saldo);
};

window.fecharValorModal=function(){
  var ov=document.getElementById('valorOverlay');
  if(ov)ov.classList.remove('show');
  VAL_ID=null;VAL_CALLBACK=null;
};

window.mascaraValor=function(el){
  var v=String(el.value||'').replace(/\D/g,'');
  if(!v){el.value='';return;}
  var n=parseInt(v,10)/100;
  el.value=n.toFixed(2).replace('.',',');
};

window.confirmarValor=function(){
  if(!VAL_ID)return;
  var el=document.getElementById('valorInput');
  var txt=String(el?el.value:'').replace(/\./g,'').replace(',','.');
  var total=parseFloat(txt);
  if(isNaN(total)||total<=0){alert('Informe um valor total válido maior que zero.');return;}
  var idAtual=VAL_ID;
  var cb=VAL_CALLBACK;
  var btn=document.querySelector('#valorOverlay .vm-copiar');
  if(btn){btn.disabled=true;btn.textContent='Salvando...';}
  var sinal=total*SINAL_PCT/100;
  var pagamentos=[{valor:sinal,ts:Date.now(),obs:'Sinal '+SINAL_PCT+'% (automático)'}];
  fetch(apiBase()+'/orcamentos/'+idAtual,{
    method:'PUT',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokenAtual()},
    body:JSON.stringify({valor:total,valor_pago:sinal,pagamentos:pagamentos,percentual_sinal:SINAL_PCT})
  })
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(){
    window.fecharValorModal();
    if(typeof window.carregarPedidos==='function')window.carregarPedidos();
    if(typeof window.mostrarToast==='function')window.mostrarToast('💰 Total '+fmtBRL(total)+' · sinal '+fmtBRL(sinal));
    else alert('💰 Valor registrado!');
    if(cb)setTimeout(cb,150);
  })
  .catch(function(e){
    if(btn){btn.disabled=false;btn.textContent='✅ Confirmar e aprovar';}
    alert('Não foi possível salvar: '+e.message+'\n\nConfirme backend e colunas do Supabase.');
  });
};

/* ---------- 6. MODAL PAGAMENTOS ---------- */
window.abrirPagamentos=function(id){
  var p=null;
  listaPedidos().forEach(function(x){if(String(x.id)===String(id))p=x;});
  if(!p){alert('Pedido não encontrado. Recarregue a lista.');return;}
  PAG_ID=id;
  var total=valorTotalDe(p);
  var pago=valorPagoDe(p);
  var m=document.getElementById('pagMeta');
  if(m)m.textContent='Pedido '+(p.pedido_id||('#'+id))+' · '+(p.nome_cliente||'—');
  var inp=document.getElementById('pagInput');
  if(inp)inp.value='';
  var sug=document.getElementById('pagSugestoes');
  if(sug){
    sug.innerHTML='';
    var falta=total-pago;
    var opcoes=[];
    if(falta>0)opcoes.push(falta);
    [50,100,200].forEach(function(v){if(v<falta)opcoes.push(v);});
    opcoes.slice(0,4).forEach(function(v){
      var b=document.createElement('button');
      b.type='button';b.className='valor-sug';b.textContent=fmtBRL(v);
      b.onclick=function(){if(inp)inp.value=v.toFixed(2).replace('.',',');};
      sug.appendChild(b);
    });
  }
  renderPagResumo(p);
  var ov=document.getElementById('pagOverlay');
  if(ov)ov.classList.add('show');
  setTimeout(function(){if(inp)inp.focus();},120);
};

function renderPagResumo(p){
  var total=valorTotalDe(p);
  var pago=valorPagoDe(p);
  var falta=total-pago;
  var r=document.getElementById('pagResumo');
  if(r){
    r.innerHTML=
      '<div class="pag-card"><div class="pag-card-lbl">Total</div><div class="pag-card-val">'+fmtBRL(total)+'</div></div>'+
      '<div class="pag-card ok"><div class="pag-card-lbl">Pago</div><div class="pag-card-val">'+fmtBRL(pago)+'</div></div>'+
      '<div class="pag-card '+(falta>0.005?'falta':'ok')+'"><div class="pag-card-lbl">Falta</div><div class="pag-card-val">'+(falta>0.005?fmtBRL(falta):'Quitado')+'</div></div>';
  }
  var h=document.getElementById('pagHist');
  if(h){
    var arr=pagamentosDe(p).slice().sort(function(a,b){return (b.ts||0)-(a.ts||0);});
    h.innerHTML=arr.length?arr.map(function(x){
      var idxReal=pagamentosDe(p).indexOf(x);
      return '<div class="pag-item">'+
        '<div><div class="pag-item-val">'+fmtBRL(x.valor)+'</div>'+
        '<div class="pag-item-data">'+(x.ts?new Date(x.ts).toLocaleString('pt-BR'):'—')+(x.obs?' · '+esc2(x.obs):'')+'</div></div>'+
        '<button type="button" class="pag-item-del" data-idx="'+idxReal+'" title="Remover">🗑️</button>'+
      '</div>';
    }).join(''):'<span class="m3l-vazio">Nenhum pagamento lançado ainda.</span>';
    h.querySelectorAll('.pag-item-del').forEach(function(b){
      b.onclick=function(){removerPagamento(p,parseInt(b.getAttribute('data-idx'),10));};
    });
  }
}

window.fecharPagamentos=function(){
  var ov=document.getElementById('pagOverlay');
  if(ov)ov.classList.remove('show');
  PAG_ID=null;
};

window.lancarPagamento=function(){
  if(!PAG_ID)return;
  var el=document.getElementById('pagInput');
  var txt=String(el?el.value:'').replace(/\./g,'').replace(',','.');
  var v=parseFloat(txt);
  if(isNaN(v)||v<=0){alert('Informe um valor válido.');return;}
  var p=null;
  listaPedidos().forEach(function(x){if(String(x.id)===String(PAG_ID))p=x;});
  if(!p)return;
  var arr=pagamentosDe(p).slice();
  arr.push({valor:v,ts:Date.now(),obs:''});
  var novoPago=valorPagoDe(p)+v;
  var idPag=PAG_ID;
  var btn=document.querySelector('#pagOverlay .vm-copiar');
  if(btn){btn.disabled=true;btn.textContent='Salvando...';}
  fetch(apiBase()+'/orcamentos/'+idPag,{
    method:'PUT',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokenAtual()},
    body:JSON.stringify({pagamentos:arr,valor_pago:novoPago})
  })
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(){
    if(btn){btn.disabled=false;btn.textContent='➕ Lançar pagamento';}
    if(typeof window.carregarPedidos==='function')window.carregarPedidos();
    if(typeof window.mostrarToast==='function')window.mostrarToast('💰 Pagamento de '+fmtBRL(v)+' lançado');
    setTimeout(function(){
      var pp=null;
      listaPedidos().forEach(function(x){if(String(x.id)===String(idPag))pp=x;});
      var inp=document.getElementById('pagInput');
      if(inp)inp.value='';
      if(pp)renderPagResumo(pp);
    },600);
  })
  .catch(function(e){
    if(btn){btn.disabled=false;btn.textContent='➕ Lançar pagamento';}
    alert('Não foi possível lançar o pagamento: '+e.message);
  });
};

function removerPagamento(p,idx){
  if(!confirm('Remover este lançamento?'))return;
  var arr=pagamentosDe(p).slice();
  if(idx<0||idx>=arr.length)return;
  arr.splice(idx,1);
  var novoPago=0;arr.forEach(function(x){novoPago+=parseFloat(x.valor)||0;});
  fetch(apiBase()+'/orcamentos/'+p.id,{
    method:'PUT',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokenAtual()},
    body:JSON.stringify({pagamentos:arr,valor_pago:novoPago})
  })
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(){
    if(typeof window.carregarPedidos==='function')window.carregarPedidos();
    setTimeout(function(){
      var pp=null;
      listaPedidos().forEach(function(x){if(String(x.id)===String(PAG_ID))pp=x;});
      if(pp)renderPagResumo(pp);
    },600);
  })
  .catch(function(e){alert('Erro ao remover: '+e.message);});
}

/* ---------- 7. GRÁFICOS (BLINDADO) ---------- */
function injetarBotaoGraficos(){
  var acts=document.querySelector('.top-bar .actions');
  if(!acts||document.getElementById('btnGraficos'))return;
  var b=document.createElement('button');
  b.id='btnGraficos';
  b.type='button';
  b.className='refresh-btn graph-btn';
  b.textContent='📈 Gráficos';
  b.onclick=window.abrirGraficos;
  var ref=document.getElementById('refreshBtn');
  if(ref&&ref.parentNode)ref.parentNode.insertBefore(b,ref);
  else acts.appendChild(b);
}

function gEl(id){return document.getElementById(id);}

window.abrirGraficos=function(){
  try{
    var anos={};
    listaPedidos().concat(window.lojaPedidos||[]).forEach(function(p){
      var d=p.created_at?new Date(p.created_at):null;
      if(!d||isNaN(d))return;
      anos[d.getFullYear()]=1;
    });
    var listaAnos=Object.keys(anos).map(Number).sort(function(a,b){return b-a;});
    if(!listaAnos.length)listaAnos=[new Date().getFullYear()];
    if(listaAnos.indexOf(GRAF_ANO)===-1)GRAF_ANO=listaAnos[0];

    var box=gEl('grafAnos');
    if(box){
      box.innerHTML='';
      listaAnos.forEach(function(a){
        var bt=document.createElement('button');
        bt.type='button';bt.className='graf-ano'+(a===GRAF_ANO?' on':'');
        bt.textContent=a;
        bt.onclick=function(){GRAF_ANO=a;window.abrirGraficos();};
        box.appendChild(bt);
      });
    }

    desenharGraficos();

    var ov=gEl('grafOverlay');
    if(!ov){
      alert('Não encontrei o painel de gráficos no admin.html (id="grafOverlay").');
      return;
    }
    ov.classList.add('show');
  }catch(err){
    console.error('abrirGraficos:',err);
    alert('Erro ao abrir os gráficos: '+err.message);
  }
};

window.fecharGraficos=function(){
  var ov=gEl('grafOverlay');
  if(ov)ov.classList.remove('show');
};

function desenharGraficos(){
  var enc=listaPedidos();
  var loja=(window.lojaPedidos||[]);
  var meta=metaMensal();

  var lblAno=gEl('grafAnoLbl');
  if(lblAno)lblAno.textContent='· '+GRAF_ANO;

  var porMes=[];for(var i=0;i<12;i++)porMes.push({fatEnc:0,recEnc:0,fatLoja:0,recLoja:0,qtd:0});
  var totFatEnc=0,totRecEnc=0,totFatLoja=0,totRecLoja=0,qtdAno=0;
  var porAno={};
  function slot(y){if(!porAno[y])porAno[y]={fatEnc:0,recEnc:0,fatLoja:0,recLoja:0,qtd:0};return porAno[y];}

  /* ENCOMENDAS */
  enc.forEach(function(p){
    var d=p.created_at?new Date(p.created_at):null;
    if(!d||isNaN(d))return;
    var fat=valorTotalDe(p), rec=valorPagoDe(p);
    var y=String(d.getFullYear()), s=slot(y);
    s.fatEnc+=fat;s.recEnc+=rec;s.qtd++;
    if(d.getFullYear()===GRAF_ANO){
      var m=porMes[d.getMonth()];
      m.fatEnc+=fat;m.recEnc+=rec;m.qtd++;
      totFatEnc+=fat;totRecEnc+=rec;qtdAno++;
    }
  });

  /* LOJA — 100% pago, só status confirmados contam como recebido */
  loja.forEach(function(p){
    var d=p.created_at?new Date(p.created_at):null;
    if(!d||isNaN(d))return;
    var st=String(p.status||'');
    if(st==='cancelado'||st.indexOf('Cancelado')!==-1)return;
    var v=parseFloat(p.total||p.subtotal||0)||0;
    var fat=v, rec=CONF(st)?v:0;
    var y=String(d.getFullYear()), s=slot(y);
    s.fatLoja+=fat;s.recLoja+=rec;
    if(d.getFullYear()===GRAF_ANO){
      var m=porMes[d.getMonth()];
      m.fatLoja+=fat;m.recLoja+=rec;
      totFatLoja+=fat;totRecLoja+=rec;
    }
  });

  var totFat=totFatEnc+totFatLoja;
  var totRec=totRecEnc+totRecLoja;
  var aReceber=Math.max(0,totFat-totRec);
  var ticket=qtdAno?(totFatEnc/qtdAno):0;

  /* KPIs */
  var kp=gEl('grafKpis');
  if(kp){
    kp.innerHTML=
      '<div class="gk laranja"><div class="gk-lbl">Faturado '+GRAF_ANO+'</div><div class="gk-val">'+fmtBRL(totFat)+'</div><div class="gk-sub">encomendas + loja</div></div>'+
      '<div class="gk verde"><div class="gk-lbl">Recebido '+GRAF_ANO+'</div><div class="gk-val">'+fmtBRL(totRec)+'</div><div class="gk-sub">dinheiro que entrou</div></div>'+
      '<div class="gk vermelho"><div class="gk-lbl">A receber</div><div class="gk-val">'+fmtBRL(aReceber)+'</div><div class="gk-sub">saldo pendente</div></div>'+
      '<div class="gk"><div class="gk-lbl">Loja / Encomendas</div><div class="gk-val" style="font-size:17px;">'+fmtBRLcurto(totRecLoja)+' / '+fmtBRLcurto(totRecEnc)+'</div><div class="gk-sub">recebido por fonte</div></div>';
  }

  /* legenda */
  var bloco=gEl('grafBlocoBarras')||document.querySelector('.graf-bloco');
  if(bloco){
    var leg=bloco.querySelector('.graf-legenda');
    if(leg){
      leg.innerHTML=
        '<div class="gl-item"><span class="gl-dot enc"></span>Encomendas</div>'+
        '<div class="gl-item"><span class="gl-dot loja"></span>Loja</div>'+
        '<div class="gl-item" style="margin-left:auto;color:#8a94a8;">barras = recebido no mês</div>';
    }
  }

  /* barras empilhadas */
  var maxM=0;
  porMes.forEach(function(m){
    var t=m.recEnc+m.recLoja;
    if(t>maxM)maxM=t;
  });
  if(maxM<meta)maxM=meta;
  if(maxM<=0)maxM=1;

  var bh=gEl('grafBarras');
  if(bh){
    bh.innerHTML='';
    porMes.forEach(function(m,i){
      var tot=m.recEnc+m.recLoja;
      var pTot=(tot/maxM)*100;
      var pEnc=tot>0?(m.recEnc/tot)*pTot:0;
      var pLoja=tot>0?(m.recLoja/tot)*pTot:0;
      var col=document.createElement('div');
      col.className='gb-col';
      col.innerHTML=
        '<div class="gb-val">'+(tot>0?fmtBRLcurto(tot):'')+'</div>'+
        '<div class="gb-stack" style="height:'+Math.max(pTot,2)+'%;" title="'+nomeMes(i)+' — recebido '+fmtBRL(tot)+' (enc '+fmtBRL(m.recEnc)+' + loja '+fmtBRL(m.recLoja)+')">'+
          (pLoja>0?'<div class="gb-part loja" style="flex:'+pLoja+';"></div>':'')+
          (pEnc>0?'<div class="gb-part enc" style="flex:'+pEnc+';"></div>':'')+
          (tot<=0?'<div class="gb-part zero" style="flex:1;"></div>':'')+
        '</div>'+
        '<div class="gb-mes">'+nomeMes(i)+'</div>';
      bh.appendChild(col);
    });
  }

  /* meta vs realizado */
  var gm=gEl('grafMetas');
  if(gm){
    gm.innerHTML='';
    porMes.forEach(function(m,i){
      var rec=m.recEnc+m.recLoja;
      var pct=meta>0?Math.round((rec/meta)*100):0;
      var cls=pct>=100?'':(pct>0?' baixo':' zero');
      var row=document.createElement('div');
      row.className='gm-row';
      row.innerHTML=
        '<span class="gm-mes">'+nomeMes(i)+'</span>'+
        '<div class="gm-track"><div class="gm-fill'+cls+'" style="width:'+Math.min(pct,100)+'%"></div></div>'+
        '<span class="gm-pct">'+(rec>0?pct+'%':'—')+'</span>';
      gm.appendChild(row);
    });
    var cfg=gEl('grafMetaCfg');
    if(!cfg&&gm.parentNode){
      cfg=document.createElement('div');
      cfg.id='grafMetaCfg';
      cfg.className='graf-meta-config';
      cfg.innerHTML='<label>🎯 Meta mensal (recebido):</label><input type="text" id="metaInput" value="'+meta.toFixed(2).replace('.',',')+'"><button type="button" class="graf-ano" onclick="salvarMeta()">Salvar meta</button>';
      gm.parentNode.insertBefore(cfg,gm);
    }else if(cfg){
      var mi=gEl('metaInput');
      if(mi)mi.value=meta.toFixed(2).replace('.',',');
    }
  }

  /* comparativo anual */
  var ga=gEl('grafAnual');
  if(ga){
    ga.innerHTML='';
    var anos=Object.keys(porAno).sort(function(a,b){return Number(a)-Number(b);});
    if(!anos.length)anos=[String(GRAF_ANO)];
    var maxA=0;
    anos.forEach(function(a){
      var r=porAno[a];
      if(!r)return;
      var t=r.fatEnc+r.fatLoja;
      if(t>maxA)maxA=t;
    });
    if(maxA<=0)maxA=1;
    anos.forEach(function(a){
      var r=porAno[a]||{fatEnc:0,recEnc:0,fatLoja:0,recLoja:0};
      var fat=r.fatEnc+r.fatLoja, rec=r.recEnc+r.recLoja;
      var pct=(fat/maxA)*100;
      var row=document.createElement('div');
      row.className='ga-row';
      row.innerHTML='<span class="ga-ano">'+a+'</span>'+
        '<div class="ga-track"><div class="ga-fill" style="width:'+Math.max(pct,1)+'%"></div></div>'+
        '<span class="ga-val">fat '+fmtBRLcurto(fat)+' · rec '+fmtBRLcurto(rec)+'</span>';
      ga.appendChild(row);
    });
  }
}

window.salvarMeta=function(){
  var el=gEl('metaInput');
  var txt=String(el?el.value:'').replace(/\./g,'').replace(',','.');
  var v=parseFloat(txt);
  if(isNaN(v)||v<=0){alert('Informe uma meta válida.');return;}
  localStorage.setItem(CHAVE_META,String(v));
  desenharGraficos();
  if(typeof window.mostrarToast==='function')window.mostrarToast('🎯 Meta mensal atualizada!');
};

/* ---------- 8. OBSERVADOR DA TABELA ---------- */
var _t=null;
function observarTabela(){
  var tb=document.getElementById('tabelaBody');
  if(!tb||tb._m3dObs)return;
  tb._m3dObs=new MutationObserver(function(){
    clearTimeout(_t);
    _t=setTimeout(function(){
      aplicarBotoesEditar();
      aplicarColunaValor();
    },60);
  });
  tb._m3dObs.observe(tb,{childList:true,subtree:true});
}

/* ---------- 9. INIT ---------- */
function init(){
  injetarBotaoGraficos();
  instalarHookStatus();
  observarTabela();
  aplicarBotoesEditar();
  aplicarColunaValor();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

var _mudarAbaOrig=window.mudarAba;
if(typeof _mudarAbaOrig==='function'){
  window.mudarAba=function(){
    var r=_mudarAbaOrig.apply(this,arguments);
    setTimeout(function(){
      injetarBotaoGraficos();
      instalarHookStatus();
      observarTabela();
      aplicarBotoesEditar();
      aplicarColunaValor();
    },120);
    return r;
  };
}

})();