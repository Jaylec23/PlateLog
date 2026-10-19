/* Plate Log: tabs, event wiring, start-up (loads last). Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- tabs / render ---------- */
var TABS=['log','weeks','year','plan','guide'];
function setTab(t){
  S.tab=t;S.wgEdit=null;try{history.replaceState(null,'','#'+t);}catch(e){}
  /* an untouched session picks up any plan edits made since it was built */
  if(t==='log'&&S.draft&&!S.dirty&&!hasContent(S.draft.doc))loadDraft();
  renderActive();
  window.scrollTo(0,0);
}
function renderActive(){
  TABS.forEach(function(t){
    $('#tab-'+t).setAttribute('aria-selected',String(t===S.tab));
    $('#panel-'+t).hidden=t!==S.tab;
  });
  if(S.tab==='log')renderLog();
  else if(S.tab==='weeks')renderWeeks();
  else if(S.tab==='year')renderYear();
  else if(S.tab==='guide')renderGuide();
  else renderPlan();
  syncUnitUI();
}

/* ---------- account menu (top right) and weight unit ---------- */
function syncUnitUI(){
  $$('.unitseg [data-unit]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.unit===UNIT));});
}
function setUnit(u){
  if(u===UNIT)return;
  flush();
  setUnitQuiet(u);
  S.cfg.unit=UNIT;
  /* scheduleCfg clears the "fresh plan" hint; a unit change should not use that up */
  var fresh=Object.keys(S.cfg.plans).filter(function(k){return S.cfg.plans[k].fresh;});
  scheduleCfg();
  fresh.forEach(function(k){if(S.cfg.plans[k])S.cfg.plans[k].fresh=true;});
  renderActive();
}
/* ---------- appearance ---------- */
function setTheme(patch){
  flush();
  S.cfg.theme=thSet(patch);
  /* keep the "fresh plan" hint, as setUnit does */
  var fresh=Object.keys(S.cfg.plans).filter(function(k){return S.cfg.plans[k].fresh;});
  scheduleCfg();
  fresh.forEach(function(k){if(S.cfg.plans[k])S.cfg.plans[k].fresh=true;});
  renderTheme();
  /* charts draw with the current colours, so redraw the visible page */
  renderActive();
}
function themeClick(e){
  if(e.target.id==='themeSheet'||e.target.closest('[data-th-close]')){closeTheme();return;}
  if(e.target.closest('[data-th-reset]')){setTheme(TH_DEF);return;}
  var b=e.target.closest('[data-th]');
  if(b){var p={};p[b.dataset.th]=b.dataset.v;setTheme(p);}
}
function toggleMenu(open){
  var m=$('#acctMenu'),b=$('#acctBtn');
  m.hidden=!open;b.setAttribute('aria-expanded',String(open));
}


/* ---------- wiring ---------- */
function wire(){
$$('.tab').forEach(function(b){b.addEventListener('click',function(){flush();setTab(b.dataset.tab);});});
var pl=$('#panel-log');
pl.addEventListener('input',logInput);
pl.addEventListener('click',logClick);
pl.addEventListener('change',function(e){
  if(e.target.id==='date'&&e.target.value){
    flush();S.date=e.target.value;S.type=defaultTypeFor(S.date);loadDraft();renderLog();
  }
});
pl.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='newex'){e.preventDefault();var b=$('[data-act="addex"]',pl);if(b)b.click();}});
var pp=$('#panel-plan');
pp.addEventListener('input',planInput);
pp.addEventListener('change',planChange);
pp.addEventListener('click',planClick);
pp.addEventListener('focusin',planFocus);
document.addEventListener('click',function(e){if(S.exOpen&&!e.target.closest('.exadd'))closeResults();});
var pe=$('#people');
pe.addEventListener('click',peopleClick);
pe.addEventListener('keydown',function(e){
  if(e.target.id==='pname'){
    if(e.key==='Enter'){e.preventDefault();commitPerson();}
    else if(e.key==='Escape'){S.pUI=null;renderPeople();}
  }
});
$('#panel-weeks').addEventListener('click',function(e){wgClick('weeks',e);weeksClick(e);});
$('#panel-year').addEventListener('click',function(e){wgClick('year',e);yearClick(e);});
$('#panel-year').addEventListener('change',function(e){if(e.target.id==='exsel'){S.exSel=e.target.value;renderYear();}});
$('#exportBtn').addEventListener('click',exportCsv);
$('#install').addEventListener('click',installClick);
$('#panel-guide').addEventListener('click',guideClick);
$('#themeOpen').addEventListener('click',function(){toggleMenu(false);openTheme();});
$('#themeSheet').addEventListener('click',themeClick);
$('#acctBtn').addEventListener('click',function(){toggleMenu($('#acctMenu').hidden);});
$('.unitseg').addEventListener('click',function(e){var b=e.target.closest('[data-unit]');if(b)setUnit(b.dataset.unit);});
document.addEventListener('click',function(e){if(!$('#acctMenu').hidden&&!e.target.closest('.acctwrap'))toggleMenu(false);});
document.addEventListener('keydown',function(e){
  var sh=$('#themeSheet');
  if(sh&&!sh.hidden){
    if(e.key==='Escape'){closeTheme();return;}
    if(e.key==='Tab'){/* keep focus inside the open sheet */
      var f=$$('button',sh).filter(function(x){return x.offsetParent!==null;});
      if(f.length){var a=document.activeElement;
        if(e.shiftKey&&(a===f[0]||!sh.contains(a))){e.preventDefault();f[f.length-1].focus();}
        else if(!e.shiftKey&&(a===f[f.length-1]||!sh.contains(a))){e.preventDefault();f[0].focus();}}
    }
    return;
  }
  if(e.key==='Escape'&&!$('#acctMenu').hidden){toggleMenu(false);$('#acctBtn').focus();}});
document.addEventListener('pointermove',showTip);
document.addEventListener('pointerdown',showTip);
window.addEventListener('scroll',function(){tip.hidden=true;},{passive:true});
window.addEventListener('pagehide',flush);
document.addEventListener('visibilitychange',function(){if(document.hidden)flush();});
var rz=null;
window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){if(S.tab==='year')renderYear();},150);});

}

/* ---------- start ---------- */
function start(){
try{var h0=(location.hash||'').slice(1);if(TABS.indexOf(h0)>=0)S.tab=h0;}catch(e){}
loadActive();
S.type=defaultTypeFor(S.date);
loadDraft();
refreshDatalist();
updateInstallBanner();
renderPeople();
renderActive();
}
wire();
start();
startStorage();
