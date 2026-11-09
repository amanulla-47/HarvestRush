import assert from 'node:assert/strict';
import { updateHeroMotion, pickupPose, salePose } from '../src/animation.mjs';
const idle={x:40,y:80,bob:0,face:1};
updateHeroMotion(idle,{x:1,y:0},215,1/60);
assert.ok(idle.stride>0&&idle.stride<1,'Stride eases in');
assert.equal(idle.x,40);assert.equal(idle.y,80,'Visual easing never moves the player');
for(let i=0;i<60;i++)updateHeroMotion(idle,{x:1,y:0},215,1/60);
assert.ok(idle.stride>.99);
updateHeroMotion(idle,{x:-1,y:0},215,1/60);
assert.equal(idle.face,-1);assert.equal(idle.turnT,.12);
updateHeroMotion(idle,{x:.1,y:.8},215,1/60);
assert.equal(idle.face,-1,'Small horizontal joystick drift cannot flip the hero');
for(let i=0;i<30;i++)updateHeroMotion(idle,{x:0,y:0},215,1/60);
assert.equal(idle.stride,0);assert.ok(Math.abs(Math.sin(idle.bob))<.001,'Feet settle into a planted pose');
for(const hz of [30,50,120]){
 const a={bob:0,face:1};for(let i=0;i<hz;i++)updateHeroMotion(a,{x:1,y:0},215,1/hz);
 assert.ok(Math.abs(a.bob-12)<1e-9,'Gait speed is independent of refresh rate');
}
const item={fx:100,fy:150,fh:-8,t:0},target={x:260,y:70};
assert.equal(pickupPose(item,target).x,100);
const lifted=pickupPose({...item,t:.2},target);
assert.equal(lifted.x,100);assert.ok(lifted.y<142,'Crop lifts before it travels');
const landed=pickupPose({...item,t:1},target);
assert.equal(landed.x,260);assert.equal(landed.y,70);assert.equal(landed.size,16);
assert.equal(pickupPose({...item,t:-.1},target).alpha,0,'Delayed bonus crops do not appear early');
const f={x:10,y:30,h:-20,tx:300,ty:100,th:-60,t:1};
const sold=salePose(f);assert.equal(sold.x,300);assert.ok(Math.abs(sold.y-40)<1e-9);assert.equal(sold.alpha,0);
assert.ok(Math.abs(salePose({...f,t:.5}).rotation)<.3,'Produce does not spin while selling');
console.log('Passed: responsive input, eased gait and turns, refresh-independent motion, soil lift, basket landing, restrained sale transfer.');
