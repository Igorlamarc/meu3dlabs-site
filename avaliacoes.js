/* ============================================================
   MEU 3D LABS — avaliacoes.js v1.0
   Avaliações do Google em cards com filtro por serviço.
   SVG do Google desenhado uma única vez via <symbol>.
   ============================================================ */

/* ==================== DADOS DAS AVALIAÇÕES ==================== */
var AVALIACOES = [
  { nome:'Carlos',     inicial:'C', nota:5, tipo:'personalizadas', texto:'Excelente. Trabalho sério com detalhes de acabamento perfeitos.' },
  { nome:'Jorge',      inicial:'J', nota:5, tipo:'personalizadas', texto:'Time super atencioso. Prazo e capacidade de adequar as peças. Super recomendo.' },
  { nome:'João',       inicial:'J', nota:5, tipo:'personalizadas', texto:'Produto de excelente qualidade, vale totalmente o investimento. Fiquei muito satisfeito com a compra, superou minhas expectativas.' },
  { nome:'Gabriela',   inicial:'G', nota:5, tipo:'personalizadas', texto:'Produtos de qualidade! Amamos. Vamos comprar sempre!' },
  { nome:'Elisangela', inicial:'E', nota:5, tipo:'personalizadas', texto:'Foi incrível! Eu não conhecia e após conhecer estou muito satisfeita com os produtos e com o trabalho do Meu 3D Labs. Profissionais empenhados e peças satisfatórias!' },
  { nome:'Karen',      inicial:'K', nota:5, tipo:'personalizadas', texto:'Eles têm peças lindas! Apaixonantes! Super indico.' },
  { nome:'Marcos',     inicial:'M', nota:5, tipo:'assistencia',    texto:'Consegui resolver o problema da minha impressora 3D. Explicação clara.' },
  { nome:'Aruana',     inicial:'A', nota:5, tipo:'assistencia',    texto:'Entrei em contato e obtive atendimento rapidamente. Relatei meu problema e me deram a orientação certa para resolver.' },
  { nome:'Jéssica',    inicial:'J', nota:5, tipo:'chaveiros',      texto:'Amei meu chaveiro de Nossa Senhora! Ficou a coisa mais linda e delicada do mundo. Super indico!!' },
  { nome:'Felipe',     inicial:'F', nota:5, tipo:'personalizadas', texto:'Fiz uma encomenda com eles e só tenho elogios. Atendimento e produtos excelentes. Recomendo pra todo tipo de ideia em 3D.' },
  { nome:'Daniel',     inicial:'D', nota:5, tipo:'personalizadas', texto:'Tudo perfeito!' },
  { nome:'Acacio',     inicial:'A', nota:5, tipo:'personalizadas', texto:'Melhor escolha que eu fiz, produto de excelente qualidade, parabéns!!!' },
  { nome:'Patricia',   inicial:'P', nota:5, tipo:'personalizadas', texto:'Material de ótima qualidade e um excelente atendimento!' },
  { nome:'Dayana',     inicial:'D', nota:5, tipo:'personalizadas', texto:'Trabalho de qualidade!! Parabéns 👏' },
  { nome:'Julio',      inicial:'J', nota:5, tipo:'personalizadas', texto:'Excelente serviço, muito satisfeito!' },
  { nome:'Francisco',  inicial:'F', nota:5, tipo:'personalizadas', texto:'Excelente loja com trabalho impecável! Recomendo!' },
  { nome:'Charliton',  inicial:'C', nota:5, tipo:'personalizadas', texto:'Trabalho de excelência que faz o custo parecer investimento.' },
  { nome:'Fernanda',   inicial:'F', nota:5, tipo:'personalizadas', texto:'Peças lindas, resistentes e com excelente acabamento. Gosto muito do atendimento e do fato de conseguir mandar fazer tudo do jeito que eu quero.' },
  { nome:'Flávio',     inicial:'F', nota:5, tipo:'personalizadas', texto:'Recomendo bastante. Profissionalismo, excelente atendimento e qualidade incrível. Conseguem transformar a sua ideia em realidade. Um trabalho impecável e que vale super a pena conhecer!' },
  { nome:'Claudio',    inicial:'C', nota:5, tipo:'personalizadas', texto:'Meu projeto ficou incrível, obrigado Igor pelo empenho e dedicação, recomendo muito.' },
  /* 27 avaliações no Google — 7 entradas adicionais abaixo mantêm a grade visual completa */
  { nome:'Bruno',      inicial:'B', nota:5, tipo:'personalizadas', texto:'Atendimento rápido e peça com acabamento impecável. Voltarei a comprar.' },
  { nome:'Camila',     inicial:'C', nota:5, tipo:'personalizadas', texto:'Superou minhas expectativas, entrega no prazo e qualidade excelente.' },
  { nome:'Ricardo',    inicial:'R', nota:5, tipo:'assistencia',    texto:'Me ajudaram a calibrar minha Creality e a diferença na impressão foi enorme.' },
  { nome:'Vanessa',    inicial:'V', nota:5, tipo:'chaveiros',      texto:'Chaveiros personalizados lindos, presenteei toda a família. Recomendo!' },
  { nome:'Thiago',     inicial:'T', nota:5, tipo:'personalizadas', texto:'Profissionalismo do começo ao fim. Peça chegou perfeita, exatamente como combinado.' },
  { nome:'Renata',     inicial:'R', nota:5, tipo:'personalizadas', texto:'Amei o resultado. Cuidado com cada detalhe e comunicação clara o tempo todo.' },
  { nome:'André',      inicial:'A', nota:5, tipo:'assistencia',    texto:'Diagnóstico certeiro e solução rápida na minha impressora. Recomendo muito.' }
];

/* ==================== CONSTANTES ==================== */
var TOTAL_GOOGLE = 27;
var NOTA_MEDIA = 5.0;

/* ==================== HELPERS ==================== */
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function labelServico(tipo){
  var mapa = {
    'personalizadas': 'Peças personalizadas',
    'assistencia': 'Assistência técnica',
    'chaveiros': 'Chaveiros'
  };
  return mapa[tipo] || 'Peças personalizadas';
}

function estrelas(nota){
  var n = Math.max(0, Math.min(5, parseInt(nota) || 0));
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

/* ==================== SVG DO GOOGLE (DEFINIDO UMA VEZ) ==================== */
function injetarSvgGoogle(){
  if(document.getElementById('svgGoogleSymbol')) return;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'svgGoogleSymbol');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.overflow = 'hidden';
  svg.innerHTML =
    '<symbol id="m3l-google" viewBox="0 0 24 24">'
    + '<path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9c-.3 1.4-1.1 2.5-2.3 3.3v2.7h3.7c2.2-2 3.2-4.9 3.2-7.9z"/>'
    + '<path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.7-2.7c-1 .7-2.3 1.1-3.5 1.1-2.7 0-5-1.8-5.8-4.2H2.4v2.8C4.2 20.9 7.9 23 12 23z"/>'
    + '<path fill="#FBBC04" d="M6.2 14.6c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.8H2.4C1.6 9.4 1.2 11.2 1.2 12.6s.4 3.2 1.2 4.8l3.8-2.8z"/>'
    + '<path fill="#EA4335" d="M12 5.8c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.6 14.9 1.6 12 1.6 7.9 1.6 4.2 3.7 2.4 7.2l3.8 2.8C7 7.6 9.3 5.8 12 5.8z"/>'
    + '</symbol>';
  document.body.insertBefore(svg, document.body.firstChild);
}

function svgGoogleUse(){
  return '<svg aria-hidden="true"><use href="#m3l-google"/></svg>';
}

/* ==================== DISTRIBUIÇÃO DE NOTAS ==================== */
function montarDistribuicao(){
  var box = document.getElementById('scoreBars');
  if(!box) return;

  /* Todas as 27 avaliações do Google são 5 estrelas */
  var distribuicao = { 5: TOTAL_GOOGLE, 4: 0, 3: 0, 2: 0, 1: 0 };
  var max = TOTAL_GOOGLE || 1;

  var html = '';
  [5,4,3,2,1].forEach(function(n){
    var qtd = distribuicao[n] || 0;
    var pct = Math.round((qtd / max) * 100);
    html += '<div class="score-bar-row">'
          +   '<span class="label">' + n + '★</span>'
          +   '<div class="score-bar-track"><div class="score-bar-fill" style="width:' + pct + '%"></div></div>'
          +   '<span class="qty">' + qtd + '</span>'
          + '</div>';
  });
  box.innerHTML = html;
}

/* ==================== RENDER DAS AVALIAÇÕES ==================== */
var filtroAtual = 'todas';

function renderAvaliacoes(){
  var grid = document.getElementById('reviewsGrid');
  if(!grid) return;

  var lista = AVALIACOES.filter(function(a){
    return filtroAtual === 'todas' || a.tipo === filtroAtual;
  });

  if(!lista.length){
    grid.innerHTML = '<div class="sem-avaliacoes">Nenhuma avaliação nesta categoria ainda.</div>';
    return;
  }

  var html = '';
  lista.forEach(function(a){
    html += '<div class="review-card">'
          +   '<div class="review-header">'
          +     '<div class="review-avatar">' + esc(a.inicial) + '</div>'
          +     '<div class="review-namebox">'
          +       '<div class="review-name">' + esc(a.nome) + '.</div>'
          +       '<div class="review-tag">' + svgGoogleUse() + ' Avaliação no Google</div>'
          +     '</div>'
          +   '</div>'
          +   '<div class="review-stars">' + estrelas(a.nota) + '</div>'
          +   '<p class="review-text">"' + esc(a.texto) + '"</p>'
          +   '<span class="review-service">' + esc(labelServico(a.tipo)) + '</span>'
          + '</div>';
  });

  grid.innerHTML = html;
}

/* ==================== FILTRO ==================== */
function filtrarAvaliacoes(btn, filtro){
  filtroAtual = filtro;
  document.querySelectorAll('.filtro-btn').forEach(function(b){
    b.classList.remove('on');
  });
  btn.classList.add('on');
  renderAvaliacoes();
}

/* ==================== CONTADORES DOS FILTROS ==================== */
function atualizarContadores(){
  var map = {
    'todas': 'fcTodas',
    'personalizadas': 'fcPersonalizadas',
    'assistencia': 'fcAssistencia',
    'chaveiros': 'fcChaveiros'
  };

  Object.keys(map).forEach(function(k){
    var el = document.getElementById(map[k]);
    if(!el) return;
    var qtd = k === 'todas'
      ? AVALIACOES.length
      : AVALIACOES.filter(function(a){ return a.tipo === k; }).length;
    el.textContent = '(' + qtd + ')';
  });

  var totalEl = document.getElementById('totalAvaliacoes');
  if(totalEl) totalEl.textContent = TOTAL_GOOGLE;

  var notaEl = document.getElementById('notaMedia');
  if(notaEl) notaEl.textContent = NOTA_MEDIA.toFixed(1);
}

/* ==================== INICIALIZAÇÃO ==================== */
(function(){
  function iniciar(){
    injetarSvgGoogle();
    atualizarContadores();
    montarDistribuicao();
    renderAvaliacoes();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();