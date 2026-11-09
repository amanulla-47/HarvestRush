// Local authoring tool only (excluded from dist/harvest-rush-crazygames.zip).
// Deterministic 30 fps headless Chrome + FFmpeg recorder for both CrazyGames promo videos.
import { createServer, request as httpRequest } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CHROME = process.env.HARVEST_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = process.env.HARVEST_FFMPEG || 'ffmpeg';
const FPS = 30;
const SECONDS = 18;
const TOTAL_FRAMES = FPS * SECONDS;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const key = randomBytes(16).toString('base64');
    const req = httpRequest({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13',
      },
    });
    req.on('error', reject);
    req.on('upgrade', (res, socket) => {
      const expected = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
      if (res.headers['sec-websocket-accept'] !== expected) {
        socket.destroy();
        return reject(new Error('Invalid WebSocket handshake'));
      }
      let buf = Buffer.alloc(0);
      let msgChunks = [];
      const pending = new Map();
      let nextId = 0;

      socket.on('data', chunk => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
          const b0 = buf[0], b1 = buf[1];
          const fin = (b0 & 0x80) !== 0;
          const opcode = b0 & 0x0f;
          const masked = (b1 & 0x80) !== 0;
          let len = b1 & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (buf.length < 4) return;
            len = buf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (buf.length < 10) return;
            len = Number(buf.readBigUInt64BE(2));
            offset = 10;
          }
          if (masked) offset += 4;
          if (buf.length < offset + len) return;
          let payload = buf.subarray(offset, offset + len);
          if (masked) {
            const mask = buf.subarray(offset - 4, offset);
            payload = Buffer.from(payload);
            for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
          }
          buf = buf.subarray(offset + len);
          if (opcode === 0x8) { socket.end(); return; }
          if (opcode === 0x9) {
            const pong = Buffer.alloc(2 + payload.length);
            pong[0] = 0x8a; pong[1] = 0x80 | payload.length;
            socket.write(pong);
            continue;
          }
          if (opcode === 0x1 || opcode === 0x0) {
            msgChunks.push(payload);
            if (fin) {
              const text = Buffer.concat(msgChunks).toString('utf8');
              msgChunks = [];
              const msg = JSON.parse(text);
              if (msg.id && pending.has(msg.id)) {
                const { resolve: resP, reject: rejP } = pending.get(msg.id);
                pending.delete(msg.id);
                msg.error ? rejP(new Error(msg.error.message || JSON.stringify(msg.error))) : resP(msg.result);
              }
            }
          }
        }
      });

      function send(method, params = {}) {
        return new Promise((resP, rejP) => {
          const id = ++nextId;
          pending.set(id, { resolve: resP, reject: rejP });
          const data = Buffer.from(JSON.stringify({ id, method, params }), 'utf8');
          const mask = randomBytes(4);
          let hdr;
          if (data.length < 126) {
            hdr = Buffer.alloc(6);
            hdr[0] = 0x81; hdr[1] = 0x80 | data.length;
            mask.copy(hdr, 2);
          } else if (data.length < 65536) {
            hdr = Buffer.alloc(8);
            hdr[0] = 0x81; hdr[1] = 0x80 | 126;
            hdr.writeUInt16BE(data.length, 2);
            mask.copy(hdr, 4);
          } else {
            hdr = Buffer.alloc(14);
            hdr[0] = 0x81; hdr[1] = 0x80 | 127;
            hdr.writeBigUInt64BE(BigInt(data.length), 2);
            mask.copy(hdr, 10);
          }
          const masked = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i & 3];
          socket.write(Buffer.concat([hdr, masked]));
        });
      }

      resolve({ send, close: () => socket.end() });
    });
    req.end();
  });
}

async function recordFormat(format, [w, h], debugPort, httpPort) {
  const profile = mkdtempSync(join(tmpdir(), `hr-promo-${format}-`));
  const framesDir = mkdtempSync(join(tmpdir(), `hr-frames-${format}-`));
  mkdirSync(framesDir, { recursive: true });

  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${w},${h}`,
    '--mute-audio',
    `http://127.0.0.1:${httpPort}/?debug&art&crew=6`,
  ], { stdio: 'ignore' });

  try {
    let target;
    for (let i = 0; i < 60 && !target; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
        target = list.find(t => t.type === 'page');
      } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    if (!target) throw new Error('Chrome page target not found');

    const cdp = await connectCDP(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });

    for (let i = 0; i < 100; i++) {
      const r = await cdp.send('Runtime.evaluate', {
        expression: `Boolean(
          window.FARM &&
          document.documentElement.dataset.renderer === 'threejs' &&
          !document.querySelector('#loading') &&
          document.documentElement.dataset.artRenderer === 'painted' &&
          document.documentElement.dataset.cropRenderer === 'painted' &&
          document.documentElement.dataset.propRenderer === 'painted' &&
          document.documentElement.dataset.terrainRenderer === 'painted'
        )`,
        returnByValue: true,
      });
      if (r.result?.value) break;
      await new Promise(r => setTimeout(r, 100));
    }

    const coverSrc = format === 'landscape'
      ? '/dist/covers/v2/landscape-1920x1080.png'
      : '/dist/covers/v2/portrait-800x1200.png';

    await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        window.requestAnimationFrame = () => 0;
        if (document.fonts) await document.fonts.ready;
        FARM.blockSave();
        setQuality(0);
        dpr = 1;
        resize();

        window.navigationTarget = () => null;
        window.goalTarget = () => null;
        window.guideTarget = () => null;
        const st = document.createElement('style');
        st.textContent = '#ql,#hint,#buy,#btns,#inspect,#strip,#banner,#tr{display:none!important}';
        document.head.appendChild(st);

        S.sound = false;
        S.stallLv = 2;
        S.homeBuilt = true;
        S.debtPaid = true;
        S.season = 0;
        S.up.hands = 8;
        S.up.growth = 6;
        S.up.seeder = 4;
        while (hands.length < 8) spawnHand(true);
        S.total = 4200;
        S.level = levelFromTotal(S.total).l;
        S.coins = 1250;
        dispCoins = 1250;
        FARM.pads.length = 0;

        const origBake = THREE_GAME.bake.bind(THREE_GAME);
        THREE_GAME.bake = function(key, w, h, paint, outline = false) {
          const keepSignText = key.startsWith('market-sign') || key.startsWith('barn|') || key.startsWith('gate|');
          return origBake(key, w, h, (g) => {
            const prevCover = COVER;
            if (keepSignText) COVER = false;
            try { paint(g); } finally { COVER = prevCover; }
          }, outline);
        };
        COVER = true;
        THREE_GAME.invalidate();

        const coverImg = document.createElement('img');
        coverImg.id = 'promoCover';
        coverImg.src = '${coverSrc}';
        coverImg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:90;pointer-events:none;opacity:1;';
        document.body.appendChild(coverImg);
        await new Promise((res, rej) => { coverImg.onload = res; coverImg.onerror = rej; });

        const isPort = ${format === 'portrait'};
        const shots = [
          { at: 0.3,  fi: 0, name: 'Wheat harvest' },
          { at: 3.1,  fi: 2, name: 'Tomato harvest' },
          { at: 5.8,  market: true, name: 'Market sale' },
          { at: 8.8,  fi: 3, name: 'Pumpkin harvest', upgradeWave: true },
          { at: 11.9, fi: 4, name: 'Strawberry harvest' },
          { at: 15.0, fi: 5, name: 'Corn harvest', finale: true },
        ];

        let shotIdx = -1, waypoints = [], wpIdx = 0;
        let camBase = { x: 1100, y: 860, zoom: isPort ? 1.28 : 1.6 };

        function makeSerpentine(f, leftToRight = true) {
          const xL = f.plots[0].x - 8, xR = f.plots[5].x + 8;
          const y0 = f.plots[0].y - 12, y1 = f.plots[6].y - 12, y2 = f.plots[12].y - 12, y3 = f.plots[18].y - 10;
          return leftToRight
            ? [{ x: xR, y: y0 }, { x: xR, y: y1 }, { x: xL, y: y1 }, { x: xL, y: y2 }, { x: xR, y: y2 }, { x: xR, y: y3 }, { x: xL, y: y3 }]
            : [{ x: xL, y: y0 }, { x: xL, y: y1 }, { x: xR, y: y1 }, { x: xR, y: y2 }, { x: xL, y: y2 }, { x: xL, y: y3 }, { x: xR, y: y3 }];
        }

        function resetAllFields(activeFi) {
          S.fields.forEach((f, i) => {
            f.unlocked = true;
            f.lv = (i >= 3 || i === activeFi) ? 4 : 3;
            f.spray = true;
            f.plots.forEach((p, j) => {
              p.sown = true; p.t = 1; p.pop = 1; p.wig = 0;
              p.owner = (i === activeFi) ? P : null;
              p.gold = (i === activeFi) ? (j === 3 || j === 8 || j === 15) : (j === 7);
            });
          });
        }

        const origUpdateHand = updateHand;
        window.updateHand = (h, dt) => { if (!h._parked) origUpdateHand(h, dt); };

        function stageHelpers(shot) {
          hands.forEach((h) => {
            h.sellT = 0; h.waitT = 0; h.resting = false; h.target = null;
            h._parked = true; h.x = -600; h.y = -600; h.state = 'rest'; h.restT = 99; h.carry = [];
          });
          const activate = (idx, props) => { hands[idx]._parked = false; Object.assign(hands[idx], props); };
          if (shot.market) {
            activate(0, { x: 1034, y: 508, face: 1, state: 'deliver', carry: [{ci:1,t:1},{ci:2,t:1},{ci:3,t:1},{ci:0,t:1}] });
            activate(1, { x: 1166, y: 514, face: -1, state: 'deliver', carry: [{ci:4,t:1},{ci:5,t:1},{ci:1,t:1}] });
            activate(2, { x: 1068, y: 690, face: 1, state: 'deliver', carry: [{ci:6,t:1},{ci:7,t:1},{ci:3,t:1},{ci:2,t:1}] });
            activate(3, { x: 820, y: 830, face: 1, state: 'seek', restT: 0, carry: [{ci:1,t:1}] });
          } else if (shot.fi === 0) {
            const f1 = S.fields[1];
            activate(0, { x: f1.plots[2].x, y: f1.plots[2].y, face: 1, state: 'seek', restT: 0, carry: [{ci:1,t:1},{ci:1,t:1}] });
            activate(1, { x: f1.plots[15].x, y: f1.plots[15].y, face: -1, state: 'seek', restT: 0, carry: [{ci:1,t:1}] });
            activate(2, { x: 1078, y: 920, face: -1, state: 'deliver', carry: [{ci:0,t:1},{ci:1,t:1},{ci:2,t:1},{ci:1,t:1}] });
            if (f1.rabbit) Object.assign(f1.rabbit, { st: 'in', x: f1.x0 + 40, y: f1.cy + 20, tx: f1.cx, ty: f1.cy + 20, face: 1, h: 0, t: 6 });
          } else if (shot.fi === 2) {
            const f3 = S.fields[3];
            activate(0, { x: f3.plots[4].x, y: f3.plots[4].y, face: 1, state: 'seek', restT: 0, carry: [{ci:3,t:1},{ci:3,t:1}] });
            activate(1, { x: 1046, y: 1330, face: 1, state: 'deliver', carry: [{ci:2,t:1},{ci:3,t:1},{ci:2,t:1},{ci:0,t:1}] });
            activate(2, { x: f3.plots[16].x, y: f3.plots[16].y, face: -1, state: 'seek', restT: 0, carry: [{ci:3,t:1}] });
          } else if (shot.fi === 3) {
            const f5 = S.fields[5];
            activate(0, { x: 1046, y: 1320, face: -1, state: 'deliver', carry: [{ci:3,t:1},{ci:5,t:1},{ci:2,t:1},{ci:3,t:1}] });
            activate(1, { x: f5.plots[2].x, y: f5.plots[2].y, face: 1, state: 'seek', restT: 0, carry: [{ci:5,t:1},{ci:5,t:1}] });
          } else if (shot.fi === 4) {
            const f6 = S.fields[6], f5 = S.fields[5];
            activate(0, { x: f6.plots[4].x, y: f6.plots[4].y, face: 1, state: 'seek', restT: 0, carry: [{ci:6,t:1},{ci:6,t:1}] });
            activate(1, { x: 1168, y: 1740, face: 1, state: 'deliver', carry: [{ci:4,t:1},{ci:6,t:1},{ci:5,t:1},{ci:4,t:1}] });
            activate(2, { x: f5.plots[5].x, y: f5.plots[5].y, face: -1, state: 'seek', restT: 0, carry: [{ci:5,t:1}] });
          } else if (shot.fi === 5) {
            const f7 = S.fields[7], f4 = S.fields[4];
            activate(0, { x: f7.plots[10].x, y: f7.plots[10].y, face: -1, state: 'seek', restT: 0, carry: [{ci:7,t:1},{ci:7,t:1}] });
            activate(1, { x: 1150, y: 1840, face: -1, state: 'deliver', carry: [{ci:7,t:1},{ci:5,t:1},{ci:6,t:1},{ci:4,t:1}] });
            activate(2, { x: f4.plots[12].x, y: f4.plots[12].y, face: 1, state: 'seek', restT: 0, carry: [{ci:4,t:1},{ci:4,t:1}] });
          }
        }

        function enterShot(idx) {
          shotIdx = idx;
          const shot = shots[idx];
          parts.length = 0; fliers.length = 0; CUTS.length = 0;
          resetAllFields(shot.fi ?? -1);
          stageHelpers(shot);

          if (shot.market) {
            P.x = 1100; P.y = 608; P.face = 1;
            P.bestCombo = 18; P.firstBasket = false; P.sellT = 0;
            const mix = [5,4,3,2,6,7,3,4,5,2,1,0,6,7,5,4,3,2,5,4,6,7,3,4];
            P.carry = S.carry = mix.map(ci => ({ ci, t: 1 }));
            const f0 = S.fields[0];
            waypoints = [
              { x: 1100, y: 494, waitEmpty: true },
              { x: f0.plots[0].x - 10, y: f0.plots[0].y - 12 },
              { x: f0.plots[5].x + 10, y: f0.plots[0].y - 12 },
            ];
            wpIdx = 0;
            camBase = isPort ? { x: 1100, y: 515, zoom: 1.25 } : { x: 1100, y: 450, zoom: 1.28 };
          } else {
            const f = S.fields[shot.fi];
            const ltr = (shot.fi % 2 === 0);
            waypoints = makeSerpentine(f, ltr);
            wpIdx = 0;
            P.x = ltr ? f.plots[0].x - 24 : f.plots[5].x + 24;
            P.y = f.plots[0].y - 12;
            P.face = ltr ? 1 : -1;
            P.carry = S.carry = [{ ci: shot.fi, t: 1 }, { ci: (shot.fi + 1) % 6, t: 1 }];

            if (shot.fi === 0) camBase = isPort ? { x: 1245, y: 865, zoom: 1.28 } : { x: 1145, y: 845, zoom: 1.6 };
            else if (shot.fi === 2) camBase = isPort ? { x: 1230, y: 1295, zoom: 1.28 } : { x: 1360, y: 1325, zoom: 1.6 };
            else if (shot.fi === 3) {
              camBase = isPort ? { x: 695, y: 1345, zoom: 1.28 } : { x: 780, y: 1345, zoom: 1.6 };
              if (shot.upgradeWave) {
                celebrate(f.cx, f.cy, true); confetti(f.cx, f.cy, 36); coinBurst(f.cx, f.cy - 20, 8);
                f.plots.forEach((pl) => { pl.pop = 0.35; pl.wig = 1; });
              }
            } else if (shot.fi === 4) camBase = isPort ? { x: 1365, y: 1715, zoom: 1.28 } : { x: 1425, y: 1685, zoom: 1.6 };
            else if (shot.fi === 5) camBase = isPort ? { x: 920, y: 1780, zoom: 1.28 } : { x: 845, y: 1790, zoom: 1.6 };
          }
          zoom = camBase.zoom; cam.x = camBase.x; cam.y = camBase.y;
        }

        function driveBot(t) {
          const index = shots.findLastIndex(s => t >= s.at);
          if (index < 0) {
            if (shotIdx !== 0) enterShot(0);
            for (const k of ['w','a','s','d']) keys[k] = false;
            return;
          }
          if (index !== shotIdx) enterShot(index);
          const shot = shots[index];
          if (shot.fi !== undefined) for (const p of S.fields[shot.fi].plots) p.owner = P;
          if (shot.finale) {
            const st = t - shot.at;
            if ((Math.abs(st - 0.5) < 0.018) || (Math.abs(st - 1.7) < 0.018)) {
              celebrate(980, 1720, true);
              confetti(980, 1690, 30);
            }
          }
          for (const k of ['w','a','s','d']) keys[k] = false;
          const wp = waypoints[wpIdx];
          if (!wp) return;
          if (wp.waitEmpty && P.carry.length === 0) { wpIdx++; return; }
          const dx = wp.x - P.x, dy = wp.y - P.y;
          if (Math.hypot(dx, dy) < 14) {
            if (!wp.waitEmpty && wpIdx < waypoints.length - 1) wpIdx++;
            return;
          }
          if (Math.abs(dx) > 6) keys[dx > 0 ? 'd' : 'a'] = true;
          if (Math.abs(dy) > 6) keys[dy > 0 ? 's' : 'w'] = true;
        }

        window.updateCam = () => {
          zoom = camBase.zoom;
          const shot = shots[Math.max(0, shotIdx)];
          if (shot?.market) {
            cam.x = camBase.x + (P.x - 1100) * 0.15;
            cam.y = camBase.y + Math.max(0, P.y - 510) * 0.22;
          } else if (shot) {
            const f = S.fields[shot.fi];
            cam.x = camBase.x + (P.x - f.cx) * 0.18;
            cam.y = camBase.y + (P.y - f.cy) * 0.18;
          }
          const hw = W / 2 / zoom;
          cam.x = hw * 2 > CFG.worldW ? CFG.worldW / 2 : clamp(cam.x, hw, CFG.worldW - hw);
        };

        enterShot(0);
        frame(last + 1000 / 30);

        window.__stepPromo = (frameIndex) => {
          const t = frameIndex / 30;
          const coverEl = document.getElementById('promoCover');
          if (coverEl) {
            if (t < 0.30) { coverEl.style.opacity = '1'; coverEl.style.display = 'block'; }
            else if (t < 0.44) { coverEl.style.opacity = (1 - (t - 0.30) / 0.14).toFixed(3); coverEl.style.display = 'block'; }
            else coverEl.style.display = 'none';
          }
          if (frameIndex > 0) {
            driveBot(t);
            frame(last + 1000 / 30);
          }
          return { t: +t.toFixed(2), shot: shots[Math.max(0, shotIdx)]?.name, carry: P.carry.length, coins: Math.round(S.coins) };
        };
      })()`,
      returnByValue: true,
    });

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      await cdp.send('Runtime.evaluate', { expression: `window.__stepPromo(${f})`, returnByValue: true });
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 96 });
      writeFileSync(join(framesDir, String(f).padStart(4, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
    }

    cdp.close();

    const outMp4 = join(ROOT, 'dist', 'video', `harvest-rush-promo-${format}-${w}x${h}.mp4`);
    execFileSync(FFMPEG, [
      '-y', '-loglevel', 'error',
      '-framerate', String(FPS),
      '-i', join(framesDir, '%04d.jpg'),
      '-an',
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-r', String(FPS),
      '-movflags', '+faststart',
      outMp4,
    ]);
    console.log(`Wrote ${outMp4}`);
  } finally {
    chrome.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
    rmSync(framesDir, { recursive: true, force: true });
  }
}

const srv = createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  const fp = join(ROOT, decodeURIComponent(u.pathname === '/' ? 'index.html' : u.pathname));
  try {
    const data = readFileSync(fp);
    res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => srv.listen(8796, '127.0.0.1', r));

try {
  await recordFormat('landscape', [1920, 1080], 9352, 8796);
  await recordFormat('portrait', [1080, 1620], 9353, 8796);
} finally {
  srv.close();
}
