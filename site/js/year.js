/* Plate Log: Year tab: charts, records, tooltip. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- YEAR ---------- */
function demoSessions(){
  var out=[],mon=mondayOf(today()),td=today();
  var base={'Bench press':62.5,'Barbell row':55,'Overhead press':37.5,'Lat pulldown':50,'Squat':75,'Romanian deadlift':80,'Leg press':140,'Incline press':50,'Hip thrust':90};
  for(var w=11;w>=0;w--){
    [['upperA',0],['lowerA',1],['upperB',3],['lowerB',4]].forEach(function(p){
      var date=addDays(mon,-7*w+p[1]);
      if(date>td||((w*7+p[1])%11)===5)return;
      var exs=PLAN[p[0]].map(function(pl){
        var tg=parseTarget(pl[1]);
        var wt=Math.round(((base[pl[0]]||25)+(11-w)*1.25)/2.5)*2.5;
        var sets=[];for(var i=0;i<tg.sets;i++)sets.push({w:wt,r:Math.max(tg.lo||5,(tg.hi||6)-(i>1?1:0))});
        return {name:pl[0],target:pl[1],sets:sets};
      });
      out.push({date:date,type:p[0],label:LEGACY_NAME[p[0]],exercises:exs,notes:''});
    });
  }
  return out;
}
function exStats(list){
  var map={};
  list.forEach(function(s){
    s.exercises.forEach(function(e){
      var done=e.sets.filter(isDone);if(!done.length)return;
      var k=e.name.trim().toLowerCase();
      var best=0,top=done[0];
      done.forEach(function(x){var v=e1rm(x.w,x.r);if(v>best)best=v;if(x.w>top.w||(x.w===top.w&&x.r>top.r))top=x;});
      if(!map[k])map[k]={name:e.name.trim(),pts:[]};
      map[k].pts.push({date:s.date,e1:best,w:top.w,r:top.r});
    });
  });
  return map;
}
function niceMax(v){
  var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)),n=v/p;
  var step=n<=1?1:n<=2?2:n<=5?5:10;return step*p;
}
function axisFmt(v){return v>=1000?(Math.round(v/100)/10)+'k':String(Math.round(v*10)/10);}

function heatSvg(list,year){
  var start=mondayOf(year+'-01-01'),end=year+'-12-31';
  var nDays=Math.round((parse(end)-parse(start))/86400000)+1,nW=Math.ceil(nDays/7);
  var cell=12,gap=3,left=30,top=18,W=left+nW*(cell+gap),H=top+7*(cell+gap);
  var by={};list.forEach(function(s){(by[s.date]=by[s.date]||[]).push(s);});
  var td=today(),out='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Training days in '+year+', coloured by session type">';
  var lastM=-1;
  for(var w=0;w<nW;w++){
    var mon=addDays(start,w*7),md=parse(mon);
    if(md.getFullYear()===year&&md.getMonth()!==lastM&&md.getDate()<=7){out+='<text x="'+(left+w*(cell+gap))+'" y="11">'+MON[md.getMonth()]+'</text>';lastM=md.getMonth();}
    for(var d=0;d<7;d++){
      var date=addDays(start,w*7+d);if(date.slice(0,4)!==String(year))continue;
      var ss=by[date],x=left+w*(cell+gap),y=top+d*(cell+gap);
      var fill=ss?col(ss[0].type):'var(--line2)';
      var tip=lbl(date,true)+(ss?'\n'+ss.map(function(s){return nameFor(s.type,s);}).join(' + ')+'\n'+fmtN(Math.round(dv(ss.reduce(function(a,s){return a+sessVol(s);},0))))+' '+UNIT:'');
      out+='<rect x="'+x+'" y="'+y+'" width="'+cell+'" height="'+cell+'" rx="2" style="fill:'+fill+'"'+(date===td?' stroke="currentColor" stroke-width="1.5"':'')+' data-tip="'+ta(tip)+'"/>';
    }
  }
  [0,2,4].forEach(function(d){out+='<text x="0" y="'+(top+d*(cell+gap)+10)+'">'+DOW[d]+'</text>';});
  return out+'</svg>';
}
function volSvg(list,year,W){
  var start=mondayOf(year+'-01-01'),nW=53,weeks=[];
  for(var i=0;i<nW;i++){var ws=addDays(start,i*7);weeks.push({start:ws,vol:{},lab:{},total:0,n:0});}
  list.forEach(function(s){
    var idx=Math.floor(Math.round((parse(mondayOf(s.date))-parse(start))/86400000)/7);
    if(idx<0||idx>=nW)return;var v=dv(sessVol(s));
    weeks[idx].vol[s.type]=(weeks[idx].vol[s.type]||0)+v;weeks[idx].lab[s.type]=nameFor(s.type,s);weeks[idx].total+=v;weeks[idx].n++;
  });
  var last=nW;while(last>1&&weeks[last-1].start>today()&&weeks[last-1].total===0)last--;
  weeks=weeks.slice(0,Math.max(last,1));
  var H=210,m={l:40,r:6,t:10,b:22},pw=W-m.l-m.r,ph=H-m.t-m.b;
  var max=niceMax(Math.max(1,Math.max.apply(null,weeks.map(function(w){return w.total;}))));
  var bw=pw/Math.max(weeks.length,1),gap=Math.min(3,bw*0.25);
  var out='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Weekly volume lifted in '+year+', stacked by session type">';
  for(var k=0;k<=4;k++){
    var v=max*k/4,y=m.t+ph-ph*k/4;
    out+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" style="stroke:var(--line2)" stroke-width="1"/>';
    out+='<text x="'+(m.l-6)+'" y="'+(y+4)+'" text-anchor="end">'+axisFmt(v)+'</text>';
  }
  var lastM=-1;
  weeks.forEach(function(w,i){
    var x=m.l+i*bw,cum=0;
    var md=parse(w.start);
    if(md.getFullYear()===year&&md.getMonth()!==lastM&&md.getDate()<=7){out+='<text x="'+x+'" y="'+(H-6)+'">'+MON[md.getMonth()]+'</text>';lastM=md.getMonth();}
    STACK_ORDER.forEach(function(type){
      var v=w.vol[type];if(!v)return;
      var h=v/max*ph;
      out+='<rect x="'+(x+gap/2)+'" y="'+(m.t+ph-cum-h)+'" width="'+Math.max(2,bw-gap)+'" height="'+h+'" style="fill:'+col(type)+';stroke:var(--surface)" stroke-width="2" paint-order="stroke"/>';
      cum+=h;
    });
    if(w.total>0){
      var tip='Week of '+lbl(w.start)+'\n'+STACK_ORDER.filter(function(t){return w.vol[t];}).map(function(t){return (w.lab[t]||nameFor(t))+': '+fmtN(Math.round(w.vol[t]))+' '+UNIT;}).join('\n')+'\nTotal: '+fmtN(Math.round(w.total))+' '+UNIT;
      out+='<rect x="'+x+'" y="'+m.t+'" width="'+bw+'" height="'+ph+'" fill="transparent" data-tip="'+ta(tip)+'"/>';
    }
  });
  return {svg:out+'</svg>',weeks:weeks};
}
function lineSvg(pts,W){
  var H=220,m={l:44,r:56,t:14,b:26},pw=W-m.l-m.r,ph=H-m.t-m.b;
  var t0=parse(pts[0].date).getTime(),t1=parse(pts[pts.length-1].date).getTime();
  if(t1-t0<28*86400000)t1=t0+28*86400000;
  var vals=pts.map(function(p){return p.e1;});
  var lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals);
  var span=Math.max(hi-lo,10);
  var yMin=Math.floor((lo-span*0.25)/5)*5,yMax=Math.ceil((hi+span*0.15)/5)*5;if(yMin<0)yMin=0;
  function X(t){return m.l+(t-t0)/(t1-t0)*pw;}
  function Y(v){return m.t+ph-(v-yMin)/(yMax-yMin)*ph;}
  var out='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Estimated one rep max over time">';
  for(var k=0;k<=4;k++){
    var v=yMin+(yMax-yMin)*k/4,y=Y(v);
    out+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" style="stroke:var(--line2)"/>';
    out+='<text x="'+(m.l-6)+'" y="'+(y+4)+'" text-anchor="end">'+fmtN(Math.round(v*10)/10)+'</text>';
  }
  for(var j=0;j<=3;j++){
    var tt=t0+(t1-t0)*j/3,dt=new Date(tt);
    out+='<text x="'+X(tt)+'" y="'+(H-6)+'" text-anchor="'+(j===0?'start':j===3?'end':'middle')+'">'+dt.getDate()+' '+MON[dt.getMonth()]+'</text>';
  }
  var line=pts.map(function(p,i){return (i?'L':'M')+X(parse(p.date).getTime()).toFixed(1)+' '+Y(p.e1).toFixed(1);}).join(' ');
  out+='<path d="'+line+'" fill="none" style="stroke:var(--c-lowerA)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  pts.forEach(function(p,i){
    var x=X(parse(p.date).getTime()),y=Y(p.e1);
    var tip=lbl(p.date,true)+'\nEst. 1RM '+fmtN(Math.round(p.e1*10)/10)+' '+UNIT+'\nTop set '+fmtN(p.w)+' × '+p.r;
    var isLast=i===pts.length-1;
    out+='<g class="pt" data-tip="'+ta(tip)+'"><line class="xh" x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(m.t+ph)+'"/>'+
      '<circle class="hit" cx="'+x+'" cy="'+y+'" r="14" fill="transparent"/>'+
      '<circle class="big" cx="'+x+'" cy="'+y+'" r="7" style="fill:var(--c-lowerA);fill-opacity:.25"/>'+
      '<circle cx="'+x+'" cy="'+y+'" r="'+(isLast?5:4)+'" style="fill:var(--c-lowerA);stroke:var(--surface)" stroke-width="2"/></g>';
  });
  var lp=pts[pts.length-1];
  out+='<text class="endlbl" x="'+(X(parse(lp.date).getTime())+10)+'" y="'+(Y(lp.e1)+4)+'">'+fmtN(Math.round(lp.e1*10)/10)+'</text>';
  return out+'</svg>';
}
function legendFor(list){
  var seen={};
  list.forEach(function(s){seen[s.type]=nameFor(s.type,s);});
  return SLOT_IDS.filter(function(id){return seen[id];}).map(function(id){return {id:id,name:seen[id]};});
}
function renderYear(){
  var el=$('#panel-year'),yr=S.year;
  var real=sessionsList(S.sessions),demo=false,src=real;
  if(!real.length){src=demoSessions();demo=true;}
  var list=src.filter(function(s){return s.date.slice(0,4)===String(yr);});
  if(demo&&!list.length)list=src;
  var c={yr:yr,all:src,list:list,demo:demo,W:Math.max(280,el.clientWidth-30)};
  c.vol=list.reduce(function(a,s){return a+sessVol(s);},0);c.sets=list.reduce(function(a,s){return a+sessSets(s);},0);
  c.wkElapsed=1;
  if(list.length){
    var firstW=mondayOf(list[0].date),lastW=mondayOf(list[list.length-1].date);
    c.wkElapsed=Math.max(1,Math.round((parse(lastW)-parse(firstW))/604800000)+1);
  }
  c.stats=exStats(list);c.keys=Object.keys(c.stats);
  var sel=S.exSel&&c.stats[S.exSel]?S.exSel:null;
  if(!sel){
    for(var i=0;i<MAIN_LIFTS.length;i++){if(c.stats[MAIN_LIFTS[i]]){sel=MAIN_LIFTS[i];break;}}
    if(!sel&&c.keys.length)sel=c.keys.slice().sort(function(a,b){return c.stats[b].pts.length-c.stats[a].pts.length;})[0];
  }
  c.sel=sel;
  var h='';
  if(demo)h+='<div class="demo">Example preview. These numbers are made up so you can see the layout. Your own sessions replace them as soon as you log one.</div>';
  h+='<div class="nav"><span class="lbl">'+yr+' progress'+(who()?' · '+esc(who()):'')+'</span><div class="yearsel">'+
    '<button type="button" class="btn small" data-act="yr-prev" aria-label="Previous year">←</button>'+
    '<button type="button" class="btn small" data-act="yr-next" aria-label="Next year"'+(yr>=new Date().getFullYear()?' disabled':'')+'>→</button></div></div>';
  el.innerHTML=h+wgBar('year')+wgBlocks('year',c);
}

/* ---------- blocks on this page (framework in widgets.js) ---------- */
function yearLegend(list){return '<div class="legend">'+legendFor(list).map(function(t){return '<span><i style="background:var(--c-'+t.id+')"></i>'+esc(t.name)+'</span>';}).join('')+'</div>';}
wgReg('year','y_sessions','tile','Sessions','Sessions logged this year and your average per week.',true,function(c){
  return wgTile('Sessions',c.list.length,c.list.length?(Math.round(c.list.length/c.wkElapsed*10)/10)+' per week':'none yet');});
wgReg('year','y_sets','tile','Sets','Sets logged this year.',true,function(c){return wgTile('Sets',fmtN(c.sets),'logged');});
wgReg('year','y_volume','tile','Volume','Total weight lifted this year.',true,function(c){
  return wgTile('Volume',UNIT==='lb'?fmtN(Math.round(dv(c.vol)/100)/10)+'k lb':fmtN(Math.round(c.vol/100)/10)+' t',fmtN(Math.round(dv(c.vol)))+' '+UNIT+' lifted');});
wgReg('year','y_reps','tile','Total reps','Every rep you completed this year.',false,function(c){return wgTile('Reps',fmtN(totalReps(c.list)),'completed');});
wgReg('year','y_days','tile','Training days','How many different days you trained this year.',false,function(c){
  var n=distinctDays(c.list),now=new Date(),isNow=c.yr===now.getFullYear();
  var elapsed=isNow?Math.round((parse(today())-parse(c.yr+'-01-01'))/86400000)+1:((c.yr%4===0&&c.yr%100!==0)||c.yr%400===0?366:365);
  return wgTile('Training days',n,Math.round(n/elapsed*100)+'% of '+(isNow?'the year so far':'the year'));});
wgReg('year','y_wstreak','tile','Week streak','Weeks in a row with at least one session, and your best run.',false,function(c){
  var wk={};c.all.forEach(function(s){wk[mondayOf(s.date)]=1;});
  var keys=Object.keys(wk).sort(),best=0,run=0,prev=null;
  keys.forEach(function(k){run=(prev&&addDays(prev,7)===k)?run+1:1;if(run>best)best=run;prev=k;});
  /* this week still counts if it is not over yet, so start from last week when nothing is logged today */
  var cur=0,w=mondayOf(today());if(!wk[w])w=addDays(w,-7);
  while(wk[w]){cur++;w=addDays(w,-7);}
  return wgTile('Week streak',cur+(cur===1?' week':' weeks'),'best '+best+(best===1?' week':' weeks'));});
wgReg('year','y_prs','tile','Personal records','Times you beat your previous best estimated 1RM this year.',false,function(c){
  var n=prEvents(c.all).filter(function(p){return p.date.slice(0,4)===String(c.yr);}).length;
  return wgTile('Records',n,'new bests in '+c.yr);});
wgReg('year','y_avgvol','tile','Average session','Average volume per session this year.',false,function(c){
  return wgTile('Avg session',c.list.length?fmtN(Math.round(dv(c.vol/c.list.length)))+' '+UNIT:'–','volume per session');});
wgReg('year','y_heat','block','Training days chart','Every day of the year, coloured by the session you did.',true,function(c){
  return '<div class="bhead"><h3 class="sechead">Training days</h3></div><div class="scroll">'+heatSvg(c.list,c.yr)+'</div>'+yearLegend(c.list);});
wgReg('year','y_vol','block','Weekly volume','Volume lifted each week, stacked by session.',true,function(c){
  var vs=volSvg(c.list,c.yr,c.W);
  return '<div class="bhead"><h3 class="sechead">Weekly volume</h3><span class="muted mono" style="font-size:12px">'+UNIT+' lifted per week</span></div>'+vs.svg+yearLegend(c.list)+
    '<details><summary>View as table</summary><div class="scroll"><table><thead><tr><th>Week of</th><th class="n">Sessions</th><th class="n">Volume ('+UNIT+')</th></tr></thead><tbody>'+
    vs.weeks.filter(function(w){return w.total>0;}).map(function(w){return '<tr><td>'+lbl(w.start)+'</td><td class="n">'+w.n+'</td><td class="n">'+fmtN(Math.round(w.total))+'</td></tr>';}).join('')+
    '</tbody></table></div></details>';});
wgReg('year','y_strength','block','Strength chart','Estimated one rep max over time for any exercise you pick.',true,function(c){
  var sel=c.sel;if(!sel)return '';
  var stats=c.stats,keys=c.keys;
  var pts=stats[sel].pts.filter(function(p){return p.e1>0;}).sort(function(a,b){return a.date<b.date?-1:1;}).map(function(p){return {date:p.date,e1:dv(p.e1),w:dv(p.w),r:p.r};});
  var opts=keys.slice().sort(function(a,b){return stats[b].pts.length-stats[a].pts.length;}).map(function(k){return '<option value="'+esc(k)+'"'+(k===sel?' selected':'')+'>'+esc(stats[k].name)+'</option>';}).join('');
  var h='<div class="bhead"><h3 class="sechead">Strength</h3><select class="field" id="exsel" aria-label="Exercise to chart">'+opts+'</select></div>';
  if(pts.length>=2){
    var first=pts[0],lastp=pts[pts.length-1],bestp=pts.reduce(function(a,p){return p.e1>a.e1?p:a;},pts[0]);
    var diff=Math.round((lastp.e1-first.e1)*10)/10;
    h+='<div class="tiles" style="margin-bottom:8px">'+
      '<div class="card tile"><div class="eyebrow">Best est. 1RM</div><div class="v">'+fmtN(Math.round(bestp.e1*10)/10)+' '+UNIT+'</div><div class="d">'+lbl(bestp.date)+'</div></div>'+
      '<div class="card tile"><div class="eyebrow">Change</div><div class="v">'+(diff>=0?'+':'')+fmtN(diff)+' '+UNIT+'</div><div class="d">since '+lbl(first.date)+'</div></div>'+
      '<div class="card tile"><div class="eyebrow">Sessions</div><div class="v">'+pts.length+'</div><div class="d">with this lift</div></div></div>';
    h+=lineSvg(pts,c.W);
    h+='<div class="muted mono" style="font-size:12px;margin-top:4px">Estimated one rep max from your best set each session (Epley). Reps above 12 are skipped.</div>';
  }else{
    h+='<div class="empty">Log this lift in two or more sessions and the trend line appears here.</div>';
  }
  return h;});
wgReg('year','y_records','block','Records table','Your heaviest set and best estimated 1RM for each exercise.',true,function(c){
  if(!c.sel)return '';
  var stats=c.stats;
  var recRows=c.keys.map(function(k){
    var st=stats[k],hw=st.pts.reduce(function(a,p){return p.w>a.w||(p.w===a.w&&p.r>a.r)?p:a;},st.pts[0]);
    var be=Math.max.apply(null,st.pts.map(function(p){return p.e1;}));
    return {name:st.name,n:st.pts.length,w:hw.w,r:hw.r,date:hw.date,be:be};
  }).sort(function(a,b){return b.n-a.n;}).slice(0,14);
  return '<div class="bhead"><h3 class="sechead">Records</h3></div><div class="scroll"><table><thead><tr><th>Exercise</th><th class="n">Heaviest set</th><th class="n">Best est. 1RM</th><th class="n">Sessions</th></tr></thead><tbody>'+
    recRows.map(function(r){return '<tr><td>'+esc(r.name)+'</td><td class="n">'+fw(r.w)+' × '+r.r+'</td><td class="n">'+(r.be?fmtN(Math.round(dv(r.be)*10)/10):'–')+'</td><td class="n">'+r.n+'</td></tr>';}).join('')+
    '</tbody></table></div>';});
wgReg('year','y_months','block','Sessions per month','How many sessions you trained in each month of the year.',false,function(c){
  var n=[0,0,0,0,0,0,0,0,0,0,0,0];
  c.list.forEach(function(s){n[parse(s.date).getMonth()]++;});
  var W=c.W,H=150,m={l:28,r:6,t:16,b:22},pw=W-m.l-m.r,ph=H-m.t-m.b,max=Math.max(4,Math.max.apply(null,n)),bw=pw/12;
  var out='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Sessions per month in '+c.yr+'">';
  [0,max/2,max].forEach(function(v){var y=m.t+ph-ph*v/max;out+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" style="stroke:var(--line2)"/><text x="'+(m.l-6)+'" y="'+(y+4)+'" text-anchor="end">'+Math.round(v)+'</text>';});
  n.forEach(function(v,i){
    var x=m.l+i*bw,h=v/max*ph;
    out+='<text x="'+(x+bw/2)+'" y="'+(H-6)+'" text-anchor="middle">'+MON[i]+'</text>';
    if(v>0)out+='<rect x="'+(x+bw*0.15)+'" y="'+(m.t+ph-h)+'" width="'+(bw*0.7)+'" height="'+h+'" rx="2" style="fill:var(--c-lowerA)" data-tip="'+ta(MON[i]+' '+c.yr+'\n'+v+(v===1?' session':' sessions'))+'"/>';
  });
  return '<div class="bhead"><h3 class="sechead">Sessions per month</h3></div>'+out+'</svg>';});
wgReg('year','y_top','block','Most-trained exercises','The exercises you have logged in the most sessions this year.',false,function(c){
  var rows=c.keys.map(function(k){return {label:c.stats[k].name,val:c.stats[k].pts.length};}).sort(function(a,b){return b.val-a.val;}).slice(0,8)
    .map(function(r){return {label:r.label,val:r.val,text:r.val+(r.val===1?' session':' sessions')};});
  return '<div class="bhead"><h3 class="sechead">Most-trained exercises</h3></div>'+(rows.length?wgBars(rows):'<div class="muted wgnone">Log some sessions to see your most-trained exercises.</div>');});

function yearClick(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='yr-prev'){S.year--;renderYear();}
  else if(b.dataset.act==='yr-next'){if(S.year<new Date().getFullYear()){S.year++;renderYear();}}
}


/* ---------- tooltip ---------- */
var tip=$('#tip');
function showTip(e){
  var t=e.target.closest&&e.target.closest('[data-tip]');
  if(!t){tip.hidden=true;return;}
  tip.textContent=t.getAttribute('data-tip');tip.hidden=false;
  var w=tip.offsetWidth,h=tip.offsetHeight,x=e.clientX+14,y=e.clientY+14;
  if(x+w>window.innerWidth-8)x=Math.max(8,e.clientX-w-14);
  if(y+h>window.innerHeight-8)y=Math.max(8,e.clientY-h-14);
  tip.style.transform='translate('+x+'px,'+y+'px)';
}

