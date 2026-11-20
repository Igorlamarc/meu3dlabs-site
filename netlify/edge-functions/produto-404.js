/* =====================================================================
   netlify/edge-functions/produto-404.js  —  ARQUIVO COMPLETO
   Único dono da rota /produto/*

   1) Valida o slug contra a API (cache de edge + timeout)
   2) Serve a página normal para humanos
   3) Reescreve metatags para robôs de preview (WhatsApp, Facebook, Googlebot...)
      · usa o banner 1200x630 gerado no admin (marca M3DOG: na descrição)
      · declara og:image:width / height — é isso que faz o card GRANDE
   4) Fail-open: NUNCA quebra a página
   ===================================================================== */

const API = 'https://meu3dlabs-backend.onrender.com/api/loja/produtos';
const CACHE_CHAVE = 'https://meu3dlabs.com.br/__cache/lista-produtos';
const CACHE_TTL_SEGUNDOS = 60;
const TIMEOUT_MS = 3500;
const BASE = 'https://meu3dlabs.com.br';

/* Marca que guarda a URL do banner OG dentro da descrição */
const MARCA_OG = 'M3DOG:';

/* Robôs que montam preview de link (não executam JavaScript) */
const BOT = /whatsapp|facebookexternalhit|facebot|meta-externalagent|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot|applebot|embedly|iframely|vkshare|redditbot|w3c_validator/i;

export const config = { path: "/produto/*" };

/* ---------------------------------------------------------------------
   Lista de produtos com cache de edge + timeout.
   Retorna null quando NÃO foi possível validar com segurança.
   Lista vazia também retorna null (fail-open).
   --------------------------------------------------------------------- */
async function obterProdutos() {
  /* 1) Cache de edge */
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const hit = await caches.default.match(CACHE_CHAVE);
      if (hit) {
        try {
          const json = await hit.json();
          if (Array.isArray(json) && json.length > 0) return json;
        } catch (e) { /* cache corrompido → ignora */ }
      }
    }
  } catch (e) { /* sem Cache API → segue sem cache */ }

  /* 2) API com timeout */
  const ctrl = new AbortController();
  const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, TIMEOUT_MS);

  let lista = null;
  try {
    const r = await fetch(API, {
      headers: { 'Accept': 'application/json' },
      signal: ctrl.signal
    });
    if (r.ok) {
      const d = await r.json();
      const bruto = Array.isArray(d) ? d : (d.produtos || d.items || []);
      if (Array.isArray(bruto) && bruto.length > 0) lista = bruto;
    }
  } catch (e) {
    lista = null;
  } finally {
    clearTimeout(timer);
  }

  /* 3) Grava no cache por 60s */
  if (lista) {
    try {
      if (typeof caches !== 'undefined' && caches.default) {
        await caches.default.put(
          CACHE_CHAVE,
          new Response(JSON.stringify(lista), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=' + CACHE_TTL_SEGUNDOS
            }
          })
        );
      }
    } catch (e) { /* falha ao cachear não impede o fluxo */ }
  }

  return lista;
}

/* ---------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absUrl(u) {
  if (!u) return '';
  const v = String(u).trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (v.indexOf('//') === 0) return 'https:' + v;
  return BASE + (v.startsWith('/') ? v : '/' + v);
}

/* É vídeo? O preview de link precisa de FOTO, nunca de vídeo. */
function ehVideo(u) {
  if (!u) return false;
  return /\.(webm|mp4|mov|m4v|avi|mkv|ogv)(\?|#|$)/i.test(String(u));
}

/* Texto puro da descrição (sem as marcas internas) */
function descricaoTexto(d) {
  return String(d || '')
    .split('|')
    .filter(function (seg) {
      const s = seg.trim();
      return s.indexOf(MARCA_OG) !== 0 && s.indexOf('M3DVAR:') !== 0;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Banner 1200x630 gerado no admin, se existir */
function bannerDaDescricao(d) {
  const partes = String(d || '').split('|');
  for (let i = 0; i < partes.length; i++) {
    const seg = partes[i].trim();
    if (seg.indexOf(MARCA_OG) === 0) {
      let u = seg.slice(MARCA_OG.length).trim();
      if (!u) continue;
      try { u = decodeURIComponent(u); } catch (e) { /* usa cru */ }
      if (u) return absUrl(u);
    }
  }
  return '';
}

/* Mapeia os campos do produto (tolerante a variações da API) */
function dadosDoProduto(p) {
  const nome = p.nome || p.titulo || p.name || p.title || 'Produto';

  /* Banner primeiro; senão a primeira FOTO válida (nunca vídeo) */
  const banner = bannerDaDescricao(p.descricao);

  let bruto = p.imagens || p.imagem || p.img || p.foto || p.capa ||
              p.imagem_url || p.image || p.thumbnail || '';
  if (!Array.isArray(bruto)) bruto = [bruto];

  let fotoRaw = '';
  for (let i = 0; i < bruto.length; i++) {
    let u = bruto[i];
    if (u && typeof u === 'object') u = u.url || u.src || u.imagem || '';
    if (!u || typeof u !== 'string') continue;
    if (ehVideo(u)) continue;
    fotoRaw = u.trim();
    if (fotoRaw) break;
  }

  const foto = absUrl(fotoRaw);
  const imagem = banner || foto;

  /* Dimensões declaradas — é isto que decide card grande x miniatura */
  const largura = banner ? 1200 : 800;
  const altura  = banner ? 630  : 800;

  /* Título curto para o card */
  const nomeCurto = nome.length > 66
    ? nome.slice(0, 65).replace(/\s+\S*$/, '') + '…'
    : nome;
  const titulo = nomeCurto + ' · Meu 3D Labs';

  /* Descrição com apelo comercial */
  const base = descricaoTexto(p.descricao);
  const estoque = parseInt(p.estoque, 10);
  const temEstoque = isNaN(estoque) ? true : estoque > 0;
  const cauda = (temEstoque ? 'Pronta entrega · ' : '') +
    'Pix 5% OFF · Cartão em 12x · Envio para todo o Brasil';

  let desc = cauda;
  if (base) {
    const espaco = 190 - cauda.length - 3;
    if (espaco > 30) {
      const corte = base.length > espaco
        ? base.slice(0, espaco).replace(/\s+\S*$/, '') + '…'
        : base;
      desc = corte + ' · ' + cauda;
    }
  }

  return { nome, titulo, imagem, largura, altura, desc, banner };
}

/* Remove metas antigas e injeta as do produto */
function reescreverHtml(html, p, slug) {
  const { nome, titulo, imagem, largura, altura, desc } = dadosDoProduto(p);
  const url = BASE + '/produto/' + slug;

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]*(?:property|name)=["'](?:og:|twitter:)[^"']*["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '');

  const metas = [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:site_name" content="Meu 3D Labs">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    imagem ? `<meta property="og:image" content="${esc(imagem)}">` : '',
    imagem ? `<meta property="og:image:secure_url" content="${esc(imagem)}">` : '',
    imagem ? `<meta property="og:image:type" content="image/jpeg">` : '',
    imagem ? `<meta property="og:image:width" content="${largura}">` : '',
    imagem ? `<meta property="og:image:height" content="${altura}">` : '',
    imagem ? `<meta property="og:image:alt" content="${esc(nome)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(titulo)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    imagem ? `<meta name="twitter:image" content="${esc(imagem)}">` : ''
  ].filter(Boolean).join('\n    ');

  return out.replace(/<\/head>/i, '    ' + metas + '\n  </head>');
}

/* Monta a resposta 404 reaproveitando o HTML do rewrite (sem fetch extra) */
async function responder404(context) {
  const res = await context.next();
  let html = await res.text();

  if (/<meta[^>]+name=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<meta[^>]+name=["']robots["'][^>]*>/i,
      '<meta name="robots" content="noindex, follow">'
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      '  <meta name="robots" content="noindex, follow">\n</head>'
    );
  }

  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      '<title>Peça não encontrada | Meu 3D Labs</title>'
    );
  } else {
    html = html.replace(
      /<\/head>/i,
      '  <title>Peça não encontrada | Meu 3D Labs</title>\n</head>'
    );
  }

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, follow',
      'Cache-Control': 'no-store'
    }
  });
}

/* ---------------------------------------------------------------------
   Handler
   --------------------------------------------------------------------- */
export default async function handler(request, context) {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/produto\/([^\/?#]+)\/?$/);

    if (!match) return context.next();

    let slug;
    try { slug = decodeURIComponent(match[1]); } catch (e) { slug = match[1]; }

    const slugAlvo = String(slug).trim().toLowerCase();

    const lista = await obterProdutos();

    /* Não conseguiu validar → fail-open */
    if (!lista) return context.next();

    const prod = lista.find(function (p) {
      if (!p || p.ativo === false) return false;
      const s = String(p.slug || p.id || '').trim().toLowerCase();
      return s === slugAlvo;
    });

    /* ===== Produto NÃO existe → 404 real ===== */
    if (!prod) {
      try {
        return await responder404(context);
      } catch (e) {
        return context.next();
      }
    }

    /* ===== Produto existe → página normal para humanos ===== */
    const res = await context.next();
    const ua = request.headers.get('user-agent') || '';

    if (!BOT.test(ua) || res.status !== 200) return res;

    /* Robô de preview → devolve o HTML com as metas do produto */
    const html = await res.text();
    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Vary', 'User-Agent');
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    headers.delete('Content-Length');
    headers.delete('ETag');

    return new Response(reescreverHtml(html, prod, slug), {
      status: 200,
      headers: headers
    });

  } catch (e) {
    console.error('produto-404: ' + (e && e.message));
    try {
      return await context.next();
    } catch (_) {
      return new Response('Erro temporário', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
}