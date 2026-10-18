/* Plate Log: helpers: dates, escaping, 1RM maths, session helpers. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- helpers ---------- */
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function pad(n){return (n<10?'0':'')+n;}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return ymd(d);}
function today(){return ymd(new Date());}
function dow(s){return (parse(s).getDay()+6)%7;}
function mondayOf(s){return addDays(s,-dow(s));}
function isoWeek(s){
  var d=parse(s);d.setHours(12);
  var t=new Date(d);t.setDate(t.getDate()+3-((t.getDay()+6)%7));
  var w1=new Date(t.getFullYear(),0,4);
  return 1+Math.round(((t-w1)/86400000-3+((w1.getDay()+6)%7))/7);
}
var DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function lbl(s,withDow){var d=parse(s);return (withDow?DOW[dow(s)]+' ':'')+d.getDate()+' '+MON[d.getMonth()];}
function fmtN(n){return Number(n).toLocaleString('en-AU',{maximumFractionDigits:1});}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function ta(s){return esc(s).replace(/\n/g,'&#10;');}
function clone(o){return JSON.parse(JSON.stringify(o));}
function col(type){return 'var(--c-'+(validType(type)?type:'upperA')+')';}
function use(n){try{return window.claude&&window.claude.use?Promise.resolve(window.claude.use(n)).catch(function(){return null;}):Promise.resolve(null);}catch(e){return Promise.resolve(null);}}

function e1rm(w,r){if(!(w>0&&r>0)||r>12)return 0;return r===1?w:w*(1+r/30);}
function isDone(x){return x&&x.r>0&&x.w!=null;}
function hasContent(doc){
  if(doc.notes&&String(doc.notes).trim())return true;
  return (doc.exercises||[]).some(function(e){return (e.sets||[]).some(function(s){return s.w!=null||s.r!=null;});});
}
function sessVol(s){var v=0;s.exercises.forEach(function(e){e.sets.forEach(function(x){if(isDone(x))v+=x.w*x.r;});});return v;}
function sessSets(s){var n=0;s.exercises.forEach(function(e){e.sets.forEach(function(x){if(isDone(x))n++;});});return n;}
function parseTarget(t){
  var m=/(\d+)\s*[x×]\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(t||'');
  if(!m){var m2=/^(\d+)\s*sets?/.exec(t||'');return {sets:m2?+m2[1]:3,lo:null,hi:null};}
  return {sets:+m[1],lo:+m[2],hi:m[3]?+m[3]:+m[2]};
}
function owner(s){return s.profile||'p1';}
function keyOf(date,type){return S.pid==='p1'?'s_'+date+'_'+type:'s_'+S.pid+'_'+date+'_'+type;}
function sessionsList(src){
  var arr=(src instanceof Map)?Array.from(src.values()).filter(function(s){return s&&owner(s)===S.pid;}):src;
  return arr.filter(function(s){return s&&s.date&&Array.isArray(s.exercises)&&validType(s.type)&&hasContent(s);})
    .sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
}

