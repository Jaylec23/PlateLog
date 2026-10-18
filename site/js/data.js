/* Plate Log: built-in data: slots, ready-made splits, exercise library. Classic script, shares one global scope with the other files (see docs/ARCHITECTURE.md for load order). */
'use strict';

/* ---------- plan ---------- */
var SLOT_IDS=['upperA','lowerA','upperB','lowerB','extra','day6'];
var STACK_ORDER=['upperA','lowerA','upperB','extra','lowerB','day6'];
var LEGACY_NAME={upperA:'Upper A',lowerA:'Lower A',upperB:'Upper B',lowerB:'Lower B',extra:'Extra day',day6:'Day 6'};
var PLAN={
  upperA:[['Bench press','4 × 4–6'],['Barbell row','4 × 6–8'],['Overhead press','3 × 6–8'],['Lat pulldown','3 × 6–10'],['Lateral raise','3 × 12–15'],['Tricep pushdown','2 × 8–12'],['Bar curl','2 × 8–12']],
  lowerA:[['Squat','4 × 4–6'],['Romanian deadlift','3 × 6–8'],['Leg press','3 × 8–10'],['Leg curl','3 × 8–12'],['Standing calf raise','4 × 8–12'],['Hanging leg raise','3 × 10']],
  upperB:[['Incline press','4 × 6–10'],['Seated cable row','4 × 8–10'],['Neutral-grip pulldown','3 × 8–12'],['Cable fly','3 × 12–15'],['Face pull','3 × 15'],['Overhead tricep extension','3 × 10–12'],['Hammer curl','3 × 10–12']],
  lowerB:[['Hip thrust','4 × 6–10'],['Bulgarian split squat','3 × 8–10'],['Leg extension','3 × 12–15'],['Leg curl','3 × 10–12'],['Seated calf raise','3 × 12–15'],['Cable crunch','3 × 12']],
  extra:[['Lateral raise','3 × 12–15'],['Rear delt fly','3 × 12–15'],['Bar curl','3 × 10–12'],['Tricep pushdown','3 × 10–12'],['Ab work','3 × 12']]
};
var MAIN_LIFTS=['bench press','squat','barbell row','overhead press','romanian deadlift','hip thrust'];

var DEF={};
Object.keys(PLAN).forEach(function(k){
  DEF[k]=PLAN[k].map(function(p){
    var m=/(\d+)\s*×\s*(\d+)(?:–(\d+))?/.exec(p[1]);
    return {name:p[0],sets:+m[1],lo:+m[2],hi:m[3]?+m[3]:+m[2]};
  });
});
function fmtTarget(sets,lo,hi){
  if(!(lo>0))return sets+' sets';
  return sets+' × '+lo+(hi>lo?'–'+hi:'');
}

/* ---------- ready-made splits and exercise library ---------- */
function X(list){return list.map(function(p){var m=/(\d+)\s*×\s*(\d+)(?:–(\d+))?/.exec(p[1]);return {name:p[0],sets:+m[1],lo:+m[2],hi:m[3]?+m[3]:+m[2]};});}
var SPLITS=[
 {id:'ul',name:'Upper / Lower',meta:'4 days a week',
  blurb:'Heavy and volume days for the upper and lower body, plus an optional extra day. A strong all-round choice for strength and steady progress.',
  days:[{name:'Upper A',tag:'Heavy',dow:0,ex:PLAN.upperA},{name:'Lower A',tag:'Heavy',dow:1,ex:PLAN.lowerA},{name:'Upper B',tag:'Volume',dow:3,ex:PLAN.upperB},{name:'Lower B',tag:'Volume',dow:4,ex:PLAN.lowerB},{name:'Extra day',tag:'Optional',dow:5,opt:1,ex:PLAN.extra}]},
 {id:'ppl',name:'Push / Pull / Legs',meta:'3 days a week',
  blurb:'Push (chest, shoulders, triceps), pull (back, biceps) and legs. Each muscle gets one longer session a week. Training more days? The cycle just repeats.',
  days:[
   {name:'Push',tag:'Chest, shoulders, triceps',dow:0,ex:[['Bench press','4 × 5–8'],['Overhead press','3 × 6–10'],['Incline dumbbell press','3 × 8–12'],['Lateral raise','3 × 12–15'],['Cable fly','3 × 12–15'],['Tricep pushdown','3 × 8–12'],['Overhead tricep extension','2 × 10–12']]},
   {name:'Pull',tag:'Back, biceps',dow:2,ex:[['Barbell row','4 × 6–8'],['Lat pulldown','3 × 8–12'],['Seated cable row','3 × 8–12'],['Face pull','3 × 12–15'],['Rear delt fly','2 × 12–15'],['Bar curl','3 × 8–12'],['Hammer curl','2 × 10–12']]},
   {name:'Legs',tag:'Quads, hamstrings, calves',dow:4,ex:[['Squat','4 × 5–8'],['Romanian deadlift','3 × 6–10'],['Leg press','3 × 8–12'],['Leg curl','3 × 10–12'],['Leg extension','3 × 12–15'],['Standing calf raise','4 × 10–15'],['Hanging leg raise','3 × 10–15']]}]},
 {id:'fb',name:'Full Body',meta:'3 days a week',
  blurb:'Three varied whole-body sessions with a rest day between. Great for beginners, busy weeks or easing back in after a break.',
  days:[
   {name:'Full Body A',tag:'',dow:0,ex:[['Squat','4 × 5–8'],['Bench press','4 × 5–8'],['Barbell row','3 × 6–10'],['Lateral raise','2 × 12–15'],['Tricep pushdown','2 × 10–12'],['Hanging leg raise','3 × 10–15']]},
   {name:'Full Body B',tag:'',dow:2,ex:[['Romanian deadlift','3 × 6–8'],['Overhead press','3 × 6–10'],['Lat pulldown','3 × 8–12'],['Leg press','3 × 8–12'],['Bar curl','2 × 8–12'],['Standing calf raise','3 × 10–15']]},
   {name:'Full Body C',tag:'',dow:4,ex:[['Hip thrust','3 × 6–10'],['Incline press','3 × 8–12'],['Seated cable row','3 × 8–12'],['Bulgarian split squat','3 × 8–10'],['Face pull','2 × 12–15'],['Cable crunch','3 × 12–15']]}]},
 {id:'bp',name:'5-Day Body Part',meta:'5 days a week',
  blurb:'Chest, back, shoulders, arms and legs each get their own day. More volume per muscle, best if you can train five days a week.',
  days:[
   {name:'Chest',tag:'',dow:0,ex:[['Bench press','4 × 5–8'],['Incline dumbbell press','3 × 8–12'],['Machine chest press','3 × 8–12'],['Cable fly','3 × 10–15'],['Dip','3 × 8–12']]},
   {name:'Back',tag:'',dow:1,ex:[['Barbell row','4 × 6–8'],['Lat pulldown','3 × 8–12'],['Seated cable row','3 × 8–12'],['Straight-arm pulldown','3 × 10–15'],['Back extension','3 × 10–12']]},
   {name:'Shoulders',tag:'',dow:2,ex:[['Overhead press','4 × 5–8'],['Lateral raise','4 × 10–15'],['Rear delt fly','3 × 12–15'],['Face pull','3 × 12–15'],['Dumbbell shrug','3 × 10–12']]},
   {name:'Arms',tag:'Biceps, triceps',dow:3,ex:[['Bar curl','3 × 8–12'],['Close-grip bench press','3 × 6–10'],['Hammer curl','3 × 10–12'],['Tricep pushdown','3 × 8–12'],['Preacher curl','3 × 10–12'],['Overhead tricep extension','3 × 10–12']]},
   {name:'Legs',tag:'',dow:4,ex:[['Squat','4 × 5–8'],['Romanian deadlift','3 × 6–10'],['Leg press','3 × 8–12'],['Leg curl','3 × 10–12'],['Leg extension','3 × 12–15'],['Standing calf raise','4 × 10–15']]}]}
];
function getSplit(id){for(var i=0;i<SPLITS.length;i++)if(SPLITS[i].id===id)return SPLITS[i];return null;}
function buildSplit(id){
  var sp=getSplit(id)||SPLITS[0];
  return {split:sp.id,days:sp.days.map(function(d,i){return {id:SLOT_IDS[i],name:d.name,tag:d.tag||'',dow:d.dow==null?null:d.dow,optional:!!d.opt,ex:X(d.ex)};})};
}
var LIB=('Bench press|Chest|c;Incline press|Chest|c;Incline dumbbell press|Chest|c;Dumbbell bench press|Chest|c;Machine chest press|Chest|c;Close-grip bench press|Chest|c;Dip|Chest|c;Push-up|Chest|c;Cable fly|Chest|i;Dumbbell fly|Chest|i;Pec deck|Chest|i;Low-to-high cable fly|Chest|i;'+
 'Barbell row|Back|c;Dumbbell row|Back|c;Seated cable row|Back|c;Chest-supported row|Back|c;T-bar row|Back|c;Machine row|Back|c;Lat pulldown|Back|c;Neutral-grip pulldown|Back|c;Pull-up|Back|c;Chin-up|Back|c;Assisted pull-up|Back|c;Straight-arm pulldown|Back|i;Back extension|Back|i;Deadlift|Back|c;Rack pull|Back|c;Barbell shrug|Back|i;Dumbbell shrug|Back|i;'+
 'Overhead press|Shoulders|c;Seated dumbbell press|Shoulders|c;Arnold press|Shoulders|c;Machine shoulder press|Shoulders|c;Push press|Shoulders|c;Upright row|Shoulders|c;Lateral raise|Shoulders|i;Cable lateral raise|Shoulders|i;Rear delt fly|Shoulders|i;Face pull|Shoulders|i;Front raise|Shoulders|i;'+
 'Bar curl|Biceps|i;Dumbbell curl|Biceps|i;Hammer curl|Biceps|i;Incline dumbbell curl|Biceps|i;Preacher curl|Biceps|i;Cable curl|Biceps|i;Reverse curl|Biceps|i;'+
 'Tricep pushdown|Triceps|i;Rope pushdown|Triceps|i;Overhead tricep extension|Triceps|i;Skull crusher|Triceps|i;Tricep kickback|Triceps|i;Bench dip|Triceps|c;'+
 'Squat|Quads|c;Front squat|Quads|c;Hack squat|Quads|c;Smith machine squat|Quads|c;Leg press|Quads|c;Bulgarian split squat|Quads|c;Walking lunge|Quads|c;Goblet squat|Quads|c;Step-up|Quads|c;Leg extension|Quads|i;'+
 'Romanian deadlift|Hamstrings|c;Stiff-leg deadlift|Hamstrings|c;Good morning|Hamstrings|c;Leg curl|Hamstrings|i;Seated leg curl|Hamstrings|i;Nordic curl|Hamstrings|i;'+
 'Hip thrust|Glutes|c;Glute bridge|Glutes|c;Sumo deadlift|Glutes|c;Cable kickback|Glutes|i;Hip abduction machine|Glutes|i;'+
 'Standing calf raise|Calves|i;Seated calf raise|Calves|i;Leg press calf raise|Calves|i;Donkey calf raise|Calves|i;'+
 'Hanging leg raise|Core|i;Cable crunch|Core|i;Plank|Core|i;Side plank|Core|i;Ab wheel rollout|Core|i;Russian twist|Core|i;Decline sit-up|Core|i;Pallof press|Core|i;Ab work|Core|i;'+
 'Kettlebell swing|Full body|c;Farmer’s carry|Full body|c;Thruster|Full body|c;Sled push|Full body|c').split(';').map(function(r){var a=r.split('|');return {n:a[0],g:a[1],k:a[2]};});
var CHIPS=[['All',null],['Chest',['Chest']],['Back',['Back']],['Shoulders',['Shoulders']],['Arms',['Biceps','Triceps']],['Legs',['Quads','Hamstrings','Glutes','Calves']],['Core',['Core','Full body']]];

