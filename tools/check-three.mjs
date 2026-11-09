import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SpriteRenderer } from '../src/three-renderer.mjs';

// Exercise batching and resource lifetime using real Three geometry/texture types.
// A browser smoke test additionally exercises the actual WebGL2 draw path.
const gpu=Object.create(SpriteRenderer.prototype);
Object.assign(gpu,{
  _active:true,_visible:true,_frame:1,_time:0,_batchCount:0,_pool:[],
  _entries:new Set(),_cache:new WeakMap(),_counts:{draws:0,sprites:0,textures:0,uploads:0},
  _nightTint:new THREE.Vector3(1,1,1),_view:{left:100,top:200,zoom:2},scene:new THREE.Scene(),
});
const image={width:128,height:64},other={width:64,height:64};
gpu.sprite({image,x:0,y:0,w:32,h:32});gpu.sprite({image,x:40,y:0,w:32,h:32});
assert.equal(gpu._batchCount,1,'Adjacent atlas sprites must share a draw batch');
assert.equal(gpu._pool[0].geometry.isInstancedBufferGeometry,true);
assert.equal(gpu._pool[0].count,2);
gpu.sprite({image:other,x:0,y:0});gpu.sprite({image,x:0,y:0});
assert.equal(gpu._batchCount,3,'A texture change must preserve painter order rather than reorder transparent layers');
assert.equal(gpu._entries.size,2,'A source image is uploaded once, even across batches');
const cached=gpu._cache.get(image),version=cached.texture.version;
gpu._texture(image,128,64);assert.equal(cached.texture.version,version,'Static textures must not be re-uploaded per frame');
image.glDirty=true;gpu._texture(image,128,64);assert.equal(cached.texture.version,version+1);
gpu.sprite({image,x:20,y:30,w:40,h:20,screen:true});
const batch=gpu._pool.at(-1),data=batch.buffer.array;
assert.equal(data[4],110);assert.equal(data[5],215);assert.equal(data[6],20);assert.equal(data[7],10);
const before=gpu._counts.sprites;gpu.sprite({image,alpha:0});assert.equal(gpu._counts.sprites,before);
gpu.release(image);assert.equal(gpu._entries.size,1);assert.equal(cached.texture.onUpdate,null);
gpu._frame=400;gpu._evict();assert.equal(gpu._entries.size,0,'Unused GPU textures must be disposed');
for(const batch of gpu._pool){batch.geometry.dispose();batch.material.dispose();}
console.log('Passed: Three.js instancing, painter order, static texture reuse, dirty uploads, screen coordinates, alpha rejection, release and eviction.');
