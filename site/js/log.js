/* Plate Log: Log tab: drafts, session picker, set entry. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- drafts ---------- */
function lastSession(type,date){
  var best=null;
  S.sessions.forEach(function(s){
    if(s&&owner(s)===S.pid&&s.type===type&&nameFor(s.type,s)===nameFor(type)&&s.date<date&&Array.isArray(s.exercises)&&hasContent(s)){if(!best||s.date>best.date)best=s;}
  });
  return best;
}
function nextType(){
  var cyc=coreDays().map(function(d){return d.id;});
  if(!cyc.length)return getPlan().days[0].id;
  var list=sessionsList(S.sessions),lastMain=null;
  for(var i=list.length-1;i>=0;i--){if(cyc.indexOf(list[i].type)>=0&&nameFor(list[i].type,list[i])===nameFor(list[i].type)){lastMain=list[i].type;break;}}
  if(!lastMain)return cyc[0];
  return cyc[(cyc.indexOf(lastMain)+1)%cyc.length];
}
function defaultTypeFor(date){return plannedFor(dow(date))||nextType();}
function fixType(){
  if(S.dirty||dayOf(S.type)||S.sessions.get(keyOf(S.date,S.type)))return;
  var t=defaultTypeFor(S.date);
  if(t!==S.type&&dayOf(t)){S.type=t;loadDraft();}
}
function blankFrom(type,date){
  var src=planFor(type).map(function(p){return {name:p.name,target:fmtTarget(p.sets,p.lo,p.hi),n:p.sets};});
  return {date:date,type:type,notes:'',exercises:src.map(function(e){
    var sets=[];for(var i=0;i<e.n;i++)sets.push({w:null,r:null});
    return {name:e.name,target:e.target,sets:sets};
  })};
}
function loadDraft(){
  var key=keyOf(S.date,S.type);
  var ex=S.sessions.get(key);
  var doc=ex&&Array.isArray(ex.exercises)?clone(ex):blankFrom(S.type,S.date);
  doc.date=S.date;doc.type=S.type;if(doc.notes==null)doc.notes='';
  S.draft={key:key,pid:S.pid,doc:doc};S.dirty=false;S.confirmClear=false;S.editTarget=-1;
}
function findEx(sess,name){
  if(!sess)return null;var k=name.trim().toLowerCase();
  for(var i=0;i<sess.exercises.length;i++){if(sess.exercises[i].name.trim().toLowerCase()===k)return sess.exercises[i];}
  return null;
}
function refreshDatalist(){
  var names={};
  getPlan().days.forEach(function(d){d.ex.forEach(function(p){if(p.name)names[p.name]=1;});});
  LIB.forEach(function(x){names[x.n]=1;});
  S.sessions.forEach(function(s){if(s&&s.exercises)s.exercises.forEach(function(e){if(e.name)names[e.name]=1;});});
  $('#exlist').innerHTML=Object.keys(names).sort().map(function(n){return '<option value="'+esc(n)+'"></option>';}).join('');
}

/* ---------- LOG ---------- */
function lastLine(name,target,last){
  if(!last)return '';
  var e=findEx(last,name);
  if(!e)return '';
  var parts=e.sets.filter(isDone).map(function(s){return fw(s.w)+'×'+s.r;});
  if(!parts.length)return '';
  var tg=parseTarget(target),add=false;
  if(tg.hi&&e.sets.length>=tg.sets){
    var firstN=e.sets.slice(0,tg.sets);
    add=firstN.every(function(s){return s.w>0&&s.r>=tg.hi;});
  }
  return 'Last '+lbl(last.date)+': '+esc(parts.join(' · '))+(add?'<b class="add">Top of range. Add weight</b>':'');
}
function targetEditor(e,i){
  var tg=parseTarget(e.target);
  return '<div class="tedit">'+
    '<label>Sets<input class="field t-sets" id="ts-'+i+'" type="number" min="1" max="10" inputmode="numeric" value="'+tg.sets+'"></label>'+
    '<div class="reps"><label>Min reps<input class="field t-lo" id="tl-'+i+'" type="number" min="1" inputmode="numeric" value="'+(tg.lo||'')+'"></label>'+
    '<span class="dash">–</span>'+
    '<label>Max reps<input class="field t-hi" id="th-'+i+'" type="number" min="1" inputmode="numeric" value="'+(tg.hi||'')+'"></label></div>'+
    '<button type="button" class="btn small primary" data-act="tapply">Apply</button>'+
    '<button type="button" class="btn small" data-act="tplan">Apply and save to plan</button>'+
    '<button type="button" class="btn small ghost" data-act="tcancel">Cancel</button></div>';
}
function renderLog(){
  var el=$('#panel-log');
  if(!S.draft)loadDraft();
  fixType();
  var d=S.draft.doc,t={name:nameFor(S.type,S.draft.doc),tag:(nameFor(S.type,S.draft.doc)===nameFor(S.type)?tagFor(S.type):'')},last=lastSession(S.type,S.date);
  var loggedTypes={};
  S.sessions.forEach(function(s){if(s&&owner(s)===S.pid&&s.date===S.date&&hasContent(s)&&nameFor(s.type,s)===nameFor(s.type))loggedTypes[s.type]=1;});
  var pdays=getPlan().days.slice();
  if(!pdays.some(function(x){return x.id===S.type;}))pdays.push({id:S.type,name:t.name,tag:''});
  var seg=pdays.map(function(ty){
    return '<button type="button" id="type-'+ty.id+'" data-act="type" data-type="'+ty.id+'" aria-pressed="'+(ty.id===S.type)+'">'+
      '<b><i class="dot" style="background:var(--c-'+ty.id+')"></i>'+esc(ty.name)+(loggedTypes[ty.id]?'<span class="logged">✓</span>':'')+'</b>'+
      '<span class="t">'+esc(ty.tag||'\u00a0')+'</span></button>';
  }).join('');
  var hint=(getPlan().fresh&&!sessionsList(S.sessions).length)
    ?'<div class="hint">You are on the '+esc((getSplit(getPlan().split)||{name:'custom'}).name)+' split. <button type="button" class="btn small" data-act="gosplit">Choose a different split</button></div>':'';
  var exs=d.exercises.map(function(e,i){
    var lastEx=findEx(last,e.name);
    var sets=e.sets.map(function(s,j){
      var ph=lastEx&&lastEx.sets[j]?lastEx.sets[j]:{};
      return '<div class="set" data-j="'+j+'"><span class="idx">'+(j+1)+'</span>'+
        '<input class="w" id="w-'+i+'-'+j+'" type="number" inputmode="decimal" step="0.5" min="0" placeholder="'+(ph.w!=null?esc(inW(ph.w)):'')+'" value="'+(s.w!=null?esc(inW(s.w)):'')+'" aria-label="'+esc(e.name)+' set '+(j+1)+' weight in '+(UNIT==='lb'?'pounds':'kilograms')+'">'+
        '<span class="x">×</span>'+
        '<input class="r" id="r-'+i+'-'+j+'" type="number" inputmode="numeric" step="1" min="0" placeholder="'+(ph.r!=null?esc(ph.r):'')+'" value="'+(s.r!=null?esc(s.r):'')+'" aria-label="'+esc(e.name)+' set '+(j+1)+' reps">'+
        '<span class="e"></span></div>';
    }).join('');
    return '<section class="card ex" data-i="'+i+'">'+
      '<div class="exhead"><input class="exname" id="name-'+i+'" list="exlist" value="'+esc(e.name)+'" aria-label="Exercise name">'+
      '<button type="button" class="target" data-act="edittarget" title="Change sets and rep range" aria-label="Change sets and rep range for '+esc(e.name)+'">'+esc(e.target||'—')+' ✎</button>'+
      '<button type="button" class="iconbtn" data-act="rmex" title="Remove exercise" aria-label="Remove '+esc(e.name)+'">×</button></div>'+
      (S.editTarget===i?targetEditor(e,i):'')+
      '<div class="last">'+lastLine(e.name,e.target,last)+'</div>'+
      '<div class="sethead"><span></span><span>'+UNIT+'</span><span></span><span>reps</span><span>est. 1RM</span></div>'+
      sets+
      '<div class="exfoot"><button type="button" class="btn small" data-act="addset">+ Set</button>'+
      '<button type="button" class="btn small ghost" data-act="rmset">− Set</button><span class="exbest"></span></div>'+
      '</section>';
  }).join('');
  var clearUI=S.confirmClear
    ?'<span class="confirm">Clear all numbers and notes for this session? <button class="btn small primary" type="button" data-act="clear-yes">Yes, clear</button><button class="btn small" type="button" data-act="clear-no">Cancel</button></span>'
    :'<button class="btn small ghost" type="button" data-act="clear">Clear this session</button>';
  el.innerHTML=
    hint+'<div class="picker">'+
      '<div class="datebar">'+
        '<button type="button" class="btn small" data-act="day-prev" aria-label="Previous day">←</button>'+
        '<input class="field" id="date" type="date" value="'+S.date+'" aria-label="Session date">'+
        '<button type="button" class="btn small" data-act="day-next" aria-label="Next day">→</button>'+
        '<button type="button" class="btn small" data-act="today">Today</button>'+
        '<span class="muted mono" style="font-size:12px">Week '+isoWeek(S.date)+'</span>'+
      '</div>'+
      '<div class="seg" role="group" aria-label="Session type" style="--n:'+Math.min(6,pdays.length)+'">'+seg+'</div>'+
    '</div>'+
    '<div class="sesshead"><div><div class="eyebrow">'+lbl(S.date,true)+' '+parse(S.date).getFullYear()+(who()?' · '+esc(who()):'')+'</div>'+
      '<h2 class="sechead"><i class="dot" style="background:var(--c-'+S.type+');width:14px;height:14px"></i>'+esc(t.name)+(t.tag?' · '+esc(t.tag):'')+'</h2></div>'+
      (last?'<button type="button" class="btn small" data-act="copylast">Fill in last '+esc(t.name)+' ('+lbl(last.date)+')</button>':'<span class="muted" style="font-size:13px">No earlier '+esc(t.name)+' session yet</span>')+
    '</div>'+
    exs+
    '<div class="addex"><input class="field" id="newex" list="exlist" placeholder="Add an exercise (for example Assisted pull-up)" aria-label="New exercise name"><button type="button" class="btn" data-act="addex">Add</button><label class="addlbl"><input type="checkbox" id="addplan"> Also add to plan</label></div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Notes for this session</div>'+
    '<textarea class="field notes" id="notes" placeholder="How did it feel? Form cues, niggles, what to change next time.">'+esc(d.notes)+'</textarea>'+
    '<div class="sumbar" id="sumbar"></div>'+
    '<div>'+clearUI+'</div>';
  updateDerived();
}
function updateDerived(){
  var d=S.draft.doc;
  $$('#panel-log .ex').forEach(function(exEl){
    var e=d.exercises[+exEl.dataset.i];if(!e)return;
    var best=0;
    $$('.set',exEl).forEach(function(sEl){
      var s=e.sets[+sEl.dataset.j];var v=s?e1rm(s.w,s.r):0;
      $('.e',sEl).textContent=v?fmtN(Math.round(dv(v)*10)/10):'';
      if(v>best)best=v;
    });
    $('.exbest',exEl).textContent=best?'Best est. 1RM '+fmtN(Math.round(dv(best)*10)/10)+' '+UNIT:'';
  });
  var vol=sessVol(d),n=sessSets(d);
  var sb=$('#sumbar');
  if(sb)sb.innerHTML='<span><b>'+fmtN(Math.round(dv(vol)))+'</b> '+UNIT+' volume</span><span><b>'+n+'</b> sets logged</span>';
}
function setNum(v){if(v===''||v==null)return null;var n=Number(v);return isNaN(n)?null:n;}

function logInput(e){
  var t=e.target,d=S.draft.doc;
  if(t.matches('.w,.r')){
    var exEl=t.closest('.ex'),setEl=t.closest('.set');
    var s=d.exercises[+exEl.dataset.i].sets[+setEl.dataset.j];
    var nv=setNum(t.value);
    if(t.classList.contains('w'))s.w=outW(nv);else s.r=nv;
    updateDerived();scheduleSave();
  }else if(t.matches('.exname')){
    d.exercises[+t.closest('.ex').dataset.i].name=t.value;scheduleSave();
  }else if(t.id==='notes'){
    d.notes=t.value;scheduleSave();
  }
}
function openSession(date,type){
  flush();S.date=date;S.type=type;loadDraft();
  setTab('log');
}
function logClick(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var act=b.dataset.act,d=S.draft.doc;
  var i=b.closest('.ex')?+b.closest('.ex').dataset.i:-1;
  if(act==='gosplit'){setTab('plan');return;}
  if(act==='type'){flush();S.type=b.dataset.type;loadDraft();renderLog();return;}
  if(act==='day-prev'||act==='day-next'||act==='today'){
    flush();S.date=act==='today'?today():addDays(S.date,act==='day-prev'?-1:1);
    S.type=defaultTypeFor(S.date);loadDraft();renderLog();return;
  }
  if(act==='addset'){d.exercises[i].sets.push({w:null,r:null});scheduleSave();renderLog();return;}
  if(act==='rmset'){if(d.exercises[i].sets.length>1){d.exercises[i].sets.pop();scheduleSave();renderLog();}return;}
  if(act==='rmex'){d.exercises.splice(i,1);scheduleSave();renderLog();return;}
  if(act==='edittarget'){
    S.editTarget=S.editTarget===i?-1:i;renderLog();
    var tf=$('#ts-'+i);if(tf)tf.focus();return;
  }
  if(act==='tcancel'){S.editTarget=-1;renderLog();return;}
  if(act==='tapply'||act==='tplan'){
    var exEl=b.closest('.ex'),ex=d.exercises[i];if(!ex)return;
    var sets=Math.max(1,Math.min(10,Math.round(+$('.t-sets',exEl).value)||1));
    var lo=Math.round(+$('.t-lo',exEl).value)||0,hi=Math.round(+$('.t-hi',exEl).value)||0;
    if(!(lo>0)){lo=0;hi=0;}else if(hi<lo)hi=lo;
    ex.target=fmtTarget(sets,lo,hi);
    while(ex.sets.length<sets)ex.sets.push({w:null,r:null});
    while(ex.sets.length>sets){var ls=ex.sets[ex.sets.length-1];if(ls.w!=null||ls.r!=null)break;ex.sets.pop();}
    if(act==='tplan'){
      var pd=dayOf(S.type);
      if(pd){
        var arr=pd.ex,key=ex.name.trim().toLowerCase(),found=null;
        arr.forEach(function(p){if(p.name.trim().toLowerCase()===key)found=p;});
        if(found){found.sets=sets;found.lo=lo||null;found.hi=hi||null;}
        else arr.push({name:ex.name.trim(),sets:sets,lo:lo||null,hi:hi||null});
        scheduleCfg();
      }
    }
    S.editTarget=-1;scheduleSave();renderLog();return;
  }
  if(act==='addex'){
    var inp=$('#newex'),name=inp.value.trim();if(!name)return;
    var chk=$('#addplan'),toPlan=!!(chk&&chk.checked);
    d.exercises.push({name:name,target:toPlan?fmtTarget(3,8,12):'3 sets',sets:[{w:null,r:null},{w:null,r:null},{w:null,r:null}]});
    var pdd=dayOf(S.type);
    if(toPlan&&pdd){pdd.ex.push({name:name,sets:3,lo:8,hi:12});scheduleCfg();}
    scheduleSave();renderLog();return;
  }
  if(act==='copylast'){
    var last=lastSession(S.type,S.date);if(!last)return;
    d.exercises.forEach(function(e){
      var le=findEx(last,e.name);if(!le)return;
      e.sets.forEach(function(s,j){var ls=le.sets[j];if(ls){if(s.w==null)s.w=ls.w;if(s.r==null)s.r=ls.r;}});
    });
    scheduleSave();renderLog();return;
  }
  if(act==='clear'){S.confirmClear=true;renderLog();return;}
  if(act==='clear-no'){S.confirmClear=false;renderLog();return;}
  if(act==='clear-yes'){
    S.draft.doc=blankFrom(S.type,S.date);S.confirmClear=false;
    scheduleSave();renderLog();return;
  }
}

