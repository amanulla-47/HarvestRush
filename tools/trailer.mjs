// Records the CrazyGames preview videos from the real game, frame by frame (no dropped frames, no cursor, no sound).
// Needs: the local server on :8767, Google Chrome, ffmpeg (Homebrew). Node 22+ (built-in WebSocket).
// Usage: node tools/trailer.mjs            → dist/video/harvest-rush-landscape-1920x1080.mp4 and -portrait-1080x1620.mp4,
//        and their first frames as dist/covers/cover-landscape-1920x1080.png and cover-portrait-800x1200.png
//        node tools/trailer.mjs landscape  → just one
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg'].find(p => { try { execFileSync(p, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
const URL = 'http://127.0.0.1:8767/?debug&trailer';
const FPS = 30, SECONDS = 19;
const SIZES = { landscape: [1920, 1080], portrait: [1080, 1620] };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function record(name, [w, h], port) {
  const profile = mkdtempSync(join(tmpdir(), 'hr-trailer-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(200); }
    if (!target) throw new Error('Chrome did not start');
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const waiting = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
    const cdp = (method, params = {}) => new Promise(r => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async expr => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;

    await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.enable'); await cdp('Page.navigate', { url: URL });
    for (let i = 0; i < 100 && !(await evaluate('window.__trailerReady === true')); i++) await sleep(150);

    const dir = join(ROOT, 'dist', 'video', `frames-${name}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    const total = FPS * SECONDS;
    for (let f = 0; f < total; f++) {
      if (f > 0) await evaluate('window.__step()');
      const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
      writeFileSync(join(dir, String(f).padStart(4, '0') + '.jpg'), Buffer.from(shot.result.data, 'base64'));
      if (f % 60 === 0) process.stdout.write(`${name}: ${f}/${total} (${await evaluate('window.__lastPhase || ""')})\n`);
    }
    ws.close();
    const out = join(ROOT, 'dist', 'video', `harvest-rush-${name}-${w}x${h}.mp4`);
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, '%04d.jpg'), '-an',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    // the video's first frame doubles as the static cover, as CrazyGames asks (portrait is scaled 1080x1620 → 800x1200)
    mkdirSync(join(ROOT, 'dist', 'covers'), { recursive: true });
    const cover = name === 'landscape' ? ['cover-landscape-1920x1080.png', []] : ['cover-portrait-800x1200.png', ['-vf', 'scale=800:1200:flags=lanczos']];
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(dir, '0000.jpg'), ...cover[1], join(ROOT, 'dist', 'covers', cover[0])]);
    rmSync(dir, { recursive: true, force: true });
    console.log('wrote', out);
  } finally { chrome.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); }
}

if (!FFMPEG) { console.error('ffmpeg not found'); process.exit(1); }
const which = process.argv[2] ? [process.argv[2]] : Object.keys(SIZES);
let port = 9333;
for (const name of which) await record(name, SIZES[name], port++);
