// Exercise actual startup/render functions without granting canvas pixel-read access.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const atlasSource=source.slice(source.indexOf('const ATLAS_META='),source.indexOf('async function loadPaintedArt'));
function atlasFixture(mode='loaded'){
  let timer;
  const doc={documentElement:{dataset:{}},createElement(){throw Error('Pixel reads must not be needed');}};
  const context={document:doc,console,Image:class{
    set src(path){const m=JSON.parse(source.match(/const ATLAS_META=(.*);/)[1])[path];
      this.width=m.width;this.height=m.height;
      if(mode==='mismatch')this.width++;
      if(mode==='timeout')return;
      queueMicrotask(()=>mode==='failed'?this.onerror():this.onload());
    }
  },setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){},
    stampsClear(){},GROUND:{tiles:new Map()},PLANT_CACHE:new Map(),FIELD_CACHE:new Map(),OFFER_ART:new Map(),grassTex:null};
  context.console={warn(){}};vm.createContext(context);vm.runInContext(atlasSource,context);
  return {context,timeout:()=>timer()};
}
for(const [path,cols,rows] of [['farm-painted-v1.webp',3,2],['crops-painted-v2.webp',4,2],['props-painted-v1.webp',4,3],['terrain-painted-v1.webp',2,2]]){
  const {context}=atlasFixture(),pack={ready:false,tag:'art'};
  await context.loadPaintedAtlas(pack,'assets/'+path,cols,rows);
  assert.equal(pack.ready,true);assert.equal(pack.rects.length,cols*rows);
  assert.equal(context.document.documentElement.dataset.art,'painted');
}
for(const mode of ['failed','mismatch','timeout']){
  const f=atlasFixture(mode),pack={ready:false,tag:'art'};
  const pending=f.context.loadPaintedAtlas(pack,'assets/farm-painted-v1.webp',3,2);
  if(mode==='timeout')f.timeout();await pending;
  assert.equal(pack.ready,false,'Unavailable atlases leave the vector fallback playable');
}
// Only Three draws gameplay, regardless of old saved/manual rendering preferences.
assert.ok(!source.includes('id="vGfx"')&&!source.includes('id="vRen"'));
assert.ok(!source.includes('function setRenderer(')&&!source.includes('function renderScene('));
const auto=source.slice(source.indexOf('function applyGfx(){'),source.indexOf('function adaptQuality('));
const prefs={S:{settings:{gfx:'high',ren:'classic',music:37,vibe:false}}};
vm.createContext(prefs);vm.runInContext(auto,prefs);prefs.applyGfx();
assert.equal(prefs.S.settings.gfx,'auto');assert.ok(!('ren' in prefs.S.settings));
assert.equal(prefs.S.settings.music,37);assert.equal(prefs.S.settings.vibe,false);
const renderSource=source.slice(source.indexOf('function render(){'),source.indexOf('// ---------- HUD ----------'));
let draws=0,failures=0;
const error=Error('GPU unavailable');
const r={document:{documentElement:{dataset:{}}},THREE_GAME:{active:true,
  render(){draws++;throw error;},fail(e){assert.equal(e,error);failures++;this.active=false;}}};
vm.createContext(r);vm.runInContext(renderSource,r);r.render();r.render();
assert.equal(draws,1);assert.equal(failures,1,'A failed renderer stops drawing without switching renderers');
console.log('Passed: atlas loading and recovery, Three-only rendering, Auto migration preserves other preferences, renderer failure stops safely.');
// Native compressed-image decoding keeps alpha unassociated until the canvas bake.
{
 const f=atlasFixture(),path='assets/farm-painted-v1.webp',meta=JSON.parse(source.match(/const ATLAS_META=(.*);/)[1])[path];
 let fetched=false,decoded=false;
 f.context.fetch=async p=>{assert.equal(p,path);fetched=true;return{ok:true,blob:async()=>({kind:'atlas'})};};
 f.context.createImageBitmap=async(blob,options)=>{assert.equal(blob.kind,'atlas');assert.equal(options.premultiplyAlpha,'none');decoded=true;return{width:meta.width,height:meta.height};};
 const pack={ready:false,tag:'art'};await f.context.loadPaintedAtlas(pack,path,3,2);assert.ok(fetched&&decoded&&pack.ready);
 const retry=atlasFixture();retry.context.fetch=async()=>{throw Error('network unavailable');};retry.context.createImageBitmap=async()=>{throw Error('should not decode');};
 const fallback={ready:false,tag:'art'};await retry.context.loadPaintedAtlas(fallback,path,3,2);assert.ok(fallback.ready,'Legacy image decoding remains available when native bitmap decoding fails');
}
console.log('Passed: unassociated-alpha WebP bitmap decoding and image-loader recovery.');
