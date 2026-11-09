import assert from 'node:assert/strict';
import {groundRoute,segmentClear,flowingDots} from '../src/navigation.mjs';
const blocks=[{left:80,right:150,top:50,bottom:180},{left:210,right:280,top:140,bottom:260}];
for(const [start,target] of [[{x:20,y:100},{x:320,y:100}],[{x:320,y:240},{x:20,y:100}],[{x:20,y:300},{x:320,y:300}]]){
 const route=groundRoute(start,target,blocks);
 assert.ok(route.length>=2);assert.deepEqual(route[0],start);assert.deepEqual(route.at(-1),target);
 for(let i=1;i<route.length;i++)assert.ok(segmentClear(route[i-1],route[i],blocks),'The ground route cannot pass through a building');
}
assert.equal(groundRoute({x:0,y:0},null,blocks).length,0);
assert.equal(groundRoute({x:0,y:0},{x:10,y:10},blocks).length,2,'Open ground retains a direct line');
console.log('Passed: ground route reaches the goal and bends around buildings.');

const path=[{x:0,y:0},{x:200,y:0},{x:200,y:200}];
const first=flowingDots(path,.25,70,80),next=flowingDots(path,.35,70,80);
assert.ok(first.length>2);assert.ok(Math.abs(next[0].x-first[0].x-8)<1e-9,'Dots move forward over time');
for(const a of first){
  assert.ok(a.alpha>0&&a.alpha<=1);
  if(a.y===0){assert.equal(a.rotation,0);assert.ok(a.x<200);}
  else{assert.equal(a.x,200);assert.equal(a.rotation,Math.PI/2);assert.ok(a.y<200);}
}
assert.equal(flowingDots([],0).length,0);
assert.equal(flowingDots([{x:1,y:1},{x:1,y:1}],0).length,0);
console.log('Passed: moving ground dots flow toward the goal, turn at corners and stop at the destination.');

const wrapBefore=flowingDots(path,.999,70,70),wrapAfter=flowingDots(path,1.001,70,70);
assert.ok(wrapAfter[0].alpha<.001,'New dots fade in instead of popping at the start');
assert.ok(Math.abs(wrapAfter[1].x-wrapBefore[0].x-.14)<1e-9,'Existing dots move continuously when the phase wraps');
assert.ok(flowingDots(path,0,70,70)[0].alpha===0,'The trail begins transparently at Ravi');
console.log('Passed: seamless arrow-loop motion and soft endpoint fades.');
