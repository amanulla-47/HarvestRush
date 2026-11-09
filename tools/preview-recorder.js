// Local authoring tool only. Records the live Three.js farm, not a simulated video.
const $=s=>document.querySelector(s),sizes={landscape:[1920,1080],portrait:[1080,1620]};
let win,doc,farm,cover,overlay,rafNative,active=false,started=0,phase='ready',stats,recorder;
const output=$('#output'),ctx=output.getContext('2d',{alpha:false});
const say=s=>$('#status').textContent=s;
const image=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let fonts='',snapBusy=false,lastSnap=0;
async function hudSnapshot(){
 if(snapBusy)return;snapBusy=true;
 try{overlay=await htmlToImage.toCanvas(doc.querySelector('#hud'),{width:output.width,height:output.height,pixelRatio:1,fontEmbedCSS:fonts,backgroundColor:'transparent',skipAutoScale:true});}
 catch(e){say('HUD capture failed: '+e.message);active=false;recorder?.stop();}
 finally{snapBusy=false;}
}
// Each hard cut starts a fresh staged take; action inside every take runs at 1x.
const shots=[{at:.3,fi:0,name:'Wheat harvest'},{at:3.1,fi:2,name:'Tomato harvest'},{at:5.8,market:true,name:'Market sale'},{at:8.8,fi:3,name:'Pumpkin harvest',upgradeWave:true},{at:11.9,fi:4,name:'Strawberry harvest'},{at:15,fi:5,name:'Corn harvest',finale:true}];
let shotIndex=-1,waypoints=[],wpIndex=0;
function makeSerpentine(f,ltr=true){
 const xL=f.plots[0].x-8,xR=f.plots[5].x+8,y0=f.plots[0].y-12,y1=f.plots[6].y-12,y2=f.plots[12].y-12,y3=f.plots[18].y-10;
 return ltr?[{x:xR,y:y0},{x:xR,y:y1},{x:xL,y:y1},{x:xL,y:y2},{x:xR,y:y2},{x:xR,y:y3},{x:xL,y:y3}]:[{x:xL,y:y0},{x:xL,y:y1},{x:xR,y:y1},{x:xR,y:y2},{x:xL,y:y2},{x:xL,y:y3},{x:xR,y:y3}];
}
function enterShot(index){
 shotIndex=index;const shot=shots[index];phase=shot.name;
 for(const key of ['w','a','s','d'])farm.keys[key]=false;
 win.__promoEnterShot?.(index);
 doc.querySelector('#buy.show .px')?.click();stats.phases[phase]=true;
 if(shot.market){
  const f0=farm.S.fields[0];
  waypoints=[{x:1100,y:494,waitEmpty:true},{x:f0.plots[0].x-10,y:f0.plots[0].y-12},{x:f0.plots[5].x+10,y:f0.plots[0].y-12}];
 }else waypoints=makeSerpentine(farm.S.fields[shot.fi],shot.fi%2===0);
 wpIndex=0;
}
function bot(t){
 if(t<.3){if(shotIndex!==0)enterShot(0);for(const k of ['w','a','s','d'])farm.keys[k]=false;return;}
 const index=shots.findLastIndex(s=>t>=s.at),shot=shots[index];
 if(index!==shotIndex)enterShot(index);
 if(shot.fi!==undefined)for(const p of farm.S.fields[shot.fi].plots)p.owner=farm.P;
 if(shot.finale){const st=t-shot.at;if(Math.abs(st-.5)<.018||Math.abs(st-1.7)<.018)win.__promoCelebrate?.(980,1720);}
 for(const key of ['w','a','s','d'])farm.keys[key]=false;
 const wp=waypoints[wpIndex];if(!wp)return;
 if(wp.waitEmpty&&!farm.P.carry.length){stats.saleCompleted=true;wpIndex++;return;}
 const dx=wp.x-farm.P.x,dy=wp.y-farm.P.y;
 if(Math.hypot(dx,dy)<14){if(!wp.waitEmpty&&wpIndex<waypoints.length-1)wpIndex++;return;}
 if(Math.abs(dx)>6)farm.keys[dx>0?'d':'a']=true;if(Math.abs(dy)>6)farm.keys[dy>0?'s':'w']=true;
 stats.maxBasket=Math.max(stats.maxBasket,farm.P.carry.length);
}
function draw(now){
 now=performance.now();
 if(!active)return;
 const elapsed=(now-started)/1000;
 const world=doc.querySelector('#three-world');
 ctx.drawImage(world,0,0,output.width,output.height);
 if(overlay)ctx.drawImage(overlay,0,0);
 if(elapsed<.3)ctx.drawImage(cover,0,0,output.width,output.height);
 else if(elapsed<.44){ctx.save();ctx.globalAlpha=1-(elapsed-.3)/.14;ctx.drawImage(cover,0,0,output.width,output.height);ctx.restore();}
 if(now-lastSnap>90){lastSnap=now;hudSnapshot();}
 stats.frames++;say(`Recording ${Math.min(elapsed,18).toFixed(1)} / 18 s · ${phase} · ${farm.P.carry.length} crops`);
 if(elapsed>=18){active=false;for(const k of ['w','a','s','d'])farm.keys[k]=false;recorder.stop();}
}
$('#prepare').onclick=async()=>{
 try{
  $('#record').disabled=true;$('#download').hidden=true;say('Loading isolated farm…');
  const format=$('#format').value,[w,h]=sizes[format];output.width=w;output.height=h;$('#stage').style.width=w+'px';$('#stage').style.height=h+'px';$('#game').width=w;$('#game').height=h;
  $('#game').src='../index.html?debug&art&crew=6&capture='+Date.now();win=$('#game').contentWindow;
  for(let i=0;i<200;i++){await delay(100);if(win.FARM&&win.document.documentElement.dataset.renderer==='threejs'&&!win.document.querySelector('#loading'))break;}
  if(!win.FARM||win.document.querySelector('#loading'))throw Error('Farm did not load');
  doc=win.document;farm=win.FARM;farm.blockSave();win.navigationTarget=()=>null;win.goalTarget=()=>null;win.guideTarget=()=>null;
  const clean=doc.createElement('style');clean.textContent='#ql,#hint,#buy,#btns,#inspect,#strip,#banner,#tr{display:none!important}';doc.head.appendChild(clean);await doc.fonts.ready;
  win.eval(`(() => {
    setQuality(0); dpr = 1; resize();
    S.sound = false; S.stallLv = 2; S.homeBuilt = true; S.debtPaid = true; S.season = 0;
    S.up.hands = 8; S.up.growth = 6; S.up.seeder = 4;
    while (hands.length < 8) spawnHand(true);
    S.total = 4200; S.level = levelFromTotal(S.total).l; S.coins = 1250; dispCoins = 1250;
    FARM.pads.length = 0;
    const origBake = THREE_GAME.bake.bind(THREE_GAME);
    THREE_GAME.bake = (key, w, h, paint, outline = false) => {
      const keepSign = key.startsWith('market-sign') || key.startsWith('barn|') || key.startsWith('gate|');
      return origBake(key, w, h, g => {
        const prev = COVER; if (keepSign) COVER = false;
        try { paint(g); } finally { COVER = prev; }
      }, outline);
    };
    COVER = true; THREE_GAME.invalidate();
    const origUpdateHand = updateHand;
    window.updateHand = (h, dt) => { if (!h._parked) origUpdateHand(h, dt); };
    const isPort = ${format === 'portrait'};
    const shots = ${JSON.stringify(shots)};
    let camBase = { x: 1145, y: 845, zoom: isPort ? 1.28 : 1.6 }, curShot = shots[0];
    window.updateCam = () => {
      zoom = camBase.zoom;
      if (curShot?.market) {
        cam.x = camBase.x + (P.x - 1100) * 0.15;
        cam.y = camBase.y + Math.max(0, P.y - 510) * 0.22;
      } else if (curShot) {
        const f = S.fields[curShot.fi];
        cam.x = camBase.x + (P.x - f.cx) * 0.18;
        cam.y = camBase.y + (P.y - f.cy) * 0.18;
      }
      const hw = W / 2 / zoom;
      cam.x = hw * 2 > CFG.worldW ? CFG.worldW / 2 : clamp(cam.x, hw, CFG.worldW - hw);
    };
    window.__promoCelebrate = (fx, fy) => { celebrate(fx, fy, true); confetti(fx, fy - 30, 30); };
    window.__promoEnterShot = (idx) => {
      const shot = curShot = shots[idx];
      parts.length = 0; fliers.length = 0; CUTS.length = 0;
      S.fields.forEach((f, i) => {
        f.unlocked = true; f.lv = (i >= 3 || i === shot.fi) ? 4 : 3; f.spray = true;
        f.plots.forEach((p, j) => {
          p.sown = true; p.t = 1; p.pop = 1; p.wig = 0;
          p.owner = (i === shot.fi) ? P : null;
          p.gold = (i === shot.fi) ? (j === 3 || j === 8 || j === 15) : (j === 7);
        });
      });
      hands.forEach(h => { h.sellT = 0; h.waitT = 0; h.resting = false; h.target = null; h._parked = true; h.x = -600; h.y = -600; h.state = 'rest'; h.restT = 99; h.carry = []; });
      const act = (i, props) => { hands[i]._parked = false; Object.assign(hands[i], props); };
      if (shot.market) {
        act(0, { x: 1034, y: 508, face: 1, state: 'deliver', carry: [{ci:1,t:1},{ci:2,t:1},{ci:3,t:1},{ci:0,t:1}] });
        act(1, { x: 1166, y: 514, face: -1, state: 'deliver', carry: [{ci:4,t:1},{ci:5,t:1},{ci:1,t:1}] });
        act(2, { x: 1068, y: 690, face: 1, state: 'deliver', carry: [{ci:6,t:1},{ci:7,t:1},{ci:3,t:1},{ci:2,t:1}] });
        act(3, { x: 820, y: 830, face: 1, state: 'seek', restT: 0, carry: [{ci:1,t:1}] });
        P.x = 1100; P.y = 608; P.face = 1; P.bestCombo = 18; P.firstBasket = false; P.sellT = 0;
        P.carry = S.carry = [5,4,3,2,6,7,3,4,5,2,1,0,6,7,5,4,3,2,5,4,6,7,3,4].map(ci => ({ ci, t: 1 }));
        camBase = isPort ? { x: 1100, y: 515, zoom: 1.25 } : { x: 1100, y: 450, zoom: 1.28 };
      } else {
        const f = S.fields[shot.fi], ltr = shot.fi % 2 === 0;
        P.x = ltr ? f.plots[0].x - 24 : f.plots[5].x + 24; P.y = f.plots[0].y - 12; P.face = ltr ? 1 : -1;
        P.carry = S.carry = [{ ci: shot.fi, t: 1 }, { ci: (shot.fi + 1) % 6, t: 1 }];
        if (shot.fi === 0) {
          const f1 = S.fields[1];
          act(0, { x: f1.plots[2].x, y: f1.plots[2].y, face: 1, state: 'seek', restT: 0, carry: [{ci:1,t:1},{ci:1,t:1}] });
          act(1, { x: f1.plots[15].x, y: f1.plots[15].y, face: -1, state: 'seek', restT: 0, carry: [{ci:1,t:1}] });
          act(2, { x: 1078, y: 920, face: -1, state: 'deliver', carry: [{ci:0,t:1},{ci:1,t:1},{ci:2,t:1},{ci:1,t:1}] });
          if (f1.rabbit) Object.assign(f1.rabbit, { st: 'in', x: f1.x0 + 40, y: f1.cy + 20, tx: f1.cx, ty: f1.cy + 20, face: 1, h: 0, t: 6 });
          camBase = isPort ? { x: 1245, y: 865, zoom: 1.28 } : { x: 1145, y: 845, zoom: 1.6 };
        } else if (shot.fi === 2) {
          const f3 = S.fields[3];
          act(0, { x: f3.plots[4].x, y: f3.plots[4].y, face: 1, state: 'seek', restT: 0, carry: [{ci:3,t:1},{ci:3,t:1}] });
          act(1, { x: 1046, y: 1330, face: 1, state: 'deliver', carry: [{ci:2,t:1},{ci:3,t:1},{ci:2,t:1},{ci:0,t:1}] });
          act(2, { x: f3.plots[16].x, y: f3.plots[16].y, face: -1, state: 'seek', restT: 0, carry: [{ci:3,t:1}] });
          camBase = isPort ? { x: 1230, y: 1295, zoom: 1.28 } : { x: 1360, y: 1325, zoom: 1.6 };
        } else if (shot.fi === 3) {
          const f5 = S.fields[5];
          act(0, { x: 1046, y: 1320, face: -1, state: 'deliver', carry: [{ci:3,t:1},{ci:5,t:1},{ci:2,t:1},{ci:3,t:1}] });
          act(1, { x: f5.plots[2].x, y: f5.plots[2].y, face: 1, state: 'seek', restT: 0, carry: [{ci:5,t:1},{ci:5,t:1}] });
          camBase = isPort ? { x: 695, y: 1345, zoom: 1.28 } : { x: 780, y: 1345, zoom: 1.6 };
          if (shot.upgradeWave) { celebrate(f.cx, f.cy, true); confetti(f.cx, f.cy, 36); coinBurst(f.cx, f.cy - 20, 8); f.plots.forEach(pl => { pl.pop = 0.35; pl.wig = 1; }); }
        } else if (shot.fi === 4) {
          const f6 = S.fields[6], f5 = S.fields[5];
          act(0, { x: f6.plots[4].x, y: f6.plots[4].y, face: 1, state: 'seek', restT: 0, carry: [{ci:6,t:1},{ci:6,t:1}] });
          act(1, { x: 1168, y: 1740, face: 1, state: 'deliver', carry: [{ci:4,t:1},{ci:6,t:1},{ci:5,t:1},{ci:4,t:1}] });
          act(2, { x: f5.plots[5].x, y: f5.plots[5].y, face: -1, state: 'seek', restT: 0, carry: [{ci:5,t:1}] });
          camBase = isPort ? { x: 1365, y: 1715, zoom: 1.28 } : { x: 1425, y: 1685, zoom: 1.6 };
        } else if (shot.fi === 5) {
          const f7 = S.fields[7], f4 = S.fields[4];
          act(0, { x: f7.plots[10].x, y: f7.plots[10].y, face: -1, state: 'seek', restT: 0, carry: [{ci:7,t:1},{ci:7,t:1}] });
          act(1, { x: 1150, y: 1840, face: -1, state: 'deliver', carry: [{ci:7,t:1},{ci:5,t:1},{ci:6,t:1},{ci:4,t:1}] });
          act(2, { x: f4.plots[12].x, y: f4.plots[12].y, face: 1, state: 'seek', restT: 0, carry: [{ci:4,t:1},{ci:4,t:1}] });
          camBase = isPort ? { x: 920, y: 1780, zoom: 1.28 } : { x: 845, y: 1790, zoom: 1.6 };
        }
      }
      zoom = camBase.zoom; cam.x = camBase.x; cam.y = camBase.y;
    };
  })()`);
  const f=farm.S.fields[0];phase='ready';shotIndex=-1;overlay=null;stats={format,initialLevel:f.lv,frames:0,maxBasket:0,saleCompleted:false,upgradeCompleted:true,phases:{}};
  enterShot(0);
  cover=await image('../dist/covers/v2/'+(format==='landscape'?'landscape-1920x1080.png':'portrait-800x1200.png'));
  fonts=await htmlToImage.getFontEmbedCSS(doc.querySelector('#hud'));await hudSnapshot();
  // Run the compositor immediately after the real renderer, before WebGL discards its buffer.
  rafNative=win.requestAnimationFrame.bind(win);win.requestAnimationFrame=cb=>rafNative(now=>{if(active)bot((performance.now()-started)/1000);cb(now);draw(now);});
  ctx.drawImage(cover,0,0,w,h);$('#record').disabled=false;say('Ready · isolated save · real-time gameplay · silent');
 }catch(e){say('Error: '+e.message);console.error(e);}
};
$('#record').onclick=()=>{
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
 const stream=output.captureStream(30),chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:14000000});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:mime}),url=URL.createObjectURL(blob);const a=$('#download');a.href=url;a.download='harvest-rush-'+stats.format+'-promo-raw.webm';a.hidden=false;a.textContent='Download '+stats.format+' recording';$('#result').src=url;$('#result').style.display='block';say('Recorded · '+JSON.stringify(stats)+' · '+(blob.size/1048576).toFixed(1)+' MB');};
 $('#record').disabled=true;started=performance.now();active=true;recorder.start(1000);
};
