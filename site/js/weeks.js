/* Plate Log: Weeks tab. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- WEEKS ---------- */
function renderWeeks(){
  var el=$('#panel-weeks'),ws=S.weekStart;
  var days=[0,1,2,3,4,5,6].map(function(i){return addDays(ws,i);});
  var all=sessionsList(S.sessions);
  var inWeek=all.filter(function(s){return s.date>=ws&&s.date<=days[6];});
  var pws=addDays(ws,-7);
  var prev=all.filter(function(s){return s.date>=pws&&s.date<ws;});
  var vol=inWeek.reduce(function(a,s){return a+sessVol(s);},0);
  var pvol=prev.reduce(function(a,s){return a+sessVol(s);},0);
  var sets=inWeek.reduce(function(a,s){return a+sessSets(s);},0);
  var delta=pvol>0?Math.round((vol-pvol)/pvol*100):null;
  var td=today();
  var strip=days.map(function(dd,i){
    var ss=inWeek.filter(function(s){return s.date===dd;});
    var inner='';
    if(ss.length){
      inner=ss.map(function(s){return '<button type="button" class="chip" data-act="open" data-date="'+dd+'" data-type="'+s.type+'"><i class="dot" style="background:var(--c-'+s.type+')"></i>'+esc(nameFor(s.type,s))+'</button>';}).join('');
    }else if(plannedFor(i)){
      inner='<button type="button" class="chip plan" data-act="open" data-date="'+dd+'" data-type="'+plannedFor(i)+'">'+esc(nameFor(plannedFor(i)))+'</button>';
    }else inner='<span class="rest">Rest</span>';
    return '<div class="day'+(dd===td?' today':'')+'"><div class="dayhead"><span class="dn">'+DOW[i]+'</span><span class="dd">'+parse(dd).getDate()+'</span></div>'+inner+'</div>';
  }).join('');
  var cards=inWeek.slice().reverse().map(function(s){
    var rows=s.exercises.map(function(e){
      var done=e.sets.filter(isDone);if(!done.length)return '';
      var top=done.slice().sort(function(a,b){return (b.w-a.w)||(b.r-a.r);})[0];
      var best=Math.max.apply(null,done.map(function(x){return e1rm(x.w,x.r);}));
      return '<tr><td>'+esc(e.name)+'</td><td class="n">'+done.length+'</td><td class="n">'+fw(top.w)+' × '+top.r+'</td><td class="n">'+(best?fmtN(Math.round(dv(best)*10)/10):'–')+'</td></tr>';
    }).join('');
    return '<article class="card wsess"><header><i class="dot" style="background:var(--c-'+s.type+');width:14px;height:14px"></i>'+
      '<h3>'+esc(nameFor(s.type,s))+'</h3><span class="meta">'+lbl(s.date,true)+' · '+sessSets(s)+' sets · '+fmtN(Math.round(dv(sessVol(s))))+' '+UNIT+'</span>'+
      '<button type="button" class="btn small open" data-act="open" data-date="'+s.date+'" data-type="'+s.type+'">Open</button></header>'+
      (rows?'<div class="scroll"><table><thead><tr><th>Exercise</th><th class="n">Sets</th><th class="n">Top set</th><th class="n">Est. 1RM</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'')+
      (s.notes&&s.notes.trim()?'<div class="note">'+esc(s.notes)+'</div>':'')+'</article>';
  }).join('');
  el.innerHTML=
    '<div class="nav"><span class="lbl">'+lbl(ws)+' – '+lbl(days[6])+' '+parse(days[6]).getFullYear()+' · Wk '+isoWeek(ws)+(who()?' · '+esc(who()):'')+'</span>'+
      '<button type="button" class="btn small" data-act="wk-prev" aria-label="Previous week">←</button>'+
      '<button type="button" class="btn small" data-act="wk-now">This week</button>'+
      '<button type="button" class="btn small" data-act="wk-next" aria-label="Next week">→</button></div>'+
    '<div class="tiles">'+
      '<div class="card tile"><div class="eyebrow">Sessions</div><div class="v">'+inWeek.length+'</div><div class="d">of '+coreDays().length+' core days</div></div>'+
      '<div class="card tile"><div class="eyebrow">Sets</div><div class="v">'+sets+'</div><div class="d">logged</div></div>'+
      '<div class="card tile"><div class="eyebrow">Volume</div><div class="v">'+fmtN(Math.round(dv(vol)))+' '+UNIT+'</div><div class="d">'+(delta==null?'no earlier week to compare':(delta>=0?'+':'')+delta+'% vs last week')+'</div></div>'+
    '</div>'+
    '<div class="strip">'+strip+'</div>'+
    (cards||'<div class="card empty">Nothing logged this week yet. Tap a dashed session above to start one.</div>');
}
function weeksClick(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var a=b.dataset.act;
  if(a==='wk-prev'){S.weekStart=addDays(S.weekStart,-7);renderWeeks();}
  else if(a==='wk-next'){S.weekStart=addDays(S.weekStart,7);renderWeeks();}
  else if(a==='wk-now'){S.weekStart=mondayOf(today());renderWeeks();}
  else if(a==='open'){openSession(b.dataset.date,b.dataset.type);}
}

