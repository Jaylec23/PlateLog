/* Plate Log: app state, plan data model, per-person config. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- state ---------- */
var S={
  tab:'log',date:today(),type:'upperA',openDays:{},exOpen:null,exGroup:'All',exQ:'',splitAsk:null,rmDay:null,draft:null,dirty:false,
  weekStart:mondayOf(today()),year:new Date().getFullYear(),exSel:null,
  sessions:new Map(),confirmClear:false,
  pid:'p1',cfg:{people:[{id:'p1',name:'Me'}],plans:{}},cfgLoaded:false,
  editTarget:-1,pUI:null,focusName:false,resetType:null
};
var backend=null,chain=Promise.resolve(),saveTimer=null,cfgTimer=null,cfgDirty=false;

/* ---------- people and plans ---------- */
function cleanEx(arr){
  return (Array.isArray(arr)?arr:[]).filter(function(x){return x&&typeof x.name==='string';}).map(function(x){
    var lo=Math.round(+x.lo)||0,hi=Math.round(+x.hi)||0;
    if(lo>0&&hi<lo)hi=lo;
    if(!(lo>0)){lo=0;hi=0;}
    return {name:x.name,sets:Math.max(1,Math.min(10,Math.round(+x.sets)||3)),lo:lo||null,hi:hi||null};
  });
}
function normPlan(pl){
  if(!pl||typeof pl!=='object')return null;
  if(Array.isArray(pl.days)){
    var seen={},days=[];
    pl.days.forEach(function(d){
      if(!d||typeof d.name!=='string'||SLOT_IDS.indexOf(d.id)<0||seen[d.id]||days.length>=6)return;
      seen[d.id]=1;
      var dw=(d.dow==null||d.dow==='')?null:Math.round(+d.dow);
      days.push({id:d.id,name:d.name.slice(0,30)||'Day',tag:typeof d.tag==='string'?d.tag.slice(0,40):'',dow:(dw!=null&&dw>=0&&dw<=6)?dw:null,optional:!!d.optional,ex:cleanEx(d.ex)});
    });
    if(!days.length)return null;
    return {split:(pl.split==='custom'||getSplit(pl.split))?pl.split:'custom',days:days};
  }
  /* older saves kept one list per fixed session type */
  if(!Object.keys(DEF).some(function(t){return Array.isArray(pl[t]);}))return null;
  var p=buildSplit('ul');
  p.days.forEach(function(d){if(Array.isArray(pl[d.id]))d.ex=cleanEx(pl[d.id]);});
  return p;
}
function normCfg(c){
  var out={people:[],plans:{}};
  if(c&&Array.isArray(c.people))c.people.forEach(function(p){if(p&&p.id&&typeof p.name==='string')out.people.push({id:String(p.id),name:p.name});});
  if(!out.people.length)out.people.push({id:'p1',name:'Me'});
  /* the weight unit follows the account, so every device agrees */
  out.unit=(c&&(c.unit==='lb'||c.unit==='kg'))?c.unit:UNIT;
  setUnitQuiet(out.unit);
  /* so does the look; an account with no saved look keeps whatever this device already uses */
  out.theme=thNorm(c&&c.theme?c.theme:TH);
  thAdopt(out.theme);
  if(c&&c.plans&&typeof c.plans==='object'){
    /* stored snapshots are read-only, so copy and tidy every plan before the page edits it */
    var src=clone(c.plans);
    Object.keys(src).forEach(function(pid){var pl=normPlan(src[pid]);if(pl)out.plans[pid]=pl;});
  }
  return out;
}
function checkPid(){if(!S.cfg.people.some(function(p){return p.id===S.pid;}))S.pid=S.cfg.people[0].id;}
function activeName(){var p=S.cfg.people.filter(function(x){return x.id===S.pid;})[0];return p?p.name:'';}
function who(){return S.cfg.people.length>1?activeName():'';}
function loadActive(){try{var a=localStorage.getItem('platelog.active');if(a)S.pid=a;}catch(e){}}
function saveActive(){try{localStorage.setItem('platelog.active',S.pid);}catch(e){}}
function getPlan(pid){
  pid=pid||S.pid;
  var p=S.cfg.plans[pid];
  if(!p){p=S.cfg.plans[pid]=buildSplit('ul');p.fresh=true;}
  return p;
}
function dayOf(type){var ds=getPlan().days;for(var i=0;i<ds.length;i++)if(ds[i].id===type)return ds[i];return null;}
function planFor(type){var d=dayOf(type);return d?d.ex:[];}
function validType(t){return SLOT_IDS.indexOf(t)>=0;}
function nameFor(type,s){if(s&&s.label)return s.label;var d=dayOf(type);return d?d.name:(LEGACY_NAME[type]||'Session');}
function tagFor(type){var d=dayOf(type);return d?d.tag:'';}
function coreDays(){return getPlan().days.filter(function(d){return !d.optional;});}
function plannedFor(i){var ds=getPlan().days;for(var k=0;k<ds.length;k++)if(ds[k].dow===i)return ds[k].id;return null;}
function planSig(p){return JSON.stringify(p.days.map(function(d){return [d.id,d.name,d.tag,d.dow,!!d.optional,d.ex.map(function(e){return [e.name,e.sets,e.lo,e.hi];})];}));}
function isPristine(p){
  if(p.split==='custom')return !p.days.some(function(d){return d.ex.length;});
  return planSig(p)===planSig(buildSplit(p.split));
}
/* a session keeps the day name it was logged under, so switching splits never rewrites history */
function stampLabels(){
  var pid=S.pid;
  S.sessions.forEach(function(s,k){
    if(!s||owner(s)!==pid||s.label||!validType(s.type))return;
    var doc=clone(s);doc.label=nameFor(s.type);
    S.sessions.set(k,doc);
    chain=chain.then(function(){return doSave(k,doc);}).catch(function(){});
  });
}
function localMap(all){
  var m=new Map();
  Object.keys(all).forEach(function(k){if(/^s_/.test(k))m.set(k,all[k]);});
  return m;
}

/* ---------- status ---------- */
function setStatus(txt,kind){
  $('#statusTxt').textContent=txt;
  var el=$('#status');el.className='status'+(kind?' '+kind:'');
  var ms=$('#menuStatus');if(ms)ms.textContent=txt;
  var ab=$('#acctBtn');if(ab)ab.setAttribute('data-s',kind||'');
}
function say(txt){var m=$('#msg');m.textContent=txt;setTimeout(function(){if(m.textContent===txt)m.textContent='';},5000);}

