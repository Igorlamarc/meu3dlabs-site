/* ============================================================
   Meu 3D Labs — admin-feed-pro.js (v7)
   Três formatos reais: Blog / Feed / Story + plano corrigido.
   ============================================================ */
(function () {
  'use strict';

  var SITE = 'https://meu3dlabs.com.br';
  var BLOG = 'https://meu3dlabs.com.br/blog';
  var CHAVE_PAUTAS = 'm3d_pautas_salvas';

  /* ============================================================
     1. CTAs
     ============================================================ */
  var CTAS = {
    loja: {
      rot:'Loja', ico:'🛍️', url: SITE + '/loja',
      desc:'peças já prontas, prontas para comprar e receber',
      verbo:'Ver peças prontas',
      foco:'O foco é CATÁLOGO PRONTO. O cliente escolhe uma peça que já existe e compra.',
      proibido:'NÃO fale de personalização, sob medida, criar peça única, enviar projeto nem orçamento. A loja é só de peça pronta.'
    },
    projeto: {
      rot:'Enviar projeto', ico:'✨', url: SITE + '/enviar-projeto',
      desc:'peça sob medida, criada a partir da ideia do cliente',
      verbo:'Enviar meu projeto',
      foco:'O foco é PERSONALIZAÇÃO. O cliente traz a ideia e a peça é criada do zero.',
      proibido:'NÃO fale de catálogo, peça pronta entrega, estoque nem pronta entrega imediata. O caminho é enviar o projeto e receber orçamento.'
    },
    whats: {
      rot:'WhatsApp', ico:'💬', url:'https://wa.me/5521966594803',
      desc:'conversa direta para tirar dúvida e fechar',
      verbo:'Falar no WhatsApp',
      foco:'O foco é CONVERSA. Sem catálogo, sem formulário: conversa direta.',
      proibido:'NÃO use catálogo, preço nem lista de produtos. O caminho é abrir conversa.'
    }
  };

  /* ============================================================
     2. ÂNGULOS
     ============================================================ */
  var ANGULOS = {
    produto: { rot:'Peça em foco', ico:'🎯', linha:'A peça aparece como protagonista: bem acabada, ocupando o quadro. É vitrine.' },
    processo:{ rot:'Processo', ico:'🖨️', linha:'O processo aparece: modelagem, impressão, acabamento. É transparência.' },
    presente:{ rot:'Presente', ico:'🎁', linha:'A peça aparece como presente: contexto humano e afetivo. É emoção.' }
  };

  /* ============================================================
     3. FORMATOS
     ============================================================ */
  var FORMATOS = {
    blog: {
      rot:'Blog', ico:'📰',
      linha:'Post de blog. Imagem de capa horizontal 1200×630.',
      aspect:'horizontal 1200 x 630 px (16:9)',
      tipoImg:'capa do blog'
    },
    feed: {
      rot:'Feed Instagram', ico:'📱',
      linha:'Carrossel de 7 slides 4:5, com legenda e hashtags.',
      aspect:'retrato 1080 x 1350 px (4:5)',
      tipoImg:'carrossel de feed'
    },
    story: {
      rot:'Story Instagram', ico:'⚡',
      linha:'3 stories verticais 9:16, com adesivos e horários.',
      aspect:'vertical 1080 x 1920 px (9:16)',
      tipoImg:'sequência de stories'
    }
  };

  /* ============================================================
     4. UTILITÁRIOS
     ============================================================ */
  function getPosts() {
    try {
      var ler = Function('try{return typeof posts!=="undefined"?posts:null}catch(e){return null}');
      var r = ler();
      if (Array.isArray(r)) return r;
    } catch (e) {}
    if (Array.isArray(window.posts)) return window.posts;
    return [];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function temTermo(texto, termo) {
    var t = norm(texto), q = norm(termo);
    if (!q) return false;
    var re = new RegExp('(^|[^a-z0-9])' +
      q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])');
    return re.test(t);
  }

  function fmtBR(d) {
    if (!d) return '';
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function mesNome(m) {
    return ['janeiro','fevereiro','março','abril','maio','junho','julho',
            'agosto','setembro','outubro','novembro','dezembro'][m - 1] || '';
  }

  var DIAS_SEM = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var DIAS_CUR = ['dom','seg','ter','qua','qui','sex','sáb'];

  function toast(msg, tipo) {
    if (typeof mostrarToast === 'function') mostrarToast(msg, tipo);
  }

  /* ============================================================
     5. CALENDÁRIO
     ============================================================ */
  var DATAS_FIXAS = [
    { m:1,  d:0,  nome:'Janeiro Branco',      emoji:'🤍', cat:'bastidores', tags:['janeiro branco','saude mental'] },
    { m:9,  d:0,  nome:'Setembro Amarelo',    emoji:'💛', cat:'bastidores', tags:['setembro amarelo','prevencao do suicidio'] },
    { m:10, d:0,  nome:'Outubro Rosa',        emoji:'🎗️', cat:'bastidores', tags:['outubro rosa','cancer de mama'] },
    { m:11, d:0,  nome:'Novembro Azul',       emoji:'💙', cat:'bastidores', tags:['novembro azul','cancer de prostata','saude do homem'] },
    { m:1,  d:1,  nome:'Ano Novo',            emoji:'🎉', cat:'novidade', tags:['ano novo','reveillon'] },
    { m:3,  d:8,  nome:'Dia da Mulher',       emoji:'💐', cat:'bastidores', tags:['dia da mulher','dia internacional da mulher'] },
    { m:3,  d:15, nome:'Dia do Consumidor',   emoji:'🛒', cat:'precos',    tags:['dia do consumidor'] },
    { m:5,  d:4,  nome:'Star Wars Day',       emoji:'⭐', cat:'novidade',  tags:['star wars'] },
    { m:5,  d:25, nome:'Dia do Orgulho Nerd', emoji:'🎮', cat:'novidade',  tags:['orgulho nerd','dia do orgulho nerd'] },
    { m:6,  d:12, nome:'Dia dos Namorados',   emoji:'💝', cat:'novidade',  tags:['dia dos namorados'] },
    { m:7,  d:20, nome:'Dia do Amigo',        emoji:'🤝', cat:'novidade',  tags:['dia do amigo'] },
    { m:8,  d:11, nome:'Dia do Estudante',    emoji:'🎓', cat:'iniciante', tags:['dia do estudante'] },
    { m:9,  d:7,  nome:'Independência',       emoji:'🇧🇷', cat:'novidade', tags:['independencia do brasil','sete de setembro','7 de setembro'] },
    { m:9,  d:21, nome:'Dia da Árvore',       emoji:'🌳', cat:'materiais', tags:['dia da arvore'] },
    { m:10, d:12, nome:'Dia das Crianças',    emoji:'🧸', cat:'novidade',  tags:['dia das criancas'] },
    { m:10, d:15, nome:'Dia do Professor',    emoji:'📚', cat:'bastidores',tags:['dia do professor'] },
    { m:10, d:31, nome:'Halloween',           emoji:'🎃', cat:'novidade',  tags:['halloween','dia das bruxas'] },
    { m:11, d:20, nome:'Consciência Negra',   emoji:'✊🏾', cat:'bastidores', tags:['consciencia negra','dia da consciencia negra'] },
    { m:12, d:3,  nome:'Dia do 3D Printing',  emoji:'🖨️', cat:'bastidores', tags:['3d printing day','dia do 3d'] },
    { m:12, d:15, nome:'Maratona de Férias',  emoji:'🏖️', cat:'bastidores', tags:['maratona de ferias'] },
    { m:12, d:24, nome:'Véspera de Natal',    emoji:'🎄', cat:'novidade',  tags:['vespera de natal','24 de dezembro'] },
    { m:12, d:25, nome:'Natal',               emoji:'🎄', cat:'novidade',  tags:['natal','25 de dezembro'] },
    { m:12, d:31, nome:'Réveillon',           emoji:'🥂', cat:'novidade',  tags:['reveillon','virada de ano'] }
  ];

  function pascoa(ano) {
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100,
        d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7,
        m = Math.floor((a + 11 * h + 22 * l) / 451),
        mes = Math.floor((h + l - 7 * m + 114) / 31),
        dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes - 1, dia);
  }

  function nEsimoDomingo(ano, mes, n) {
    var d = new Date(ano, mes - 1, 1), cont = 0;
    while (d.getMonth() === mes - 1) {
      if (d.getDay() === 0) { cont++; if (cont === n) return new Date(d); }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  function ultimaSexta(ano, mes) {
    var d = new Date(ano, mes, 0);
    while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
    return new Date(d);
  }

  function datasDoAno(ano) {
    var out = [], p = pascoa(ano), i;
    for (i = 0; i < DATAS_FIXAS.length; i++) {
      var f = DATAS_FIXAS[i];
      out.push({
        nome: f.nome, emoji: f.emoji, tags: f.tags, cat: f.cat, ano: ano,
        data: f.d === 0 ? null : new Date(ano, f.m - 1, f.d),
        mesInteiro: f.d === 0, mes: f.m
      });
    }
    var carnaval = new Date(p); carnaval.setDate(p.getDate() - 47);
    var sextaSanta = new Date(p); sextaSanta.setDate(p.getDate() - 2);
    var corpus = new Date(p); corpus.setDate(p.getDate() + 60);
    out.push({ nome:'Carnaval', emoji:'🎭', cat:'novidade', ano:ano, data:carnaval, tags:['carnaval'] });
    out.push({ nome:'Sexta-feira Santa', emoji:'✝️', cat:'bastidores', ano:ano, data:sextaSanta, tags:['sexta-feira santa','sexta santa'] });
    out.push({ nome:'Páscoa', emoji:'🐣', cat:'novidade', ano:ano, data:p, tags:['pascoa'] });
    out.push({ nome:'Corpus Christi', emoji:'⛪', cat:'bastidores', ano:ano, data:corpus, tags:['corpus christi'] });
    var maes = nEsimoDomingo(ano, 5, 2);
    if (maes) out.push({ nome:'Dia das Mães', emoji:'💐', cat:'novidade', ano:ano, data:maes, tags:['dia das maes'] });
    var pais = nEsimoDomingo(ano, 8, 2);
    if (pais) out.push({ nome:'Dia dos Pais', emoji:'👔', cat:'novidade', ano:ano, data:pais, tags:['dia dos pais'] });
    var bf = ultimaSexta(ano, 11);
    out.push({ nome:'Black Friday', emoji:'🏷️', cat:'precos', ano:ano, data:bf, tags:['black friday'] });
    var cm = new Date(bf); cm.setDate(bf.getDate() + 3);
    out.push({ nome:'Cyber Monday', emoji:'💻', cat:'precos', ano:ano, data:cm, tags:['cyber monday'] });
    return out;
  }

  function cobertura(d, listaPosts) {
    var achados = [];
    for (var i = 0; i < listaPosts.length; i++) {
      var p = listaPosts[i];
      var curto = (p.titulo || '') + ' ' + (p.resumo || '');
      var longo = curto + ' ' + (p.conteudo || '');
      for (var j = 0; j < d.tags.length; j++) {
        var tag = d.tags[j];
        var alvo = (tag.indexOf(' ') !== -1) ? longo : curto;
        if (temTermo(alvo, tag)) { achados.push(p); break; }
      }
    }
    return achados;
  }

  function chaveDe(d) {
    if (d.mesInteiro) return 'M|' + norm(d.nome) + '|' + d.ano + '-' + d.mes;
    return 'D|' + norm(d.nome) + '|' + d.data.getFullYear() + '-' +
           (d.data.getMonth() + 1) + '-' + d.data.getDate();
  }

  function proximasDatas(listaPosts, janela) {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var limite = new Date(hoje); limite.setDate(hoje.getDate() + (janela || 45));
    var todas = datasDoAno(hoje.getFullYear()).concat(datasDoAno(hoje.getFullYear() + 1));
    var bruto = [], i, d;
    for (i = 0; i < todas.length; i++) {
      d = todas[i];
      if (d.mesInteiro) {
        var ini = new Date(d.ano, d.mes - 1, 1);
        var fim = new Date(d.ano, d.mes, 0);
        if (hoje >= ini && hoje <= fim) {
          bruto.push({ nome:d.nome, emoji:d.emoji, tags:d.tags, cat:d.cat, ano:d.ano,
                       mes:d.mes, data:ini, mesInteiro:true, dias:0 });
        } else if (ini > hoje && ini <= limite) {
          bruto.push({ nome:d.nome, emoji:d.emoji, tags:d.tags, cat:d.cat, ano:d.ano,
                       mes:d.mes, data:ini, mesInteiro:true,
                       dias: Math.round((ini - hoje) / 86400000) });
        }
        continue;
      }
      if (!d.data || d.data < hoje || d.data > limite) continue;
      bruto.push({ nome:d.nome, emoji:d.emoji, tags:d.tags, cat:d.cat, ano:d.ano,
                   data:d.data, mesInteiro:false,
                   dias: Math.round((d.data - hoje) / 86400000) });
    }
    bruto.sort(function (a, b) { return a.dias - b.dias; });
    var vistos = {}, final = [];
    for (i = 0; i < bruto.length; i++) {
      var k = chaveDe(bruto[i]);
      if (vistos[k]) continue;
      vistos[k] = true;
      bruto[i].coberto = cobertura(bruto[i], listaPosts);
      final.push(bruto[i]);
    }
    return final;
  }

  function quandoTexto(d) {
    if (!d) return '';
    if (d.mesInteiro) {
      if (d.dias === 0) return 'mês em andamento';
      return 'começa ' + fmtBR(d.data) + ' · em ' + d.dias + ' dia' + (d.dias === 1 ? '' : 's');
    }
    return fmtBR(d.data) + ' · em ' + d.dias + ' dia' + (d.dias === 1 ? '' : 's');
  }

  /* ============================================================
     6. ROTEIROS POR FORMATO
     ============================================================ */
  var ROTEIRO_BLOG = [
    { n:1, rot:'Capa',
      visual:'Fotografia editorial horizontal em formato de banner. Objeto 3D finalizado posicionado à direita do quadro, ocupando cerca de 40% da largura, com iluminação lateral marcada. À esquerda, amplo espaço negativo de fundo escuro liso. Profundidade de campo curta, fundo desfocado. Sem texto sobreposto. Sem logotipo.' }
  ];

  var ROTEIRO_FEED = [
    { n:1, rot:'Gancho',   visual:'Fotografia de produto em close, iluminação lateral suave, fundo escuro liso, textura de camadas de impressão 3D visível no objeto. Objeto único centralizado, cerca de 60% da largura. Muito espaço negativo ao redor.' },
    { n:2, rot:'Contexto', visual:'Cena real e acolhedora: mãos segurando uma peça 3D pequena e acabada, com detalhe de pintura feita à mão. Fundo desfocado em tons escuros. Luz quente, natural.' },
    { n:3, rot:'Ângulo',   visual:'Composição de três objetos 3D lado a lado sobre superfície escura, mesma altura, mesma iluminação, mesmo ângulo de câmera. Fundo liso escuro.' },
    { n:4, rot:'Prova',    visual:'Cena dividida na diagonal: metade superior mostra a tela de um software de modelagem 3D com o modelo digital; metade inferior mostra a peça física impressa e finalizada sobre a mesa.' },
    { n:5, rot:'Oferta',   visual:'Close fotográfico do acabamento manual: mãos lixando ou pintando uma peça 3D recém-impressa. Luz direcionada, fundo escuro.' },
    { n:6, rot:'Origem',   visual:'Impressora 3D em operação, com o bico extrudando filamento e a peça em construção. Estúdio organizado, luz focada na impressora. Não mostrar mãos.' },
    { n:7, rot:'CTA',      visual:'__CTA_FEED__' }
  ];

  var ROTEIRO_STORY = [
    { n:1, rot:'Gancho', visual:'Vertical 9:16. Fundo escuro liso com textura sutil. Objeto único grande e centralizado, ocupando cerca de 55% da altura, levemente abaixo do centro. Muito espaço livre no topo e na base. Nada de texto pequeno.' },
    { n:2, rot:'Prova',  visual:'Vertical 9:16. Close real do processo ou do acabamento: mãos trabalhando na peça, detalhe das camadas, ou a impressora em operação vista de perto. Iluminação lateral marcada. Objeto ocupando 50% do quadro, na metade inferior.' },
    { n:3, rot:'CTA',    visual:'__CTA_STORY__' }
  ];

  function visualCtaFeed(ctaKey) {
    if (ctaKey === 'projeto') {
      return 'Composição limpa sobre fundo escuro: uma peça 3D única e finalizada à direita do quadro. À esquerda, um esboço em papel da mesma peça, levemente desfocado. Abaixo do texto, apenas uma forma retangular sólida em laranja com o rótulo do botão em branco. Nenhum celular, tela, site ou interface.';
    }
    if (ctaKey === 'whats') {
      return 'Composição limpa sobre fundo escuro: três peças 3D pequenas em fila sobre superfície escura, ângulo levemente elevado. Abaixo do texto, apenas uma forma retangular sólida em laranja com o rótulo do botão em branco. Nenhum celular, tela, site, interface ou ícone de app.';
    }
    return 'Composição limpa sobre fundo escuro: duas peças 3D finalizadas, prontas, lado a lado sobre superfície escura, iluminação de vitrine. Abaixo do texto, apenas uma forma retangular sólida em laranja com o rótulo do botão em branco. Nenhum celular, tela, site, interface ou etiqueta de preço.';
  }

  function visualCtaStory(ctaKey) {
    if (ctaKey === 'projeto') {
      return 'Vertical 9:16. Fundo escuro liso. Uma peça 3D finalizada grande no centro-baixo, e um esboço em papel no topo, pequeno e desfocado. Deixe um espaço retangular vazio no centro-inferior, reservado para o adesivo de link. Nenhum celular, tela, site ou interface.';
    }
    if (ctaKey === 'whats') {
      return 'Vertical 9:16. Fundo escuro liso. Duas peças 3D finalizadas no centro-baixo, iluminação suave. Deixe um espaço retangular vazio no centro-inferior, reservado para o adesivo de link. Nenhum celular, tela, site ou ícone de app.';
    }
    return 'Vertical 9:16. Fundo escuro liso. Duas peças 3D prontas, lado a lado, no centro-baixo do quadro. Deixe um espaço retangular vazio no centro-inferior, reservado para o adesivo de link. Nenhum celular, tela, site ou etiqueta de preço.';
  }

  function roteiroDe(formato) {
    if (formato === 'blog') return ROTEIRO_BLOG;
    if (formato === 'story') return ROTEIRO_STORY;
    return ROTEIRO_FEED;
  }

  /* ============================================================
     7. PROMPT DE COPY
     ============================================================ */
  function gerarPromptCopy(listaPosts, alvo, formato, ctaKey, anguloKey) {
    var hoje = new Date();
    var datas = proximasDatas(listaPosts, 45);
    var cta = CTAS[ctaKey] || CTAS.loja;
    var ang = ANGULOS[anguloKey] || ANGULOS.produto;
    var fmt = FORMATOS[formato] || FORMATOS.feed;

    var pauta = alvo;
    if (!pauta) {
      for (var i = 0; i < datas.length; i++) {
        if (!datas[i].coberto.length) { pauta = datas[i]; break; }
      }
    }

    var L = [];
    L.push('Você é redator e social media da Meu 3D Labs.');
    L.push('');

    L.push('=== A MARCA ===');
    L.push('Nome: Meu 3D Labs');
    L.push('Site: ' + SITE);
    L.push('Estúdio próprio em Nilópolis/RJ. A peça é impressa aqui,');
    L.push('acabada à mão e enviada para todo o Brasil.');
    L.push('NUNCA escreva "produção artesanal": a impressão é feita por');
    L.push('máquina. O que é manual é o ACABAMENTO — diga isso.');
    L.push('Tom: moderno, direto, próximo, sem jargão desnecessário.');
    L.push('Público: entusiastas de 3D, colecionadores, quem procura');
    L.push('presente original e iniciantes curiosos.');
    L.push('Data de hoje: ' + fmtBR(hoje) + ' (' + DIAS_SEM[hoje.getDay()] + ')');
    L.push('');

    L.push('=== O CAMINHO DESTA CAMPANHA ===');
    L.push('CTA principal: ' + cta.ico + ' ' + cta.rot);
    L.push('Link: ' + cta.url);
    L.push('O que é: ' + cta.desc);
    L.push('Botão: "' + cta.verbo + '"');
    L.push(cta.foco);
    L.push('REGRA DURA: ' + cta.proibido);
    L.push('');
    L.push('Ângulo criativo: ' + ang.ico + ' ' + ang.rot);
    L.push(ang.linha);
    L.push('');
    L.push('Formato desta entrega: ' + fmt.ico + ' ' + fmt.rot);
    L.push(fmt.linha);
    L.push('');

    L.push('=== PUBLICAÇÕES JÁ EXISTENTES (' + listaPosts.length + ') ===');
    if (!listaPosts.length) {
      L.push('Nenhuma publicação ainda. Esta será a primeira.');
    } else {
      var ord = listaPosts.slice().sort(function (a, b) {
        return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
      });
      for (var j = 0; j < ord.length && j < 40; j++) {
        L.push('- [' + fmtBR(new Date(ord[j].criado_em || hoje)) + '] ' +
               (ord[j].titulo || '(sem título)') +
               '  (categoria: ' + (ord[j].categoria || 'novidade') + ')');
      }
      if (ord.length > 40) L.push('... e mais ' + (ord.length - 40) + ' publicações.');
    }
    L.push('');

    L.push('=== PAUTA DESTA PUBLICAÇÃO ===');
    if (pauta) {
      L.push(pauta.emoji + ' ' + pauta.nome +
             (pauta.data ? ' — ' + quandoTexto(pauta) : ''));
      if (pauta.coberto && pauta.coberto.length) {
        L.push('ATENÇÃO: já existe publicação ligada a este tema:');
        L.push('  "' + (pauta.coberto[0].titulo || '') + '"');
        L.push('Não repita o mesmo ângulo. Escolha outro enfoque.');
      } else {
        L.push('Este tema ainda não foi abordado. Pode explorar à vontade.');
      }
    } else {
      L.push('Nenhuma data pendente. Escolha um tema técnico útil que');
      L.push('ainda não apareça na lista de publicações acima.');
    }
    L.push('');
    L.push('Conecte a pauta ao universo de impressão 3D de forma natural.');
    L.push('Se a data não tiver relação óbvia com 3D, faça a ponte com');
    L.push('criatividade.');
    L.push('');

    var livres = datas.filter(function (d) {
      if (d.coberto.length) return false;
      if (pauta && pauta.data && chaveDe(d) === chaveDe(pauta)) return false;
      return true;
    });
    if (livres.length) {
      L.push('=== OUTRAS DATAS NA JANELA (contexto) ===');
      for (var k = 0; k < livres.length; k++) {
        L.push('- ' + livres[k].emoji + ' ' + livres[k].nome + ' — ' + quandoTexto(livres[k]));
      }
      L.push('');
    }

    L.push('=== O QUE ENTREGAR ===');
    L.push('');
    L.push('IMPORTANTE: nesta etapa entregue SOMENTE TEXTO.');
    L.push('NÃO gere, descreva nem proponha imagens. NÃO monte mosaico.');
    L.push('NÃO use ferramenta de geração de imagem. Só texto.');
    L.push('');

    /* ---------- BLOG ---------- */
    if (formato === 'blog') {
      L.push('--- PARTE 1 — POST DE BLOG ---');
      L.push('TÍTULO: (máx. 160 caracteres, direto, sem clickbait)');
      L.push('RESUMO: (entre 100 e 300 caracteres — é a meta description');
      L.push('         e também o texto do card do blog)');
      L.push('CATEGORIA: (escolha UMA: novidade, materiais, manutencao,');
      L.push('            precos, bastidores, iniciante)');
      L.push('CONTEÚDO: (800 a 1400 palavras, HTML simples com <p>, <h2>,');
      L.push('           <h3>, <strong>, <ul><li> e <a href>)');
      L.push('');
      L.push('Estrutura obrigatória do conteúdo:');
      L.push('- Abertura com 2 parágrafos curtos que situam o leitor.');
      L.push('- 3 a 4 subtítulos <h2> que dividem o assunto.');
      L.push('- Pelo menos um trecho com <ul><li> (lista de itens ou dicas).');
      L.push('- Um parágrafo final com CTA: "' + cta.verbo + '" → ' + cta.url);
      L.push('');
      L.push('--- PARTE 2 — ESTRATÉGIA DO POST ---');
      L.push('Explique em 5 a 7 linhas:');
      L.push('- 5 palavras-chave para o post (foco em busca no Google).');
      L.push('- Sugestão de 2 links internos do site (loja, blog, produto).');
      L.push('- Melhor dia e horário para publicar e o motivo.');
      L.push('- Uma frase curta para usar como resumo nas redes, ao');
      L.push('  anunciar esse post.');
      L.push('');
    }

    /* ---------- FEED ---------- */
    else if (formato === 'feed') {
      L.push('--- PARTE 1 — TEXTO DOS 7 SLIDES DO FEED ---');
      L.push('Formato do carrossel: 1080 x 1350 px (4:5 retrato).');
      L.push('Entregue 7 linhas, nesta estrutura exata, uma por slide:');
      L.push('');
      L.push('SLIDE 1 | GANCHO: (frase de até 8 palavras que pare o scroll)');
      L.push('SLIDE 2 | CONTEXTO: (frase de até 8 palavras)');
      L.push('SLIDE 3 | ÂNGULO: (frase de até 8 palavras, dentro do ângulo ' + ang.rot + ')');
      L.push('SLIDE 4 | PROVA: (frase de até 8 palavras — processo ou detalhe real)');
      L.push('SLIDE 5 | OFERTA: (frase de até 8 palavras — o que o cliente recebe)');
      L.push('SLIDE 6 | ORIGEM: (frase de até 8 palavras — estúdio próprio em Nilópolis, impresso aqui)');
      L.push('SLIDE 7 | CTA: (frase de até 8 palavras + botão "' + cta.verbo + '" + URL ' + cta.url + ')');
      L.push('');
      L.push('Regras do texto dos slides:');
      L.push('- Sem emoji.');
      L.push('- Frases curtas, no máximo 8 palavras no destaque.');
      L.push('- Linguagem de quem fala, não de catálogo.');
      L.push('- O slide 1 não começa com "Descubra" nem "Conheça".');
      L.push('- NUNCA use a palavra "artesanal" para a impressão.');
      L.push('- ' + cta.proibido);
      L.push('');
      L.push('--- PARTE 2 — LEGENDA E HASHTAGS ---');
      L.push('LEGENDA:');
      L.push('- Primeira linha é o gancho (aparece antes do "ver mais").');
      L.push('- 3 a 5 parágrafos curtos, no máximo 2 linhas cada.');
      L.push('- CTA explícito: ' + cta.verbo + ' → ' + cta.url);
      L.push('- Uma pergunta que gere comentário.');
      L.push('- Pedido para salvar e compartilhar.');
      L.push('');
      L.push('HASHTAGS: 25 a 30, misturando:');
      L.push('- 4 amplas de alto volume (impressao3d, 3dprinting)');
      L.push('- 8 de nicho (colecionavel, chaveiro3d, decoracao3d)');
      L.push('- 6 de intenção de compra (presenteoriginal, personalizado)');
      L.push('- 4 locais (nilopolis, riodejaneiro, baixadefluminense)');
      L.push('- 3 da data comemorativa');
      L.push('');
      L.push('--- PARTE 3 — ESTRATÉGIA ---');
      L.push('Explique em 5 a 7 linhas:');
      L.push('- Melhor horário de publicação e o motivo.');
      L.push('- Qual slide tende a gerar salvamento.');
      L.push('- Uma ideia de Stories para impulsionar o post.');
      L.push('- Uma variação de gancho para testar em Reels.');
      L.push('');
    }

    /* ---------- STORY ---------- */
    else {
      L.push('--- PARTE 1 — ROTEIRO DE 3 STORIES ---');
      L.push('Formato: vertical 1080 x 1920 px (9:16).');
      L.push('São 3 stories em sequência, no mesmo dia, em ordem.');
      L.push('Para cada um, entregue exatamente assim:');
      L.push('');
      L.push('STORY 1 | GANCHO');
      L.push('  FRASE: (máximo 6 palavras — é o adesivo de texto, curta,');
      L.push('          grande, de impacto)');
      L.push('  ADESIVO: (enquete, quiz, emoji slider, caixinha de perguntas,');
      L.push('            contagem regressiva ou nenhum)');
      L.push('  APOIO: (se usar enquete ou quiz, as duas opções)');
      L.push('');
      L.push('STORY 2 | PROVA');
      L.push('  FRASE: (máximo 6 palavras)');
      L.push('  ADESIVO: (idem)');
      L.push('  APOIO: (opções, se houver)');
      L.push('');
      L.push('STORY 3 | CTA');
      L.push('  FRASE: (máximo 6 palavras)');
      L.push('  ADESIVO: link');
      L.push('  APOIO: (texto do botão: "' + cta.verbo + '")');
      L.push('');
      L.push('Regras dos stories:');
      L.push('- Frase de impacto. Nada de parágrafo.');
      L.push('- Sem emoji dentro do texto da imagem.');
      L.push('- O story 1 tem que dar vontade de tocar no 2.');
      L.push('- O story 3 leva ao link ' + cta.url);
      L.push('- ' + cta.proibido);
      L.push('');
      L.push('--- PARTE 2 — LEGENDA CURTA ---');
      L.push('Se esses stories virarem post depois, esta é a legenda:');
      L.push('- 2 parágrafos curtos, no máximo 2 linhas cada.');
      L.push('- CTA explícito: ' + cta.verbo + ' → ' + cta.url);
      L.push('- 8 a 12 hashtags (menos que no feed).');
      L.push('');
      L.push('--- PARTE 3 — ESTRATÉGIA ---');
      L.push('Explique em 6 a 8 linhas, com horários concretos:');
      L.push('- Horário de cada um dos 3 stories (ex.: 09h, 12h30, 19h).');
      L.push('- Por que nesse horário.');
      L.push('- Uma ideia de interação extra no story 2.');
      L.push('- Como reaproveitar esse conteúdo em Reels depois.');
      L.push('');
    }

    L.push('=== REGRAS GERAIS ===');
    L.push('- Português do Brasil.');
    L.push('- Sem emoji no conteúdo do blog.');
    L.push('- Não citar personagens, franquias ou marcas de terceiros.');
    L.push('- Não mencionar assistência técnica.');
    L.push('- Toda chamada para ação aponta para ' + cta.url);
    L.push('- Não repetir título nem ângulo de publicação existente.');
    L.push('');
    L.push('LEMBRE: apenas texto nesta resposta. Nenhuma imagem.');

    return L.join('\n');
  }

  /* ============================================================
     8. PROMPT DE IMAGEM
     ============================================================ */
  function gerarPromptImagem(pauta, slide, ctaKey, anguloKey, formato) {
    var cta = CTAS[ctaKey] || CTAS.loja;
    var ang = ANGULOS[anguloKey] || ANGULOS.produto;
    var fmt = FORMATOS[formato] || FORMATOS.feed;
    var nomePauta = pauta ? (pauta.emoji + ' ' + pauta.nome) : 'tema livre';
    var total = roteiroDe(formato).length;

    var vis;
    if (slide.visual === '__CTA_FEED__') vis = visualCtaFeed(ctaKey);
    else if (slide.visual === '__CTA_STORY__') vis = visualCtaStory(ctaKey);
    else vis = slide.visual;

    var rotulo = (formato === 'blog') ? 'Imagem' :
                 (formato === 'story') ? 'Story' : 'Slide';

    var L = [];
    L.push('GERE UMA ÚNICA IMAGEM.');
    L.push('Não crie mosaico, grade, prancha, colagem, quadro de referências');
    L.push('nem múltiplos painéis. Apenas UMA imagem.');
    L.push('');
    L.push('Formato: ' + fmt.aspect + '.');
    L.push('');
    L.push('=== MARCA ===');
    L.push('Meu 3D Labs — estúdio de impressão 3D, Nilópolis/RJ.');
    L.push('A impressão é feita em máquina; o acabamento é manual.');
    L.push('NUNCA escreva "artesanal" junto de imagem de impressora.');
    L.push('Fundo: #0f1e3d (azul-marinho muito escuro).');
    L.push('Cor de destaque: #f26522 (laranja).');
    L.push('Estilo: fotográfico, limpo, moderno, sem poluição visual.');
    L.push('');
    L.push('=== ESTA IMAGEM ===');
    L.push(rotulo + ' ' + slide.n + ' de ' + total + ' · ' + slide.rot);
    L.push('Assunto: ' + nomePauta);
    L.push('Ângulo: ' + ang.rot + ' — ' + ang.linha);
    if (slide.rot === 'CTA') {
      L.push('Destino do CTA: ' + cta.rot + ' (' + cta.url + ')');
    }
    L.push('');

    if (formato === 'blog') {
      L.push('TEXTO NA IMAGEM:');
      L.push('NENHUM. Esta é a imagem de capa do blog — o título fica no');
      L.push('HTML da página, não dentro da foto. Não escreva palavra alguma.');
    } else if (formato === 'story') {
      L.push('TEXTO QUE DEVE APARECER NA IMAGEM:');
      L.push('Use exatamente a FRASE do STORY ' + slide.n + ' que você escreveu');
      L.push('na resposta anterior desta mesma conversa. Se não houver, peça');
      L.push('a frase antes de gerar — não invente.');
      L.push('A frase é curta (máximo 6 palavras), grande e centralizada.');
      if (slide.rot === 'CTA') {
        L.push('O botão deve dizer: "' + cta.verbo + '"');
        L.push('E a URL ' + cta.url + ' deve aparecer legível abaixo do botão.');
      }
    } else {
      L.push('TEXTO QUE DEVE APARECER NA IMAGEM:');
      L.push('Use exatamente o texto do SLIDE ' + slide.n + ' que você escreveu');
      L.push('na resposta anterior desta mesma conversa. Se não houver, peça');
      L.push('a frase antes de gerar — não invente.');
      if (slide.rot === 'CTA') {
        L.push('O botão deve dizer: "' + cta.verbo + '"');
        L.push('E a URL ' + cta.url + ' deve aparecer legível abaixo do botão.');
      }
    }
    L.push('');
    L.push('DESCRIÇÃO VISUAL:');
    L.push(vis);
    L.push('');
    L.push('=== COMPOSIÇÃO ===');

    if (formato === 'blog') {
      L.push('- Banner horizontal: objeto à direita, espaço negativo à esquerda.');
      L.push('- Nenhum texto sobreposto, nenhuma moldura.');
      L.push('- Nenhuma zona segura de rede social — é capa de site.');
      L.push('- Nitidez alta, composição editorial.');
    } else if (formato === 'story') {
      L.push('- 260 px livres no topo e 340 px livres na base (barra de');
      L.push('  resposta do Instagram). Não coloque texto nessas faixas.');
      L.push('- Deixe um espaço livre no centro-inferior para o adesivo.');
      L.push('- Texto em branco puro (#ffffff), palavra-chave em laranja (#f26522).');
      L.push('- Tipografia sans-serif, negrito, corpo MUITO grande.');
      L.push('- Texto centralizado, no máximo 2 linhas, 6 palavras no total.');
    } else {
      L.push('- 250 px livres no topo e 320 px livres na base (zona segura).');
      L.push('- Texto em branco puro (#ffffff), palavra-chave em laranja (#f26522).');
      L.push('- Tipografia sans-serif, negrito, corpo grande, legível no celular.');
      L.push('- Texto alinhado à esquerda, começando a 90 px da borda.');
      L.push('- Máximo 2 linhas de texto.');
    }

    L.push('');
    L.push('=== PROIBIDO ===');
    L.push('- Mosaico, grade, colagem, vários painéis na mesma imagem.');
    L.push('- NENHUM preço, valor em reais, cifrão, etiqueta, "R$" ou número de valor.');
    L.push('- NENHUMA tela, celular, tablet, notebook, navegador, print de site,');
    L.push('  interface, app, e-commerce, carrinho de compras ou mockup de página.');
    L.push('- NENHUM logotipo, marca d\'água, assinatura ou logo inventada.');
    L.push('- NENHUM nome de produto inventado nem lista de produtos com valores.');
    L.push('- Nenhum adesivo, ícone ou elemento de interface do Instagram.');
    L.push('- Emoji dentro da imagem.');
    L.push('- Referência a personagens, franquias ou marcas de terceiros.');
    L.push('');
    L.push('Gere agora apenas ' + rotulo.toLowerCase() + ' ' + slide.n + '. Uma imagem única.');
    return L.join('\n');
  }

  /* ============================================================
     9. GANCHOS
     ============================================================ */
  var GANCHOS = {
    curiosidade: { rot:'Curiosidade', ico:'🔍', lista:[
      'Ninguém faz isso à mão. Vem ver.',
      'Isso levou 14 horas. E não é o mais demorado.',
      'O erro que quase todo mundo comete na primeira peça.',
      'A peça que ninguém pede, mas todo mundo quer.',
      'Tem um detalhe aqui que só quem imprime vê.',
      'Isso não é impresso em série. É um por vez.'
    ]},
    dor: { rot:'Dor', ico:'😩', lista:[
      'Procurou presente e não achou nada?',
      'Aquele presente genérico de novo?',
      'Cansou de dar o mesmo presente todo ano?',
      'Sabe quando a peça solta da mesa?',
      'Já comprou algo que não tinha nada a ver com você?'
    ]},
    prova: { rot:'Prova social', ico:'⭐', lista:[
      'Cliente pediu. Nós imprimimos. Olha o resultado.',
      'Três pessoas pediram a mesma peça essa semana.',
      'A peça que mais sai daqui.',
      'Essa foi difícil. E ficou assim.',
      'Saiu daqui ontem. Já está na casa de alguém.'
    ]},
    contraste: { rot:'Contraste', ico:'⚡', lista:[
      'Não é comprado pronto. É feito pra você.',
      'Não é brinquedo de plástico. É peça de estúdio.',
      'Não é importado. É feito aqui em Nilópolis.',
      'Não é caro. É personalizado.',
      'Não é igual. É único.'
    ]},
    lista: { rot:'Lista', ico:'📋', lista:[
      '3 coisas que ninguém te conta sobre impressão 3D.',
      'O que faz uma peça durar anos.',
      'Dois erros que estragam a peça.',
      'Isso, isso e isso. Nunca mais fica sem.',
      'Três presentes que ninguém espera.'
    ]},
    pergunta: { rot:'Pergunta', ico:'❓', lista:[
      'Qual dessas você levaria?',
      'Você daria isso de presente?',
      'Natal, aniversário ou "só porque"?',
      'Preto ou laranja?',
      'Você sabe o que é isso?'
    ]}
  };

  /* ============================================================
     10. TEMAS TÉCNICOS (preenchem dias sem data)
     ============================================================ */
  var TEMAS_TECNICOS = [
    { nome:'Guia de filamentos',        emoji:'🧵', angulo:'processo', cta:'loja' },
    { nome:'Bastidores do estúdio',     emoji:'🏭', angulo:'processo', cta:'projeto' },
    { nome:'Como conservar sua peça',   emoji:'🧴', angulo:'produto',  cta:'loja' },
    { nome:'Peça mais pedida da semana',emoji:'🔥', angulo:'produto',  cta:'loja' },
    { nome:'Do esboço à estante',       emoji:'✏️', angulo:'processo', cta:'projeto' },
    { nome:'Presente que fica na memória', emoji:'🎁', angulo:'presente', cta:'loja' },
    { nome:'Acabamento feito à mão',    emoji:'🖐️', angulo:'processo', cta:'projeto' }
  ];

  /* ============================================================
     11. ESTADO
     ============================================================ */
  var pautasCache = [];
  var pautaSel = null;
  var pautaForcada = null;
  var formatoSel = 'feed';
  var ctaSel = 'loja';
  var anguloSel = 'produto';
  var painelAberto = '';
  var anoCal = new Date().getFullYear();
  var catGancho = 'curiosidade';

  function pautaAtual() {
    if (pautaForcada) return pautaForcada;
    return (pautaSel !== null) ? pautasCache[pautaSel] : null;
  }

  /* ============================================================
     12. PAINEL
     ============================================================ */
  function abrirPainel(qual) {
    var area = document.getElementById('bfPautaArea');
    if (!area) return;
    if (painelAberto === qual) { area.innerHTML = ''; painelAberto = ''; return; }
    painelAberto = qual;
    if (qual === 'pauta') renderPauta(area);
    else if (qual === 'calendario') renderCalendario(area);
    else if (qual === 'plano') renderPlano(area);
    else if (qual === 'ganchos') renderGanchos(area);
    else if (qual === 'validador') renderValidador(area);
    else if (qual === 'utm') renderUtm(area);
    else if (qual === 'salvas') renderSalvas(area);
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPauta(area) {
    var lista = getPosts();
    pautasCache = proximasDatas(lista, 45);
    pautaSel = null;
    pautaForcada = null;

    var livres = pautasCache.filter(function (d) { return !d.coberto.length; }).length;

    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>🧠 Pauta inteligente</h3>');
    h.push('<p class="bf-sub">Escolha a data, o formato, o destino do clique e o ângulo. ' +
           'O prompt inteiro se adapta a cada escolha.</p>');
    h.push('<div class="bf-alerta ok">✅ ' + lista.length + ' publicação' +
           (lista.length === 1 ? '' : 'ões') + ' lida' + (lista.length === 1 ? '' : 's') +
           ' · ' + livres + ' data' + (livres === 1 ? '' : 's') + ' livre' +
           (livres === 1 ? '' : 's') + ' em 45 dias</div>');

    h.push('<div class="bf-sel-topo">');
    h.push('<button type="button" class="bf-auto on" id="bfAuto" onclick="bfAutoPauta()">⚡ Automático (mais próxima livre)</button>');
    h.push('</div>');

    if (pautasCache.length) {
      h.push('<div class="bf-datas">');
      for (var i = 0; i < pautasCache.length; i++) {
        var d = pautasCache[i];
        var livre = d.coberto.length === 0;
        var urgente = livre && d.dias <= 10 && !d.mesInteiro;
        h.push('<button type="button" class="bf-data ' + (livre ? 'livre' : 'coberto') +
               '" data-idx="' + i + '" onclick="bfEscolherPauta(' + i + ')">');
        h.push('<span class="bf-emoji">' + d.emoji + '</span>');
        h.push('<span class="bf-corpo">');
        h.push('<span class="bf-nome">' + esc(d.nome));
        if (livre) {
          h.push('<span class="bf-tag ' + (urgente ? 'urgente' : 'livre') + '">' +
                 (urgente ? 'urgente' : 'livre') + '</span>');
        } else {
          h.push('<span class="bf-tag coberto">já publicado</span>');
        }
        h.push('</span>');
        h.push('<span class="bf-quando">' + quandoTexto(d) +
               (d.coberto.length ? ' · "' + esc(d.coberto[0].titulo || '') + '"' : '') + '</span>');
        h.push('</span>');
        h.push('<span class="bf-seta">›</span>');
        h.push('</button>');
      }
      h.push('</div>');
    } else {
      h.push('<div class="bf-alerta aviso">Nenhuma data comemorativa nos próximos 45 dias.</div>');
    }

    /* formato */
    h.push('<span class="bf-rotulo" style="margin-top:6px;">Formato</span>');
    h.push('<div class="bf-modos">');
    h.push('<button type="button" class="bf-modo" data-fmt="blog" onclick="bfFormato(\'blog\')">📰 Blog</button>');
    h.push('<button type="button" class="bf-modo on" data-fmt="feed" onclick="bfFormato(\'feed\')">📱 Feed Instagram</button>');
    h.push('<button type="button" class="bf-modo" data-fmt="story" onclick="bfFormato(\'story\')">⚡ Story Instagram</button>');
    h.push('</div>');
    h.push('<div class="bf-alerta aviso" id="bfFmtAviso" style="margin-top:0;"></div>');

    /* CTA */
    h.push('<span class="bf-rotulo" style="margin-top:12px;">Para onde o clique vai</span>');
    h.push('<div class="bf-modos">');
    h.push('<button type="button" class="bf-modo on" data-cta="loja" onclick="bfCta(\'loja\')">🛍️ Loja · pronta entrega</button>');
    h.push('<button type="button" class="bf-modo" data-cta="projeto" onclick="bfCta(\'projeto\')">✨ Enviar projeto · personalizado</button>');
    h.push('<button type="button" class="bf-modo" data-cta="whats" onclick="bfCta(\'whats\')">💬 WhatsApp</button>');
    h.push('</div>');
    h.push('<div class="bf-alerta aviso" id="bfCtaAviso" style="margin-top:0;"></div>');

    /* ângulo */
    h.push('<span class="bf-rotulo" style="margin-top:12px;">Ângulo</span>');
    h.push('<div class="bf-modos">');
    h.push('<button type="button" class="bf-modo on" data-ang="produto" onclick="bfAngulo(\'produto\')">🎯 Peça em foco</button>');
    h.push('<button type="button" class="bf-modo" data-ang="processo" onclick="bfAngulo(\'processo\')">🖨️ Processo</button>');
    h.push('<button type="button" class="bf-modo" data-ang="presente" onclick="bfAngulo(\'presente\')">🎁 Presente</button>');
    h.push('</div>');

    /* abas */
    h.push('<div class="bf-tabs">');
    h.push('<button type="button" class="bf-tab on" data-aba="copy" onclick="bfAba(\'copy\')">📝 1. Copy (texto)</button>');
    h.push('<button type="button" class="bf-tab" data-aba="img" onclick="bfAba(\'img\')" id="bfTabImg">🖼️ 2. Imagens</button>');
    h.push('</div>');

    h.push('<div id="bfSaidaCopy">');
    h.push('<label class="bf-rotulo">Prompt de copy</label>');
    h.push('<textarea class="bf-prompt" id="bfPromptTxt" readonly></textarea>');
    h.push('<div class="bf-prompt-acoes">');
    h.push('<button class="bf-btn prim" type="button" onclick="bfCopiarPrompt()">📋 Copiar copy</button>');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfAbrirIA()">🤖 Abrir numa IA</button>');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfSalvarPauta()">💾 Salvar pauta</button>');
    h.push('</div>');
    h.push('</div>');

    h.push('<div id="bfSaidaImg" style="display:none;">');
    h.push('<div class="bf-alerta aviso" id="bfImgAviso"></div>');
    h.push('<div class="bf-prompt-acoes" style="margin-bottom:12px;">');
    h.push('<button class="bf-btn ok" type="button" onclick="bfCopiarTodosSlides()">📋 Copiar todos</button>');
    h.push('</div>');
    h.push('<div class="bf-slides" id="bfSlides"></div>');
    h.push('</div>');

    h.push('<div class="bf-prompt-acoes" style="margin-top:14px;">');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfFechar()">Fechar</button>');
    h.push('</div>');
    h.push('</div>');

    area.innerHTML = h.join('');
    atualizarSaida();
  }

  function atualizarSaida() {
    var cta = CTAS[ctaSel] || CTAS.loja;
    var fmt = FORMATOS[formatoSel] || FORMATOS.feed;

    var avCta = document.getElementById('bfCtaAviso');
    if (avCta) avCta.textContent = cta.ico + ' ' + cta.desc + ' → ' + cta.url;

    var avFmt = document.getElementById('bfFmtAviso');
    if (avFmt) avFmt.textContent = fmt.ico + ' ' + fmt.linha;

    var ta = document.getElementById('bfPromptTxt');
    if (ta) ta.value = gerarPromptCopy(getPosts(), pautaAtual(), formatoSel, ctaSel, anguloSel);

    var rot = roteiroDe(formatoSel);
    var avImg = document.getElementById('bfImgAviso');
    if (avImg) {
      if (formatoSel === 'blog') {
        avImg.innerHTML = '📰 <b>1 imagem de capa horizontal 1200×630.</b> ' +
          'Cole na <b>mesma conversa</b> onde gerou o texto do blog.';
      } else if (formatoSel === 'story') {
        avImg.innerHTML = '⚡ <b>3 stories verticais 1080×1920.</b> Cole na <b>mesma conversa</b> ' +
          'onde gerou o copy, <b>um de cada vez</b>. Publique na ordem 1 → 2 → 3.';
      } else {
        avImg.innerHTML = '⚠️ <b>7 slides 1080×1350.</b> Cole na <b>mesma conversa</b> onde gerou o copy. ' +
          'Cole <b>um de cada vez</b> — nunca todos juntos, senão a IA monta mosaico.';
      }
    }

    var tabImg = document.getElementById('bfTabImg');
    if (tabImg) {
      tabImg.textContent = (formatoSel === 'blog') ? '🖼️ 2. Imagem de capa (1)'
                         : (formatoSel === 'story') ? '⚡ 2. Imagens (3 stories)'
                         : '🖼️ 2. Imagens (7 slides)';
    }

    var box = document.getElementById('bfSlides');
    if (box) {
      var p = pautaAtual();
      var h = [];
      window.__bfSlides = {};
      var rotulo = (formatoSel === 'blog') ? 'IMAGEM' : (formatoSel === 'story') ? 'STORY' : 'SLIDE';
      for (var i = 0; i < rot.length; i++) {
        var s = rot[i];
        var txt = gerarPromptImagem(p, s, ctaSel, anguloSel, formatoSel);
        window.__bfSlides[s.n] = txt;
        h.push('<div class="bf-slide">');
        h.push('<div class="bf-slide-topo">');
        h.push('<span class="bf-slide-num">' + s.n + '</span>');
        h.push('<span class="bf-slide-rot">' + s.rot + '</span>');
        h.push('<button type="button" class="bf-slide-copiar" onclick="bfCopiarSlide(' + s.n + ')">Copiar</button>');
        h.push('</div>');
        h.push('<pre id="bfSlideTxt' + s.n + '">' + esc(txt) + '</pre>');
        h.push('</div>');
      }
      box.innerHTML = h.join('');
      window.__bfRotulo = rotulo;
    }

    var botoes = document.querySelectorAll('.bf-data');
    for (var k = 0; k < botoes.length; k++) {
      botoes[k].classList.toggle('sel', String(pautaSel) === botoes[k].getAttribute('data-idx'));
    }
    var auto = document.getElementById('bfAuto');
    if (auto) auto.classList.toggle('on', pautaSel === null && pautaForcada === null);
  }

  function escolherPauta(idx) {
    pautaForcada = null;
    pautaSel = (pautaSel === idx) ? null : idx;
    atualizarSaida();
  }
  function autoPauta() { pautaSel = null; pautaForcada = null; atualizarSaida(); }

  function mudarFormato(f) {
    formatoSel = f;
    var bs = document.querySelectorAll('.bf-modo[data-fmt]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-fmt') === f);
    }
    atualizarSaida();
  }

  function mudarCta(c) {
    ctaSel = c;
    var bs = document.querySelectorAll('.bf-modo[data-cta]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-cta') === c);
    }
    atualizarSaida();
  }

  function mudarAngulo(a) {
    anguloSel = a;
    var bs = document.querySelectorAll('.bf-modo[data-ang]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].classList.toggle('on', bs[i].getAttribute('data-ang') === a);
    }
    atualizarSaida();
  }

  function mudarAba(a) {
    var ts = document.querySelectorAll('.bf-tab');
    for (var i = 0; i < ts.length; i++) {
      ts[i].classList.toggle('on', ts[i].getAttribute('data-aba') === a);
    }
    var c = document.getElementById('bfSaidaCopy');
    var m = document.getElementById('bfSaidaImg');
    if (c) c.style.display = (a === 'copy') ? 'block' : 'none';
    if (m) m.style.display = (a === 'img') ? 'block' : 'none';
  }

  function copiarTexto(txt) {
    if (!txt) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast('📋 Copiado!', 'ok'); });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    toast(ok ? '📋 Copiado!' : 'Selecione e copie manualmente.', ok ? 'ok' : 'erro');
  }

  function copiarPrompt() {
    var ta = document.getElementById('bfPromptTxt');
    if (ta) copiarTexto(ta.value);
  }

  function copiarSlide(n) {
    var t = window.__bfSlides && window.__bfSlides[n];
    if (t) { copiarTexto(t); return; }
    var pre = document.getElementById('bfSlideTxt' + n);
    if (pre) copiarTexto(pre.textContent);
  }

  function copiarTodosSlides() {
    var s = window.__bfSlides || {};
    var rot = roteiroDe(formatoSel);
    var rotulo = window.__bfRotulo || 'SLIDE';
    var partes = [];
    for (var i = 0; i < rot.length; i++) {
      var n = rot[i].n;
      if (s[n]) partes.push('========== ' + rotulo + ' ' + n + ' ==========\n' + s[n]);
    }
    copiarTexto(partes.join('\n\n'));
  }

  function abrirIA() {
    copiarPrompt();
    window.open('https://chat.openai.com/', '_blank', 'noopener');
  }

  function fechar() {
    var area = document.getElementById('bfPautaArea');
    if (area) area.innerHTML = '';
    painelAberto = '';
    pautaSel = null;
    pautaForcada = null;
  }

  /* ============================================================
     13. PLANO DE 7 DIAS — CORRIGIDO
     Regra: data comemorativa só no dia exato (feed) e no dia
     seguinte (story). Nunca antes. Nunca 2 dias depois.
     ============================================================ */
  function montarPlano() {
    var lista = getPosts();
    var datas = proximasDatas(lista, 30).filter(function (d) {
      return !d.coberto.length && !d.mesInteiro && d.data;
    });

    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    /* mapa por dia: 'YYYY-M-D' */
    var mapa = {};
    for (var i = 0; i < datas.length; i++) {
      var d = datas[i];
      var k = d.data.getFullYear() + '-' + (d.data.getMonth() + 1) + '-' + d.data.getDate();
      mapa[k] = d;
    }

    function chave(dt) {
      return dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
    }

    var formatosBase = ['feed', 'story', 'feed', 'story', 'feed', 'story', 'feed'];
    var plano = [], temaIdx = 0;

    for (var n = 0; n < 7; n++) {
      var dia = new Date(hoje); dia.setDate(hoje.getDate() + n);
      var kDia = chave(dia);

      var pauta = mapa[kDia] || null;
      var reaproveitada = false;

      /* sem data hoje? tenta reaproveitar a de ontem, só em story */
      if (!pauta && n > 0) {
        var ontem = new Date(hoje); ontem.setDate(hoje.getDate() + n - 1);
        var kOntem = chave(ontem);
        if (mapa[kOntem] && formatosBase[n] === 'story') {
          pauta = mapa[kOntem];
          reaproveitada = true;
        }
      }

      var tema = TEMAS_TECNICOS[temaIdx % TEMAS_TECNICOS.length];
      var formato, angulo, cta;

      if (pauta) {
        formato = reaproveitada ? 'story' : 'feed';
        var ciclo = ['produto', 'processo', 'presente'];
        angulo = ciclo[n % 3];
        cta = (n % 2 === 0) ? 'loja' : 'projeto';
      } else {
        formato = formatosBase[n];
        angulo = tema.angulo;
        cta = tema.cta;
        temaIdx++;
      }

      plano.push({
        data: dia,
        diaCur: DIAS_CUR[dia.getDay()],
        diaNum: dia.getDate(),
        pauta: pauta,
        tema: pauta ? null : tema,
        reaproveitada: reaproveitada,
        formato: formato,
        angulo: angulo,
        cta: cta
      });
    }

    return plano;
  }

  function renderPlano(area) {
    var plano = montarPlano();
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>📆 Plano de 7 dias</h3>');
    h.push('<p class="bf-sub">Cada data comemorativa aparece <b>no dia exato (Feed)</b> e, ' +
           'no máximo, <b>no dia seguinte (Story)</b>. Dias sem data recebem tema técnico.</p>');

    h.push('<div class="bf-plano">');
    for (var i = 0; i < plano.length; i++) {
      var p = plano[i];
      var ehHoje = (p.data - hoje) === 0;
      var fmt = FORMATOS[p.formato];
      var ang = ANGULOS[p.angulo];
      var cta = CTAS[p.cta];

      h.push('<div class="bf-plano-dia' + (ehHoje ? ' hoje' : '') + '">');
      h.push('<div class="bf-pd-dia">' + p.diaCur + '<b>' + String(p.diaNum).padStart(2, '0') + '</b></div>');
      h.push('<div class="bf-pd-corpo">');
      h.push('<div class="bf-pd-topo">');
      if (p.pauta) {
        h.push(p.pauta.emoji + ' ' + esc(p.pauta.nome));
        if (p.reaproveitada) h.push('<span class="bf-pd-tema">reaproveitado</span>');
      } else {
        h.push(p.tema.emoji + ' ' + esc(p.tema.nome));
        h.push('<span class="bf-pd-tema">tema técnico</span>');
      }
      h.push('<span class="bf-pd-tag ' + p.formato + '">' + fmt.ico + ' ' + fmt.rot + '</span>');
      h.push('</div>');
      h.push('<div class="bf-pd-sub">' + ang.ico + ' ' + ang.rot + ' · ' +
             cta.ico + ' ' + cta.rot + '</div>');
      h.push('</div>');
      h.push('<button type="button" class="bf-pd-btn" onclick="bfUsarDoPlano(' + i + ')">Abrir pauta</button>');
      h.push('</div>');
    }
    h.push('</div>');

    h.push('<div class="bf-prompt-acoes" style="margin-top:14px;">');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfFechar()">Fechar</button>');
    h.push('</div>');
    h.push('</div>');

    area.innerHTML = h.join('');
    window.__bfPlano = plano;
  }

  function usarDoPlano(i) {
    var plano = window.__bfPlano || [];
    var p = plano[i];
    if (!p) return;

    painelAberto = 'pauta';
    renderPauta(document.getElementById('bfPautaArea'));

    formatoSel = p.formato;
    anguloSel = p.angulo;
    ctaSel = p.cta;

    var bf = document.querySelectorAll('.bf-modo[data-fmt]');
    for (var a = 0; a < bf.length; a++) {
      bf[a].classList.toggle('on', bf[a].getAttribute('data-fmt') === p.formato);
    }
    var bc = document.querySelectorAll('.bf-modo[data-cta]');
    for (var b = 0; b < bc.length; b++) {
      bc[b].classList.toggle('on', bc[b].getAttribute('data-cta') === p.cta);
    }
    var bg = document.querySelectorAll('.bf-modo[data-ang]');
    for (var c = 0; c < bg.length; c++) {
      bg[c].classList.toggle('on', bg[c].getAttribute('data-ang') === p.angulo);
    }

    if (p.pauta) {
      pautaForcada = null;
      for (var j = 0; j < pautasCache.length; j++) {
        if (chaveDe(pautasCache[j]) === chaveDe(p.pauta)) { pautaSel = j; break; }
      }
    } else {
      pautaSel = null;
      pautaForcada = {
        nome: p.tema.nome,
        emoji: p.tema.emoji,
        coberto: [],
        data: p.data,
        dias: 0,
        mesInteiro: false
      };
    }

    atualizarSaida();
    toast('📆 Pauta de ' + DIAS_SEM[p.data.getDay()] + ' carregada.', 'ok');
  }

  /* ============================================================
     14. GANCHOS
     ============================================================ */
  function renderGanchos(area) {
    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>🎣 Ganchos prontos</h3>');
    h.push('<p class="bf-sub">O slide 1 decide se a pessoa para ou rola. ' +
           'Copie e use como primeira linha do carrossel, do story ou da legenda.</p>');

    h.push('<div class="bf-ganhos-cat">');
    var chaves = Object.keys(GANCHOS);
    for (var i = 0; i < chaves.length; i++) {
      var k = chaves[i];
      var g = GANCHOS[k];
      h.push('<button type="button" class="bf-modo' + (catGancho === k ? ' on' : '') +
             '" onclick="bfCatGancho(\'' + k + '\')">' + g.ico + ' ' + g.rot + '</button>');
    }
    h.push('</div>');

    var cat = GANCHOS[catGancho] || GANCHOS.curiosidade;
    for (var j = 0; j < cat.lista.length; j++) {
      h.push('<div class="bf-gancho">');
      h.push('<span class="bf-g-txt">' + esc(cat.lista[j]) + '</span>');
      h.push('<button type="button" class="bf-g-copiar" onclick="bfCopiarGancho(' + j + ')">Copiar</button>');
      h.push('</div>');
    }

    h.push('<div class="bf-prompt-acoes" style="margin-top:14px;">');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfFechar()">Fechar</button>');
    h.push('</div>');
    h.push('</div>');
    area.innerHTML = h.join('');
  }

  function mudarCatGancho(k) {
    catGancho = k;
    renderGanchos(document.getElementById('bfPautaArea'));
  }

  function copiarGancho(i) {
    var cat = GANCHOS[catGancho] || GANCHOS.curiosidade;
    if (cat.lista[i]) copiarTexto(cat.lista[i]);
  }

  /* ============================================================
     15. VALIDADOR
     ============================================================ */
  function renderValidador(area) {
    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>✓ Validador de legenda</h3>');
    h.push('<p class="bf-sub">Cole a legenda pronta. Ele audita gancho, tamanho, ' +
           'hashtags, CTA, pergunta e ruído.</p>');
    h.push('<textarea class="bf-val-input" id="bfValTxt" placeholder="Cole aqui a legenda..."></textarea>');
    h.push('<div class="bf-prompt-acoes">');
    h.push('<button class="bf-btn prim" type="button" onclick="bfValidar()">Validar</button>');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfFechar()">Fechar</button>');
    h.push('</div>');
    h.push('<div class="bf-val-resultado" id="bfValRes"></div>');
    h.push('</div>');
    area.innerHTML = h.join('');
  }

  function validarLegenda() {
    var ta = document.getElementById('bfValTxt');
    var res = document.getElementById('bfValRes');
    if (!ta || !res) return;

    var txt = (ta.value || '').trim();
    if (!txt) { toast('Cole a legenda primeiro.', 'erro'); return; }

    var linhas = txt.split('\n').filter(function (l) { return l.trim(); });
    var primeiro = (linhas[0] || '').trim();
    var temLink = txt.indexOf('meu3dlabs.com.br') !== -1;
    var hashtags = (txt.match(/#[\wÀ-ÿ]+/g) || []);
    var emojis = (txt.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []);
    var temPergunta = txt.indexOf('?') !== -1;
    var temSalvar = /salv|guard|compartilh/i.test(txt);
    var carTotal = txt.length;

    var itens = [];
    itens.push({
      tipo: (primeiro.length > 0 && primeiro.length <= 125) ? 'ok' : 'nok',
      txt: 'Gancho com ' + primeiro.length + ' caracteres (limite visível: 125)'
    });
    itens.push({
      tipo: (carTotal >= 300 && carTotal <= 2200) ? 'ok' : 'alerta',
      txt: 'Legenda com ' + carTotal + ' caracteres'
    });
    itens.push({
      tipo: hashtags.length >= 20 && hashtags.length <= 30 ? 'ok' :
            hashtags.length === 0 ? 'nok' : 'alerta',
      txt: hashtags.length + ' hashtag' + (hashtags.length === 1 ? '' : 's') +
           (hashtags.length === 0 ? ' — nenhuma' :
            hashtags.length < 20 ? ' — abaixo do ideal (20 a 30)' :
            hashtags.length > 30 ? ' — acima do limite (30)' : '')
    });
    itens.push({
      tipo: temLink ? 'ok' : 'nok',
      txt: temLink ? 'CTA com link' : 'Sem link de CTA'
    });
    itens.push({
      tipo: temPergunta ? 'ok' : 'alerta',
      txt: temPergunta ? 'Tem pergunta (gera comentário)' : 'Sem pergunta'
    });
    itens.push({
      tipo: temSalvar ? 'ok' : 'alerta',
      txt: temSalvar ? 'Pede para salvar/compartilhar' : 'Não pede salvamento'
    });
    itens.push({
      tipo: emojis.length <= 10 ? 'ok' : 'alerta',
      txt: emojis.length + ' emoji' + (emojis.length === 1 ? '' : 's') +
           (emojis.length > 10 ? ' — excesso' : '')
    });

    var total = itens.filter(function (x) { return x.tipo === 'ok'; }).length;

    var h = [];
    h.push('<div class="bf-alerta ' + (total >= 6 ? 'ok' : 'aviso') + '">' +
           'Nota: ' + total + ' de ' + itens.length + ' critérios ✓' +
           (total >= 6 ? ' — aprovada.' : ' — ajuste o que está vermelho.') + '</div>');

    for (var i = 0; i < itens.length; i++) {
      var it = itens[i];
      var ico = it.tipo === 'ok' ? '✅' : it.tipo === 'nok' ? '❌' : '⚠️';
      h.push('<div class="bf-val-item ' + it.tipo + '">' +
             '<span class="bf-v-ico">' + ico + '</span>' +
             '<span>' + esc(it.txt) + '</span></div>');
    }
    res.innerHTML = h.join('');
  }

  /* ============================================================
     16. CALENDÁRIO
     ============================================================ */
  function renderCalendario(area) {
    var lista = getPosts();
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>📅 Calendário editorial ' + anoCal + '</h3>');
    h.push('<p class="bf-sub">Todas as datas do ano. Riscado = já tem publicação.</p>');
    h.push('<div class="bf-cal-topo">');
    h.push('<button class="bf-cal-nav" type="button" onclick="bfAnoCal(-1)">‹</button>');
    h.push('<span class="bf-cal-ano">' + anoCal + '</span>');
    h.push('<button class="bf-cal-nav" type="button" onclick="bfAnoCal(1)">›</button>');
    h.push('</div>');

    var datas = datasDoAno(anoCal);
    var porMes = {};
    for (var i = 0; i < datas.length; i++) {
      var d = datas[i];
      var m = d.mesInteiro ? d.mes : (d.data.getMonth() + 1);
      if (!porMes[m]) porMes[m] = [];
      porMes[m].push(d);
    }

    h.push('<div class="bf-cal-grid">');
    for (var mm = 1; mm <= 12; mm++) {
      var itens = porMes[mm] || [];
      itens.sort(function (a, b) {
        if (a.mesInteiro) return -1;
        if (b.mesInteiro) return 1;
        return a.data - b.data;
      });
      h.push('<div class="bf-cal-mes' + (itens.length ? '' : ' vazio') + '">');
      h.push('<h5>' + mesNome(mm) + '</h5>');
      if (!itens.length) {
        h.push('<div class="bf-cal-vazio">sem data</div>');
      } else {
        for (var j = 0; j < itens.length; j++) {
          var it = itens[j];
          var cob = cobertura(it, lista);
          var passado = !it.mesInteiro && it.data < hoje;
          var proximo = !it.mesInteiro && !passado && (it.data - hoje) / 86400000 <= 14;
          var cls = 'bf-cal-item';
          if (cob.length) cls += ' coberto';
          else if (passado) cls += ' passado';
          else if (proximo) cls += ' proximo';
          h.push('<div class="' + cls + '">');
          h.push('<span class="bf-dia">' + (it.mesInteiro ? '—' : String(it.data.getDate()).padStart(2, '0')) + '</span>');
          h.push('<span class="bf-nm">' + it.emoji + ' ' + esc(it.nome) + '</span>');
          if (!it.mesInteiro) h.push('<span class="bf-ponto"></span>');
          h.push('</div>');
        }
      }
      h.push('</div>');
    }
    h.push('</div></div>');
    area.innerHTML = h.join('');
  }

  function mudarAnoCal(delta) {
    anoCal += delta;
    if (painelAberto === 'calendario') renderCalendario(document.getElementById('bfPautaArea'));
  }

  /* ============================================================
     17. UTM
     ============================================================ */
  function renderUtm(area) {
    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>🔗 Link com rastreio (UTM)</h3>');
    h.push('<p class="bf-sub">Um link com etiqueta. A página é a mesma — ' +
           'só o Analytics passa a saber de qual canal veio o clique.</p>');
    h.push('<div class="bf-campo"><label>Destino</label><select id="bfUtmDest">');
    h.push('<option value="' + SITE + '/loja">Loja (pronta entrega)</option>');
    h.push('<option value="' + SITE + '/enviar-projeto">Enviar projeto (personalizado)</option>');
    h.push('<option value="' + SITE + '">Home do site</option>');
    h.push('<option value="' + BLOG + '">Blog</option>');
    h.push('<option value="produto">Página de um produto…</option>');
    h.push('</select></div>');
    h.push('<div class="bf-campo" id="bfUtmSlugBox" style="display:none;">');
    h.push('<label>Slug do produto</label>');
    h.push('<input id="bfUtmSlug" placeholder="ex.: cubo-infinito-articulado-3d">');
    h.push('<div class="bf-dica">A parte final da URL em /produto/…</div></div>');
    h.push('<div class="bf-campo"><label>Origem</label><select id="bfUtmSrc">');
    h.push('<option value="instagram">Instagram</option>');
    h.push('<option value="stories">Stories</option>');
    h.push('<option value="bio">Link da bio</option>');
    h.push('<option value="whatsapp">WhatsApp</option>');
    h.push('<option value="facebook">Facebook</option>');
    h.push('<option value="tiktok">TikTok</option>');
    h.push('</select></div>');
    h.push('<div class="bf-campo"><label>Campanha</label>');
    h.push('<input id="bfUtmCamp" placeholder="ex.: consciencia-negra">');
    h.push('<div class="bf-dica">Sem espaço nem acento. Use hífen.</div></div>');
    h.push('<div class="bf-campo"><label>Conteúdo (opcional)</label>');
    h.push('<input id="bfUtmCont" placeholder="ex.: carrossel-1"></div>');
    h.push('<div class="bf-prompt-acoes">');
    h.push('<button class="bf-btn prim" type="button" onclick="bfGerarUtm()">Gerar link</button>');
    h.push('<button class="bf-btn ghost" type="button" onclick="bfCopiarUtm()">📋 Copiar</button>');
    h.push('</div>');
    h.push('<div class="bf-utm-out"><code id="bfUtmOut">Preencha e clique em Gerar link.</code></div>');
    h.push('</div>');
    area.innerHTML = h.join('');

    var sel = document.getElementById('bfUtmDest');
    if (sel) {
      sel.addEventListener('change', function () {
        document.getElementById('bfUtmSlugBox').style.display =
          (sel.value === 'produto') ? 'block' : 'none';
      });
    }
  }

  function gerarUtm() {
    var dest = document.getElementById('bfUtmDest');
    var src  = document.getElementById('bfUtmSrc');
    var camp = document.getElementById('bfUtmCamp');
    var cont = document.getElementById('bfUtmCont');
    var slug = document.getElementById('bfUtmSlug');
    var out  = document.getElementById('bfUtmOut');
    if (!dest || !out) return;

    var base = dest.value;
    if (base === 'produto') {
      var s = (slug && slug.value || '').trim().replace(/^\/+|\/+$/g, '');
      if (!s) { toast('Informe o slug do produto.', 'erro'); return; }
      base = SITE + '/produto/' + encodeURIComponent(s);
    }
    var c = (camp && camp.value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!c) { toast('Informe o nome da campanha.', 'erro'); return; }

    var url = base + (base.indexOf('?') === -1 ? '?' : '&') +
      'utm_source=' + encodeURIComponent(src.value) +
      '&utm_medium=social&utm_campaign=' + encodeURIComponent(c);
    if (cont && cont.value.trim()) {
      url += '&utm_content=' + encodeURIComponent(cont.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
    out.textContent = url;
    toast('🔗 Link gerado.', 'ok');
  }

  function copiarUtm() {
    var out = document.getElementById('bfUtmOut');
    if (!out) return;
    var t = out.textContent || '';
    if (t.indexOf('http') !== 0) { toast('Gere o link primeiro.', 'erro'); return; }
    copiarTexto(t);
  }

  /* ============================================================
     18. PAUTAS SALVAS
     ============================================================ */
  function lerPautas() {
    try {
      var r = JSON.parse(localStorage.getItem(CHAVE_PAUTAS) || '[]');
      return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
  }
  function gravarPautas(l) {
    try { localStorage.setItem(CHAVE_PAUTAS, JSON.stringify(l)); } catch (e) {}
  }

  function salvarPautaAtual() {
    var ta = document.getElementById('bfPromptTxt');
    if (!ta || !ta.value.trim()) { toast('Gere um copy primeiro.', 'erro'); return; }
    var alvo = pautaAtual();
    var lista = lerPautas();
    lista.unshift({
      id: Date.now(),
      nome: alvo ? (alvo.emoji + ' ' + alvo.nome) : 'Tema livre',
      quando: (alvo && alvo.data) ? quandoTexto(alvo) : '',
      formato: formatoSel,
      cta: ctaSel,
      angulo: anguloSel,
      prompt: ta.value,
      criado: new Date().toISOString()
    });
    gravarPautas(lista.slice(0, 30));
    toast('💾 Pauta salva.', 'ok');
    if (painelAberto === 'salvas') renderSalvas(document.getElementById('bfPautaArea'));
  }

  function renderSalvas(area) {
    var lista = lerPautas();
    var h = [];
    h.push('<div class="bf-pauta">');
    h.push('<h3>💾 Pautas salvas</h3>');
    h.push('<p class="bf-sub">Guardadas neste navegador. Até 30.</p>');
    if (!lista.length) {
      h.push('<div class="bf-alerta aviso">Nenhuma pauta salva.</div>');
    } else {
      h.push('<div class="bf-salvas">');
      for (var i = 0; i < lista.length; i++) {
        var p = lista[i];
        var fmt = FORMATOS[p.formato] || FORMATOS.feed;
        h.push('<div class="bf-salva">');
        h.push('<span class="bf-salva-txt">' + esc(p.nome) +
               ' <span style="font-weight:600;color:#8a94a8;">' + esc(p.quando || '') +
               ' · ' + fmt.ico + '</span></span>');
        h.push('<span class="bf-salva-dt">' + fmtBR(new Date(p.criado)) + '</span>');
        h.push('<button type="button" style="background:#0f1e3d;color:#fff" onclick="bfUsarPauta(' + p.id + ')">Usar</button>');
        h.push('<button type="button" style="background:#fde8e5;color:#c0392b" onclick="bfApagarPauta(' + p.id + ')">×</button>');
        h.push('</div>');
      }
      h.push('</div>');
    }
    h.push('</div>');
    area.innerHTML = h.join('');
  }

  function usarPauta(id) {
    var lista = lerPautas();
    var p = null;
    for (var i = 0; i < lista.length; i++) if (String(lista[i].id) === String(id)) { p = lista[i]; break; }
    if (!p) return;
    if (p.cta && CTAS[p.cta]) ctaSel = p.cta;
    if (p.angulo && ANGULOS[p.angulo]) anguloSel = p.angulo;
    if (p.formato && FORMATOS[p.formato]) formatoSel = p.formato;
    pautaSel = null;
    pautaForcada = null;
    painelAberto = 'pauta';
    renderPauta(document.getElementById('bfPautaArea'));

    var bf = document.querySelectorAll('.bf-modo[data-fmt]');
    for (var a = 0; a < bf.length; a++) {
      bf[a].classList.toggle('on', bf[a].getAttribute('data-fmt') === formatoSel);
    }
    var bc = document.querySelectorAll('.bf-modo[data-cta]');
    for (var b = 0; b < bc.length; b++) {
      bc[b].classList.toggle('on', bc[b].getAttribute('data-cta') === ctaSel);
    }
    var bg = document.querySelectorAll('.bf-modo[data-ang]');
    for (var c = 0; c < bg.length; c++) {
      bg[c].classList.toggle('on', bg[c].getAttribute('data-ang') === anguloSel);
    }

    atualizarSaida();
    var ta = document.getElementById('bfPromptTxt');
    if (ta && p.prompt) ta.value = p.prompt;
    toast('📄 Pauta carregada.', 'ok');
  }

  function apagarPauta(id) {
    gravarPautas(lerPautas().filter(function (x) { return String(x.id) !== String(id); }));
    if (painelAberto === 'salvas') renderSalvas(document.getElementById('bfPautaArea'));
    toast('🗑️ Removida.', 'ok');
  }

  /* ============================================================
     19. ESTATÍSTICAS
     ============================================================ */
  function renderStats() {
    var box = document.getElementById('bfStats');
    if (!box) return;
    var lista = getPosts();
    var pub = lista.filter(function (p) { return p.publicado; }).length;
    var rasc = lista.length - pub;

    var palavras = 0, cats = {};
    for (var i = 0; i < lista.length; i++) {
      var txt = String(lista[i].conteudo || '').replace(/<[^>]+>/g, ' ');
      palavras += txt.split(/\s+/).filter(Boolean).length;
      var c = lista[i].categoria || 'novidade';
      cats[c] = (cats[c] || 0) + 1;
    }
    var catTop = '—', maior = 0;
    for (var k in cats) if (cats[k] > maior) { maior = cats[k]; catTop = k; }
    var min = Math.round(palavras / 200);

    box.innerHTML =
      '<div class="bf-stat c1"><div class="bf-stat-n">' + lista.length + '</div><div class="bf-stat-l">Total</div></div>' +
      '<div class="bf-stat c2"><div class="bf-stat-n">' + pub + '</div><div class="bf-stat-l">Publicados</div></div>' +
      '<div class="bf-stat c3"><div class="bf-stat-n">' + rasc + '</div><div class="bf-stat-l">Rascunhos</div></div>' +
      '<div class="bf-stat c4"><div class="bf-stat-n">' + (Math.round(palavras / 100) / 10) + 'k</div><div class="bf-stat-l">Palavras</div></div>' +
      '<div class="bf-stat c1"><div class="bf-stat-n">' + min + '</div><div class="bf-stat-l">Min leitura</div></div>' +
      '<div class="bf-stat c2"><div class="bf-stat-n" style="font-size:14px;padding-top:4px;">' + esc(catTop) + '</div><div class="bf-stat-l">Top categoria</div></div>';
  }

  /* ============================================================
     20. DUPLICAR
     ============================================================ */
  function duplicarPost(id) {
    var lista = getPosts();
    var orig = null;
    for (var i = 0; i < lista.length; i++) if (String(lista[i].id) === String(id)) { orig = lista[i]; break; }
    if (!orig || typeof abrirForm !== 'function') return;
    abrirForm(null);
    setTimeout(function () {
      var t = document.getElementById('fTitulo');
      var r = document.getElementById('fResumo');
      var c = document.getElementById('fConteudo');
      var cat = document.getElementById('fCategoria');
      if (t) t.value = 'Cópia de ' + (orig.titulo || '');
      if (r) r.value = orig.resumo || '';
      if (c) c.value = orig.conteudo || '';
      if (cat && orig.categoria) cat.value = orig.categoria;
      var pub = document.getElementById('fPublicado');
      if (pub) pub.checked = false;
      var dest = document.getElementById('fDestaque');
      if (dest) dest.checked = false;
      if (typeof atualizarContadores === 'function') atualizarContadores();
    }, 60);
    toast('📄 Cópia criada como rascunho.', 'ok');
  }

  /* ============================================================
     21. PREVIEW
     ============================================================ */
  function blocoPreview() {
    var area = document.getElementById('bfSeoArea');
    if (!area) return;
    var t = document.getElementById('fTitulo');
    var r = document.getElementById('fResumo');
    var c = document.getElementById('fConteudo');
    var cat = document.getElementById('fCategoria');
    if (!t) return;

    var titulo = (t.value || '').trim();
    var resumo = r ? (r.value || '').trim() : '';
    var catId = cat ? cat.value : 'novidade';
    var emoji = '✨';
    try {
      if (typeof CATEGORIAS !== 'undefined') {
        for (var i = 0; i < CATEGORIAS.length; i++) {
          if (CATEGORIAS[i].id === catId) { emoji = CATEGORIAS[i].emoji; break; }
        }
      }
    } catch (e) {}

    var img = null;
    var ip = document.querySelector('#imgPreviewArea img');
    if (ip) img = ip.getAttribute('src');
    var textoLimp = c ? (c.value || '').replace(/<[^>]+>/g, ' ').trim() : '';
    var palavras = textoLimp ? textoLimp.split(/\s+/).filter(Boolean).length : 0;

    var itens = [
      { ok: titulo.length >= 30 && titulo.length <= 70, txt: 'Título entre 30 e 70 caracteres' },
      { ok: titulo.indexOf('|') === -1, txt: 'Título sem barra "|"' },
      { ok: resumo.length >= 100 && resumo.length <= 300, txt: 'Resumo entre 100 e 300 caracteres' },
      { ok: !!img, txt: 'Imagem de capa adicionada' },
      { ok: palavras >= 400, txt: 'Ao menos 400 palavras (' + palavras + ' agora)' }
    ];

    var h = [];
    h.push('<div class="bf-seo"><div class="bf-seo-tit">Checklist de qualidade</div><ul>');
    for (var k = 0; k < itens.length; k++) {
      h.push('<li class="' + (itens[k].ok ? 'ok' : 'nok') + '">' +
             '<span class="bf-ico">' + (itens[k].ok ? '✅' : '⬜') + '</span>' +
             '<span>' + itens[k].txt + '</span></li>');
    }
    h.push('</ul></div>');

    var tempo = Math.max(1, Math.ceil(palavras / 200));
    h.push('<div class="bf-preview"><div class="bf-pv-tit">Como vai aparecer no blog</div>');
    h.push('<div class="bf-pv-card"><div class="bf-pv-foto">' +
           (img ? '<img src="' + esc(img) + '" alt="">' : '<span>' + emoji + '</span>') + '</div>');
    h.push('<div class="bf-pv-info">');
    h.push('<h4>' + (titulo ? esc(titulo) : 'Título da publicação') + '</h4>');
    h.push('<div class="bf-pv-cat">' + emoji + ' ' + esc(catId) + ' · hoje</div>');
    h.push('<p>' + (resumo ? esc(resumo) : 'O resumo aparece aqui.') + '</p>');
    h.push('<div class="bf-pv-meta"><span>' + tempo + ' min</span><span>' + palavras + ' palavras</span></div>');
    h.push('</div></div></div>');
    area.innerHTML = h.join('');
  }

  /* ============================================================
     22. FILTRO STATUS
     ============================================================ */
  var filtroStatus = '';

  function renderStatusChips() {
    var box = document.getElementById('bfStatusChips');
    if (!box) return;
    var lista = getPosts();
    var pub = lista.filter(function (p) { return p.publicado; }).length;
    var rasc = lista.length - pub;
    box.innerHTML =
      '<button type="button" class="bf-chip ' + (filtroStatus === '' ? 'on' : '') +
        '" onclick="bfFiltrarStatus(\'\')">Todas (' + lista.length + ')</button>' +
      '<button type="button" class="bf-chip ' + (filtroStatus === 'pub' ? 'on' : '') +
        '" onclick="bfFiltrarStatus(\'pub\')">✅ Publicadas (' + pub + ')</button>' +
      '<button type="button" class="bf-chip ' + (filtroStatus === 'rasc' ? 'on' : '') +
        '" onclick="bfFiltrarStatus(\'rasc\')">📝 Rascunhos (' + rasc + ')</button>';
  }

  function filtrarStatus(s) {
    filtroStatus = s;
    renderStatusChips();
    if (typeof renderGrade === 'function') { renderGrade(); setTimeout(aplicarFiltroStatus, 20); }
  }

  function aplicarFiltroStatus() {
    if (!filtroStatus) return;
    var cards = document.querySelectorAll('#grade .card');
    var lista = getPosts();
    for (var i = 0; i < cards.length; i++) {
      var btn = cards[i].querySelector('button[onclick*="abrirForm("]');
      if (!btn) continue;
      var m = /abrirForm\((\d+)\)/.exec(btn.getAttribute('onclick'));
      if (!m) continue;
      var p = null;
      for (var j = 0; j < lista.length; j++) if (String(lista[j].id) === m[1]) { p = lista[j]; break; }
      if (!p) continue;
      cards[i].style.display = (filtroStatus === 'pub' ? !!p.publicado : !p.publicado) ? '' : 'none';
    }
  }

  /* ============================================================
     23. BACKUP
     ============================================================ */
  function exportarPosts() {
    var lista = getPosts();
    if (!lista.length) { toast('Nenhuma publicação para exportar.', 'erro'); return; }
    var dados = {
      app: 'Meu 3D Labs', tipo: 'backup-publicacoes',
      exportado_em: new Date().toISOString(),
      total: lista.length, posts: lista
    };
    var blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    a.href = url;
    a.download = 'm3d-blog-backup-' + d.getFullYear() +
                 String(d.getMonth() + 1).padStart(2, '0') +
                 String(d.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('💾 Backup exportado (' + lista.length + ' posts).', 'ok');
  }

  /* ============================================================
     24. INJEÇÃO
     ============================================================ */
  function injetarUI() {
    var barra = document.querySelector('.barra-acoes');
    if (!barra || document.getElementById('bfToolbar')) return;

    var te = document.createElement('div');
    te.className = 'bf-toolbar';
    te.id = 'bfToolbar';
    te.innerHTML =
      '<span class="bf-tit">Ferramentas</span>' +
      '<button type="button" class="bf-btn prim" onclick="bfAbrir(\'pauta\')">🧠 Sugerir pauta</button>' +
      '<button type="button" class="bf-btn" onclick="bfAbrir(\'plano\')">📆 Plano 7 dias</button>' +
      '<button type="button" class="bf-btn" onclick="bfAbrir(\'calendario\')">📅 Calendário</button>' +
      '<button type="button" class="bf-btn" onclick="bfAbrir(\'ganchos\')">🎣 Ganchos</button>' +
      '<button type="button" class="bf-btn" onclick="bfAbrir(\'validador\')">✓ Validador</button>' +
      '<button type="button" class="bf-btn" onclick="bfAbrir(\'utm\')">🔗 UTM</button>' +
      '<button type="button" class="bf-btn" onclick="bfAbrir(\'salvas\')">💾 Salvas</button>' +
      '<button type="button" class="bf-btn ok" onclick="bfExportar()">⬇️ Backup</button>';
    barra.parentNode.insertBefore(te, barra.nextSibling);

    var st = document.createElement('div');
    st.className = 'bf-stats';
    st.id = 'bfStats';
    te.parentNode.insertBefore(st, te);

    var pa = document.createElement('div');
    pa.id = 'bfPautaArea';
    te.parentNode.insertBefore(pa, te.nextSibling);

    var resumo = document.getElementById('resumo');
    if (resumo && !document.getElementById('bfStatusChips')) {
      var ch = document.createElement('div');
      ch.className = 'bf-status-chips';
      ch.id = 'bfStatusChips';
      resumo.parentNode.insertBefore(ch, resumo);
    }

    var formArea = document.getElementById('formArea');
    if (formArea) {
      new MutationObserver(function () {
        var wrap = formArea.querySelector('.form-wrap');
        if (wrap && !document.getElementById('bfSeoArea')) {
          var sa = document.createElement('div');
          sa.id = 'bfSeoArea';
          var acoes = wrap.querySelector('.form-acoes');
          if (acoes) wrap.insertBefore(sa, acoes); else wrap.appendChild(sa);
          ligarPreview();
        }
      }).observe(formArea, { childList: true });
    }

    renderStats();
  }

  function ligarPreview() {
    var t = document.getElementById('fTitulo');
    var r = document.getElementById('fResumo');
    var c = document.getElementById('fConteudo');
    var cat = document.getElementById('fCategoria');
    var deb;
    function agendar() { clearTimeout(deb); deb = setTimeout(blocoPreview, 300); }
    if (t) t.addEventListener('input', agendar);
    if (r) r.addEventListener('input', agendar);
    if (c) c.addEventListener('input', agendar);
    if (cat) cat.addEventListener('change', agendar);
    var ipa = document.getElementById('imgPreviewArea');
    if (ipa) new MutationObserver(agendar).observe(ipa, { childList: true, subtree: true });
    setTimeout(blocoPreview, 120);
  }

  /* ============================================================
     25. HOOK RENDER
     ============================================================ */
  function hookRenderGrade() {
    if (typeof window.renderGrade !== 'function' || window.renderGrade.__bf) return;
    var original = window.renderGrade;
    var novo = function () {
      original.apply(this, arguments);
      setTimeout(function () {
        renderStatusChips();
        aplicarFiltroStatus();
        renderStats();
        var acoes = document.querySelectorAll('#grade .card .acoes');
        for (var i = 0; i < acoes.length; i++) {
          var ac = acoes[i];
          if (ac.getAttribute('data-bf') === '1') continue;
          ac.setAttribute('data-bf', '1');
          var ed = ac.querySelector('button[onclick*="abrirForm("]');
          if (!ed) continue;
          var m = /abrirForm\((\d+)\)/.exec(ed.getAttribute('onclick'));
          if (!m) continue;
          var b = document.createElement('button');
          b.type = 'button';
          b.style.cssText = 'background:#eef1f6;color:#0f1e3d';
          b.textContent = 'Duplicar';
          b.setAttribute('onclick', 'bfDuplicar(' + m[1] + ')');
          ac.appendChild(b);
          ac.style.gridTemplateColumns = 'repeat(4,1fr)';
          ac.style.gap = '5px';
          var bs = ac.querySelectorAll('button');
          for (var k = 0; k < bs.length; k++) {
            bs[k].style.fontSize = '11px';
            bs[k].style.padding = '7px 3px';
          }
        }
      }, 40);
    };
    novo.__bf = true;
    window.renderGrade = novo;
  }

  /* ============================================================
     26. API PÚBLICA
     ============================================================ */
  window.bfAbrir         = abrirPainel;
  window.bfFechar        = fechar;
  window.bfEscolherPauta = escolherPauta;
  window.bfAutoPauta     = autoPauta;
  window.bfFormato       = mudarFormato;
  window.bfCta           = mudarCta;
  window.bfAngulo        = mudarAngulo;
  window.bfAba           = mudarAba;
  window.bfCopiarPrompt  = copiarPrompt;
  window.bfCopiarSlide   = copiarSlide;
  window.bfCopiarTodosSlides = copiarTodosSlides;
  window.bfAbrirIA       = abrirIA;
  window.bfSalvarPauta   = salvarPautaAtual;
  window.bfUsarPauta     = usarPauta;
  window.bfApagarPauta   = apagarPauta;
  window.bfAnoCal        = mudarAnoCal;
  window.bfGerarUtm      = gerarUtm;
  window.bfCopiarUtm     = copiarUtm;
  window.bfDuplicar      = duplicarPost;
  window.bfFiltrarStatus = filtrarStatus;
  window.bfExportar      = exportarPosts;
  window.bfUsarDoPlano   = usarDoPlano;
  window.bfCatGancho     = mudarCatGancho;
  window.bfCopiarGancho  = copiarGancho;
  window.bfValidar       = validarLegenda;

  /* ============================================================
     27. INIT
     ============================================================ */
  function iniciar() {
    injetarUI();
    hookRenderGrade();
    renderStatusChips();
    renderStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    setTimeout(iniciar, 80);
  }

  var tentativas = 0;
  var timer = setInterval(function () {
    tentativas++;
    if (document.getElementById('bfToolbar') || tentativas > 40) { clearInterval(timer); return; }
    var p = document.getElementById('painel');
    if (p && !p.classList.contains('hidden')) iniciar();
  }, 400);
})();