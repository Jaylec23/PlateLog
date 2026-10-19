/* Plate Log: Weeks tab. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- WEEKS ---------- */
function renderWeeks(){
  var el=$('#panel-weeks'),ws=S.weekStart;
  var days=[0,1,2,3,4,5,6].map(function(i){return addDays(ws,i);});
  /* with nothing logged yet, show made-up sessions so the layout is visible; real ones replace them at once */
  var all=sessionsList(S.sessions),demo=!all.length;
  if(demo)all=demoSessions();
  var inWeek=all.filter(function(s){return s.date>=ws&&s.date<=days[6];});
  var pws=addDays(ws,-7);
  var prev=all.filter(function(s){return s.date>=pws&&s.date<ws;});
  var ctx={ws:ws,days:days,all:all,demo:demo,inWeek:inWeek,td:today()};
  ctx.vol=inWeek.reduce(function(a,s){return a+sessVol(s);},0);
  ctx.pvol=prev.reduce(function(a,s){return a+sessVol(s);},0);
  ctx.sets=inWeek.reduce(function(a,s){return a+sessSets(s);},0);
  ctx.delta=ctx.pvol>0?Math.round((ctx.vol-ctx.pvol)/ctx.pvol*100):null;
  el.innerHTML=
    (demo?'<div class="demo">Example preview. These sessions are made up so you can see the layout. Your own sessions replace them as soon as you log one.</div>':'')+
    '<div class="nav"><span class="lbl">'+lbl(ws)+' – '+lbl(days[6])+' '+parse(days[6]).getFullYear()+' · Wk '+isoWeek(ws)+(who()?' · '+esc(who()):'')+'</span>'+
      '<button type="button" class="btn small" data-act="wk-prev" aria-label="Previous week">←</button>'+
      '<button type="button" class="btn small" data-act="wk-now">This week</button>'+
      '<button type="button" class="btn small" data-act="wk-next" aria-label="Next week">→</button></div>'+
    wgBar('weeks')+wgBlocks('weeks',ctx);
}

/* ---------- blocks on this page (framework in widgets.js) ---------- */
wgReg('weeks','w_sessions','tile','Sessions','Sessions logged this week, out of your core days.',true,function(c){
  return wgTile('Sessions',c.inWeek.length,'of '+coreDays().length+' core days');});
wgReg('weeks','w_sets','tile','Sets','Sets logged this week.',true,function(c){return wgTile('Sets',c.sets,'logged');});
wgReg('weeks','w_volume','tile','Volume','Weight × reps added up, compared with last week.',true,function(c){
  return wgTile('Volume',fmtN(Math.round(dv(c.vol)))+' '+UNIT,c.delta==null?'no earlier week to compare':(c.delta>=0?'+':'')+c.delta+'% vs last week');});
wgReg('weeks','w_reps','tile','Total reps','Every rep you completed this week.',false,function(c){return wgTile('Reps',fmtN(totalReps(c.inWeek)),'completed');});
wgReg('weeks','w_days','tile','Training days','How many different days you trained this week.',false,function(c){return wgTile('Training days',distinctDays(c.inWeek),'of 7 days');});
wgReg('weeks','w_avgvol','tile','Average session','Average volume per session this week.',false,function(c){
  return wgTile('Avg session',c.inWeek.length?fmtN(Math.round(dv(c.vol/c.inWeek.length)))+' '+UNIT:'–','volume per session');});
wgReg('weeks','w_prs','tile','Personal records','Exercises where you beat your previous best estimated 1RM this week.',false,function(c){
  var n=prEvents(c.all.filter(function(s){return s.date<=c.days[6];})).filter(function(p){return p.date>=c.ws;});
  var names={};n.forEach(function(p){names[p.name]=1;});
  return wgTile('Records',Object.keys(names).length,Object.keys(names).length?Object.keys(names).slice(0,2).join(', '):'new bests this week');});
wgReg('weeks','w_heavy','tile','Heaviest set','The heaviest single set you logged this week.',false,function(c){
  var best=null;
  c.inWeek.forEach(function(s){s.exercises.forEach(function(e){e.sets.filter(isDone).forEach(function(x){
    if(!best||x.w>best.w||(x.w===best.w&&x.r>best.r))best={w:x.w,r:x.r,n:e.name};});});});
  return best?wgTile('Heaviest set',fw(best.w)+' '+UNIT,best.n+' × '+best.r):wgTile('Heaviest set','–','nothing logged yet');});
wgReg('weeks','w_strip','plain','Week days','The seven days with what you did or have planned. Tap a day to open it.',true,function(c){
  return '<div class="strip">'+c.days.map(function(dd,i){
    var ss=c.inWeek.filter(function(s){return s.date===dd;}),inner='';
    if(ss.length){
      inner=ss.map(function(s){return '<button type="button" class="chip"'+(c.demo?' disabled':' data-act="open" data-date="'+dd+'" data-type="'+s.type+'"')+'><i class="dot" style="background:var(--c-'+s.type+')"></i>'+esc(nameFor(s.type,s))+'</button>';}).join('');
    }else if(plannedFor(i)){
      inner='<button type="button" class="chip plan" data-act="open" data-date="'+dd+'" data-type="'+plannedFor(i)+'">'+esc(nameFor(plannedFor(i)))+'</button>';
    }else inner='<span class="rest">Rest</span>';
    return '<div class="day'+(dd===c.td?' today':'')+'"><div class="dayhead"><span class="dn">'+DOW[i]+'</span><span class="dd">'+parse(dd).getDate()+'</span></div>'+inner+'</div>';
  }).join('')+'</div>';});
wgReg('weeks','w_cards','plain','Session details','A card for each session this week with its exercises and top sets.',true,function(c){
  var cards=c.inWeek.slice().reverse().map(function(s){
    var rows=s.exercises.map(function(e){
      var done=e.sets.filter(isDone);if(!done.length)return '';
      var top=done.slice().sort(function(a,b){return (b.w-a.w)||(b.r-a.r);})[0];
      var best=Math.max.apply(null,done.map(function(x){return e1rm(x.w,x.r);}));
      return '<tr><td>'+esc(e.name)+'</td><td class="n">'+done.length+'</td><td class="n">'+fw(top.w)+' × '+top.r+'</td><td class="n">'+(best?fmtN(Math.round(dv(best)*10)/10):'–')+'</td></tr>';
    }).join('');
    return '<article class="card wsess"><header><i class="dot" style="background:var(--c-'+s.type+');width:14px;height:14px"></i>'+
      '<h3>'+esc(nameFor(s.type,s))+'</h3><span class="meta">'+lbl(s.date,true)+' · '+sessSets(s)+' sets · '+fmtN(Math.round(dv(sessVol(s))))+' '+UNIT+'</span>'+
      (c.demo?'':'<button type="button" class="btn small open" data-act="open" data-date="'+s.date+'" data-type="'+s.type+'">Open</button>')+'</header>'+
      (rows?'<div class="scroll"><table><thead><tr><th>Exercise</th><th class="n">Sets</th><th class="n">Top set</th><th class="n">Est. 1RM</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'')+
      (s.notes&&s.notes.trim()?'<div class="note">'+esc(s.notes)+'</div>':'')+'</article>';
  }).join('');
  return cards||'<div class="card empty">Nothing logged this week yet. Tap a dashed session above to start one.</div>';});
wgReg('weeks','w_split','block','Muscle groups','Volume this week split by muscle group, using the exercise library.',false,function(c){
  var g={};
  c.inWeek.forEach(function(s){s.exercises.forEach(function(e){var v=0;e.sets.forEach(function(x){if(isDone(x))v+=x.w*x.r;});if(v>0){var k=exGroupOf(e.name);g[k]=(g[k]||0)+v;}});});
  var rows=Object.keys(g).sort(function(a,b){return g[b]-g[a];}).map(function(k){return {label:k,val:g[k],text:fmtN(Math.round(dv(g[k])))+' '+UNIT};});
  return '<div class="bhead"><h3 class="sechead">Muscle groups</h3><span class="muted mono" style="font-size:12px">volume this week</span></div>'+
    (rows.length?wgBars(rows):'<div class="muted wgnone">Log a session this week to see how your volume splits.</div>');});
function weeksClick(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var a=b.dataset.act;
  if(a==='wk-prev'){S.weekStart=addDays(S.weekStart,-7);renderWeeks();}
  else if(a==='wk-next'){S.weekStart=addDays(S.weekStart,7);renderWeeks();}
  else if(a==='wk-now'){S.weekStart=mondayOf(today());renderWeeks();}
  else if(a==='open'){openSession(b.dataset.date,b.dataset.type);}
}

