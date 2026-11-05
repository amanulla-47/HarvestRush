// Screenshots a page once a JS condition is true (headless Chrome over DevTools; no external packages).
// Usage: node tools/shoot.mjs <url> <width> <height> <out.png> [readyExpression]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [url, w, h, out, ready = 'true'] = process.argv.slice(2);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', port = 9400 + Math.floor(Math.random()*400);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'hr-shot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--mute-audio', 'about:blank'], { stdio: 'ignore' });
try {
  let t; for (let i = 0; i < 50 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch {} if (!t) await sleep(200); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cdp('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url });
  for (let i = 0; i < 120; i++) { const r = await cdp('Runtime.evaluate', { expression: `!!(${ready})`, returnByValue: true }); if (r.result?.result?.value) break; await sleep(150); }
  await sleep(400);
  const shot = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.result.data, 'base64')); console.log(out); ws.close();
} finally { chrome.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); }
