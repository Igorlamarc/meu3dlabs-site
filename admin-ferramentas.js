/* ============================================================
   MEU 3D LABS — admin-ferramentas.js
   Depende de admin-imagens.js (carregue depois dele).
   ============================================================ */

function ferrCard(icone, titulo, desc){
  var c = document.createElement('div');
  c.className = 'ferr-card';

  c.innerHTML =
    '<button type="button" class="ferr-head">' +
      '<span class="ferr-tit"><span class="ico">' + icone + '</span>' + titulo + '</span>' +
      '<span class="chev">▾</span>' +
    '</button>' +
    '<div class="ferr-body">' + (desc ? '<p class="sub">' + desc + '</p>' : '') + '</div>';

  c.querySelector('.ferr-head').onclick = function(){
    c.classList.toggle('aberto');
  };

  return c;
}

function corpo(card){
  return card.querySelector('.ferr-body');
}

function montarFerramentas(){
  if(ferramentasMontadas) return;
  ferramentasMontadas = true;

  var box = document.getElementById('ferramentas');
  if(!box) return;
  box.innerHTML = '';

  montarOtimizador(box);
  montarLote(box);
  montarTamanhos(box);
  montarAutoCfg(box);
  montarProporcao(box);
  montarDuplicadas(box);
  montarBackup(box);
  montarPeso(box);
  montarQuebradas(box);
  montarPaleta(box);
}

/* ---------- OTIMIZADOR ---------- */
function montarOtimizador(box){
  var c = ferrCard('🧪', 'Otimizador de imagem',
    'Converta, comprima e redimensione. Veja o antes e o depois em KB.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="dropzone" id="dz1">' +
      '<div class="dz-ico">📤</div>' +
      '<div class="dz-txt">Clique ou arraste uma imagem</div>' +
      '<div class="dz-svg">JPG, PNG ou WebP</div>' +
    '</div>' +
    '<div class="ferr-linha" style="margin-top:16px">' +
      '<div class="campo"><label>Formato</label><select id="fFormato">' +
        '<option value="image/webp">WebP</option>' +
        '<option value="image/jpeg">JPEG</option>' +
        '<option value="image/png">PNG</option>' +
      '</select></div>' +
      '<div class="campo"><label>Largura máxima</label><input type="number" id="fMaxW" value="1600" min="200" max="4000" step="50"></div>' +
      '<div class="campo"><label>Qualidade</label><input type="number" id="fQ" value="82" min="20" max="100"></div>' +
      '<div class="campo"><label>Alvo (KB, 0 = livre)</label><input type="number" id="fAlvo" value="0" min="0" max="2000" step="10"></div>' +
    '</div>' +
    '<div class="opt-grid" id="optGrid" hidden>' +
      '<div class="opt-box"><div class="lbl">Original</div><img id="optOrig" alt=""><div class="meta" id="optOrigMeta"></div></div>' +
      '<div class="opt-box"><div class="lbl">Resultado</div><img id="optNovo" alt=""><div class="meta" id="optNovoMeta"></div><div id="optGanho"></div></div>' +
    '</div>' +
    '<div class="acoes-slot" id="optAcoes" hidden style="margin-top:12px">' +
      '<button class="btn btn-mini ok" id="btnBaixar">Baixar arquivo</button>' +
    '</div>' +
    '<div class="campo" id="optSlotWrap" hidden style="margin-top:12px">' +
      '<label>Enviar direto para um slot</label>' +
      '<div class="ferr-linha" style="margin:0">' +
        '<div class="campo"><select id="optSlot"></select></div>' +
        '<button class="btn btn-mini" id="btnEnviarSlot">Enviar</button>' +
      '</div>' +
    '</div>'
  );

  box.appendChild(c);

  var arquivo = null;
  var resultado = null;
  var dz = b.querySelector('#dz1');
  var inp = document.getElementById('arquivoFerramenta');

  dz.onclick = function(){ abrirSeletor(inp, function(f){ processar(f); }); };
  dz.ondragover = function(e){ e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = function(){ dz.classList.remove('over'); };
  dz.ondrop = function(e){
    e.preventDefault();
    dz.classList.remove('over');
    if(e.dataTransfer.files && e.dataTransfer.files[0]) processar(e.dataTransfer.files[0]);
  };

  function processar(file){
    arquivo = file;

    var fmt = b.querySelector('#fFormato').value;
    var maxW = parseInt(b.querySelector('#fMaxW').value, 10) || 1600;
    var q = parseInt(b.querySelector('#fQ').value, 10) || 82;
    var alvo = parseInt(b.querySelector('#fAlvo').value, 10) || 0;

    toast('Processando…');

    otimizarImagem(file, { maxW: maxW, q: q, formato: fmt, alvoKb: alvo })
      .then(function(r){
        if(!r.blob){ toast('Não foi possível converter.', 'erro'); return; }

        resultado = r;

        b.querySelector('#optGrid').hidden = false;
        b.querySelector('#optAcoes').hidden = false;
        b.querySelector('#optSlotWrap').hidden = false;

        b.querySelector('#optOrig').src = URL.createObjectURL(file);
        b.querySelector('#optOrigMeta').innerHTML = '<b>' + kb(file.size) + '</b><br>' + (file.type || '—');

        b.querySelector('#optNovo').src = URL.createObjectURL(r.blob);
        b.querySelector('#optNovoMeta').innerHTML =
          '<b>' + kb(r.blob.size) + '</b> · ' + r.w + '×' + r.h + '<br>' + r.formato.replace('image/', '');

        var dif = file.size > 0 ? Math.round((1 - r.blob.size / file.size) * 100) : 0;
        var g = b.querySelector('#optGanho');

        g.className = 'ganho ' + (dif > 0 ? 'bom' : 'ruim');
        g.textContent = dif > 0 ? '−' + dif + '% de peso' : '+' + Math.abs(dif) + '% (ficou maior)';

        preencherSelectSlots(b.querySelector('#optSlot'));
        toast('Pronto.', 'ok');
      })
      .catch(function(){ toast('Não foi possível processar.', 'erro'); });
  }

  ['#fFormato', '#fMaxW', '#fQ', '#fAlvo'].forEach(function(sel){
    b.querySelector(sel).onchange = function(){
      if(arquivo) processar(arquivo);
    };
  });

  b.querySelector('#btnBaixar').onclick = function(){
    if(!resultado) return;
    baixarBlob(resultado.blob, String(arquivo.name).replace(/\.[^.]+$/, '') + '.' + extDoFormato(resultado.formato));
  };

  b.querySelector('#btnEnviarSlot').onclick = function(){
    if(!resultado) return;

    var s = catalogo[parseInt(b.querySelector('#optSlot').value, 10)];
    if(!s){ toast('Slot inválido.', 'erro'); return; }

    enviarParaSlot(resultado, arquivo.name, s);
  };
}

/* ---------- CONVERSOR EM LOTE ---------- */
function montarLote(box){
  var c = ferrCard('📦', 'Conversor em lote',
    'Converta várias imagens de uma vez para WebP e baixe todas juntas.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="dropzone" id="dz2">' +
      '<div class="dz-ico">🗂️</div>' +
      '<div class="dz-txt">Clique ou arraste várias imagens</div>' +
    '</div>' +
    '<div class="ferr-linha" style="margin-top:14px">' +
      '<div class="campo"><label>Largura máxima</label><input type="number" id="lMaxW" value="1600" min="200" max="4000" step="50"></div>' +
      '<div class="campo"><label>Qualidade</label><input type="number" id="lQ" value="82" min="20" max="100"></div>' +
    '</div>' +
    '<div id="loteResultado"></div>' +
    '<div class="acoes-slot" id="loteAcoes" hidden style="margin-top:12px">' +
      '<button class="btn btn-mini ok" id="btnBaixarTodos">Baixar todas</button>' +
    '</div>'
  );

  box.appendChild(c);

  var dz = b.querySelector('#dz2');
  var inp = document.getElementById('arquivoFerramenta');
  var convertidos = [];

  dz.onclick = function(){
    abrirSeletor(inp, null, true, function(files){
      rodar(Array.prototype.slice.call(files));
    });
  };
  dz.ondragover = function(e){ e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = function(){ dz.classList.remove('over'); };
  dz.ondrop = function(e){
    e.preventDefault();
    dz.classList.remove('over');
    if(e.dataTransfer.files) rodar(Array.prototype.slice.call(e.dataTransfer.files));
  };

  function rodar(files){
    if(!files.length) return;

    var maxW = parseInt(b.querySelector('#lMaxW').value, 10) || 1600;
    var q = parseInt(b.querySelector('#lQ').value, 10) || 82;

    var out = b.querySelector('#loteResultado');
    out.innerHTML = '';
    convertidos = [];

    var totalOrig = 0;
    var totalNovo = 0;

    var fila = Promise.resolve();

    files.forEach(function(f){
      fila = fila.then(function(){
        return otimizarImagem(f, { maxW: maxW, q: q, formato: 'image/webp' })
          .then(function(r){
            if(!r.blob) return;

            totalOrig += f.size;
            totalNovo += r.blob.size;

            var nome = String(f.name).replace(/\.[^.]+$/, '') + '.' + extDoFormato(r.formato);
            convertidos.push({ blob: r.blob, nome: nome });

            var d = document.createElement('div');
            d.className = 'res-item';
            d.innerHTML =
              '<img src="' + URL.createObjectURL(r.blob) + '" alt="">' +
              '<div class="res-info"><b>' + esc(f.name) + '</b>' +
                '<span class="det">' + kb(f.size) + ' → ' + kb(r.blob.size) + ' · ' + r.w + '×' + r.h + '</span></div>';

            d.appendChild(botao('⬇️', 'btn-mini', function(){ baixarBlob(r.blob, nome); }));
            out.appendChild(d);
          })
          .catch(function(){});
      });
    });

    fila.then(function(){
      if(!convertidos.length){ toast('Nada convertido.', 'erro'); return; }

      b.querySelector('#loteAcoes').hidden = false;

      var resumo = document.createElement('div');
      resumo.className = 'ok-box';

      var dif = totalOrig > 0 ? Math.round((1 - totalNovo / totalOrig) * 100) : 0;
      resumo.textContent = convertidos.length + ' imagem(ns) · ' + kb(totalOrig) + ' → ' + kb(totalNovo) + ' (−' + dif + '%)';

      out.insertBefore(resumo, out.firstChild);
      toast(convertidos.length + ' convertidas.', 'ok');
    });
  }

  b.querySelector('#btnBaixarTodos').onclick = function(){
    convertidos.forEach(function(cv, i){
      setTimeout(function(){ baixarBlob(cv.blob, cv.nome); }, i * 350);
    });
  };
}

/* ---------- GERADOR DE TAMANHOS ---------- */
function montarTamanhos(box){
  var c = ferrCard('📐', 'Gerador de tamanhos',
    'Gera a mesma imagem em 400, 800, 1200 e 1600 px.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="dropzone" id="dz3"><div class="dz-ico">🖼️</div><div class="dz-txt">Clique ou arraste uma imagem</div></div>' +
    '<div id="tamResultado" style="margin-top:14px"></div>' +
    '<div class="acoes-slot" id="tamAcoes" hidden style="margin-top:12px"><button class="btn btn-mini ok" id="btnBaixarTams">Baixar todas</button></div>'
  );

  box.appendChild(c);

  var dz = b.querySelector('#dz3');
  var inp = document.getElementById('arquivoFerramenta');
  var gerados = [];

  dz.onclick = function(){ abrirSeletor(inp, function(f){ rodar(f); }); };
  dz.ondragover = function(e){ e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = function(){ dz.classList.remove('over'); };
  dz.ondrop = function(e){
    e.preventDefault();
    dz.classList.remove('over');
    if(e.dataTransfer.files && e.dataTransfer.files[0]) rodar(e.dataTransfer.files[0]);
  };

  function rodar(file){
    var larguras = [400, 800, 1200, 1600];
    var out = b.querySelector('#tamResultado');
    out.innerHTML = '';
    gerados = [];

    var fila = Promise.resolve();

    larguras.forEach(function(w){
      fila = fila.then(function(){
        return otimizarImagem(file, { maxW: w, q: 82, formato: 'image/webp' })
          .then(function(r){
            if(!r.blob) return;

            var nome = String(file.name).replace(/\.[^.]+$/, '') + '-' + r.w + 'w.' + extDoFormato(r.formato);
            gerados.push({ blob: r.blob, nome: nome });

            var d = document.createElement('div');
            d.className = 'res-item';
            d.innerHTML =
              '<img src="' + URL.createObjectURL(r.blob) + '" alt="">' +
              '<div class="res-info"><b>' + r.w + ' × ' + r.h + '</b><span class="det">' + kb(r.blob.size) + '</span></div>';

            d.appendChild(botao('⬇️', 'btn-mini', function(){ baixarBlob(r.blob, nome); }));
            out.appendChild(d);
          })
          .catch(function(){});
      });
    });

    fila.then(function(){
      b.querySelector('#tamAcoes').hidden = !gerados.length;
      if(gerados.length) toast(gerados.length + ' tamanhos gerados.', 'ok');
    });
  }

  b.querySelector('#btnBaixarTams').onclick = function(){
    gerados.forEach(function(g, i){
      setTimeout(function(){ baixarBlob(g.blob, g.nome); }, i * 350);
    });
  };
}

/* ---------- OTIMIZAÇÃO AUTOMÁTICA ---------- */
function montarAutoCfg(box){
  var cfg = settingsOpt();
  var c = ferrCard('⚡', 'Otimização automática',
    'Aplicada a toda imagem enviada pelo admin. GIFs não são afetados.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<label class="check-linha">' +
      '<input type="checkbox" id="cfgAtivo"' + (cfg.ativo ? ' checked' : '') + '> Converter para WebP automaticamente' +
    '</label>' +
    '<div class="ferr-linha">' +
      '<div class="campo"><label>Largura máxima</label><input type="number" id="cfgMaxW" value="' + cfg.maxW + '" min="200" max="4000" step="50"></div>' +
      '<div class="campo"><label>Qualidade</label><input type="number" id="cfgQ" value="' + cfg.q + '" min="20" max="100"></div>' +
      '<button class="btn btn-mini ok" id="btnSalvarCfg" style="align-self:flex-end">Salvar</button>' +
    '</div>'
  );

  box.appendChild(c);

  b.querySelector('#btnSalvarCfg').onclick = function(){
    salvarSettingsOpt({
      ativo: b.querySelector('#cfgAtivo').checked,
      maxW: parseInt(b.querySelector('#cfgMaxW').value, 10) || 1600,
      q: parseInt(b.querySelector('#cfgQ').value, 10) || 82
    });
    toast('Configuração salva.', 'ok');
  };
}

/* ---------- VERIFICADOR DE ENQUADRAMENTO ---------- */
function montarProporcao(box){
  var c = ferrCard('✂️', 'Verificador de enquadramento',
    'Confere se a imagem combina com o formato do slot. Fora do formato ela é cortada no site.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="acoes-slot" style="margin-top:0"><button class="btn btn-mini" id="btnProporcao">Verificar</button></div>' +
    '<div id="propBox"></div>'
  );

  box.appendChild(c);

  b.querySelector('#btnProporcao').onclick = function(){
    var out = b.querySelector('#propBox');
    out.innerHTML = '<p style="font-size:12.5px;color:#8a94a8;margin-top:12px">Verificando…</p>';

    var alvos = [];

    catalogo.forEach(function(s){
      (itens[s.slot] || []).forEach(function(it, i){
        if(!s.proporcao) return;
        alvos.push({ slot: s.rotulo + (i ? ' #' + (i + 1) : ''), url: it.url, prop: s.proporcao });
      });
    });

    if(!alvos.length){
      out.innerHTML = '<div class="ok-box">Nenhuma imagem própria cadastrada ainda.</div>';
      return;
    }

    var testes = alvos.map(function(a){
      return new Promise(function(res){
        var img = new Image();
        img.onload = function(){
          var partes = a.prop.split('/');
          var alvo = parseFloat(partes[0]) / parseFloat(partes[1]);
          var real = img.naturalWidth / img.naturalHeight;
          var desvio = Math.abs(real - alvo) / alvo;
          res({
            slot: a.slot, url: a.url, prop: a.prop,
            w: img.naturalWidth, h: img.naturalHeight, desvio: desvio
          });
        };
        img.onerror = function(){ res(null); };
        img.src = a.url;
      });
    });

    Promise.all(testes).then(function(res){
      var ruins = res.filter(function(r){ return r && r.desvio > 0.18; });

      if(!ruins.length){
        out.innerHTML = '<div class="ok-box">Todas as ' + res.filter(Boolean).length +
          ' imagens estão dentro do formato do slot.</div>';
        return;
      }

      var html = '<div class="alerta-box">' + ruins.length + ' imagem(ns) fora do formato — vão aparecer cortadas:</div>';

      ruins.forEach(function(r){
        html += '<div class="res-item">' +
          '<img src="' + esc(r.url) + '" alt="">' +
          '<div class="res-info"><b>' + esc(r.slot) + '</b>' +
          '<span class="det">' + r.w + '×' + r.h + ' · slot ' + esc(r.prop) + ' · corte de ' +
          Math.round(r.desvio * 100) + '%</span></div></div>';
      });

      out.innerHTML = html;
    });
  };
}

/* ---------- DUPLICADAS ---------- */
function montarDuplicadas(box){
  var c = ferrCard('♻️', 'Imagens repetidas',
    'Encontra a mesma imagem cadastrada em mais de um slot.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="acoes-slot" style="margin-top:0"><button class="btn btn-mini" id="btnDup">Procurar</button></div>' +
    '<div id="dupBox"></div>'
  );

  box.appendChild(c);

  b.querySelector('#btnDup').onclick = function(){
    var out = b.querySelector('#dupBox');
    var mapa = {};

    catalogo.forEach(function(s){
      (itens[s.slot] || []).forEach(function(it){
        if(!mapa[it.url]) mapa[it.url] = [];
        mapa[it.url].push(s.rotulo);
      });
    });

    var repetidas = Object.keys(mapa).filter(function(u){ return mapa[u].length > 1; });

    if(!repetidas.length){
      out.innerHTML = '<div class="ok-box">Nenhuma imagem repetida entre slots.</div>';
      return;
    }

    var html = '<div class="alerta-box">' + repetidas.length + ' imagem(ns) usada(s) em mais de um lugar:</div>';

    repetidas.forEach(function(u){
      html += '<div class="res-item">' +
        '<img src="' + esc(u) + '" alt="">' +
        '<div class="res-info"><b>' + esc(mapa[u].join(' · ')) + '</b>' +
        '<span class="det">' + String(u).split('/').pop() + '</span></div></div>';
    });

    out.innerHTML = html;
  };
}

/* ---------- BACKUP ---------- */
function montarBackup(box){
  var c = ferrCard('💾', 'Backup e restauração',
    'Salve a configuração atual em JSON ou restaure um arquivo salvo antes.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="acoes-slot" style="margin-top:0">' +
      '<button class="btn btn-mini ok" id="btnExportar">Baixar backup</button>' +
      '<button class="btn btn-mini" id="btnEscolherBackup">Restaurar backup</button>' +
    '</div>' +
    '<div id="backupLog" style="margin-top:14px;font-size:12.5px;color:#4a5161;line-height:1.8"></div>'
  );

  box.appendChild(c);

  b.querySelector('#btnExportar').onclick = function(){
    var dados = { exportado: new Date().toISOString(), itens: itens };

    baixarBlob(
      new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }),
      'meu3dlabs-imagens-' + new Date().toISOString().slice(0, 10) + '.json'
    );

    toast('Backup baixado.', 'ok');
  };

  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json';
  inp.className = 'hidden';
  b.appendChild(inp);

  b.querySelector('#btnEscolherBackup').onclick = function(){
    inp.value = '';

    inp.onchange = function(){
      var f = inp.files && inp.files[0];
      if(!f) return;

      var fr = new FileReader();

      fr.onload = function(){
        var log = b.querySelector('#backupLog');
        var dados;

        try{ dados = JSON.parse(fr.result); }
        catch(e){ log.textContent = 'Arquivo inválido.'; return; }

        var slots = dados.itens || {};
        var fila = Promise.resolve();
        var n = 0;

        Object.keys(slots).forEach(function(slot){
          fila = fila.then(function(){
            return fetch(API_IMG + '/' + encodeURIComponent(slot) + '/replace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-story-key': chave },
              body: JSON.stringify({
                itens: (slots[slot] || []).map(function(it){
                  return { url: it.url, alt: '', link: '' };
                })
              })
            }).then(function(){ n += (slots[slot] || []).length; });
          });
        });

        fila.then(function(){
          log.textContent = n + ' imagem(ns) restaurada(s).';
          toast('Restaurado.', 'ok');
          lista = {};
          carregar();
        });
      };

      fr.readAsText(f);
    };

    inp.click();
  };
}

/* ---------- PESO DAS IMAGENS ---------- */
function montarPeso(box){
  var c = ferrCard('📊', 'Peso das imagens',
    'Verifica quanto pesa cada imagem em uso. Acima de 300 KB merece atenção.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="acoes-slot" style="margin-top:0"><button class="btn btn-mini" id="btnDiag">Verificar</button></div>' +
    '<div id="pesoBox"></div>'
  );

  box.appendChild(c);

  function medir(url){
    return fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then(function(r){
        var n = parseInt(r.headers.get('content-length'), 10);
        if(!isNaN(n) && n > 0) return n;
        return fetch(url, { cache: 'no-store' })
          .then(function(r2){ return r2.blob(); })
          .then(function(bl){ return bl.size; });
      })
      .catch(function(){ return 0; });
  }

  b.querySelector('#btnDiag').onclick = function(){
    var out = b.querySelector('#pesoBox');
    out.innerHTML = '<p style="font-size:12.5px;color:#8a94a8;margin-top:12px">Verificando…</p>';

    var linhas = [];
    var consultas = [];

    catalogo.forEach(function(s){
      (itens[s.slot] || []).forEach(function(it, i){
        consultas.push(medir(it.url).then(function(bytes){
          linhas.push({ slot: s.rotulo + (i ? ' #' + (i + 1) : ''), url: it.url, bytes: bytes });
        }));
      });
    });

    if(!consultas.length){
      out.innerHTML = '<div class="ok-box">Nenhuma imagem própria cadastrada.</div>';
      return;
    }

    Promise.all(consultas).then(function(){
      linhas.sort(function(a, b2){ return b2.bytes - a.bytes; });

      var html = '<table class="tabela"><thead><tr>' +
        '<th></th><th>Slot</th><th>Arquivo</th><th style="text-align:right">Peso</th></tr></thead><tbody>';

      var total = 0;

      linhas.forEach(function(l){
        total += l.bytes;
        var nome = String(l.url).split('/').pop().split('?')[0];

        html += '<tr><td><img src="' + esc(l.url) + '" alt=""></td>' +
          '<td>' + esc(l.slot) + '</td>' +
          '<td style="word-break:break-all;font-size:11.5px">' + esc(nome) + '</td>' +
          '<td class="peso' + (l.bytes > 300 * 1024 ? ' alerta' : '') + '">' + kb(l.bytes) + '</td></tr>';
      });

      html += '</tbody></table><p style="font-size:12.5px;color:#4a5161;margin-top:12px">Total: <b>' +
        kb(total) + '</b> em ' + linhas.length + ' imagem(ns).</p>';

      out.innerHTML = html;
    });
  };
}

/* ---------- IMAGENS QUEBRADAS ---------- */
function montarQuebradas(box){
  var c = ferrCard('🔎', 'Imagens quebradas',
    'Testa cada imagem cadastrada e avisa se alguma não está carregando.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="acoes-slot" style="margin-top:0"><button class="btn btn-mini" id="btnQuebradas">Testar todas</button></div>' +
    '<div id="quebradasBox"></div>'
  );

  box.appendChild(c);

  b.querySelector('#btnQuebradas').onclick = function(){
    var out = b.querySelector('#quebradasBox');
    out.innerHTML = '<p style="font-size:12.5px;color:#8a94a8;margin-top:12px">Testando…</p>';

    var testes = [];

    catalogo.forEach(function(s){
      (itens[s.slot] || []).forEach(function(it, i){
        testes.push(
          fetch(it.url, { method: 'HEAD', cache: 'no-store' })
            .then(function(r){
              return r.ok ? null : { slot: s.rotulo + (i ? ' #' + (i + 1) : ''), url: it.url, status: r.status };
            })
            .catch(function(){
              return { slot: s.rotulo, url: it.url, status: 'sem resposta' };
            })
        );
      });
    });

    if(!testes.length){
      out.innerHTML = '<div class="ok-box">Nenhuma imagem própria cadastrada para testar.</div>';
      return;
    }

    Promise.all(testes).then(function(res){
      var ruins = res.filter(Boolean);

      if(!ruins.length){
        out.innerHTML = '<div class="ok-box">Todas as ' + res.length + ' imagens estão carregando.</div>';
        return;
      }

      var html = '<div class="alerta-box">' + ruins.length + ' imagem(ns) com problema:</div>';

      ruins.forEach(function(r){
        html += '<div class="res-item"><div class="res-info"><b>' + esc(r.slot) + '</b>' +
          '<span class="det">' + esc(r.url) + ' · ' + esc(r.status) + '</span></div></div>';
      });

      out.innerHTML = html;
    });
  };
}

/* ---------- PALETA DE CORES ---------- */
function montarPaleta(box){
  var c = ferrCard('🎨', 'Paleta de cores',
    'Extrai as cores dominantes de uma imagem.');
  var b = corpo(c);

  b.insertAdjacentHTML('beforeend',
    '<div class="dropzone" id="dz4"><div class="dz-ico">🎨</div><div class="dz-txt">Clique ou arraste uma imagem</div></div>' +
    '<div id="paletaBox"></div>'
  );

  box.appendChild(c);

  var dz = b.querySelector('#dz4');
  var inp = document.getElementById('arquivoFerramenta');

  dz.onclick = function(){ abrirSeletor(inp, function(f){ rodar(f); }); };
  dz.ondragover = function(e){ e.preventDefault(); dz.classList.add('over'); };
  dz.ondragleave = function(){ dz.classList.remove('over'); };
  dz.ondrop = function(e){
    e.preventDefault();
    dz.classList.remove('over');
    if(e.dataTransfer.files && e.dataTransfer.files[0]) rodar(e.dataTransfer.files[0]);
  };

  function rodar(file){
    carregarImagem(file).then(function(r){
      var cv = document.createElement('canvas');
      cv.width = 90;
      cv.height = 90;

      var ctx = cv.getContext('2d');
      ctx.drawImage(r.img, 0, 0, 90, 90);
      URL.revokeObjectURL(r.url);

      var dados = ctx.getImageData(0, 0, 90, 90).data;
      var mapa = {};

      for(var i = 0; i < dados.length; i += 4){
        if(dados[i + 3] < 200) continue;

        var chave = [
          Math.round(dados[i] / 32) * 32,
          Math.round(dados[i + 1] / 32) * 32,
          Math.round(dados[i + 2] / 32) * 32
        ].join(',');

        mapa[chave] = (mapa[chave] || 0) + 1;
      }

      var cores = Object.keys(mapa).map(function(k){
        return { rgb: k.split(',').map(Number), n: mapa[k] };
      }).sort(function(a, b2){ return b2.n - a.n; }).slice(0, 6);

      var html = '<div class="paleta">';

      cores.forEach(function(cor){
        var hex = '#' + cor.rgb.map(function(v){
          return ('0' + Math.min(255, v).toString(16)).slice(-2);
        }).join('');

        html += '<div class="cor"><div class="amostra" style="background:' + hex + '"></div>' + hex + '</div>';
      });

      html += '</div>';

      b.querySelector('#paletaBox').innerHTML = html;
    })
    .catch(function(){ toast('Não foi possível ler a imagem.', 'erro'); });
  }
}