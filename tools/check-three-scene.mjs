import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {groundRoute,segmentClear} from '../src/navigation.mjs';
const source=fs.readFileSync(new URL('../src/farm-three-scene.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
const sprites=[],released=[],poses=[],stamps=[];let errors=0;
const c={window:{},document:{documentElement:{dataset:{}}},canvas:{style:{}},Map,Set,
  updateHeroMotion(){}, showRenderError:()=>errors++, W:800,H:450,dpr:1.5,zoom:.81,cam:{x:1100,y:900},GROUND:{T:320},
  S:{homeBuilt:false,fields:[]},QUAL:{lv:0},TILT:1,time:1,CROP_ART:{ready:true},
  SPR_W:84,SPR_H:108,SPR_OX:42,SPR_OY:80,BASKET_MAX_SHOW:6,
  clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),easeOutBack:x=>x,inView:()=>true,
  sideOf:f=>f.side,buildGroundTile:(i,j,sc)=>({width:320,height:320,i,j,sc}),
  storyStage:()=>8,gearLv:()=>6,drawScarecrow(){},
  drawFarmer:(actor,look,big,cap,part)=>poses.push({part,moving:actor.moving,bob:actor.bob}),
};
c.navigationTarget=()=>c.goalTarget();
vm.createContext(c);vm.runInContext(source+'\nthis.Scene=FarmThreeScene;',c);
const scene=Object.create(c.Scene.prototype);
scene.gpu={sprite:p=>sprites.push(p),release:image=>released.push(image),setVisible:on=>{scene.visible=on;}};
scene.tiles=new Map();scene.cache=new Map();scene.looks=new Map();
scene.fail(Error('context lost'));scene.fail(Error('duplicate'));assert.equal(errors,1);assert.equal(c.document.documentElement.dataset.renderer,'unavailable');
assert.equal(scene.active,false);assert.equal(scene.visible,false);assert.equal(c.canvas.style.opacity,'0');
scene.groundNavigation=()=>{};
scene.failed=false;scene.ground();const first=[...scene.tiles.values()][0].image;
c.zoom=.82;scene.ground();assert.ok(released.includes(first),'An exact ground-scale change invalidates tiles, even inside one sprite-scale bucket');
const f={i:1,lv:0,x0:40,y0:40,w:380,h:268,cx:230,cy:174,side:-1,unlocked:true,plots:[{x:100,y:100,t:1,sown:true,wob:1,pop:1}]};
c.S.fields=[f];scene.stamp=(...args)=>stamps.push(args);scene.shape=()=>{};
scene.bake=()=>({image:{width:30,height:12}});
scene.cropSheet=()=>({image:{width:1428,height:216},cw:84,ch:108});
const fieldLife=scene.fieldLife;scene.fieldLife=()=>{};scene.fields();
const crop=sprites.find(s=>s.w===84&&s.h===108);assert.equal(crop.y,100,'Crop pivot matches the original soil anchor');
assert.ok(sprites.some(s=>s.w===30&&s.y===106),'A fixed soil lip covers the carrot shoulder');
fieldLife.call(scene,f);
const scare=stamps.find(s=>s[0].startsWith('scarecrow|'));
assert.ok(scare,'Scarecrows remain visible on level-one fields');
const scareY=f.y0+f.h*.5+6;assert.ok(scare[2]<=scareY-100&&scare[2]+scare[4]>scareY);
const actor={x:200,y:400,face:1,bob:1,moving:true,carry:[],bsq:.1};
scene.bake=(key,w,h,paint)=>{paint();return{image:{width:w,height:h}};};
scene.actor(actor,{size:1.38},8,true);
assert.equal(poses.find(p=>p.part==='basket').moving,false,'Basket assets are baked in a neutral pose');
assert.equal(poses.find(p=>p.part==='body').moving,true);
assert.equal(actor.x,200);assert.equal(actor.y,400);assert.equal(actor.moving,true);assert.equal(actor.bob,1);
// Restore one small world-space marker at the final destination, not a large
// direction arrow beside Ravi or a marker on an intermediate route corner.
Object.assign(c,{running:true,storyOpen:false,P:{x:200,y:300},goalTarget:()=>({x:450,y:300})});
scene.routeToGoal=()=>{const target=c.goalTarget();return target?[{x:c.P.x,y:c.P.y},{x:300,y:400},target]:[];};
c.document.hidden=false;c.document.getElementById=()=>{throw Error('Destination markers need no HUD layout reads');};
scene.bake=()=>({image:{width:40,height:60}});sprites.length=0;
scene.navigation();assert.equal(sprites.length,1);assert.equal(sprites[0].x,450);
assert.ok(Math.abs(sprites[0].w*c.zoom-22)<1e-9);assert.ok(Math.abs(sprites[0].h*c.zoom-28)<1e-9);assert.ok(!sprites[0].screen);
assert.ok(sprites[0].y>228&&sprites[0].y<232,'The destination arrow hovers above the goal');assert.equal(sprites[0].anchorX,.5);
c.goalTarget=()=>null;scene.navigation();assert.equal(sprites.length,1,'The marker disappears on arrival');
c.storyOpen=true;c.goalTarget=()=>({x:450,y:300});scene.navigation();assert.equal(sprites.length,1);
// The renderer shares its cached world route between the ground line and arrow.
const routedScene=Object.create(c.Scene.prototype);routedScene.frame=1;
Object.assign(c,{groundRoute,segmentClear,running:true,storyOpen:false,P:{x:20,y:100},
 MARKET:{x:115,y:115,w:42,h:130},WM:{x:10000,y:10000},BABA_TREE:{x:11000,y:11000},BARN:{x:12000,y:12000,w:100},
 goalTarget:()=>({x:320,y:100})});
c.S.homeBuilt=false;
const route=routedScene.routeToGoal();assert.ok(route.length>2,'The route bends around the stall');
assert.equal(routedScene.routeToGoal(),route,'World line and screen arrow reuse one route per frame');
routedScene.frame++;c.goalTarget=()=>null;assert.equal(routedScene.routeToGoal().length,0);
console.log('Passed: lost-context reload handling, exact-scale terrain invalidation, crop/soil alignment, scarecrow bounds and neutral basket baking.');
