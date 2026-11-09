import * as THREE from 'three';

const STRIDE = 18;
const MAX_IDLE = 300;
const clamp01 = n => Math.max(0, Math.min(1, n));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;

const VERTEX = `
precision highp float;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uTime;
attribute vec3 position;
attribute vec4 iRect;
attribute vec2 iPosition;
attribute vec2 iSize;
attribute vec2 iRotation;
attribute vec2 iAnchor;
attribute float iAlpha;
attribute vec3 iTint;
attribute vec2 iWind;
varying vec2 vUV;
varying vec4 vBounds;
varying vec4 vTint;
void main() {
  vec2 local = (position.xy - iAnchor) * iSize;
  // The bottom stays planted; sway is measured in submitted sprite units.
  float tip = 1.0 - position.y;
  local.x += sin(uTime * 1.8 + iWind.y) * iWind.x * tip * tip;
  vec2 world = iPosition + vec2(
    local.x * iRotation.x - local.y * iRotation.y,
    local.x * iRotation.y + local.y * iRotation.x);
  vUV = vec2(iRect.x + position.x * iRect.z,
             1.0 - (iRect.y + position.y * iRect.w));
  vBounds = vec4(iRect.x, 1.0-iRect.y-iRect.w,
                 iRect.x+iRect.z, 1.0-iRect.y);
  vTint = vec4(iTint, iAlpha);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uHalfTexel;
uniform vec3 uNightTint;
varying vec2 vUV;
varying vec4 vBounds;
varying vec4 vTint;
void main() {
  vec2 uv = clamp(vUV, vBounds.xy + uHalfTexel, vBounds.zw - uHalfTexel);
  vec4 c = texture2D(uMap, uv);
  // Encoded PNG bytes stay encoded: no transfer function or tone mapping.
  gl_FragColor = vec4(c.rgb * vTint.rgb * uNightTint, c.a * vTint.a);
}`;

/** Painter-ordered, instanced sprites. Call begin(), sprite()..., then end(). */
export class SpriteRenderer {
  constructor({ before, onContextLost } = {}) {
    if (!before?.parentNode) throw new TypeError('SpriteRenderer requires an attached before canvas');
    this.canvas = before.ownerDocument.createElement('canvas');
    this.canvas.id = 'three-world';
    this.canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
    this.canvas.setAttribute('aria-hidden', 'true');
    this._disposed = false;
    this._lost = false;
    this._visible = true;
    this._frame = 0;
    this._active = false;
    this._size = null;
    this._cache = new WeakMap();
    this._entries = new Set();
    this._pool = [];
    this._batchCount = 0;
    this._counts = { draws: 0, sprites: 0, textures: 0, uploads: 0 };
    this._nightTint = new THREE.Vector3(1, 1, 1);
    this._clear = new THREE.Color();
    this._clearRGB = new THREE.Color();
    this._onLost = event => {
      event.preventDefault();
      this._lost = true;
      this.canvas.style.display = 'none';
      this._active = false;
      onContextLost?.(event);
    };
    this.canvas.addEventListener('webglcontextlost', this._onLost);
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, alpha: false, antialias: false,
        premultipliedAlpha: false, depth: false, stencil: false,
        preserveDrawingBuffer: false,
      });
    } catch (error) {
      this.canvas.removeEventListener('webglcontextlost', this._onLost);
      throw error;
    }
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.renderer.sortObjects = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0.1, 10);
    this.camera.position.z = 1;
    before.parentNode.insertBefore(this.canvas, before);
  }

  begin({ width, height, dpr = 1, zoom = 1, camX = 0, camY = 0,
    night = 0, time = 0, shakeX = 0, shakeY = 0, clearColor = '#93b976' } = {}) {
    if (this._disposed || this._lost) return;
    this._frame++;
    Object.assign(this._counts, { draws: 0, sprites: 0, uploads: 0 });
    this._batchCount = 0;
    for (const batch of this._pool) {
      batch.mesh.visible = false;
      batch.count = 0;
      batch.entry = null;
      batch.material.uniforms.uMap.value = null;
    }
    this._evict();
    width = Math.max(1, finite(width, 1));
    height = Math.max(1, finite(height, 1));
    dpr = Math.max(0.01, finite(dpr, 1));
    zoom = Math.max(0.0001, finite(zoom, 1));
    // The caller already applies the game's quality/DPR caps.
    if (!this._size || width !== this._size.width || height !== this._size.height || dpr !== this._size.dpr) {
      this.renderer.setDrawingBufferSize(width, height, dpr);
      // Match the legacy canvas's rounded physical dimensions.
      const pw = Math.max(1, Math.round(width * dpr));
      const ph = Math.max(1, Math.round(height * dpr));
      if (this.canvas.width !== pw) this.canvas.width = pw;
      if (this.canvas.height !== ph) this.canvas.height = ph;
      this.renderer.setViewport(0, 0, pw / dpr, ph / dpr);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this._size = { width, height, dpr };
    }
    const cx = finite(camX, 0) - finite(shakeX, 0) / zoom;
    const cy = finite(camY, 0) - finite(shakeY, 0) / zoom;
    this._view = { left: cx - width / (2 * zoom), top: cy - height / (2 * zoom), zoom };
    Object.assign(this.camera, {
      left: -width / (2 * zoom), right: width / (2 * zoom),
      top: -height / (2 * zoom), bottom: height / (2 * zoom),
    });
    this.camera.position.set(cx, cy, 1);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this._time = finite(time, 0);
    const n = clamp01(finite(night, 0));
    const warm = Math.min(n * 0.7, 0.35);
    const cool = Math.max(0, (n - 0.5) * 0.8);
    this._nightTint.set(
      (1 + warm * (255 / 255 - 1)) * (1 + cool * (154 / 255 - 1)),
      (1 + warm * (208 / 255 - 1)) * (1 + cool * (147 / 255 - 1)),
      (1 + warm * (138 / 255 - 1)) * (1 + cool * (221 / 255 - 1)),
    );
    // Three converts clear colors to output space; tint in encoded space first.
    this._clear.set(clearColor).getRGB(this._clearRGB, THREE.SRGBColorSpace);
    this._clear.setRGB(
      this._clearRGB.r * this._nightTint.x,
      this._clearRGB.g * this._nightTint.y,
      this._clearRGB.b * this._nightTint.z, THREE.SRGBColorSpace,
    );
    this.renderer.setClearColor(this._clear, 1);
    this._active = true;
  }

  sprite({ image, rect, x = 0, y = 0, w, h, rotation = 0, alpha = 1,
    anchorX = 0, anchorY = 0, sway = 0, phase = 0, blend = 'normal',
    screen = false, tint = [1, 1, 1] } = {}) {
    if (!this._active || !this._visible || !image || !(alpha > 0)) return;
    const iw = image.naturalWidth || image.videoWidth || image.width;
    const ih = image.naturalHeight || image.videoHeight || image.height;
    if (!(iw > 0 && ih > 0) || image.complete === false) return;
    const [sx, sy, sw, sh] = rect || [0, 0, iw, ih];
    w ??= sw;
    h ??= sh;
    if (![x, y, w, h, rotation, sx, sy, sw, sh].every(Number.isFinite) ||
      w === 0 || h === 0 || sw <= 0 || sh <= 0) return;
    const entry = this._texture(image, iw, ih);
    entry.lastUsed = this._frame;
    const additive = blend === 'additive' || blend === 'add' || blend === 'lighter';
    let batch = this._pool[this._batchCount - 1];
    if (!batch || batch.entry !== entry || batch.additive !== additive || batch.screen !== !!screen) {
      batch = this._pool[this._batchCount] || this._newBatch();
      batch.entry = entry;
      batch.additive = additive;
      batch.screen = !!screen;
      batch.lastUsed = this._frame;
      batch.mesh.visible = true;
      batch.mesh.renderOrder = this._batchCount++;
      batch.material.blending = THREE.CustomBlending;
      batch.material.blendEquation = THREE.AddEquation;
      batch.material.blendSrc = THREE.SrcAlphaFactor;
      batch.material.blendDst = additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
      batch.material.blendEquationAlpha = THREE.AddEquation;
      batch.material.blendSrcAlpha = THREE.OneFactor;
      batch.material.blendDstAlpha = additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
      const uniforms = batch.material.uniforms;
      uniforms.uMap.value = entry.texture;
      uniforms.uHalfTexel.value.set(0.5 / iw, 0.5 / ih);
      uniforms.uTime.value = this._time;
      uniforms.uNightTint.value.copy(screen || additive ? SpriteRenderer._white : this._nightTint);
    }
    if (batch.count === batch.capacity) this._allocate(batch, batch.capacity * 2);
    if (screen) {
      const view = this._view;
      x = view.left + x / view.zoom;
      y = view.top + y / view.zoom;
      w /= view.zoom;
      h /= view.zoom;
      sway /= view.zoom;
    }
    const offset = batch.count++ * STRIDE;
    batch.buffer.array.set([
      sx / iw, sy / ih, sw / iw, sh / ih,
      x, y, w, h, Math.cos(rotation), Math.sin(rotation),
      finite(anchorX, 0), finite(anchorY, 0), clamp01(alpha),
      finite(tint?.[0], 1), finite(tint?.[1], 1), finite(tint?.[2], 1),
      finite(sway, 0), finite(phase, 0),
    ], offset);
    this._counts.sprites++;
  }

  end() {
    if (!this._active || this._disposed || this._lost) return this.stats();
    this._active = false;
    if (this._visible) {
      for (let i = 0; i < this._batchCount; i++) {
        const batch = this._pool[i];
        batch.geometry.instanceCount = batch.count;
        batch.buffer.clearUpdateRanges();
        batch.buffer.addUpdateRange(0, batch.count * STRIDE);
        batch.buffer.needsUpdate = true;
      }
      this.renderer.clear(true, false, false);
      this.renderer.render(this.scene, this.camera);
      this._counts.draws = this.renderer.info.render.calls;
    }
    return this.stats();
  }

  render() { return this.end(); }
  flush() { return this.end(); }

  // Snapshot only: begin() resets frame counters even if nobody reads them.
  stats() { return { ...this._counts, textures: this._entries.size }; }

  _texture(image, width, height) {
    let entry = this._cache.get(image);
    if (!entry) {
      const texture = new THREE.CanvasTexture(image);
      texture.colorSpace = THREE.NoColorSpace;
      texture.flipY = true;
      texture.premultiplyAlpha = false;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      entry = { image, texture, width, height, lastUsed: this._frame, dirty: image.glDirty };
      texture.onUpdate = () => { if (!this._disposed) this._counts.uploads++; };
      this._cache.set(image, entry);
      this._entries.add(entry);
    } else if (entry.width !== width || entry.height !== height ||
      (image.glDirty && (image.glDirty === true || image.glDirty !== entry.dirty))) {
      // Static sources never get needsUpdate on ordinary frame submissions.
      entry.texture.needsUpdate = true;
      entry.width = width;
      entry.height = height;
      entry.dirty = image.glDirty;
    }
    if (image.glDirty === true) {
      try { image.glDirty = false; } catch { /* Read-only sources may use version tokens. */ }
    }
    return entry;
  }

  _newBatch() {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
    ], 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.instanceCount = 0;
    const material = new THREE.RawShaderMaterial({
      vertexShader: VERTEX, fragmentShader: FRAGMENT,
      uniforms: {
        uMap: { value: null }, uHalfTexel: { value: new THREE.Vector2() },
        uTime: { value: 0 }, uNightTint: { value: new THREE.Vector3(1, 1, 1) },
      },
      transparent: true, premultipliedAlpha: false,
      depthTest: false, depthWrite: false, toneMapped: false,
      side: THREE.DoubleSide, forceSinglePass: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const batch = { geometry, material, mesh, count: 0, capacity: 0, lastUsed: this._frame };
    this._allocate(batch, 64);
    this.scene.add(mesh);
    this._pool.push(batch);
    return batch;
  }

  _allocate(batch, capacity) {
    const array = new Float32Array(capacity * STRIDE);
    if (batch.buffer) {
      array.set(batch.buffer.array);
      // Release the old GPU attributes before replacing their backing buffer.
      batch.geometry.dispose();
    }
    batch.buffer = new THREE.InstancedInterleavedBuffer(array, STRIDE);
    batch.buffer.setUsage(THREE.DynamicDrawUsage);
    for (const [name, size, offset] of [
      ['iRect', 4, 0], ['iPosition', 2, 4], ['iSize', 2, 6],
      ['iRotation', 2, 8], ['iAnchor', 2, 10], ['iAlpha', 1, 12],
      ['iTint', 3, 13], ['iWind', 2, 16],
    ]) batch.geometry.setAttribute(name, new THREE.InterleavedBufferAttribute(batch.buffer, size, offset));
    batch.capacity = capacity;
  }

  /** Immediately evict a baked source. Its next submission creates a new texture. */
  release(image) {
    const entry = this._cache.get(image);
    if (!entry) return;
    // A release during submission also cancels pending draws of that source.
    for (const batch of this._pool) {
      if (batch.entry !== entry) continue;
      batch.mesh.visible = false;
      batch.entry = null;
      batch.material.uniforms.uMap.value = null;
    }
    entry.texture.onUpdate = null;
    entry.texture.dispose();
    this._cache.delete(image);
    this._entries.delete(entry);
  }

  _evict() {
    for (const entry of this._entries) {
      if (this._frame - entry.lastUsed > MAX_IDLE) this.release(entry.image);
    }
    // Unused peak-size batches must not keep GPU buffers alive indefinitely.
    for (let i = this._pool.length - 1; i >= 0; i--) {
      const batch = this._pool[i];
      if (this._frame - batch.lastUsed <= MAX_IDLE) continue;
      this.scene.remove(batch.mesh);
      batch.geometry.dispose();
      batch.material.dispose();
      this._pool.splice(i, 1);
    }
  }

  setVisible(on) {
    this._visible = !!on;
    this.canvas.style.display = this._visible && !this._lost && !this._disposed ? '' : 'none';
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._active = false;
    this.canvas.removeEventListener('webglcontextlost', this._onLost);
    for (const entry of this._entries) this.release(entry.image);
    for (const batch of this._pool) {
      this.scene.remove(batch.mesh);
      batch.geometry.dispose();
      batch.material.dispose();
    }
    this._pool.length = 0;
    this.renderer.dispose();
    this.canvas.remove();
  }

  static _white = new THREE.Vector3(1, 1, 1);
}
