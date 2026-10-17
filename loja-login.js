/* ===== Meu 3D Labs — loja/login: Firebase e-mail/senha (cadastro 2 etapas + CEP + aniversário), Google, perfil (Firestore) e painel Minha conta ===== */
(function(){
  var firebaseConfig={
    /* SE DER "api-key-not-valid": apague a chave abaixo e cole a copiada do Google Cloud > Credenciais > Exibir chave */
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
  var db=(typeof firebase.firestore==='function')?firebase.firestore():null;
  auth.languageCode='pt-BR';
  var API_BASE='https://meu3dlabs-backend.onrender.com/api';
  console.info('✅ loja-login: e-mail de verificação com a marca da loja (via backend) carregado');
  var mesesN=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
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
  '.m3l-card select{width:100%;box-sizing:border-box;padding:12px 10px;border:1.5px solid #e2e6ee;border-radius:10px;background:#f8f9fc;font-size:.92rem;margin-bottom:10px;color:#0f1e3d;font-family:inherit;}' +
  '.m3l-card select:focus{outline:none;border-color:#f26522;background:#fff;}' +
  '.m3l-linha2{display:flex;gap:8px;}' +
  '.m3l-linha2 input{flex:1;min-width:0;}' +
  '.m3l-linha2 select{flex:1.6;min-width:0;}' +
  '.m3l-step{font-size:12px;font-weight:700;color:#9aa3b2;margin:-4px 0 12px;letter-spacing:.2px;}' +
  '.m3l-back{display:inline-flex;align-items:center;gap:4px;background:none;border:none;color:#f26522;font-weight:700;font-size:13px;cursor:pointer;padding:0 0 8px;font-family:inherit;}' +
  '.m3l-back:hover{text-decoration:underline;}' +
  '.m3l-pw{position:relative;margin-bottom:10px;}' +
  '.m3l-pw input{margin-bottom:0;padding-right:44px;}' +
  '.m3l-eye{position:absolute;right:4px;top:0;bottom:0;width:38px;background:none;border:none;cursor:pointer;color:#9aa3b2;font-size:1.05rem;display:flex;align-items:center;justify-content:center;}' +
  '.m3l-eye:hover{color:#0f1e3d;}' +
  '.m3l-cepinfo{display:none;background:#fff;border:1.5px dashed #f2b28f;border-radius:10px;padding:10px 12px 4px;margin:0 0 10px;}' +
  '.m3l-cepinfo.show{display:block;}' +
  '.m3l-cepinfo label{display:block;font-size:10.5px;font-weight:800;color:#f26522;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}' +
  '.m3l-cepinfo input{margin-bottom:8px;background:#f8f9fc;}' +
  '.m3l-hint{display:none;font-size:12px;line-height:1.35;margin:-2px 0 10px;color:#b3261e;font-weight:600;}' +
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
  '.m3l-err.ok{background:#eaf6ee;color:#186a35;border-color:#cbe5d2;}' +
  '.m3l-x{position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.5rem;color:#9aa3b2;cursor:pointer;line-height:1;transition:color .15s;}' +
  '.m3l-x:hover{color:#0f1e3d;}' +
  '.m3l-perfil-head{display:flex;align-items:center;gap:12px;margin:6px 0 14px;}' +
  '.m3l-avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f26522,#e05512);color:#fff;font-weight:800;font-size:1.25rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
  '.m3l-perfil-nome{font-weight:800;color:#0f1e3d;font-size:1rem;line-height:1.2;}' +
  '.m3l-perfil-email{font-size:.8rem;color:#5a6472;word-break:break-all;}' +
  '.m3l-ptabs{display:flex;gap:6px;margin-bottom:12px;background:#f0f2f6;border-radius:999px;padding:4px;}' +
  '.m3l-ptab{flex:1;padding:8px 6px;border:none;background:transparent;border-radius:999px;font-weight:700;font-size:.8rem;cursor:pointer;color:#5a6472;font-family:inherit;transition:background .15s,color .15s;}' +
  '.m3l-ptab.on{background:#0f1e3d;color:#fff;box-shadow:0 2px 6px rgba(15,30,61,.25);}' +
  '.m3l-dados{border:1.5px solid #e2e6ee;border-radius:12px;overflow:hidden;margin-bottom:12px;}' +
  '.m3l-dado{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #eef1f6;font-size:.85rem;}' +
  '.m3l-dado:last-child{border-bottom:none;}' +
  '.m3l-dado span{color:#5a6472;font-weight:600;white-space:nowrap;}' +
  '.m3l-dado .v{text-align:right;color:#0f1e3d;font-weight:600;}' +
  '.m3l-acao{width:100%;padding:11px;border:1.5px solid #e2e6ee;border-radius:10px;background:#fff;color:#0f1e3d;font-weight:700;font-size:.88rem;cursor:pointer;margin-bottom:8px;font-family:inherit;transition:background .15s,border-color .15s;}' +
  '.m3l-acao:hover{background:#f8f9fc;border-color:#c8cfda;}' +
  '.m3l-acao.sair:hover{background:#fdecea;border-color:#f4c7c3;color:#b3261e;}' +
  '.m3l-gnote{font-size:.75rem;color:#8a94a8;margin-bottom:8px;text-align:center;}' +
  '.m3l-pedido{display:flex;align-items:center;gap:10px;border:1.5px solid #e2e6ee;border-radius:12px;padding:10px;margin-bottom:8px;}' +
  '.m3l-pedido-foto{width:52px;height:52px;border-radius:10px;background:#f0f2f6;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;font-size:1.4rem;}' +
  '.m3l-pedido-foto img{width:100%;height:100%;object-fit:cover;}' +
  '.m3l-pedido-info{flex:1;min-width:0;}' +
  '.m3l-pedido-num{font-weight:800;color:#0f1e3d;font-size:.85rem;}' +
  '.m3l-pedido-meta{font-size:.76rem;color:#5a6472;margin-top:2px;}' +
  '.m3l-pedido-st{font-size:.76rem;color:#186a35;font-weight:700;margin-top:2px;}' +
  '.m3l-pedido-st.pen{color:#b26a00;}' +
  '.m3l-pedido-track{font-size:.78rem;font-weight:800;color:#f26522;text-decoration:none;border:1.5px solid #f2b28f;border-radius:999px;padding:6px 10px;white-space:nowrap;flex-shrink:0;transition:background .15s;}' +
  '.m3l-pedido-track:hover{background:#fff8f4;}' +
  '.m3l-rastrear{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;padding:11px;border-radius:10px;background:#0f1e3d;color:#fff;font-weight:800;font-size:.88rem;text-decoration:none;margin-top:4px;transition:background .15s;}' +
  '.m3l-rastrear:hover{background:#1a2f57;}' +
  '.m3l-vazio{text-align:center;padding:22px 10px;color:#5a6472;font-size:.86rem;line-height:1.5;}' +
  '.m3l-vazio .ico{font-size:2rem;margin-bottom:6px;}' +
  '.m3l-ver-ok{color:#186a35;font-weight:800;}' +
  '.m3l-ver-pen{color:#b26a00;font-weight:800;}' +
  '.m3l-verbar{position:fixed;left:14px;bottom:14px;z-index:99996;background:#fff;border:1.5px solid #f2b28f;border-radius:14px;box-shadow:0 12px 32px rgba(15,30,61,.28);padding:14px 16px;max-width:320px;box-sizing:border-box;display:none;animation:m3lPop .3s ease;}' +
  '.m3l-verbar.show{display:block;}' +
  '.m3l-verbar strong{display:block;color:#0f1e3d;font-size:.92rem;margin-bottom:4px;}' +
  '.m3l-verbar-txt{color:#5a6472;font-size:.8rem;line-height:1.45;}' +
  '.m3l-verbar-txt b{color:#0f1e3d;word-break:break-all;}' +
  '.m3l-verbtns{display:flex;gap:8px;margin-top:10px;}' +
  '.m3l-verbtn{flex:1;padding:9px 10px;border:none;border-radius:8px;font-weight:800;font-size:.78rem;cursor:pointer;font-family:inherit;transition:transform .15s,background .15s;}' +
  '.m3l-verbtn:disabled{opacity:.6;cursor:default;}' +
  '.m3l-verbtn.esc{background:#0f1e3d;color:#fff;}' +
  '.m3l-verbtn.ok{background:#eaf6ee;color:#186a35;border:1.5px solid #cbe5d2;}' +
  '@media(max-width:820px){.header-inner .m3l-login-btn{padding:7px 13px;font-size:.78rem;}.m3l-verbar{left:10px;right:10px;max-width:none;bottom:10px;}}';
  document.head.appendChild(css);
  /* ---------- Botão no header ---------- */
  var btn=document.createElement('button');
  btn.type='button';btn.className='m3l-login-btn';btn.id='m3lLoginBtn';btn.textContent='Entrar / Cadastrar';
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
  '<h3 id="m3lTitulo">Bem-vindo à Meu 3D Labs</h3>' +
  '<p class="m3l-sub" id="m3lSub">Acesse sua conta para comprar mais rápido.</p>' +
  '<div id="m3lFormArea">' +
  '<div class="m3l-tabs"><button type="button" class="m3l-tab on" id="tabIn">Entrar</button><button type="button" class="m3l-tab" id="tabUp">Criar conta</button></div>' +
  '<div class="m3l-err" id="m3lErr"></div>' +
  '<div id="paneIn">' +
  '<input type="email" id="m3lEmailIn" name="email" placeholder="E-mail" autocomplete="username">' +
  '<div class="m3l-pw"><input type="password" id="m3lSenhaIn" placeholder="Senha" autocomplete="current-password"><button type="button" class="m3l-eye" data-alvo="m3lSenhaIn" aria-label="Mostrar senha">👁</button></div>' +
  '<button type="button" class="m3l-go" id="m3lGoIn">Entrar</button>' +
  '</div>' +
  '<div id="paneUp1" style="display:none">' +
  '<div class="m3l-step">Etapa 1 de 2 · comece pelo seu e-mail</div>' +
  '<input type="email" id="m3lEmailUp" name="email" placeholder="E-mail" autocomplete="email">' +
  '<button type="button" class="m3l-go" id="m3lNext">Continuar</button>' +
  '</div>' +
  '<div id="paneUp2" style="display:none">' +
  '<button type="button" class="m3l-back" id="m3lBack">← Trocar e-mail</button>' +
  '<div class="m3l-step" id="m3lStep2">Etapa 2 de 2 · complete seu cadastro</div>' +
  '<input type="text" id="m3lNome" placeholder="Nome e sobrenome" autocomplete="name">' +
  '<div class="m3l-pw"><input type="password" id="m3lSenha" placeholder="Senha (mínimo 6 caracteres)" autocomplete="new-password"><button type="button" class="m3l-eye" data-alvo="m3lSenha" aria-label="Mostrar senha">👁</button></div>' +
  '<div class="m3l-pw"><input type="password" id="m3lSenha2" placeholder="Confirmar senha" autocomplete="new-password"><button type="button" class="m3l-eye" data-alvo="m3lSenha2" aria-label="Mostrar senha">👁</button></div>' +
  '<input type="tel" id="m3lFone" placeholder="WhatsApp · (21) 99999-9999" autocomplete="tel" maxlength="16">' +
  '<div class="m3l-linha2">' +
  '<input type="number" id="m3lNascDia" placeholder="Dia" min="1" max="31">' +
  '<select id="m3lNascMes"><option value="">Mês de nascimento</option><option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option><option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select>' +
  '</div>' +
  '<input type="text" id="m3lCep" placeholder="CEP · para envios fora do RJ" autocomplete="postal-code" maxlength="9">' +
  '<div class="m3l-hint" id="m3lCepHint"></div>' +
  '<div class="m3l-cepinfo" id="m3lCepInfo">' +
  '<label>Endereço encontrado</label>' +
  '<input type="text" id="m3lRua" placeholder="Rua / Avenida">' +
  '<input type="text" id="m3lBairro" placeholder="Bairro">' +
  '<input type="text" id="m3lCidUf" placeholder="Cidade - UF">' +
  '</div>' +
  '<button type="button" class="m3l-go" id="m3lGoUp">Criar minha conta</button>' +
  '</div>' +
  '<div class="m3l-or"><span>ou</span></div>' +
  '<button type="button" class="m3l-g" id="m3lGoogle"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continuar com Google</button>' +
  '</div>' +
  '<div id="m3lLogged" style="display:none">' +
  '<div class="m3l-perfil-head"><div class="m3l-avatar" id="m3lAvatar">👤</div><div><div class="m3l-perfil-nome" id="m3lPNome">Minha conta</div><div class="m3l-perfil-email" id="m3lPEmail"></div></div></div>' +
  '<div class="m3l-ptabs"><button type="button" class="m3l-ptab on" id="ptabDados">Meus dados</button><button type="button" class="m3l-ptab" id="ptabPedidos">Meus pedidos</button></div>' +
  '<div id="pPainelDados"></div>' +
  '<div id="pPainelPedidos" style="display:none"></div>' +
  '<div class="m3l-err" id="m3lPErr"></div>' +
  '</div>' +
  '</div>';
  document.body.appendChild(ov);
  var $=function(id){return document.getElementById(id);};
  var modo='in';
  var upEmail='';
  var cepTimer=null;
  var abaPanel='dados';
  var perfilCache=null;
  /* ---------- Aviso de confirmação de e-mail ---------- */
  var verbar=document.createElement('div');
  verbar.className='m3l-verbar';verbar.id='m3lVerbar';
  verbar.innerHTML=
  '<strong>📧 Confirme seu e-mail</strong>' +
  '<div class="m3l-verbar-txt">Para liberar seu cupom de <b>10% de desconto</b> na primeira compra, confirme o e-mail que enviamos para <b id="m3lVerbarEmail">—</b>. Assim que confirmar, o cupom aparece na hora. Cheque também a caixa de spam.</div>' +
  '<div class="m3l-verbtns"><button type="button" class="m3l-verbtn esc" id="m3lVerReenviar">Reenviar e-mail</button><button type="button" class="m3l-verbtn ok" id="m3lVerOk">Já confirmei ✅</button></div>';
  document.body.appendChild(verbar);
  function emailVerificado(){
    var cu=auth.currentUser;
    return !cu?true:!!cu.emailVerified;
  }
  function checarVerif(){
    var cu=auth.currentUser;
    if(cu&&!cu.emailVerified){
      var em=$('m3lVerbarEmail');
      if(em)em.textContent=cu.email||'—';
      verbar.classList.add('show');
    }else{
      verbar.classList.remove('show');
    }
  }
  /* ---------- E-mail de verificação com a marca (via backend) ---------- */
  function pedirEmailVerificacaoBackend(){
    var cu=auth.currentUser;
    if(!cu||!cu.email)return Promise.reject({code:'sem-usuario'});
    return cu.getIdToken(true).then(function(tok){
      return fetch(API_BASE+'/auth/enviar-verificacao',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({idToken:tok})
      }).then(function(r){
        return r.json().catch(function(){return {};}).then(function(d){
          if(!r.ok)throw {code:'backend-erro',status:r.status,detalhe:(d&&d.error)||''};
          return d;
        });
      });
    });
  }
  /* ---------- Reenvio com contagem regressiva ---------- */
  var COOLDOWN_REENVIO=60;
  function iniciarCooldown(btn){
    var rest=COOLDOWN_REENVIO;
    btn.dataset.rotulo=btn.dataset.rotulo||btn.textContent;
    clearInterval(btn._m3lCd);
    btn.disabled=true;
    var tick=function(){
      if(rest<=0){
        clearInterval(btn._m3lCd);
        btn.disabled=false;
        btn.textContent=btn.dataset.rotulo;
        return;
      }
      btn.textContent='Aguarde '+rest+'s ⏳';
      rest--;
    };
    tick();
    btn._m3lCd=setInterval(tick,1000);
  }
  function falhaReenvioAlerta(cod){
    var m={'auth/too-many-requests':'⚠️ Limite de envios para este e-mail atingido (proteção do Google). Aguarde cerca de 1 hora e clique em Reenviar novamente.'};
    alert(m[cod]||'Não foi possível reenviar agora ('+cod+'). Tente novamente em alguns minutos.');
  }
  function reenviarConfirmacao(btn,aoConcluir){
    var cu=auth.currentUser;
    if(!cu||cu.emailVerified)return;
    if(btn.disabled)return;
    var t=btn.dataset.rotulo||btn.textContent;
    btn.dataset.rotulo=t;
    btn.disabled=true;btn.textContent='Enviando...';
    function ok(){
      btn.textContent='Enviado ✅';
      if(aoConcluir)aoConcluir();
      setTimeout(function(){iniciarCooldown(btn);},1800);
    }
    function falhaFirebase(e){
      console.warn('loja-login: reenvio padrão do Firebase também falhou',(e&&e.code)||'');
      btn.disabled=false;btn.textContent=t;
      falhaReenvioAlerta((e&&e.code)||'erro-desconhecido');
    }
    /* 1ª opção: backend com a marca Meu 3D Labs. Se cair, usa o envio padrão do Firebase como segurança. */
    pedirEmailVerificacaoBackend().then(ok).catch(function(e){
      console.warn('loja-login: backend falhou no reenvio — tentando envio padrão do Firebase',(e&&e.code)||'');
      cu.sendEmailVerification().then(ok).catch(falhaFirebase);
    });
  }
  $('m3lVerReenviar').onclick=function(){reenviarConfirmacao(this);};
  $('m3lVerOk').onclick=function(){
    var b=this;b.disabled=true;var t=b.textContent;b.textContent='Verificando...';
    var cu=auth.currentUser;
    if(!cu){b.disabled=false;b.textContent=t;return;}
    cu.reload().then(function(){
      var ok=!!(auth.currentUser&&auth.currentUser.emailVerified);
      b.disabled=false;b.textContent=t;
      if(ok){verbar.classList.remove('show');atualizarBotao(auth.currentUser);}
      else{b.textContent='Ainda pendente — confira o e-mail';setTimeout(function(){b.textContent='Já confirmei ✅';},3000);}
    }).catch(function(){b.disabled=false;b.textContent=t;});
  };
  function erro(msg){
    var e=$('m3lErr');
    if(msg){e.textContent=msg;e.classList.add('show');}else{e.classList.remove('show');}
  }
  function perr(msg){
    var e=$('m3lPErr');
    e.classList.remove('ok');
    if(msg){e.textContent=msg;e.classList.add('show');}else{e.classList.remove('show');}
  }
  function pok(msg){
    var e=$('m3lPErr');
    e.textContent=msg;e.classList.add('show','ok');
  }
  function mascaraFoneM3l(el){
    var d=el.value.replace(/\D/g,'').slice(0,11);
    var v='';
    if(d.length>0)v='('+d.slice(0,2);
    if(d.length>2)v+=') '+d.slice(2,7);
    if(d.length>6)v+='-'+d.slice(7,11);
    el.value=v;
  }
  function formatarFoneLoja(d){
    d=String(d||'').replace(/\D/g,'').slice(0,11);
    var v='—';
    if(d.length>0)v='('+d.slice(0,2);
    if(d.length>2)v+=') '+d.slice(2,7);
    if(d.length>6)v+='-'+d.slice(7,11);
    return v;
  }
  function mascaraCepM3l(el){
    var d=el.value.replace(/\D/g,'').slice(0,8);
    el.value=d.length>5?d.slice(0,5)+'-'+d.slice(5):d;
  }
  function fmtBRL(v){v=parseFloat(v)||0;return 'R$ '+v.toFixed(2).replace('.',',');}
  function dataBonita(iso){
    try{
      var d=new Date(iso);
      return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})+' · '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }catch(e){return '';}
  }
  function limparCepVisual(){
    $('m3lCepInfo').classList.remove('show');
    var h=$('m3lCepHint');h.style.display='none';h.textContent='';
  }
  function opcoesMeses(sel){
    var o='<option value="">Mês</option>';
    for(var m=1;m<=12;m++){o+='<option value="'+m+'"'+(sel===m?' selected':'')+'>'+mesesN[m-1]+'</option>';}
    return o;
  }
  function validarAniversario(dia,mes){
    if(!dia||dia<1||dia>31)return 'Informe o dia do seu nascimento (1 a 31).';
    if(!mes||mes<1||mes>12)return 'Selecione o mês do seu nascimento.';
    var diasMax=[31,29,31,30,31,30,31,31,30,31,30,31];
    if(dia>diasMax[mes-1])return 'Dia '+dia+' não existe em '+mesesN[mes-1]+'. Confira a data.';
    return '';
  }
  function setModo(m){
    modo=m;
    $('tabIn').classList.toggle('on',m==='in');
    $('tabUp').classList.toggle('on',m==='up');
    if(m==='in'){
      $('paneIn').style.display='block';
      $('paneUp1').style.display='none';
      $('paneUp2').style.display='none';
      $('m3lSub').textContent='Acesse sua conta para comprar mais rápido.';
    }else{
      $('paneIn').style.display='none';
      $('paneUp1').style.display='block';
      $('paneUp2').style.display='none';
      $('m3lSub').textContent='Cadastre-se grátis e, confirmando seu e-mail, ganhe 10% de desconto na primeira compra.';
    }
    erro('');
  }
  $('tabIn').onclick=function(){setModo('in');};
  $('tabUp').onclick=function(){setModo('up');};
  /* ---------- Etapa 1: verificar e-mail ---------- */
  function irEtapa2(){
    $('m3lStep2').textContent='Etapa 2 de 2 · complete seu cadastro ('+upEmail+')';
    $('paneUp1').style.display='none';
    $('paneUp2').style.display='block';
    $('m3lNome').focus();
  }
  function continuar(){
    erro('');
    var email=$('m3lEmailUp').value.trim();
    if(!email){erro('Digite seu e-mail para continuar.');return;}
    var b=$('m3lNext');b.disabled=true;var t=b.textContent;b.textContent='Verificando...';
    function segue(){b.disabled=false;b.textContent=t;upEmail=email;irEtapa2();}
    auth.fetchSignInMethodsForEmail(email).then(function(metodos){
      if(metodos&&metodos.length){
        b.disabled=false;b.textContent=t;
        erro('Já existe uma conta com esse e-mail — use a aba Entrar ou Continuar com Google.');
        setModo('in');
        $('m3lEmailIn').value=email;
        return;
      }
      segue();
    }).catch(function(){segue();});
  }
  $('m3lNext').onclick=continuar;
  $('m3lEmailUp').addEventListener('keydown',function(ev){if(ev.key==='Enter')continuar();});
  $('m3lBack').onclick=function(){
    $('paneUp2').style.display='none';
    $('paneUp1').style.display='block';
    if(upEmail)$('m3lEmailUp').value=upEmail;
    erro('');
  };
  /* ---------- CEP via ViaCEP (cadastro) ---------- */
  $('m3lCep').addEventListener('input',function(){
    mascaraCepM3l(this);
    limparCepVisual();
    var d=this.value.replace(/\D/g,'');
    clearTimeout(cepTimer);
    if(d.length===8){
      cepTimer=setTimeout(function(){buscarCepM3l(d);},350);
    }
  });
  function buscarCepM3l(d){
    fetch('https://viacep.com.br/ws/'+d+'/json/')
    .then(function(r){return r.json();})
    .then(function(dd){
      if(dd.erro||!dd.logradouro){
        var h=$('m3lCepHint');h.textContent='CEP não encontrado — confira os números ou preencha o endereço no checkout.';h.style.display='block';
        return;
      }
      $('m3lRua').value=dd.logradouro||'';
      $('m3lBairro').value=dd.bairro||'';
      $('m3lCidUf').value=(dd.localidade||'')+((dd.uf)?' - '+dd.uf:'');
      $('m3lCepInfo').classList.add('show');
    })
    .catch(function(){
      var h=$('m3lCepHint');h.textContent='Não conseguimos consultar o CEP agora — o endereço pode ser preenchido no checkout.';h.style.display='block';
    });
  }
  /* ---------- Olhinho mostrar/ocultar senha ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('#m3lLoginOv .m3l-eye'),function(olho){
    olho.onclick=function(){
      var inp=$(olho.getAttribute('data-alvo'));
      if(!inp)return;
      var mostrar=inp.type==='password';
      inp.type=mostrar?'text':'password';
      olho.textContent=mostrar?'🙈':'👁';
      inp.focus();
    };
  });
  function abreModal(){
    if(window.m3lUser){
      $('m3lTitulo').textContent='Minha conta';
      $('m3lSub').style.display='none';
      $('m3lFormArea').style.display='none';
      $('m3lLogged').style.display='block';
      renderHead();
      setAba(abaPanel||'dados');
      ov.classList.add('open');
    }else{
      $('m3lTitulo').textContent='Bem-vindo à Meu 3D Labs';
      $('m3lSub').style.display='block';
      $('m3lSub').textContent='Acesse sua conta para comprar mais rápido.';
      $('m3lFormArea').style.display='block';
      $('m3lLogged').style.display='none';
      erro('');
      ov.classList.add('open');
    }
  }
  function fechaModal(){ov.classList.remove('open');}
  btn.onclick=abreModal;
  $('m3lClose').onclick=fechaModal;
  ov.addEventListener('click',function(ev){if(ev.target===ov)fechaModal();});
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape')fechaModal();});
  /* ================= PAINEL MINHA CONTA ================= */
  function renderHead(){
    var u=window.m3lUser||{};
    var p=perfilCache||{};
    var nome=(p.nome||u.nome||'').trim();
    $('m3lPNome').textContent=nome||'Minha conta';
    $('m3lPEmail').textContent=u.email||'';
    $('m3lAvatar').textContent=nome?nome.charAt(0).toUpperCase():'👤';
  }
  function setAba(a){
    abaPanel=a;
    $('ptabDados').classList.toggle('on',a==='dados');
    $('ptabPedidos').classList.toggle('on',a==='pedidos');
    $('pPainelDados').style.display=(a==='dados')?'block':'none';
    $('pPainelPedidos').style.display=(a==='pedidos')?'block':'none';
    if(a==='dados')renderDados();else renderPedidos();
  }
  $('ptabDados').onclick=function(){perr('');setAba('dados');};
  $('ptabPedidos').onclick=function(){perr('');setAba('pedidos');};
  function renderDados(){
    perr('');
    var u=window.m3lUser||{};
    var p=perfilCache||{};
    var cuAuth=auth.currentUser;
    var emailConf=!!(cuAuth&&cuAuth.emailVerified);
    var temEnd=!!(p.cep||p.rua);
    var vEnd='Não informado';
    if(temEnd){
      vEnd=(p.rua||'Rua —')+(p.numero?', '+p.numero:'')+(p.complemento?' ('+p.complemento+')':'')
      +((p.bairro||p.cep||p.cidade)?'<br>':'')
      +(p.bairro?p.bairro+' · ':'')+(p.cep?'CEP '+p.cep:'')+(p.cidade?' · '+p.cidade+(p.uf?' - '+p.uf:''):'');
    }
    var vAniv=(p.nascimentoDia&&p.nascimentoMes)?(p.nascimentoDia+' de '+mesesN[p.nascimentoMes-1]):'—';
    var html='<div class="m3l-dados">'
    +'<div class="m3l-dado"><span>Nome</span><div class="v">'+(p.nome||u.nome||'—')+'</div></div>'
    +'<div class="m3l-dado"><span>E-mail</span><div class="v">'+(u.email||'—')+(emailConf?' <span class="m3l-ver-ok">✅ confirmado</span>':' <span class="m3l-ver-pen">⏳ pendente</span>')+'</div></div>'
    +'<div class="m3l-dado"><span>WhatsApp</span><div class="v">'+(p.whatsapp?formatarFoneLoja(p.whatsapp):'—')+'</div></div>'
    +'<div class="m3l-dado"><span>🎂 Aniversário</span><div class="v">'+vAniv+'</div></div>'
    +'<div class="m3l-dado"><span>Endereço</span><div class="v">'+vEnd+'</div></div>'
    +'</div>';
    var ehSenha=false;
    try{ehSenha=!!(auth.currentUser&&auth.currentUser.providerData.some(function(x){return x.providerId==='password';}));}catch(e){}
    html+='<button type="button" class="m3l-acao" id="m3lBtnEdit">✏️ Editar meus dados</button>';
    if(!emailConf){html+='<button type="button" class="m3l-acao" id="m3lBtnVerif">📧 Reenviar e-mail de confirmação</button>';}
    if(ehSenha){html+='<button type="button" class="m3l-acao" id="m3lBtnSenha">🔑 Trocar senha</button>';}
    else{html+='<div class="m3l-gnote">Conta Google — a senha é gerenciada pelo Google.</div>';}
    html+='<button type="button" class="m3l-acao sair" id="m3lSair">Sair da conta</button>';
    $('pPainelDados').innerHTML=html;
    $('m3lBtnEdit').onclick=renderEdicao;
    var bvf=$('m3lBtnVerif');
    if(bvf)bvf.onclick=function(){reenviarConfirmacao(this,function(){pok('📬 Enviamos o e-mail de confirmação para '+(u.email||'')+'. Confira a caixa de entrada e o spam.');});};
    var bs=$('m3lBtnSenha');
    if(bs)bs.onclick=trocarSenha;
    $('m3lSair').onclick=function(){
      auth.signOut().then(fechaModal).catch(function(e){perr('Não foi possível sair — tente novamente.');});
    };
  }
  /* ---------- Editar dados ---------- */
  function renderEdicao(){
    perr('');
    var u=window.m3lUser||{};
    var p=perfilCache||{};
    var html='<button type="button" class="m3l-back" id="eVoltar">← Cancelar</button>'
    +'<div class="m3l-step">Edite seus dados</div>'
    +'<input type="text" id="eNome" placeholder="Nome e sobrenome" autocomplete="name" value="'+String(p.nome||u.nome||'').replace(/"/g,'&quot;')+'">'
    +'<input type="tel" id="eFone" placeholder="WhatsApp · (21) 99999-9999" maxlength="16" value="'+(p.whatsapp?formatarFoneLoja(p.whatsapp):'')+'">'
    +'<div class="m3l-linha2">'
    +'<input type="number" id="eNascDia" placeholder="Dia" min="1" max="31" value="'+(p.nascimentoDia||'')+'">'
    +'<select id="eNascMes">'+opcoesMeses(p.nascimentoMes)+'</select>'
    +'</div>'
    +'<input type="text" id="eCep" placeholder="CEP · para envios fora do RJ" maxlength="9" value="'+String(p.cep||'').replace(/"/g,'&quot;')+'">'
    +'<input type="text" id="eRua" placeholder="Rua / Avenida" value="'+String(p.rua||'').replace(/"/g,'&quot;')+'">'
    +'<div class="m3l-linha2">'
    +'<input type="text" id="eNum" placeholder="Nº" value="'+String(p.numero||'').replace(/"/g,'&quot;')+'">'
    +'<input type="text" id="eComp" placeholder="Compl." value="'+String(p.complemento||'').replace(/"/g,'&quot;')+'">'
    +'</div>'
    +'<input type="text" id="eBairro" placeholder="Bairro" value="'+String(p.bairro||'').replace(/"/g,'&quot;')+'">'
    +'<input type="text" id="eCidUf" placeholder="Cidade - UF" value="'+((p.cidade||'')+(p.uf?(' - '+p.uf):'')).replace(/"/g,'&quot;')+'">'
    +'<button type="button" class="m3l-go" id="eSalvar">Salvar alterações</button>';
    $('pPainelDados').innerHTML=html;
    $('eVoltar').onclick=function(){perr('');renderDados();};
    $('eFone').addEventListener('input',function(){mascaraFoneM3l(this);});
    var cepTimer2=null;
    $('eCep').addEventListener('input',function(){
      mascaraCepM3l(this);
      var d=this.value.replace(/\D/g,'');
      clearTimeout(cepTimer2);
      if(d.length===8){cepTimer2=setTimeout(function(){buscarCepEdit(d);},350);}
    });
    $('eSalvar').onclick=salvarEdicao;
    $('eNome').focus();
  }
  function buscarCepEdit(d){
    perr('');
    fetch('https://viacep.com.br/ws/'+d+'/json/')
    .then(function(r){return r.json();})
    .then(function(dd){
      if(dd.erro||!dd.logradouro){perr('CEP não encontrado — confira os números ou preencha o endereço manualmente.');return;}
      var r1=$('eRua'),b1=$('eBairro'),c1=$('eCidUf');
      if(r1)r1.value=dd.logradouro||'';
      if(b1)b1.value=dd.bairro||'';
      if(c1)c1.value=(dd.localidade||'')+((dd.uf)?' - '+dd.uf:'');
      pok('✅ Endereço encontrado — confira e salve!');
    })
    .catch(function(){perr('Não conseguimos consultar o CEP agora — preencha o endereço manualmente.');});
  }
  function salvarEdicao(){
    perr('');
    var u=window.m3lUser;
    if(!u||!u.uid){perr('Sessão expirada — entre novamente.');return;}
    var nome=$('eNome').value.trim();
    var fone=$('eFone').value.replace(/\D/g,'');
    var nascDia=parseInt($('eNascDia').value,10);
    var nascMes=parseInt($('eNascMes').value,10);
    var cep=$('eCep').value.replace(/\D/g,'');
    var rua=$('eRua').value.trim();
    var num=$('eNum').value.trim();
    var comp=$('eComp').value.trim();
    var bairro=$('eBairro').value.trim();
    var cu=$('eCidUf').value.trim().split(' - ');
    var cidade=(cu[0]||'').trim();
    var uf=(cu[1]||'').trim();
    if(nome.length<3){perr('Digite seu nome completo.');return;}
    if(fone&&fone.length<10){perr('WhatsApp inválido — use DDD + número. Ex.: (21) 99999-9999.');return;}
    var eAniv=validarAniversario(nascDia,nascMes);
    if(eAniv){perr(eAniv);return;}
    if(cep&&cep.length!==8){perr('CEP incompleto — digite os 8 números ou deixe em branco.');return;}
    var b=$('eSalvar');b.disabled=true;var t=b.textContent;b.textContent='Salvando...';
    auth.currentUser.updateProfile({displayName:nome}).then(function(){
      if(!db)return;
      return db.collection('clientes').doc(u.uid).set({nome:nome,email:u.email,whatsapp:fone,nascimentoDia:nascDia,nascimentoMes:nascMes,cep:cep,rua:rua,numero:num,complemento:comp,bairro:bairro,cidade:cidade,uf:uf},{merge:true});
    }).then(function(){
      perfilCache={nome:nome,whatsapp:fone,nascimentoDia:nascDia,nascimentoMes:nascMes,cep:cep,rua:rua,numero:num,complemento:comp,bairro:bairro,cidade:cidade,uf:uf};
      u.nome=nome;u.fone=fone;
      u.endereco={cep:cep,rua:rua,numero:num,comp:comp,bairro:bairro,cidade:cidade,uf:uf};
      try{document.dispatchEvent(new CustomEvent('m3l-user-changed',{detail:u}));}catch(e){}
      atualizarBotao(auth.currentUser);
      renderHead();
      renderDados();
      pok('✅ Dados atualizados com sucesso!');
    }).catch(function(e){
      b.disabled=false;b.textContent=t;
      perr('Não foi possível salvar: '+((e&&e.message)?e.message:'tente novamente.'));
    });
  }
  /* ---------- Trocar senha (link por e-mail) ---------- */
  function trocarSenha(){
    perr('');
    var b=$('m3lBtnSenha');
    if(!b)return;
    b.disabled=true;var t=b.textContent;b.textContent='Enviando...';
    auth.sendPasswordResetEmail(window.m3lUser.email).then(function(){
      b.disabled=false;b.textContent=t;
      pok('📬 Enviamos um link de redefinição para '+window.m3lUser.email+'. Confira sua caixa de entrada (e o spam).');
    }).catch(function(e){
      b.disabled=false;b.textContent=t;
      var m={
        'auth/too-many-requests':'Muitas tentativas — aguarde alguns minutos.',
        'auth/user-not-found':'Conta não encontrada.',
        'auth/network-request-failed':'Falha de conexão — verifique sua internet.',
        'auth/invalid-email':'E-mail inválido.'
      };
      perr(m[e&&e.code]||'Não foi possível enviar agora — tente novamente.');
    });
  }
  /* ---------- Meus pedidos ---------- */
  function renderPedidos(){
    perr('');
    var lista=[];
    try{lista=JSON.parse(localStorage.getItem('m3l_pedidos')||'[]');}catch(e){lista=[];}
    if(!Array.isArray(lista))lista=[];
    lista=lista.slice().reverse();
    var html='';
    if(!lista.length){
      html+='<div class="m3l-vazio"><div class="ico">📦</div>Você ainda não fez pedidos por aqui.<br>Quando gerar o primeiro pedido, ele aparece nesta lista.</div>';
    }else{
      lista.forEach(function(p){
        var foto=(p.itens&&p.itens[0]&&p.itens[0].img)?p.itens[0].img:'';
        var qtdItens=0;
        if(p.itens)p.itens.forEach(function(i){qtdItens+=(i.qtd||1);});
        var st=p.registrado?'✅ Confirmado':'📨 Aguardando confirmação';
        html+='<div class="m3l-pedido">'
        +'<div class="m3l-pedido-foto">'+(foto?'<img src="'+foto+'" alt="">':'📦')+'</div>'
        +'<div class="m3l-pedido-info">'
        +'<div class="m3l-pedido-num">#'+p.numero+'</div>'
        +'<div class="m3l-pedido-meta">'+dataBonita(p.data)+' · '+fmtBRL(p.total)+' · '+qtdItens+(qtdItens===1?' item':' itens')+'</div>'
        +'<div class="m3l-pedido-st'+(p.registrado?'':' pen')+'">'+st+'</div>'
        +'</div>'
        +'<a class="m3l-pedido-track" href="acompanhar.html?pedido='+encodeURIComponent(p.numero)+'">Rastrear</a>'
        +'</div>';
      });
    }
    html+='<a class="m3l-rastrear" href="acompanhar.html">🔗 Rastrear pedido</a>';
    $('pPainelPedidos').innerHTML=html;
  }
  /* ---------- Tradução de erros ---------- */
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
  /* ---------- Entrar ---------- */
  function goIn(){
    erro('');
    var email=$('m3lEmailIn').value.trim();
    var senha=$('m3lSenhaIn').value;
    if(!email){erro('Digite seu e-mail.');return;}
    if(!senha){erro('Digite a senha.');return;}
    var g=$('m3lGoIn');g.disabled=true;var t=g.textContent;g.textContent='Aguarde...';
    function falha(e){erro(traduzErro(e));g.disabled=false;g.textContent=t;}
    auth.signInWithEmailAndPassword(email,senha).then(fechaModal).catch(falha);
  }
  $('m3lGoIn').onclick=goIn;
  $('m3lEmailIn').addEventListener('keydown',function(ev){if(ev.key==='Enter')goIn();});
  $('m3lSenhaIn').addEventListener('keydown',function(ev){if(ev.key==='Enter')goIn();});
  /* ---------- Perfil no Firestore ---------- */
  function salvarPerfil(uid,dados){
    if(!db||!uid)return Promise.resolve();
    return db.collection('clientes').doc(uid).set(dados,{merge:true}).catch(function(e){console.warn('loja-login: perfil não salvo',e);});
  }
  /* ---------- Etapa 2: criar conta ---------- */
  function criar(){
    erro('');
    var nome=$('m3lNome').value.trim();
    var senha=$('m3lSenha').value;
    var senha2=$('m3lSenha2').value;
    var fone=$('m3lFone').value.replace(/\D/g,'');
    var nascDia=parseInt($('m3lNascDia').value,10);
    var nascMes=parseInt($('m3lNascMes').value,10);
    var cep=$('m3lCep').value.replace(/\D/g,'');
    if(!upEmail){erro('Volte e informe seu e-mail.');return;}
    if(nome.length<3){erro('Digite seu nome e sobrenome.');return;}
    if(senha.length<6){erro('A senha precisa de pelo menos 6 caracteres.');return;}
    if(senha!==senha2){erro('As senhas não conferem. Confira e digite novamente.');return;}
    if(fone.length<10){erro('Informe um WhatsApp válido com DDD. Exemplo: (21) 99999-9999.');return;}
    var eAniv=validarAniversario(nascDia,nascMes);
    if(eAniv){erro(eAniv);return;}
    if(cep&&cep.length!==8){erro('CEP incompleto — digite os 8 números ou deixe em branco.');return;}
    var temEnd=$('m3lCepInfo').classList.contains('show');
    var ruaV=temEnd?$('m3lRua').value.trim():'';
    var bairroV=temEnd?$('m3lBairro').value.trim():'';
    var cuV=temEnd?($('m3lCidUf').value.trim().split(' - ')):['',''];
    var cidadeV=(cuV[0]||'').trim();
    var ufV=(cuV[1]||'').trim();
    var g=$('m3lGoUp');g.disabled=true;var t=g.textContent;g.textContent='Criando conta...';
    function falha(e){erro(traduzErro(e));g.disabled=false;g.textContent=t;}
    auth.createUserWithEmailAndPassword(upEmail,senha)
      .then(function(cred){
        /* E-mail de verificação com a marca Meu 3D Labs (via backend).
           Se o backend não responder, cai no envio padrão do Firebase — nada quebra. */
        pedirEmailVerificacaoBackend().then(function(){
          console.info('loja-login: e-mail de verificação enviado com a marca Meu 3D Labs');
        }).catch(function(e){
          console.warn('loja-login: backend falhou — usando envio padrão do Firebase',(e&&e.code)||'');
          cred.user.sendEmailVerification().catch(function(e2){
            console.warn('loja-login: e-mail de confirmação não enviado',(e2&&e2.code)||'erro-desconhecido');
            var vb=document.getElementById('m3lVerbar');
            if(vb){
              var txt=vb.querySelector('.m3l-verbar-txt');
              if(txt)txt.innerHTML='⚠️ Não conseguimos enviar o e-mail de confirmação agora ('+((e2&&e2.code)||'erro')+'). Use o botão <b>Reenviar</b> em alguns minutos.';
            }
          });
        });
        return cred.user.updateProfile({displayName:nome}).then(function(){return cred;});
      })
      .then(function(cred){
        var dados={nome:nome,email:upEmail,whatsapp:fone,nascimentoDia:nascDia,nascimentoMes:nascMes,cep:cep,rua:ruaV,numero:'',complemento:'',bairro:bairroV,cidade:cidadeV,uf:ufV};
        perfilCache={nome:nome,whatsapp:fone,nascimentoDia:nascDia,nascimentoMes:nascMes,cep:cep,rua:ruaV,numero:'',complemento:'',bairro:bairroV,cidade:cidadeV,uf:ufV};
        return salvarPerfil(cred.user.uid,dados).then(function(){aplicarPerfilLocal(dados);return cred;});
      })
      .then(function(cred){atualizarBotao(cred.user);fechaModal();})
      .catch(falha);
  }
  $('m3lGoUp').onclick=criar;
  $('m3lSenha').addEventListener('keydown',function(ev){if(ev.key==='Enter')criar();});
  $('m3lSenha2').addEventListener('keydown',function(ev){if(ev.key==='Enter')criar();});
  $('m3lFone').addEventListener('input',function(){mascaraFoneM3l(this);});
  $('m3lFone').addEventListener('keydown',function(ev){if(ev.key==='Enter')criar();});
  /* ---------- Login com Google ---------- */
  $('m3lGoogle').onclick=function(){
    erro('');
    var gBtn=$('m3lGoogle');
    gBtn.disabled=true;
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(fechaModal)
      .catch(function(e){erro(traduzErro(e));})
      .then(function(){gBtn.disabled=false;});
  };
  /* ---------- Estado da sessão + perfil ---------- */
  function aplicarPerfilLocal(dados){
    if(!window.m3lUser)window.m3lUser={uid:null,nome:'',email:'',fone:'',endereco:null};
    if(dados.nome)window.m3lUser.nome=dados.nome;
    if(dados.whatsapp)window.m3lUser.fone=dados.whatsapp;
    window.m3lUser.endereco={cep:dados.cep||'',rua:dados.rua||'',numero:dados.numero||'',comp:dados.complemento||'',bairro:dados.bairro||'',cidade:dados.cidade||'',uf:dados.uf||''};
    try{document.dispatchEvent(new CustomEvent('m3l-user-changed',{detail:window.m3lUser}));}catch(e){}
  }
  function atualizarBotao(u){
    if(!u){btn.textContent='Entrar / Cadastrar';return;}
    var n=(u.displayName||'').trim();
    btn.textContent=n?('Olá, '+n.split(' ')[0]):'Minha conta';
  }
  auth.onAuthStateChanged(function(u){
    window.m3lUser=u?{uid:u.uid,nome:(u.displayName||''),email:u.email,fone:'',endereco:null}:null;
    if(!u){perfilCache=null;abaPanel='dados';}
    try{document.dispatchEvent(new CustomEvent('m3l-user-changed',{detail:window.m3lUser}));}catch(e){}
    atualizarBotao(u);
    checarVerif();
    if(u&&db){
      db.collection('clientes').doc(u.uid).get().then(function(snap){
        if(!snap.exists||!window.m3lUser)return;
        var p=snap.data()||{};
        perfilCache={nome:p.nome||'',whatsapp:p.whatsapp||'',nascimentoDia:p.nascimentoDia||null,nascimentoMes:p.nascimentoMes||null,cep:p.cep||'',rua:p.rua||'',numero:p.numero||'',complemento:p.complemento||'',bairro:p.bairro||'',cidade:p.cidade||'',uf:p.uf||''};
        window.m3lUser.fone=p.whatsapp||'';
        window.m3lUser.endereco={cep:p.cep||'',rua:p.rua||'',numero:p.numero||'',comp:p.complemento||'',bairro:p.bairro||'',cidade:p.cidade||'',uf:p.uf||''};
        try{document.dispatchEvent(new CustomEvent('m3l-user-changed',{detail:window.m3lUser}));}catch(e){}
        if(ov.classList.contains('open')&&window.m3lUser){
          renderHead();
          if(abaPanel==='pedidos')renderPedidos();else renderDados();
        }
      }).catch(function(){});
    }
  });
  /* ---------- Abrir cadastro de fora (convite no checkout) ---------- */
  window.m3lAbrirCadastro=function(){
    if(window.m3lUser){abreModal();return;}
    abreModal();
    setModo('up');
    try{$('m3lEmailUp').focus();}catch(e){}
  };
  /* ---------- Salvar perfil de fora (checkout salva endereço após pedido) ---------- */
  window.m3lSalvarPerfil=function(dados){
    if(!db||!window.m3lUser||!window.m3lUser.uid||!dados)return Promise.resolve();
    var d={};
    if(dados.whatsapp!==undefined)d.whatsapp=String(dados.whatsapp).replace(/\D/g,'');
    ['cep','rua','numero','complemento','bairro','cidade','uf'].forEach(function(k){
      if(dados[k]!==undefined&&String(dados[k]).trim()!=='')d[k]=String(dados[k]).trim();
    });
    if(!Object.keys(d).length)return Promise.resolve();
    return db.collection('clientes').doc(window.m3lUser.uid).set(d,{merge:true}).then(function(){
      if(perfilCache){
        if(d.whatsapp!==undefined)perfilCache.whatsapp=d.whatsapp;
        ['cep','rua','numero','complemento','bairro','cidade','uf'].forEach(function(k){if(d[k]!==undefined)perfilCache[k]=d[k];});
      }
      if(d.whatsapp!==undefined)window.m3lUser.fone=d.whatsapp;
      var mudou=false;
      ['cep','rua','numero','complemento','bairro','cidade','uf'].forEach(function(k){
        if(d[k]!==undefined){
          window.m3lUser.endereco=window.m3lUser.endereco||{};
          window.m3lUser.endereco[k==='complemento'?'comp':k]=d[k];
          mudou=true;
        }
      });
      if(mudou){try{document.dispatchEvent(new CustomEvent('m3l-user-changed',{detail:window.m3lUser}));}catch(e){}}
    }).catch(function(e){console.warn('loja-login: perfil não salvo',e);});
  };
  /* ---------- Bloqueio: checkout e cupom até confirmar o e-mail ---------- */
  window.m3lEmailVerificado=emailVerificado;
  (function guardaCheckout(){
    var tent=0;
    (function tenta(){
      var orig=window.abrirCheckout;
      if(typeof orig==='function'){
        window.abrirCheckout=function(){
          var cu=auth.currentUser;
          if(cu&&!cu.emailVerified){checarVerif();return;}
          return orig.apply(this,arguments);
        };
        return;
      }
      if(++tent<40)setTimeout(tenta,300);
    })();
  })();
  /* ---------- Retorno da confirmação: aviso na loja ---------- */
  if(location.search.indexOf('verificado=1')!==-1){
    try{history.replaceState(null,'',location.pathname);}catch(e){}
    var tent2=0;
    (function tentaToast(){
      var t=document.getElementById('toast');
      if(t){
        t.textContent='✅ E-mail confirmado! Sua conta está ativa e seu cupom de 10% liberado.';
        t.classList.add('show');
        setTimeout(function(){t.classList.remove('show');},5000);
      }else if(++tent2<40){setTimeout(tentaToast,250);}
    })();
  }
  (function guardaCupom(){
    var tent=0;
    (function tenta(){
      var orig=window.aplicarCupom;
      if(typeof orig==='function'){
        window.aplicarCupom=function(){
          var cu=auth.currentUser;
          if(cu&&!cu.emailVerified){
            var inp=document.querySelector('.cupom-linha input');
            var v=inp?(inp.value||'').trim().toUpperCase():'';
            if(v==='MEUPRIMEIRO3D10'){
              checarVerif();
              var msg=document.querySelector('.cupom-msg');
              if(msg){msg.textContent='Confirme seu e-mail para resgatar seu cupom de 10% de desconto.';msg.className='cupom-msg erro';}
              return;
            }
          }
          return orig.apply(this,arguments);
        };
        return;
      }
      if(++tent<40)setTimeout(tenta,300);
    })();
  })();
})();