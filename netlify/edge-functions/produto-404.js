/* Intercepta /produto/<slug> ANTES do rewrite.
   Consulta a API (com cache e timeout). Se o produto não existir → 404 real. */

const API = 'https://meu3dlabs-backend.onrender.com/api/loja/produtos';
const CACHE_CHAVE = 'https://meu3dlabs.com.br/__cache/lista-produtos';
const CACHE_TTL_SEGUNDOS = 60;
const TIMEOUT_MS = 3000;

/* Busca a lista de produtos com cache de edge + timeout.
   Retorna null quando não foi possível obter (API fria, timeout, erro). */
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

export default async function handler(request, context) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/produto\/([^\/?#]+)\/?$/);

  /* Não é uma URL de produto → segue o fluxo normal */
  if (!match) return context.next();

  let slug;
  try { slug = decodeURIComponent(match[1]); } catch { slug = match[1]; }

  const lista = await obterProdutos();

  /* Não conseguiu validar → deixa passar (fail-open) */
  if (!lista) return context.next();

  const existe = lista.some(
    p => String(p.slug) === slug && p.ativo !== false
  );

  if (existe) return context.next(); // produto existe → serve normal

  /* ===== Produto NÃO existe → 404 real ===== */
  try {
    const loja = await fetch(new URL('/produto.html', url.origin));
    let html = await loja.text();

    /* Injeta noindex + título de erro antes de servir */
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