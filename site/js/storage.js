/* Plate Log: saving and loading: device storage, account storage, debounced saves. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- storage ---------- */
var LS_KEY='platelog.v1';
function readLocal(){try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}')||{};}catch(e){return {};}}
function writeLocal(o){try{localStorage.setItem(LS_KEY,JSON.stringify(o));}catch(e){}}
function useLocal(reason){
  backend={kind:'local'};
  var all=readLocal();S.sessions=localMap(all);
  if(all.config&&!cfgDirty)S.cfg=normCfg(all.config);
  setStatus(reason||'Saved on this device only','');
}
var ready=null;
/* called once by main.js after every file has loaded */
function startStorage(){
  ready=(async function(){
  var db=await use('db');var user=await use('user');
  var uid=null;try{uid=user?await user.id():null;}catch(e){}
  if(db&&uid){
    var coll=db.collection('data/users/'+uid);
    backend={kind:'db',coll:coll};
    await new Promise(function(res){
      var first=true;
      coll.onSnapshot(function(snap){
        var m=new Map(),cfgIn=null;
        snap.docs.forEach(function(d){
          if(!d.exists)return;
          if(/^s_/.test(d.id))m.set(d.id,d.data());
          else if(d.id==='config')cfgIn=d.data();
        });
        S.sessions=m;
        if(cfgIn&&!cfgDirty)S.cfg=normCfg(cfgIn);
        if(first){first=false;setStatus('Saved to your account','ok');res();}
        onData();
      },function(){
        useLocal('Saved on this device only');
        if(first){first=false;res();}
        onData();
      });
    });
  }else{
    useLocal('Saved on this device only');
    onData();
  }
  })();
}

function onData(){
  S.cfgLoaded=true;checkPid();if(!S.pUI)renderPeople();
  var ed=document.activeElement;
  var editing=ed&&$('#panel-log').contains(ed)&&/^(INPUT|TEXTAREA)$/.test(ed.tagName);
  var planEditing=ed&&$('#panel-plan').contains(ed)&&/^(INPUT|TEXTAREA)$/.test(ed.tagName);
  if(S.tab==='log'){
    if(!S.dirty&&!editing){loadDraft();renderLog();}
  }else if(S.tab==='plan'){
    if(!cfgDirty&&!planEditing)renderActive();
  }else{renderActive();}
  refreshDatalist();
}
async function doSaveCfg(cfg){
  await ready;
  try{
    if(backend.kind==='db'){
      await backend.coll.doc('config').set(cfg);
      setStatus('Saved to your account','ok');
    }else{
      var all=readLocal();all.config=cfg;writeLocal(all);
      setStatus('Saved on this device only','');
    }
  }catch(e){
    if(e&&e.code==='invalid_argument')setStatus('Read-only view: changes are not saved','err');
    else setStatus('Save failed. It will retry on your next edit','err');
  }
  if(!cfgTimer)cfgDirty=false;
}
function runCfgSave(){
  cfgTimer=null;
  var snap=clone(S.cfg);
  chain=chain.then(function(){return doSaveCfg(snap);}).catch(function(){});
}
function scheduleCfg(){
  Object.keys(S.cfg.plans).forEach(function(k){delete S.cfg.plans[k].fresh;});
  cfgDirty=true;setStatus('Saving…','');
  clearTimeout(cfgTimer);cfgTimer=setTimeout(runCfgSave,600);
}
function flushCfg(){if(cfgTimer){clearTimeout(cfgTimer);runCfgSave();}}
function deleteSessions(keys){
  if(!keys.length)return;
  chain=chain.then(async function(){
    await ready;
    try{
      if(backend.kind==='db'){for(var i=0;i<keys.length;i++){await backend.coll.doc(keys[i]).delete();}}
      else{var all=readLocal();keys.forEach(function(k){delete all[k];});writeLocal(all);S.sessions=localMap(all);}
    }catch(e){setStatus('Could not remove all logs','err');}
  }).catch(function(){});
}
async function doSave(key,doc){
  await ready;
  var keep=hasContent(doc);
  try{
    if(backend.kind==='db'){
      var ref=backend.coll.doc(key);
      if(keep)await ref.set(doc);else await ref.delete();
      setStatus('Saved to your account','ok');
    }else{
      var all=readLocal();
      if(keep)all[key]=doc;else delete all[key];
      writeLocal(all);
      S.sessions=localMap(all);
      setStatus('Saved on this device only','');
    }
  }catch(e){
    if(e&&e.code==='invalid_argument')setStatus('Read-only view: changes are not saved','err');
    else setStatus('Save failed. It will retry on your next edit','err');
  }
}
function commit(){
  if(!S.draft||!S.dirty)return;
  var d=clone(S.draft.doc);d.updated=Date.now();d.profile=S.draft.pid||S.pid;if(!d.label)d.label=nameFor(d.type);
  S.dirty=false;
  var key=S.draft.key;
  chain=chain.then(function(){return doSave(key,d);}).catch(function(){});
}
function scheduleSave(){
  S.dirty=true;setStatus('Saving…','');
  clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveTimer=null;commit();},700);
}
function flush(){if(saveTimer){clearTimeout(saveTimer);saveTimer=null;}commit();flushCfg();}

