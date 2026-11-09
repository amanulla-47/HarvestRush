// Guard the cached hero path against repeated main-canvas outline compositing.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
let mainDraws=0,bodyPaints=0;
const offscreen=()=>({setTransform(){},clearRect(){},drawImage(){},fillRect(){}});
const c={document:{createElement:()=>({width:0,height:0,getContext:offscreen})},
  CH_W:130,CH_H:150,CH_OX:65,CH_OY:108,
  ctx:{getTransform:()=>({a:1,b:0}),drawImage(){mainDraws++;}},
  time:1,frameNo:1,HERO_GHOST:{},gearLv:()=>1,storyStage:()=>4,STAMP_OFF:false,
  drawFarmer(){bodyPaints++;}};
vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('const HERO_SIG ='),source.indexOf('// when a tree, building or farmer')),c);
const hero={x:100,y:100,face:1,carry:[],moving:false},look={};
c.drawHeroOutlined(hero,look,1.38,8);
assert.equal(mainDraws,1);assert.equal(bodyPaints,1);
mainDraws=0;c.drawHeroOutlined(hero,look,1.38,8);
assert.equal(mainDraws,1);assert.equal(bodyPaints,1,'An unchanged pose reuses the cached body');
hero.carry.push({ci:1,t:1});mainDraws=0;
c.drawHeroOutlined(hero,look,1.38,8);
assert.equal(mainDraws,1);assert.equal(bodyPaints,2,'New cargo must repaint the cached composite');
hero.face=-1;c.drawHeroOutlined(hero,look,1.38,8);
assert.equal(bodyPaints,3,'Direction changes must repaint the cached composite');
console.log('Passed: one hero draw per frame, unchanged-pose reuse, cargo and direction invalidation.');
