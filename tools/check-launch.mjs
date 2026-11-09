import {readFileSync,statSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),s=readFileSync(new URL('index.html',root),'utf8');
const a=s.indexOf('function cgGameplay(on)'),b=s.indexOf('function cgHappy()',a);
const events=[],c={CG:{ready:false,loaded:false,playing:false,sdk:{game:{loadingStop(){events.push('loaded')},gameplayStart(){events.push('start')},gameplayStop(){events.push('stop')}}}},cgOn:()=>true};
vm.createContext(c);vm.runInContext(s.slice(a,b),c);
c.cgGameplay(true);assert.deepEqual(events,[],'No platform events before the rendered farm');
c.CG.ready=true;c.cgGameplay(false);assert.deepEqual(events,['loaded'],'A hidden or paused launch never emits a false gameplay start');
c.cgGameplay(true);c.cgGameplay(true);c.cgGameplay(false);c.cgGameplay(false);c.cgGameplay(true);
assert.deepEqual(events,['loaded','start','stop','start'],'Only actual gameplay transitions emit SDK events');
c.CG.sdk.game.gameplayStop=()=>{throw Error('SDK unavailable')};assert.doesNotThrow(()=>c.cgGameplay(false));
assert.equal(c.CG.playing,true,'Failed events are retried rather than silently losing the transition');
assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(s),'Fonts must be local');
assert.ok(!/requestFullscreen\s*\(|requestAd\s*\(|requestBanner\s*\(/.test(s),'Basic launch has no custom fullscreen or ads');
for(const m of s.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
 const ref=m[1];if(ref==='https://sdk.crazygames.com/crazygames-sdk-v3.js')continue;
 assert.ok(!/^(https?:|\/)/.test(ref),`Bundle reference must be relative: ${ref}`);
}
for(const f of ['nunito-600.woff2','nunito-700.woff2','nunito-800.woff2','nunito-900.woff2','lilita-one.woff2','Nunito-OFL.txt','LilitaOne-OFL.txt'])assert.ok(statSync(new URL('assets/fonts/'+f,root)).size>1000);
const dir=new URL('dist/crazygames/',root);let count=0,bytes=0;
function walk(p){for(const f of readdirSync(p,{withFileTypes:true})){const path=join(p,f.name);if(f.isDirectory())walk(path);else{count++;bytes+=statSync(path).size;}}}
walk(fileURLToPath(dir));assert.ok(count<=1500);assert.ok(bytes<=20*1024*1024,'Entire launch package meets the stricter mobile initial-size target');
console.log(`Passed: SDK ready/pause/resume lifecycle, local font licenses, relative bundle paths, no ads/fullscreen; ${count} files, ${(bytes/1048576).toFixed(2)} MiB total.`);
