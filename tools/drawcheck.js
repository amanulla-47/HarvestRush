// HARVEST RUSH draw check: proves the cached drawing (stamps) matches live drawing, and counts what a frame costs.
// Usage (with ?debug):  const s = document.createElement('script'); s.src = 'tools/drawcheck.js'; document.body.appendChild(s);
// then:  DC.maxFarm()        everything unlocked (8 fields at Lv 5, 12 workers, home, stall maxed); nothing is saved
//        DC.sweep()          per spot on the map: pixels that differ between stamps and live drawing (>8 and >32 of 255)
//        DC.drive(600)       run 600 frames at a steady 60 fps step right now (works while the page is hidden)
//        DC.cost(180)        over 180 driven frames: vector paths (fill/stroke) and images per frame by draw function,
//                            and canvases made per second (a cache that keeps rebuilding shows up here)
//        DC.soft(60)         ms per frame to draw the current view on a CPU-only canvas (software raster)
//        DC.glcheck()        per spot: pixels that differ between WebGL mode (layers combined) and classic 2D
//        DC.heat(x,y,w,h,z)  overlay: differing pixels in red (DC.clear() removes it)
(function(){
  const DC = window.DC = {};
  DC.maxFarm = function(){ noSave = true; S.settings.gfx = 'high'; setQuality(0); S.sound = false;
    Object.assign(S, { name:'Ravi', partner:'Priya', moved:true, quest:QUESTS.length, sold:900, firstSale:true, debtPaid:true, homeBuilt:true, total:3e6, coins:5e6, stallLv:STALL_UP.length, story:STORY.map((_,i)=>i).slice(0,8) });
    S.fields.forEach(f=>{ f.unlocked = true; f.lv = 4; f.plots.forEach((p,j)=>{ p.sown = true; p.t = (j*7)%10<8 ? 1 : 0.55; }); });
    S.up.hands = 12; while (hands.length<12) spawnHand(true);
    FIELD_CACHE.clear(); running = true; storyOpen = false; document.querySelectorAll('.show').forEach(e=>e.classList.remove('show'));
    P.x = CFG.worldW/2; P.y = CFG.worldH/2; return 'maxed'; };
  function grab(off){ STAMP_OFF = off; render(); const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data; STAMP_OFF = false; return d; }
  DC.cmp = function(){ const a = grab(false), b = grab(true); let n8 = 0, n32 = 0, worst = 0, at = null;
    for (let i=0;i<a.length;i+=4){ const d = Math.max(Math.abs(a[i]-b[i]), Math.abs(a[i+1]-b[i+1]), Math.abs(a[i+2]-b[i+2])); if (d>8) n8++; if (d>32) n32++; if (d>worst){ worst = d; at = [(i/4)%canvas.width, (i/4/canvas.width)|0]; } }
    return { over8:n8, over32:n32, worst, at }; };
  DC.spots = ()=>[[300,930],[1910,2060],[MARKET.x,MARKET.y],[BARN.x,BARN.y],[HOME.x,HOME.y],[300,2020],[CFG.worldW/2,CFG.worldH/2],[WM.x,WM.y],[POND.x,POND.y],[GATE.x,GATE.y]];
  DC.sweep = function(){ const was = running; running = false; const out = [];   // frozen: the frame loop only re-renders
    for (const [x,y] of DC.spots()){ cam.x = x; cam.y = y; for (let i=0;i<40;i++) render(); const r = DC.cmp(); out.push(`${x|0},${y|0}  >8: ${r.over8}  >32: ${r.over32}  worst ${r.worst}${r.at ? ' at '+r.at : ''}`); }
    running = was; return out; };
  DC.heat = function(x, y, w, h, z=2){ const a = (STAMP_OFF = false, render(), ctx.getImageData(x, y, w, h)), b = (STAMP_OFF = true, render(), ctx.getImageData(x, y, w, h)); STAMP_OFF = false;
    const o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d'), im = g.createImageData(w, h);
    for (let i=0;i<a.data.length;i+=4){ const d = Math.max(Math.abs(a.data[i]-b.data[i]), Math.abs(a.data[i+1]-b.data[i+1]), Math.abs(a.data[i+2]-b.data[i+2])), L = (a.data[i]+a.data[i+1]+a.data[i+2])/3*0.35; im.data[i] = d>8 ? 255 : L; im.data[i+1] = d>8 ? Math.max(0, 255-d*3) : L; im.data[i+2] = L; im.data[i+3] = 255; }
    g.putImageData(im, 0, 0); let v = document.getElementById('dcheat'); if (!v){ v = document.createElement('canvas'); v.id = 'dcheat'; v.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;image-rendering:pixelated;pointer-events:none'; document.body.appendChild(v); }
    v.width = w*z; v.height = h*z; v.style.width = (v.width/devicePixelRatio)+'px'; const vg = v.getContext('2d'); vg.imageSmoothingEnabled = false; vg.drawImage(o, 0, 0, w*z, h*z); return 'shown'; };
  DC.clear = ()=>{ document.getElementById('dcheat')?.remove(); };
  // frames are driven by hand with synthetic 60 fps timestamps, so results do not depend on the tab being visible
  DC.drive = function(n=60){ const raf = window.requestAnimationFrame, step = window.__step; window.requestAnimationFrame = ()=>0; window.__step = true; let t = last;
    try { for (let i=0;i<n;i++){ t += 1000/60; frame(t); } } finally { window.requestAnimationFrame = raf; window.__step = step; last = performance.now(); } return n+' frames'; };   // hand the clock back to the real loop
  // what a frame costs on the main canvas: vector paths and images per frame, by the draw function that issued them
  DC.cost = function(n=180){ const ms = n/60*1000; const MAIN = canvas.getContext('2d'), proto = CanvasRenderingContext2D.prototype, of = proto.fill, os = proto.stroke, od = proto.drawImage, ce = document.createElement;
    const names = Object.keys(window).filter(k=>/^draw[A-Z]/.test(k) && typeof window[k]==='function'), saved = {}, cur = ['(render)'], C = {}, made = {}; let frames = 0;
    const bump = (k)=>{ if (ctx!==MAIN) return; const n = cur[cur.length-1]; (C[n] = C[n] || { paths:0, images:0 })[k]++; };
    proto.fill = function(...a){ if (this===MAIN) bump('paths'); return of.apply(this, a); }; proto.stroke = function(...a){ if (this===MAIN) bump('paths'); return os.apply(this, a); }; proto.drawImage = function(...a){ if (this===MAIN) bump('images'); return od.apply(this, a); };
    for (const n of names){ const f = window[n]; saved[n] = f; window[n] = function(...a){ cur.push(n); try { return f.apply(this, a); } finally { cur.pop(); } }; }
    const r0 = window.render; window.render = function(){ frames++; return r0.apply(this, arguments); };
    document.createElement = function(t){ if (t==='canvas'){ const s = (new Error().stack.split('\n')[2]||'').trim().split(' ')[1]; made[s] = (made[s]||0)+1; } return ce.call(document, t); };
    try { DC.drive(n); } finally {
    proto.fill = of; proto.stroke = os; proto.drawImage = od; document.createElement = ce; window.render = r0; for (const n in saved) window[n] = saved[n]; }
    const per = Object.entries(C).map(([k,v])=>[k, Math.round(v.paths/frames), Math.round(v.images/frames)]).filter(e=>e[1]||e[2]).sort((a,b)=>b[1]-a[1]);
    return { frames, pathsPerFrame: per.reduce((a,e)=>a+e[1], 0), imagesPerFrame: per.reduce((a,e)=>a+e[2], 0), byFunction: per.map(e=>`${e[0]}: ${e[1]} paths, ${e[2]} images`),
      canvasesPerSecond: Object.fromEntries(Object.entries(made).map(([k,v])=>[k, +(v/(ms/1000)).toFixed(1)])), stampMB: typeof STAMP_PX==='undefined' ? 0 : +(STAMP_PX*4/1e6).toFixed(1), charMB: typeof BASKET_CACHE==='undefined' ? 0 : +((CHAR_CACHE.px+BASKET_CACHE.px)*4/1e6).toFixed(1) }; };
  // script time per draw function (self time: its own work, not the draw functions it calls), ms per frame
  DC.time = function(n=180){ const names = Object.keys(window).filter(k=>/^draw[A-Z]|^render|^stamp$|^charSprite$/.test(k) && typeof window[k]==='function'), saved = {}, T = {}, stack = []; let frames = 0;
    for (const nm of names){ const f = window[nm]; saved[nm] = f; window[nm] = function(...a){ const t0 = performance.now(); stack.push(0); try { return f.apply(this, a); } finally { const dt = performance.now()-t0, kids = stack.pop(); T[nm] = (T[nm]||0) + dt - kids; if (stack.length) stack[stack.length-1] += dt; } }; }
    const r0 = window.render; window.render = function(){ frames++; return r0.apply(this, arguments); };
    try { DC.drive(n); } finally { window.render = r0; for (const nm in saved) window[nm] = saved[nm]; }
    const tot = Object.values(T).reduce((a,b)=>a+b, 0);
    return { frames, msPerFrame: +(tot/frames).toFixed(2), byFunction: Object.entries(T).sort((a,b)=>b[1]-a[1]).slice(0, 25).map(([k,v])=>k+': '+(v/frames).toFixed(3)+' ms') }; };
  // CPU drawing cost, as on a phone or app WebView that rasterises the canvas in software: renders the current view
  // into a CPU-only canvas of the same size, n times, forcing each to finish, and returns ms per frame
  DC.soft = function(n=60){ const sw = document.createElement('canvas'); sw.width = canvas.width; sw.height = canvas.height;
    const g = sw.getContext('2d', { alpha:false, willReadFrequently:true }), saved = ctx; ctx = g; g.lineCap = 'round';
    try { render(); g.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i=0;i<n;i++){ render(); g.getImageData(0, 0, 1, 1); } return +((performance.now()-t0)/n).toFixed(2); }
    finally { ctx = saved; } };
  // WebGL mode against classic: renders the same frame both ways, combines WebGL's layers as the browser does
  // (2D canvas over the WebGL canvas, glows added, the top canvas over all; daytime only: the night tint is CSS)
  DC.glFrame = function(){ if (!GLR) return null; const was = GL_ON; setRenderer(true); render(); const w = canvas.width, h = canvas.height, gl = GLR.gl;
    const base = new Uint8Array(w*h*4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, base);
    // daytime glows are small CSS elements: paint the same gradients (from their styles) into a canvas to add them
    const gdc = document.createElement('canvas'); gdc.width = w; gdc.height = h; const gg = gdc.getContext('2d'); gg.globalCompositeOperation = 'lighter';
    if (LAY.gx && LAY.gc.style.visibility!=='hidden') gg.drawImage(LAY.gc, 0, 0);
    for (const d of (LAY.gp||[])){ if (!d.c.on) continue; const m = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(d.c.tf), rx = parseFloat(d.c.w)/2, ry = parseFloat(d.c.h)/2, X = (+m[1]+rx)*dpr, Y = (+m[2]+ry)*dpr;
      const q = /rgba\(([^)]*)\) ([\d.]+)%/.exec(d.c.bg), col = q[1].split(',').slice(0,3).join(','), a = +q[1].split(',')[3], r0 = +q[2]/100;
      gg.save(); gg.translate(X, Y); gg.scale(rx*dpr, ry*dpr); const rg = gg.createRadialGradient(0, 0, r0, 0, 0, 1); rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(1, `rgba(${col},0)`); gg.fillStyle = rg; gg.beginPath(); gg.arc(0, 0, 1, 0, 6.2832); gg.fill(); gg.restore(); }
    const top = OV.getImageData(0, 0, w, h).data, glow = gdc.getContext('2d').getImageData(0, 0, w, h).data, ui = LAY.ux.getImageData(0, 0, w, h).data, out = new Uint8ClampedArray(w*h*4);
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){ const i = (y*w+x)*4, j = ((h-1-y)*w+x)*4;
      for (let c=0;c<3;c++){ let v = base[j+c]; const at = top[i+3]/255; v = top[i+c]*at + v*(1-at); if (glow) v = Math.min(255, v + glow[i+c]*glow[i+3]/255); const au = ui[i+3]/255; v = ui[i+c]*au + v*(1-au); out[i+c] = v; } out[i+3] = 255; }
    setRenderer(was); return out; };
  DC.glcheck = function(){ const was = running; running = false; const res = [];
    for (const [x,y] of DC.spots()){ cam.x = x; cam.y = y; setRenderer(false); for (let i=0;i<30;i++) render(); const a = OV.getImageData(0, 0, canvas.width, canvas.height).data;
      setRenderer(true); for (let i=0;i<30;i++) render(); const b = DC.glFrame(); let n8 = 0, n32 = 0, worst = 0, at = null;
      for (let i=0;i<a.length;i+=4){ const d = Math.max(Math.abs(a[i]-b[i]), Math.abs(a[i+1]-b[i+1]), Math.abs(a[i+2]-b[i+2])); if (d>8) n8++; if (d>32) n32++; if (d>worst){ worst = d; at = [(i/4)%canvas.width, (i/4/canvas.width)|0]; } }
      res.push(`${x|0},${y|0}  >8: ${n8}  >32: ${n32}  worst ${worst}${at ? ' at '+at : ''}`); }
    running = was; return res; };
  console.log('drawcheck ready: DC.maxFarm(), DC.drive(n), DC.cost(n), DC.sweep(), DC.heat(x,y,w,h)');
})();
