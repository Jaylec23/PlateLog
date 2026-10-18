/* Plate Log: CSV export. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- export ---------- */
function csvCell(v){var s=String(v==null?'':v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function exportCsv(){
  var list=sessionsList(S.sessions);
  if(!list.length){say('Nothing to export yet.');return;}
  var rows=[['date','session','exercise','set',UNIT,'reps','est_1rm_'+UNIT,'session_notes']];
  list.forEach(function(s){
    var first=true;
    s.exercises.forEach(function(e){
      e.sets.forEach(function(x,i){
        if(x.w==null&&x.r==null)return;
        var v=e1rm(x.w,x.r);
        rows.push([s.date,nameFor(s.type,s),e.name,i+1,x.w==null?'':Math.round(dv(x.w)*100)/100,x.r==null?'':x.r,v?(Math.round(dv(v)*10)/10):'',first?(s.notes||''):'']);
        first=false;
      });
    });
  });
  var slug=(S.cfg.people.length>1?'-'+activeName().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'');
  var csv=rows.map(function(r){return r.map(csvCell).join(',');}).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='plate-log'+slug+'-'+today()+'.csv';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  say('Export ready.');
}
