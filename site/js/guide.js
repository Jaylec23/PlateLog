/* Plate Log: Guide tab. Plain how-to text, no saved data. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- GUIDE ---------- */
function guideSection(title,items,open){
  return '<details class="card gsec"'+(open?' open':'')+'><summary><span class="sechead">'+title+'</span><span class="chev" aria-hidden="true">▾</span></summary>'+
    '<ul>'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></details>';
}
function renderGuide(){
  var el=$('#panel-guide');
  var splitNames=(typeof SPLITS!=='undefined'?SPLITS.map(function(x){return esc(x.name);}).join(', '):'')||'several ready-made splits';
  el.innerHTML=
    '<div class="nav"><span class="lbl">Quick guide</span></div>'+
    '<div class="card gstart"><div class="eyebrow">Your first session</div><ol>'+
      '<li>Open the <b>Log</b> tab and pick the session you are doing today.</li>'+
      '<li>Type the weight and reps for each set. Everything saves by itself.</li>'+
      '<li>Check <b>Weeks</b> and <b>Year</b> any time to see how you are progressing.</li></ol></div>'+
    guideSection('Log',[
      'Each exercise is a drop-down. Tap one to open its sets and tap again to close it, or use <b>Expand all</b> and <b>Collapse all</b>. The line under the name shows how many sets you have done and your top set.',
      'Use the arrows or the date box to choose a day. A tick on a session button means you already logged it that day.',
      'Faded numbers in the boxes are what you lifted last time for the same set. <b>Fill in last</b> copies them across so you only change what is different.',
      'Tap the target next to an exercise (for example <i>4 × 4–6</i>) to change its sets and reps for this session. <b>Apply and save to plan</b> keeps the change.',
      'A yellow <b>Top of range. Add weight</b> tag means every set hit the top of the rep range last time, so go up a little today.',
      '<b>+ Set</b> and <b>− Set</b> change the number of sets, <b>×</b> removes an exercise, and the box at the bottom adds one. Tick <i>Also add to plan</i> to keep it.',
      'The <b>est. 1RM</b> column is a guess at your one rep max: weight × (1 + reps ÷ 30). It only counts sets of 12 reps or fewer.'
    ],true)+
    guideSection('Weeks',[
      'The arrows move between weeks and <b>This week</b> jumps back to now.',
      'A solid session is one you logged. A dashed one is planned for that day: tap it to start.',
      'The totals at the top compare your volume with the week before. Volume is weight × reps added up over every set.'
    ])+
    guideSection('Year',[
      'Until you log a session you see an example with made-up numbers. It is replaced by your own as soon as you log one.',
      '<b>Training days</b> shows every day you trained, coloured by session. <b>Weekly volume</b> shows how much you lifted each week.',
      '<b>Strength</b> charts the estimated one rep max for any exercise you pick. <b>Records</b> lists your heaviest sets.',
      'Hover (or tap) a bar, square or point to see the exact numbers.'
    ])+
    guideSection('Plan',[
      'Pick a split from the dropdown: '+splitNames+', or <b>Custom</b> to build your own. Switching replaces your current days and exercises, but logged sessions are never changed.',
      'Tap a day to open it. Set the usual weekday, then edit exercise names, move them with ↑ ↓, remove them with ×, or search the library to add more.',
      'On a custom split you can rename days, add up to six, and move them around.',
      'Changes apply to sessions you start from then on.'
    ])+
    guideSection('Units, people and your account',[
      '<b>kg or lb:</b> use the <b>kg | lb</b> switch under the person icon at the top right. Your logs are stored in kg and converted on screen, so you can switch whenever you like and nothing is lost.',
      '<b>More than one person:</b> <b>+ Add person</b> under the title gives someone their own logs and plan, handy if you share a device.',
      '<b>Signing in</b> keeps your log in your account so it follows you to any phone or computer. Without an account your log stays in this browser only and is erased if you clear your browser data.',
      '<b>Export all sets (CSV)</b> at the bottom of the page downloads everything as a spreadsheet file, in the unit you have selected.'
    ])+
    guideSection('Put it on your home screen',[
      '<b>iPhone:</b> open the site in Safari, tap the Share button, then <b>Add to Home Screen</b>.',
      '<b>Android:</b> open the site in Chrome, tap the ⋮ menu, then <b>Add to Home screen</b> or <b>Install app</b>.'
    ])+
    '<p class="muted gnote">Read how your data is handled in the <a href="privacy.html">privacy policy</a>.</p>';
}
