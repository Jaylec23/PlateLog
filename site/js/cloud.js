/* Plate Log cloud layer: optional Supabase accounts + sync.
   Presents the same tiny `window.claude.use('db' | 'user' | 'downloads')` surface the app already
   talks to, so the app code is identical whether data lives on the device or in an account.
   With no Supabase keys in config.js the app simply runs on this device only. */
(function(){
'use strict';
var cfg=window.PLATELOG_CONFIG||{};
var URL_=String(cfg.SUPABASE_URL||''),KEY=String(cfg.SUPABASE_ANON_KEY||'');
var enabled=/^https:\/\/[^\s]+$/.test(URL_)&&KEY.length>20&&!/YOUR_/.test(URL_+KEY);
var CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
var MODE_KEY='platelog.mode',LOCAL_KEY='platelog.v1';
var client=null,recovery=false;

function $(s){return document.querySelector(s);}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}return null;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

/* ---------- account area (inside the top-right menu in index.html) ---------- */
function bar(html,onClick){
  var el=$('#acct');if(!el)return;
  el.innerHTML=html;
  el.onclick=onClick||null;
}
/* short notices go in the footer message line, since the menu is usually closed */
function note(txt,ms){
  var m=$('#msg');if(!m)return;
  m.textContent=txt;
  setTimeout(function(){if(m.textContent===txt)m.textContent='';},ms||6000);
}
function accountBar(email){
  if(email){
    bar('<span class="acctmail">Signed in as<br><b>'+esc(email)+'</b></span><button class="btn small" type="button" data-a="out">Sign out</button>',function(e){
      if(e.target.getAttribute('data-a')!=='out')return;
      Promise.resolve(client.auth.signOut()).catch(function(){}).then(function(){ls(MODE_KEY,null);location.reload();});
    });
  }else{
    bar('<span class="acctmail">Your log is on this device only.</span><button class="btn small" type="button" data-a="in">Sign in to sync</button>',function(e){
      if(e.target.getAttribute('data-a')!=='in')return;
      ls(MODE_KEY,null);location.reload();
    });
  }
}

/* ---------- sign-in screen ---------- */
function showAuth(mode){
  return new Promise(function(resolve){
    var tab=mode||'in';
    var w=document.createElement('div');w.className='authwrap';w.id='auth';
    document.body.appendChild(w);
    function done(session){w.remove();resolve(session);}
    function render(msg,kind){
      var isNew=tab==='newpass',isUp=tab==='up';
      w.innerHTML='<div class="authcard"><h2 class="authh">Plate Log</h2>'+
        '<p class="authsub">'+(isNew?'Choose a new password.':'Sign in to keep your training on every device.')+'</p>'+
        (isNew?'':'<div class="authtabs" role="tablist"><button type="button" data-t="in" class="'+(!isUp?'on':'')+'">Sign in</button><button type="button" data-t="up" class="'+(isUp?'on':'')+'">Create account</button></div>')+
        '<form id="authform" novalidate>'+
        (isNew?'':'<label>Email<input id="aemail" type="email" autocomplete="email" inputmode="email" required></label>')+
        '<label>'+(isNew?'New password':'Password')+'<input id="apass" type="password" autocomplete="'+(isUp||isNew?'new-password':'current-password')+'" minlength="8" required></label>'+
        '<button class="btn primary authgo" type="submit">'+(isNew?'Save password':isUp?'Create account':'Sign in')+'</button>'+
        '</form>'+
        '<div class="authmsg '+(kind||'')+'" role="status">'+esc(msg||'')+'</div>'+
        (isNew?'':'<div class="authlinks"><button type="button" data-a="reset">Forgot password?</button><button type="button" data-a="local">Continue without an account</button></div>')+
        '<p class="authnote">Without an account your log stays on this device only. <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a></p></div>';
    }
    render();
    w.addEventListener('click',function(e){
      var t=e.target.getAttribute&&e.target.getAttribute('data-t');
      if(t){tab=t;render();return;}
      var a=e.target.getAttribute&&e.target.getAttribute('data-a');
      if(a==='local'){ls(MODE_KEY,'local');done(null);}
      if(a==='reset'){
        var em=($('#aemail')||{}).value||'';
        if(!/.+@.+/.test(em)){render('Enter your email above first.','err');return;}
        client.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname}).then(function(r){
          render(r&&r.error?r.error.message:'Check your email for a reset link.',r&&r.error?'err':'ok');
        });
      }
    });
    w.addEventListener('submit',function(e){
      e.preventDefault();
      var pass=($('#apass')||{}).value||'',em=(($('#aemail')||{}).value||'').trim();
      var btn=$('.authgo');
      if(tab==='newpass'){
        if(pass.length<8){render('Use at least 8 characters.','err');return;}
        btn.disabled=true;
        client.auth.updateUser({password:pass}).then(function(r){
          if(r.error){render(r.error.message,'err');return;}
          return client.auth.getSession().then(function(s){done(s.data.session);});
        });
        return;
      }
      if(!/.+@.+/.test(em)){render('Enter a valid email.','err');return;}
      if(pass.length<8){render('Use at least 8 characters.','err');return;}
      btn.disabled=true;btn.textContent='Please wait…';
      var p=tab==='up'?client.auth.signUp({email:em,password:pass,options:{emailRedirectTo:location.origin+location.pathname}}):client.auth.signInWithPassword({email:em,password:pass});
      p.then(function(r){
        if(r.error){render(r.error.message,'err');return;}
        if(r.data&&r.data.session){done(r.data.session);return;}
        render('Check your email to confirm your account, then sign in.','ok');tab='in';
        setTimeout(function(){var m=$('#aemail');if(m)m.value=em;},0);
      }).catch(function(){render('Could not reach the server. Check your connection.','err');});
    });
  });
}

/* ---------- start-up ---------- */
function loadLib(){
  return new Promise(function(res){
    if(window.supabase&&window.supabase.createClient)return res(true);
    var s=document.createElement('script');s.src=CDN;s.onload=function(){res(true);};s.onerror=function(){res(false);};
    document.head.appendChild(s);
  });
}
async function start(){
  if(!enabled)return null;
  if(ls(MODE_KEY)==='local'){accountBar(null);return null;}
  var ok=await loadLib();
  if(!ok){bar('<span class="acctmail">Could not load sign-in, so this device is being used only.</span>');note('Could not load sign-in. Using this device only.');return null;}
  client=window.supabase.createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange(function(ev){if(ev==='PASSWORD_RECOVERY')recovery=true;});
  var r=await client.auth.getSession();
  var sess=r&&r.data&&r.data.session;
  if(recovery)sess=await showAuth('newpass');
  else if(!sess)sess=await showAuth('in');
  if(!sess){accountBar(null);return null;}
  accountBar(sess.user.email);
  return sess.user;
}
var gate=start().catch(function(){return null;});

/* ---------- cloud collection (same shape the app already uses) ---------- */
function migrateRows(u){
  var all;try{all=JSON.parse(ls(LOCAL_KEY)||'{}')||{};}catch(e){all={};}
  var rows=[];
  Object.keys(all).forEach(function(k){if(/^s_/.test(k)||k==='config')rows.push({user_id:u.id,id:k,data:all[k]});});
  return rows;
}
function makeDb(u){
  var pending=0,gen=0;
  function doc(id){return {
    set:async function(data){
      pending++;gen++;
      try{var r=await client.from('docs').upsert({user_id:u.id,id:id,data:data,updated_at:new Date().toISOString()},{onConflict:'user_id,id'});if(r.error)throw r.error;}
      finally{pending--;gen++;}
    },
    delete:async function(){
      pending++;gen++;
      try{var r=await client.from('docs').delete().eq('user_id',u.id).eq('id',id);if(r.error)throw r.error;}
      finally{pending--;gen++;}
    }
  };}
  function onSnapshot(ok,err){
    var busy=false,started=false;
    async function pull(first){
      if(busy||(!first&&pending>0))return;
      busy=true;var g0=gen;
      try{
        var r=await client.from('docs').select('id,data').eq('user_id',u.id);
        if(r.error)throw r.error;
        var rows=r.data||[];
        if(first&&!rows.length){
          var mig=migrateRows(u);
          if(mig.length){
            var up=await client.from('docs').upsert(mig,{onConflict:'user_id,id'});
            if(!up.error){rows=mig;note('Uploaded this device’s logs to your account.');}
          }
        }
        if(!first&&(pending>0||gen!==g0))return;
        ok({docs:rows.map(function(x){return {id:x.id,exists:true,data:function(){return x.data;}};})});
      }catch(e){if(first)err(e);}
      finally{busy=false;}
    }
    if(!started){
      started=true;
      document.addEventListener('visibilitychange',function(){if(!document.hidden)pull(false);});
      setInterval(function(){if(!document.hidden)pull(false);},60000);
    }
    pull(true);
  }
  return {collection:function(){return {doc:doc,onSnapshot:onSnapshot};}};
}

window.claude={use:function(n){
  if(n==='user')return gate.then(function(u){return u?{id:function(){return Promise.resolve(u.id);}}:null;});
  if(n==='db')return gate.then(function(u){return u?makeDb(u):null;});
  return Promise.resolve(null);
}};
})();
