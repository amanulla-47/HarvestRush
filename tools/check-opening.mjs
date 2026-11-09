import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const c={S:{quest:0,sold:1,firstBasketSold:false,coins:0,total:0,sown:0,settings:{gfx:'auto'},fields:[{lv:0}]},
 P:{carry:[],feedbackUntil:0,moving:false},fliers:[],time:1,noticeUntil:0,performance:{now:()=>1000},
 document:{hidden:false},running:true,storyOpen:false,buyUI:{restAt:0,dismissed:false},
 fmt:String,SFX:{levelup(){}},banner(){},save(){},$:()=>({classList:{add(){},remove(){}}}),setTimeout(){}};
c.inTut=()=>c.S.quest<3;
vm.createContext(c);
vm.runInContext(slice('const QUESTS = [','const COL =')+'\nthis.quests=QUESTS;',c);
vm.runInContext(slice('function purchaseBusy(){','function openingTask(){'),c);
vm.runInContext(slice('function completeOpeningSale(){','function checkQuests(){'),c);
vm.runInContext(slice('function checkQuests(){','function checkStory(){'),c);
vm.runInContext(slice('function autoOfferReady(','function inspectOffer(){'),c);
assert.equal(c.quests[0].done(),false,'Selling one crop does not complete a basket');
c.S.firstBasketSold=true;c.fliers.push({player:true});c.checkQuests();assert.equal(c.S.quest,0);
assert.equal(c.autoOfferReady(1000),false,'Transfers block automatic upgrade cards');
c.fliers.length=0;c.P.feedbackUntil=2;c.checkQuests();assert.equal(c.S.quest,0);
c.time=3;c.noticeUntil=2000;c.checkQuests();assert.equal(c.S.quest,0,'Quest feedback waits for the sale summary');
c.noticeUntil=0;c.checkQuests();assert.equal(c.S.quest,2);assert.equal(c.S.coins,35);
c.checkQuests();assert.equal(c.S.coins,35,'A completed step pays once');
c.P.moving=true;c.noticeUntil=99999;c.P.feedbackUntil=99999;c.buyUI.restAt=1000;
assert.equal(c.autoOfferReady(1000),true,'Upgrade cards open immediately, including during movement or notifications');
c.P.moving=false;assert.equal(c.autoOfferReady(1000),true,'No dwell timer delays the card');
c.buyUI.dismissed=true;assert.equal(c.autoOfferReady(1200),false);

c.S.quest=1;c.S.coins=10;assert.equal(c.completeOpeningSale(),20);assert.equal(c.S.quest,2);assert.equal(c.S.coins,30);assert.equal(c.completeOpeningSale(),0,'Old sowing-step saves migrate exactly once');

// A single task model keeps visible instructions and markers in agreement.
const t={S:{quest:0,moved:false,firstSale:false,firstBasketSold:false,coins:0,fields:[{lv:0,cx:40,cy:50}]},
 P:{x:0,y:0,carry:[]},capOf:()=>8,MOBILE:true,nearestRipe:()=>({x:40,y:50}),
 MARKET:{sellX:100,sellY:100,sellR:20},RUG:()=>({x:100,y:100}),
 dist:(x,y,a,b)=>Math.hypot(x-a,y-b),fieldUpCost:()=>35,fmt:String,
 pads:[{type:'field',f:{i:0},x:60,y:70}],activePad:null};
vm.createContext(t);vm.runInContext(slice('function tutorialTask(){','function tutTarget(){'),t);
assert.equal(t.tutorialTask().step,0);assert.match(t.tutorialTask().help,/Drag anywhere/);
assert.equal(t.tutorialTask().target.x,40);
t.P.carry=Array(6).fill({ci:0});assert.equal(t.tutorialTask().step,1);assert.equal(t.tutorialTask().target.x,100);
t.S.firstSale=true;t.P.carry.length=2;assert.equal(t.tutorialTask().step,1,'Partial selling never sends players back to wheat');
t.P.carry=[];t.S.firstBasketSold=true;assert.equal(t.tutorialTask().step,1,'Keep the sale lesson until its transfer and rewards finish');
t.S.quest=2;t.S.coins=53;t.P.carry=[];assert.equal(t.tutorialTask().step,2);assert.equal(t.tutorialTask().target.x,60);
t.activePad=t.pads[0];assert.equal(t.tutorialTask().text,'Upgrade your wheat');assert.equal(t.tutorialTask().target,null,'The marker disappears on arrival instead of covering Ravi');
t.S.fields[0].lv=1;assert.equal(t.tutorialTask().target,null,'Finished tutorial stops adding destinations');

// Unaffordable goals keep a useful harvest/sell direction after the tutorial.
const g={S:{quest:0},P:{carry:[]},inTut:()=>false,capOf:()=>10,giftReady:()=>false,
 QUESTS:[{go:()=>null}],nearestRipe:()=>({x:30,y:40}),RUG:()=>({x:100,y:100})};
vm.createContext(g);vm.runInContext(slice('function goalTarget(){','function drawEdgePointer(){'),g);
assert.equal(g.goalTarget().x,30);g.P.carry=Array(6).fill({ci:0});assert.equal(g.goalTarget().x,100);
g.P.carry.length=1;g.nearestRipe=()=>null;assert.equal(g.goalTarget().x,100);

// Round-trip the real save/load functions during a partially sold first basket.
let stored;
const fields=()=>[{unlocked:true,lv:0,plots:[{t:.75,sown:true}]},{unlocked:false,lv:0,plots:[{t:.4,sown:true}]}];
const s={S:{coins:6,total:6,up:{hands:0},carry:[{ci:0,t:1},{ci:0,t:1}],sound:true,lastTs:0,
 harvested:4,moved:true,sold:2,sown:2,name:'Ravi',pron:'he',partner:'',homeBuilt:false,quest:0,eggs:0,
 firstSale:true,firstBasketSold:false,story:[],debtPaid:false,stallLv:0,season:0,fields:fields(),settings:{gfx:'auto',music:37,vibe:false}},
 P:{firstBasket:true,bestCombo:6,saleTotal:6},noSave:false,saveReady:true,SAVE_KEY:'test',
 store:{set:(k,v)=>stored=v,get:()=>stored},PRON:{he:{}},STORY:[],STALL_UP:[],CROPS:[{},{}],HIRE_MAX:12,FIELD_UP:Array(4),QUESTS:Array(15),CFG:{baseCap:8},spawnHand(){},
 clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),levelFromTotal:()=>({l:1}),applyGfx(){s.S.settings.gfx='auto';}};
vm.createContext(s);vm.runInContext(slice('function save(){','function applyOffline('),s);
stored='existing-progress';s.saveReady=false;s.save();assert.equal(stored,'existing-progress','Closing during startup cannot overwrite existing progress');s.saveReady=true;s.noSave=true;s.save();assert.equal(stored,'existing-progress','Art previews never write progress');s.noSave=false;
s.save();s.P.firstBasket=false;s.P.bestCombo=0;s.P.saleTotal=0;s.S.carry=[];s.S.settings.music=0;s.load();
assert.equal(s.P.firstBasket,true);assert.equal(s.P.bestCombo,6);assert.equal(s.P.saleTotal,6);
assert.equal(s.S.firstBasketSold,false);assert.equal(s.S.carry.length,2);assert.equal(s.S.settings.music,37);
assert.equal(s.S.fields[0].plots[0].t,.75);assert.equal(s.S.fields[1].unlocked,false);
const old=JSON.parse(stored);delete old.firstBasketSold;delete old.sale;stored=JSON.stringify(old);s.load();
assert.equal(s.S.firstBasketSold,true,'Older saves keep their completed first-sale progress');

// Actual pointer/keyboard reset and input normalization.
const i={keys:{d:true,arrowup:true},joy:{on:true,id:4},P:{moving:true,vx:10,vy:20},
 canvas:{releasePointerCapture(){}},buyUI:{id:5,walk:true},buyBtn:{releasePointerCapture(){},querySelector:()=>null},addEventListener(){}};
vm.createContext(i);vm.runInContext(slice('function clearInput(){',"document.addEventListener('touchmove'"),i);
vm.runInContext(slice('function inputVec(){','// ---------- effects ----------'),i);
i.clearInput();assert.equal(i.joy.on,false);assert.equal(i.joy.id,null);assert.equal(i.buyUI.id,null);
assert.equal(i.P.moving,false);assert.equal(i.inputVec().x,0);assert.equal(i.inputVec().y,0);
i.keys.d=true;i.keys.w=true;assert.ok(Math.abs(Math.hypot(i.inputVec().x,i.inputVec().y)-1)<1e-9);
i.clearInput();Object.assign(i.joy,{on:true,ox:100,oy:100,x:103,y:103});assert.equal(i.inputVec().x,0,'Touch dead zone prevents drift');
Object.assign(i.joy,{x:160,y:160});assert.ok(Math.abs(Math.hypot(i.inputVec().x,i.inputVec().y)-1)<1e-9);

// Platform signals are idempotent; saves fall back when portal storage throws.
const events=[];
const platform={CG:{sdk:{game:{loadingStop:()=>events.push('loaded'),gameplayStart:()=>events.push('start'),gameplayStop:()=>events.push('stop')},data:{getItem(){throw Error('offline');},setItem(){throw Error('offline');},removeItem(){throw Error('offline');}}},env:'local',ready:true,loaded:false,playing:false},cgOn:()=>true,
 localStorage:{getItem:()=>"local-progress",setItem:(k,v)=>events.push(v),removeItem:()=>events.push('removed')}};
vm.createContext(platform);vm.runInContext(slice('function cgGameplay(','function cgHappy('),platform);
platform.cgGameplay(true);platform.cgGameplay(true);platform.cgGameplay(false);platform.cgGameplay(false);platform.cgGameplay(true);
assert.deepEqual(events,['loaded','start','stop','start']);
vm.runInContext(slice('const cgData =','// ---------- save / load ----------')+'\nthis.storage=store;',platform);
assert.equal(platform.storage.get('farm'),'local-progress');platform.storage.set('farm','saved');platform.storage.remove('farm');
assert.deepEqual(events.slice(-2),['saved','removed']);

// Gifts and timed orders wait until the five guided steps are complete.
c.S.daily={claimed:false};c.S.quest=4;
vm.runInContext(slice('const giftReady =','function giftValue(')+'\nthis.giftAvailable=giftReady;',c);
assert.equal(c.giftAvailable(),false);c.S.quest=5;assert.equal(c.giftAvailable(),true);
c.S.quest=4;c.S.sold=20;c.order=null;c.orderNext=0;
vm.runInContext(slice('function updateOrder(){','function orderSold('),c);
c.updateOrder();assert.equal(c.order,null,'No competing timed objective during onboarding');

// First steps remain affordable without waiting for passive income or collecting gifts.
const cost=Number(source.match(/FIELD_UP_MUL = \[(\d+)/)[1])*(1*30+5);
let wallet=6*3+c.quests[0].reward+c.quests[1].reward;
assert.ok(wallet>=cost);wallet-=cost;wallet+=c.quests[2].reward+c.quests[3].reward;
assert.ok(wallet>=40,'The carrot unlock follows the first field upgrade and egg reward');
console.log('Passed: complete-basket onboarding, serialized feedback, stationary auto prompts, partial-sale save migration, touch/keyboard reset and affordable early progression.');
