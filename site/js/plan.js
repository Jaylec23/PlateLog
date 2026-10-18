/* Plate Log: Plan tab: split picker, day cards, exercise search. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- PLAN ---------- */
function dowOpts(sel){
  return '<option value="">Any day</option>'+DOW.map(function(n,i){return '<option value="'+i+'"'+(sel===i?' selected':'')+'>'+n+'</option>';}).join('');
}
function resultsHtml(d){
  var have={};d.ex.forEach(function(e){have[e.name.trim().toLowerCase()]=1;});
  var q=S.exQ.trim().toLowerCase(),words=q.split(/\s+/).filter(Boolean),groups=null;
  CHIPS.forEach(function(c){if(c[0]===S.exGroup)groups=c[1];});
  var hits=[];
  LIB.forEach(function(x,i){
    if(have[x.n.toLowerCase()])return;
    if(groups&&groups.indexOf(x.g)<0)return;
    var hay=(x.n+' '+x.g).toLowerCase();
    if(!words.every(function(w){return hay.indexOf(w)>=0;}))return;
    hits.push({i:i,x:x,r:words.length&&x.n.toLowerCase().indexOf(words[0])===0?0:1});
  });
  hits.sort(function(a,b){return a.r-b.r||a.i-b.i;});
  var out=hits.slice(0,40).map(function(h){
    return '<li><button type="button" class="exopt" data-act="pick" data-i="'+h.i+'"><span>'+esc(h.x.n)+'</span><span class="g">'+esc(h.x.g)+'</span></button></li>';
  });
  var qq=S.exQ.trim();
  if(qq&&!have[qq.toLowerCase()]&&!LIB.some(function(x){return x.n.toLowerCase()===qq.toLowerCase();})){
    out.push('<li><button type="button" class="exopt" data-act="pickcustom"><span>Add “'+esc(qq)+'” as a custom exercise</span></button></li>');
  }
  return out.length?out.join(''):'<li class="none">No matches. Type a name to add your own.</li>';
}
function chipsHtml(){
  return CHIPS.map(function(c){return '<button type="button" class="mgchip" data-act="pchip" data-g="'+c[0]+'" aria-pressed="'+(S.exGroup===c[0])+'">'+c[0]+'</button>';}).join('');
}
function dayCard(d,i,plan){
  var open=!!S.openDays[d.id],custom=plan.split==='custom',n=d.ex.length;
  var head='<button type="button" class="dayhd" data-act="ptoggle" aria-expanded="'+open+'" aria-controls="dbody-'+d.id+'">'+
    '<i class="dot" style="background:var(--c-'+d.id+');width:14px;height:14px"></i>'+
    '<span class="dname"><b>'+esc(d.name)+'</b><span class="dsub">'+(d.tag?esc(d.tag)+' · ':'')+n+' exercise'+(n===1?'':'s')+(d.dow!=null?' · '+DOW[d.dow]:'')+(d.optional?' · optional':'')+'</span></span>'+
    '<span class="chev" aria-hidden="true">▾</span></button>';
  if(!open)return '<article class="card plancard" data-day="'+d.id+'">'+head+'</article>';
  var rows=d.ex.map(function(p,k){
    return '<div class="prow" data-i="'+k+'"><div class="pcol"><input class="field pn" list="exlist" value="'+esc(p.name)+'" aria-label="Exercise name">'+
      '<span class="ptarget" title="Sets and reps">'+esc(fmtTarget(p.sets,p.lo,p.hi))+'</span></div>'+
      '<span class="pbtns"><button type="button" class="iconbtn" data-act="pup" title="Move up" aria-label="Move up">↑</button>'+
      '<button type="button" class="iconbtn" data-act="pdn" title="Move down" aria-label="Move down">↓</button>'+
      '<button type="button" class="iconbtn" data-act="prm" title="Remove exercise" aria-label="Remove exercise">×</button></span></div>';
  }).join('')||'<div class="pnone">No exercises yet. Search below to add some.</div>';
  var edit='<div class="dedit">'+
    (custom?'<label>Day name<input class="field dn" maxlength="30" value="'+esc(d.name)+'"></label>':'')+
    '<label>Usual day<select class="field dw">'+dowOpts(d.dow)+'</select></label></div>';
  var show=S.exOpen===d.id;
  var add='<div class="exadd"><input class="field exq" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search exercises to add" aria-label="Search exercises to add" value="'+(show?esc(S.exQ):'')+'">'+
    '<div class="mgchips" role="group" aria-label="Filter by muscle group">'+chipsHtml()+'</div>'+
    '<ul class="exres"'+(show?'':' hidden')+'>'+(show?resultsHtml(d):'')+'</ul></div>';
  var foot='<div class="pfoot">';
  if(custom){
    if(S.rmDay===d.id)foot+='<span class="confirm">Remove '+esc(d.name)+'? Logged sessions are kept. <button class="btn small primary" type="button" data-act="rmday-yes">Yes, remove</button><button class="btn small" type="button" data-act="rmday-no">Cancel</button></span>';
    else foot+='<button class="btn small ghost" type="button" data-act="dup" '+(i===0?'disabled':'')+'>Move day up</button><button class="btn small ghost" type="button" data-act="ddn" '+(i===plan.days.length-1?'disabled':'')+'>Move day down</button><button class="btn small ghost" type="button" data-act="rmday">Remove day</button>';
  }else{
    if(S.resetType===d.id)foot+='<span class="confirm">Reset '+esc(d.name)+' to the original exercises? <button class="btn small primary" type="button" data-act="preset-yes">Yes, reset</button><button class="btn small" type="button" data-act="preset-no">Cancel</button></span>';
    else foot+='<button class="btn small ghost" type="button" data-act="preset">Reset this day</button>';
  }
  foot+='</div>';
  return '<article class="card plancard" data-day="'+d.id+'">'+head+'<div class="daybody" id="dbody-'+d.id+'">'+edit+rows+add+foot+'</div></article>';
}
function renderPlan(){
  var el=$('#panel-plan'),plan=getPlan();
  var sp=getSplit(plan.split);
  var opts=SPLITS.map(function(x){return '<option value="'+x.id+'"'+(plan.split===x.id?' selected':'')+'>'+esc(x.name)+' · '+esc(x.meta)+'</option>';}).join('')+
    '<option value="custom"'+(plan.split==='custom'?' selected':'')+'>Custom · build your own</option>';
  var ask='';
  if(S.splitAsk){
    var ns=getSplit(S.splitAsk);
    ask='<div class="confirm">Switch to '+esc(ns?ns.name:'')+'? This replaces your current days and exercises. Logged sessions are kept. <button class="btn small primary" type="button" data-act="split-yes">Yes, switch</button><button class="btn small" type="button" data-act="split-no">Cancel</button></div>';
  }
  var sched=plan.days.filter(function(d){return d.dow!=null;}).sort(function(a,b){return a.dow-b.dow;}).map(function(d){return DOW[d.dow]+' '+esc(d.name);}).join(' · ');
  var cards=plan.days.map(function(d,i){return dayCard(d,i,plan);}).join('');
  var addDay=plan.split==='custom'?'<button class="btn" type="button" data-act="addday"'+(plan.days.length>=6?' disabled':'')+'>+ Add a day</button>'+(plan.days.length>=6?' <span class="muted" style="font-size:13px">Six days is the most.</span>':''):'';
  el.innerHTML=
    '<div class="nav"><span class="lbl">The split'+(who()?' · '+esc(who()):'')+'</span></div>'+
    '<div class="card splitpick"><label class="eyebrow" for="splitsel">Training split</label>'+
      '<select class="field" id="splitsel">'+opts+'</select>'+
      '<p class="sblurb">'+(sp?esc(sp.blurb):'Your own split. Rename days, add or remove them, and choose the exercises for each.')+'</p>'+ask+'</div>'+
    (sched?'<p class="muted" style="margin:0 0 12px;font-size:14px">'+sched+'</p>':'')+
    '<div class="daystack">'+cards+'</div>'+addDay+
    '<p class="muted" style="margin:14px 0;font-size:14px">Sets and rep targets come with each exercise. You can still change them for a single session on the Log tab. Changes here apply to sessions you start from now on. Sessions already logged stay as they were.</p>'+
    '<div class="eyebrow" style="margin:6px 0">How to progress</div>'+
    '<ul class="card rules"><li>When every set reaches the top of the rep range, add weight next time: about 2.5 kg on upper-body lifts, 5 kg on lower-body lifts. The Log tab flags it for you.</li>'+
    '<li>Keep the main lifts one to two reps short of failure. Accessories can go closer.</li>'+
    '<li>Take an easier week every 6 to 8 weeks, or sooner if lifts stall and you feel beaten up.</li></ul>'+
    '<div class="eyebrow" style="margin:6px 0">Easing back in</div>'+
    '<ul class="card rules"><li>Weeks 1 to 3: start around 60 to 70% of your old working weights and stop two to three reps short of failure.</li>'+
    '<li>Begin with two sets on most exercises and build to the full sets by week 3 or 4.</li>'+
    '<li>Hold off on testing old maxes.</li></ul>';
}
function planDay(el){var c=el.closest('.plancard');return c?dayOf(c.dataset.day):null;}
function refreshResults(card){
  var d=dayOf(card.dataset.day),box=$('.exres',card);if(!d||!box)return;
  var show=S.exOpen===d.id;
  box.hidden=!show;box.innerHTML=show?resultsHtml(d):'';
  $$('.mgchip',card).forEach(function(c){c.setAttribute('aria-pressed',String(c.dataset.g===S.exGroup));});
}
function closeResults(){
  if(!S.exOpen)return;
  S.exOpen=null;S.exQ='';
  $$('#panel-plan .exres').forEach(function(b){b.hidden=true;b.innerHTML='';});
  $$('#panel-plan .exq').forEach(function(i){i.value='';});
}
function addToDay(d,name,k){
  var def=k==='c'?{sets:3,lo:6,hi:10}:{sets:3,lo:10,hi:15};
  d.ex.push({name:name,sets:def.sets,lo:def.lo,hi:def.hi});
  scheduleCfg();
}
function planInput(e){
  var t=e.target,card=t.closest('.plancard');if(!card)return;
  var d=dayOf(card.dataset.day);if(!d)return;
  if(t.classList.contains('pn')){var row=t.closest('.prow');if(d.ex[+row.dataset.i]){d.ex[+row.dataset.i].name=t.value;scheduleCfg();}}
  else if(t.classList.contains('dn')){d.name=t.value;var b=$('.dname b',card);if(b)b.textContent=t.value||'Day';scheduleCfg();}
  else if(t.classList.contains('exq')){S.exQ=t.value;S.exOpen=d.id;refreshResults(card);}
}
function planFocus(e){
  var t=e.target;
  if(t.classList&&t.classList.contains('exq')){
    var card=t.closest('.plancard'),d=dayOf(card.dataset.day);
    if(S.exOpen!==d.id){closeResults();S.exOpen=d.id;S.exQ=t.value;}
    refreshResults(card);
  }
}
function applySplit(id){
  flush();stampLabels();
  S.cfg.plans[S.pid]=buildSplit(id);
  S.openDays={};S.exOpen=null;S.exQ='';S.splitAsk=null;S.resetType=null;S.rmDay=null;
  var pick=defaultTypeFor(S.date);
  if(S.sessions.get(keyOf(S.date,pick))){
    var free=getPlan().days.filter(function(d){return !S.sessions.get(keyOf(S.date,d.id));})[0];
    if(free)pick=free.id;
  }
  S.type=pick;loadDraft();
  scheduleCfg();renderPlan();
}
function planChange(e){
  var t=e.target;
  if(t.id==='splitsel'){
    var val=t.value,plan=getPlan();
    if(val===plan.split)return;
    if(val==='custom'){plan.split='custom';S.splitAsk=null;scheduleCfg();renderPlan();return;}
    if(isPristine(plan)){applySplit(val);return;}
    S.splitAsk=val;renderPlan();return;
  }
  var card=t.closest('.plancard');if(!card)return;
  var d=dayOf(card.dataset.day);if(!d)return;
  if(t.classList.contains('dw')){d.dow=t.value===''?null:+t.value;scheduleCfg();renderPlan();}
  else if(t.classList.contains('dn')){if(!t.value.trim())d.name='Day';scheduleCfg();renderPlan();}
}
function planClick(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var act=b.dataset.act,plan=getPlan(),card=b.closest('.plancard'),d=card?dayOf(card.dataset.day):null;
  var row=b.closest('.prow'),i=row?+row.dataset.i:-1;
  if(act==='ptoggle'&&d){
    if(S.openDays[d.id])delete S.openDays[d.id];else S.openDays[d.id]=true;
    if(S.exOpen===d.id)closeResults();
    renderPlan();return;
  }
  if(act==='split-no'){S.splitAsk=null;renderPlan();return;}
  if(act==='split-yes'){applySplit(S.splitAsk);return;}
  if(act==='addday'){
    var used={};plan.days.forEach(function(x){used[x.id]=1;});
    var id=SLOT_IDS.filter(function(x){return !used[x];})[0];if(!id)return;
    plan.days.push({id:id,name:'Day '+(plan.days.length+1),tag:'',dow:null,optional:false,ex:[]});
    S.openDays[id]=true;scheduleCfg();renderPlan();return;
  }
  if(!d)return;
  var arr=d.ex;
  if(act==='prm'){arr.splice(i,1);scheduleCfg();renderPlan();}
  else if(act==='pup'&&i>0){var x=arr[i];arr[i]=arr[i-1];arr[i-1]=x;scheduleCfg();renderPlan();}
  else if(act==='pdn'&&i>=0&&i<arr.length-1){var y=arr[i];arr[i]=arr[i+1];arr[i+1]=y;scheduleCfg();renderPlan();}
  else if(act==='pchip'){S.exGroup=(S.exGroup===b.dataset.g&&b.dataset.g!=='All')?'All':b.dataset.g;if(S.exOpen!==d.id){closeResults();S.exOpen=d.id;S.exQ=$('.exq',card).value;}refreshResults(card);}
  else if(act==='pick'){var it=LIB[+b.dataset.i];if(it){addToDay(d,it.n,it.k);S.exQ='';S.exOpen=d.id;renderPlan();}}
  else if(act==='pickcustom'){var nm=S.exQ.trim().slice(0,60);if(nm){addToDay(d,nm,'i');S.exQ='';S.exOpen=d.id;renderPlan();}}
  else if(act==='preset'){S.resetType=d.id;renderPlan();}
  else if(act==='preset-no'){S.resetType=null;renderPlan();}
  else if(act==='preset-yes'){var tpl=buildSplit(plan.split);tpl.days.forEach(function(td){if(td.id===d.id){d.ex=td.ex;d.name=td.name;d.tag=td.tag;d.dow=td.dow;}});S.resetType=null;scheduleCfg();renderPlan();}
  else if(act==='rmday'){S.rmDay=d.id;renderPlan();}
  else if(act==='rmday-no'){S.rmDay=null;renderPlan();}
  else if(act==='rmday-yes'){
    if(plan.days.length>1){flush();stampLabels();plan.days=plan.days.filter(function(x){return x.id!==d.id;});delete S.openDays[d.id];S.rmDay=null;fixType();scheduleCfg();renderPlan();}
  }
  else if(act==='dup'||act==='ddn'){
    var k=plan.days.indexOf(d),k2=act==='dup'?k-1:k+1;
    if(k2>=0&&k2<plan.days.length){var tmp=plan.days[k];plan.days[k]=plan.days[k2];plan.days[k2]=tmp;scheduleCfg();renderPlan();}
  }
}

