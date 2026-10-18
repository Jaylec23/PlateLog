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

PLAN = [('local_a', 'local', 'L'), ('local_b', 'local', 'L'), ('legacy', 'legacy', 'G'),
        ('cloud_signup', 'cloud', 'C'), ('cloud_reload', 'cloud', 'C'), ('cloud_bad', 'cloud', 'C'),
        ('cloud_local', 'cloud', 'D'), ('cloud_local2', 'cloud', 'D')]
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
    for name, kind, prof in PLAN:
        if only and name not in only.split(','):
            continue
        if prof not in profiles:
            profiles[prof] = tempfile.mkdtemp(prefix='plprof-')
        fn = os.path.join(TMP, '_t_%s.html' % name)
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
