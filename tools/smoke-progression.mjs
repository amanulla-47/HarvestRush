import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {updateHeroMotion,pickupPose,salePose} from '../src/animation.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf("'use strict';"),html.lastIndexOf('</script>')).replace('boot().catch(showRenderError);','');
function setup(){
 let now=1000,seed=0x1234abcd;const storage=new Map(),elements=new Map();
 const noop=()=>{},gradient={addColorStop:noop};
 const context=new Proxy({measureText:s=>({width:String(s).length*8}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:new Uint8ClampedArray(16)}),createImageData:()=>({data:new Uint8ClampedArray(16)})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 function element(key=''){if(elements.has(key))return elements.get(key);const cls=new Set();const e={id:key,tagName:'DIV',style:{setProperty:noop},dataset:{},children:[],textContent:'',innerHTML:'',value:'',checked:false,offsetWidth:100,width:1280,height:720,classList:{add:(...s)=>s.forEach(v=>cls.add(v)),remove:(...s)=>s.forEach(v=>cls.delete(v)),contains:s=>cls.has(s),toggle:(s,on)=>{const v=on??!cls.has(s);v?cls.add(s):cls.delete(s);return v;}},addEventListener:noop,removeEventListener:noop,append:noop,appendChild:noop,remove:noop,focus:noop,replaceChildren:noop,setAttribute:noop,getContext:()=>context,toDataURL:()=>'',getBoundingClientRect:()=>({x:10,y:10,left:10,top:10,width:100,height:44}),querySelector:s=>element(key+' '+s),querySelectorAll:()=>[],setPointerCapture:noop,releasePointerCapture:noop};elements.set(key,e);return e;}
 const c={console,Math:Object.create(Math),Date,Uint8ClampedArray,Float32Array,Uint16Array,Map,Set,URLSearchParams,Promise,performance:{now:()=>now},location:{search:'',protocol:'http:',hostname:'127.0.0.1'},navigator:{hardwareConcurrency:8,deviceMemory:8,userAgent:'Node smoke test'},innerWidth:1280,innerHeight:720,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:noop,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{hidden:false,querySelector:element,querySelectorAll:()=>[],getElementById:k=>element('#'+k),createElement:tag=>element('created'+Math.random()),addEventListener:noop,documentElement:element('html'),body:element('body'),head:element('head')},Image:class{},HarvestThreeScene:{updateHeroMotion,pickupPose,salePose}};
 c.Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 c.window=c;c.self=c;c.top=c;vm.createContext(c);vm.runInContext(source,c,{timeout:5000});
 vm.runInContext(`S.sound=false;noSave=false;saveReady=true;running=true;storyOpen=false;P.carry=S.carry;
 // Only presentation/audio effects are stubbed; progression, purchases, simulation and saves are real.
 render=()=>{};banner=()=>{};showStrip=()=>{};confetti=()=>{};celebrate=()=>{};addPop=()=>{};burst=()=>{};shock=()=>{};flyCoinToHud=()=>{};hudBump=()=>{};applyGfx=()=>{S.settings.gfx='auto'};
 this.game={S,P,pads,hands,keys,QUESTS,STORY,FIELD_UP,STALL_UP,FIELD_COST,CFG,MARKET,BARN,HOME,DEBT,HOME_COST,
 capOf,handCap,priceOf,padAvail,padCost,fieldUpCost,hireCost,levelFromTotal,updateLevel,updatePlayer,updateCrops,updateHand,harvest,sow,sell,finishSaleFlight,fliers,checkQuests,checkStory,advanceStory,getOffer,tryBuy,buyUI,save,load,applyOffline,idleRate,newSeason,festivalReady,startFestival,updateFestival,giftReady,openGift,checkDaily,collectAway,clearInput,eggs,inspectOffer,tutorialTask,frame,
 step(dt=.05){parts.length=0;time+=dt;updateCrops(dt);updatePlayer(dt);for(const h of hands)updateHand(h,dt);for(const f of fliers){f.t+=dt*2.2;if(f.t>=1)finishSaleFlight(f)}for(let i=fliers.length-1;i>=0;i--)if(fliers[i].t>=1)fliers.splice(i,1);updateLevel();checkQuests();checkStory();},
 settle(){fliers.length=0;P.feedbackUntil=0;noticeUntil=0;},
 select(p){activePad=p;activeBarn=activeStall=false;buyUI.dismissed=false;},
 barn(){activePad=null;activeBarn=true;activeStall=false;buyUI.dismissed=false;},
 stall(){activePad=null;activeBarn=false;activeStall=true;buyUI.dismissed=false;},
 get quest(){return S.quest;},get time(){return time;},get storyOpen(){return storyOpen;},setRunning(v){running=v;},setNoSave(v){noSave=v;},setSaveReady(v){saveReady=v;}};`,c);
 return {g:c.game,c,storage,advance(ms){now+=ms;}};
}

const results=[];
function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);}}
function tick(env,n=60,dt=.05){for(let i=0;i<n;i++){env.advance(dt*1000);env.g.step(dt);}}
test('Fresh harvest → sale → affordable upgrade → tutorial completes once',()=>{
 const env=setup(),g=env.g,f=g.S.fields[0];f.plots.forEach(p=>{p.sown=true;p.t=1;});
 for(let i=0;i<6;i++){g.P.x=f.plots[i].x;g.P.y=f.plots[i].y-10;tick(env,1);}
 assert.ok(g.P.carry.length>=6);assert.equal(g.S.quest,0);g.P.x=g.MARKET.sellX;g.P.y=g.MARKET.sellY;tick(env,100);
 assert.equal(g.P.carry.length,0);assert.equal(g.S.quest,2);assert.ok(g.S.coins>=g.fieldUpCost(f));
 const pad=g.pads.find(p=>p.type==='field'&&p.f===f);g.select(pad);const before=g.S.coins,cost=g.padCost(pad);g.tryBuy();assert.equal(f.lv,1);assert.equal(g.S.coins,before-cost);
 g.settle();g.checkQuests();assert.equal(g.S.quest,3);const rewarded=g.S.coins;g.checkQuests();assert.equal(g.S.coins,rewarded);
});
test('The early egg and carrot goals progress using earned coins',()=>{
 const env=setup(),g=env.g,f=g.S.fields[0];f.plots.forEach(p=>{p.sown=true;p.t=1;});
 for(let i=0;i<6;i++){g.P.x=f.plots[i].x;g.P.y=f.plots[i].y-10;tick(env,1);}g.P.x=g.MARKET.sellX;g.P.y=g.MARKET.sellY;tick(env,100);
 g.select(g.pads[0]);g.tryBuy();g.settle();g.checkQuests();assert.equal(g.S.quest,3);tick(env,160);assert.ok(g.eggs.length>0,'Chickens lay a reachable egg for the next goal');
 const egg=g.eggs[0];g.P.x=egg.x;g.P.y=egg.y-10;tick(env,2);assert.ok(g.S.eggs>0);assert.equal(g.S.quest,4);
 const carrot=g.pads.find(p=>p.type==='field'&&p.f.i===1);assert.ok(g.S.coins>=g.padCost(carrot));g.select(carrot);g.tryBuy();g.settle();g.checkQuests();assert.ok(g.S.fields[1].unlocked);assert.equal(g.S.quest,5);
});
test('A dismissed offer can be deliberately reopened and purchased',()=>{const {g}=setup();g.S.quest=3;g.S.coins=1000;g.select(g.pads[0]);g.buyUI.dismissed=true;g.tryBuy();assert.equal(g.S.fields[0].lv,0);g.inspectOffer();g.tryBuy();assert.equal(g.S.fields[0].lv,1);});
test('Payment pad stays aligned beside the moneylender',()=>{const env=setup();vm.runInContext('this.lender=ML;',env.c);const pad=env.g.pads.find(p=>p.type==="debt");assert.equal(env.c.lender.x,pad.x-90);assert.equal(env.c.lender.y,pad.y+10);});
test('Fractional coin shortfalls never show a misleading zero',()=>{const {g}=setup();g.S.quest=2;g.S.coins=g.fieldUpCost(g.S.fields[0])-.1;assert.equal(g.tutorialTask().help,'1 more coins needed.');});
test('Unaffordable purchases do not spend or upgrade',()=>{const {g}=setup();g.S.quest=3;g.select(g.pads[0]);g.tryBuy();assert.equal(g.S.coins,0);assert.equal(g.S.fields[0].lv,0);});
test('One displayed purchase cannot charge twice before the next frame',()=>{const {g}=setup();g.S.quest=3;g.S.coins=1000;g.select(g.pads.find(p=>p.type==='debt'));g.tryBuy();g.tryBuy();assert.equal(g.S.coins,700);assert.equal(g.S.debtPaid,true);});
test('A stale max-level field offer is harmless',()=>{const {g}=setup();g.S.quest=3;g.S.coins=1e8;g.S.fields[0].lv=g.FIELD_UP.length;g.select(g.pads[0]);assert.equal(g.getOffer(),null);g.tryBuy();assert.equal(g.S.fields[0].lv,g.FIELD_UP.length);});
test('A stale max-level market offer is harmless',()=>{const {g}=setup();g.S.quest=3;g.S.coins=1e8;g.S.stallLv=g.STALL_UP.length;g.stall();assert.equal(g.getOffer(),null);g.tryBuy();assert.equal(g.S.stallLv,g.STALL_UP.length);});
test('Story progress unlocks the first worker without duplicating it',()=>{const {g}=setup();g.S.quest=3;g.S.moved=true;g.S.firstSale=true;g.S.sold=30;g.S.fields[1].unlocked=true;for(let i=0;i<8;i++)g.checkStory();assert.equal(g.S.up.hands,1);assert.equal(g.hands.length,1);for(let i=0;i<8;i++)g.checkStory();assert.equal(g.hands.length,1);});
test('All eight fields unlock in order and every field upgrade reaches its cap',()=>{const {g}=setup();g.S.quest=3;g.S.coins=1e12;
 for(let i=0;i<g.S.fields.length;i++){const f=g.S.fields[i],pad=g.pads.find(p=>p.type==='field'&&p.f===f);assert.ok(g.padAvail(pad));if(i){g.select(pad);g.tryBuy();assert.ok(f.unlocked);}
 while(f.lv<g.FIELD_UP.length){g.select(pad);const before=g.S.coins,cost=g.padCost(pad);g.tryBuy();assert.equal(g.S.coins,before-cost);assert.ok(Number.isFinite(g.priceOf(f.crop)));}assert.equal(g.padAvail(pad),false);}
 assert.ok(g.S.fields.every(f=>f.unlocked&&f.lv===g.FIELD_UP.length));
});
test('All fifteen goals and nine story chapters remain reachable',()=>{
 const {g}=setup();Object.assign(g.S,{coins:1e12,total:1e9,moved:true,sold:100,eggs:1,firstBasketSold:true});
 const settle=()=>{g.settle();for(let i=0;i<20;i++){g.checkQuests();g.checkStory();}};
 const purchase=pad=>{g.select(pad);assert.ok(g.getOffer(),'Expected a reachable offer');g.tryBuy();settle();};
 const field=i=>g.pads.find(p=>p.type==='field'&&p.f.i===i);
 settle();assert.equal(g.S.quest,2);purchase(field(0));assert.equal(g.S.quest,4);
 purchase(field(1));assert.equal(g.S.quest,6);g.stall();g.tryBuy();settle();assert.equal(g.S.quest,7);
 const debt=g.pads.find(p=>p.type==='debt');purchase(debt);assert.equal(g.S.quest,8);
 purchase(field(2));assert.equal(g.S.quest,9);assert.equal(g.S.up.hands,1);g.barn();g.tryBuy();settle();assert.equal(g.S.quest,10);
 purchase(field(0));assert.equal(g.S.quest,11);purchase(field(3));assert.equal(g.S.quest,12);
 purchase(g.pads.find(p=>p.type==='home'));assert.equal(g.S.quest,13);purchase(field(4));purchase(field(5));assert.equal(g.S.quest,14);purchase(field(6));purchase(field(7));
 assert.equal(g.S.quest,g.QUESTS.length);assert.equal(g.S.story.length,g.STORY.length);assert.equal(g.festivalReady(),true);
 const wallet=g.S.coins;settle();assert.equal(g.S.coins,wallet,'Completed goals never pay again');
});
test('Worker and stall purchase caps hold',()=>{const {g}=setup();g.S.quest=3;g.S.story=[0,1,2,3];g.S.coins=1e12;for(let i=0;i<12;i++){g.barn();g.tryBuy();}assert.equal(g.hands.length,12);g.barn();assert.equal(g.getOffer(),null);for(let i=0;i<g.STALL_UP.length;i++){g.stall();g.tryBuy();}assert.equal(g.S.stallLv,g.STALL_UP.length);});
test('Reload preserves field levels, money, crew, tutorial state and partial basket',()=>{const first=setup(),g=first.g;Object.assign(g.S,{coins:1234,total:3000,quest:7,name:'Smoke',debtPaid:true,homeBuilt:true,stallLv:2,story:[0,1,2,3,4],firstSale:true,firstBasketSold:true});g.S.up.hands=2;g.S.fields[0].lv=2;g.S.fields[1].unlocked=true;g.S.carry=g.P.carry=[{ci:0,t:1},{ci:1,t:1}];g.save();const second=setup();for(const [k,v]of first.storage)second.storage.set(k,v);second.g.load();const h=second.g;assert.equal(h.S.coins,1234);assert.equal(h.S.quest,7);assert.equal(h.hands.length,2);assert.equal(h.S.fields[0].lv,2);assert.equal(h.S.fields[1].unlocked,true);assert.equal(h.S.carry.length,2);assert.equal(h.S.homeBuilt,true);assert.equal(h.S.debtPaid,true);assert.equal(h.S.stallLv,2);});
test('Malformed saved array fields cannot crash startup',()=>{const {g,storage}=setup();storage.set('harvestrush_save_v1',JSON.stringify({v:1,carry:{},fields:[],story:[]}));assert.doesNotThrow(()=>g.load());});
test('Workers keep harvesting, sowing and selling without player help',()=>{const env=setup(),g=env.g;g.S.quest=g.QUESTS.length;g.S.story=[0,1,2,3];g.S.coins=10000;g.S.fields[1].unlocked=true;for(let i=0;i<2;i++){g.barn();g.tryBuy();}g.P.x=2000;g.P.y=2000;const before=g.S.coins;tick(env,1600);assert.ok(g.S.sold>0);assert.ok(g.S.sown>0);assert.ok(g.S.coins>before);assert.ok(g.hands.every(h=>h.carry.length<=g.handCap()));});
test('Legacy field levels still migrate from old growth upgrades',()=>{const {g,storage}=setup();storage.set('harvestrush_save_v1',JSON.stringify({v:1,up:{growth:8,hands:0},fields:[{u:true,t:[.5]}],story:[]}));g.load();assert.equal(g.S.fields[0].lv,2);});
test('Offline income caps at eight hours and deferred collection pays once',()=>{const {g}=setup();g.S.up.hands=2;const rate=g.idleRate(),coins=g.S.coins;const earned=g.applyOffline(1e9,true);assert.ok(Math.abs(earned-rate*8*3600*g.CFG.offlineEff)<1e-6);assert.equal(g.S.coins,coins);assert.equal(g.S.pendingAway,earned);g.collectAway();const paid=g.S.coins;assert.ok(Math.abs(paid-coins-earned)<1e-6);g.collectAway();assert.equal(g.S.coins,paid);});
test('Festival resets land/crew and retains the permanent season multiplier',()=>{const {g}=setup();g.S.quest=g.QUESTS.length;g.S.story=g.STORY.map((_,i)=>i);g.S.fields.forEach(f=>{f.unlocked=true;f.lv=4;});g.S.up.hands=2;g.S.stallLv=3;g.S.coins=2e7;assert.equal(g.festivalReady(),true);g.select(g.pads.find(p=>p.type==='festival'));g.tryBuy();const charged=g.S.coins;g.tryBuy();assert.equal(g.S.coins,charged,'Festival initiation cannot charge twice');for(let i=0;i<80;i++)g.updateFestival(.05);assert.equal(g.S.season,1);assert.equal(g.S.coins,100);assert.equal(g.S.fields.filter(f=>f.unlocked).length,1);assert.equal(g.S.fields[0].lv,0);assert.equal(g.S.up.hands,0);assert.equal(g.hands.length,0);assert.equal(g.priceOf(g.S.fields[0].crop),1.5);});
test('Movement covers the same distance at 30, 60, 120, 144 and 165 Hz',()=>{for(const hz of [30,60,120,144,165]){const {g}=setup();g.P.x=1000;g.P.y=1800;g.keys.d=true;for(let i=0;i<hz;i++)g.updatePlayer(1/hz);assert.ok(Math.abs(g.P.x-1215)<1e-7);assert.equal(g.P.y,1800);}});
test('The real frame loop freezes gameplay while paused or hidden',()=>{const {g,c}=setup();g.keys.d=true;const x=g.P.x,t=g.S.fields[0].plots[0].t;g.setRunning(false);g.frame(1500);assert.equal(g.P.x,x);assert.equal(g.S.fields[0].plots[0].t,t);g.setRunning(true);c.document.hidden=true;g.frame(1600);assert.equal(g.P.x,x);assert.equal(g.S.fields[0].plots[0].t,t);});
test('Pausing and clearing input prevents stuck movement and purchases',()=>{const {g}=setup();g.keys.w=true;g.P.moving=true;g.clearInput();assert.equal(g.keys.w,false);assert.equal(g.P.moving,false);g.S.quest=3;g.S.coins=1000;g.select(g.pads[0]);g.setRunning(false);g.tryBuy();assert.equal(g.S.coins,1000);assert.equal(g.S.fields[0].lv,0);});
mkdirSync('dist',{recursive:true});writeFileSync('dist/progression-smoke-report.json',JSON.stringify({checkedAt:new Date().toISOString(),method:'Node VM executing the complete game simulation; DOM/presentation/audio stubbed; controlled state for late-game boundaries',results},null,2)+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
