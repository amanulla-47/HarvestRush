// Economic and notification regressions, using the actual game functions.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const saleSource=source.slice(source.indexOf('function sell('),source.indexOf('function spawnHand('));
function saleFixture({first=false,combo=0}={}){
  const notices=[], flights=[];let coins=0;
  const P={carry:[],bestCombo:combo,x:0,y:0};
  const S={firstSale:!first,coins:0,total:0,sold:0};
  const c={P,S,time:1,completeOpeningSale:()=>0,CROPS:[{em:'carrot'}],priceOf:()=>2,fmt:String,
    say(){},keeperSay:null,MEERA_LINES:[[]],storyStage:()=>0,
    orderSold(){},fliers:[],basketX:()=>0,basketH:()=>0,
    MARKET:{x:0,y:0,h:0},parts:[],COL:{gold:"#ffd23f"},SFX:{coin(){coins++;}},
    banner:(...args)=>notices.push(args),flyCoinToHud:()=>flights.push(1)};
  vm.createContext(c);vm.runInContext(saleSource,c);
  return {c,P,S,notices,flights,coins:()=>coins,sellBasket(n=8){
    P.carry=Array.from({length:n},()=>({ci:0}));
    while(P.carry.length)c.sell(P,P.carry.pop(),0,0);
    assert.equal(coins,flights.length,"No extra coin sounds during item transfer");
    for(const f of c.fliers)c.finishSaleFlight(f);c.fliers.length=0;
  }};
}
for(const [options,expected] of [[{first:true},48],[{combo:6},18.88],[{first:true,combo:6},56.64]]){
  const f=saleFixture(options);f.sellBasket();
  assert.ok(Math.abs(f.S.coins-expected)<1e-8,'Every crop, including the last, receives its basket bonus');
  assert.equal(f.notices.length,1,'One sale summary per basket');
  assert.equal(f.flights.length,1,'One wallet flight per basket');assert.equal(f.coins(),1,'One coin sound when the final transfer lands');
  assert.equal(f.P.bestCombo,0);assert.equal(f.P.firstBasket,false);
  f.sellBasket(1);assert.ok(Math.abs(f.S.coins-expected-2)<1e-8,'Bonuses do not leak into the next basket');
}
const worker=saleFixture({combo:10});
worker.c.sell({carry:[],y:0},{ci:0},0,0);
assert.equal(worker.S.coins,2);assert.equal(worker.P.bestCombo,10);
assert.equal(worker.notices.length,0,'Workers never generate sale notifications');

let now=0, expire;
const node={textContent:'',classList:{add(){},remove(){}}};
const n={performance:{now:()=>now},$:()=>node,clearTimeout(){},setTimeout:fn=>{expire=fn;return 1;}};
vm.createContext(n);
vm.runInContext(source.slice(source.indexOf('let noticeTimer='),source.indexOf('// ---------- gameplay ----------')),n);
n.banner('Farm level 2',3);n.banner('Basket sold',0);
assert.equal(node.textContent,'Farm level 2','Routine feedback cannot replace a milestone');
now=3300;expire();n.banner('Basket sold',0);
assert.equal(node.textContent,'Basket sold','Routine feedback resumes after the milestone');
console.log('Passed: first-basket/combo economics, next-basket reset, quiet worker sales, single sale feedback, notification priority.');
