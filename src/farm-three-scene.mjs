import { SpriteRenderer } from './three-renderer.mjs';
import { updateHeroMotion, pickupPose, salePose } from './animation.mjs';
import { groundRoute, segmentClear, flowingDots } from './navigation.mjs';

// The simulation and DOM HUD remain in index.html. Canvas is used only to author
// reusable individual textures; every visible world layer is submitted to Three.
class FarmThreeScene {
  constructor() {
    this.gpu = new SpriteRenderer({ before: canvas, onContextLost: () => this.fail(new Error('Graphics context lost.')) });
    this.cache = new Map(); this.tiles = new Map(); this.crops = new Map();
    this.looks = new Map(); this.pixels = 0; this.scale = 0; this.art = ''; this.active = true;
    this.colorCache = new Map();
    canvas.style.opacity = '0';
    document.getElementById('hud').style.zIndex = '5';
    document.getElementById('vig').style.zIndex = '2';
    document.documentElement.dataset.renderer = 'threejs';
    document.documentElement.dataset.threeRevision = '187';
    this.fontListener = () => this.invalidate();
    document.fonts?.addEventListener('loadingdone', this.fontListener);
  }
  fail(error) {
    if(this.failed)return;
    this.failed = true;
    this.active = false; this.gpu.setVisible(false); canvas.style.opacity = '0';
    document.documentElement.dataset.renderer = 'unavailable';
    showRenderError(error);
  }
  invalidate() {
    for (const c of this.cache.values()) this.gpu.release(c.image);
    for (const c of this.tiles.values()) this.gpu.release(c.image);
    for (const c of this.crops.values()) this.gpu.release(c.image);
    this.cache.clear(); this.tiles.clear(); this.crops.clear(); this.pixels = 0;
  }
  stats() { return this.gpu.stats(); }
  color(value) {
    if (this.colorCache.has(value)) return this.colorCache.get(value);
    let rgb = [1,1,1], alpha = 1;
    if (value?.startsWith('#')) {
      let h=value.slice(1); if(h.length===3) h=h.split('').map(x=>x+x).join('');
      rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);
    } else {
      const n=String(value).match(/[\d.]+/g);
      if(n?.length>=3){rgb=n.slice(0,3).map(x=>+x/255);if(n.length>3)alpha=+n[3];}
    }
    const result={rgb,alpha};this.colorCache.set(value,result);
    if(this.colorCache.size>1024)this.colorCache.clear();return result;
  }
  bake(key, w, h, paint, outline=false) {
    key += '|'+this.scale;
    let entry=this.cache.get(key);
    if(entry){entry.frame=this.frame;this.cache.delete(key);this.cache.set(key,entry);return entry;}
    const image=document.createElement('canvas');image.width=Math.ceil(w*this.scale);image.height=Math.ceil(h*this.scale);
    const g=image.getContext('2d');g.scale(this.scale,this.scale);g.lineCap='round';g.lineJoin='round';
    const previous=ctx,previousSprite=SPRITE,glows=GLOWS.length;
    ctx=g;SPRITE=true;
    try{paint(g);}finally{ctx=previous;SPRITE=previousSprite;GLOWS.length=glows;}
    let result=image;
    if(outline){
      const mask=document.createElement('canvas');mask.width=image.width;mask.height=image.height;
      const mg=mask.getContext('2d');mg.drawImage(image,0,0);mg.globalCompositeOperation='source-in';mg.fillStyle=HERO_RIM;mg.fillRect(0,0,mask.width,mask.height);
      result=document.createElement('canvas');result.width=image.width;result.height=image.height;
      const out=result.getContext('2d');for(let i=0;i<8;i++)out.drawImage(mask,Math.cos(i*.7854)*HERO_LINE*this.scale,Math.sin(i*.7854)*HERO_LINE*this.scale);out.drawImage(image,0,0);
    }
    entry={image:result,w,h,frame:this.frame};this.cache.set(key,entry);this.pixels+=result.width*result.height;
    const limit=(navigator.deviceMemory||4)<=2?6e6:12e6;
    while(this.pixels>limit&&this.cache.size>1){const pair=[...this.cache].find(([,e])=>e.frame!==this.frame);if(!pair)break;const[first,e]=pair;this.pixels-=e.image.width*e.image.height;this.gpu.release(e.image);this.cache.delete(first);}
    return entry;
  }
  stamp(key,x,y,w,h,paint,options={}) {
    if(!options.screen&&!inView(x+w/2,y+h/2,Math.max(w,h)/2+30))return;
    const b=this.bake(key,w,h,()=>{ctx.translate(-x,-y);paint();});
    this.gpu.sprite({image:b.image,x,y,w,h,...options});
  }
  icon(em,x,y,size,options={}) {
    if(em==='🪙'||em==='⬆️'){
      const b=this.bake('interface-icon|'+em,48,48,()=>{
        if(em==='🪙')drawCoin(24,24,20);
        else{circle(24,24,19,'#588b3e',2.5);ctx.beginPath();ctx.moveTo(24,11);ctx.lineTo(35,24);ctx.lineTo(29,24);ctx.lineTo(29,36);ctx.lineTo(19,36);ctx.lineTo(19,24);ctx.lineTo(13,24);ctx.closePath();shape('#fff',0);}
      });this.gpu.sprite({image:b.image,x,y,w:size*1.2,h:size*1.2,anchorX:.5,anchorY:.5,...options});return;
    }
    const image=emojiSprite(em,Math.ceil(size*this.scale));
    const padded=size*image.width/(Math.ceil(size*this.scale));
    this.gpu.sprite({image,x,y,w:padded,h:padded,anchorX:.5,anchorY:.5,...options});
  }
  shape(kind,x,y,w,h,color,alpha=1,rotation=0,screen=false) {
    const c=this.color(color);
    const b=this.bake('shape|'+kind,64,64,()=>{
      if(kind==='glow'){const g=ctx.createRadialGradient(32,32,.3,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);}
      else if(kind==='shadow'){const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);}
      else if(kind==='star'){star(32,32,29,'#fff');}
      else if(kind==='ring'){ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(32,32,28,0,Math.PI*2);ctx.stroke();}
      else if(kind==='leaf'){ctx.translate(32,32);ctx.beginPath();ctx.moveTo(-29,0);ctx.quadraticCurveTo(0,-25,29,0);ctx.quadraticCurveTo(0,25,-29,0);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='rgba(30,80,40,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(22,0);ctx.stroke();}
      else if(kind.startsWith('swish')){const progress=+kind.slice(5)/6;ctx.strokeStyle='#fff';ctx.lineCap='round';ctx.lineWidth=6;ctx.beginPath();ctx.arc(32,32,26,Math.PI+.25,Math.PI+.25+(Math.PI-.5)*progress);ctx.stroke();}
      else if(kind==='rect'){ctx.fillStyle='#fff';ctx.fillRect(0,0,64,64);}
      else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(32,32,31,0,Math.PI*2);ctx.fill();}
    });
    this.gpu.sprite({image:b.image,x,y,w,h,anchorX:.5,anchorY:.5,alpha:alpha*c.alpha,tint:c.rgb,rotation,screen,blend:kind==='glow'?'additive':'normal'});
  }
  label(textValue,x,y,w=100,h=24,options={}) {
    if(typeof COVER!=='undefined' && COVER)return;
    const b=this.bake('label|'+textValue+'|'+w+'|'+h,w,h,()=>{box(1,1,w-2,h-2,Math.min(8,h/3),'#fff4d7',1.5);text(textValue,w/2,h/2+1,Math.min(15,h*.55),COL.ink,{weight:900});});
    this.gpu.sprite({image:b.image,x,y,w,h,anchorX:.5,anchorY:.5,...options});
  }
  ground() {
    const sc=dpr*zoom,T=GROUND.T,unit=T/sc;
    const left=cam.x-W/(2*zoom),top=cam.y-H/(2*zoom*TILT),right=cam.x+W/(2*zoom),bottom=cam.y+H/(2*zoom*TILT);
    const signature=(S.homeBuilt?1:0)+'|'+(QUAL.lv<2?1:0)+'|'+sc;
    if(signature!==this.groundKey){for(const c of this.tiles.values())this.gpu.release(c.image);this.tiles.clear();this.groundKey=signature;}
    for(let j=Math.floor(top/unit);j<=Math.floor(bottom/unit);j++)for(let i=Math.floor(left/unit);i<=Math.floor(right/unit);i++){
      const key=i+','+j;let tile=this.tiles.get(key);
      if(!tile){tile={image:buildGroundTile(i,j,sc)};this.tiles.set(key,tile);}
      else{this.tiles.delete(key);this.tiles.set(key,tile);}
      this.gpu.sprite({image:tile.image,x:i*unit,y:j*unit,w:unit,h:unit});
    }
    while(this.tiles.size>56){const key=this.tiles.keys().next().value;this.gpu.release(this.tiles.get(key).image);this.tiles.delete(key);}
  }
  cropSheet(f) {
    if(this.crops.has(f.i))return this.crops.get(f.i);
    const scale=this.scale,cw=Math.ceil(SPR_W*scale),ch=Math.ceil(SPR_H*scale);
    const image=document.createElement('canvas');image.width=cw*17;image.height=ch*2;const g=image.getContext('2d');
    for(let i=0;i<=16;i++)g.drawImage(plantSprite(f,i/16,i===16,false,false),i*cw,0,cw,ch);
    g.drawImage(plantSprite(f,1,true,true,false),0,ch,cw,ch);
    g.drawImage(plantSprite(f,1,true,false,false,true),cw,ch,cw,ch);
    const entry={image,cw,ch};this.crops.set(f.i,entry);PLANT_CACHE.clear();return entry;
  }
  fields() {
    for(const f of S.fields){
      if(!inView(f.cx,f.cy,330))continue;
      if(!f.unlocked){this.stamp('locked|'+f.i,f.x0-28,f.y0-38,f.w+56,f.h+90,()=>drawLockedField(f));continue;}
      const gold=f.lv>=4,worn=f.lv===0;
      this.stamp('field|'+f.i+'|'+f.lv,f.x0-44,f.y0-52,f.w+88,f.h+140,()=>drawFieldBase(f,gold,worn,true));
    }
    for(const f of S.fields){
      if(!f.unlocked || !inView(f.cx,f.cy,330))continue;
      const gold=f.lv>=4;
      const sheet=this.cropSheet(f);
      for(const p of f.plots)if(p.sown&&p.t>=.3&&inView(p.x,p.y,90))this.shape('shadow',p.x+5,p.y+13,24+20*p.t,10+6*p.t,'#493626',.22);
      for(const p of f.plots)if(p.sown&&p.t>=1&&inView(p.x,p.y,90))this.shape('dot',p.x,p.y+12,48,20,'#ffe678',.19+.09*Math.sin(time*6+p.wob));
      for(const p of f.plots){
        if(!inView(p.x,p.y,110))continue;
        if(!p.sown){
          const b=this.bake('leftover|'+f.i,48,36,()=>{
            const p0={...p,x:24,y:16};
            if(f.i===0){ctx.strokeStyle='#d6a948';ctx.lineWidth=2.2;for(let o=-2;o<=2;o++){ctx.beginPath();ctx.moveTo(24+o*4.5,26);ctx.lineTo(24+o*4.5,20-(o%2)*2);ctx.stroke();}}
            else if(!drawLeftoverLive(f,p0)){ctx.fillStyle='#9a5f32';for(const[dx,dy]of[[-7,8],[0,6],[7,9]]){ctx.beginPath();ctx.ellipse(24+dx,16+dy,2.6,1.6,0,0,Math.PI*2);ctx.fill();}}
          });this.gpu.sprite({image:b.image,x:p.x-24,y:p.y-16,w:48,h:36});continue;
        }
        const stage=Math.min(16,Math.round(clamp(p.t,0,1)*16)),golden=p.t>=1&&p.gold;
        if(golden)this.shape('glow',p.x,p.y-20,54,40,'#ffe48b',.25+.08*Math.sin(time*4+p.wob));
        const rect=golden?[0,sheet.ch,sheet.cw,sheet.ch]:[stage*sheet.cw,0,sheet.cw,sheet.ch];
        const pop=p.ripeAt!==undefined&&time-p.ripeAt<.5?Math.sin(Math.max(0,time-p.ripeAt)/.5*Math.PI)*.12:0;
        const size=p.pop!==undefined&&p.pop<1?Math.max(.02,easeOutBack(p.pop)):1;
        this.gpu.sprite({image:sheet.image,rect,x:p.x,y:p.y,w:SPR_W*size*(1+pop),h:SPR_H*size*(1+pop),anchorX:SPR_OX/SPR_W,anchorY:SPR_OY/SPR_H,sway:2.1,phase:p.wob+p.x*.013});
      }
      if(CROP_ART.ready&&f.i===1)for(const p of f.plots)if(p.sown&&p.t>.18&&inView(p.x,p.y,60)){
        const lip=this.bake('carrot-soil|'+gold,30,12,()=>{ellipse(15,4,11,2.4,'#845839',0);ctx.strokeStyle=gold?'#dcac69':'#ba885b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(4,4);ctx.quadraticCurveTo(15,9,26,4);ctx.stroke();});
        this.gpu.sprite({image:lip.image,x:p.x-15,y:p.y+6,w:30,h:12});
      }
      for(const p of f.plots)if(p.sown&&p.t>=1&&inView(p.x,p.y,90)){
        const tw=(time*.8+p.wob)%4;
        if(tw<.45){const a=Math.sin(tw/.45*Math.PI);this.shape('star',p.x+14,p.y-24,10+a*4,10+a*4,'#fff',a);this.shape('star',p.x-15,p.y-8,6+a*2,6+a*2,'#ffd23f',a);}
      }
      this.fieldLife(f);
    }
  }
  fieldLife(f) {
    const scareX=sideOf(f)<0?f.x0-24:f.x0+f.w+24,scareY=f.y0+f.h*.5+6;
    this.stamp('scarecrow|'+f.i+'|'+f.lv+'|'+storyStage(),scareX-46,scareY-115,92,142,()=>drawScarecrow(f));
    if(f.lv>=3){const hx=sideOf(f)<0?f.x0+30:f.x0+f.w-30,hy=f.y0-14;this.stamp('hive|'+f.i,hx-30,hy-88,60,102,()=>drawHive(f));}
    if(f.lv>=2){const phase=f.spray?Math.floor((time*3.1+f.i)%(Math.PI*2)/(Math.PI*2)*16):0;
      this.stamp('sprinkler|'+f.i+'|'+phase,f.cx-24,f.y0-48,48,62,()=>sprinklerBody(f.cx,f.y0-2,phase/16*Math.PI*2,f.spray));}
    for(const c of f.chickens||[]){
      if(!inView(c.x,c.y,70))continue;
      const fr=Math.floor(((c.bob%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/(Math.PI*2)*24);
      const b=this.bake('hen|'+c.white+'|'+c.face+'|'+(c.st==='peck')+'|'+fr,48,58,()=>{const old={x:c.x,y:c.y};c.x=24;c.y=47;try{drawChickenPose(c,(fr+.5)/24*Math.PI*2);}finally{Object.assign(c,old);}});
      this.gpu.sprite({image:b.image,x:c.x-24,y:c.y-47,w:48,h:58});
    }
    const rabbit=f.rabbit;
    if(rabbit&&rabbit.st!=='away'&&inView(rabbit.x,rabbit.y,70)){
      const b=this.bake('rabbit|'+rabbit.face+'|'+rabbit.st,64,64,()=>{const old={x:rabbit.x,y:rabbit.y,h:rabbit.h};Object.assign(rabbit,{x:32,y:52,h:0});try{drawRabbit(rabbit);}finally{Object.assign(rabbit,old);}});
      this.gpu.sprite({image:b.image,x:rabbit.x-32,y:rabbit.y-52+rabbit.h,w:64,h:64});
    }
    for(const b of f.birds||[]){if(!inView(b.x,b.y,70))continue;
      const fr=Math.floor(time*8)%4,sp=this.bake('sparrow|'+b.face+'|'+b.st+'|'+fr,64,64,()=>{const old={x:b.x,y:b.y};Object.assign(b,{x:32,y:48});try{drawSparrow(b);}finally{Object.assign(b,old);}});
      this.gpu.sprite({image:sp.image,x:b.x-32,y:b.y-48,w:64,h:64});
    }
    if(f.lv>=3)for(const b of f.bees||[]){if(!b.tgt)continue;const x=b.tgt.x+Math.cos(b.a)*20,y=b.tgt.y+Math.sin(b.a)*8-34+Math.sin(time*9+b.ph)*3;
      const fr=Math.round(Math.abs(Math.sin(time*30+b.ph))*8),face=Math.cos(b.a)>0?-1:1;
      const im=this.bake('bee|'+face+'|'+fr,24,24,()=>{ctx.translate(12,12);beeBody(face,fr/8);});this.gpu.sprite({image:im.image,x:x-12,y:y-12,w:24,h:24});}
  }
  decor(d) {
    if(!inView(d.x,d.y,210))return;
    const id=DECOR.indexOf(d),s=d.s;
    if(d.type==='tree'){
      this.stamp('trunk|'+id,d.x-42*s,d.y-36*s,84*s,50*s,()=>{shadow(d.x+6,d.y+4,30*s,11*s);drawTreeTrunk(d);});
      const b=this.bake('canopy|'+id,110*s,100*s,()=>{ctx.translate(-d.x+55*s,-d.y+88*s);drawTreeTop(d,0);});
      this.gpu.sprite({image:b.image,x:d.x,y:d.y-8*s,w:110*s,h:100*s,anchorX:.5,anchorY:.8,sway:1.5*s,phase:d.ph});return;
    }
    const B=DECOR_BOX[d.type]||DECOR_BOX.shroom,[bx,by,bw,bh,bp]=B,k=d.type==='bench'?1:s;
    if(d.type==='flower'){
      this.stamp('flower|'+id,d.x-16*s,d.y-36*s,32*s,43*s,()=>{drawFlowerStem(d,0);drawFlowerHead(d,0);},{rotation:Math.sin(time*2+d.ph)*.025});return;
    }
    this.stamp('decor|'+id,d.x+(bx-bp)*k,d.y+(by-bp)*k,(bw+bp*2)*k,(bh+bp*2)*k,()=>drawDecorStill(d));
  }
  actor(c,L,cap,hero=false) {
    if(!inView(c.x,c.y,160))return null;
    if(!this.looks.has(L))this.looks.set(L,this.looks.size);
    const stride=hero?Math.round((c.stride??(c.moving?1:0))*4)/4:1,walking=hero?stride>0:!!c.moving;
    const id=this.looks.get(L),tau=Math.PI*2,frames=hero?24:12,fr=walking?Math.floor(((c.bob%tau)+tau)%tau/tau*frames):-1;
    const full=c.carry.length>=cap,happy=(c.happy||0)>0,blink=((time+76*.013)%3.7)<.12;
    const cut=hero&&time-(c.cutAt??-1)<.22?Math.floor((time-c.cutAt)/.22*5):-1;
    const pose=(part)=>{const old={x:c.x,y:c.y,bob:c.bob,moving:c.moving,bsq:c.bsq,cutAt:c.cutAt,stride:c.stride};Object.assign(c,{x:76,y:120,bob:part==='basket'?0:(fr+.5)/frames*tau,moving:part==='basket'?false:fr>=0,bsq:0,stride});if(cut>=0)c.cutAt=time-(cut+.5)/5*.22;try{drawFarmer(c,L,L.size,cap,part);}finally{Object.assign(c,old);}};
    this.shape('shadow',c.x+3,c.y+24,hero?54:38,hero?18:13,'#493626',.3);
    const bob=walking?Math.abs(Math.sin(c.bob))*4*stride:Math.sin(time*3+c.x*.01)*1.2;
    const sway=hero?Math.sin(c.bob-.45)*.016*(c.stride||0):0;
    const turn=hero?1-.09*Math.sin(Math.PI*(c.turnT||0)/.12):1;
    if(!L.noBasket){
      const signature=c.carry.slice(0,BASKET_MAX_SHOW).map(x=>x.t>=1?x.ci:'-').join(','),gear=hero?gearLv():0;
      const b=this.bake('basket|'+id+'|'+c.face+'|'+signature+'|'+gear,152,164,()=>pose('basket'));
      const squash=c.bsq||0;
      this.gpu.sprite({image:b.image,x:c.x,y:c.y+20-bob,w:152*turn*(1+squash*.075),h:164*(1-squash*.09),rotation:sway,anchorX:.5,anchorY:140/164});
    }
    const body=this.bake('body|'+id+'|'+c.face+'|'+fr+'|'+stride+'|'+full+'|'+happy+'|'+blink+'|'+cut+'|'+storyStage(),152,164,()=>pose('body'),hero);
    const result={image:body.image,x:c.x-76*turn,y:c.y-120-(walking?0:bob),w:152*turn,h:164};
    this.gpu.sprite(result);
    for(let i=0;i<c.carry.length;i++){
      const item=c.carry[i];if(item.t>=1)continue;
      const o=slotOffset(Math.min(i,BASKET_MAX_SHOW-1));
      const target={x:basketX(c)+o.x*c.face*L.size,y:c.y+22+basketH(c)+o.y*L.size};
      const p=pickupPose(item,target);
      this.icon(CROPS[item.ci].em,p.x,p.y,p.size,{rotation:p.rotation,alpha:p.alpha*(i>=BASKET_MAX_SHOW&&item.t>.8?(1-item.t)/.2:1)});
    }
    if(!hero&&c.resting&&c.state==='rest')this.label('z',c.x+12,c.y-70-Math.sin(time)*4,16,18,{alpha:.5});
    return result;
  }
  building(kind) {
    if(kind==='stall'){
      const m=MARKET,base=m.y+m.h/2,w=m.w+36,h=256,x=m.x-w/2;
      if(!inView(m.x,base,330))return;
      if(!PAINTED.ready){this.stamp('stall-fallback|'+S.stallLv,m.x-240,base-330,480,390,()=>drawStall());return;}
      this.shape('shadow',m.x+10,base+7,w*.92,38,'#493626',.28);
      this.gpu.sprite({image:PAINTED.image,rect:PAINTED.rects[0],x,y:base-h,w,h});
      const k=Math.round(keeperB*4),keeper=this.bake('keeper|'+k,64,90,()=>drawMarketKeeper(32,30-k*2));
      this.gpu.sprite({image:keeper.image,x:m.x-32,y:base-132+Math.sin(time*2)*1.5,w:64,h:90});
      const r=PAINTED.rects[0],front=.205;
      this.gpu.sprite({image:PAINTED.image,rect:[r[0],r[1]+r[3]*(1-front),r[2],r[3]*front],x,y:base-h*front,w,h:h*front});
      this.stamp('market-sign',m.x-70,base-h-36,140,70,()=>{ctx.strokeStyle='#9b7749';ctx.lineWidth=2;for(const dx of [-44,44]){ctx.beginPath();ctx.moveTo(m.x+dx,base-h-4);ctx.lineTo(m.x+dx,base-h+40);ctx.stroke();}timber(m.x-65,base-h-33,130,29,'#ffdb8b','#b96936','#81482b');text('MARKET',m.x,base-h-19,19,'#fff5d5',{font:'Lilita One',weight:400});});
      if(S.stallLv>0)this.label('Lv '+(S.stallLv+1),x+w-30,base-17,46,19);
      if(S.stallLv>=2)this.gpu.sprite({image:PAINTED.image,rect:PAINTED.rects[5],x:x+w+8,y:base-49,w:44,h:48});
      if(S.stallLv>=4){const b=this.bake('market-helper',30,38,()=>{circle(15,18,10,softSkin(15,18,10,'#efc49b'),1.5);box(4,7,22,6,3,'#648947',1.5);circle(12,19,1.4,COL.ink,0);circle(18,19,1.4,COL.ink,0);});this.gpu.sprite({image:b.image,x:m.x+57,y:base-127,w:30,h:38});}
    } else if(kind==='barn'){
      const x=BARN.x,y=BARN.y;
      this.stamp('barn|'+S.up.hands+'|'+activeBarn,x-BARN.w/2-100,y-245,BARN.w+245,300,()=>drawBarn());
    } else if(kind==='home'){
      const x=HOME.x,y=HOME.y,w=HOME.w+40,h=211;
      if(!PAINTED.ready){this.stamp('home-vector',x-w/2-35,y-260,w+100,315,()=>drawHome());return;}
      this.shape('shadow',x+10,y+5,w*.92,32,'#493626',.28);
      this.gpu.sprite({image:PAINTED.image,rect:PAINTED.rects[2],x:x-w/2,y:y-h,w,h});
      for(let i=0;i<3;i++){const k=(time*.22+i/3)%1;this.shape('dot',x+48+Math.sin(k*5+i)*7,y-201-k*39,8+k*18,8+k*18,'#fff7e2',(1-k)*.32);}
      if(lunchReady()&&dist(P.x,P.y,x,y)<200)this.icon('🍲',x,y-232+Math.sin(time*3)*3,22);
    }
  }
  worldObjects() {
    for(let i=0;i<pads.length;i++){
      const p=pads[i];if(!padAvail(p)&&!(p.type==='field'&&p.f.unlocked))continue;
      const cost=padCost(p),ripe=p.f?p.f.plots.filter(x=>x.sown&&x.t>=1).length:0;
      this.stamp('pad|'+i+'|'+(p.f?.lv??0)+'|'+p.on+'|'+(S.coins>=cost)+'|'+ripe+'|'+(dist(P.x,P.y,p.x,p.y)<240),p.x-74,p.y-122,148,178,()=>drawPad(p));
    }
    this.pond();
    for(const e of eggs){if(inView(e.x,e.y,50))this.icon('🥚',e.x,e.y-8-Math.abs(Math.sin(time*3+e.x))*2,17);}
    if(giftReady())this.stamp('gift|'+S.daily?.streak,GIFT.x-55,GIFT.y-105,110,135,()=>drawGift(),{y:GIFT.y-105-Math.abs(Math.sin(time*3))*4});
    for(const d of DECOR)if(!TALL.has(d.type))this.decor(d);
    this.groundNavigation();
    const sorted=[...hands.map(c=>({y:c.y,c,L:lookOf(c),cap:handCap()})),{y:P.y,c:P,L:LOOKS.hero,cap:capOf(),hero:true},
      {y:MARKET.y+MARKET.h/2,kind:'stall'},{y:BARN.y,kind:'barn'},
      {y:WM.y,kind:'windmill'},{y:GATE.y,kind:'gate'}];
    if(S.homeBuilt)sorted.push({y:HOME.y,kind:'home'});
    if(partnerActive())sorted.push({y:PT.y,c:PT,L:LOOKS.partner,cap:99});
    if(lenderVisible())sorted.push({y:ML.y,c:ML,L:LOOKS.lender,cap:99});
    for(const v of VILLAGERS)if(!v.hidden)sorted.push({y:v.y,c:v,L:v.look,cap:99});
    for(const d of DECOR)if(TALL.has(d.type))sorted.push({y:d.y,decor:d});
    for(const lamp of LAMPS)sorted.push({y:lamp.y,lamp});
    sorted.sort((a,b)=>a.y-b.y);let heroSprite=null;
    for(const o of sorted){
      if(o.c){const sp=this.actor(o.c,o.L,o.cap,o.hero);if(o.hero)heroSprite=sp;}
      else if(o.decor)this.decor(o.decor);
      else if(o.lamp)this.stamp('lamp|'+o.lamp.x+'|'+o.lamp.y,o.lamp.x-24,o.lamp.y-104,48,112,()=>drawLamp(o.lamp));
      else if(o.kind==='windmill')this.windmill();
      else if(o.kind==='gate')this.stamp('gate|'+S.season+'|'+S.name,GATE.x-160,GATE.y-205,320,255,()=>drawArch());
      else this.building(o.kind);
    }
    if(heroSprite&&sorted.some(o=>o.kind&&o.y>P.y-25&&o.y<P.y+200&&Math.abs((o.kind==='barn'?BARN.x:o.kind==='home'?HOME.x:o.kind==='stall'?MARKET.x:-1e4)-P.x)<180))this.gpu.sprite({...heroSprite,alpha:.35});
  }
  windmill() {
    if(!inView(WM.x,WM.y,290))return;
    if(!PROP_ART.ready){this.stamp('windmill-vector|'+Math.floor((time*.9)%(Math.PI*2)/(Math.PI*2)*24),WM.x-110,WM.y-260,220,290,()=>drawWindmill());return;}
    this.shape('shadow',WM.x+10,WM.y+6,88,28,'#493626',.28);
    this.gpu.sprite({image:PROP_ART.image,rect:PROP_ART.rects[11],x:WM.x-42,y:WM.y-145,w:84,h:147});
    const blades=this.bake('windmill-blades',144,144,()=>{
      ctx.translate(72,72);
      for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);box(-6,-64,12,60,3,materialLight(-6,-64,12,60,'#fff8da','#e2cf9d','#a98b5e'),2);ctx.strokeStyle='#c2a875';ctx.lineWidth=1.5;for(let k=1;k<5;k++){ctx.beginPath();ctx.moveTo(-6,-64+k*12);ctx.lineTo(6,-64+k*12);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,-64);ctx.lineTo(0,-4);ctx.stroke();ctx.restore();}circle(0,0,6,'#8a5a3c',2.5);
    });
    this.gpu.sprite({image:blades.image,x:WM.x,y:WM.y-104,w:144,h:144,anchorX:.5,anchorY:.5,rotation:time*.9});
  }
  pond() {
    const {x,y,rx,ry}=POND;if(!inView(x,y,rx+90))return;
    this.stamp('pond',x-rx-50,y-ry-50,rx*2+100,ry*2+120,()=>drawPond(true));
    for(let i=0;i<2;i++){const k=(time*.25+i*.5)%1;this.shape('ring',x+10,y+4,20+k*80,10+k*40,'#fff',.55*(1-k));}
    for(let i=0;i<4;i++)this.shape('rect',x-35+i*22+Math.sin(time*1.5+i)*6,y-18+i*9,10,2.5,'#fff',.55);
    const duck=this.bake('pond-duck',60,56,()=>{ctx.translate(30,40);ellipse(0,-5,10,6,'#fff',2.2);ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-14,-14);ctx.lineTo(-9,-4);ctx.closePath();shape('#fff',2);circle(8,-14,5.5,'#fff',2.2);ctx.beginPath();ctx.moveTo(12,-14);ctx.lineTo(18,-12.5);ctx.lineTo(12,-11);ctx.closePath();shape('#f5a623',1.5);circle(9.5,-15.5,1.2,COL.ink,0);});
    const t=time*.5,face=Math.sin(t)<0?-1:1,dx=x+Math.cos(t)*42,dy=y+Math.sin(t)*18;
    this.gpu.sprite({image:duck.image,x:dx,y:dy,w:60*face,h:56,anchorX:.5,anchorY:40/56});
  }
  effects() {
    for(let i=CUTS.length-1;i>=0;i--){const c=CUTS[i],age=time-c.at;if(age>.16){CUTS.splice(i,1);continue;}if(c.f.i===1)continue; // The picked carrot itself supplies the uprooting motion.
      const k=age/.16,s=this.cropSheet(c.f);
      const rect=c.f.i===1?[s.cw,s.ch,s.cw,s.ch]:[16*s.cw,0,s.cw,s.ch];
      const width=SPR_W*(1+.18*Math.sin(k*Math.PI));
      if(c.f.i===1){const top=c.y+20-40*k-SPR_OY,visible=Math.min(SPR_H,c.y+8-top);this.gpu.sprite({image:s.image,rect:[rect[0],rect[1],rect[2],rect[3]*visible/SPR_H],x:c.x-width*SPR_OX/SPR_W,y:top,w:width,h:visible,alpha:1-k});}
      else this.gpu.sprite({image:s.image,rect,x:c.x,y:c.y,w:width,h:SPR_H*(1-.5*k),anchorX:SPR_OX/SPR_W,anchorY:SPR_OY/SPR_H,alpha:1-k});}
    for(const f of fliers){const p=salePose(f);this.icon(f.em,p.x,p.y,p.size,{rotation:p.rotation,alpha:p.alpha});}
    for(const p of parts){if(!inView(p.x,p.y,(p.maxR||p.r||4)+30))continue;const k=p.t/p.life,a=(1-k)*(1-k);
      if(p.coin)this.icon('🪙',p.x,p.y,p.r*2,{alpha:a});
      else if(p.ring){const r=p.r+(p.maxR-p.r)*(1-Math.pow(1-k,3));this.shape('ring',p.x,p.y,r*2,r*2,p.color,a);}
      else if(p.spark)this.shape('star',p.x,p.y,p.r*2*Math.sin(k*Math.PI),p.r*2*Math.sin(k*Math.PI),p.color,a);
      else if(p.swish)this.shape('swish'+Math.max(1,Math.round(Math.min(1,k*2.2)*6)),p.x,p.y,p.r*2,p.r*2,p.color,a,p.dir>0?0:Math.PI);
      else this.shape(p.leaf?'leaf':p.sq?'rect':'dot',p.x,p.y,p.r*2,p.leaf?p.r:p.r*2,p.color,a,p.leaf?p.rot+p.t*p.spin:p.t*6);
    }
    if(!QUAL.lv){
      for(const b of BUGS){const x=b.x,y=b.y-22+Math.sin(time*5+b.ph)*3;if(!inView(x,y,35))continue;const fr=Math.round(Math.abs(Math.sin(time*14+b.ph))*8);
        const image=this.bake('butterfly|'+b.col+'|'+fr,34,28,()=>{ctx.translate(17,14);bugBody(b.col,.25+fr/8*.75);}).image;
        this.gpu.sprite({image,x,y,w:34,h:28,anchorX:.5,anchorY:.5,rotation:b.a+Math.PI/2});}
      for(const p of PETALS){const y=p.y-p.h-Math.sin(p.ph*1.7)*10;if(inView(p.x,y,15))this.shape('dot',p.x,y,6.8,4.4,p.c,1,p.ph*2);}
    }
    if(FLOCK.active)for(const b of FLOCK.birds){const image=this.bake('flying-bird|'+Math.floor((time*12+b.ph)%(Math.PI*2)/(Math.PI*2)*8),36,24,()=>{ctx.strokeStyle=COL.ink;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(3,6);ctx.quadraticCurveTo(12,18,18,14);ctx.quadraticCurveTo(24,18,33,6);ctx.stroke();}).image;this.gpu.sprite({image,x:FLOCK.x+b.ox-18,y:FLOCK.y+b.oy-42,w:36,h:24});}
    for(const p of pops){const k=p.t/p.life,alpha=k<.6?1:1-(k-.6)/.4;if(p.em)this.icon(p.em,p.x,p.y,p.size,{alpha});else if(p.txt)this.label(p.txt,p.x,p.y,Math.min(300,p.txt.length*10+24),32,{alpha});}
  }

  lighting() {
    const n=nightAmt();
    for(const lamp of LAMPS)if(inView(lamp.x,lamp.y,140))this.shape('glow',lamp.x+7,lamp.y-66,(40+n*40)*2,(40+n*40)*2,'#ffdc6e',.04+n*.5);
    const base=MARKET.y+MARKET.h/2,w=MARKET.w+36;
    for(const dx of [-w*.43,w*.43])this.shape('glow',MARKET.x+dx,base-256*.42,(28+n*35)*2,(28+n*35)*2,'#ffdc6e',.08+n*.5);
    if(n>.25){
      for(const dx of [-53,53])this.shape('glow',BARN.x+dx,BARN.y-68,56,56,'#ffdc6e',n*.42);
      this.shape('glow',BARN.x,BARN.y-26,84,84,'#ffdc6e',n*.32);
      if(S.homeBuilt){for(const dx of [-57,57])this.shape('glow',HOME.x+dx,HOME.y-66,64,64,'#ffdc6e',n*.5);this.shape('glow',HOME.x,HOME.y-147,50,50,'#ffdc6e',n*.35);}
      this.shape('glow',P.x,P.y-12,160,160,'#ffebbd',(n-.25)*.2);
    }
    if(n>=.4)for(const f of FLIES){const x=f.x+Math.sin(time*f.sp+f.ph)*30,y=f.y+Math.cos(time*f.sp*.7+f.ph)*16-14,bl=Math.max(0,Math.sin(time*2.2+f.ph*3)),a=(n-.4)/.6*bl;
      if(bl<.1||!inView(x,y,35))continue;this.shape('glow',x,y,24,24,'#fffa96',.9*a);this.shape('dot',x,y,3.2,3.2,'#ffffc8',a);}
  }
  routeToGoal() {
    if(this.navRouteFrame===this.frame && this.frame!==undefined)return this.navRoute;
    this.navRouteFrame=this.frame;
    const target=running&&!storyOpen&&!document.hidden?navigationTarget():null;
    if(!target){this.navGoalKey='';this.navWaypoints=[];return this.navRoute=[];}
    const start={x:P.x,y:P.y},m=MARKET;
    const blocks=[
      {left:m.x-m.w/2-14,right:m.x+m.w/2+14,top:m.y-m.h/2,bottom:m.y+m.h/2+10},
      {left:WM.x-44,right:WM.x+44,top:WM.y-48,bottom:WM.y+8},
      {left:BABA_TREE.x-22,right:BABA_TREE.x+22,top:BABA_TREE.y-22,bottom:BABA_TREE.y+6},
      {left:BARN.x-BARN.w/2-6,right:BARN.x+BARN.w/2+6,top:BARN.y-50,bottom:BARN.y+8},
    ];
    if(S.homeBuilt)blocks.push({left:HOME.x-HOME.w/2-6,right:HOME.x+HOME.w/2+6,top:HOME.y-50,bottom:HOME.y+10});
    const key=[target.x,target.y,S.homeBuilt].join('|');
    if(key!==this.navGoalKey || !this.navWaypoints?.length || !segmentClear(start,this.navWaypoints[0],blocks)){
      this.navGoalKey=key;this.navWaypoints=groundRoute(start,target,blocks).slice(1);
    }
    while(this.navWaypoints.length>1 && segmentClear(start,this.navWaypoints[1],blocks))this.navWaypoints.shift();
    return this.navRoute=this.navWaypoints.length?[start,...this.navWaypoints]:[];
  }
  navigationDot() {
    return this.bake('cyan-navigation-dot',24,24,()=>{
      ctx.beginPath();ctx.arc(12,12,8.5,0,Math.PI*2);
      ctx.strokeStyle='#effdff';ctx.lineWidth=4;ctx.stroke();
      const fill=ctx.createLinearGradient(0,4,0,21);fill.addColorStop(0,'#91efff');fill.addColorStop(1,'#1498df');
      ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#14547b';ctx.lineWidth=1.2;ctx.stroke();
      ctx.beginPath();ctx.arc(9,8.5,2,0,Math.PI*2);ctx.fillStyle='rgba(242,255,255,.65)';ctx.fill();
    });
  }
  navigationArrow() {
    return this.bake('cyan-destination-arrow',32,40,()=>{
      ctx.beginPath();ctx.moveTo(10,5);ctx.lineTo(22,5);ctx.lineTo(22,21);
      ctx.lineTo(28,21);ctx.lineTo(16,35);ctx.lineTo(4,21);ctx.lineTo(10,21);ctx.closePath();
      ctx.lineJoin='round';ctx.strokeStyle='#effdff';ctx.lineWidth=5;ctx.stroke();
      const fill=ctx.createLinearGradient(0,5,0,35);fill.addColorStop(0,'#91efff');fill.addColorStop(1,'#1498df');
      ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#14547b';ctx.lineWidth=1.5;ctx.stroke();
    });
  }
  groundNavigation() {
    if(typeof COVER!=='undefined' && COVER)return;
    const route=this.routeToGoal();if(route.length<2)return;
    const points=route.map((p,i)=>({x:p.x,y:p.y+(i===0?22:0)}));
    const dots=flowingDots(points,time,20/zoom,24/zoom);
    if(!dots.length)return;
    const b=this.navigationDot();
    for(const dot of dots)if(inView(dot.x,dot.y,50))this.gpu.sprite({image:b.image,...dot,rotation:0,w:10/zoom,h:10/zoom,anchorX:.5,anchorY:.5});
  }
  navigation() {
    if(typeof COVER!=='undefined' && COVER)return;
    if(!running || storyOpen || document.hidden)return;
    const route=this.routeToGoal();if(route.length<2)return;
    const target=route[route.length-1];if(!inView(target.x,target.y,120))return;
    const b=this.navigationArrow();
    this.gpu.sprite({image:b.image,x:target.x,y:target.y-70+Math.sin(time*3.2)*1.5,w:22/zoom,h:28/zoom,anchorX:.5,anchorY:.5});
  }
  screen() {
    if(levelFlash>0)this.shape('rect',W/2,H/2,W,H,'#fff',levelFlash*.35,0,true);
    for(const c of uiCoins){if(c.t<0)continue;const k=c.t,e=k*k*(3-2*k);this.icon('🪙',lerp(c.sx,c.tx,e),lerp(c.sy,c.ty,e)-Math.sin(k*Math.PI)*c.arc,18-k*6,{screen:true});}
    this.navigation();
    if(joy.on){this.shape('dot',joy.ox,joy.oy,104,104,'#fff',.18,0,true);this.shape('ring',joy.ox,joy.oy,104,104,'#fff',.75,0,true);
      const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.hypot(dx,dy),m=Math.min(d,50);this.shape('dot',joy.ox+(d?dx/d*m:0),joy.oy+(d?dy/d*m:0),44,44,'#fff',.85,0,true);}
  }
  render() {
    this.frame=(this.frame||0)+1;
    const scale=sprScale(),art=[PAINTED.ready,CROP_ART.ready,PROP_ART.ready,TERRAIN_ART.ready].join('|');
    if(scale!==this.scale||art!==this.art){this.invalidate();this.scale=scale;this.art=art;}
    const n=nightAmt(),zz=zoom*(1+zoomKick),sx=shake>0?rnd(-shake,shake):0,sy=shake>0?rnd(-shake,shake):0;
    const camX=(W/2-Math.round(dpr*(W/2-(cam.x+sx)*zz))/dpr)/zz;
    const camY=(H/2-Math.round(dpr*(H/2-(cam.y+sy)*zz))/dpr)/zz;
    if(this.vignetteQuality!==QUAL.lv){this.vignetteQuality=QUAL.lv;document.getElementById('vig').style.display=QUAL.lv?'none':'';}
    this.gpu.begin({width:W,height:H,dpr,zoom:zz,camX,camY,night:BENCH.noFx?0:QUAL.lv?n*.65:n,time,clearColor:n>.5?'#77769c':'#93b976'});
    if(!BENCH.noGround){
      this.ground();
      if(!BENCH.noObj){
        if(P.carry.length)this.shape('glow',MARKET.sellX,MARKET.sellY+14,330,178,'#ffe284',.35+.04*Math.sin(time*5));
        this.stamp('rug',MARKET.sellX-130,MARKET.sellY-95,300,230,()=>drawSellMat());
      }
      this.fields();
    }
    if(!BENCH.noObj){this.worldObjects();this.effects();}
    if(!BENCH.noFx)this.lighting();this.screen();this.gpu.end();
  }
}

window.HarvestThreeScene={updateHeroMotion,create:()=>new FarmThreeScene(),version:'187'};
