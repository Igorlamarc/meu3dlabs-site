/* ============================================================
   MEU 3D LABS — admin-imagens.js (núcleo)
   As ferramentas ficam em admin-ferramentas.js
   ============================================================ */

var API     = 'https://meu3dlabs-backend.onrender.com/api';
var API_IMG = API + '/site-imagens';
var API_UP  = API + '/loja/produtos/upload';

var token = '';
var chave = '';
var catalogo = [];
var itens = {};
var docs = {};
var paginaAtual = 'index';
var ferramentasMontadas = false;

var lista = {};
var alterado = {};
var salvando = false;

var FORMATOS = {
  '4/5':  { txt: 'vertical',   w: 13, h: 17 },
  '1/1':  { txt: 'quadrada',   w: 16, h: 16 },
  '16/9': { txt: 'panorâmica', w: 21, h: 12 },
  '3/4':  { txt: 'retrato',    w: 14, h: 19 }
};

var NOMES_PAGINA = {
  index: 'Início', loja: 'Loja', consultoria: 'Consultoria',
  assistencia: 'Assistência', ferramentas: 'Ferramentas'
};

/* ---------- HELPERS ---------- */
function esc(s){
  var d = document.createElement('div');
  d.textContent = (s == null ? '' : String(s));
  return d.innerHTML;
}

function toast(msg, tipo){
  var t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (tipo ? ' ' + tipo : '');
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.className = 'toast'; }, 3600);
}

function kb(b){
  if(!b) return '—';
  if(b < 1024) return b + ' B';
  if(b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function slugificar(txt){
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function botao(txt, cls, fn){
  var b = document.createElement('button');
  b.type = 'button';
  b.className = cls === '' ? '' : ('btn ' + (cls || 'btn-mini'));
  b.textContent = txt;
  b.onclick = fn;
  return b;
}

function formaTag(proporcao){
  var f = FORMATOS[proporcao];
  if(!f) return '';
  return '<span class="forma-tag"><i style="width:' + f.w + 'px;height:' + f.h + 'px"></i>' + f.txt + '</span>';
}

/* ---------- LOGIN ---------- */
function erroLogin(msg){
  var err = document.getElementById('loginErr');
  if(!err) return;
  err.textContent = msg;
  err.style.display = 'block';
}

function liberarBotao(){
  var btn = document.getElementById('btnLogin');
  if(!btn) return;
  btn.disabled = false;
  btn.textContent = 'Entrar';
}

function entrar(){
  var elSenha = document.getElementById('senha');
  var elChave = document.getElementById('chaveEdicao');
  var btn = document.getElementById('btnLogin');

  if(!elSenha || !elChave || !btn){
    console.error('[admin-imagens] campos de login não encontrados');
    return;
  }

  var senha = elSenha.value.trim();
  var ch = elChave.value.trim();

  if(!senha || !ch){
    erroLogin('Preencha a senha e a chave de edição.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Entrando…';

  var err = document.getElementById('loginErr');
  if(err) err.style.display = 'none';

  fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha: senha })
  })
  .then(function(r){
    return r.text().then(function(txt){
      var obj = {};
      try{ obj = JSON.parse(txt); }catch(e){ obj = {}; }
      return { ok: r.ok, status: r.status, body: obj };
    });
  })
  .then(function(res){
    if(!res.ok || !res.body.token){
      erroLogin(res.status === 401 ? 'Senha incorreta.' : 'Servidor respondeu ' + res.status + '.');
      liberarBotao();
      return;
    }

    token = res.body.token;
    chave = ch;

    try{
      sessionStorage.setItem('m3d_token', token);
      sessionStorage.setItem('m3d_img_chave', chave);
    }catch(e){}

    abrirApp();
  })
  .catch(function(e){
    console.error('[admin-imagens] login:', e);
    erroLogin('Não foi possível alcançar o servidor. Se ele estava dormindo, aguarde 30 segundos e tente de novo.');
    liberarBotao();
  });
}

function sair(){
  if(Object.keys(alterado).some(function(k){ return alterado[k]; })){
    if(!confirm('Há alterações não salvas. Sair agora e descartá-las?')) return;
  }
  try{
    sessionStorage.removeItem('m3d_img_chave');
    sessionStorage.removeItem('m3d_token');
  }catch(e){}
  location.reload();
}

function abrirApp(){
  var login = document.getElementById('telaLogin');
  var app = document.getElementById('app');
  if(login) login.hidden = true;
  if(app) app.hidden = false;
  window.scrollTo(0, 0);
  carregar();
}

/* ---------- LEITURA DOS ARQUIVOS DA PÁGINA ---------- */
function lerArquivo(nome){
  if(docs[nome] !== undefined) return Promise.resolve(docs[nome]);

  return fetch(nome, { cache: 'no-store' })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function(txt){
      docs[nome] = /\.css$/i.test(nome) ? txt : new DOMParser().parseFromString(txt, 'text/html');
      return docs[nome];
    })
    .catch(function(){
      docs[nome] = null;
      return null;
    });
}

function cssBg(css, seletor){
  if(!css) return '';
  var i = css.indexOf(seletor);
  if(i === -1) return '';
  var fim = css.indexOf('}', i);
  var bloco = css.slice(i, fim === -1 ? i + 500 : fim);
  var m = bloco.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  return m ? m[1] : '';
}

function urlsDeImgs(raiz){
  var out = [];
  if(!raiz) return out;
  var nos = raiz.querySelectorAll('img');
  Array.prototype.forEach.call(nos, function(el){
    var u = el.getAttribute('src') || '';
    if(u && out.indexOf(u) === -1) out.push(u);
  });
  return out;
}

/* ---------- PORTFÓLIO DINÂMICO ---------- */
function descobrirPortfolio(){
  return lerArquivo('index.html').then(function(doc){
    if(!doc) return [];

    var blocos = doc.querySelectorAll('.cat-block');
    var out = [];

    Array.prototype.forEach.call(blocos, function(b, i){
      var h = b.querySelector('.cat-header h3') || b.querySelector('.cat-header h2') || b.querySelector('h3');
      var titulo = h ? h.textContent.trim() : ('Bloco ' + (i + 1));
      var track = b.querySelector('.carousel-track');

      out.push({
        slot: 'index/portfolio/' + (slugificar(titulo) || ('bloco-' + (i + 1))),
        pagina: 'index',
        grupo: 'Carrosséis do portfólio',
        rotulo: titulo,
        tipo: 'lista',
        proporcao: '1/1',
        padroes: urlsDeImgs(track || b)
      });
    });

    return out;
  });
}

function extrairPadrao(s){
  if(s.padroes) return Promise.resolve(s.padroes);
  if(s.padrao) return Promise.resolve(s.padrao);

  var cfg = s.html;
  if(!cfg) return Promise.resolve(s.tipo === 'lista' ? [] : '');

  return lerArquivo(cfg.arq).then(function(doc){
    if(!doc) return s.tipo === 'lista' ? [] : '';

    if(cfg.attr === 'css-bg') return cssBg(doc, cfg.sel) || '';

    if(cfg.attr === 'lista'){
      var nos = doc.querySelectorAll(cfg.sel);
      var urls = [];
      Array.prototype.forEach.call(nos, function(el){
        var u = el.getAttribute('src') || '';
        if(u && urls.indexOf(u) === -1) urls.push(u);
      });
      return urls;
    }

    var l = doc.querySelectorAll(cfg.sel);
    var el2 = l[cfg.idx || 0];
    return el2 ? (el2.getAttribute('src') || '') : '';
  });
}

/* ---------- CARREGAR ---------- */
function carregar(){
  var box = document.getElementById('carregando');

  fetch(API_IMG + '/admin', {
    cache: 'no-store',
    headers: { 'x-story-key': chave }
  })
  .then(function(r){
    if(r.status === 401) throw new Error('chave');
    if(!r.ok) throw new Error('http');
    return r.json();
  })
  .then(function(d){
    var base = d.catalogo || [];
    itens = d.itens || {};

    return descobrirPortfolio().then(function(port){
      var semFixo = base.filter(function(s){
        return s.grupo !== 'Carrosséis do portfólio' && s.slot.indexOf('index/portfolio/') !== 0;
      });

      var pos = 0;
      for(var i = 0; i < semFixo.length; i++){
        if(semFixo[i].slot === 'index/stories'){ pos = i; break; }
        pos = i + 1;
      }

      catalogo = semFixo.slice(0, pos).concat(port).concat(semFixo.slice(pos));

      var prep = catalogo.map(function(s){ return prepararSlot(s); });

      return Promise.all(prep).then(function(){
        if(box) box.hidden = true;
        montarAbas();
        renderizar();
      });
    });
  })
  .catch(function(e){
    console.error('[admin-imagens] carregar:', e);
    if(!box) return;

    if(e.message === 'chave'){
      box.innerHTML = 'Chave de edição inválida.<br>' +
        '<button class="btn btn-mini" id="btnRefazerLogin" style="margin-top:12px">Entrar novamente</button>' +
        '<button class="btn btn-mini danger" id="btnLimpar" style="margin-top:12px">Limpar acesso salvo</button>';

      var b1 = document.getElementById('btnRefazerLogin');
      var b2 = document.getElementById('btnLimpar');
      if(b1) b1.onclick = sair;
      if(b2) b2.onclick = function(){
        try{ sessionStorage.clear(); }catch(err){}
        location.reload();
      };
    }else{
      box.innerHTML = 'Não foi possível carregar as imagens. Verifique a conexão e recarregue.';
    }
  });
}

function prepararSlot(s){
  var doBanco = itens[s.slot] || [];

  if(doBanco.length){
    lista[s.slot] = doBanco.map(function(i){ return { url: i.url }; });
    alterado[s.slot] = false;
    return Promise.resolve();
  }

  return extrairPadrao(s).then(function(padrao){
    var urls = s.tipo === 'lista' ? (padrao || []) : (padrao ? [padrao] : []);
    lista[s.slot] = urls.map(function(u){ return { url: u }; });
    alterado[s.slot] = false;
  });
}

/* ---------- ABAS ---------- */
function montarAbas(){
  var paginas = [];
  catalogo.forEach(function(s){
    if(paginas.indexOf(s.pagina) === -1) paginas.push(s.pagina);
  });
  paginas.push('ferramentas');

  var box = document.getElementById('abas');
  if(!box) return;
  box.innerHTML = '';

  paginas.forEach(function(p){
    var b = document.createElement('button');
    b.className = 'aba' + (p === paginaAtual ? ' on' : '');
    b.textContent = NOMES_PAGINA[p] || p;
    b.onclick = function(){
      if(Object.keys(alterado).some(function(k){ return alterado[k]; })){
        if(!confirm('Há alterações não salvas nesta aba. Trocar e perder?')) return;
      }
      paginaAtual = p;
      montarAbas();
      renderizar();
    };
    box.appendChild(b);
  });
}

/* ---------- RENDER ---------- */
function renderizar(){
  var boxG = document.getElementById('grupos');
  var boxF = document.getElementById('ferramentas');
  if(!boxG || !boxF) return;

  if(paginaAtual === 'ferramentas'){
    boxG.hidden = true;
    boxF.hidden = false;
    atualizarBarraGlobal();

    if(typeof montarFerramentas === 'function'){
      montarFerramentas();
    }else{
      boxF.innerHTML = '<p class="sub">Arquivo admin-ferramentas.js não carregado.</p>';
    }
    return;
  }

  boxG.hidden = false;
  boxF.hidden = true;
  boxG.innerHTML = '';

  var daPagina = catalogo.filter(function(s){ return s.pagina === paginaAtual; });
  var grupos = [];
  daPagina.forEach(function(s){
    if(grupos.indexOf(s.grupo) === -1) grupos.push(s.grupo);
  });

  grupos.forEach(function(g){
    var sec = document.createElement('section');
    sec.className = 'grupo';

    var h = document.createElement('h2');
    h.className = 'grupo-titulo';
    h.textContent = g;
    sec.appendChild(h);

    daPagina.filter(function(s){ return s.grupo === g; })
      .forEach(function(s){ sec.appendChild(cardSlot(s)); });

    boxG.appendChild(sec);
  });

  atualizarBarraGlobal();
}

function cardSlot(s){
  var arr = lista[s.slot] || [];
  var pend = !!alterado[s.slot];
  var preenchidas = arr.filter(function(i){ return i.url; }).length;

  var el = document.createElement('div');
  el.className = 'slot' + (pend ? ' pendente' : '');

  var head = document.createElement('div');
  head.className = 'slot-head';

  var statusTxt, statusCls;

  if(pend){
    statusTxt = 'alterações não salvas';
    statusCls = 'pend';
  }else{
    statusTxt = preenchidas > 1
      ? preenchidas + ' imagens'
      : (preenchidas === 1 ? '1 imagem' : 'sem imagem');
    statusCls = (itens[s.slot] && itens[s.slot].length) ? 'custom' : 'padrao';
  }

  head.innerHTML =
    '<div><span class="slot-nome">' + esc(s.rotulo) + '</span>' +
      '<span class="slot-tag">' + (s.tipo === 'lista' ? 'carrossel' : s.tipo === 'bg' ? 'fundo' : 'imagem') + '</span>' +
      formaTag(s.proporcao) +
    '</div>' +
    '<span class="status ' + statusCls + '">' + statusTxt + '</span>';
  el.appendChild(head);

  var faixa = document.createElement('div');
  faixa.className = 'faixa';

  arr.forEach(function(item, i){
    faixa.appendChild(blocoItem(s, item, i, arr.length));
  });

  faixa.appendChild(blocoAdd(s));
  el.appendChild(faixa);

  var barra = document.createElement('div');
  barra.className = 'salvar-barra';

  if(pend){
    barra.appendChild(botao('Salvar alterações', 'btn-mini ok', function(){ salvarSlot(s); }));
    barra.appendChild(botao('Descartar', 'btn-mini danger', function(){ descartarSlot(s); }));
  }else{
    var ok = document.createElement('span');
    ok.className = 'sync-ok';
    ok.textContent = 'Sincronizado com o site';
    barra.appendChild(ok);

    var bs = botao('Salvar alterações', 'btn-mini', function(){});
    bs.disabled = true;
    barra.appendChild(bs);
  }

  el.appendChild(barra);
  return el;
}

function blocoItem(s, item, indice, total){
  var d = document.createElement('div');
  d.className = 'bloco';

  var topo = document.createElement('div');
  topo.className = 'bloco-topo';
  if(s.proporcao) topo.style.aspectRatio = s.proporcao;

  if(item.url){
    var img = document.createElement('img');
    img.src = item.url;
    img.loading = 'lazy';
    topo.appendChild(img);

    if(total > 1){
      var num = document.createElement('span');
      num.className = 'bloco-num';
      num.textContent = indice + 1;
      topo.appendChild(num);
    }

    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'bloco-x';
    x.title = 'Remover desta posição';
    x.textContent = '✕';
    x.onclick = function(){
      lista[s.slot][indice] = { url: null };
      alterado[s.slot] = true;
      renderizar();
    };
    topo.appendChild(x);
  }else{
    topo.innerHTML =
      '<div class="bloco-vazio" style="width:100%;height:100%">' +
        '<span class="bv-ico">＋</span>' +
        '<span class="bv-txt">Envie uma<br>foto aqui</span>' +
      '</div>';

    topo.querySelector('.bloco-vazio').onclick = function(){
      escolherArquivo(s, indice);
    };
  }

  d.appendChild(topo);

  if(item.url){
    var acoes = document.createElement('div');
    acoes.className = 'bloco-acoes';

    var bVer = botao('🔍', '', function(){ abrirLupa(item.url); });
    bVer.title = 'Ampliar';

    acoes.appendChild(bVer);
    d.appendChild(acoes);
  }

  return d;
}

function blocoAdd(s){
  var d = document.createElement('div');
  d.className = 'bloco bloco-add';

  var topo = document.createElement('div');
  topo.className = 'bloco-topo';
  if(s.proporcao) topo.style.aspectRatio = s.proporcao;

  topo.innerHTML =
    '<div class="bloco-vazio" style="width:100%;height:100%">' +
      '<span class="bv-ico">＋</span>' +
      '<span class="bv-txt">Adicionar<br>imagem</span>' +
    '</div>';

  topo.querySelector('.bloco-vazio').onclick = function(){
    escolherArquivo(s, -1);
  };

  d.appendChild(topo);
  return d;
}

function abrirLupa(url){
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.innerHTML = '<button type="button" class="lb-close">✕</button><img src="' + esc(url) + '" alt="">';
  lb.onclick = function(e){
    if(e.target === lb || e.target.className === 'lb-close'){
      if(lb.parentNode) lb.parentNode.removeChild(lb);
    }
  };
  document.body.appendChild(lb);
}

/* ---------- BARRA GLOBAL ---------- */
function garantirBarraGlobal(){
  var bar = document.getElementById('barraGlobal');
  if(bar) return bar;

  bar = document.createElement('div');
  bar.id = 'barraGlobal';
  bar.className = 'barra-global';
  bar.innerHTML =
    '<span class="bg-txt"></span>' +
    '<div class="bg-acoes">' +
      '<button type="button" class="btn btn-mini" id="bgDescartar">Descartar</button>' +
      '<button type="button" class="btn btn-mini ok" id="bgSalvar">Salvar tudo</button>' +
    '</div>';

  bar.querySelector('#bgSalvar').onclick = salvarTudo;
  bar.querySelector('#bgDescartar').onclick = descartarTudo;

  document.body.appendChild(bar);
  return bar;
}

function atualizarBarraGlobal(){
  var bar = garantirBarraGlobal();
  var pendentes = Object.keys(alterado).filter(function(k){ return alterado[k]; });

  if(!pendentes.length){
    bar.classList.remove('show');
    document.body.style.paddingBottom = '';
    return;
  }

  bar.querySelector('.bg-txt').textContent = pendentes.length === 1
    ? '1 bloco com alteração não salva'
    : pendentes.length + ' blocos com alterações não salvas';

  bar.classList.add('show');
  document.body.style.paddingBottom = '78px';
}

function salvarTudo(){
  var pendentes = Object.keys(alterado).filter(function(k){ return alterado[k]; });
  if(!pendentes.length || salvando) return;

  salvando = true;
  toast('Salvando ' + pendentes.length + ' bloco(s)…');

  var fila = Promise.resolve();
  var ok = 0;

  pendentes.forEach(function(slot){
    fila = fila.then(function(){
      var s = catalogo.filter(function(x){ return x.slot === slot; })[0];
      if(!s) return null;
      return enviarSlot(s).then(function(){ ok++; }).catch(function(){});
    });
  });

  fila.then(function(){
    salvando = false;
    toast(ok + ' de ' + pendentes.length + ' bloco(s) salvo(s).', ok ? 'ok' : 'erro');
    renderizar();
  });
}

function descartarTudo(){
  var pendentes = Object.keys(alterado).filter(function(k){ return alterado[k]; });
  if(!pendentes.length) return;
  if(!confirm('Descartar as alterações de ' + pendentes.length + ' bloco(s)?')) return;

  pendentes.forEach(function(slot){
    alterado[slot] = false;
    var s = catalogo.filter(function(x){ return x.slot === slot; })[0];
    if(s) prepararSlot(s);
  });

  setTimeout(renderizar, 60);
}

/* ---------- OTIMIZAÇÃO ---------- */
function settingsOpt(){
  try{
    return JSON.parse(localStorage.getItem('m3d_img_opt') || 'null') || { ativo: true, maxW: 1600, q: 82 };
  }catch(e){
    return { ativo: true, maxW: 1600, q: 82 };
  }
}

function salvarSettingsOpt(o){
  localStorage.setItem('m3d_img_opt', JSON.stringify(o));
}

function carregarImagem(file){
  return new Promise(function(res, rej){
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){ res({ img: img, url: url }); };
    img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('imagem inválida')); };
    img.src = url;
  });
}

function desenhar(img, maxW){
  var w = img.naturalWidth;
  var h = img.naturalHeight;

  if(maxW && w > maxW){ h = Math.round(h * maxW / w); w = maxW; }

  var cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;

  var ctx = cv.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  return { canvas: cv, w: w, h: h };
}

function exportarBlob(cv, fmt, q){
  return new Promise(function(res){
    cv.toBlob(function(blob){
      if(!blob){
        if(fmt === 'image/webp') return exportarBlob(cv, 'image/jpeg', q);
        res(null);
        return;
      }
      if(fmt !== 'image/png' && blob.type !== fmt){
        cv.toBlob(function(b2){
          if(b2 && b2.type === fmt) return res(b2);
          if(fmt === 'image/webp') return exportarBlob(cv, 'image/jpeg', q);
          res(b2 || blob);
        }, fmt, q);
        return;
      }
      res(blob);
    }, fmt, q);
  });
}

function otimizarImagem(file, opts){
  opts = opts || {};

  var maxW = opts.maxW || 1600;
  var q = (opts.q || 82) / 100;
  var fmt = opts.formato || 'image/webp';
  var alvoKb = opts.alvoKb || 0;

  return carregarImagem(file).then(function(r){
    var d = desenhar(r.img, maxW);
    URL.revokeObjectURL(r.url);

    if(!alvoKb || fmt === 'image/png'){
      return exportarBlob(d.canvas, fmt, q).then(function(blob){
        return { blob: blob, w: d.w, h: d.h, formato: blob ? blob.type : fmt };
      });
    }

    var tentativas = [q, .8, .7, .62, .55, .48, .42, .36, .3, .25];
    var i = 0;

    function tentar(){
      if(i >= tentativas.length){
        return exportarBlob(d.canvas, fmt, tentativas[tentativas.length - 1]).then(function(blob){
          return { blob: blob, w: d.w, h: d.h, formato: blob ? blob.type : fmt };
        });
      }

      var qi = tentativas[i++];

      return exportarBlob(d.canvas, fmt, qi).then(function(blob){
        if(blob && blob.size <= alvoKb * 1024){
          return { blob: blob, w: d.w, h: d.h, formato: blob.type };
        }
        return tentar();
      });
    }

    return tentar();
  });
}

function extDoFormato(fmt){
  if(fmt === 'image/webp') return 'webp';
  if(fmt === 'image/png') return 'png';
  return 'jpg';
}

function blobParaFile(blob, nomeOriginal, ext){
  var base = String(nomeOriginal || 'imagem').replace(/\.[^.]+$/, '');
  return new File([blob], base + '.' + ext, { type: blob.type });
}

function baixarBlob(blob, nome){
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2500);
}

/* ---------- UPLOAD ---------- */
function escolherArquivo(s, indice){
  var inp = document.getElementById('arquivo');
  if(!inp) return;

  inp.value = '';
  inp.onchange = function(){ enviarArquivo(inp, s, indice); };
  inp.click();
}

function enviarArquivo(inp, s, indice){
  var arq = inp.files && inp.files[0];
  if(!arq) return;

  var cfg = settingsOpt();
  var ehGif = /\.gif$/i.test(arq.name) || arq.type === 'image/gif';

  var preparo = (cfg.ativo && !ehGif)
    ? otimizarImagem(arq, { maxW: cfg.maxW, q: cfg.q, formato: 'image/webp' })
        .then(function(r){ return blobParaFile(r.blob, arq.name, extDoFormato(r.formato)); })
        .catch(function(){ return arq; })
    : Promise.resolve(arq);

  toast('Enviando…');

  preparo.then(function(arquivoFinal){
    var fd = new FormData();
    fd.append('imagem', arquivoFinal);

    return fetch(API_UP, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: fd
    })
    .then(function(r){ return r.json().then(function(t){ return { ok: r.ok, t: t }; }); })
    .then(function(res){
      if(!res.ok || !res.t.url) throw new Error(res.t.error || 'falha no upload');

      var arr = lista[s.slot] || [];

      if(indice === -1 || indice >= arr.length){
        arr.push({ url: res.t.url });
      }else{
        arr[indice] = { url: res.t.url };
      }

      lista[s.slot] = arr;
      alterado[s.slot] = true;

      toast('Imagem pronta. Clique em Salvar alterações.', 'ok');
      renderizar();
    });
  })
  .catch(function(e){ toast('Erro no upload: ' + e.message, 'erro'); });
}

/* ---------- SALVAR ---------- */
function enviarSlot(s){
  var arr = (lista[s.slot] || []).filter(function(i){ return i.url; });

  return fetch(API_IMG + '/' + encodeURIComponent(s.slot) + '/replace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-story-key': chave },
    body: JSON.stringify({
      itens: arr.map(function(i){ return { url: i.url, alt: '', link: '' }; })
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.erro) throw new Error(d.erro);

    itens[s.slot] = arr.map(function(i, k){
      return { id: 'novo' + k, url: i.url, alt: '', link: '' };
    });

    alterado[s.slot] = false;
    return true;
  });
}

function salvarSlot(s){
  if(salvando) return;

  salvando = true;
  toast('Salvando…');

  enviarSlot(s)
    .then(function(){
      salvando = false;
      toast('Salvo no site.', 'ok');
      renderizar();
    })
    .catch(function(e){
      salvando = false;
      toast('Erro ao salvar: ' + e.message, 'erro');
    });
}

function descartarSlot(s){
  if(!confirm('Descartar as alterações deste bloco?')) return;

  alterado[s.slot] = false;
  prepararSlot(s).then(renderizar);
}

/* ---------- APOIO ---------- */
function abrirSeletor(inp, cb, multiplo, cbMulti){
  if(!inp) return;

  inp.value = '';
  inp.multiple = !!multiplo;
  inp.onchange = function(){
    if(multiplo && cbMulti){ cbMulti(inp.files); return; }
    if(cb && inp.files && inp.files[0]) cb(inp.files[0]);
  };
  inp.click();
}

function preencherSelectSlots(sel){
  if(!sel) return;
  sel.innerHTML = '';

  catalogo.forEach(function(s, i){
    var o = document.createElement('option');
    o.value = i;
    o.textContent = NOMES_PAGINA[s.pagina] + ' › ' + s.grupo + ' › ' + s.rotulo;
    sel.appendChild(o);
  });
}

function enviarParaSlot(resultado, nomeOriginal, s){
  var f = blobParaFile(resultado.blob, nomeOriginal, extDoFormato(resultado.formato));
  var fd = new FormData();
  fd.append('imagem', f);

  toast('Enviando…');

  fetch(API_UP, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd
  })
  .then(function(r){ return r.json(); })
  .then(function(t){
    if(!t.url) throw new Error(t.error || 'falha');

    var arr = lista[s.slot] || [];
    arr.push({ url: t.url });
    lista[s.slot] = arr;
    alterado[s.slot] = true;

    toast('Adicionada. Clique em Salvar alterações.', 'ok');
    renderizar();
  })
  .catch(function(e){ toast('Erro: ' + e.message, 'erro'); });
}

/* ---------- BOOT ---------- */
window.addEventListener('error', function(ev){
  console.error('[admin-imagens] erro:', ev.message, ev.filename, ev.lineno);
});

(function(){
  var t = '';
  var c = '';

  try{
    t = sessionStorage.getItem('m3d_token') || '';
    c = sessionStorage.getItem('m3d_img_chave') || '';
  }catch(e){}

  if(t && c){
    token = t;
    chave = c;
    abrirApp();
  }

  var elChave = document.getElementById('chaveEdicao');
  if(elChave){
    elChave.addEventListener('keydown', function(e){
      if(e.key === 'Enter') entrar();
    });
  }
})();