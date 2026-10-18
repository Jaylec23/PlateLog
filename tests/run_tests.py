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
click($('#acctMenu [data-unit="lb"]'));await sleep(300);
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
click($('#acctBtn'));click($('#acctMenu [data-unit="kg"]'));await sleep(300);
check('back to kg',$('#w-0-0').value==='100'&&$('#w-0-1').value==='61.235',$('#w-0-0').value+' / '+$('#w-0-1').value);
check('kg pressed state shown',$('#acctMenu [data-unit="kg"]').getAttribute('aria-pressed')==='true','');
"""

DRIVERS['guide'] = r"""
tab('guide');await sleep(100);
check('guide tab opens',!$('#panel-guide').hidden&&$('#tab-guide').getAttribute('aria-selected')==='true','');
check('guide has sections',$$('#panel-guide .gsec').length>=5,String($$('#panel-guide .gsec').length));
check('first section open',$('#panel-guide .gsec').open===true,'');
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
check('title stays on one line',$('h1').getBoundingClientRect().height<50,String($('h1').getBoundingClientRect().height));
check('all five tabs fit without scrolling',(function(){var t=$('.tabs');return t.scrollWidth<=t.clientWidth+1;})(),$('.tabs').scrollWidth+' vs '+$('.tabs').clientWidth);
check('menu shows sync status words',/device/.test($('#menuStatus').textContent),$('#menuStatus').textContent);
check('title still on the first row',$('h1').getBoundingClientRect().top<40,String($('h1').getBoundingClientRect().top));
click($('#acctBtn'));await sleep(50);
var m=$('#acctMenu').getBoundingClientRect();
check('menu fits on screen',m.left>=0&&m.right<=vw,JSON.stringify([m.left,m.right]));
click($('#acctBtn'));
stacked('.seg button','session buttons');
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
"""

DRIVERS['wide'] = r"""
var vw=window.innerWidth;
check('wide viewport',vw===900,String(vw));
var b=$('#acctBtn').getBoundingClientRect(),st=$('#status').getBoundingClientRect();
check('account button is top right',b.right>vw-45&&b.top<60,JSON.stringify([b.right,b.top]));
check('status sits left of the button on wide screens',st.right<=b.left&&Math.abs((st.top+st.height/2)-(b.top+b.height/2))<14,JSON.stringify([st.right,b.left]));
check('session buttons share a row',(function(){var r=$$('.seg button').map(function(e){return Math.round(e.getBoundingClientRect().top);});return r.length>=2&&r[0]===r[1];})(),'');
tab('weeks');await sleep(100);
check('Weeks tiles side by side',(function(){var t=$$('#panel-weeks .tile').map(function(e){return Math.round(e.getBoundingClientRect().top);});return t.length===3&&t[0]===t[2];})(),'');
tab('year');await sleep(150);
check('Year tiles side by side',(function(){var t=$$('#panel-year .tile').slice(0,3).map(function(e){return Math.round(e.getBoundingClientRect().top);});return t.length===3&&t[0]===t[2];})(),'');
tab('guide');await sleep(100);
check('guide readable at desktop width',$$('#panel-guide .gsec').length>=5,'');
"""

PLAN = [('local_a', 'local', 'L'), ('local_b', 'local', 'L'), ('legacy', 'legacy', 'G'),
        ('cloud_signup', 'cloud', 'C'), ('cloud_reload', 'cloud', 'C'), ('cloud_bad', 'cloud', 'C'),
        ('cloud_local', 'cloud', 'D'), ('cloud_local2', 'cloud', 'D'),
        ('units', 'local', 'U'), ('units2', 'local', 'U'), ('guide', 'local', 'L2'), ('phone', 'local', 'P', 390), ('wide', 'local', 'P2', 900)]
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
