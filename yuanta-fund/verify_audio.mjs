// 播放驗收：headless Chrome 實際載入每顆 mp3，確認檔名對得上、解得開、長度非零。
// （Chrome 擴充套件分頁與 python http.server 都會卡媒體，所以走 CDP + file://）
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;
const URL_ = pathToFileURL(resolve(process.argv[2] || 'sample.html')).href;

const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {}
    await sleep(250);
  }
  throw new Error('Chrome 沒有在時限內開啟 CDP port');
}

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', {
    expression: `(function(){${expr}})()`, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
  return r.result.value;
}

let fail = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`  ✓ ${label}`);
  else { fail++; console.log(`  ✗ ${label}\n      got  ${a}\n      want ${e}`); }
};

try {
  await waitPort();
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  // 真正收集 JS 錯誤：未捕捉例外 + console.error（頁面沒有 window.__errs，靠 CDP 收）
  const errs = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'exception');
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errs.push(m.params.args.map(a => a.description || a.value).join(' '));
    }
  });
  await send('Page.navigate', { url: URL_ });
  await sleep(2000);

  // 每一句有台詞的字幕，實際 new Audio() 載入其約定檔名，量測 metadata
  const report = await evaluate(`
    const spoken = SUBS.filter(s => (s.text || '').trim());
    return Promise.all(spoken.map(s => new Promise(resolve => {
      const a = new Audio('audio/' + PREFIX + '-' + s.id + '.mp3');
      const done = ok => resolve({ id: s.id, ok, dur: Math.round((a.duration || 0) * 100) / 100 });
      a.addEventListener('loadedmetadata', () => done(true), { once: true });
      a.addEventListener('error', () => done(false), { once: true });
      setTimeout(() => done(false), 8000);
    })));`);

  const bad = report.filter(r => !r.ok || !r.dur);
  check('25 顆音檔全部載入且長度非零', bad.length ? bad : report.length, 25);
  const total = report.reduce((s, r) => s + r.dur, 0);
  console.log(`  ℹ 旁白總長 ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`);

  // 背景音樂：元素在、音量對、檔案真的解得開（中文檔名在 file:// 下的 URL encoding 是常見地雷）
  const bgm = await evaluate(`
    const el = document.getElementById('bgm');
    if (!el) return { present: false };
    const info = { present: true, srcAttr: el.getAttribute('src'), resolved: el.src,
                   loop: el.loop, volume: typeof BGM_VOLUME === 'number' ? BGM_VOLUME : null };
    return new Promise(resolve => {
      const done = ok => resolve(Object.assign(info, { ok, dur: Math.round((el.duration || 0) * 100) / 100 }));
      if (el.readyState >= 1) return done(true);
      el.addEventListener('loadedmetadata', () => done(true), { once: true });
      el.addEventListener('error', () => done(false), { once: true });
      el.load();
      setTimeout(() => done(false), 8000);
    });`);
  check('BGM <audio id="bgm"> 存在', bgm.present, true);
  check('BGM src 指向 BGM/北歐晴途.mp3', bgm.srcAttr, 'BGM/北歐晴途.mp3');
  check('BGM 音量設定為 0.11', bgm.volume, 0.11);
  check('BGM loop 開啟', bgm.loop, true);
  check('BGM 檔案載入成功且長度非零', bgm.ok === true && bgm.dur > 0, true);
  console.log(`  ℹ BGM 解析後 URL ${bgm.resolved}\n  ℹ BGM 長度 ${Math.floor((bgm.dur || 0) / 60)}:${String(Math.round((bgm.dur || 0) % 60)).padStart(2, '0')}`);

  // 時間軸真的會走：從第一句開始播，確認 curIdx 前進
  await evaluate(`play(); return 1`);
  await sleep(4000);
  const idx = await evaluate(`return curIdx`);
  check('播放後時間軸前進（curIdx > 0）', idx > 0, true);
  // 播放中 BGM 真的在響（不是只有元素存在）
  const bgmPlaying = await evaluate(`
    const el = document.getElementById('bgm');
    return el ? { paused: el.paused, t: Math.round(el.currentTime * 100) / 100, vol: el.volume } : null;`);
  check('播放時 BGM 有在跑（未暫停且 currentTime > 0）', !!bgmPlaying && !bgmPlaying.paused && bgmPlaying.t > 0, true);
  check('播放時 BGM 實際音量 0.11', bgmPlaying && Math.round(bgmPlaying.vol * 100) / 100, 0.11);
  check('主控台沒有 JS 錯誤', errs.length ? errs : 0, 0);

  console.log(fail ? `\n${fail} 項未通過` : '\n播放驗收全數通過 ✓');
} catch (e) {
  console.error('驗收腳本出錯:', e.message); fail++;
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill();
}
process.exit(fail ? 1 : 0);
