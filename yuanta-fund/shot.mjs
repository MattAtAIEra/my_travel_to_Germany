// 版面驗收：headless Chrome 走完每一場，停在該場最後一句（所有 cue 都已亮），
// 截圖 + 量測是否溢出可視區。沒裝 playwright，用 Chrome 二進位 + CDP。
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;
const URL_ = pathToFileURL(resolve(process.argv[2] || 'index.html')).href;
const OUT = resolve('shots');
mkdirSync(OUT, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--window-size=1440,900',
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
const jsErrors = [];
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
try {
  await waitPort();
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    // 頁面沒有 window.__errs（模板從來沒定義過）—— 之前讀那個不存在的變數，
    // 這項檢查永遠回 0、永遠通過。只能靠 CDP 收。
    if (m.method === 'Runtime.exceptionThrown') {
      jsErrors.push(m.params.exceptionDetails?.exception?.description || 'unknown');
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      jsErrors.push(m.params.args?.map(a => a.description || a.value).join(' ') || 'console.error');
    }
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: URL_ });
  await sleep(2000);
  // 首播前 dock 是隱藏的（中央大 Play 還在）—— 觸發一次再暫停，讓控制列入鏡
  await evaluate(`const b=document.getElementById('bigPlay'); if(b) b.click(); return 1`);
  await sleep(900);
  await evaluate(`pause(); return 1`);
  await sleep(400);

  const scenes = await evaluate(`
    const seen = [], last = {};
    // 用 in 判斷有沒有見過，不能用 !last[...] —— 第一句的索引是 0（falsy），
    // 會讓第一個場景被推進去兩次。
    SUBS.forEach((s, i) => { if (!(s.scene in last)) seen.push(s.scene); last[s.scene] = i; });
    return seen.map(id => ({ id, last: last[id] }));`);

  console.log(`場景數：${scenes.length}\n`);
  for (const sc of scenes) {
    await evaluate(`goTo(${sc.last}, false); return 1`);
    await sleep(900);
    const m = await evaluate(`
      const el = document.querySelector('.scene.active');
      const cs = getComputedStyle(el);
      // 內容實高 vs 可用高（扣掉為字幕條保留的下 padding）
      const avail = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let content = 0;
      // 滿版裝飾層（hero 圖、漸層 overlay、blob、storybook 圖）本來就鋪滿場景，
      // 算進去會把每個有配圖的場景都誤判成溢出
      const deco = '.hero-img, .hero-overlay, .blob, .story-img';
      for (const c of el.children) {
        if (c.matches(deco)) continue;
        const r = c.getBoundingClientRect();
        content = Math.max(content, r.bottom);
      }
      const top = el.getBoundingClientRect().top + parseFloat(cs.paddingTop);
      return { used: Math.round(content - top), avail: Math.round(avail),
               hidden: el.querySelectorAll('[data-cue]:not(.cue-mark):not(.cue-on):not(.cue-seen)').length };`);
    const over = m.used > m.avail;
    if (over) fail++;
    console.log(`${over ? '✗ 溢出' : '✓'} ${sc.id.padEnd(5)} 內容 ${String(m.used).padStart(4)}px / 可用 ${m.avail}px${m.hidden ? `  (仍隱藏 ${m.hidden} 個 cue 元件)` : ''}`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, `${sc.id}.png`), Buffer.from(shot.data, 'base64'));
  }
  if (jsErrors.length) fail++;
  console.log(`\nJS 錯誤：${jsErrors.length}`);
  jsErrors.forEach(e => console.log(`  ${e}`));
  console.log(fail ? `\n${fail} 場溢出可視區` : '\n全部場景都塞得下 ✓');
} catch (e) {
  console.error('驗收腳本出錯:', e.message);
  fail++;
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill();
}
process.exit(fail ? 1 : 0);
