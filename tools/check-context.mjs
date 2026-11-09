import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('const COACH='),source.indexOf('function guideTarget(){'));
const c={S:{quest:3,fields:[{unlocked:true,plots:[{x:30,y:40,sown:true,t:1}]}]},
 P:{carry:[],moving:false},time:0,running:true,storyOpen:false,document:{hidden:false},
 inTut:()=>c.S.quest<3,capOf:()=>8,goalTarget:()=>({x:30,y:40}),tutTarget:()=>({x:20,y:25}),RUG:()=>({x:100,y:100}),giftReady:()=>false,
 getOffer:()=>c.offer||null,noticeUntil:0,performance:{now:()=>c.time*1000},pads:[],BARN:{x:500,y:500},dist:(x,y,a,b)=>Math.hypot(x-a,y-b),addEventListener(){}};
vm.createContext(c);vm.runInContext(helper+'\nthis.coach=COACH;',c);
function tick(dt){c.time+=dt;c.updateCoach(dt);}
assert.equal(c.navigationTarget(),null,'Normal play after teaching has no route');
tick(17);assert.equal(c.navigationTarget(),null);assert.equal(c.contextualHint(),'','No reminder before the idle threshold');
tick(1);assert.equal(c.navigationTarget().x,30,'Idle help briefly enables a route');assert.match(c.contextualHint(),/ripe crops/);assert.equal(c.S.quest,3,'Reminders never restart the tutorial');
c.noteActivity();assert.equal(c.navigationTarget(),null,'Resuming play hides the idle route');assert.equal(c.contextualHint(),'','Input dismisses the idle reminder');
tick(18);assert.equal(c.contextualHint(),'','Idle reminders have a cooldown');
c.P.carry=Array(8).fill({ci:0});tick(.01);assert.equal(c.navigationTarget().x,100,'Full-bag help directs to market');assert.match(c.contextualHint(),/Basket full/);
tick(7);assert.equal(c.navigationTarget(),null,'Routes expire even if the bag stays full');assert.equal(c.contextualHint(),'','Full-bag reminders expire instead of staying open');
c.P.carry.length=7;tick(.01);c.P.carry.length=8;tick(.01);assert.equal(c.contextualHint(),'','A quick refill does not spam another reminder');
c.P.carry=[];c.P.moving=true;tick(30);c.P.moving=false;c.goalTarget=()=>({x:100,y:100});
tick(18);assert.match(c.contextualHint(),/market/);c.noteActivity();
c.S.quest=1;c.P.carry=Array(8).fill({ci:0});tick(30);assert.equal(c.navigationTarget().x,20,'Tutorial directions stay available throughout teaching');assert.equal(c.contextualHint(),'','Teaching uses the tutorial card rather than duplicate reminders');
c.S.quest=3;c.document.hidden=true;const idle=c.coach.idle;tick(60);assert.equal(c.navigationTarget(),null);assert.equal(c.coach.idle,idle,'Hidden tabs do not accumulate idle coaching');

c.document.hidden=false;c.P.carry=[];c.P.moving=false;c.offer={};tick(60);
assert.equal(c.contextualHint(),'','Offer cards defer reminders without consuming an unseen tip');
c.offer=null;tick(17);assert.equal(c.contextualHint(),'');tick(1);assert.ok(c.contextualHint());

// Daylight remains fixed even when an old debug URL or benchmark requests night.
const n={time:0,BENCH:{nFix:1}};vm.createContext(n);
vm.runInContext(source.slice(source.indexOf('const NIGHT_ENABLED ='),source.indexOf('const FLIES =')),n);
for(const t of [0,120,180,239,240,900,36000]){n.time=t;assert.equal(n.nightAmt(),0);}
console.log('Passed: tutorial directions, quiet post-tutorial play, short full-bag/idle routes, expiry, input dismissal, cooldowns, pauses and daylight.');
