/* Plate Log: appearance (mode, look, session colours, accent). Classic script, loaded in <head> so the saved look is applied before the page paints. Self-contained: it only touches <html> and localStorage; the sheet UI helpers use $, $$ and esc from util.js at call time (see docs/ARCHITECTURE.md). */
'use strict';

/* ---------- options ---------- */
var TH_KEY='platelog.theme';
var TH_DEF={mode:'auto',look:'plate',sc:'plates',accent:'default'};
var TH_VARS=['bg','surface','input','ink','ink2','muted','line','line2'];
/* each look: name, light values, dark values (order of TH_VARS). "plate" is the built-in CSS, so nothing is applied for it */
var TH_LOOKS={
  plate:{name:'Plate',L:['#E9ECED','#F7F8F8','#FFFFFF','#14191C','#434E55','#66727A','#CFD5D8','#E0E4E6'],D:['#101417','#181E22','#0E1316','#E8ECEE','#B4BEC4','#8B969D','#2D373D','#232C31']},
  slate:{name:'Slate',L:['#E6EAF0','#F4F6FA','#FFFFFF','#131A26','#3F4A5E','#5E6C84','#C9D1DE','#DCE2EC'],D:['#0F141D','#172030','#0C111A','#E6EBF4','#B0BACB','#8793A8','#2A364A','#212B3C']},
  forest:{name:'Forest',L:['#E7EDE8','#F5F8F5','#FFFFFF','#131C16','#3E5144','#5C6F63','#CBD6CE','#DDE6DF'],D:['#0F1612','#16201A','#0C120F','#E6EEE8','#B0C0B5','#879A8D','#2A3A30','#213027']},
  sand:{name:'Sand',L:['#EEE9E0','#F8F5EF','#FFFFFF','#1E1A14','#54493B','#716554','#D8D0C2','#E7E1D6'],D:['#16130F','#201B15','#110F0B','#EFE9DE','#C3B8A6','#9A8E7C','#3A3228','#2C261E']},
  mono:{name:'Black & white',L:['#FFFFFF','#F5F5F5','#FFFFFF','#000000','#444444','#666666','#D0D0D0','#E6E6E6'],D:['#000000','#0C0C0C','#000000','#F2F2F2','#BDBDBD','#8E8E8E','#2A2A2A','#1A1A1A']},
  contrast:{name:'High contrast',L:['#FFFFFF','#FFFFFF','#FFFFFF','#000000','#1A1A1A','#333333','#595959','#8A8A8A'],D:['#000000','#000000','#000000','#FFFFFF','#F0F0F0','#D0D0D0','#9A9A9A','#6A6A6A']}
};
var TH_LOOK_IDS=['plate','slate','forest','sand','mono','contrast'];
/* session colours: upperA, lowerA, upperB, extra, lowerB, day6 */
var TH_SCV=['upperA','lowerA','upperB','extra','lowerB','day6'];
var TH_SC={
  plates:{name:'Plates',L:['#D23B30','#2A5FC1','#C98E00','#7C4DBA','#2F8F4E','#1B8A9C'],D:['#E0574B','#5A86E0','#B98614','#9D74D6','#3FA962','#3AAFC2']},
  cb:{name:'Colour-blind friendly',L:['#D55E00','#0072B2','#B58A00','#CC79A7','#009E73','#2F9BD3'],D:['#E8743B','#4EA3DC','#E8B020','#D98CB8','#2FC095','#7CC4EE']},
  soft:{name:'Soft',L:['#C4685F','#5F7FB8','#B89B4A','#8C6FB0','#5F9C74','#5A9BA6'],D:['#D9857C','#85A3D6','#D3B968','#AC93CB','#82BB95','#80BAC4']},
  vivid:{name:'Vivid',L:['#E11D48','#2563EB','#D97706','#9333EA','#16A34A','#0891B2'],D:['#FB5A7A','#5B8DF5','#FBBF24','#B26CF2','#34D26E','#22C5E0']}
};
var TH_SC_IDS=['plates','cb','soft','vivid'];
/* accent: id, name, light, dark. "default" follows the text colour, as before */
var TH_ACC=[
  ['default','Default',null,null],['red','Red','#C42F25','#EF6A5E'],['orange','Orange','#B85A00','#F0933A'],['green','Green','#2A7A45','#4FBE75'],
  ['teal','Teal','#12727F','#46BFD1'],['blue','Blue','#2455B5','#6B94EA'],['purple','Purple','#6B3FA8','#B08BE3'],['pink','Pink','#B53273','#EA7FB2']
];

/* ---------- state ---------- */
function thNorm(t){
  t=(t&&typeof t==='object')?t:{};
  var o={mode:TH_DEF.mode,look:TH_DEF.look,sc:TH_DEF.sc,accent:TH_DEF.accent};
  if(t.mode==='light'||t.mode==='dark'||t.mode==='auto')o.mode=t.mode;
  if(TH_LOOKS[t.look])o.look=t.look;
  if(TH_SC[t.sc])o.sc=t.sc;
  if(TH_ACC.some(function(a){return a[0]===t.accent;}))o.accent=t.accent;
  return o;
}
function thLoad(){try{return thNorm(JSON.parse(localStorage.getItem(TH_KEY)||'null'));}catch(e){return thNorm(null);}}
function thSave(t){try{localStorage.setItem(TH_KEY,JSON.stringify(t));}catch(e){}}
var TH=thLoad();
var TH_SET=[];

function thIsDark(t){
  if(t.mode==='dark')return true;
  if(t.mode==='light')return false;
  try{return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}catch(e){return false;}
}
/* text colour (black or white) with the better contrast on a given accent */
function thOn(hex){
  var n=parseInt(hex.slice(1),16);
  var L=[n>>16&255,n>>8&255,n&255].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  var lum=0.2126*L[0]+0.7152*L[1]+0.0722*L[2];
  return (lum+0.05)/0.05>=1.05/(lum+0.05)?'#000000':'#FFFFFF';
}
function thApply(t){
  var r=document.documentElement,st=r.style,dk=thIsDark(t);
  if(t.mode==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',t.mode);
  TH_SET.forEach(function(p){st.removeProperty(p);});TH_SET=[];
  function put(p,v){st.setProperty(p,v);TH_SET.push(p);}
  if(t.look!=='plate'){var lv=TH_LOOKS[t.look][dk?'D':'L'];TH_VARS.forEach(function(k,i){put('--'+k,lv[i]);});}
  if(t.sc!=='plates'){var sv=TH_SC[t.sc][dk?'D':'L'];TH_SCV.forEach(function(k,i){put('--c-'+k,sv[i]);});}
  var a=TH_ACC.filter(function(x){return x[0]===t.accent;})[0];
  if(a&&a[2]){var c=dk?a[3]:a[2];put('--accent',c);put('--on-accent',thOn(c));}
  r.setAttribute('data-look',t.look);
}
/* change settings from the sheet: remembered on this device, and the caller syncs them to the account */
function thSet(patch){TH=thNorm(Object.assign({},TH,patch));thSave(TH);thApply(TH);return TH;}
/* adopt settings that arrived from the account */
function thAdopt(t){TH=thNorm(t);thSave(TH);thApply(TH);}
thApply(TH);
try{
  var thMq=window.matchMedia('(prefers-color-scheme: dark)');
  var thOnSys=function(){if(TH.mode==='auto')thApply(TH);if(typeof renderTheme==='function'&&$('#themeSheet')&&!$('#themeSheet').hidden)renderTheme();};
  if(thMq.addEventListener)thMq.addEventListener('change',thOnSys);else if(thMq.addListener)thMq.addListener(thOnSys);
}catch(e){}

/* ---------- the Appearance sheet ---------- */
function thSeg(key,opts){
  return '<div class="thseg" role="group">'+opts.map(function(o){
    return '<button type="button" data-th="'+key+'" data-v="'+o[0]+'" aria-pressed="'+(TH[key]===o[0])+'">'+o[1]+'</button>';
  }).join('')+'</div>';
}
function renderTheme(){
  var el=$('#themeBody');if(!el)return;
  var dk=thIsDark(TH),m=dk?'D':'L';
  var h='<div class="thsec"><div class="eyebrow">Mode</div>'+thSeg('mode',[['auto','Auto'],['light','Light'],['dark','Dark']])+
    '<p class="thnote muted">Auto follows your phone or computer setting.</p></div>';
  h+='<div class="thsec"><div class="eyebrow">Look</div><div class="thgrid">'+TH_LOOK_IDS.map(function(id){
    var v=TH_LOOKS[id][m];
    return '<button type="button" class="thcard" data-th="look" data-v="'+id+'" aria-pressed="'+(TH.look===id)+'">'+
      '<span class="thprev" style="background:'+v[0]+';border-color:'+v[6]+'"><i style="background:'+v[1]+';border-color:'+v[6]+'"></i><b style="background:'+v[3]+'"></b><b style="background:'+v[5]+'"></b></span>'+
      '<span class="thname">'+esc(TH_LOOKS[id].name)+'</span></button>';
  }).join('')+'</div></div>';
  h+='<div class="thsec"><div class="eyebrow">Session colours</div><div class="thgrid">'+TH_SC_IDS.map(function(id){
    return '<button type="button" class="thcard" data-th="sc" data-v="'+id+'" aria-pressed="'+(TH.sc===id)+'">'+
      '<span class="thdots">'+TH_SC[id][m].map(function(c){return '<i style="background:'+c+'"></i>';}).join('')+'</span>'+
      '<span class="thname">'+esc(TH_SC[id].name)+'</span></button>';
  }).join('')+'</div><p class="thnote muted">These colour your sessions on Log, Weeks and Year.</p></div>';
  h+='<div class="thsec"><div class="eyebrow">Accent</div><div class="thacc">'+TH_ACC.map(function(a){
    var c=a[2]?(dk?a[3]:a[2]):null;
    return '<button type="button" class="thdot" data-th="accent" data-v="'+a[0]+'" aria-pressed="'+(TH.accent===a[0])+'" aria-label="'+esc(a[1])+'" title="'+esc(a[1])+'"'+
      '><span style="background:'+(c||'var(--ink)')+'"></span></button>';
  }).join('')+'</div><p class="thnote muted">Used for the selected tab, buttons and highlights.</p></div>';
  h+='<div class="thsec"><button type="button" class="btn small" data-th-reset>Reset to default</button></div>';
  el.innerHTML=h;
}
var thReturn=null;
function openTheme(){
  var s=$('#themeSheet');if(!s)return;
  thReturn=document.activeElement;
  renderTheme();s.hidden=false;
  var b=$('[data-th-close]',s);if(b)b.focus();
}
function closeTheme(){
  var s=$('#themeSheet');if(!s||s.hidden)return;
  s.hidden=true;
  if(thReturn&&thReturn.focus&&document.contains(thReturn))thReturn.focus();
  thReturn=null;
}
