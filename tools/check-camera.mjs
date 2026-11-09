import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const camera=source.slice(source.indexOf('function cameraLead(){'),source.indexOf('// ---------- drawing ----------'));
const projection=source.match(/function worldToScreen\(.*\n/)[0];
for(const [W,H] of [[320,568],[390,667],[656,954],[907,510],[1280,720],[1920,1080]]){
 for(const zoom of [.6,.8,1.3]){
  const c={W,H,zoom,TILT:1,CFG:{worldW:2200,worldH:2480},P:{x:1130,y:790},clamp:(v,a,b)=>Math.min(b,Math.max(a,v))};
  vm.createContext(c);vm.runInContext(camera+projection+'\nthis.camera=cam;',c);
  assert.ok(c.worldToScreen(c.P.x,c.P.y+30).y<H/2,'Opening frame keeps the feet above the midpoint');
  for(const y of [30,31,400,790,1200,2100,2449,2450,1200,790,30]){
   c.P.y=y;c.updateCam(1/50);
   const feet=c.worldToScreen(c.P.x,c.P.y+30).y;
   assert.ok(feet<H/2,`Feet stay above centre at ${W}x${H}, zoom ${zoom}, world y ${y}`);
   assert.ok(H/2-feet<=14,'The hero stays close to the centre, without a large framing offset');
   for(const dpr of [1,1.5,2])for(const shake of [-2,0,2]){
    const snapped=(H/2-Math.round(dpr*(H/2-(c.camera.y+shake)*zoom))/dpr)/zoom;
    assert.ok(H/2+(c.P.y+30-snapped)*zoom<=H/2,'Pixel snapping and small camera shakes preserve framing');
   }
  }
  c.P.y=900;c.updateCam(0);const before=c.worldToScreen(c.P.x,c.P.y+30).y;
  c.P.y+=1;c.updateCam(0);assert.ok(Math.abs(c.worldToScreen(c.P.x,c.P.y+30).y-before)<1e-9,'A one-unit movement follows immediately');
  c.P.x=30;c.updateCam(0);assert.ok(Number.isFinite(c.camera.x));
  assert.ok(c.camera.x>=Math.min(W/2/zoom,1100),'Horizontal world bounds are retained');
 }
}
console.log('Passed: hero above midpoint at startup, mobile/desktop sizes, map edges, both directions, pixel snapping, shake and immediate vertical follow.');
