/* =====================================================================
   netlify/edge-functions/login-guard.js
   Bloqueio de força bruta no login do painel.

   Intercepta /api/auth/login ANTES de chegar no backend e limita
   tentativas por IP. Não substitui limite no servidor, mas corta
   o ataque automatizado que hoje passa direto.

   Fail-open: se algo falhar aqui, a requisição segue normal.
   ===================================================================== */

export const config = { path: "/api/auth/login" };

const JANELA_SEGUNDOS = 600;   /* janela de 10 minutos */
const LIMITE_TENTATIVAS = 5;   /* 5 POSTs por IP a cada 10 min */
const BASE_CACHE = 'https://meu3dlabs.com.br/__rl/login';

function chaveDoBalde(ip, janela) {
  return BASE_CACHE + '/' + ip + '/' + janela;
}

async function lerContador(chave) {
  try {
    if (typeof caches === 'undefined' || !caches.default) return 0;
    const hit = await caches.default.match(chave);
    if (!hit) return 0;
    const n = parseInt(await hit.text(), 10);
    return isNaN(n) ? 0 : n;
  } catch (e) {
    return 0;
  }
}

async function gravarContador(chave, valor) {
  try {
    if (typeof caches === 'undefined' || !caches.default) return;
    await caches.default.put(
      chave,
      new Response(String(valor), {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'max-age=' + JANELA_SEGUNDOS
        }
      })
    );
  } catch (e) { /* falha ao gravar não bloqueia ninguém */ }
}

function respostaBloqueado(segundos) {
  return new Response(
    JSON.stringify({
      error: 'Muitas tentativas. Tente novamente em alguns minutos.',
      retryAfter: segundos
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(segundos),
        'Cache-Control': 'no-store'
      }
    }
  );
}

export default async function handler(request, context) {
  try {
    /* Só POST entra no login. GET e OPTIONS seguem normal. */
    if (request.method !== 'POST') return context.next();

    const ip = context.ip || 'desconhecido';
    const janela = Math.floor(Date.now() / (JANELA_SEGUNDOS * 1000));
    const chave = chaveDoBalde(ip, janela);

    const atual = await lerContador(chave);

    if (atual >= LIMITE_TENTATIVAS) {
      const restante = JANELA_SEGUNDOS - Math.floor((Date.now() / 1000) % JANELA_SEGUNDOS);
      return respostaBloqueado(restante > 0 ? restante : JANELA_SEGUNDOS);
    }

    await gravarContador(chave, atual + 1);

    return context.next();
  } catch (e) {
    /* Nunca derrubar o login por causa do guardião */
    try { return await context.next(); }
    catch (_) { return new Response('Erro temporário', { status: 500 }); }
  }
}