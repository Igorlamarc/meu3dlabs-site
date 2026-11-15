/* ============================================================
   MEU 3D LABS — MINHA CONTA
   Firebase Auth + Firestore | Pedidos via localStorage
   Campos no Firestore (clientes/{uid}):
   nome, email, whatsapp, nascimentoDia, nascimentoMes,
   cep, rua, numero, complemento, bairro, cidade, uf, cpf, foto
   ============================================================ */

(function () {

  /* ==================== 1. CONFIG ==================== */
  var firebaseConfig = {
    apiKey: "AIzaSyAZwBSpyU9KAsrvqjVaFIShbdhoPu-C11s",
    authDomain: "meu3dlabs-loja.firebaseapp.com",
    projectId: "meu3dlabs-loja",
    storageBucket: "meu3dlabs-loja.firebasestorage.app",
    messagingSenderId: "429562795244",
    appId: "1:429562795244:web:d9d54e2b30941ab8eb81c9"
  };

  if (typeof firebase === 'undefined') {
    mostrarFatal('Os scripts do Firebase não carregaram. Recarregue a página.');
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = (typeof firebase.firestore === 'function') ? firebase.firestore() : null;
  auth.languageCode = 'pt-BR';

  /* ==================== 2. ESTADO ==================== */
  var perfil = null;
  var perfilOriginal = null;
  var uidAtual = null;

  var mesesN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  var MAX_FOTO_BYTES = 5 * 1024 * 1024;
  var OUT_SIZE = 320;

  /* ==================== 3. ELEMENTOS ==================== */
  var el = {
    loading:      document.getElementById('mcLoading'),
    main:         document.getElementById('mcMain'),
    avatar:       document.getElementById('mcAvatar'),
    userName:     document.getElementById('mcUserName'),
    userMail:     document.getElementById('mcUserMail'),
    form:         document.getElementById('formDados'),
    listaPedidos: document.getElementById('listaPedidos'),
    toast:        document.getElementById('mcToast'),
    navBtns:      document.querySelectorAll('.mc-nav-btn[data-panel]'),
    panels:       document.querySelectorAll('.mc-panel'),
    overlaySenha: document.getElementById('overlaySenha'),
    fotoPreview:  document.getElementById('fotoPreview'),
    fotoIniciais: document.getElementById('fotoIniciais'),
    fotoImg:      document.getElementById('fotoImg'),
    fotoInput:    document.getElementById('fotoInput'),
    fotoBtnRemover: document.getElementById('fotoBtnRemover'),
    cpfAddBtn:    document.getElementById('cpfAddBtn'),
    cpfInputWrap: document.getElementById('cpfInputWrap'),
    cpfLocked:    document.getElementById('fCpfLocked'),
    cpfLockTag:   document.getElementById('cpfLockTag'),
    cpfHint:      document.getElementById('cpfHint')
  };

  /* ==================== 4. HELPERS ==================== */
  function mostrarToast(msg, tipo) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.className = 'mc-toast show ' + (tipo || '');
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(function () {
      el.toast.className = 'mc-toast';
    }, 3800);
  }

  function mostrarFatal(msg) {
    if (el.loading) {
      el.loading.innerHTML =
        '<div class="mc-empty"><div class="ico">⚠️</div>' +
        '<h3>Não foi possível carregar</h3><p>' + msg + '</p>' +
        '<a href="loja.html" class="btn-salvar" style="text-decoration:none;">Voltar para a loja</a></div>';
    }
  }

  function iniciais(nome) {
    if (!nome) return '?';
    var p = String(nome).trim().split(/\s+/);
    return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || '?';
  }

  function mascaraTelefone(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 11);
    var s = '';
    if (d.length > 0) s = '(' + d.slice(0, 2);
    if (d.length > 2) s += ') ' + d.slice(2, 7);
    if (d.length > 6) s += '-' + d.slice(7, 11);
    return s;
  }

  function mascaraCEP(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  }

  function mascaraCPF(v) {
    var d = String(v || '').replace(/\D/g, '').slice(0, 11);
    if (d.length > 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9);
    if (d.length > 6) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6);
    if (d.length > 3) return d.slice(0,3) + '.' + d.slice(3);
    return d;
  }

  function validarCPF(cpf) {
    var d = String(cpf || '').replace(/\D/g, '');
    if (d.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(d)) return false;

    var soma = 0, resto, i, j;
    for (i = 1; i <= 9; i++) soma += parseInt(d[i - 1], 10) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(d[9], 10)) return false;

    soma = 0;
    for (j = 1; j <= 10; j++) soma += parseInt(d[j - 1], 10) * (12 - j);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(d[10], 10);
  }

  function fmtBRL(v) {
    v = parseFloat(v) || 0;
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  function dataBonita(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
             ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  }

  /* Espelho público — o admin lê apenas email + foto daqui */
  function salvarEspelhoFoto(foto, extra) {
    if (!db || !uidAtual) return Promise.resolve();
    var emailEspelho = (perfil && perfil.email)
      || (auth.currentUser && auth.currentUser.email)
      || '';
    if (!emailEspelho) return Promise.resolve();

    var dados = {
      email: String(emailEspelho).toLowerCase(),
      foto: foto || ''
    };
    if (extra && extra.nome) dados.nome = extra.nome;

    return db.collection('clientes_publico').doc(uidAtual)
      .set(dados, { merge: true })
      .catch(function (e) {
        console.warn('minha-conta: espelho público não salvo', e);
      });
  }

  /* ==================== 5. NAVEGAÇÃO ==================== */
  Array.prototype.forEach.call(el.navBtns, function (btn) {
    btn.addEventListener('click', function () {
      var alvo = btn.dataset.panel;

      Array.prototype.forEach.call(el.navBtns, function (b) {
        b.classList.toggle('active', b === btn);
      });
      Array.prototype.forEach.call(el.panels, function (p) {
        p.classList.toggle('active', p.id === 'panel-' + alvo);
      });

      if (alvo === 'pedidos' && !el.listaPedidos.dataset.loaded) {
        carregarPedidos();
      }

      try { history.replaceState(null, '', '#' + alvo); } catch (e) {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ==================== 6. PERFIL ==================== */
  function carregarPerfil(user) {
    uidAtual = user.uid;
    var nomeAuth = (user.displayName || '').trim();

    atualizarSidebar(nomeAuth || 'Cliente', user.email || '—', '');

    if (!db) {
      perfil = { nome: nomeAuth, email: user.email || '' };
      perfilOriginal = JSON.parse(JSON.stringify(perfil));
      preencherFormulario(perfil);
      renderCPF('');
      mostrarFotoBase64('');
      revelar();
      return;
    }

    db.collection('clientes').doc(user.uid).get()
      .then(function (snap) {
        var p = snap.exists ? (snap.data() || {}) : {};

        perfil = {
          nome:          p.nome || nomeAuth,
          email:         user.email || p.email || '',
          whatsapp:      p.whatsapp || '',
          nascimentoDia: p.nascimentoDia || null,
          nascimentoMes: p.nascimentoMes || null,
          cep:           p.cep || '',
          rua:           p.rua || '',
          numero:        p.numero || '',
          complemento:   p.complemento || '',
          bairro:        p.bairro || '',
          cidade:        p.cidade || '',
          uf:            p.uf || '',
          cpf:           p.cpf || '',
          foto:          p.foto || ''
        };

        if (!snap.exists) {
          db.collection('clientes').doc(user.uid)
            .set({ nome: perfil.nome, email: perfil.email }, { merge: true })
            .catch(function (e) { console.warn('minha-conta: perfil não criado', e); });
        }

        /* Garante que o espelho exista para quem já tinha foto antes da mudança */
        if (perfil.foto && perfil.email) {
          salvarEspelhoFoto(perfil.foto, { nome: perfil.nome });
        }

        perfilOriginal = JSON.parse(JSON.stringify(perfil));

        preencherFormulario(perfil);
        renderCPF(perfil.cpf);
        mostrarFotoBase64(perfil.foto);
        atualizarSidebar(perfil.nome, perfil.email, perfil.foto);
        revelar();

      })
      .catch(function (e) {
        console.error('minha-conta: erro ao carregar perfil', e);
        perfil = { nome: nomeAuth, email: user.email || '' };
        perfilOriginal = JSON.parse(JSON.stringify(perfil));
        preencherFormulario(perfil);
        renderCPF('');
        mostrarFotoBase64('');
        revelar();
        mostrarToast('Alguns dados não puderam ser carregados.', 'err');
      });
  }

  function revelar() {
    if (el.loading) el.loading.style.display = 'none';
    if (el.main) el.main.style.display = 'block';
  }

  function atualizarSidebar(nome, email, foto) {
    if (el.userName) el.userName.textContent = nome || 'Cliente';
    if (el.userMail) el.userMail.textContent = email || '—';

    if (el.avatar) {
      if (foto) {
        el.avatar.style.background = 'none';
        el.avatar.innerHTML = '<img src="' + foto + '" alt="">';
      } else {
        el.avatar.style.background = '';
        el.avatar.textContent = iniciais(nome);
      }
    }

    if (el.fotoIniciais) el.fotoIniciais.textContent = iniciais(nome);
  }

  function preencherFormulario(p) {
    var set = function (id, val) {
      var i = document.getElementById(id);
      if (i) i.value = val == null ? '' : val;
    };
    set('fNome',     p.nome);
    set('fEmail',    p.email);
    set('fWhats',    p.whatsapp ? mascaraTelefone(p.whatsapp) : '');
    set('fNasc',     (p.nascimentoDia && p.nascimentoMes)
                       ? (p.nascimentoDia + ' de ' + mesesN[p.nascimentoMes - 1])
                       : '—');
    set('fCep',      p.cep ? mascaraCEP(p.cep) : '');
    set('fRua',      p.rua);
    set('fNum',      p.numero);
    set('fComp',     p.complemento);
    set('fBairro',   p.bairro);
    set('fCidade',   p.cidade ? (p.cidade + (p.uf ? ' - ' + p.uf : '')) : '');
  }

  /* ==================== 7. CPF ==================== */
  function renderCPF(cpf) {
    var btn    = el.cpfAddBtn;
    var wrap   = el.cpfInputWrap;
    var locked = el.cpfLocked;
    var tag    = el.cpfLockTag;
    var hint   = el.cpfHint;

    if (!btn || !wrap || !locked) return;

    if (cpf) {
      btn.style.display = 'none';
      wrap.style.display = 'none';
      locked.style.display = '';
      locked.value = mascaraCPF(cpf);
      if (tag) tag.style.display = '';
      if (hint) {
        hint.textContent = 'Para alterar o CPF, envie uma mensagem no WhatsApp. Vamos pedir um documento para confirmar.';
        hint.className = 'hint bloq';
      }
    } else {
      btn.style.display = '';
      wrap.style.display = 'none';
      locked.style.display = 'none';
      if (tag) tag.style.display = 'none';
      if (hint) {
        hint.textContent = 'O CPF é usado apenas para emissão de nota fiscal.';
        hint.className = 'hint';
      }
    }
  }

  if (el.cpfAddBtn) {
    el.cpfAddBtn.addEventListener('click', function () {
      el.cpfAddBtn.style.display = 'none';
      el.cpfInputWrap.style.display = 'flex';
      var inp = document.getElementById('fCpf');
      if (inp) { inp.value = ''; inp.focus(); }
    });
  }

  var cpfCancel = document.getElementById('cpfCancel');
  if (cpfCancel) {
    cpfCancel.addEventListener('click', function () {
      el.cpfInputWrap.style.display = 'none';
      el.cpfAddBtn.style.display = '';
    });
  }

  var fCpfInput = document.getElementById('fCpf');
  if (fCpfInput) {
    fCpfInput.addEventListener('input', function () {
      this.value = mascaraCPF(this.value);
    });
  }

  var cpfSave = document.getElementById('cpfSave');
  if (cpfSave) {
    cpfSave.addEventListener('click', function () {
      var inp = document.getElementById('fCpf');
      var valor = inp ? inp.value.replace(/\D/g, '') : '';

      if (!validarCPF(valor)) {
        mostrarToast('CPF inválido. Confira os números.', 'err');
        return;
      }
      if (!db || !uidAtual) {
        mostrarToast('Sessão expirada — entre novamente.', 'err');
        return;
      }

      var btn = cpfSave;
      var rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Salvando...';

      db.collection('clientes').doc(uidAtual)
        .set({ cpf: valor }, { merge: true })
        .then(function () {
          if (perfil) perfil.cpf = valor;
          if (perfilOriginal) perfilOriginal.cpf = valor;
          renderCPF(valor);
          mostrarToast('CPF salvo com sucesso.', 'ok');
          btn.disabled = false;
          btn.textContent = rotulo;
        })
        .catch(function (e) {
          console.error('minha-conta: erro ao salvar CPF', e);
          mostrarToast('Não foi possível salvar o CPF. Tente novamente.', 'err');
          btn.disabled = false;
          btn.textContent = rotulo;
        });
    });
  }

  /* ==================== 8. FOTO COM RECORTE ==================== */

  var crop = {
    overlay:   document.getElementById('cropOverlay'),
    stage:     document.getElementById('cropStage'),
    canvas:    document.getElementById('cropCanvas'),
    slider:    document.getElementById('cropSlider'),
    mais:      document.getElementById('cropMais'),
    menos:     document.getElementById('cropMenos'),
    aplicar:   document.getElementById('cropAplicar'),
    cancelar:  document.getElementById('cropCancelar'),
    ctx:       null,
    img:       null,
    escala:    1,
    minEscala: 1,
    maxEscala: 4,
    offX:      0,
    offY:      0,
    palcoW:    0,
    palcoH:    0,
    arrastando: false,
    pxIni: 0, pyIni: 0, offIniX: 0, offIniY: 0
  };

  function mostrarFotoBase64(dataUrl) {
    if (!el.fotoImg || !el.fotoIniciais) return;
    if (dataUrl) {
      el.fotoImg.src = dataUrl;
      el.fotoImg.style.display = 'block';
      el.fotoIniciais.style.display = 'none';
      if (el.fotoBtnRemover) el.fotoBtnRemover.style.display = '';
    } else {
      el.fotoImg.removeAttribute('src');
      el.fotoImg.style.display = 'none';
      el.fotoIniciais.style.display = '';
      if (el.fotoBtnRemover) el.fotoBtnRemover.style.display = 'none';
    }
  }

  function diametroCirculo() {
    var ring = crop.stage ? crop.stage.querySelector('.crop-ring') : null;
    if (ring) {
      var ow = ring.offsetWidth;
      if (ow) return ow;
    }
    var mask = crop.stage ? crop.stage.querySelector('.crop-mask') : null;
    if (mask) {
      var cs = window.getComputedStyle(mask);
      var m = cs.maskImage || cs.webkitMaskImage;
      if (m) {
        var mm = m.match(/(\d+(?:\.\d+)?)px/);
        if (mm) return parseFloat(mm[1]);
      }
    }
    return (window.innerWidth <= 480) ? 180 : 216;
  }

  function medirPalco() {
    var cw = (crop.stage && crop.stage.clientWidth) || 0;
    var ch = (crop.stage && crop.stage.clientHeight) || 0;
    if (!cw) cw = (crop.stage && crop.stage.getBoundingClientRect().width) || 0;
    if (!ch) ch = (crop.stage && crop.stage.getBoundingClientRect().height) || 0;
    if (!cw) cw = Math.min((window.innerWidth || 400) - 40, 420);
    if (!ch) ch = (window.innerWidth <= 480) ? 260 : 300;
    crop.palcoW = cw;
    crop.palcoH = ch;
    return { w: cw, h: ch };
  }

  function desenharCrop() {
    if (!crop.img || !crop.ctx) return;

    var w = crop.palcoW;
    var h = crop.palcoH;
    if (!w || !h) return;

    crop.ctx.clearRect(0, 0, w, h);

    var iw = crop.img.width * crop.escala;
    var ih = crop.img.height * crop.escala;
    var x = (w - iw) / 2 + crop.offX;
    var y = (h - ih) / 2 + crop.offY;

    crop.ctx.drawImage(crop.img, x, y, iw, ih);
  }

  function limitarOffset() {
    if (!crop.img) return;

    var diam = diametroCirculo();
    var iw = crop.img.width * crop.escala;
    var ih = crop.img.height * crop.escala;

    var maxX = Math.max(0, (iw - diam) / 2);
    var maxY = Math.max(0, (ih - diam) / 2);

    if (crop.offX > maxX) crop.offX = maxX;
    if (crop.offX < -maxX) crop.offX = -maxX;
    if (crop.offY > maxY) crop.offY = maxY;
    if (crop.offY < -maxY) crop.offY = -maxY;
  }

  function abrirCrop(file) {
    var reader = new FileReader();

    reader.onload = function (ev) {
      var img = new Image();

      img.onload = function () {
        crop.img = img;

        crop.overlay.classList.add('show');

        requestAnimationFrame(function () {
          var dim = medirPalco();
          var cw = dim.w;
          var ch = dim.h;
          var dpr = window.devicePixelRatio || 1;

          crop.canvas.width  = Math.round(cw * dpr);
          crop.canvas.height = Math.round(ch * dpr);
          crop.canvas.style.width  = cw + 'px';
          crop.canvas.style.height = ch + 'px';

          crop.ctx = crop.canvas.getContext('2d');
          crop.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          var diam = diametroCirculo();

          var fitPalco  = Math.min(cw / img.width, ch / img.height);
          var cobreCirc = diam / Math.min(img.width, img.height);
          crop.minEscala = Math.max(fitPalco * 0.85, cobreCirc);
          crop.maxEscala = crop.minEscala * 4;

          crop.escala = crop.minEscala;
          crop.offX = 0;
          crop.offY = 0;

          if (crop.slider) {
            crop.slider.min  = crop.minEscala;
            crop.slider.max  = crop.maxEscala;
            crop.slider.step = (crop.maxEscala - crop.minEscala) / 200;
            crop.slider.value = crop.escala;
          }

          limitarOffset();
          desenharCrop();
        });
      };

      img.onerror = function () {
        mostrarToast('Não foi possível abrir a imagem.', 'err');
      };

      img.src = ev.target.result;
    };

    reader.onerror = function () {
      mostrarToast('Falha ao ler o arquivo.', 'err');
    };

    reader.readAsDataURL(file);
  }

  if (crop.slider) {
    crop.slider.addEventListener('input', function () {
      crop.escala = parseFloat(this.value);
      limitarOffset();
      desenharCrop();
    });
  }

  function ajustarZoom(delta) {
    crop.escala = Math.min(crop.maxEscala, Math.max(crop.minEscala, crop.escala + delta));
    if (crop.slider) crop.slider.value = crop.escala;
    limitarOffset();
    desenharCrop();
  }

  if (crop.mais) {
    crop.mais.addEventListener('click', function () {
      ajustarZoom((crop.maxEscala - crop.minEscala) / 12);
    });
  }

  if (crop.menos) {
    crop.menos.addEventListener('click', function () {
      ajustarZoom(-(crop.maxEscala - crop.minEscala) / 12);
    });
  }

  if (crop.stage) {
    crop.stage.addEventListener('mousedown', function (e) {
      if (!crop.img) return;
      e.preventDefault();
      crop.arrastando = true;
      crop.pxIni = e.clientX;
      crop.pyIni = e.clientY;
      crop.offIniX = crop.offX;
      crop.offIniY = crop.offY;
    });

    window.addEventListener('mousemove', function (e) {
      if (!crop.arrastando) return;
      crop.offX = crop.offIniX + (e.clientX - crop.pxIni);
      crop.offY = crop.offIniY + (e.clientY - crop.pyIni);
      limitarOffset();
      desenharCrop();
    });

    window.addEventListener('mouseup', function () {
      crop.arrastando = false;
    });

    crop.stage.addEventListener('touchstart', function (e) {
      if (!crop.img || e.touches.length !== 1) return;
      e.preventDefault();
      crop.arrastando = true;
      crop.pxIni = e.touches[0].clientX;
      crop.pyIni = e.touches[0].clientY;
      crop.offIniX = crop.offX;
      crop.offIniY = crop.offY;
    }, { passive: false });

    crop.stage.addEventListener('touchmove', function (e) {
      if (!crop.arrastando || e.touches.length !== 1) return;
      e.preventDefault();
      crop.offX = crop.offIniX + (e.touches[0].clientX - crop.pxIni);
      crop.offY = crop.offIniY + (e.touches[0].clientY - crop.pyIni);
      limitarOffset();
      desenharCrop();
    }, { passive: false });

    crop.stage.addEventListener('touchend', function () {
      crop.arrastando = false;
    });
  }

  function aplicarCrop() {
    if (!crop.img || !crop.ctx) return;

    var btn = crop.aplicar;
    var rotulo = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    var w = crop.palcoW;
    var h = crop.palcoH;
    var diam = diametroCirculo();

    var iw = crop.img.width * crop.escala;
    var ih = crop.img.height * crop.escala;
    var x = (w - iw) / 2 + crop.offX;
    var y = (h - ih) / 2 + crop.offY;

    var sx = ((w - diam) / 2 - x) / crop.escala;
    var sy = ((h - diam) / 2 - y) / crop.escala;
    var slado = diam / crop.escala;

    var out = document.createElement('canvas');
    out.width = OUT_SIZE;
    out.height = OUT_SIZE;
    var octx = out.getContext('2d');

    octx.fillStyle = '#f7f5f1';
    octx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
    octx.drawImage(crop.img, sx, sy, slado, slado, 0, 0, OUT_SIZE, OUT_SIZE);

    var dataUrl = out.toDataURL('image/jpeg', 0.85);

    if (!db || !uidAtual) {
      mostrarToast('Sessão expirada — entre novamente.', 'err');
      btn.disabled = false;
      btn.textContent = rotulo;
      return;
    }

    db.collection('clientes').doc(uidAtual)
      .set({ foto: dataUrl }, { merge: true })
      .then(function () {
        /* Espelho público: só email + foto para o admin ler */
        var emailEspelho = (perfil && perfil.email)
          || (auth.currentUser && auth.currentUser.email)
          || '';
        if (emailEspelho) {
          return db.collection('clientes_publico').doc(uidAtual)
            .set({ email: emailEspelho.toLowerCase(), foto: dataUrl }, { merge: true })
            .catch(function (e) { console.warn('minha-conta: espelho não salvo', e); });
        }
      })
      .then(function () {
        if (perfil) perfil.foto = dataUrl;
        if (perfilOriginal) perfilOriginal.foto = dataUrl;
        mostrarFotoBase64(dataUrl);
        atualizarSidebar(perfil ? perfil.nome : '', perfil ? perfil.email : '', dataUrl);
        fecharCrop();
        mostrarToast('Foto atualizada.', 'ok');
        btn.disabled = false;
        btn.textContent = rotulo;
      })
      .catch(function (e) {
        console.error('minha-conta: erro ao salvar foto', e);
        mostrarToast('Não foi possível salvar a foto. Tente novamente.', 'err');
        btn.disabled = false;
        btn.textContent = rotulo;
      });
  }

  function fecharCrop() {
    if (crop.overlay) crop.overlay.classList.remove('show');
    crop.img = null;
    crop.arrastando = false;
    crop.palcoW = 0;
    crop.palcoH = 0;
  }

  if (crop.aplicar) crop.aplicar.addEventListener('click', aplicarCrop);
  if (crop.cancelar) crop.cancelar.addEventListener('click', fecharCrop);

  if (el.fotoPreview) {
    el.fotoPreview.addEventListener('click', function () {
      if (el.fotoInput) el.fotoInput.click();
    });
    el.fotoPreview.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (el.fotoInput) el.fotoInput.click();
      }
    });
  }

  var fotoBtnUpload = document.getElementById('fotoBtnUpload');
  if (fotoBtnUpload) {
    fotoBtnUpload.addEventListener('click', function () {
      if (el.fotoInput) el.fotoInput.click();
    });
  }

  if (el.fotoInput) {
    el.fotoInput.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;

      if (file.size > MAX_FOTO_BYTES) {
        mostrarToast('A imagem é muito grande. Máximo 5MB.', 'err');
        this.value = '';
        return;
      }

      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        mostrarToast('Formato inválido. Use JPG, PNG ou WebP.', 'err');
        this.value = '';
        return;
      }

      abrirCrop(file);
      this.value = '';
    });
  }

  if (el.fotoBtnRemover) {
    el.fotoBtnRemover.addEventListener('click', function () {
      if (!db || !uidAtual) return;
      db.collection('clientes').doc(uidAtual)
        .set({ foto: '' }, { merge: true })
        .then(function () {
          var emailEspelho = (perfil && perfil.email)
            || (auth.currentUser && auth.currentUser.email)
            || '';
          if (emailEspelho) {
            return db.collection('clientes_publico').doc(uidAtual)
              .set({ email: emailEspelho.toLowerCase(), foto: '' }, { merge: true })
              .catch(function (e) {});
          }
        })
        .then(function () {
          if (perfil) perfil.foto = '';
          if (perfilOriginal) perfilOriginal.foto = '';
          mostrarFotoBase64('');
          atualizarSidebar(perfil ? perfil.nome : '', perfil ? perfil.email : '', '');
          mostrarToast('Foto removida.');
        })
        .catch(function () {
          mostrarToast('Não foi possível remover a foto.', 'err');
        });
    });
  }

  /* ==================== 9. SALVAR DADOS ==================== */
  if (el.form) {
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      salvarDados();
    });
  }

  function salvarDados() {
    if (!uidAtual) { mostrarToast('Sessão expirada — entre novamente.', 'err'); return; }

    var btn = document.getElementById('btnSalvarDados');
    var rotulo = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    var nome   = (document.getElementById('fNome').value || '').trim();
    var email  = (document.getElementById('fEmail').value || '').trim();
    var fone   = (document.getElementById('fWhats').value || '').replace(/\D/g, '');
    var cep    = (document.getElementById('fCep').value || '').replace(/\D/g, '');
    var rua    = (document.getElementById('fRua').value || '').trim();
    var numero = (document.getElementById('fNum').value || '').trim();
    var comp   = (document.getElementById('fComp').value || '').trim();
    var bairro = (document.getElementById('fBairro').value || '').trim();
    var cidUf  = (document.getElementById('fCidade').value || '').trim().split(' - ');
    var cidade = (cidUf[0] || '').trim();
    var uf     = (cidUf[1] || '').trim();

    var falha = function (m) {
      mostrarToast(m, 'err');
      if (btn) { btn.disabled = false; btn.textContent = rotulo; }
    };

    if (nome.length < 3) return falha('Digite seu nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return falha('E-mail inválido.');
    if (fone && fone.length < 10) return falha('WhatsApp inválido — use DDD + número.');
    if (cep && cep.length !== 8) return falha('CEP incompleto — 8 números ou deixe em branco.');

    var user = auth.currentUser;
    if (!user) return falha('Sessão expirada — entre novamente.');

    user.updateProfile({ displayName: nome })
      .then(function () {
        if (!db) return;
        return db.collection('clientes').doc(uidAtual).set({
          nome: nome,
          whatsapp: fone,
          cep: cep,
          rua: rua,
          numero: numero,
          complemento: comp,
          bairro: bairro,
          cidade: cidade,
          uf: uf
        }, { merge: true });
      })
      .then(function () {
        if (email && email !== user.email) {
          avisarTrocaEmail();
        }

        perfil.email       = email;
        perfil.nome        = nome;
        perfil.whatsapp    = fone;
        perfil.cep         = cep;
        perfil.rua         = rua;
        perfil.numero      = numero;
        perfil.complemento = comp;
        perfil.bairro      = bairro;
        perfil.cidade      = cidade;
        perfil.uf          = uf;
        perfilOriginal     = JSON.parse(JSON.stringify(perfil));

        /* Atualiza o espelho com nome/foto atuais */
        salvarEspelhoFoto(perfil.foto, { nome: nome });

        atualizarSidebar(nome, user.email, perfil.foto);
        mostrarToast('Dados atualizados com sucesso.', 'ok');

        if (btn) { btn.disabled = false; btn.textContent = rotulo; }
      })
      .catch(function (e) {
        console.error('minha-conta: erro ao salvar', e);
        falha('Não foi possível salvar. Tente novamente.');
      });
  }

  function avisarTrocaEmail() {
    mostrarToast('Campo de e-mail não alterado — veja as instruções abaixo do campo.', 'err');
    var hint = document.getElementById('hintEmail');
    if (hint) {
      hint.textContent = 'Para trocar o e-mail, fale com a gente no WhatsApp. A alteração precisa de verificação.';
      hint.className = 'hint bloq';
    }
  }

  var btnDescartar = document.getElementById('btnDescartar');
  if (btnDescartar) {
    btnDescartar.addEventListener('click', function () {
      if (perfilOriginal) {
        preencherFormulario(perfilOriginal);
        mostrarToast('Alterações descartadas.');
      }
    });
  }

  /* ==================== 10. PEDIDOS EXPANSÍVEIS ==================== */
  function carregarPedidos() {
    el.listaPedidos.dataset.loaded = '1';

    var lista = [];
    try { lista = JSON.parse(localStorage.getItem('m3l_pedidos') || '[]'); } catch (e) { lista = []; }
    if (!Array.isArray(lista)) lista = [];

    lista = lista.slice().reverse();
    renderizarPedidos(lista);
  }

  function renderizarPedidos(lista) {
    if (!lista.length) {
      el.listaPedidos.innerHTML =
        '<div class="mc-empty"><div class="ico">🛍️</div>' +
        '<h3>Você ainda não fez nenhum pedido</h3>' +
        '<p>Quando fizer sua primeira compra, ela vai aparecer aqui com todos os detalhes.</p>' +
        '<a href="loja.html" class="btn-salvar" style="text-decoration:none;">Ir para a loja</a></div>';
      return;
    }

    el.listaPedidos.innerHTML = lista.map(function (p, idx) {
      var itens = Array.isArray(p.itens) ? p.itens : [];
      var qtd = 0;
      itens.forEach(function (i) { qtd += (i.qtd || 1); });

      var fotoCapa = (itens[0] && itens[0].img) ? itens[0].img : '';

      var forma    = p.forma || 'pix';
      var pendente = !!p.pendente && !!p.registrado;

      var stCls = 'st-pendente';
      var stTxt = '📨 Aguardando confirmação';

      if (forma === 'cartao' && pendente) {
        stCls = 'st-pendente'; stTxt = '⏳ Aguardando pagamento';
      } else if (forma === 'cartao' && p.registrado && !pendente) {
        stCls = 'st-pago'; stTxt = '✅ Pago no cartão';
      } else if (p.registrado) {
        stCls = 'st-pago'; stTxt = '✅ Confirmado';
      }

      var itensHtml = '';
      if (itens.length) {
        itensHtml = '<div class="pedido-itens-lista">' + itens.map(function (i) {
          var nomeItem = i.nome || i.produto || i.descricao || 'Item';
          var q = i.qtd || 1;
          var preco = Number(i.preco || i.valor || 0);
          var subtotal = preco * q;
          return '' +
            '<div class="pedido-item">' +
              '<div class="pedido-item-foto">' +
                (i.img ? '<img src="' + i.img + '" alt="">' : '📦') +
              '</div>' +
              '<div class="pedido-item-info">' +
                '<div class="pedido-item-nome">' + esc(nomeItem) + '</div>' +
                '<div class="pedido-item-meta">' + q + (q === 1 ? ' unidade' : ' unidades') +
                  (preco ? ' · ' + fmtBRL(preco) : '') + '</div>' +
              '</div>' +
              (subtotal ? '<div class="pedido-item-total">' + fmtBRL(subtotal) + '</div>' : '') +
            '</div>';
        }).join('') + '</div>';
      }

      return '' +
        '<div class="pedido-card" data-idx="' + idx + '">' +
          '<div class="pedido-cab">' +
            '<div class="pedido-foto-mini">' +
              (fotoCapa ? '<img src="' + fotoCapa + '" alt="">' : '📦') +
            '</div>' +
            '<div class="pedido-cab-info">' +
              '<div class="pedido-num">Pedido #' + esc(p.numero || '—') + '</div>' +
              '<div class="pedido-data">' + dataBonita(p.data) + ' · ' +
                qtd + (qtd === 1 ? ' item' : ' itens') + '</div>' +
              '<span class="pedido-status ' + stCls + '">' + stTxt + '</span>' +
            '</div>' +
            '<div class="pedido-seta">▾</div>' +
          '</div>' +

          '<div class="pedido-detalhe">' +
            itensHtml +
            '<div class="pedido-resumo">' +
              '<div class="pedido-total">' + fmtBRL(p.total) + '</div>' +
              '<a class="pedido-link" href="acompanhar.html?pedido=' +
                encodeURIComponent(p.numero || '') + '">Acompanhar entrega →</a>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    Array.prototype.forEach.call(el.listaPedidos.querySelectorAll('.pedido-card'), function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.pedido-link')) return;
        card.classList.toggle('aberto');
      });
    });
  }

  /* ==================== 11. TROCAR SENHA ==================== */
  var btnAbrirSenha = document.getElementById('btnAbrirSenha');
  if (btnAbrirSenha) {
    btnAbrirSenha.addEventListener('click', function () {
      var alvo = document.getElementById('senhaEmailAlvo');
      var user = auth.currentUser;
      if (alvo && user) alvo.textContent = user.email || 'seu e-mail';
      if (el.overlaySenha) el.overlaySenha.classList.add('show');
    });
  }

  var btnFecharSenha = document.getElementById('btnFecharSenha');
  if (btnFecharSenha) {
    btnFecharSenha.addEventListener('click', function () {
      if (el.overlaySenha) el.overlaySenha.classList.remove('show');
    });
  }

  if (el.overlaySenha) {
    el.overlaySenha.addEventListener('click', function (e) {
      if (e.target === el.overlaySenha) el.overlaySenha.classList.remove('show');
    });
  }

  var btnSalvarSenha = document.getElementById('btnSalvarSenha');
  if (btnSalvarSenha) {
    btnSalvarSenha.addEventListener('click', function () {
      var user = auth.currentUser;
      if (!user || !user.email) {
        mostrarToast('Sessão expirada — entre novamente.', 'err');
        return;
      }

      var btn = btnSalvarSenha;
      var rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      auth.sendPasswordResetEmail(user.email)
        .then(function () {
          mostrarToast('Enviamos um link de redefinição para ' + user.email + '. Confira a caixa de entrada e o spam.', 'ok');
          if (el.overlaySenha) el.overlaySenha.classList.remove('show');
          btn.disabled = false;
          btn.textContent = rotulo;
        })
        .catch(function (e) {
          console.error('minha-conta: erro ao enviar redefinição', e);
          var m = {
            'auth/too-many-requests': 'Muitas tentativas — aguarde alguns minutos.',
            'auth/network-request-failed': 'Falha de conexão — verifique sua internet.'
          };
          mostrarToast(m[e && e.code] || 'Não foi possível enviar agora.', 'err');
          btn.disabled = false;
          btn.textContent = rotulo;
        });
    });
  }

  /* ==================== 12. SAIR ==================== */
  function sair() {
    auth.signOut()
      .then(function () { window.location.href = 'loja.html'; })
      .catch(function () { mostrarToast('Não foi possível sair — tente novamente.', 'err'); });
  }

  var btnSair = document.getElementById('mcBtnSair');
  if (btnSair) btnSair.addEventListener('click', sair);

  var btnSairSeg = document.getElementById('btnSairSeguranca');
  if (btnSairSeg) btnSairSeg.addEventListener('click', sair);

  /* ==================== 13. MÁSCARAS ==================== */
  var fWhats = document.getElementById('fWhats');
  if (fWhats) {
    fWhats.addEventListener('input', function () {
      this.value = mascaraTelefone(this.value);
    });
  }

  var fCep = document.getElementById('fCep');
  if (fCep) {
    fCep.addEventListener('input', function () {
      this.value = mascaraCEP(this.value);
    });
  }

  /* ==================== 14. TELA DE ACESSO ==================== */
  var acesso = {
    secao:        document.getElementById('mcAcesso'),
    tabs:         document.querySelectorAll('.mc-acesso-tab'),
    paineis: {
      entrar:  document.getElementById('acessoEntrar'),
      criar1:  document.getElementById('acessoCriar1'),
      criar2:  document.getElementById('acessoCriar2')
    },
    erro:         document.getElementById('acessoErro'),
    loginEmail:   document.getElementById('acessoEmailIn'),
    loginSenha:   document.getElementById('acessoSenhaIn'),
    loginBtn:     document.getElementById('acessoEntrarBtn'),
    esqueci:      document.getElementById('acessoEsqueci'),

    criarEmail:   document.getElementById('acessoEmailCriar'),
    continuarBtn: document.getElementById('acessoContinuar'),
    voltarEntrar: document.getElementById('acessoVoltarEntrar'),

    nome:         document.getElementById('acessoNome'),
    senha:        document.getElementById('acessoSenha'),
    senha2:       document.getElementById('acessoSenha2'),
    fone:         document.getElementById('acessoFone'),
    dia:          document.getElementById('acessoDia'),
    mes:          document.getElementById('acessoMes'),
    cep:          document.getElementById('acessoCep'),
    cepHint:      document.getElementById('acessoCepHint'),
    criarBtn:     document.getElementById('acessoCriarBtn'),
    voltarEmail:  document.getElementById('acessoVoltarEmail'),
    voltarEmail2: document.getElementById('acessoVoltarEmail2'),
    etapa2:       document.getElementById('acessoEtapa2'),
    google:       document.getElementById('acessoGoogle'),

    emailConfirmado: ''
  };

  function acessoErro(msg) {
    if (!acesso.erro) return;
    if (msg) {
      acesso.erro.textContent = msg;
      acesso.erro.classList.add('show');
    } else {
      acesso.erro.classList.remove('show');
    }
  }

  function trocarAba(aba) {
    acessoErro('');
    Array.prototype.forEach.call(acesso.tabs, function (t) {
      t.classList.toggle('ativo', t.dataset.aba === aba);
    });
    if (aba === 'entrar') {
      acesso.paineis.entrar.classList.add('ativo');
      acesso.paineis.criar1.classList.remove('ativo');
      acesso.paineis.criar2.classList.remove('ativo');
    } else {
      acesso.paineis.entrar.classList.remove('ativo');
      acesso.paineis.criar1.classList.add('ativo');
      acesso.paineis.criar2.classList.remove('ativo');
    }
  }

  Array.prototype.forEach.call(acesso.tabs, function (t) {
    t.addEventListener('click', function () { trocarAba(t.dataset.aba); });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.mc-acesso-olho'), function (olho) {
    olho.addEventListener('click', function () {
      var alvo = document.getElementById(olho.dataset.alvo);
      if (!alvo) return;
      var mostra = alvo.type === 'password';
      alvo.type = mostra ? 'text' : 'password';
      olho.textContent = mostra ? '🙈' : '👁';
      alvo.focus();
    });
  });

  if (acesso.fone) {
    acesso.fone.addEventListener('input', function () {
      this.value = mascaraTelefone(this.value);
    });
  }
  if (acesso.cep) {
    acesso.cep.addEventListener('input', function () {
      this.value = mascaraCEP(this.value);
      if (acesso.cepHint) acesso.cepHint.classList.remove('show');
    });
  }

  if (acesso.loginBtn) {
    acesso.loginBtn.addEventListener('click', function () {
      acessoErro('');
      var email = (acesso.loginEmail.value || '').trim();
      var senha = acesso.loginSenha.value || '';

      if (!email) return acessoErro('Digite seu e-mail.');
      if (!senha) return acessoErro('Digite sua senha.');

      var btn = acesso.loginBtn;
      var rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      auth.signInWithEmailAndPassword(email, senha)
        .then(function () {
          btn.disabled = false;
          btn.textContent = rotulo;
        })
        .catch(function (e) {
          var m = {
            'auth/invalid-email': 'E-mail inválido.',
            'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
            'auth/wrong-password': 'Senha incorreta.',
            'auth/invalid-credential': 'E-mail ou senha incorretos.',
            'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
            'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
            'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
          };
          acessoErro(m[e && e.code] || 'Não foi possível entrar. Tente novamente.');
          btn.disabled = false;
          btn.textContent = rotulo;
        });
    });
  }

  [acesso.loginEmail, acesso.loginSenha].forEach(function (input) {
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && acesso.loginBtn) acesso.loginBtn.click();
    });
  });

  if (acesso.esqueci) {
    acesso.esqueci.addEventListener('click', function () {
      var email = (acesso.loginEmail.value || '').trim();
      if (!email) {
        acessoErro('Digite seu e-mail acima para receber o link de redefinição.');
        return;
      }
      acessoErro('');
      var btn = acesso.esqueci;
      var rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      auth.sendPasswordResetEmail(email)
        .then(function () {
          mostrarToast('Enviamos um link de redefinição para ' + email + '.', 'ok');
          btn.disabled = false;
          btn.textContent = rotulo;
        })
        .catch(function (e) {
          acessoErro('Não foi possível enviar o link agora. Tente novamente.');
          btn.disabled = false;
          btn.textContent = rotulo;
        });
    });
  }

  if (acesso.continuarBtn) {
    acesso.continuarBtn.addEventListener('click', function () {
      acessoErro('');
      var email = (acesso.criarEmail.value || '').trim();

      if (!email) return acessoErro('Digite seu e-mail para continuar.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return acessoErro('E-mail inválido.');

      var btn = acesso.continuarBtn;
      var rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Verificando...';

      auth.fetchSignInMethodsForEmail(email)
        .then(function (metodos) {
          if (metodos && metodos.length) {
            acessoErro('Já existe uma conta com esse e-mail. Use a aba Entrar.');
            trocarAba('entrar');
            acesso.loginEmail.value = email;
            btn.disabled = false;
            btn.textContent = rotulo;
            return;
          }
          acesso.emailConfirmado = email;
          acesso.etapa2.textContent = 'Etapa 2 de 2 · complete seu cadastro (' + email + ')';
          acesso.paineis.criar1.classList.remove('ativo');
          acesso.paineis.criar2.classList.add('ativo');
          acesso.nome.focus();
          btn.disabled = false;
          btn.textContent = rotulo;
        })
        .catch(function () {
          acesso.emailConfirmado = email;
          acesso.etapa2.textContent = 'Etapa 2 de 2 · complete seu cadastro (' + email + ')';
          acesso.paineis.criar1.classList.remove('ativo');
          acesso.paineis.criar2.classList.add('ativo');
          acesso.nome.focus();
          btn.disabled = false;
          btn.textContent = rotulo;
        });
    });
  }

  if (acesso.criarEmail) {
    acesso.criarEmail.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && acesso.continuarBtn) acesso.continuarBtn.click();
    });
  }

  if (acesso.voltarEntrar) {
    acesso.voltarEntrar.addEventListener('click', function () { trocarAba('entrar'); });
  }

  if (acesso.voltarEmail) {
    acesso.voltarEmail.addEventListener('click', function () {
      acesso.paineis.criar2.classList.remove('ativo');
      acesso.paineis.criar1.classList.add('ativo');
      acessoErro('');
    });
  }
  if (acesso.voltarEmail2) {
    acesso.voltarEmail2.addEventListener('click', function () {
      acesso.paineis.criar2.classList.remove('ativo');
      acesso.paineis.criar1.classList.add('ativo');
      acessoErro('');
    });
  }

  function validarAniversario(dia, mes) {
    if (!dia || dia < 1 || dia > 31) return 'Informe o dia do seu nascimento (1 a 31).';
    if (!mes || mes < 1 || mes > 12) return 'Selecione o mês do seu nascimento.';
    var diasMax = [31,29,31,30,31,30,31,31,30,31,30,31];
    if (dia > diasMax[mes - 1]) return 'Dia ' + dia + ' não existe em ' + mesesN[mes - 1] + '.';
    return '';
  }

  if (acesso.criarBtn) {
    acesso.criarBtn.addEventListener('click', function () {
      acessoErro('');

      var nome   = (acesso.nome.value || '').trim();
      var senha  = acesso.senha.value || '';
      var senha2 = acesso.senha2.value || '';
      var fone   = (acesso.fone.value || '').replace(/\D/g, '');
      var dia    = parseInt(acesso.dia.value, 10);
      var mes    = parseInt(acesso.mes.value, 10);
      var cep    = (acesso.cep.value || '').replace(/\D/g, '');
      var email  = acesso.emailConfirmado;

      if (!email) return acessoErro('Volte e informe seu e-mail.');
      if (nome.length < 3) return acessoErro('Digite seu nome e sobrenome.');
      if (senha.length < 6) return acessoErro('A senha precisa ter pelo menos 6 caracteres.');
      if (senha !== senha2) return acessoErro('As senhas não conferem.');
      if (fone.length < 10) return acessoErro('Informe um WhatsApp válido com DDD.');
      var eAniv = validarAniversario(dia, mes);
      if (eAniv) return acessoErro(eAniv);
      if (cep && cep.length !== 8) return acessoErro('CEP incompleto — 8 números ou deixe em branco.');

      var btn = acesso.criarBtn;
      var rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Criando conta...';

      function falha(e) {
        var m = {
          'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
          'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
          'auth/invalid-email': 'E-mail inválido.',
          'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
          'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
        };
        acessoErro(m[e && e.code] || 'Não foi possível criar a conta. Tente novamente.');
        btn.disabled = false;
        btn.textContent = rotulo;
      }

      auth.createUserWithEmailAndPassword(email, senha)
        .then(function (cred) {
          cred.user.getIdToken(true)
            .then(function (token) {
              return fetch('https://meu3dlabs-backend.onrender.com/api/auth/enviar-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token })
              });
            })
            .catch(function () {
              cred.user.sendEmailVerification().catch(function () {});
            });

          return cred.user.updateProfile({ displayName: nome }).then(function () { return cred; });
        })
        .then(function (cred) {
          if (!db) return cred;
          return db.collection('clientes').doc(cred.user.uid).set({
            nome: nome,
            email: email,
            whatsapp: fone,
            nascimentoDia: dia,
            nascimentoMes: mes,
            cep: cep,
            rua: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            uf: ''
          }, { merge: true }).then(function () { return cred; });
        })
        .then(function () {
          mostrarToast('Conta criada com sucesso.', 'ok');
          btn.disabled = false;
          btn.textContent = rotulo;
        })
        .catch(falha);
    });
  }

  if (acesso.google) {
    acesso.google.addEventListener('click', function () {
      acessoErro('');
      var btn = acesso.google;
      btn.disabled = true;

      auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(function (e) {
          var m = {
            'auth/popup-closed-by-user': 'Você fechou a janela do Google antes de concluir.',
            'auth/popup-blocked': 'O navegador bloqueou a janela. Permita popups neste site.',
            'auth/cancelled-popup-request': 'Operação cancelada. Tente novamente.',
            'auth/account-exists-with-different-credential': 'Esse e-mail já tem conta com outro método. Entre com e-mail e senha.'
          };
          acessoErro(m[e && e.code] || 'Não foi possível entrar com Google.');
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }

  /* ==================== 15. INIT ==================== */
  var hash = (location.hash || '').replace('#', '');
  if (hash) {
    var btnHash = document.querySelector('.mc-nav-btn[data-panel="' + hash + '"]');
    if (btnHash) setTimeout(function () { btnHash.click(); }, 120);
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      if (el.loading) el.loading.style.display = 'none';
      if (el.main) el.main.style.display = 'none';
      if (acesso.secao) {
        acesso.secao.style.display = 'flex';
        trocarAba('entrar');
      }
      return;
    }

    if (acesso.secao) acesso.secao.style.display = 'none';
    carregarPerfil(user);
  });

})();