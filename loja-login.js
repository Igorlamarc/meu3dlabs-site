/* ===== Meu 3D Labs — loja/login: autenticação de cliente (Firebase e-mail/senha + Google) ===== */
(function(){
  var firebaseConfig={
    apiKey:"AIzaSyAZwBSpyU9KAsrvqjVaFIShbdhoPu-C11s",
    authDomain:"meu3dlabs-loja.firebaseapp.com",
    projectId:"meu3dlabs-loja",
    storageBucket:"meu3dlabs-loja.firebasestorage.app",
    messagingSenderId:"429562795244",
    appId:"1:429562795244:web:d9d54e2b30941ab8eb81c9"
  };
  if(typeof firebase==='undefined'){console.warn('loja-login: Firebase não carregou.');return;}
  firebase.initializeApp(firebaseConfig);
  var auth=firebase.auth();

  /* ---------- CSS do módulo ---------- */
  var css=document.createElement('style');
  css.textContent=
  '.m3l-login-btn{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#0f1e3d;border:1.5px solid #fff;border-radius:999px;padding:8px 16px;font-size:.85rem;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;box-shadow:0 2px 6px rgba(0,0,0,.14);transition:background .15s,transform .15s,box-shadow .15s;}' +
  '.m3l-login-btn:hover{background:#eef1f6;transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.18);}' +
  '.header-inner .m3l-login-btn{margin-left:12px;}' +
  '.m3l-ov{position:fixed;inset:0;background:rgba(15,30,61,.6);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:99998;display:none;align-items:center;justify-content:center;padding:16px;}' +
  '.m3l-ov.open{display:flex;}' +
  '.m3l-card{position:relative;background:#fff;border-radius:18px;max-width:390px;width:100%;padding:28px 26px 24px;box-shadow:0 24px 60px rgba(15,30,61,.35);max-height:92vh;overflow:auto;box-sizing:border-box;animation:m3lPop .28s cubic-bezier(.2,.9,.3,1.2);}' +
  '@keyframes m3lPop{from{opacity:0;transform:translateY(16px) scale(.96);}to{opacity:1;transform:translateY(0) scale(1);}}' +
  '.m3l-card h3{margin:0 0 6px;color:#0f1e3d;font-size:1.2rem;font-weight:800;letter-spacing:-.2px;}' +
  '.m3l-sub{margin:0 0 18px;color:#5a6472;font-size:.86rem;line-height:1.45;}' +
  '.m3l-tabs{display:flex;gap:6px;margin-bottom:16px;background:#f0f2f6;border-radius:999px;padding:4px;}' +
  '.m3l-tab{flex:1;padding:9px 6px;border:none;background:transparent;border-radius:999px;font-weight:700;font-size:.84rem;cursor:pointer;color:#5a6472;font-family:inherit;transition:background .15s,color .15s;}' +
  '.m3l-tab.on{background:#0f1e3d;color:#fff;box-shadow:0 2px 6px rgba(15,30,61,.25);}' +
  '.m3l-card input{width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #e2e6ee;border-radius:10px;background:#f8f9fc;font-size:.92rem;margin-bottom:10px;font-family:inherit;transition:border-color .15s,background .15s;color:#0f1e3d;}' +
  '.m3l-card input::placeholder{color:#9aa3b2;}' +
  '.m3l-card input:focus{outline:none;border-color:#f26522;background:#fff;box-shadow:0 0 0 3px rgba(242,101,34,.12);}' +
  '.m3l-go{width:100%;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#f26522,#e05512);color:#fff;font-weight:800;font-size:.95rem;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(242,101,34,.35);transition:transform .15s,box-shadow .15s;letter-spacing:.2px;}' +
  '.m3l-go:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(242,101,34,.45);}' +
  '.m3l-go:active{transform:translateY(0);}' +
  '.m3l-go:disabled{opacity:.6;cursor:default;transform:none;}' +
  '.m3l-or{display:flex;align-items:center;gap:10px;margin:14px 0 10px;color:#9aa3b2;font-size:.75rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;}' +
  '.m3l-or::before,.m3l-or::after{content:"";flex:1;height:1px;background:#e2e6ee;}' +
  '.m3l-g{width:100%;padding:12px;border:1.5px solid #e2e6ee;border-radius:10px;background:#fff;color:#0f1e3d;font-weight:700;font-size:.92rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-family:inherit;transition:background .15s,border-color .15s,transform .15s;}' +
  '.m3l-g:hover{background:#f8f9fc;border-color:#c8cfda;transform:translateY(-1px);}' +
  '.m3l-err{display:none;background:#fdecea;color:#b3261e;border:1px solid #f4c7c3;border-radius:10px;padding:10px 12px;font-size:.82rem;margin-bottom:12px;line-height:1.4;}' +
  '.m3l-err.show{display:block;}' +
  '.m3l-out{width:100%;padding:12px;border:1.5px solid #e2e6ee;border-radius:10px;background:#fff;color:#0f1e3d;font-weight:700;cursor:pointer;margin-top:6px;font-family:inherit;transition:background .15s,border-color .15s;}' +
  '.m3l-out:hover{background:#f8f9fc;border-color:#f26522;}' +
  '.m3l-x{position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.5rem;color:#9aa3b2;cursor:pointer;line-height:1;transition:color .15s;}' +
  '.m3l-x:hover{color:#0f1e3d;}' +
  '@media(max-width:820px){.header-inner .m3l-login-btn{padding:7px 13px;font-size:.78rem;}}';
  document.head.appendChild(css);

  /* ---------- Botão no header ---------- */
  var btn=document.createElement('button');
  btn.type='button';btn.className='m3l-login-btn';btn.id='m3lLoginBtn';btn.textContent='Entrar';
  var host=document.querySelector('.header-inner');
  if(host){
    host.appendChild(btn);
  }else{
    var header=document.querySelector('header');
    if(header){header.appendChild(btn);}
    else{btn.style.cssText+='position:fixed;top:10px;right:10px;z-index:99999;';document.body.appendChild(btn);}
  }

  /* ---------- Modal ---------- */
  var ov=document.createElement('div');
  ov.className='m3l-ov';ov.id='m3lLoginOv';
  ov.innerHTML=
  '<div class="m3l-card"><button class="m3l-x" id="m3lClose" aria-label="Fechar">×</button>' +
  '<h3>Bem-vindo à Meu 3D Labs</h3>' +
  '<p class="m3l-sub" id="m3lSub">Acesse sua conta para comprar mais rápido.</p>' +
  '<div id="m3lFormArea">' +
  '<div class="m3l-tabs"><button type="button" class="m3l-tab on" id="tabIn">Entrar</button><button type="button" class="m3l-tab" id="tabUp">Criar conta</button></div>' +
  '<div class="m3l-err" id="m3lErr"></div>' +
  '<div id="fldNome" style="display:none"><input type="text" id="m3lNome" placeholder="Seu nome completo" autocomplete="name"></div>' +
  '<input type="email" id="m3lEmail" placeholder="E-mail" autocomplete="email">' +
  '<input type="password" id="m3lSenha" placeholder="Senha" autocomplete="current-password">' +
  '<div id="fldSenha2" style="display:none"><input type="password" id="m3lSenha2" placeholder="Confirmar senha" autocomplete="new-password"></div>' +
  '<button type="button" class="m3l-go" id="m3lGo">Entrar</button>' +
  '<div class="m3l-or"><span>ou</span></div>' +
  '<button type="button" class="m3l-g" id="m3lGoogle"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continuar com Google</button>' +
  '</div>' +
  '<div id="m3lLogged" style="display:none"><p class="m3l-sub" id="m3lLoggedInfo"></p><button type="button" class="m3l-out" id="m3lSair">Sair da conta</button></div>' +
  '</div>';
  document.body.appendChild(ov);

  var $=function(id){return document.getElementById(id);};
  var modo='in';

  function erro(msg){
    var e=$('m3lErr');
    if(msg){e.textContent=msg;e.classList.add('show');}else{e.classList.remove('show');}
  }
  function setModo(m){
    modo=m;
    $('tabIn').classList.toggle('on',m==='in');
    $('tabUp').classList.toggle('on',m==='up');
    $('fldNome').style.display=(m==='up')?'block':'none';
    $('fldSenha2').style.display=(m==='up')?'block':'none';
    $('m3lSenha').setAttribute('autocomplete',m==='up'?'new-password':'current-password');
    $('m3lGo').textContent=(m==='up')?'Criar minha conta':'Entrar';
    erro('');
  }
  $('tabIn').onclick=function(){setModo('in');};
  $('tabUp').onclick=function(){setModo('up');};

  function abreModal(){
    $('m3lFormArea').style.display=window.m3lUser?'none':'block';
    $('m3lLogged').style.display=window.m3lUser?'block':'none';
    $('m3lSub').style.display=window.m3lUser?'none':'block';
    if(window.m3lUser){
      $('m3lLoggedInfo').textContent='Você está logado como '+window.m3lUser.email+'.';
    }else{
      $('m3lSub').textContent='Acesse sua conta para comprar mais rápido.';
    }
    erro('');
    ov.classList.add('open');
  }
  function fechaModal(){ov.classList.remove('open');}

  btn.onclick=abreModal;
  $('m3lClose').onclick=fechaModal;
  ov.addEventListener('click',function(ev){if(ev.target===ov)fechaModal();});
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape')fechaModal();});

  function traduzErro(e){
    var m={
      'auth/invalid-email':'E-mail inválido.',
      'auth/user-not-found':'Não encontramos uma conta com esse e-mail.',
      'auth/wrong-password':'Senha incorreta.',
      'auth/invalid-credential':'E-mail ou senha incorretos.',
      'auth/invalid-login-credentials':'E-mail ou senha incorretos.',
      'auth/email-already-in-use':'Já existe uma conta com esse e-mail. Use a aba Entrar.',
      'auth/weak-password':'A senha precisa de pelo menos 6 caracteres.',
      'auth/too-many-requests':'Muitas tentativas seguidas. Tente novamente em alguns minutos.',
      'auth/network-request-failed':'Falha de conexão. Verifique sua internet.',
      'auth/missing-password':'Digite a senha.',
      'auth/operation-not-allowed':'Este método de login não está ativado no Firebase.',
      'auth/popup-closed-by-user':'Você fechou a janela do Google antes de concluir.',
      'auth/cancelled-popup-request':'Operação cancelada. Tente novamente.',
      'auth/popup-blocked':'O navegador bloqueou a janela do Google. Permita popups neste site.',
      'auth/account-exists-with-different-credential':'Esse e-mail já tem conta com outro método. Entre com e-mail e senha.'
    };
    return m[e&&e.code]||'Não foi possível entrar: '+(e&&e.message?e.message:'erro desconhecido');
  }

  function go(){
    erro('');
    var email=$('m3lEmail').value.trim();
    var senha=$('m3lSenha').value;
    var nome=$('m3lNome').value.trim();
    var senha2=$('m3lSenha2').value;
    if(!email){erro('Digite seu e-mail.');return;}
    if(!senha){erro('Digite a senha.');return;}
    if(modo==='up'){
      if(nome.length<2){erro('Digite seu nome.');return;}
      if(senha!==senha2){erro('As senhas não conferem. Confira e digite novamente.');return;}
    }
    var g=$('m3lGo');
    g.disabled=true;
    var txtAntes=g.textContent;
    g.textContent='Aguarde...';
    function falha(e){erro(traduzErro(e));g.disabled=false;g.textContent=txtAntes;}
    if(modo==='in'){
      auth.signInWithEmailAndPassword(email,senha).then(fechaModal).catch(falha);
    }else{
      auth.createUserWithEmailAndPassword(email,senha)
        .then(function(cred){return cred.user.updateProfile({displayName:nome}).then(function(){return cred;});})
        .then(fechaModal).catch(falha);
    }
  }
  $('m3lGo').onclick=go;
  $('m3lSenha').addEventListener('keydown',function(ev){if(ev.key==='Enter')go();});
  $('m3lSenha2').addEventListener('keydown',function(ev){if(ev.key==='Enter')go();});

  /* ---------- Login com Google (sem senha, 1 clique) ---------- */
  $('m3lGoogle').onclick=function(){
    erro('');
    var gBtn=$('m3lGoogle');
    gBtn.disabled=true;
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(fechaModal)
      .catch(function(e){erro(traduzErro(e));})
      .then(function(){gBtn.disabled=false;});
  };

  $('m3lSair').onclick=function(){
    auth.signOut().then(fechaModal).catch(function(e){erro(traduzErro(e));});
  };

  /* ---------- Estado da sessão ---------- */
  function atualizarBotao(u){
    if(!u){btn.textContent='Entrar';return;}
    var n=(u.displayName||'').trim();
    btn.textContent=n?('Olá, '+n.split(' ')[0]):'Minha conta';
  }
  auth.onAuthStateChanged(function(u){
    window.m3lUser=u?{uid:u.uid,nome:(u.displayName||''),email:u.email}:null;
    try{document.dispatchEvent(new CustomEvent('m3l-user-changed',{detail:window.m3lUser}));}catch(e){}
    atualizarBotao(u);
  });
})();