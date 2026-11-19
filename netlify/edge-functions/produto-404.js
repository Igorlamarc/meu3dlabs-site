/* =====================================================================
   netlify/edge-functions/produto-404.js  —  ARQUIVO COMPLETO
   Intercepta /produto/<slug> ANTES do rewrite.

   1) Valida o slug contra a API (cache de edge + timeout) → 404 real se não existe
   2) Serve a página normal para humanos
   3) Reescreve as metatags (og:title / og:description / og:image) para robôs
      de preview (WhatsApp, Facebook, Telegram, LinkedIn...)
   4) Fail-open: nunca quebra a página
   ===================================================================== */

const API = 'https://meu3dlabs-backend.onrender.com/api/loja/produtos';
const CACHE_CHAVE = 'https://meu3dlabs.com.br/__cache/lista-produtos';
const CACHE_TTL_SEGUNDOS = 60;
const TIMEOUT_MS = 3000;
const BASE = 'https://meu3dlabs.com.br';

/* Robôs que montam preview de link (não executam JavaScript) */
const BOT = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot|embedly|iframely|vkshare|w3c_validator/i;

export const config = { path: "/produto/*" };

/* ---------------------------------------------------------------------
   Busca a lista de produtos com cache de edge + timeout.
   Retorna null quando não foi possível obter (API fria, timeout, erro).
   --------------------------------------------------------------------- */
async function obterProdutos() {
  /* 1) Tenta o cache de edge */
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const hit = await caches.default.match(CACHE_CHAVE);
      if (hit) {
        try {
          const json = await hit.json();
          if (Array.isArray(json)) return json;
        } catch (e) { /* cache corrompido → ignora e refaz */ }
      }
    }
  } catch (e) { /* sem Cache API → segue sem cache */ }

  /* 2) Busca na API com timeout */
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
      const bruto = Array.isArray(d) ? d : (d.produtos || []);
      if (Array.isArray(bruto)) lista = bruto;
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
   Helpers de metatag
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
  return BASE + (v.startsWith('/') ? v : '/' + v);
}

/* ---------------------------------------------------------------------
   Mapeia os campos do produto.
   >>> Se o nome dos campos na sua API for diferente, ajuste SÓ aqui. <<<
   --------------------------------------------------------------------- */
function dadosDoProduto(p) {
  const nome = p.nome || p.titulo || p.name || p.title || 'Produto';

  let imgRaw = p.imagem || p.img || p.foto || p.capa || p.imagem_url || p.image || p.thumbnail || '';
  if (Array.isArray(imgRaw)) imgRaw = imgRaw[0] || '';
  if (imgRaw && typeof imgRaw === 'object') {
    imgRaw = imgRaw.url || imgRaw.src || imgRaw.imagem || '';
  }
  const img = absUrl(imgRaw);

  const preco = Number(p.preco_promo || p.precoPromocional || p.preco || p.price || 0);
  const precoTxt = preco > 0 ? 'R$ ' + preco.toFixed(2).replace('.', ',') : '';

  const descricaoCrua = p.descricao || p.desc || p.description || '';
  const desc = [String(descricaoCrua), precoTxt]
    .filter(Boolean)
    .join(' — ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || 'Peça 3D pronta entrega na Meu 3D Labs.';

  return { nome, img, desc };
}

/* Remove as metas antigas e injeta as do produto */
function reescreverHtml(html, p, slug) {
  const { nome, img, desc } = dadosDoProduto(p);
  const titulo = nome + ' | Meu 3D Labs';
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
    img ? `<meta property="og:image" content="${esc(img)}">` : '',
    img ? `<meta property="og:image:secure_url" content="${esc(img)}">` : '',
    img ? `<meta property="og:image:alt" content="${esc(nome)}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(titulo)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    img ? `<meta name="twitter:image" content="${esc(img)}">` : '',
  ].filter(Boolean).join('\n    ');

  return out.replace(/<\/head>/i, '    ' + metas + '\n  </head>');
}

/* ---------------------------------------------------------------------
   Handler
   --------------------------------------------------------------------- */
export default async function handler(request, context) {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/produto\/([^\/?#]+)\/?$/);

    /* Não é uma URL de produto → segue o fluxo normal */
    if (!match) return context.next();

    let slug;
    try { slug = decodeURIComponent(match[1]); } catch { slug = match[1]; }

    const lista = await obterProdutos();

    /* Não conseguiu validar (API fria / timeout) → fail-open */
    if (!lista) return context.next();

    const prod = lista.find(
      (p) => String(p.slug) === slug && p.ativo !== false
    );

    /* ===== Produto NÃO existe → 404 real ===== */
    if (!prod) {
      try {
        const loja = await fetch(new URL('/produto.html', url.origin));
        let html = await loja.text();

        html = html
          .replace(
            /<meta name="robots"[^>]*>/i,
            '<meta name="robots" content="noindex, follow">'
          )
          .replace(
            /<title>[^<]*<\/title>/i,
            '<title>Peça não encontrada | Meu 3D Labs</title>'
          );

        return new Response(html, {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow',
            'Cache-Control': 'no-store'
          }
        });
      } catch (e) {
        /* Falhou ao montar o 404 → não quebrar a página */
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
      headers
    });
  } catch (e) {
    /* A função NUNCA pode lançar exceção */
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