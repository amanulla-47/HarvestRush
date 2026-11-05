// HARVEST RUSH balance simulator. Runs the real game code headless with a bot player.
// Usage (on the 127.0.0.1 test origin, with ?debug):  const s = document.createElement('script'); s.src = 'tools/sim.js'; document.body.appendChild(s);
// then: await SIM.run(3600*3)  → SIM.log (milestones) and SIM.curve (coins/min samples)
(function(){
  if (location.hostname !== '127.0.0.1') { console.warn('sim: run on 127.0.0.1 only'); return; }
  FARM.blockSave();
  window.requestAnimationFrame = () => 0;   // stop the real loop; the sim drives frames itself
  window.render = () => {}; window.music = () => {}; window.ambience = () => {}; window.hud = () => {};
  const K = FARM.keys, S = FARM.S, P = FARM.P;
  const log = [], curve = []; let selling = false, t = 0, lastBuyKey = '', bought = {};
  const mark = (what) => { log.push({ t: +(t/60).toFixed(1), lvl: S.level, what }); };
  function options(){
    const o = [];
    for (const p of FARM.pads){
      if (p.type === 'festival') continue;
      if (!padAvail(p)) continue;
      const name = p.type === 'field' ? (p.f.unlocked ? p.f.crop.name+' field Lv'+(p.f.lv+2) : 'UNLOCK '+p.f.crop.name) : p.type;
      o.push({ cost: padCost(p), x: p.x, y: p.y-10, name, key: 'pad'+FARM.pads.indexOf(p) });
    }
    if (storyStage()>=4 && S.up.hands<HIRE_MAX) o.push({ cost: hireCost(), x: BARN.x, y: BARN.y+34, name: 'hire #'+(S.up.hands+1), key: 'barn' });
    if (S.sold>0 && S.stallLv<STALL_UP.length) o.push({ cost: STALL_UP[S.stallLv].cost, x: MARKET.sellX, y: MARKET.sellY, name: 'stall Lv'+(S.stallLv+2), key: 'stall', empty: true });
    return o.sort((a,b)=>a.cost-b.cost);
  }
  function bestRipe(){
    let best = null, bs = -1;
    for (const f of S.fields){ if (!f.unlocked) continue; const v = priceOf(f.crop);
      for (const p of f.plots){ if (p.t<1 || !p.sown) continue; const s = v/(Math.hypot(p.x-P.x, p.y-P.y)+250); if (s>bs){ bs = s; best = p; } } }
    return best;
  }
  function bareNearP(){ let best=null, bd=1e9; for (const f of S.fields){ if (!f.unlocked) continue; for (const p of f.plots) if (!p.sown){ const d = Math.hypot(p.x-P.x,p.y-P.y); if (d<bd){ bd=d; best=p; } } } return best; }
  function decide(){
    const cap = capOf(), c = P.carry.length; let g = null; if (!c) selling = false;
    if (!S.moved) S.moved = true;
    const opts = options(), want = opts.find(o=>S.coins>=o.cost);
    if (S.quest===3 && eggs.length) g = { x: eggs[0].x, y: eggs[0].y };
    else if (want && !(want.empty && c)){ g = want;
      if (Math.hypot(P.x-want.x, P.y-want.y) < 20){ const o = getOffer(); if (o && S.coins>=o.cost){ tryBuy(); mark(want.name+' ('+Math.round(want.cost)+')'); } } }
    else if (want && want.empty && c) g = RUG();
    else if (c>=cap*0.9 || (selling && c>0)){ selling = true; g = RUG(); }
    else if (S.quest===1 && bareNearP()) g = bareNearP();
    else { const r = bestRipe(); if (r && (c<cap)) g = r; else if (c) g = RUG(); }
    K.w=K.a=K.s=K.d=false;
    if (g){ const dx = g.x-P.x, dy = g.y-P.y; if (Math.abs(dx)>6) K[dx>0?'d':'a'] = true; if (Math.abs(dy)>6) K[dy>0?'s':'w'] = true; }
  }
  const split = { player:0, crew:0 }; const _sell = window.sell; window.sell = function(who, item, x, y){ const before = S.total; _sell(who, item, x, y); split[who===P?'player':'crew'] += S.total-before; };
  let lastTotal = 0, festMarked = false, lastLvl = 1;
  function step(){ running = true; storyOpen = false; decide(); last = 0; frame(50); t += 0.05;
    if (S.level !== lastLvl){ lastLvl = S.level; }
    if (!festMarked && festivalReady() && S.coins>=festivalCost()){ festMarked = true; mark('FESTIVAL affordable'); }
  }
  window.SIM = { log, curve, get t(){ return t; },
    async run(sec, chunk=4000){ const end = t+sec; while (t<end){ for (let i=0;i<chunk && t<end;i++){ step(); if (Math.round(t*20)%1200===0){ curve.push({ m: +(t/60).toFixed(0), perMin: Math.round((S.total-lastTotal)), playerShare: Math.round(100*split.player/Math.max(1,split.player+split.crew))+'%', idle: Math.round(idleRate()*60), lvl: S.level, coins: Math.round(S.coins) }); lastTotal = S.total; split.player = split.crew = 0; } } await new Promise(r=>setTimeout(r,0)); } return log; } };
})();
