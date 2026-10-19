/* Plate Log: customisable blocks for Weeks and Year (add, remove, reorder, reset). Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order).
   This file is the framework. The blocks themselves are registered in weeks.js and year.js with wgReg().
   The chosen order is saved in the account config as S.cfg.layout = {weeks:[ids], year:[ids]}. A page with no saved list shows its default blocks. */
'use strict';

var WG={weeks:[],year:[]};
/* kind: 'tile' (small number card, grouped in a row), 'block' (a card), 'plain' (renders its own markup)
   render(ctx) returns the inside of the card for tile and block, or the full markup for plain; '' means "nothing to show yet" */
function wgReg(page,id,kind,title,desc,isDefault,render){WG[page].push({id:id,kind:kind,title:title,desc:desc,def:!!isDefault,render:render});}
function wgDef(page,id){for(var i=0;i<WG[page].length;i++)if(WG[page][i].id===id)return WG[page][i];return null;}
function wgDefaults(page){return WG[page].filter(function(d){return d.def;}).map(function(d){return d.id;});}
function wgClean(page,arr){
  var seen={};
  return (Array.isArray(arr)?arr:[]).filter(function(id){if(typeof id!=='string'||seen[id]||!wgDef(page,id))return false;seen[id]=1;return true;});
}
/* the saved layout in config; nothing saved means the defaults */
function wgNormLayout(l){
  var out={};
  ['weeks','year'].forEach(function(p){if(l&&Array.isArray(l[p]))out[p]=wgClean(p,l[p]);});
  return out;
}
function wgLayout(page){
  var l=S.cfg.layout&&S.cfg.layout[page];
  return Array.isArray(l)?wgClean(page,l):wgDefaults(page);
}
function wgSave(page,ids){
  S.cfg.layout=S.cfg.layout||{};
  var def=JSON.stringify(wgDefaults(page))===JSON.stringify(ids);
  if(def)delete S.cfg.layout[page];else S.cfg.layout[page]=ids;
  /* scheduleCfg clears the "fresh plan" hint; changing a layout should not use that up */
  var fresh=Object.keys(S.cfg.plans).filter(function(k){return S.cfg.plans[k].fresh;});
  scheduleCfg();
  fresh.forEach(function(k){if(S.cfg.plans[k])S.cfg.plans[k].fresh=true;});
}

/* ---------- drawing ---------- */
function wgCtl(page,d,i,n){
  return '<div class="wgctl"><span class="wgname">'+esc(d.title)+'</span><span class="wgbtns">'+
    '<button type="button" class="btn small" data-wg-act="up" data-id="'+d.id+'" aria-label="Move '+esc(d.title)+' up"'+(i===0?' disabled':'')+'>↑</button>'+
    '<button type="button" class="btn small" data-wg-act="down" data-id="'+d.id+'" aria-label="Move '+esc(d.title)+' down"'+(i===n-1?' disabled':'')+'>↓</button>'+
    '<button type="button" class="btn small" data-wg-act="remove" data-id="'+d.id+'" aria-label="Remove '+esc(d.title)+'">×</button></span></div>';
}
function wgItem(page,id,i,n,ctx,edit){
  var d=wgDef(page,id),inner=d.render(ctx),ctl=edit?wgCtl(page,d,i,n):'';
  if(!inner&&!edit)return '';
  if(!inner)inner='<div class="muted wgnone">Nothing to show yet. This fills in once you have logged data for it.</div>';
  if(d.kind==='tile')return '<div class="card tile'+(edit?' wgedit':'')+'" data-wg="'+id+'">'+inner+ctl+'</div>';
  if(d.kind==='block')return '<div class="card block'+(edit?' wgedit':'')+'" data-wg="'+id+'">'+ctl+inner+'</div>';
  return edit?'<div class="wgplain wgedit" data-wg="'+id+'">'+ctl+inner+'</div>':inner;
}
function wgBlocks(page,ctx){
  var ids=wgLayout(page),edit=S.wgEdit===page,h='',i=0,n=ids.length;
  while(i<n){
    if(wgDef(page,ids[i]).kind==='tile'){
      var run='';
      while(i<n&&wgDef(page,ids[i]).kind==='tile'){run+=wgItem(page,ids[i],i,n,ctx,edit);i++;}
      if(run)h+='<div class="tiles">'+run+'</div>';
    }else{h+=wgItem(page,ids[i],i,n,ctx,edit);i++;}
  }
  if(!n&&!edit)h+='<div class="card empty">Nothing is showing on this page. Tap Customise to add blocks.</div>';
  return h;
}
/* the Customise button, or the editing bar with the list of blocks that can be added */
function wgBar(page){
  if(S.wgEdit!==page)return '<div class="wgbar"><button type="button" class="btn small" data-wg-act="edit">Customise</button></div>';
  var shown=wgLayout(page),hidden=WG[page].filter(function(d){return shown.indexOf(d.id)<0;});
  var h='<div class="wgbar editing"><span class="muted">Changes save as you go.</span><span class="wgbtns">'+
    '<button type="button" class="btn small" data-wg-act="reset">Reset to default</button>'+
    '<button type="button" class="btn small primary" data-wg-act="done">Done</button></span></div>';
  h+='<div class="card wgadd"><div class="eyebrow">Add a block</div>'+(hidden.length?hidden.map(function(d){
    return '<div class="wgrow"><div><b>'+esc(d.title)+'</b><div class="muted">'+esc(d.desc)+'</div></div>'+
      '<button type="button" class="btn small" data-wg-act="add" data-id="'+d.id+'" aria-label="Add '+esc(d.title)+'">+ Add</button></div>';
  }).join(''):'<p class="muted wgnone">Every block is already on this page.</p>')+'</div>';
  return h;
}
function wgClick(page,e){
  var b=e.target.closest('[data-wg-act]');if(!b)return;
  var act=b.dataset.wgAct,id=b.dataset.id,ids=wgLayout(page),i=ids.indexOf(id);
  if(act==='edit'){S.wgEdit=page;}
  else if(act==='done'){S.wgEdit=null;}
  else if(act==='reset'){S.cfg.layout=S.cfg.layout||{};delete S.cfg.layout[page];wgSave(page,wgDefaults(page));}
  else if(act==='remove'&&i>=0){ids.splice(i,1);wgSave(page,ids);}
  else if(act==='up'&&i>0){ids[i]=ids[i-1];ids[i-1]=id;wgSave(page,ids);}
  else if(act==='down'&&i>=0&&i<ids.length-1){ids[i]=ids[i+1];ids[i+1]=id;wgSave(page,ids);}
  else if(act==='add'&&i<0&&wgDef(page,id)){
    var d=wgDef(page,id),at=ids.length;
    if(d.kind==='tile'){/* a new tile joins the last row of tiles, or goes to the top when there are none */
      at=0;ids.forEach(function(x,k){if(wgDef(page,x).kind==='tile')at=k+1;});
    }
    ids.splice(at,0,id);wgSave(page,ids);
  }
  else return;
  if(page==='weeks')renderWeeks();else renderYear();
  /* keep the finger where it was: the button just used may have moved or vanished */
  var again=b.dataset.id&&$('#panel-'+page+' [data-wg="'+b.dataset.id+'"] [data-wg-act="'+act+'"]');
  if(again&&!again.disabled)again.focus();
}

/* ---------- helpers shared by the blocks ---------- */
var WG_GROUPS=null;
/* exercise name to muscle group, using the Plan library; anything else is "Other" */
function exGroupOf(name){
  if(!WG_GROUPS){
    WG_GROUPS={};
    var chip={};
    CHIPS.forEach(function(c){if(c[1])c[1].forEach(function(g){chip[g]=c[0];});});
    LIB.forEach(function(x){WG_GROUPS[x.n.toLowerCase()]=chip[x.g]||x.g;});
  }
  return WG_GROUPS[String(name||'').trim().toLowerCase()]||'Other';
}
function totalReps(list){var n=0;list.forEach(function(s){s.exercises.forEach(function(e){e.sets.forEach(function(x){if(isDone(x))n+=x.r;});});});return n;}
function distinctDays(list){var m={};list.forEach(function(s){m[s.date]=1;});return Object.keys(m).length;}
/* a tile's inside: label, big number, small line */
function wgTile(label,value,note){return '<div class="eyebrow">'+esc(label)+'</div><div class="v">'+value+'</div><div class="d">'+esc(note)+'</div>';}
/* horizontal bars: rows of {label,val,text} */
function wgBars(rows){
  var max=Math.max.apply(null,rows.map(function(r){return r.val;}).concat([1]));
  return '<div class="wgbars">'+rows.map(function(r){
    return '<div class="wgbrow"><span class="l">'+esc(r.label)+'</span><span class="bar"><i style="width:'+Math.max(2,Math.round(r.val/max*100))+'%"></i></span><span class="n">'+esc(r.text)+'</span></div>';
  }).join('')+'</div>';
}
/* every exercise's best estimated 1RM by date, oldest first, over the sessions given */
function prEvents(sessions){
  var st=exStats(sessions.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;})),out=[];
  Object.keys(st).forEach(function(k){
    var top=0;
    st[k].pts.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;}).forEach(function(p){
      if(top>0&&p.e1>top+1e-9)out.push({date:p.date,name:st[k].name});
      if(p.e1>top)top=p.e1;
    });
  });
  return out;
}
