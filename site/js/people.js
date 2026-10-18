/* Plate Log: people bar: add, rename, remove, switch. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- people ---------- */
function renderPeople(){
  var el=$('#people');
  var h=S.cfg.people.map(function(p){
    return '<button type="button" class="pchip" data-act="person" data-id="'+esc(p.id)+'" aria-pressed="'+(p.id===S.pid)+'">'+esc(p.name)+'</button>';
  }).join('');
  if(S.pUI==='add'||S.pUI==='rename'){
    h+='<input class="field" id="pname" maxlength="24" placeholder="Name" value="'+(S.pUI==='rename'?esc(activeName()):'')+'" aria-label="Person name">'+
      '<button type="button" class="btn small primary" data-act="psave">'+(S.pUI==='add'?'Add':'Save')+'</button>'+
      '<button type="button" class="btn small" data-act="pcancel">Cancel</button>';
  }else if(S.pUI==='remove'){
    h+='<span class="confirm">Remove '+esc(activeName())+' and all their logs and plan? <button class="btn small primary" type="button" data-act="premove-yes">Yes, remove</button><button class="btn small" type="button" data-act="pcancel">Cancel</button></span>';
  }else{
    h+='<button type="button" class="pchip add" data-act="padd-person">+ Add person</button>'+
      '<button type="button" class="plink" data-act="prename" aria-label="Rename '+esc(activeName())+'">Rename</button>'+
      (S.cfg.people.length>1?'<button type="button" class="plink" data-act="premove" aria-label="Remove '+esc(activeName())+'">Remove</button>':'');
  }
  el.innerHTML=h;
  var f=$('#pname');if(f&&S.focusName){f.focus();f.select();S.focusName=false;}
  $('#exportBtn').textContent='Export '+(S.cfg.people.length>1?activeName()+"'s":'all')+' sets (CSV)';
}
function commitPerson(){
  var inp=$('#pname'),name=((inp&&inp.value)||'').trim().slice(0,24);
  if(S.pUI==='add'){
    flush();
    var id='p'+Date.now().toString(36);
    S.cfg.people.push({id:id,name:name||('Person '+(S.cfg.people.length+1))});
    S.pid=id;saveActive();S.pUI=null;loadDraft();
  }else{
    S.cfg.people.forEach(function(p){if(p.id===S.pid&&name)p.name=name;});
    S.pUI=null;
  }
  scheduleCfg();renderPeople();renderActive();
}
function removePerson(){
  if(S.cfg.people.length<2)return;
  flush();
  var gone=S.pid,keys=[];
  S.sessions.forEach(function(s,k){if(s&&owner(s)===gone)keys.push(k);});
  S.cfg.people=S.cfg.people.filter(function(p){return p.id!==gone;});
  delete S.cfg.plans[gone];
  S.pid=S.cfg.people[0].id;saveActive();S.pUI=null;
  deleteSessions(keys);scheduleCfg();loadDraft();renderPeople();renderActive();
}
function peopleClick(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var a=b.dataset.act;
  if(a==='person'){
    if(b.dataset.id!==S.pid){flush();S.pid=b.dataset.id;saveActive();S.pUI=null;S.resetType=null;S.openDays={};S.exOpen=null;S.splitAsk=null;S.rmDay=null;loadDraft();renderPeople();renderActive();}
  }else if(a==='padd-person'){S.pUI='add';S.focusName=true;renderPeople();}
  else if(a==='prename'){S.pUI='rename';S.focusName=true;renderPeople();}
  else if(a==='premove'){S.pUI='remove';renderPeople();}
  else if(a==='pcancel'){S.pUI=null;renderPeople();}
  else if(a==='psave'){commitPerson();}
  else if(a==='premove-yes'){removePerson();}
}
