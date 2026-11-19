/* ============================================================
   Meu 3D Labs — admin-orcamento-card.js  (v2)
   Gera um card de orçamento (1080x1350) pronto para o WhatsApp.

   CORREÇÃO v2: o card era gerado sempre para o primeiro pedido
   porque o onclick ficava amarrado ao pedido da primeira abertura
   do modal. Agora o pedido é resolvido no momento do clique.

   Carregar DEPOIS de admin.js, admin-extras.js,
   admin-modelagem.js, admin-modern.js e admin-unify.js.
   ============================================================ */
(function () {
  'use strict';
  if (window.__m3dQuote) return;
  window.__m3dQuote = true;

  /* ---------- CONFIGURAÇÃO VISUAL ---------- */
  var W = 1080;
  var H = 1350;

  var NAVY       = '#0f1e3d';
  var AZUL       = '#16294f';
  var AZUL_CLARO = '#1d3a6b';
  var LARANJA    = '#f26522';
  var LARANJA_CL = '#ff8a3d';
  var CINZA_TXT  = '#5a6472';
  var CINZA_LBL  = '#8a94a8';
  var LINHA      = '#e6eaf2';
  var STRIP      = '#f2f5f9';

  var WHATS_LOJA = '(21) 96659-4803';
  var SITE       = 'meu3dlabs.com.br';
  var VALIDADE   = 'Orçamento válido por 7 dias';

  /* ---------- UTILIDADES ---------- */
  function apiBase() {
    return window.API_URL || window.API_BASE || 'https://meu3dlabs-backend.onrender.com/api';
  }

  /* Todas as listas, sem duplicar */
  function todosPedidos() {
    var vistos = {};
    var out = [];
    function add(lista) {
      (lista || []).forEach(function (p) {
        if (!p) return;
        var k = String(p.id);
        if (vistos[k]) return;
        vistos[k] = true;
        out.push(p);
      });
    }
    add(window.orcamentos);
    add(window.lojaPedidos);
    if (window.modModelagem && window.modModelagem.itens) add(window.modModelagem.itens);
    return out;
  }

  function moeda(v) {
    var n = parseFloat(v) || 0;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dataBR(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  }

  function codigoDe(p) {
    return String(p.pedido_id || p.codigo || p.numero || ('#' + p.id));
  }

  function nomeDe(p) {
    return String(p.nome_cliente || p.cliente || p.nome || '');
  }

  /* ---------- LEITURA DO MODAL ---------- */
  /* Extrai o código do título do modal.
     Formato: "Encomenda M3D-2026-017" ou "Pedido #123" */
  function codigoDoTitulo(txt) {
    var s = String(txt || '').trim();
    if (!s) return '';

    /* padrão M3D-AAAA-NNN */
    var m = s.match(/(M3D[-\u2013][A-Za-z0-9-]+)/i);
    if (m) return m[1];

    /* padrão #123 no fim */
    var h = s.match(/#\s*([A-Za-z0-9_-]+)\s*$/);
    if (h) return h[1];

    /* último token */
    var partes = s.split(/\s+/);
    return String(partes[partes.length - 1] || '').replace(/^#/, '');
  }

  /* Extrai o nome do cliente da linha de meta do modal.
     Formato: "Thiago Paulo · 17/09/2026 18:39" */
  function clienteDaMeta(txt) {
    var s = String(txt || '').trim();
    if (!s) return '';
    var i = s.indexOf('·');
    if (i === -1) return '';
    return s.slice(0, i).trim();
  }

  /* ---------- BUSCA DO PEDIDO ---------- */
  function buscar(codigo, nomeCliente) {
    var alvo = String(codigo || '').trim().replace(/^#/, '');
    if (!alvo) return null;
    var lista = todosPedidos();
    var i, p, ref;

    /* 1) código exato (sem distinguir maiúsculas) */
    for (i = 0; i < lista.length; i++) {
      p = lista[i];
      ref = codigoDe(p).replace(/^#/, '');
      if (ref.toLowerCase() === alvo.toLowerCase()) return p;
    }

    /* 2) id exato */
    for (i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === alvo) return lista[i];
    }

    /* 3) código contido — só se o nome do cliente bater */
    var nomeAlvo = String(nomeCliente || '').toLowerCase().trim();
    for (i = 0; i < lista.length; i++) {
      p = lista[i];
      ref = codigoDe(p).toLowerCase();
      if (ref.indexOf(alvo.toLowerCase()) === -1) continue;
      if (!nomeAlvo) return p;
      var nomeP = nomeDe(p).toLowerCase();
      if (nomeP && (nomeP.indexOf(nomeAlvo) !== -1 || nomeAlvo.indexOf(nomeP) !== -1)) return p;
    }

    /* 4) último recurso: só pelo nome do cliente, se for único */
    if (nomeAlvo) {
      var porNome = lista.filter(function (x) {
        var n = nomeDe(x).toLowerCase();
        return n && (n.indexOf(nomeAlvo) !== -1 || nomeAlvo.indexOf(n) !== -1);
      });
      if (porNome.length === 1) return porNome[0];
    }

    return null;
  }

  function pedidoDoModal() {
    var elT = document.getElementById('vmTitulo');
    var elM = document.getElementById('vmMeta');
    var codigo = codigoDoTitulo(elT ? elT.textContent : '');
    var cliente = clienteDaMeta(elM ? elM.textContent : '');
    return { pedido: buscar(codigo, cliente), codigo: codigo, cliente: cliente };
  }

  /* ---------- EXTRAÇÃO DOS DADOS ---------- */
  function dadosDoPedido(p) {
    var desc = String(p.descricao_peca || p.descricao || p.ideia || '')
      .split('|')[0]
      .replace(/\s+/g, ' ')
      .trim();

    var servico = '';
    if (typeof window.rotuloServico === 'function') {
      servico = window.rotuloServico(
        p.servico || p.tipo_servico || p.servico_escolhido || p.tipo_peca || p.tipo || ''
      ) || '';
    }
    if (!servico) servico = String(p.servico || p.tipo_servico || 'Impressão 3D');

    var valor = parseFloat(p.valor) || parseFloat(p.valor_orcamento) ||
                parseFloat(p.valorOrcamento) || 0;

    var prazo = dataBR(p.prazo_desejado || p.prazo || p.prazo_entrega);

    var qtd = p.quantidade || p.qtd || '';

    var cor = '';
    if (Array.isArray(p.cores) && p.cores.length) cor = String(p.cores[0]);
    else if (p.cor) cor = String(p.cor);

    return {
      codigo:     codigoDe(p),
      cliente:    nomeDe(p) || 'Cliente',
      descricao:  desc || 'Peça personalizada',
      servico:    servico,
      quantidade: qtd ? String(qtd) : '',
      valor:      valor,
      prazo:      prazo,
      cor:        cor
    };
  }

  /* ---------- CANVAS: HELPERS ---------- */
  function pathRound(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function quebrar(ctx, texto, larguraMax) {
    var palavras = String(texto || '').split(/\s+/).filter(Boolean);
    var linhas = [];
    var atual = '';
    for (var i = 0; i < palavras.length; i++) {
      var teste = atual ? atual + ' ' + palavras[i] : palavras[i];
      if (ctx.measureText(teste).width > larguraMax && atual) {
        linhas.push(atual);
        atual = palavras[i];
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  function limitar(linhas, max) {
    if (linhas.length <= max) return linhas;
    var corte = linhas.slice(0, max);
    corte[max - 1] = corte[max - 1].replace(/\s+\S*$/, '') + '…';
    return corte;
  }

  function carregarImg(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('img')); };
      img.src = src;
    });
  }

  function carregarLogo() {
    return fetch(apiBase() + '/logo-base64', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.dataUrl) throw new Error('sem logo');
        return carregarImg(j.dataUrl);
      })
      .catch(function () {
        return carregarImg('img/logo/logo.png').catch(function () { return null; });
      });
  }

  /* ---------- DESENHO DO CARD ---------- */
  function desenhar(ctx, d, logo) {
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, NAVY);
    bg.addColorStop(0.55, AZUL);
    bg.addColorStop(1, AZUL_CLARO);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var rg = ctx.createRadialGradient(W * 0.86, H * 0.05, 0, W * 0.86, H * 0.05, W * 0.85);
    rg.addColorStop(0, 'rgba(242,101,34,0.30)');
    rg.addColorStop(1, 'rgba(242,101,34,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    /* ---------- CABEÇALHO ---------- */
    var logoX = 72;
    var logoTam = 92;
    var centroY = 122;

    if (logo) {
      try {
        ctx.drawImage(logo, logoX, centroY - logoTam / 2, logoTam, logoTam);
      } catch (e) {}
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath();
      ctx.arc(logoX + logoTam / 2, centroY, logoTam / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = LARANJA_CL;
      ctx.font = 'bold 40px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('3D', logoX + logoTam / 2, centroY + 2);
      ctx.restore();
    }

    var textoX = logoX + (logo ? logoTam + 26 : 0);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Meu', textoX, centroY - 12);
    var wMeu = ctx.measureText('Meu').width;

    ctx.fillStyle = LARANJA_CL;
    ctx.fillText('3D', textoX + wMeu, centroY - 12);
    var w3D = ctx.measureText('3D').width;

    ctx.fillStyle = '#ffffff';
    ctx.fillText('Labs', textoX + wMeu + w3D, centroY - 12);

    ctx.font = '600 25px Arial, Helvetica, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText('Orçamento sob medida', textoX, centroY + 34);
    ctx.restore();

    /* badge do código */
    ctx.save();
    ctx.font = 'bold 26px Arial, Helvetica, sans-serif';
    var largCod = ctx.measureText(d.codigo).width + 56;
    var codX = W - 72 - largCod;
    var codY = 92;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    pathRound(ctx, codX, codY, largCod, 60, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.codigo, codX + largCod / 2, codY + 32);
    ctx.restore();

    /* ---------- PAINEL BRANCO ---------- */
    var px = 64;
    var py = 216;
    var pw = W - 128;
    var ph = 900;
    var raio = 34;
    var fundoPainel = py + ph;
    var stripY = fundoPainel - 292;

    ctx.save();
    pathRound(ctx, px, py, pw, ph, raio);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, pw, ph);

    var ix = px + 56;
    var iw = pw - 112;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 25px Arial, Helvetica, sans-serif';
    ctx.fillStyle = LARANJA;
    ctx.fillText('ORÇAMENTO', ix, py + 56);

    ctx.font = 'bold 50px Arial, Helvetica, sans-serif';
    ctx.fillStyle = NAVY;
    var linhaCliente = limitar(quebrar(ctx, d.cliente, iw), 1)[0] || 'Cliente';
    ctx.fillText(linhaCliente, ix, py + 104);

    ctx.strokeStyle = LINHA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ix, py + 188);
    ctx.lineTo(ix + iw, py + 188);
    ctx.stroke();

    ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
    ctx.fillStyle = CINZA_LBL;
    ctx.fillText('PEÇA / SERVIÇO', ix, py + 216);

    ctx.font = '38px Arial, Helvetica, sans-serif';
    ctx.fillStyle = NAVY;
    var linhas = limitar(quebrar(ctx, d.descricao, iw), 4);
    var yDesc = py + 254;
    linhas.forEach(function (l, i) {
      ctx.fillText(l, ix, yDesc + i * 52);
    });

    /* chips: serviço · quantidade · cor */
    var yChip = yDesc + linhas.length * 52 + 22;
    if (yChip < stripY - 96) {
      var partes = [d.servico];
      if (d.quantidade) partes.push(d.quantidade + ' un.');
      if (d.cor) partes.push(d.cor);
      var chipTxt = partes.join('  ·  ');

      ctx.font = 'bold 26px Arial, Helvetica, sans-serif';
      var wChip = ctx.measureText(chipTxt).width + 52;

      /* se não couber, reduz a composição */
      while (wChip > iw && partes.length > 1) {
        partes.pop();
        chipTxt = partes.join('  ·  ');
        wChip = ctx.measureText(chipTxt).width + 52;
      }

      var chipH = 56;
      ctx.fillStyle = 'rgba(242,101,34,0.10)';
      pathRound(ctx, ix, yChip, Math.min(wChip, iw), chipH, chipH / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(242,101,34,0.32)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#c2521a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(chipTxt, ix + 26, yChip + chipH / 2 + 1);
      ctx.textBaseline = 'top';
    }

    /* faixa de valor */
    ctx.fillStyle = STRIP;
    ctx.fillRect(px, stripY, pw, fundoPainel - stripY);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
    ctx.fillStyle = CINZA_LBL;
    ctx.fillText('VALOR DO ORÇAMENTO', ix, stripY + 40);

    if (d.valor > 0) {
      var txtValor = 'R$ ' + moeda(d.valor);
      ctx.fillStyle = LARANJA;
      ctx.font = 'bold 96px Arial, Helvetica, sans-serif';
      if (ctx.measureText(txtValor).width > iw) {
        ctx.font = 'bold 76px Arial, Helvetica, sans-serif';
      }
      if (ctx.measureText(txtValor).width > iw) {
        ctx.font = 'bold 62px Arial, Helvetica, sans-serif';
      }
      ctx.fillText(txtValor, ix, stripY + 76);
    } else {
      ctx.font = 'bold 70px Arial, Helvetica, sans-serif';
      ctx.fillStyle = NAVY;
      ctx.fillText('A combinar', ix, stripY + 88);
    }

    ctx.font = '600 30px Arial, Helvetica, sans-serif';
    ctx.fillStyle = CINZA_TXT;
    ctx.fillText(d.prazo ? ('Prazo estimado: ' + d.prazo) : 'Prazo a combinar', ix, stripY + 200);

    ctx.restore();

    ctx.save();
    pathRound(ctx, px, py, pw, ph, raio);
    ctx.strokeStyle = 'rgba(15,30,61,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    /* ---------- RODAPÉ ---------- */
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, H - 190);
    ctx.lineTo(W - 64, H - 190);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '600 26px Arial, Helvetica, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText(VALIDADE, 64, H - 160);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText(WHATS_LOJA, W - 64, H - 160);

    ctx.textAlign = 'center';
    ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(SITE, W / 2, H - 92);
    ctx.restore();
  }

  /* ---------- OVERLAY ---------- */
  function overlay() {
    var ov = document.getElementById('m3dQuoteOverlay');
    if (ov) return ov;

    ov = document.createElement('div');
    ov.id = 'm3dQuoteOverlay';
    ov.style.cssText =
      'position:fixed;inset:0;background:rgba(15,30,61,.72);backdrop-filter:blur(4px);' +
      'display:none;align-items:center;justify-content:center;z-index:100000;padding:20px;' +
      'overflow:auto;';
    ov.innerHTML =
      '<div style="background:#fff;border-radius:18px;max-width:460px;width:100%;padding:22px;' +
        'box-shadow:0 24px 70px rgba(15,30,61,.4);font-family:inherit;position:relative;">' +
        '<button type="button" id="m3dQuoteX" style="position:absolute;top:12px;right:14px;' +
          'background:none;border:none;font-size:24px;color:#8a94a8;cursor:pointer;line-height:1;">&times;</button>' +
        '<div style="font-size:17px;font-weight:800;color:#0f1e3d;margin-bottom:2px;">Card de orçamento</div>' +
        '<div id="m3dQuoteQuem" style="font-size:12px;color:#f26522;font-weight:700;' +
          'margin-bottom:2px;line-height:1.4;"></div>' +
        '<div style="font-size:12px;color:#5a6472;margin-bottom:14px;line-height:1.5;">' +
          'Formato 1080×1350 — pronto para o WhatsApp.</div>' +
        '<div id="m3dQuoteImgWrap" style="background:#eef1f6;border-radius:12px;padding:10px;' +
          'display:flex;align-items:center;justify-content:center;min-height:200px;">' +
          '<img id="m3dQuoteImg" alt="Card de orçamento" style="width:100%;max-width:340px;' +
            'border-radius:8px;display:none;box-shadow:0 6px 20px rgba(15,30,61,.18);">' +
          '<div id="m3dQuoteLoad" style="font-size:13px;color:#5a6472;">Gerando card…</div>' +
        '</div>' +
        '<div style="display:flex;gap:9px;margin-top:14px;flex-wrap:wrap;">' +
          '<button type="button" id="m3dQuoteBaixar" style="flex:1;min-width:130px;padding:12px;' +
            'border:none;border-radius:10px;background:#0f7a44;color:#fff;font-weight:700;' +
            'font-size:13.5px;cursor:pointer;font-family:inherit;">⬇️ Baixar PNG</button>' +
          '<button type="button" id="m3dQuoteCopiar" style="flex:1;min-width:130px;padding:12px;' +
            'border:none;border-radius:10px;background:#0f1e3d;color:#fff;font-weight:700;' +
            'font-size:13.5px;cursor:pointer;font-family:inherit;">📋 Copiar imagem</button>' +
        '</div>' +
        '<div id="m3dQuoteMsg" style="font-size:12px;color:#8a94a8;margin-top:10px;' +
          'min-height:16px;line-height:1.5;text-align:center;"></div>' +
      '</div>';

    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) {
      if (e.target === ov) fechar();
    });
    document.getElementById('m3dQuoteX').onclick = fechar;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fechar();
    });

    return ov;
  }

  function fechar() {
    var ov = document.getElementById('m3dQuoteOverlay');
    if (ov) ov.style.display = 'none';
  }

  var urlAtual = null;

  /* ---------- GERAÇÃO ---------- */
  function gerar(p) {
    if (!p) return;

    var d = dadosDoPedido(p);
    var ov = overlay();
    ov.style.display = 'flex';

    var img = document.getElementById('m3dQuoteImg');
    var load = document.getElementById('m3dQuoteLoad');
    var msg = document.getElementById('m3dQuoteMsg');
    var quem = document.getElementById('m3dQuoteQuem');
    var btnBaixar = document.getElementById('m3dQuoteBaixar');
    var btnCopiar = document.getElementById('m3dQuoteCopiar');

    quem.textContent = d.codigo + ' · ' + d.cliente;

    if (urlAtual) { URL.revokeObjectURL(urlAtual); urlAtual = null; }

    img.style.display = 'none';
    img.removeAttribute('src');
    load.style.display = 'block';
    load.textContent = 'Gerando card…';
    msg.textContent = '';
    btnBaixar.disabled = true;
    btnCopiar.disabled = true;

    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');

    carregarLogo()
      .then(function (logo) {
        desenhar(ctx, d, logo);

        try {
          ctx.getImageData(0, 0, 1, 1);
        } catch (e) {
          throw new Error('Não foi possível ler o canvas (CORS da logo). O card não pode ser exportado.');
        }

        return new Promise(function (resolve, reject) {
          cv.toBlob(function (blob) {
            if (!blob) { reject(new Error('Falha ao gerar a imagem.')); return; }
            resolve(blob);
          }, 'image/png', 1);
        });
      })
      .then(function (blob) {
        urlAtual = URL.createObjectURL(blob);
        img.src = urlAtual;
        img.style.display = 'block';
        load.style.display = 'none';

        var nomeArq = 'orcamento-' +
          String(d.codigo).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
          '.png';

        btnBaixar.disabled = false;
        btnCopiar.disabled = false;

        btnBaixar.onclick = function () {
          var a = document.createElement('a');
          a.href = urlAtual;
          a.download = nomeArq;
          document.body.appendChild(a);
          a.click();
          a.remove();
          msg.textContent = 'Download iniciado.';
        };

        btnCopiar.onclick = function () {
          if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
            msg.textContent = 'Este navegador não copia imagem. Use "Baixar PNG".';
            return;
          }
          navigator.clipboard
            .write([new window.ClipboardItem({ 'image/png': blob })])
            .then(function () {
              msg.textContent = 'Imagem copiada — cole direto no WhatsApp.';
            })
            .catch(function () {
              msg.textContent = 'Não foi possível copiar. Use "Baixar PNG".';
            });
        };

        if (d.valor <= 0) {
          msg.textContent = 'Dica: este pedido não tem valor lançado. O card mostra "A combinar".';
        }
      })
      .catch(function (e) {
        load.textContent = 'Não foi possível gerar o card.';
        msg.textContent = e.message || 'Erro inesperado.';
      });
  }

  /* ---------- BOTÃO NO MODAL DE DETALHES ---------- */
  /* CORREÇÃO PRINCIPAL: o onclick resolve o pedido AGORA, a cada clique.
     Nunca reutiliza o pedido de uma abertura anterior. */
  function aoClicarCard() {
    var info = pedidoDoModal();

    if (!info.pedido) {
      var nomeTxt = info.codigo || info.cliente || 'desconhecido';
      alert('Não consegui identificar o pedido ' + nomeTxt + ' na lista carregada.\n\n' +
            'Clique em 🔄 Atualizar no painel e tente de novo.');
      return;
    }

    gerar(info.pedido);
  }

  function injetarBotao() {
    var modal = document.querySelector('#verOverlay .ver-modal');
    if (!modal) return;

    var existente = modal.querySelector('#m3dQuoteBtn');

    if (existente) {
      /* já existe: só religa o handler para o pedido atual */
      existente.onclick = aoClicarCard;
      existente.disabled = false;

      var linha = document.getElementById('m3dQuoteQuemModal');
      if (linha) {
        var info = pedidoDoModal();
        linha.textContent = info.codigo
          ? 'Pedido detectado: ' + info.codigo + (info.cliente ? ' · ' + info.cliente : '')
          : 'Pedido não identificado — atualize o painel.';
        linha.style.color = info.pedido ? '#8a94a8' : '#d93636';
      }
      return;
    }

    var box = document.createElement('div');
    box.style.cssText = 'margin-top:14px;';

    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'm3dQuoteBtn';
    b.textContent = '🖼️ Gerar card de orçamento';
    b.title = 'Cria a imagem do orçamento para enviar no WhatsApp';
    b.style.cssText =
      'width:100%;padding:13px 18px;border:none;border-radius:10px;background:#0f1e3d;' +
      'color:#fff;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;';
    b.onclick = aoClicarCard;

    var info0 = pedidoDoModal();
    var dica = document.createElement('div');
    dica.id = 'm3dQuoteQuemModal';
    dica.style.cssText = 'font-size:11px;margin-top:7px;text-align:center;line-height:1.5;color:#8a94a8;';
    dica.textContent = info0.codigo
      ? 'Pedido detectado: ' + info0.codigo + (info0.cliente ? ' · ' + info0.cliente : '')
      : 'Pedido não identificado — atualize o painel.';
    if (!info0.pedido) dica.style.color = '#d93636';

    box.appendChild(b);
    box.appendChild(dica);
    modal.appendChild(box);
  }

  var _abrirVerMais = window.abrirVerMais;
  if (typeof _abrirVerMais === 'function') {
    window.abrirVerMais = function () {
      var r = _abrirVerMais.apply(this, arguments);
      setTimeout(injetarBotao, 140);
      return r;
    };
  }

  /* rede de segurança para modais abertos por outros caminhos */
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.ver-mais-btn') : null;
    if (!btn) return;
    setTimeout(injetarBotao, 200);
  });

  /* acesso manual pelo console */
  window.gerarCardOrcamento = function (codigo) {
    var p = buscar(codigo, '');
    if (!p) { console.warn('[quote] pedido não encontrado:', codigo); return; }
    gerar(p);
  };

  console.log('[admin-orcamento-card] v2 ativo — pedido resolvido a cada clique');
})();