/* Plate Log: drawings for the "put it on your home screen" steps in the Guide. Simplified phone pictures built as inline SVG (no image files except the app icon). Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- install guide drawings ---------- */
var IA_ICON='icon-192.png';

/* a phone body; inner is drawn on a 112 x 224 screen */
function iaPhone(inner,label){
  return '<svg class="phone" viewBox="0 0 112 224" role="img" aria-label="'+esc(label)+'">'+
    '<rect x="1.5" y="1.5" width="109" height="221" rx="16" class="pf"/>'+
    '<rect x="6" y="6" width="100" height="212" rx="11" class="ps"/>'+inner+'</svg>';
}
/* a stand-in for the web page behind the browser bars */
function iaPage(top){
  var h='<rect x="12" y="'+top+'" width="88" height="16" rx="3" class="pk"/>'+
    '<text x="18" y="'+(top+11)+'" class="pt pw" style="font-weight:700">PLATE LOG</text>';
  [top+24,top+54,top+84].forEach(function(y){
    h+='<rect x="12" y="'+y+'" width="88" height="24" rx="3" class="pc"/>'+
      '<rect x="18" y="'+(y+7)+'" width="40" height="4" rx="2" class="pm2"/>'+
      '<rect x="18" y="'+(y+15)+'" width="60" height="3" rx="1.5" class="pm2"/>';
  });
  return h;
}
var IA_N=0;
function iaIcon(x,y,s){
  var id='iaclip'+(IA_N++);
  return '<clipPath id="'+id+'"><rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" rx="'+Math.round(s*.22)+'"/></clipPath>'+
    '<image href="'+IA_ICON+'" x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+id+')"/>';
}
function iaRing(cx,cy,r){return '<circle class="hl" cx="'+cx+'" cy="'+cy+'" r="'+r+'"/>';}
function iaRow(y,label,hot,iconType){
  var h='';
  if(hot)h+='<rect x="10" y="'+y+'" width="92" height="22" rx="5" class="hf"/><rect x="10" y="'+y+'" width="92" height="22" rx="5" class="hl hlr"/>';
  h+='<rect x="16" y="'+(y+5)+'" width="12" height="12" rx="3" class="'+(iconType==='plus'?'pk':'pm2')+'"/>';
  if(iconType==='plus')h+='<path d="M22 '+(y+8)+'v6M19 '+(y+11)+'h6" class="pw2"/>';
  h+='<text x="33" y="'+(y+14)+'" class="pt'+(hot?' pb':'')+'" style="font-size:6.4px">'+label+'</text>';
  return h;
}
function iaHome(round,hotCol,hotRow){
  var h='<rect x="6" y="6" width="100" height="212" rx="11" class="pwall"/>';
  var xs=[12,36,60,84],ys=[28,66,104],r=round?10:5;
  ys.forEach(function(y,ri){xs.forEach(function(x,ci){
    var hot=ri===hotRow&&ci===hotCol;
    h+=hot?iaIcon(x-2,y,20):'<rect x="'+(x-2)+'" y="'+y+'" width="20" height="20" rx="'+r+'" class="pic"/>';
    h+='<rect x="'+(x-1)+'" y="'+(y+24)+'" width="'+(hot?18:14)+'" height="3" rx="1.5" class="pm2"/>';
  });});
  h+='<rect x="12" y="184" width="88" height="26" rx="10" class="pdock"/>';
  [16,38,60,82].forEach(function(x){h+='<rect x="'+x+'" y="188" width="18" height="18" rx="'+r+'" class="pic"/>';});
  h+='<rect class="hl hlr" x="'+(xs[hotCol]-4)+'" y="'+(ys[hotRow]-3)+'" width="24" height="33" rx="7"/>';
  return h;
}

function iaIos(){
  var host=esc(location.host||'your-site.pages.dev');
  var step1=iaPhone(
    '<text x="14" y="17" class="pt pm" style="font-size:6px">9:41</text>'+iaPage(26)+
    '<path d="M6 186H106V207a11 11 0 0 1-11 11H17a11 11 0 0 1-11-11Z" class="pb2"/>'+
    '<path d="M24 197l-5 5 5 5" class="pi"/><path d="M38 197l5 5-5 5" class="pi pmu"/>'+
    '<path d="M50 203v7h12v-7M56 207v-11M52.5 199.5L56 196l3.5 3.5" class="pi"/>'+
    '<rect x="68" y="197" width="10" height="11" rx="1.5" class="pi pn"/><rect x="85" y="198" width="9" height="9" rx="1.5" class="pi pn"/>'+
    iaRing(56,203,12),'Safari with the Share button highlighted');
  var step2=iaPhone(
    '<text x="14" y="17" class="pt pm" style="font-size:6px">9:41</text>'+iaPage(26)+
    '<rect x="6" y="6" width="100" height="212" rx="11" class="pdim"/>'+
    '<path d="M6 92H106V207a11 11 0 0 1-11 11H17a11 11 0 0 1-11-11Z" class="pb2"/>'+
    '<rect x="44" y="96" width="24" height="3" rx="1.5" class="pm2"/>'+
    '<text x="14" y="112" class="pt pb" style="font-size:7px">Plate Log</text>'+
    iaRow(118,'Copy',false)+iaRow(140,'Add to Bookmarks',false)+iaRow(162,'Add to Home Screen',true,'plus')+iaRow(184,'Find on Page',false),
    'Share sheet with Add to Home Screen highlighted');
  var step3=iaPhone(
    '<rect x="6" y="6" width="100" height="212" rx="11" class="pdim"/>'+
    '<rect x="6" y="38" width="100" height="180" rx="11" class="pb2"/>'+
    '<text x="11" y="58" class="pt pm" style="font-size:5px">Cancel</text>'+
    '<text x="60" y="58" class="pt pb" style="font-size:4.4px" text-anchor="middle">Add to Home Screen</text>'+
    '<text x="99" y="58" class="pt pb" style="fill:var(--c-lowerA);font-size:6.4px" text-anchor="end">Add</text>'+
    '<rect x="82" y="47" width="21" height="15" rx="6" class="hl hlr"/>'+
    iaIcon(14,72,30)+
    '<rect x="50" y="72" width="50" height="14" rx="3" class="pinp"/><text x="54" y="82" class="pt">Plate Log</text>'+
    '<text x="50" y="98" class="pt pm" style="font-size:5px">'+host+'</text>'+
    '<rect x="14" y="116" width="86" height="3" rx="1.5" class="pm2"/><rect x="14" y="126" width="70" height="3" rx="1.5" class="pm2"/>',
    'Add to Home Screen box with Add highlighted');
  var step4=iaPhone(iaHome(false,2,1),'Home screen with the Plate Log icon highlighted');
  return [
    {art:step1,t:'Tap the Share button',d:'Open Plate Log in Safari. The Share button is the square with an arrow at the bottom of the screen.'},
    {art:step2,t:'Tap Add to Home Screen',d:'Scroll down the list if you do not see it straight away.'},
    {art:step3,t:'Tap Add',d:'You can change the name first if you like.'},
    {art:step4,t:'Open it from your home screen',d:'It opens full screen, like any other app.'}
  ];
}
function iaAndroid(){
  var host=esc(location.host||'your-site.pages.dev');
  var bar='<rect x="6" y="6" width="100" height="30" rx="11" class="pb2"/>'+
    '<rect x="12" y="15" width="66" height="14" rx="7" class="pinp"/><text x="20" y="25" class="pt pm" style="font-size:5.5px">'+host+'</text>'+
    '<circle cx="94" cy="16" r="1.8" class="pk"/><circle cx="94" cy="22" r="1.8" class="pk"/><circle cx="94" cy="28" r="1.8" class="pk"/>';
  var step1=iaPhone(iaPage(46)+bar+iaRing(94,22,11)+'<rect x="36" y="209" width="40" height="3" rx="1.5" class="pm2"/>','Chrome with the menu button highlighted');
  var step2=iaPhone(iaPage(46)+bar+
    '<rect x="6" y="6" width="100" height="212" rx="11" class="pdim"/>'+
    '<rect x="40" y="22" width="62" height="100" rx="6" class="pb2 pl2"/>'+
    '<text x="48" y="40" class="pt">New tab</text><text x="48" y="62" class="pt">History</text>'+
    '<rect x="42" y="68" width="58" height="22" rx="4" class="hf"/><rect x="42" y="68" width="58" height="22" rx="4" class="hl hlr"/>'+
    '<text x="48" y="82" class="pt pb">Install app</text><text x="48" y="106" class="pt">Settings</text>',
    'Chrome menu with Install app highlighted');
  var step3=iaPhone(
    '<rect x="6" y="6" width="100" height="212" rx="11" class="pdim"/>'+
    '<rect x="14" y="70" width="84" height="88" rx="10" class="pb2 pl2"/>'+
    iaIcon(22,80,22)+'<text x="50" y="92" class="pt pb">Install app?</text>'+
    '<text x="50" y="102" class="pt pm" style="font-size:5.5px">Plate Log</text>'+
    '<rect x="22" y="114" width="68" height="3" rx="1.5" class="pm2"/><rect x="22" y="121" width="52" height="3" rx="1.5" class="pm2"/>'+
    '<text x="24" y="148" class="pt pm">Cancel</text><text x="66" y="148" class="pt pb" style="fill:var(--c-lowerA)">Install</text>'+
    '<rect x="58" y="136" width="34" height="17" rx="8" class="hl hlr"/>',
    'Install box with Install highlighted');
  var step4=iaPhone(iaHome(true,2,1),'Home screen with the Plate Log icon highlighted');
  return [
    {art:step1,t:'Tap the ⋮ menu',d:'Open Plate Log in Chrome. The menu is the three dots at the top right.'},
    {art:step2,t:'Tap Install app',d:'Some phones call it Add to Home screen. Either one works.'},
    {art:step3,t:'Tap Install',d:'Confirm in the box that appears.'},
    {art:step4,t:'Open it from your home screen',d:'Look for the Plate Log icon. It may also be in your app drawer.'}
  ];
}
/* the numbered steps for one phone type */
function installSteps(plat){
  var st=plat==='android'?iaAndroid():iaIos();
  return '<ol class="isteps">'+st.map(function(s,i){
    return '<li class="istep"><div class="iart">'+s.art+'</div><div class="itxt"><b>'+(i+1)+'. '+s.t+'</b><p>'+s.d+'</p></div></li>';
  }).join('')+'</ol>';
}
function detectPlat(){
  var ua=navigator.userAgent||'';
  if(/Android/i.test(ua))return 'android';
  return 'ios';
}
