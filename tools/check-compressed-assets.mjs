// Pin the pixel/font-equivalence proof to the exact source and shipped bytes.
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('assets/optimized-assets.json',root),'utf8'));
const source=readFileSync(new URL('index.html',root),'utf8'),metadata=JSON.parse(source.match(/const ATLAS_META=(.*);/)[1]);
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(manifest.atlases.length,4);assert.equal(manifest.fonts.length,5);
for(const e of [...manifest.atlases,...manifest.fonts]){
 const input=readFileSync(new URL(e.source,root)),output=readFileSync(new URL(e.production,root));
 assert.equal(hash(input),e.sourceSha256,`Original changed: reverify ${e.source}`);
 assert.equal(hash(output),e.productionSha256,`Compressed asset changed: reverify ${e.production}`);
 assert.equal(output.length,e.productionBytes);assert.ok(output.length<input.length);
 assert.ok(source.includes(e.production));assert.ok(!source.includes(e.source),`Runtime must use optimized ${e.production}`);
 if(e.production.endsWith('.webp')){
  assert.equal(output.toString('ascii',0,4),'RIFF');assert.equal(output.toString('ascii',8,12),'WEBP');
  let pos=12,lossless=false;while(pos+8<=output.length){const tag=output.toString('ascii',pos,pos+4),n=output.readUInt32LE(pos+4);if(tag==='VP8L')lossless=true;assert.notEqual(tag,'VP8 ','Lossy WebP is forbidden');pos+=8+n+(n%2);}
  assert.ok(lossless&&e.pixelIdentical&&e.iccProfileUnchanged);assert.equal(metadata[e.production].width,e.width);assert.equal(metadata[e.production].height,e.height);
 }else{assert.equal(output.toString('ascii',0,4),'wOF2');assert.ok(e.outlinesAndHintsIdentical&&e.metricsAndCoverageIdentical&&e.otherFontTablesIdentical);}
 if(process.argv.includes('--package')){
  assert.equal(hash(readFileSync(new URL('dist/crazygames/'+e.production,root))),e.productionSha256);
  assert.ok(!existsSync(new URL('dist/crazygames/'+e.source,root)),`Do not ship duplicate originals: ${e.source}`);
 }
}
console.log('Passed: 4 exact lossless WebP atlases, 5 complete WOFF2 fonts, verified equivalence hashes, dimensions and production references'+(process.argv.includes('--package')?', and no duplicate originals in package.':'.'));
