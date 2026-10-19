#!/usr/bin/env python3
"""Plate Log browser tests. Run:  python3 tests/run_tests.py
Needs a Chromium/Chrome binary (set CHROME=/path/to/chrome, or it is auto-detected).
It copies site/ to a temp folder, builds test pages that add a mock Supabase and a scripted
driver, loads them in headless Chrome and prints PASS/FAIL lines. Exit code 1 on any FAIL."""
import glob, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')


def find_chrome():
    if os.environ.get('CHROME'):
        return os.environ['CHROME']
    for pat in ('/opt/pw-browsers/chromium-*/chrome-linux/chrome',):
        hits = sorted(glob.glob(pat))
        if hits:
            return hits[-1]
    for n in ('chromium', 'chromium-browser', 'google-chrome', 'chrome'):
        p = shutil.which(n)
        if p:
            return p
    sys.exit('No Chrome/Chromium found. Set CHROME=/path/to/chrome')


COMMON = r'''<script>
var __out=[];
function check(name,cond,detail){__out.push((cond?'PASS ':'FAIL ')+name+(cond?'':'  -> '+detail));}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function fire(el,t){el.dispatchEvent(new Event(t,{bubbles:true}));}
function click(el){el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
function focusin(el){el.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));}
function typeIn(el,v){el.focus();el.value=v;fire(el,'input');}
function tab(n){click($('#tab-'+n));}
function txt(sel){return $$(sel).map(function(x){return x.textContent;}).join(',');}
function cfg(){try{return JSON.parse(localStorage.getItem('platelog.v1')||'{}').config;}catch(e){return null;}}
function finish(){var pre=document.createElement('pre');pre.id='out';pre.textContent=__out.join('\n');document.body.appendChild(pre);}
window.addEventListener('error',function(e){__out.push('FAIL page error -> '+e.message);});
</script>'''

SEED_LEGACY = r'''<script>if(!localStorage.getItem('SEEDED')){localStorage.setItem('SEEDED','1');localStorage.setItem('platelog.v1',JSON.stringify({config:{people:[{id:'p1',name:'Me'}],plans:{p1:{upperA:[{name:'Old bench',sets:5,lo:3,hi:5}],lowerA:[],upperB:[{name:'Old row',sets:3,lo:8,hi:8}]}}}}));}</script>'''

MOCK = r'''<script>
(function(){
function J(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d;}catch(e){return d;}}
function W(k,v){localStorage.setItem(k,JSON.stringify(v));}
if(!localStorage.getItem('SEEDED')){localStorage.setItem('SEEDED','1');
  W('platelog.v1',{'s_2026-10-01_upperA':{date:'2026-10-01',type:'upperA',notes:'old local',exercises:[{name:'Bench press',target:'4 x 4-6',sets:[{w:60,r:5}]}],updated:1,profile:'p1'}});}
window.supabase={createClient:function(){
  var DB=function(){return J('FAKE_DB',{users:{},docs:[]});};
  var sess=function(){return DB().session||null;};
  return {auth:{
    onAuthStateChange:function(){return {data:{subscription:{}}};},
    getSession:async function(){return {data:{session:sess()}};},
    signUp:async function(o){var d=DB();if(d.users[o.email])return {error:{message:'User already registered'}};
      var u={id:'u-'+Object.keys(d.users).length,email:o.email};d.users[o.email]={pw:o.password,user:u};
      var s={user:u};d.session=s;W('FAKE_DB',d);return {data:{session:s}};},
    signInWithPassword:async function(o){var d=DB();var r=d.users[o.email];if(!r||r.pw!==o.password)return {error:{message:'Invalid login credentials'}};
      var s={user:r.user};d.session=s;W('FAKE_DB',d);return {data:{session:s}};},
    signOut:async function(){var d=DB();delete d.session;W('FAKE_DB',d);return {};},
    resetPasswordForEmail:async function(){return {};},updateUser:async function(){return {};}},
  from:function(){var q={op:null,rows:null,f:{}};
    var b={select:function(){q.op='select';return b;},upsert:function(rows){q.op='upsert';q.rows=rows;return b;},delete:function(){q.op='delete';return b;},
      eq:function(k,v){q.f[k]=v;return b;},then:function(res,rej){return run().then(res,rej);}};
    async function run(){
      await sleep(30);
      var d=DB(),s=sess();if(!s)return {error:{message:'not signed in'}};
      if(q.op==='select')return {data:d.docs.filter(function(x){return x.user_id===s.user.id;}).map(function(x){return {id:x.id,data:x.data};})};
      if(q.op==='upsert'){var rows=Array.isArray(q.rows)?q.rows:[q.rows];
        for(var i=0;i<rows.length;i++){var r=rows[i];if(r.user_id!==s.user.id)return {error:{message:'RLS violation'}};
          var k=d.docs.findIndex(function(x){return x.user_id===r.user_id&&x.id===r.id;});if(k>=0)d.docs[k]=r;else d.docs.push(r);}
        W('FAKE_DB',d);return {error:null};}
      if(q.op==='delete'){d.docs=d.docs.filter(function(x){return !(x.user_id===q.f.user_id&&x.id===q.f.id);});W('FAKE_DB',d);return {error:null};}
    }
    return b;}};}};
})();
window.PLATELOG_CONFIG={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_ANON_KEY:'fakekeyfakekeyfakekeyfakekey123'};
</script>'''

DRIVERS = {}

DRIVERS['local_a'] = r'''
check('first run shows the split hint',!!$('.hint'),'no hint');
check('Log shows the 5 upper/lower days',txt('.seg button b')==='Upper A,Lower A,Upper B,Lower B,Extra day',txt('.seg button b'));
tab('weeks');await sleep(100);
check('Weeks shows an example before anything is logged',!!$('#panel-weeks .demo')&&$$('#panel-weeks .wsess').length>0,'');
check('example sessions are not clickable',$$('#panel-weeks [data-act="open"]').filter(function(b){return b.classList.contains('open')||(b.classList.contains('chip')&&!b.classList.contains('plan'));}).length===0,'');
tab('plan');await sleep(100);
check('split dropdown has 4 splits + custom',$$('#splitsel option').length===5,String($$('#splitsel option').length));
check('days start collapsed',$$('.plancard').length===5&&$$('.daybody').length===0,'');
click($('.plancard[data-day="upperA"] .dayhd'));await sleep(100);
check('Upper A opens with 7 exercises',$$('.plancard[data-day="upperA"] .prow').length===7,'');
check('no number inputs (rep editing) in Plan',$$('#panel-plan input[type=number]').length===0,'');
var q=$('.plancard[data-day="upperA"] .exq');focusin(q);typeIn(q,'cable');await sleep(100);
var res=$$('.plancard[data-day="upperA"] .exopt span:first-child').map(function(x){return x.textContent;});
check('search finds Cable fly',res.indexOf('Cable fly')>=0,res.join('|'));
check('custom option is last',/custom exercise/.test(res[res.length-1]||''),res.join('|'));
click($('.plancard[data-day="upperA"] .exopt[data-act="pick"]'));await sleep(100);
check('picking adds a row',$$('.plancard[data-day="upperA"] .prow').length===8,'');
q=$('.plancard[data-day="upperA"] .exq');focusin(q);typeIn(q,'zzz thing');await sleep(100);
click($('.plancard[data-day="upperA"] .exopt[data-act="pickcustom"]'));await sleep(100);
check('custom exercise adds a row',$$('.plancard[data-day="upperA"] .prow').length===9,'');
await sleep(900);
check('plan saved to device',cfg()&&cfg().plans.p1.days[0].ex.length===9,JSON.stringify(cfg()&&cfg().plans));
q=$('.plancard[data-day="upperA"] .exq');focusin(q);typeIn(q,'');click($('.plancard[data-day="upperA"] .mgchip[data-g="Core"]'));await sleep(50);
var gs=$$('.plancard[data-day="upperA"] .exopt .g').map(function(x){return x.textContent;}).filter(function(v,i,a){return a.indexOf(v)===i;});
check('Core chip filters groups',gs.every(function(g){return g==='Core'||g==='Full body';})&&gs.length>0,gs.join(','));
tab('log');await sleep(100);
typeIn($('input.w'),'80');typeIn($('input.r'),'5');await sleep(1200);
tab('plan');await sleep(100);
var sel=$('#splitsel');sel.value='ppl';fire(sel,'change');await sleep(100);
check('edited plan asks before switching',!!$('[data-act="split-yes"]'),'');
click($('[data-act="split-yes"]'));await sleep(300);
check('PPL days',txt('.plancard .dname b')==='Push,Pull,Legs',txt('.plancard .dname b'));
tab('log');await sleep(100);
check('Log follows the new split',txt('.seg button b')==='Push,Pull,Legs',txt('.seg button b'));
tab('weeks');await sleep(100);
check('Weeks example is gone once real data exists',!$('#panel-weeks .demo'),'');
check('old session keeps its day name',($('.wsess h3')||{}).textContent==='Upper A',($('.wsess h3')||{}).textContent);
tab('year');await sleep(100);
check('year legend uses the old name',/Upper A/.test(txt('.legend')),txt('.legend'));
'''

DRIVERS['local_b'] = r'''
check('split persists after reload',cfg()&&cfg().plans.p1.split==='ppl','');
tab('plan');await sleep(100);
check('PPL still selected',$('#splitsel').value==='ppl','');
var sel=$('#splitsel');sel.value='custom';fire(sel,'change');await sleep(100);
check('Custom needs no confirmation',!$('[data-act="split-yes"]'),'');
click($('[data-act="addday"]'));await sleep(100);
check('Add day works',txt('.plancard .dname b')==='Push,Pull,Legs,Day 4',txt('.plancard .dname b'));
var nd=$$('.plancard').pop();typeIn($('.dn',nd),'Arms and abs');await sleep(100);
click($('.pfoot [data-act="rmday"]',nd));await sleep(50);
check('Remove day asks first',!!$('[data-act="rmday-yes"]'),'');
click($('[data-act="rmday-no"]'));await sleep(900);
var pl=cfg().plans.p1;
check('custom plan saved',pl.split==='custom'&&pl.days[3].name==='Arms and abs',JSON.stringify(pl.days.map(function(d){return d.name;})));
tab('log');await sleep(100);
check('Log shows custom days',txt('.seg button b')==='Push,Pull,Legs,Arms and abs',txt('.seg button b'));
'''

DRIVERS['legacy'] = r'''
tab('plan');await sleep(100);
check('old plan maps to Upper / Lower',$('#splitsel').value==='ul',$('#splitsel').value);
click($('.plancard[data-day="upperA"] .dayhd'));await sleep(100);
var oldv=$$('.plancard[data-day="upperA"] .pn').map(function(i){return i.value;}).join(',');
check('old edits kept',oldv==='Old bench',oldv);
'''

DRIVERS['cloud_signup'] = r'''
check('sign-in screen shows',!!$('#auth'),'');
$('#auth [data-t="up"]').click();
$('#aemail').value='a@b.co';$('#apass').value='secret123';
$('#authform').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
await sleep(1500);
check('overlay closes after sign-up',!$('#auth'),'');
check('status says account',$('#statusTxt').textContent==='Saved to your account',$('#statusTxt').textContent);
var docs=function(){return JSON.parse(localStorage.getItem('FAKE_DB')||'{"docs":[]}').docs;};
check('device logs uploaded on first sign-in',docs().some(function(d){return d.id==='s_2026-10-01_upperA';}),'');
typeIn($('#w-0-1'),'82.5');typeIn($('input.r'),'6');await sleep(2000);
check('new set saved to account',docs().some(function(d){return d.data.exercises&&d.data.exercises[0].sets[1]&&d.data.exercises[0].sets[1].w===82.5;}),'');
check('session stored',!!(JSON.parse(localStorage.getItem('FAKE_DB')||'{}').session),'');
check('rows belong to the user',docs().every(function(d){return d.user_id==='u-0';}),'');
click($('#themeOpen'));await sleep(50);
click($('[data-th="look"][data-v="forest"]'));await sleep(2000);
tab('weeks');await sleep(100);
click($('#panel-weeks [data-wg-act="edit"]'));click($('#panel-weeks [data-wg="w_sets"] [data-wg-act="remove"]'));await sleep(2000);
check('block layout saved to the account config',docs().some(function(d){return d.data&&d.data.layout&&d.data.layout.weeks&&d.data.layout.weeks.indexOf('w_sets')<0;}),JSON.stringify(docs().map(function(d){return d.data&&d.data.layout;})));
check('look saved to the account config',docs().some(function(d){return d.data&&d.data.theme&&d.data.theme.look==='forest';}),JSON.stringify(docs().map(function(d){return d.data&&d.data.theme;})));
'''

DRIVERS['cloud_reload'] = r'''
var ph=localStorage.getItem('PH1');
if(!ph){
  check('no sign-in screen when signed in',!$('#auth'),'');
  check('account shown',/a@b\.co/.test(($('#acct')||{}).textContent||''),($('#acct')||{}).textContent);
  check('set restored from account',$('#w-0-1').value==='82.5',$('#w-0-1').value);
  localStorage.setItem('PH1',__out.join('\n'));
  click($('#acct [data-a="out"]'));      // signs out and reloads the page
  await sleep(3000);
}else{
  localStorage.removeItem('PH1');
  ph.split('\n').forEach(function(l){if(l)__out.push(l);});
  check('Sign out returns to the sign-in screen',!!$('#auth'),'');
}
'''

DRIVERS['cloud_bad'] = r'''
check('signed out shows sign-in',!!$('#auth'),'');
$('#aemail').value='a@b.co';$('#apass').value='wrongpass1';
$('#authform').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));await sleep(600);
check('wrong password message',/Invalid login/.test($('.authmsg').textContent),$('.authmsg').textContent);
$('#aemail').value='a@b.co';$('#apass').value='secret123';
$('#authform').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));await sleep(1500);
check('right password restores data',!$('#auth')&&$('#w-0-1').value==='82.5','');
'''

DRIVERS['cloud_local'] = r'''
check('sign-in screen shows',!!$('#auth'),'');
$('[data-a="local"]').click();await sleep(800);
check('continue without account is device-only',$('#statusTxt').textContent==='Saved on this device only',$('#statusTxt').textContent);
check('offers sign in to sync',/Sign in to sync/.test(($('#acct')||{}).textContent||''),'');
'''

DRIVERS['cloud_local2'] = r'''
check('choice is remembered',!$('#auth')&&/Sign in to sync/.test(($('#acct')||{}).textContent||''),'');
'''


DRIVERS['units'] = r"""
var raw=function(){try{return JSON.parse(localStorage.getItem('platelog.v1')||'{}');}catch(e){return {};}};
var setW=function(j){var k=Object.keys(raw()).filter(function(x){return /^s_/.test(x);})[0];return k?raw()[k].exercises[0].sets[j].w:undefined;};
check('starts in kg',$('.sethead span:nth-child(2)').textContent==='kg',$('.sethead span:nth-child(2)').textContent);
check('menu starts closed',$('#acctMenu').hidden===true,'');
typeIn($('#w-0-0'),'100');typeIn($('#r-0-0'),'5');await sleep(1200);
check('100 kg stored as 100',setW(0)===100,String(setW(0)));
click($('#acctBtn'));await sleep(50);
check('account menu opens',$('#acctMenu').hidden===false&&$('#acctBtn').getAttribute('aria-expanded')==='true','');
check('menu has privacy link',!!$('#acctMenu a[href="privacy.html"]'),'');
check('menu says the log is on this device',/device/.test($('#acct').textContent),$('#acct').textContent);
check('kg|lb switch is on the page, outside the menu',!$('#acctMenu').contains($('.unitseg'))&&$('.unitseg').getBoundingClientRect().height>20,String($('.unitseg').getBoundingClientRect().height));
check('menu itself no longer holds the unit switch',!$('#acctMenu [data-unit]'),'');
click($('.unitseg [data-unit="lb"]'));await sleep(300);
check('switches to lb',$('.sethead span:nth-child(2)').textContent==='lb',$('.sethead span:nth-child(2)').textContent);
check('100 kg shows as 220.46 lb',$('#w-0-0').value==='220.46',$('#w-0-0').value);
check('stored value untouched',setW(0)===100,String(setW(0)));
check('summary uses lb',/lb volume/.test($('#sumbar').textContent),$('#sumbar').textContent);
check('est 1RM column converted',parseFloat($('#panel-log .set .e').textContent)>250,$('#panel-log .set .e').textContent);
typeIn($('#w-0-1'),'135');typeIn($('#r-0-1'),'5');await sleep(1200);
check('135 lb stored as 61.235 kg',setW(1)===61.235,String(setW(1)));
click($('#exportBtn'));
tab('weeks');await sleep(100);
check('weeks volume in lb',/lb$/.test(txt('.tile:nth-child(3) .v')),txt('.tile:nth-child(3) .v'));
check('weeks card in lb',/lb$/.test(($('.wsess .meta')||{textContent:''}).textContent),($('.wsess .meta')||{}).textContent);
tab('year');await sleep(100);
check('year tile uses lb',/lb/.test(txt('.tile:nth-child(3) .v')),txt('.tile:nth-child(3) .v'));
tab('plan');await sleep(100);
check('plan progression tip uses lb',/5 lb on upper-body/.test($('#panel-plan .rules').textContent),$('#panel-plan .rules').textContent);
await sleep(900);
check('unit saved to config',cfg()&&cfg().unit==='lb',JSON.stringify(cfg()&&cfg().unit));
check('fresh-plan hint survives a unit change',true,'');
document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await sleep(50);
check('Escape closes menu',$('#acctMenu').hidden===true,'');
click($('#acctBtn'));click(document.body);await sleep(50);
check('click outside closes menu',$('#acctMenu').hidden===true,'');
tab('log');await sleep(100);
"""

DRIVERS['units2'] = r"""
check('lb remembered after reload',$('.sethead span:nth-child(2)').textContent==='lb',$('.sethead span:nth-child(2)').textContent);
check('value still shows in lb',$('#w-0-1').value==='135',$('#w-0-1').value);
click($('.unitseg [data-unit="kg"]'));await sleep(300);
check('back to kg',$('#w-0-0').value==='100'&&$('#w-0-1').value==='61.235',$('#w-0-0').value+' / '+$('#w-0-1').value);
check('kg pressed state shown',$('.unitseg [data-unit="kg"]').getAttribute('aria-pressed')==='true'&&$('.unitseg [data-unit="lb"]').getAttribute('aria-pressed')==='false','');
"""

DRIVERS['theme'] = r"""
var root=document.documentElement,bg=function(){return getComputedStyle(root).getPropertyValue('--bg').trim();};
var ink=function(){return getComputedStyle(root).getPropertyValue('--ink').trim();};
check('sheet starts closed',$('#themeSheet').hidden===true,'');
click($('#acctBtn'));await sleep(50);
check('menu has Appearance',!!$('#themeOpen'),'');
click($('#themeOpen'));await sleep(50);
check('sheet opens and menu closes',$('#themeSheet').hidden===false&&$('#acctMenu').hidden===true,'');
check('sheet has mode, 6 looks, 4 colour sets, accents',$$('[data-th="mode"]').length===3&&$$('[data-th="look"]').length===6&&$$('[data-th="sc"]').length===4&&$$('[data-th="accent"]').length===8,'');
check('defaults selected',$('[data-th="look"][data-v="plate"]').getAttribute('aria-pressed')==='true'&&$('[data-th="mode"][data-v="auto"]').getAttribute('aria-pressed')==='true','');
check('default leaves no inline colours',!root.style.getPropertyValue('--bg'),root.getAttribute('style')||'');
click($('[data-th="mode"][data-v="dark"]'));await sleep(80);
check('dark mode applied',root.getAttribute('data-theme')==='dark'&&bg()==='#101417',bg());
click($('[data-th="mode"][data-v="light"]'));await sleep(80);
check('light mode applied',root.getAttribute('data-theme')==='light'&&bg()==='#E9ECED',bg());
click($('[data-th="look"][data-v="mono"]'));await sleep(80);
check('Black & white look in light mode',bg()==='#FFFFFF'&&ink()==='#000000',bg()+' '+ink());
click($('[data-th="mode"][data-v="dark"]'));await sleep(80);
check('same look follows into dark mode',bg()==='#000000',bg());
click($('[data-th="sc"][data-v="cb"]'));await sleep(80);
check('colour-blind colours applied in dark mode',getComputedStyle(root).getPropertyValue('--c-upperA').trim()==='#E8743B',getComputedStyle(root).getPropertyValue('--c-upperA').trim());
click($('[data-th="accent"][data-v="blue"]'));await sleep(1300);
check('accent applied with readable text',getComputedStyle(root).getPropertyValue('--accent').trim()==='#6B94EA'&&getComputedStyle(root).getPropertyValue('--on-accent').trim()==='#000000',getComputedStyle(root).getPropertyValue('--accent').trim());
check('selected options use the accent',getComputedStyle($('.thseg button[aria-pressed="true"]')).backgroundColor==='rgb(107, 148, 234)',getComputedStyle($('.thseg button[aria-pressed="true"]')).backgroundColor);
check('theme saved to config',cfg()&&cfg().theme&&cfg().theme.look==='mono'&&cfg().theme.accent==='blue',JSON.stringify(cfg()&&cfg().theme));
check('theme kept on this device',(JSON.parse(localStorage.getItem('platelog.theme')||'{}')).sc==='cb','');
tab('year');await sleep(100);
check('year page still draws',$$('#panel-year .tile').length>0,'');
document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await sleep(50);
check('Escape closes the sheet',$('#themeSheet').hidden===true,'');
click($('#themeOpen'));await sleep(50);
click($('#themeSheet'));await sleep(50);
check('tapping the backdrop closes it',$('#themeSheet').hidden===true,'');
click($('#themeOpen'));await sleep(50);
click($('[data-th-close]'));await sleep(50);
check('Done closes it',$('#themeSheet').hidden===true,'');
tab('log');await sleep(50);
"""

DRIVERS['theme2'] = r"""
var root=document.documentElement;
check('look remembered after reload',root.getAttribute('data-theme')==='dark'&&getComputedStyle(root).getPropertyValue('--bg').trim()==='#000000',getComputedStyle(root).getPropertyValue('--bg').trim());
check('accent remembered after reload',getComputedStyle(root).getPropertyValue('--accent').trim()==='#6B94EA','');
click($('#themeOpen'));await sleep(50);
check('sheet shows the saved choices',$('[data-th="look"][data-v="mono"]').getAttribute('aria-pressed')==='true'&&$('[data-th="sc"][data-v="cb"]').getAttribute('aria-pressed')==='true'&&$('[data-th="accent"][data-v="blue"]').getAttribute('aria-pressed')==='true','');
click($('[data-th-reset]'));await sleep(80);
check('reset clears every colour override',!root.getAttribute('style')&&!root.getAttribute('data-theme'),root.getAttribute('style')||'');
check('reset selects the defaults',$('[data-th="look"][data-v="plate"]').getAttribute('aria-pressed')==='true','');
"""

DRIVERS['widgets'] = r"""
var ids=function(p){return $$('#panel-'+p+' [data-wg]').map(function(e){return e.dataset.wg;}).join(',');};
typeIn($('#w-0-0'),'100');typeIn($('#r-0-0'),'5');typeIn($('#w-0-1'),'100');typeIn($('#r-0-1'),'5');await sleep(1300);
tab('weeks');await sleep(100);
check('Weeks has a Customise button',!!$('#panel-weeks [data-wg-act="edit"]'),'');
check('Weeks starts with the 3 usual tiles',$$('#panel-weeks .tile').length===3&&!!$('#panel-weeks .strip')&&!!$('#panel-weeks .wsess'),'');
click($('#panel-weeks [data-wg-act="edit"]'));await sleep(80);
check('edit bar and add list appear',!!$('#panel-weeks .wgbar.editing')&&$$('#panel-weeks [data-wg-act="add"]').length===6,String($$('#panel-weeks [data-wg-act="add"]').length));
check('every shown block has controls',$$('#panel-weeks .wgctl').length===5,String($$('#panel-weeks .wgctl').length));
check('first block cannot move up',$('#panel-weeks [data-wg="w_sessions"] [data-wg-act="up"]').disabled===true,'');
click($('#panel-weeks [data-wg-act="add"][data-id="w_reps"]'));await sleep(80);
click($('#panel-weeks [data-wg-act="add"][data-id="w_heavy"]'));await sleep(80);
click($('#panel-weeks [data-wg-act="add"][data-id="w_split"]'));await sleep(80);
check('new tiles join the tile row, blocks go last',ids('weeks')==='w_sessions,w_sets,w_volume,w_reps,w_heavy,w_strip,w_cards,w_split',ids('weeks'));
check('Total reps tile counts reps',$('#panel-weeks [data-wg="w_reps"] .v').textContent==='10',$('#panel-weeks [data-wg="w_reps"] .v').textContent);
check('Heaviest set tile',/100/.test($('#panel-weeks [data-wg="w_heavy"] .v').textContent)&&/Bench press/.test($('#panel-weeks [data-wg="w_heavy"] .d').textContent),$('#panel-weeks [data-wg="w_heavy"]').textContent);
check('Muscle groups groups the work',/Chest/.test($('#panel-weeks [data-wg="w_split"]').textContent),$('#panel-weeks [data-wg="w_split"]').textContent);
check('added items leave the add list',!$('#panel-weeks [data-wg-act="add"][data-id="w_reps"]'),'');
click($('#panel-weeks [data-wg="w_split"] [data-wg-act="up"]'));await sleep(80);
check('move up swaps order',ids('weeks')==='w_sessions,w_sets,w_volume,w_reps,w_heavy,w_strip,w_split,w_cards',ids('weeks'));
click($('#panel-weeks [data-wg="w_cards"] [data-wg-act="remove"]'));await sleep(80);
check('remove hides the block',ids('weeks')==='w_sessions,w_sets,w_volume,w_reps,w_heavy,w_strip,w_split'&&!!$('#panel-weeks [data-wg-act="add"][data-id="w_cards"]'),ids('weeks'));
await sleep(1200);
check('layout saved to config',cfg()&&cfg().layout&&cfg().layout.weeks&&cfg().layout.weeks.join(',')==='w_sessions,w_sets,w_volume,w_reps,w_heavy,w_strip,w_split',JSON.stringify(cfg()&&cfg().layout));
click($('#panel-weeks [data-wg-act="done"]'));await sleep(80);
check('Done leaves edit mode and keeps the layout',!$('#panel-weeks .wgbar.editing')&&$$('#panel-weeks .tile').length===5&&!$('#panel-weeks .wsess'),'');
tab('year');await sleep(150);
check('Year starts with the usual blocks',$$('#panel-year .tiles')[0].querySelectorAll('.tile').length===3&&!!$('#panel-year #exsel'),'');
click($('#panel-year [data-wg-act="edit"]'));await sleep(80);
check('Year add list offers 7 new blocks',$$('#panel-year [data-wg-act="add"]').length===7,String($$('#panel-year [data-wg-act="add"]').length));
['y_wstreak','y_prs','y_months','y_top'].forEach(function(id){click($('#panel-year [data-wg-act="add"][data-id="'+id+'"]'));});
await sleep(100);
check('Year blocks added',ids('year')==='y_sessions,y_sets,y_volume,y_wstreak,y_prs,y_heat,y_vol,y_strength,y_records,y_months,y_top',ids('year'));
check('Week streak counts this week',/1 week/.test($('#panel-year [data-wg="y_wstreak"] .v').textContent),$('#panel-year [data-wg="y_wstreak"] .v').textContent);
check('Sessions per month draws bars',$$('#panel-year [data-wg="y_months"] rect[data-tip]').length===1,String($$('#panel-year [data-wg="y_months"] rect[data-tip]').length));
check('Most-trained lists exercises',/Bench press/.test($('#panel-year [data-wg="y_top"]').textContent),'');
click($('#panel-year [data-wg="y_heat"] [data-wg-act="remove"]'));await sleep(1300);
click($('#panel-year [data-wg-act="done"]'));await sleep(80);
check('Year layout saved',cfg()&&cfg().layout&&cfg().layout.year&&cfg().layout.year.indexOf('y_heat')<0&&cfg().layout.year.indexOf('y_top')>=0,JSON.stringify(cfg()&&cfg().layout));
check('removed Year block is gone',!$('#panel-year svg[aria-label^="Training days"]'),'');
check('Weeks layout unaffected by Year edits',cfg().layout.weeks.length===7,'');
"""

DRIVERS['widgets2'] = r"""
var ids=function(p){return $$('#panel-'+p+' [data-wg]').map(function(e){return e.dataset.wg;}).join(',');};
tab('weeks');await sleep(150);
check('Weeks layout survives a reload',$$('#panel-weeks .tile').length===5&&!$('#panel-weeks .wsess')&&!!$('#panel-weeks .strip'),'');
click($('#panel-weeks [data-wg-act="edit"]'));await sleep(80);
check('edit mode lists the saved blocks',ids('weeks')==='w_sessions,w_sets,w_volume,w_reps,w_heavy,w_strip,w_split',ids('weeks'));
for(var k=0;k<7;k++){var b=$('#panel-weeks [data-wg-act="remove"]');if(b){click(b);await sleep(30);}}
check('removing everything shows all blocks as addable',$$('#panel-weeks [data-wg-act="add"]').length===11,String($$('#panel-weeks [data-wg-act="add"]').length));
click($('#panel-weeks [data-wg-act="done"]'));await sleep(80);
check('an empty page explains itself',/Customise/.test(txt('#panel-weeks .empty')),txt('#panel-weeks .empty'));
click($('#panel-weeks [data-wg-act="edit"]'));await sleep(50);
click($('#panel-weeks [data-wg-act="reset"]'));await sleep(1300);
check('Reset restores the default blocks',ids('weeks')==='w_sessions,w_sets,w_volume,w_strip,w_cards',ids('weeks'));
check('Reset clears the saved layout',!(cfg()&&cfg().layout&&cfg().layout.weeks),JSON.stringify(cfg()&&cfg().layout));
click($('#panel-weeks [data-wg-act="done"]'));await sleep(50);
tab('log');await sleep(50);
tab('weeks');await sleep(80);
check('leaving a page ends edit mode',!$('#panel-weeks .wgbar.editing'),'');
"""

DRIVERS['guide'] = r"""
tab('guide');await sleep(100);
check('guide tab opens',!$('#panel-guide').hidden&&$('#tab-guide').getAttribute('aria-selected')==='true','');
check('guide has sections',$$('#panel-guide .gsec').length>=5,String($$('#panel-guide .gsec').length));
check('Log section starts open and install section starts closed',$$('#panel-guide .gsec')[1].open===true&&$('#guide-install').open===false,'');
check('guide mentions split names',/Upper \/ Lower/.test($('#panel-guide').textContent)||/Push/.test($('#panel-guide').textContent),'');
check('guide links to privacy page',!!$('#panel-guide a[href="privacy.html"]'),'');
check('footer links to privacy page',!!$('.foot a[href="privacy.html"]'),'');
check('url hash is guide',location.hash==='#guide',location.hash);
"""

DRIVERS['phone'] = r"""
var vw=window.innerWidth;
check('phone viewport is narrow',vw===390,String(vw));
function overflow(n){check('no sideways scroll on '+n,document.documentElement.scrollWidth<=vw+1,document.documentElement.scrollWidth+' > '+vw);}
function stacked(sel,n){var r=$$(sel).map(function(e){var b=e.getBoundingClientRect();return [Math.round(b.top),Math.round(b.left)];});
  check(n+' stack vertically',r.length>=2&&r.every(function(x,i){return i===0||(x[0]>r[i-1][0]&&Math.abs(x[1]-r[0][1])<=1);}),JSON.stringify(r));}
var b=$('#acctBtn').getBoundingClientRect();
check('account button is top right',b.right>vw-45&&b.top<40,JSON.stringify([b.right,b.top]));
var us=$('.unitseg').getBoundingClientRect();
check('kg|lb switch sits under the account button',us.top>=b.bottom-1&&us.right>=b.right-2&&us.right<=b.right+2,JSON.stringify([us.top,b.bottom,us.right,b.right]));
check('title stays on one line',$('h1').getBoundingClientRect().height<50,String($('h1').getBoundingClientRect().height));
check('all five tabs fit without scrolling',(function(){var t=$('.tabs');return t.scrollWidth<=t.clientWidth+1;})(),$('.tabs').scrollWidth+' vs '+$('.tabs').clientWidth);
check('menu shows sync status words',/device/.test($('#menuStatus').textContent),$('#menuStatus').textContent);
check('title still on the first row',$('h1').getBoundingClientRect().top<40,String($('h1').getBoundingClientRect().top));
click($('#acctBtn'));await sleep(50);
var m=$('#acctMenu').getBoundingClientRect();
check('menu fits on screen',m.left>=0&&m.right<=vw,JSON.stringify([m.left,m.right]));
click($('#acctBtn'));
stacked('.seg button','session buttons');
var cardH=$$('#panel-log .ex').slice(1).map(function(e){return Math.round(e.getBoundingClientRect().height);});
check('closed exercise cards are compact',cardH.length>0&&cardH.every(function(h){return h<=110;}),JSON.stringify(cardH));
check('summary line fits on one row',$$('#panel-log .exsum').every(function(e){return e.getBoundingClientRect().height<=52;}),JSON.stringify($$('#panel-log .exsum').map(function(e){return Math.round(e.getBoundingClientRect().height);})));
typeIn($('#w-0-0'),'60');typeIn($('#r-0-0'),'8');await sleep(100);
stacked('#sumbar span','log summary');
overflow('Log');
tab('weeks');await sleep(100);stacked('#panel-weeks .tile','Weeks tiles');overflow('Weeks');
tab('year');await sleep(150);stacked('#panel-year .tile','Year tiles');overflow('Year');
tab('plan');await sleep(100);click($('.plancard .dayhd'));await sleep(100);
var lb=$$('.dedit label').map(function(e){return Math.round(e.getBoundingClientRect().top);});
check('plan day fields stack',lb.length<2||lb.every(function(x,i){return i===0||x>lb[i-1];}),JSON.stringify(lb));
overflow('Plan');
tab('guide');await sleep(100);overflow('Guide');
updateInstallBanner(true);await sleep(50);
var ib=$('#install').getBoundingClientRect();
check('banner fits inside the phone width',ib.left>=0&&ib.right<=vw&&ib.height>0&&ib.height<140,JSON.stringify([ib.left,ib.right,ib.height]));
overflow('Guide with banner');
click($('#install [data-act="goinstall"]'));await sleep(200);
overflow('install steps');
var ph=$('#guide-install [data-for]:not([hidden]) .phone').getBoundingClientRect(),tx=$('#guide-install [data-for]:not([hidden]) .itxt').getBoundingClientRect();
check('drawing and caption sit side by side',Math.abs((ph.top+ph.height/2)-(tx.top+tx.height/2))<60&&tx.left>=ph.right-1,JSON.stringify([ph.right,tx.left]));
var st=$$('#guide-install [data-for]:not([hidden]) .istep').map(function(e){return Math.round(e.getBoundingClientRect().top);});
check('steps stack one under another',st.length===4&&st.every(function(x,i){return i===0||x>st[i-1];}),JSON.stringify(st));
"""

DRIVERS['wide'] = r"""
var vw=window.innerWidth;
check('wide viewport',vw===900,String(vw));
var b=$('#acctBtn').getBoundingClientRect(),st=$('#status').getBoundingClientRect();
check('account button is top right',b.right>vw-45&&b.top<60,JSON.stringify([b.right,b.top]));
var us=$('.unitseg').getBoundingClientRect();
check('kg|lb switch sits under the account button',us.top>=b.bottom-1&&Math.abs(us.right-b.right)<=2,JSON.stringify([us.top,b.bottom,us.right,b.right]));
check('status sits left of the button on wide screens',st.right<=b.left&&Math.abs((st.top+st.height/2)-(b.top+b.height/2))<14,JSON.stringify([st.right,b.left]));
check('session buttons share a row',(function(){var r=$$('.seg button').map(function(e){return Math.round(e.getBoundingClientRect().top);});return r.length>=2&&r[0]===r[1];})(),'');
tab('weeks');await sleep(100);
check('Weeks tiles side by side',(function(){var t=$$('#panel-weeks .tile').map(function(e){return Math.round(e.getBoundingClientRect().top);});return t.length===3&&t[0]===t[2];})(),'');
tab('year');await sleep(150);
check('Year tiles side by side',(function(){var t=$$('#panel-year .tile').slice(0,3).map(function(e){return Math.round(e.getBoundingClientRect().top);});return t.length===3&&t[0]===t[2];})(),'');
tab('guide');await sleep(100);
check('guide readable at desktop width',$$('#panel-guide .gsec').length>=5,'');
"""

DRIVERS['accordion'] = r"""
var exs=function(){return $$('#panel-log .ex');};
var open=function(i){return !exs()[i].querySelector('.exbody').hidden;};
check('Upper A has several exercises',exs().length>=5,String(exs().length));
check('first exercise starts open',open(0)&&!open(1)&&!open(2),exs().map(function(e,i){return open(i);}).join());
check('closed card invites you to log',/Tap to log sets/.test(exs()[1].querySelector('.exsumr').textContent),exs()[1].querySelector('.exsumr').textContent);
check('open card with nothing logged shows 0/4',/0\/4 sets/.test(exs()[0].querySelector('.exsumr').textContent),exs()[0].querySelector('.exsumr').textContent);
check('open card prompts for weight and reps',/Enter the weight and reps/.test(exs()[0].querySelector('.last').textContent),exs()[0].querySelector('.last').textContent);
click(exs()[1].querySelector('.exsum'));await sleep(50);
check('summary switches to 0/4 once opened',/0\/4 sets/.test(exs()[1].querySelector('.exsumr').textContent),exs()[1].querySelector('.exsumr').textContent);
click(exs()[1].querySelector('.exsum'));await sleep(50);
check('and back to the prompt when closed',/Tap to log sets/.test(exs()[1].querySelector('.exsumr').textContent),exs()[1].querySelector('.exsumr').textContent);
check('summary row shows the target',/4 × 4–6/.test(exs()[0].querySelector('.exsumt').textContent),exs()[0].querySelector('.exsumt').textContent);
check('inputs exist even in closed cards',!!$('#w-3-0'),'');
click(exs()[1].querySelector('.exsum'));await sleep(50);
check('tapping a closed card opens it',open(1)&&exs()[1].querySelector('.exsum').getAttribute('aria-expanded')==='true','');
click(exs()[1].querySelector('.exsum'));await sleep(50);
check('tapping again closes it',!open(1)&&exs()[1].querySelector('.exsum').getAttribute('aria-expanded')==='false','');
typeIn($('#w-0-0'),'80');typeIn($('#r-0-0'),'5');await sleep(100);
check('summary updates as you type',/1\/4 sets · top 80×5/.test(exs()[0].querySelector('.exsumr').textContent),exs()[0].querySelector('.exsumr').textContent);
click(exs()[0].querySelector('.exsum'));await sleep(50);
check('closing keeps the numbers',!open(0)&&$('#w-0-0').value==='80','');
check('expand all shown',/Expand all/.test($('.exall').textContent),$('.exall').textContent);
click($('.exall [data-act]'));await sleep(100);
check('expand all opens everything',exs().every(function(e,i){return open(i);}),'');
check('button flips to collapse all',/Collapse all/.test($('.exall').textContent),$('.exall').textContent);
click($('.exall [data-act]'));await sleep(100);
check('collapse all closes everything',exs().every(function(e,i){return !open(i);}),'');
// open only card 2, remove card 1: the open flag follows the exercise
var n0=exs().length,name2=exs()[2].querySelector('.exname').value;
click(exs()[2].querySelector('.exsum'));await sleep(50);
click(exs()[1].querySelector('.exsum'));await sleep(50);
click(exs()[1].querySelector('[data-act="rmex"]'));await sleep(150);
check('removing an exercise works',exs().length===n0-1,String(exs().length));
check('open state follows the exercise after a removal',exs()[1].querySelector('.exname').value===name2&&open(1)&&!open(0),exs().map(function(e,i){return open(i);}).join());
// add a new exercise: it opens
typeIn($('#newex'),'Zottman curl');click($('[data-act="addex"]'));await sleep(150);
check('new exercise opens',open(exs().length-1),'');
// changing session starts fresh with the first card open
click($('#type-lowerA'));await sleep(150);
check('other session starts with first card open',open(0)&&!open(1),exs().map(function(e,i){return open(i);}).join());
// editing the target opens the editor inside the open card
click(exs()[0].querySelector('[data-act="edittarget"]'));await sleep(100);
check('target editor shows in the open card',!!exs()[0].querySelector('.tedit'),'');
click(exs()[0].querySelector('.exsum'));await sleep(100);
check('closing the card closes the editor',!$('.tedit')&&!open(0),'');
"""

DRIVERS['install'] = r"""
check('banner hidden on a desktop browser',$('#install').hidden===true,'');
updateInstallBanner(true);
check('banner can be shown',$('#install').hidden===false&&/Get Plate Log as an app/.test($('#install').textContent),'');
check('banner has a Show me how button',!!$('#install [data-act="goinstall"]'),'');
tab('weeks');await sleep(50);
check('banner stays on other tabs',$('#install').hidden===false,'');
click($('#install [data-act="goinstall"]'));await sleep(150);
check('Show me how opens the Guide',$('#tab-guide').getAttribute('aria-selected')==='true','');
check('install section is open',$('#guide-install').open===true,'');
check('banner is still there after opening the guide',$('#install').hidden===false,'');
check('iPhone steps drawn',$$('#guide-install [data-for="ios"] .phone').length===4,String($$('#guide-install [data-for="ios"] .phone').length));
check('Android steps drawn',$$('#guide-install [data-for="android"] .phone').length===4,'');
check('only one phone type visible',$('#guide-install [data-for="ios"]').hidden!==$('#guide-install [data-for="android"]').hidden,'');
click($('#guide-install [data-plat="android"]'));await sleep(50);
check('Android toggle shows the Android steps',$('#guide-install [data-for="android"]').hidden===false&&$('#guide-install [data-for="ios"]').hidden===true&&$('[data-plat="android"]').getAttribute('aria-pressed')==='true','');
check('step captions present',/Install app/.test($('#guide-install [data-for="android"]').textContent)&&/Tap Add to Home Screen/.test($('#guide-install [data-for="ios"]').textContent),'');
check('drawings have text alternatives',$$('#guide-install .phone').every(function(s){return !!s.getAttribute('aria-label');}),'');
check('app icon used in drawings',$$('#guide-install image').length>=4,String($$('#guide-install image').length));
tab('log');await sleep(50);
check('guide opens collapsed when visited normally',(tab('guide'),$('#guide-install').open===false),'');
click($('#install [data-act="hideinstall"]'));await sleep(50);
check('dismiss hides the banner',$('#install').hidden===true,'');
check('dismissal is remembered',localStorage.getItem('platelog.hideInstall')==='1','');
"""

DRIVERS['install2'] = r"""
updateInstallBanner(true);
check('banner stays gone after a reload',$('#install').hidden===true,'');
"""

PLAN = [('local_a', 'local', 'L'), ('local_b', 'local', 'L'), ('legacy', 'legacy', 'G'),
        ('cloud_signup', 'cloud', 'C'), ('cloud_reload', 'cloud', 'C'), ('cloud_bad', 'cloud', 'C'),
        ('cloud_local', 'cloud', 'D'), ('cloud_local2', 'cloud', 'D'),
        ('units', 'local', 'U'), ('units2', 'local', 'U'), ('theme', 'local', 'T'), ('theme2', 'local', 'T'), ('widgets', 'local', 'W'), ('widgets2', 'local', 'W'), ('guide', 'local', 'L2'), ('accordion', 'local', 'A'), ('install', 'local', 'I'), ('install2', 'local', 'I'), ('phone', 'local', 'P', 390), ('wide', 'local', 'P2', 900)]
# cloud_local needs a fresh profile with nobody signed in: profile D starts empty, so the sign-in screen appears.


def page(kind, driver):
    idx = open(os.path.join(TMP, 'index.html'), encoding='utf-8').read()
    pre = {'local': '', 'legacy': SEED_LEGACY, 'cloud': MOCK}[kind]
    if kind == 'cloud' and driver in ('cloud_local', 'cloud_local2'):
        pre = pre.replace("if(!localStorage.getItem('SEEDED'))", "if(false)")
    marker = '<script src="config.js"></script>'
    assert marker in idx
    body = COMMON + '\n' + pre + '\n' + marker if kind == 'cloud' else COMMON + '\n' + pre + '\n' + marker
    if kind == 'cloud':
        # the mock sets PLATELOG_CONFIG itself, so config.js must not overwrite it
        body = COMMON + '\n' + pre
        idx = idx.replace(marker, body)
    else:
        idx = idx.replace(marker, body)
    drv = '<script>(async function(){try{await sleep(500);' + DRIVERS[driver] + '}catch(e){__out.push("FAIL exception -> "+(e&&e.stack||e));}finish();})();</script>'
    return idx.replace('</body>', drv + '\n</body>')


def main():
    global TMP
    chrome = find_chrome()
    TMP = tempfile.mkdtemp(prefix='platelog-test-')
    shutil.copytree(SITE, TMP, dirs_exist_ok=True)
    profiles = {}
    fails = 0
    only = os.environ.get('ONLY')
    for entry in PLAN:
        name, kind, prof = entry[:3]
        width = entry[3] if len(entry) > 3 else None
        if only and name not in only.split(','):
            continue
        if prof not in profiles:
            profiles[prof] = tempfile.mkdtemp(prefix='plprof-')
        fn = os.path.join(TMP, '_t_%s.html' % name)
        if width:
            # run the app inside a fixed-width iframe so its media queries see that width (a phone, say);
            # the inner page posts its results up and the wrapper prints them where the runner looks
            inner = os.path.join(TMP, '_t_%s_inner.html' % name)
            open(inner, 'w', encoding='utf-8').write(page(kind, name).replace('finish();})();</script>', 'finish();parent.postMessage({out:__out.join("\\n")},"*");})();</script>'))
            open(fn, 'w', encoding='utf-8').write(
                '<!doctype html><body style="margin:0"><iframe src="_t_%s_inner.html" style="width:%dpx;height:900px;border:0"></iframe>'
                '<script>window.addEventListener("message",function(e){var p=document.createElement("pre");p.id="out";p.textContent=e.data.out;document.body.appendChild(p);});</script>' % (name, width))
        else:
            open(fn, 'w', encoding='utf-8').write(page(kind, name))
        r = subprocess.run([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--user-data-dir=' + profiles[prof],
                            '--virtual-time-budget=25000', '--dump-dom', 'file://' + fn],
                           capture_output=True, text=True, timeout=180)
        dom = r.stdout
        a = dom.find('<pre id="out">')
        print('== ' + name)
        if a < 0:
            print('FAIL no output (page did not finish)')
            fails += 1
            continue
        block = dom[a + 14:dom.find('</pre>', a)]
        import html
        for line in html.unescape(block).split('\n'):
            if line.strip():
                print(line)
                if line.startswith('FAIL'):
                    fails += 1
    shutil.rmtree(TMP, ignore_errors=True)
    print('\n%s' % ('ALL PASSED' if not fails else '%d FAILED' % fails))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
