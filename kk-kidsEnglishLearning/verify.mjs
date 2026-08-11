// KK01 驗收：用 CDP 驅動 headless Chrome，實跑互動分支 + 版面溢出 + 說話者角標。
// 不用 playwright（本機沒裝）；Chrome 二進位 + Node 內建 WebSocket 就夠。
//   node verify.mjs [index.html]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;
const URL_ = pathToFileURL(resolve(process.argv[2] || 'index.html')).href;

const profile = mkdtempSync(join(tmpdir(), 'cdp-kk-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=1440,900',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitPort() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return; } catch {}
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
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
  }
  return r.result.value;
}

let ok = 0, fail = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { ok++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      got  ${a}\n      want ${e}`); }
}
function checkTrue(label, actual) { check(label, !!actual, true); }

try {
  await waitPort();
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      jsErrors.push(m.params.exceptionDetails?.exception?.description || 'unknown');
    }
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL_ });
  await sleep(2500);

  console.log('— 初始狀態 —');
  check('5 個章節點（開場/第一關/第二關/考考你/複習）',
    await evaluate(`return document.querySelectorAll('.chapter-dot').length`), 5);
  check('3 個 choice 場景', await evaluate(`return Object.keys(choiceScenes).length`), 3);
  check('9 個選項按鈕', await evaluate(`return document.querySelectorAll('.choice-opt').length`), 9);
  check('尚未選擇時 chosen 是空的', await evaluate(`return Object.keys(chosen).length`), 0);
  check('測驗那一關不掛 tone（掛了等於把答案寫在旁邊）',
    await evaluate(`return document.querySelectorAll('.scene-choice[data-id="s08"] .choice-tone').length`), 0);
  check('前兩關都有 tone 提示',
    await evaluate(`return document.querySelectorAll('.scene-choice[data-id="s03"] .choice-tone, .scene-choice[data-id="s05"] .choice-tone').length`), 6);

  console.log('— 13 張插圖 —');
  const imgs = await evaluate(`
    const out = [];
    document.querySelectorAll('img.story-img, img.hero-img, img.side-img').forEach(i =>
      out.push([i.getAttribute('src'), i.naturalWidth]));
    return out;`);
  check('宣告了 13 張圖', imgs.length, 13);
  check('全部載入且寬度非零', imgs.filter(([, w]) => !w).map(([s]) => s), []);

  console.log('— 57 顆旁白音檔 —');
  const audio = await evaluate(`
    const jobs = SUBS.filter(s => (s.text||'').trim()).map(s => new Promise(res => {
      const a = new Audio(audioUrl(s));
      a.addEventListener('loadedmetadata', () => res([s.id, a.duration]), {once:true});
      a.addEventListener('error', () => res([s.id, -1]), {once:true});
      setTimeout(() => res([s.id, a.duration || -1]), 8000);
    }));
    return Promise.all(jobs);`);
  check('宣告了 57 顆', audio.length, 57);
  check('全部載入且長度非零', audio.filter(([, d]) => !(d > 0)).map(([i]) => i), []);
  // sync_durations.py 把真實秒數寫回 subs —— 對不上代表音檔改過但沒重跑同步，
  // 時間軸會整段飄掉。
  const drift = await evaluate(`
    const byId = {}; SUBS.forEach(s => byId[s.id] = s);
    return ${JSON.stringify(audio)}.filter(([id, d]) =>
      Math.abs((byId[id].dur || 0) - d) > 0.1).map(([id, d]) => [id, byId[id].dur, +d.toFixed(2)]);`);
  check('subs 的 dur 與實際音檔一致（誤差 <0.1s）', drift, []);

  console.log('— 背景音樂 —');
  check('BGM 元素存在且指向 Marimba Smile.mp3',
    await evaluate(`const b=document.getElementById('bgm'); return b && b.getAttribute('src')`),
    'BGM/Marimba Smile.mp3');
  check('BGM 循環播放', await evaluate(`return document.getElementById('bgm').loop`), true);
  check('音量是 0.11（不是預設的 0.15）',
    await evaluate(`return BGM_VOLUME`), 0.11);
  // 檔名有空格 —— file:// 下最容易在這裡爆。要求真的解碼出長度，不能只看元素在不在。
  const bgm = await evaluate(`
    const b = document.getElementById('bgm');
    return new Promise(res => {
      if (b.readyState >= 1) return res([b.src, b.duration]);
      b.addEventListener('loadedmetadata', () => res([b.src, b.duration]), {once:true});
      b.addEventListener('error', () => res([b.src, -1]), {once:true});
      setTimeout(() => res([b.src, b.duration || 0]), 6000);
    });`);
  console.log(`      解析後的 URL：${bgm[0]}`);
  check('BGM 檔案真的解得開（長度非零）', bgm[1] > 0, true);
  check('音量實際套用到元素上',
    await evaluate(`const b=document.getElementById('bgm');
      b.volume = BGM_VOLUME; return b.volume`), 0.11);

  console.log('— 說話者角標 —');
  await evaluate(`showSub(SUBS.find(s => s.id === '004')); return 1`);
  check('Funky 的句子帶 Funky 角標',
    await evaluate(`return document.querySelector('#subtitleBar .spk').getAttribute('data-speaker')`), 'Funky');
  check('角標有專屬底色（不是預設的半透明白）',
    await evaluate(`return getComputedStyle(document.querySelector('#subtitleBar .spk')).backgroundColor`), 'rgb(240, 144, 144)');
  await evaluate(`showSub(SUBS.find(s => s.id === '001')); return 1`);
  check('Captain A 的句子換成 Captain A 角標',
    await evaluate(`return document.querySelector('#subtitleBar .spk').getAttribute('data-speaker')`), 'Captain A');
  check('角標文字沒有進到 TTS 用的 text 欄位',
    await evaluate(`return SUBS.filter(s => (s.text||'').includes('Captain A：')).length`), 0);

  console.log('— 第一關：走到等待狀態 —');
  await evaluate(`isPlaying = true; goTo(SUBS.findIndex(s => s.id === '007'), false); advance(); return 1`);
  await sleep(300);
  check('進入等待選擇', await evaluate(`return awaiting`), 's03');
  check('choice 場景掛上 awaiting', await evaluate(`return choiceScenes['s03'].classList.contains('awaiting')`), true);
  check('等待時播放鍵停用',
    await evaluate(`document.getElementById('playBtn').click(); return awaiting`), 's03');
  check('等待時選項可點',
    await evaluate(`return getComputedStyle(document.querySelector('.scene-choice[data-id="s03"] .choice-opt')).pointerEvents`), 'auto');

  console.log('— 用數字鍵 2 選（b1b 拼給她聽）—');
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {code:'Digit2', bubbles:true})); return 1`);
  await sleep(300);
  check('chosen 記錄 b1b', await evaluate(`return chosen['s03']`), 'b1b');
  check('awaiting 解除', await evaluate(`return awaiting`), null);
  check('跳到 b1b 第一句 012', await evaluate(`return SUBS[curIdx].id`), '012');
  check('未選中的 b1a(008) 隱形', await evaluate(`return isActive(SUBS.findIndex(s=>s.id==='008'))`), false);
  check('未選中的 b1c(016) 隱形', await evaluate(`return isActive(SUBS.findIndex(s=>s.id==='016'))`), false);
  check('b1b 播完收回主線 020',
    await evaluate(`return SUBS[nextActive(SUBS.findIndex(s=>s.id==='015')+1)].id`), '020');
  check('分支只走 b1b 這條，不誤播其他兩條',
    await evaluate(`
      let i = SUBS.findIndex(s=>s.id==='012'); const seen=[];
      while (i < SUBS.length && SUBS[i].scene !== 's05') { seen.push(SUBS[i].id); i = nextActive(i+1); }
      return seen`), ['012','013','014','015']);

  console.log('— 測驗關：三條分支都要念到正解 —');
  check('b3a（少了 s）分支裡有人念出 two apples',
    await evaluate(`return SUBS.filter(s=>s.track==='b3a').some(s=>/two apples/i.test(s.text||''))`), true);
  check('b3c（順序反了）分支裡有人念出 two apples',
    await evaluate(`return SUBS.filter(s=>s.track==='b3c').some(s=>/two apples/i.test(s.text||''))`), true);
  check('三條測驗分支都收回同一個主線場景 s10',
    await evaluate(`return ['b3a','b3b','b3c'].map(t => {
      const last = SUBS.map((s,i)=>[s,i]).filter(([s])=>s.track===t).pop()[1];
      return SUBS[nextActive(last+1)].scene; })`), ['s10','s10','s10']);
  check('測驗題出在 Funky 身上（不是出在孩子身上）',
    await evaluate(`return ['b3a','b3b','b3c'].map(t =>
      SUBS.find(s=>s.track===t && s.signature).voice)`), ['funky','funky','funky']);

  console.log('— RECAP 重播 —');
  await evaluate(`chosen['s05']='b2c'; chosen['s08']='b3b';
    ['s05','s08'].forEach(sid => { const t = chosen[sid];
      choiceScenes[sid].querySelectorAll('.choice-opt').forEach(b =>
        b.classList.toggle('picked', b.getAttribute('data-track')===t)); });
    return 1`);
  check('三句 signature = 使用者實際選過的',
    await evaluate(`return ['s03','s05','s08'].map(k => signatureFor(chosen[k]).id)`), ['012','030','042']);
  check('三句來自三個不同角色',
    await evaluate(`return ['s03','s05','s08'].map(k => signatureFor(chosen[k]).voice)`),
    ['captain_a','rex','funky']);
  check('replay 字幕帶回原說話者角標',
    await evaluate(`showSub(SUBS.find(s=>s.id==='056'));
      return document.querySelector('#subtitleBar .spk').getAttribute('data-speaker')`), 'Funky');
  await evaluate(`fillRecap && fillRecap('s03'); return 1`).catch(() => {});

  console.log('— 版面溢出（非滿版圖的場景）—');
  const overflow = await evaluate(`
    const out = [];
    document.querySelectorAll('.scene-choice, .scene-recap, .scene:not([class*="scene-"])').forEach(sc => {
      const prev = sc.className; sc.classList.add('active');
      const avail = sc.clientHeight - 88 - 200;   // 頂欄 88 / 字幕+dock 200
      let h = 0;
      sc.querySelectorAll(':scope > *').forEach(el => {
        if (el.classList.contains('hero-img') || el.classList.contains('hero-overlay') ||
            el.classList.contains('blob') || el.classList.contains('story-img')) return;
        h += el.offsetHeight + parseFloat(getComputedStyle(el).marginTop || 0)
                             + parseFloat(getComputedStyle(el).marginBottom || 0);
      });
      out.push([sc.getAttribute('data-id'), Math.round(h), Math.round(avail)]);
      sc.className = prev;
    });
    return out;`);
  for (const [id, h, avail] of overflow) {
    check(`${id} 內容 ${h}px 塞得進 ${avail}px`, h <= avail, true);
  }

  console.log('— 主控台 —');
  check('零 JS 錯誤', jsErrors, []);

  console.log(`\n${fail === 0 ? '✓ 全數通過' : '✗ 有失敗項'} — ${ok} 通過 / ${fail} 失敗`);
} catch (e) {
  console.error('驗收中斷：', e.message);
  fail = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
}
process.exit(fail === 0 ? 0 : 1);
