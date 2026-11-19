/* ===== Meu 3D Labs — loja/pedido: geração do pedido, PIX, confirmação e histórico ===== */
/* ORDEM DE CARREGAMENTO no loja.html (a ordem importa):
   loja-carrinho.js -> loja-checkout.js -> loja-pedido.js (este) -> loja-pagamento.js */

var API_PEDIDOS='https://meu3dlabs-backend.onrender.com/api/loja/pedidos';
var TIMEOUT_PEDIDO = 45000;

/* =====================================================================
   SNAPSHOT DO FORMULÁRIO
   O modal de "pedido precisa de ajuste" reescreve o innerHTML e destrói
   os campos. Sem guardar o que o cliente digitou, ele é obrigado a
   preencher tudo de novo e o pedido nunca é reenviado.
   ===================================================================== */
var m3dFormPedido = {};
var m3dAjustesSeguidos = 0;

function m3dSalvarFormulario(endObj){
  function g(id){ var el=document.getElementById(id); return el?String(el.value||'').trim():''; }
  var optin=document.getElementById('cliOptin');
  var confirma=document.getElementById('cliConfirma');
  m3dFormPedido = {
    nome: g('cliNome'),
    fone: g('cliFone'),
    optin: !!(optin && optin.checked),
    confirma: !!(confirma && confirma.checked),
    nota: g('notaPedido'),
    cep: g('cliCep'),
    cidade: g('cliCidade'),
    rua: g('cliRua'),
    numero: g('cliNumero'),
    bairro: g('cliBairro'),
    comp: g('cliComp'),
    endObj: endObj || null
  };
  /* espelha no clienteDados para o salvamento de perfil não regravar vazio */
  if(!String(clienteDados.nome||'').trim() && m3dFormPedido.nome) clienteDados.nome = m3dFormPedido.nome;
  if(!String(clienteDados.fone||'').replace(/\D/g,'') && m3dFormPedido.fone) clienteDados.fone = m3dFormPedido.fone.replace(/\D/g,'');
}

function m3dRestaurarFormulario(){
  var f = m3dFormPedido || {};
  function set(id, v){ var el=document.getElementById(id); if(el && v!=null) el.value = v; }
  set('cliNome', f.nome);
  set('cliFone', f.fone);
  set('notaPedido', f.nota);
  set('cliCep', f.cep);
  set('cliCidade', f.cidade);
  set('cliRua', f.rua);
  set('cliNumero', f.numero);
  set('cliBairro', f.bairro);
  set('cliComp', f.comp);
  var o=document.getElementById('cliOptin');
  if(o) o.checked = !!f.optin;
  var c=document.getElementById('cliConfirma');
  if(c) c.checked = (f.confirma!==false);  /* se já confirmou uma vez, mantém */
}

/* Volta ao resumo com os dados preenchidos e reenvia o pedido sozinho.
   Usado depois de ajustar estoque ou remover um item indisponível. */
function m3dRetomarPedido(){
  document.getElementById('modalTitulo').textContent = 'Finalizar pedido';
  document.getElementById('modalBody').innerHTML = etapaResumo();
  try{ restaurarCupomUI(); }catch(e){}
  try{ ligarSalvamentoPerfil(); }catch(e){}
  m3dRestaurarFormulario();
  abrirModal();
  gerarPedido();
}

/* =====================================================================
   PRONTA ENTREGA x SOB ENCOMENDA
   ===================================================================== */
function m3dDividirQuantidade(id, qtd){
  var total = Math.max(1, parseInt(qtd) || 1);
  var est = (typeof estoqueDoProduto === 'function') ? estoqueDoProduto(id) : null;
  if(est === null){
    return { pronta: total, producao: 0, conhecido: false };
  }
  var disponivel = Math.max(0, est);
  var pronta = Math.min(total, disponivel);
  return { pronta: pronta, producao: total - pronta, conhecido: true };
}

function m3dLinhasProducao(){
  var linhas = [];
  if(typeof carrinho === 'undefined' || !carrinho) return linhas;
  carrinho.forEach(function(i){
    var d = m3dDividirQuantidade(i.id, i.qtd);
    if(d.producao > 0){
      linhas.push(d.producao + 'x ' + i.nome + (i.cor ? ' (' + i.cor + ')' : ''));
    }
  });
  return linhas;
}

/* ===== CSS dos itens na confirmação (miniatura + cor + etiqueta) ===== */
(function(){
  var css=document.createElement('style');
  css.textContent=
  '.rc-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed #e3e8ef;}' +
  '.rc-item:last-child{border-bottom:none;}' +
  '.rc-item-foto{width:46px;height:46px;border-radius:9px;overflow:hidden;background:#f0f3f8;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid #e3e8ef;}' +
  '.rc-item-foto img{width:100%;height:100%;object-fit:cover;display:block;}' +
  '.rc-item-info{flex:1;min-width:0;}' +
  '.rc-item-nome{font-size:13px;color:#0f1e3d;font-weight:600;line-height:1.35;word-break:break-word;}' +
  '.rc-item-cor{display:inline-block;margin-top:4px;background:rgba(15,30,61,.07);color:#0f1e3d;font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:10px;letter-spacing:.2px;}' +
  '.rc-item-valor{flex-shrink:0;text-align:right;font-size:13px;color:#0f1e3d;white-space:nowrap;}' +
  '.rc-item-etq{display:inline-block;margin-top:5px;margin-right:5px;font-size:10px;font-weight:800;padding:3px 8px;border-radius:9px;letter-spacing:.2px;white-space:nowrap;}' +
  '.rc-item-etq.pronta{background:#e6f7ee;color:#1a7f43;}' +
  '.rc-item-etq.producao{background:#fff4d6;color:#8a5a00;}' +
  '@media(max-width:420px){.rc-item-foto{width:40px;height:40px;}.rc-item-nome{font-size:12.5px;}}';
  document.head.appendChild(css);
})();

/* Escape simples para os textos que montamos aqui */
function m3dEscTxt(v){
  return String(v==null?'':v).replace(/[&<>]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];
  });
}
function m3dEscAttr(v){
  return String(v==null?'':v).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}

/* ===== Histórico do cliente ===== */
function salvarMeuPedido(p){
  try{
    var lista=JSON.parse(localStorage.getItem('m3l_pedidos')||'[]');
    if(!Array.isArray(lista))lista=[];
    lista=lista.filter(function(x){return x.numero!==p.numero;});
    lista.push({
      numero:p.numero,
      data:p.data||new Date().toISOString(),
      total:p.total,
      registrado:!!p.registrado,
      forma:p.forma||'pix',
      pendente:!!p.pendente,
      itens:(p.itens||[]).map(function(i){return {nome:i.nome,cor:i.cor||'',qtd:i.qtd,img:i.img||''};})
    });
    if(lista.length>20)lista=lista.slice(-20);
    localStorage.setItem('m3l_pedidos',JSON.stringify(lista));
  }catch(e){}
}

/* Sincroniza também com a chave usada pela tela de acompanhamento */
function sincronizarMeusPedidos(p){
  try{
    if(typeof guardarPedidoLocal==='function'){
      guardarPedidoLocal(p.numero,{total:p.total});
      return;
    }
    var l=JSON.parse(localStorage.getItem('m3l_meus_pedidos')||'[]');
    if(!Array.isArray(l))l=[];
    l=l.filter(function(x){return x&&x.codigo!==p.numero;});
    l.unshift({codigo:p.numero,quando:Date.now(),total:p.total});
    localStorage.setItem('m3l_meus_pedidos',JSON.stringify(l.slice(0,12)));
  }catch(e){}
}

function limparCarrinhoAposPedido(){
  carrinho = [];
  salvarCarrinho();
  cupomAtivo = null;
  atualizarCarrinhoUI();
}

/* ================= PEDIDO ================= */
function arred(v){return Math.round(v*100)/100;}

function gerarPedido(){
  var erroBox=document.getElementById('erroBox');
  var inputNome=document.getElementById('cliNome');
  var inputFone=document.getElementById('cliFone');
  var nome=(inputNome?inputNome.value.trim():'');
  var fone=(inputFone?inputFone.value.replace(/\D/g,''):'');
  var optin=document.getElementById('cliOptin')?document.getElementById('cliOptin').checked:false;
  var nota=document.getElementById('notaPedido')?document.getElementById('notaPedido').value.trim():'';

  if(erroBox){erroBox.classList.remove('show');erroBox.textContent='';}
  if(inputNome)inputNome.classList.remove('erro');
  if(inputFone)inputFone.classList.remove('erro');

  if(nome.length<3){
    if(erroBox){erroBox.textContent='Informe seu nome e sobrenome para gerar o pedido.';erroBox.classList.add('show');}
    if(inputNome)inputNome.classList.add('erro');
    return;
  }
  if(fone.length<10){
    if(erroBox){erroBox.textContent='Informe um celular válido com DDD. Exemplo: (21) 99999-9999.';erroBox.classList.add('show');}
    if(inputFone)inputFone.classList.add('erro');
    return;
  }
  var confirma=document.getElementById('cliConfirma')?document.getElementById('cliConfirma').checked:false;
  if(!confirma){
    if(erroBox){erroBox.textContent='Marque a confirmação de que seus dados estão corretos para gerar o pedido.';erroBox.classList.add('show');}
    return;
  }

  var endereco='';
  var endObj=null;
  if(entregaSel==='correios'){
    var cep=document.getElementById('cliCep')?document.getElementById('cliCep').value.trim():'';
    var cidade=document.getElementById('cliCidade')?document.getElementById('cliCidade').value.trim():'';
    var rua=document.getElementById('cliRua')?document.getElementById('cliRua').value.trim():'';
    var num=document.getElementById('cliNumero')?document.getElementById('cliNumero').value.trim():'';
    var bairro=document.getElementById('cliBairro')?document.getElementById('cliBairro').value.trim():'';
    var comp=document.getElementById('cliComp')?document.getElementById('cliComp').value.trim():'';
    if(!cep||!cidade||!rua||!num||!bairro){
      if(erroBox){erroBox.textContent='Preencha o endereço completo (CEP, rua, número, bairro e cidade) para envio pelos Correios.';erroBox.classList.add('show');}
      return;
    }
    var cidufPartes=cidade.split(' - ');
    var cid=(cidufPartes[0]||'').trim();
    var ufP=(cidufPartes[1]||'').trim();
    endereco=rua+', '+num+' - '+bairro+' - '+cidade+' - CEP '+cep+(comp?' ('+comp+')':'');
    endObj={cep:cep.replace(/\D/g,''),rua:rua,numero:num,comp:comp,bairro:bairro,cidade:cid,uf:ufP};
  }

  /* guarda o formulário ANTES de sair da tela: se o servidor recusar,
     os campos precisam voltar preenchidos para o reenvio automático */
  m3dSalvarFormulario(endObj);

  var btn=document.querySelector('.btn-finalizar');
  if(btn){btn.disabled=true;btn.textContent='Gerando pedido...';}

  var numeroLocal='M3D-'+String(Math.floor(100000+Math.random()*900000));

  var itens=carrinho.map(function(i){
    return {
      slug:i.id,
      nome:i.nome,
      cor:i.cor||'',
      img:i.img||'',
      qtd:i.qtd,
      preco:i.precoNum
    };
  });

  var itensExib=carrinho.map(function(i){
    var d = m3dDividirQuantidade(i.id, i.qtd);
    return {
      nome:i.nome,
      cor:i.cor||'',
      qtd:i.qtd,
      preco:i.precoNum,
      cheio:(i.precoOriginal && i.precoOriginal > i.precoNum) ? i.precoOriginal : i.precoNum,
      img:i.img||'',
      pronta:d.pronta,
      producao:d.producao
    };
  });

  var prodLinhas = m3dLinhasProducao();
  var notaFinal = nota;
  if(prodLinhas.length){
    var extraTxt = 'Sob encomenda: ' + prodLinhas.join('; ');
    notaFinal = nota ? (nota + ' | ' + extraTxt) : extraTxt;
  }

  var payload={
    nome_cliente:nome,
    whatsapp:fone,
    email:(m3lClienteLogado()?m3lClienteLogado().email:null),
    itens:itens,
    subtotal:arred(totalCarrinho()),
    cupom:cupomAtivo?cupomAtivo.codigo:null,
    desconto:cupomAtivo?arred(cupomAtivo.desc):0,
    desconto_pix:descontoPix(),
    total:arred(totalFinal()),
    entrega:entregaSel,
    endereco:endereco||null,
    pagamento:pagamentoSel,
    forma:pagamentoSel,
    horario:entregaSel==='retirada'?horarioSel:null,
    nota:notaFinal||null,
    optin:optin,
    numero_local:numeroLocal
  };

  function montarPedido(numero,registrado,totais){
    var ul=m3lClienteLogado();
    var t=totais||{};
    return {
      numero:numero,itens:itensExib,
      total:(t.total!=null?t.total:totalFinal()),
      subtotal:(t.subtotal!=null?t.subtotal:totalCarrinho()),
      cheio:totalCheio(),
      descPromo:descontoPromo(),
      descPix:(t.desconto_pix!=null?t.desconto_pix:descontoPix()),
      cupom:cupomAtivo,
      entrega:entregaSel,endereco:endereco||'',
      pagamento:pagamentoSel,forma:pagamentoSel,
      horario:entregaSel==='retirada'?horarioSel:null,
      nota:notaFinal,nome:nome,fone:fone,
      email:(ul?ul.email:''),
      optin:optin,registrado:registrado
    };
  }

  function salvarPerfilDoPedido(){
    if(window.m3lSalvarPerfil && m3lClienteLogado()){
      var pd={whatsapp:fone};
      if(endObj){pd.cep=endObj.cep;pd.rua=endObj.rua;pd.numero=endObj.numero;pd.complemento=endObj.comp||'';pd.bairro=endObj.bairro;pd.cidade=endObj.cidade;if(endObj.uf)pd.uf=endObj.uf;}
      try{window.m3lSalvarPerfil(pd);}catch(e){}
    }
  }

  /* ===== SUCESSO: pedido existe no banco ===== */
  function mostrarPronto(totaisConf){
    if(btn){btn.disabled=false;btn.textContent='Finalizar pedido';}
    m3dAjustesSeguidos = 0;
    if(totaisConf){
      if(totaisConf.total!=null)pedidoAtual.total=totaisConf.total;
      if(totaisConf.subtotal!=null)pedidoAtual.subtotal=totaisConf.subtotal;
      if(totaisConf.desconto_pix!=null)pedidoAtual.descPix=totaisConf.desconto_pix;
    }
    var ehCartao=(pedidoAtual.forma==='cartao');
    if(!ehCartao){salvarMeuPedido(pedidoAtual);}
    if(ehCartao){
      try{if(cupomAtivo)localStorage.setItem('m3l_cupom_pendente',cupomAtivo.codigo);}catch(e){}
      salvarMeuPedido({numero:pedidoAtual.numero,total:pedidoAtual.total,registrado:true,forma:'cartao',pendente:true,itens:pedidoAtual.itens});
      salvarPerfilDoPedido();
      document.getElementById('modalTitulo').textContent='Pedido gerado';
      document.getElementById('modalBody').innerHTML=etapaPedido(pedidoAtual);
      iniciarPagamentoCartao(pedidoAtual);
      return;
    }
    /* PIX */
    if(cupomAtivo){marcarCupomUsado(cupomAtivo.codigo);}
    sincronizarMeusPedidos(pedidoAtual);
    salvarPerfilDoPedido();
    limparCarrinhoAposPedido();
    if(window.gtag){
      gtag('event','purchase',{
        currency:'BRL',value:pedidoAtual.total,
        transaction_id:pedidoAtual.numero,
        items:(pedidoAtual.itens||[]).map(function(i){return {item_name:i.nome,item_variant:i.cor||'',price:i.preco,quantity:i.qtd};})
      });
    }
    var textoPix = (typeof montarPix === 'function')
      ? montarPix(pedidoAtual.total, pedidoAtual.numero)
      : null;
    document.getElementById('modalTitulo').textContent='Pague com Pix';
    document.getElementById('modalBody').innerHTML=blocoPixPedido(
      pedidoAtual.numero,
      pedidoAtual.total,
      textoPix
    );
    try{ desenharQrPix(textoPix); }catch(e){}
  }

  /* ===== FALHA DE REDE / TIMEOUT: não cobra, preserva carrinho ===== */
  function mostrarFalhaRegistro(motivo){
    if(btn){btn.disabled=false;btn.textContent='Finalizar pedido';}
    pedidoAtual=null;
    var timeout=(motivo==='timeout');
    var titulo=timeout?'O servidor demorou para responder':'Não conseguimos gerar seu pedido';
    var explicacao=timeout
      ?'A conexão está lenta neste momento. Seu carrinho continua salvo — é só tentar de novo em alguns segundos.'
      :'Tivemos um problema momentâneo. Seu carrinho continua salvo — nada foi cobrado.';
    document.getElementById('modalTitulo').textContent=titulo;
    document.getElementById('modalBody').innerHTML=
      '<div class="pedido-ok">'+
        '<div class="ok-icon" style="background:#fde8e5;color:#c0392b;">⚠️</div>'+
        '<h3 style="color:#c0392b;">'+titulo+'</h3>'+
        '<p style="color:#4a5161;line-height:1.6;">'+explicacao+'</p>'+
        '<div class="entrega-aviso" style="margin:0 0 16px;text-align:left;">'+
          '🔒 <strong>Nenhum pagamento foi gerado.</strong> Você não será cobrado por este erro.'+
        '</div>'+
        '<button class="btn-wa" onclick="m3dRetomarPedido()" style="background:#0f7a44;">🔄 Tentar novamente</button>'+
        '<button class="btn-voltar" onclick="fecharModal()">Fechar</button>'+
      '</div>';
    abrirModal();
  }

  /* =====================================================================
     BLOQUEIO DO SERVIDOR
     Só aparece quando o servidor RECUSA o pedido. O botão principal
     ajusta o carrinho E finaliza de novo, sem perder os dados digitados.
     ===================================================================== */
  function mostrarMudancaCritica(dados){
    if(btn){btn.disabled=false;btn.textContent='Finalizar pedido';}
    m3dAjustesSeguidos++;

    var lista = dados.alteracoes || dados.itens_alterados || [];
    var itensEstoque = [];
    var itensPreco   = [];
    lista.forEach(function(a){
      var ehEstoque = (a.motivo==='estoque' || a.disponivel===false || a.estoque===0);
      if(ehEstoque) itensEstoque.push(a); else itensPreco.push(a);
    });

    /* Itens do carrinho cuja quantidade passa do estoque atual (por slug somado) */
    var ajustaveis = [];
    var grupos = {};
    carrinho.forEach(function(it){
      var k=String(it.id||'');
      if(!grupos[k]) grupos[k]=[];
      grupos[k].push(it);
    });
    Object.keys(grupos).forEach(function(k){
      var itensDoSlug = grupos[k];
      var est = estoqueDoProduto(k);
      if(est===null) return;
      if(est<=0) return;
      var pediu = itensDoSlug.reduce(function(s,it){ return s + (parseInt(it.qtd,10)||0); },0);
      if(pediu > est){
        ajustaveis.push({
          nome: itensDoSlug[0].nome,
          cor: itensDoSlug[0].cor||'',
          pediu: pediu,
          tem: est
        });
      }
    });

    var html = '<div class="pedido-ok">'
      + '<div class="ok-icon" style="background:#fff4e0;color:#b3541e;">🔔</div>'
      + '<h3 style="color:#b3541e;">Não conseguimos registrar o pedido</h3>'
      + '<p style="color:#4a5161;line-height:1.6;">O estoque ou o preço mudou enquanto você finalizava. <strong>Nada foi cobrado.</strong></p>'
      + '<div style="text-align:left;margin:14px 0;">';

    if(ajustaveis.length){
      ajustaveis.forEach(function(a){
        html += '<div class="entrega-aviso" style="margin:0 0 8px;">'
          + '📦 <strong>' + m3dEscTxt(a.nome) + (a.cor ? ' (' + m3dEscTxt(a.cor) + ')' : '') + '</strong><br>'
          + 'Você pediu <strong>' + a.pediu + '</strong> · temos <strong>' + a.tem + '</strong> disponível'
          + (a.tem > 1 ? 'is' : '')
          + ' agora'
          + '</div>';
      });
    }else if(itensEstoque.length){
      itensEstoque.forEach(function(a){
        var nome = a.nome || a.slug || 'Item';
        html += '<div class="entrega-aviso" style="margin:0 0 8px;">❌ <strong>' + m3dEscTxt(nome) + '</strong> está sem estoque agora.</div>';
      });
    }

    if(itensPreco.length){
      itensPreco.forEach(function(a){
        var nome = a.nome || a.slug || 'Item';
        html += '<div class="entrega-aviso" style="margin:0 0 8px;">💲 <strong>' + m3dEscTxt(nome) + '</strong>: '
          + (a.preco_anterior!=null ? 'de ' + fmt(a.preco_anterior) + ' ' : '')
          + 'agora ' + fmt(a.preco_novo!=null ? a.preco_novo : a.preco) + '.</div>';
      });
    }

    if(!ajustaveis.length && !itensEstoque.length && !itensPreco.length){
      html += '<div class="entrega-aviso" style="margin:0 0 8px;">Os valores do carrinho precisam ser recalculados.</div>';
    }

    html += '</div>';

    if(ajustaveis.length){
      html += '<button class="btn-wa" onclick="ajustarCarrinhoAoEstoque()" style="background:#0f7a44;">✅ Ajustar ao disponível e finalizar</button>';
    } else if(itensEstoque.length){
      html += '<button class="btn-wa" onclick="m3dRemoverIndisponiveis()" style="background:#0f7a44;">✅ Remover itens sem estoque e finalizar</button>';
    }

    html += '<button class="btn-voltar" onclick="fecharModal();location.reload();" style="'
      + ((ajustaveis.length || itensEstoque.length) ? 'margin-top:8px;' : 'background:#0f7a44;color:#fff;border-color:#0f7a44;')
      + '">🔄 Revisar carrinho</button>';
    html += '<button class="btn-voltar" onclick="fecharModal()" style="margin-top:8px;">Fechar</button>';
    html += '</div>';

    document.getElementById('modalTitulo').textContent='Pedido precisa de ajuste';
    document.getElementById('modalBody').innerHTML = html;
    abrirModal();
  }

  /* ---------- POST com timeout ---------- */
  var controller=(typeof AbortController!=='undefined')?new AbortController():null;
  var timerTimeout=null;
  if(controller){
    timerTimeout=setTimeout(function(){try{controller.abort();}catch(e){}},TIMEOUT_PEDIDO);
  }

  var opcoesFetch={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)};
  if(controller)opcoesFetch.signal=controller.signal;

  fetch(API_PEDIDOS,opcoesFetch)
    .then(function(r){
      if(timerTimeout)clearTimeout(timerTimeout);
      return r.json().then(function(d){return {ok:r.ok,status:r.status,dados:d};})
                     .catch(function(){return {ok:r.ok,status:r.status,dados:{}};});
    })
    .then(function(res){
      var d=res.dados||{};
      /* 409 = servidor recusou (estoque ou preço) */
      if(res.status===409 || d.erro==='preco_alterado' || d.erro==='estoque'){
        mostrarMudancaCritica(d);
        return;
      }
      if(!res.ok){
        console.error('Falha ao registrar pedido:',res.status,d);
        mostrarFalhaRegistro('erro_api');
        return;
      }
      var idRemoto=d.pedido_id||d.numero||d.id;
      if(!idRemoto){
        console.error('Backend respondeu OK mas sem pedido_id:',d);
        mostrarFalhaRegistro('erro_api');
        return;
      }
      pedidoAtual=montarPedido(String(idRemoto),true,d.totais||{total:d.total,subtotal:d.subtotal,desconto_pix:d.desconto_pix});
      mostrarPronto(d.totais||{total:d.total,subtotal:d.subtotal,desconto_pix:d.desconto_pix});
    })
    .catch(function(err){
      if(timerTimeout)clearTimeout(timerTimeout);
      var ehTimeout=err&&(err.name==='AbortError'||String(err).indexOf('abort')!==-1);
      console.error('Erro de rede ao gerar pedido:',err);
      mostrarFalhaRegistro(ehTimeout?'timeout':'rede');
    });
}

/* =====================================================================
   AJUSTE AO ESTOQUE
   Reduz cada slug ao que existe de verdade (somando as variações),
   remove o que zerou e FINALIZA o pedido de novo automaticamente,
   com o formulário restaurado.
   ===================================================================== */
function ajustarCarrinhoAoEstoque(){
  /* trava anti-loop: se o servidor recusar 3x seguidas, não reenvia mais */
  if(m3dAjustesSeguidos >= 3){
    fecharModal();
    if(typeof mostrarToast === 'function'){
      mostrarToast('Não conseguimos fechar o pedido agora. Revise o carrinho e tente novamente.', 'erro');
    }
    if(typeof abrirCarrinho === 'function') abrirCarrinho();
    return;
  }

  var mudou = false;
  var removidos = [];

  /* agrupa por slug: duas linhas do mesmo produto somam para o limite */
  var grupos = {};
  carrinho.forEach(function(it){
    var k=String(it.id||'');
    if(!grupos[k]) grupos[k]=[];
    grupos[k].push(it);
  });

  Object.keys(grupos).forEach(function(k){
    var itensDoSlug = grupos[k];
    var est = estoqueDoProduto(k);
    if(est === null) return;

    if(est <= 0){
      itensDoSlug.forEach(function(it){ removidos.push(it.nome); it.qtd = 0; });
      mudou = true;
      return;
    }

    var total = itensDoSlug.reduce(function(s,it){ return s + (parseInt(it.qtd,10)||0); },0);
    if(total <= est) return;

    /* corta o excedente começando pela última linha do grupo */
    var excedente = total - est;
    for(var i=itensDoSlug.length-1; i>=0 && excedente>0; i--){
      var tirar = Math.min(excedente, itensDoSlug[i].qtd);
      itensDoSlug[i].qtd -= tirar;
      excedente -= tirar;
      mudou = true;
    }
  });

  carrinho = carrinho.filter(function(it){ return it.qtd > 0; });
  if(mudou){ try{ salvarCarrinho(); }catch(e){} }
  try{ atualizarCarrinhoUI(); }catch(e){}

  if(removidos.length && typeof mostrarToast === 'function'){
    mostrarToast('Itens sem estoque removidos: ' + removidos.join(', ') + '.');
  }

  if(!carrinho.length){
    fecharModal();
    if(typeof abrirCarrinho === 'function') abrirCarrinho();
    return;
  }

  /* AQUI está a correção: reenvia o pedido já ajustado, com o
     formulário restaurado. Antes só fechava o modal. */
  m3dRetomarPedido();
}

/* Remove do carrinho apenas os itens que ficaram sem estoque e finaliza */
function m3dRemoverIndisponiveis(){
  if(m3dAjustesSeguidos >= 3){
    fecharModal();
    if(typeof abrirCarrinho === 'function') abrirCarrinho();
    return;
  }
  var nomes = [];
  carrinho = carrinho.filter(function(it){
    var est = estoqueDoProduto(it.id);
    if(est !== null && est <= 0){
      nomes.push(it.nome);
      return false;
    }
    return true;
  });
  try{ salvarCarrinho(); }catch(e){}
  try{ atualizarCarrinhoUI(); }catch(e){}

  if(nomes.length && typeof mostrarToast === 'function'){
    mostrarToast('Removemos do carrinho: ' + nomes.join(', ') + '.', 'ok');
  }

  if(!carrinho.length){
    fecharModal();
    if(typeof abrirCarrinho === 'function') abrirCarrinho();
    return;
  }

  m3dRetomarPedido();
}

/* ================= TEXTOS AUXILIARES ================= */
function entregaTexto(e){
  if(e==='retirada')return 'Retirada em Nilópolis/RJ';
  if(e==='uber')return 'Uber Flash (por conta do cliente)';
  return 'Correios (fora do RJ, aguardando frete)';
}

function pagamentoTexto(f){
  return f==='cartao'?'Cartão de crédito (Mercado Pago)':'PIX';
}

/* ================= TELA DO PEDIDO GERADO ================= */
function etapaPedido(p){
  var html='<div class="pedido-ok">'
    +'<div class="ok-icon">✅</div>'
    +'<h3>Pedido gerado com sucesso!</h3>'
    +'<p>Guarde o número abaixo para acompanhar seu pedido.</p>'
    +'<div class="pedido-numero"><span>#</span>'+p.numero+'<button class="btn-copiar-codigo" onclick="copiarCodigoPedido(\''+p.numero+'\')">📋 Copiar código</button></div>'
    +'<div class="resumo-clean">'
    +'<div class="rc-secao">'
    +'<div class="rc-titulo">Seus dados</div>'
    +'<div class="rc-linha"><span>Cliente</span><strong>'+p.nome+'</strong></div>'
    +'<div class="rc-linha"><span>WhatsApp</span><strong>'+p.fone+'</strong></div>'
    +(p.email?'<div class="rc-linha"><span>E-mail</span><strong>'+p.email+'</strong></div>':'')
    +'</div>'
    +'<div class="rc-secao">'
    +'<div class="rc-titulo">Itens</div>';

  p.itens.forEach(function(i){
    var promoi=i.cheio&&i.cheio>i.preco;
    var val='<strong>'+(promoi
      ?'<span style="text-decoration:line-through;color:#8a94a8;font-weight:600;font-size:12px;margin-right:6px;">'+fmt(i.cheio*i.qtd)+'</span><span style="color:#c0392b;">'+fmt(i.preco*i.qtd)+'</span>'
      :fmt(i.preco*i.qtd))+'</strong>';

    var foto = i.img
      ? '<div class="rc-item-foto"><img src="'+m3dEscAttr(i.img)+'" alt=""></div>'
      : '<div class="rc-item-foto">📦</div>';

    var etq = '';
    var pronta = (typeof i.pronta === 'number') ? i.pronta : 0;
    var producao = (typeof i.producao === 'number') ? i.producao : 0;
    if(producao > 0 && pronta > 0){
      etq = '<div><span class="rc-item-etq pronta">✅ ' + pronta + ' pronta' + (pronta>1?'s':'') + ' entrega</span>'
          + '<span class="rc-item-etq producao">🖨️ ' + producao + ' sob encomenda</span></div>';
    }else if(producao > 0){
      etq = '<div><span class="rc-item-etq producao">🖨️ ' + producao + ' sob encomenda</span></div>';
    }else if(i.qtd > 0){
      etq = '<div><span class="rc-item-etq pronta">✅ ' + i.qtd + ' pronta' + (i.qtd>1?'s':'') + ' entrega</span></div>';
    }

    html+='<div class="rc-item">'
      + foto
      + '<div class="rc-item-info">'
      +   '<div class="rc-item-nome">'+i.qtd+'x '+m3dEscTxt(i.nome)+'</div>'
      +   (i.cor?'<div class="rc-item-cor">🎨 '+m3dEscTxt(i.cor)+'</div>':'')
      +   etq
      + '</div>'
      + '<div class="rc-item-valor">'+val+'</div>'
      + '</div>';
  });

  html+='</div>'
    +'<div class="rc-secao">'
    +'<div class="rc-linha"><span>Subtotal</span><strong>'+fmt(p.cheio)+'</strong></div>';

  if(p.descPromo>0){
    html+='<div class="rc-linha"><span>Desconto de promoção</span><strong style="color:#0f7a44;">-'+fmt(p.descPromo)+'</strong></div>';
  }
  if(p.cupom){
    html+='<div class="rc-linha"><span>Cupom '+p.cupom.codigo+'</span><strong class="rc-desconto">-'+fmt(p.cupom.desc)+'</strong></div>';
  }
  if(p.descPix>0){
    html+='<div class="rc-linha"><span>Desconto PIX (5%)</span><strong style="color:#0f7a44;">-'+fmt(p.descPix)+'</strong></div>';
  }
  html+='<div class="rc-linha rc-total"><span>Total</span><strong>'+fmt(p.total)+'</strong></div>'
    +'</div>'
    +'<div class="rc-secao">'
    +'<div class="rc-linha"><span>Entrega</span><strong>'+entregaTexto(p.entrega)+'</strong></div>';

  if(p.entrega!=='correios'&&p.horario){
    html+='<div class="rc-linha"><span>Horário preferido</span><strong>'+(p.horario==='noturno'?'Noturno (19h às 22h) + R$ 10,00':(p.horario==='tarde'?'Tarde (14h às 17h)':'Manhã (09h às 12h)'))+'</strong></div>';
  }
  html+='<div class="rc-linha"><span>Pagamento</span><strong>'+pagamentoTexto(p.forma)+'</strong></div>';
  if(p.endereco){
    html+='<div class="rc-linha"><span>Endereço</span><strong>'+String(p.endereco).replace(/</g,'&lt;')+'</strong></div>';
  }
  if(p.nota){
    html+='<div class="rc-linha"><span>Observação</span><strong>'+p.nota+'</strong></div>';
  }
  if(p.optin){
    html+='<div class="rc-linha"><span>Novidades</span><strong>Aceitou receber ofertas</strong></div>';
  }
  html+='</div></div>';
  html+='<button class="btn-voltar" onclick="fecharModal()">Fechar</button>'
    +'</div>';
  return html;
}

/* ================= MENSAGEM EM TEXTO (uso interno) ================= */
function enviarWhats(){
  if(!pedidoAtual)return;
  var p=pedidoAtual;
  var linhas=['Olá! Quero falar sobre o pedido #'+p.numero+' na loja da Meu 3D Labs.',''];
  linhas.push('👤 Cliente: '+p.nome);
  linhas.push('📱 WhatsApp: '+p.fone);
  if(p.email){linhas.push('📧 E-mail: '+p.email);}
  linhas.push('');
  linhas.push('Itens:');
  p.itens.forEach(function(i){
    var etq='';
    if(i.producao>0&&i.pronta>0)etq=' [1 pronta entrega + '+i.producao+' sob encomenda]';
    else if(i.producao>0)etq=' ['+i.producao+' sob encomenda]';
    linhas.push('- '+i.qtd+'x '+i.nome+(i.cor?' ('+i.cor+')':'')+' — '+fmt(i.preco*i.qtd)+(i.cheio>i.preco?' (promoção, de '+fmt(i.cheio*i.qtd)+')':'')+etq);
  });
  linhas.push('');
  linhas.push('Subtotal: '+fmt(p.cheio));
  if(p.descPromo>0){linhas.push('Desconto de promoção: -'+fmt(p.descPromo));}
  if(p.cupom){linhas.push('Cupom '+p.cupom.codigo+': -'+fmt(p.cupom.desc));}
  if(p.descPix>0){linhas.push('Desconto PIX (5%): -'+fmt(p.descPix));}
  linhas.push('Total: '+fmt(p.total));
  linhas.push('Entrega: '+entregaTexto(p.entrega));
  if(p.entrega==='retirada'&&p.horario){linhas.push('Horário de retirada: '+(p.horario==='noturno'?'Noturno (19h-22h) + R$ 10,00':(p.horario==='tarde'?'Tarde (14h-17h)':'Manhã (09h-12h)')));}
  if(p.endereco){linhas.push('Endereço: '+p.endereco);}
  linhas.push('Pagamento: '+pagamentoTexto(p.forma));
  if(p.forma==='cartao'){
    linhas.push('O pagamento será concluído no checkout do Mercado Pago');
  }
  if(p.nota){linhas.push('Observação: '+p.nota);}
  if(p.optin){linhas.push('Cliente aceitou receber novidades pelo WhatsApp');}
  linhas.push('');
  linhas.push('Número do pedido: #'+p.numero);
  var msg=linhas.join('\n');
  window.open('https://wa.me/5521966594803?text='+encodeURIComponent(msg),'_blank');
}