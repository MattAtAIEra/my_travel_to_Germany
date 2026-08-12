// Q2050 驗收：CDP 驅動 headless Chrome，實測音檔／插圖／版面／JS 錯誤。
// 本機沒裝 playwright —— Chrome 二進位 + Node 內建 WebSocket 就夠。
//   node verify.mjs [index.html]
//
// 設計原則：不信任「建置成功」。每一項都要求瀏覽器把東西真的解碼出來
// （音檔要有長度、圖要有 naturalWidth），版面要用實際幾何量測，
// JS 錯誤一律從 CDP 的 Runtime.exceptionThrown 收 —— 不讀任何頁面內變數。
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9337;
const URL_ = pathToFileURL(resolve(process.argv[2] || 'index.html')).href;

const profile = mkdtempSync(join(tmpdir(), 'cdp-q2050-'));
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

try {
  await waitPort();
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find(t => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    // JS 錯誤唯一可信的來源。頁面內沒有 window.__errs 這種東西 ——
    // 讀不存在的變數等於永遠通過。
    if (m.method === 'Runtime.exceptionThrown') {
      jsErrors.push(m.params.exceptionDetails?.exception?.description
                 || m.params.exceptionDetails?.text || 'unknown');
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

  console.log('— 結構 —');
  check('19 個場景', await evaluate(`return document.querySelectorAll('.scene').length`), 19);
  check('74 句旁白 + 2 個靜默幀 = 76 subs',
    await evaluate(`return SUBS.length`), 76);
  check('換場留白 2 秒（公版）', await evaluate(`return SCENE_GAP`), 2);
  check('語言標記 zh-Hant',
    await evaluate(`return document.documentElement.lang`), 'zh-Hant');

  console.log('— manga-color 主題 —');
  check('--primary 是深群青 #1F3A93',
    await evaluate(`return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()`),
    '#1F3A93');
  check('--cream 是暖紙白 #FBF7EE',
    await evaluate(`return getComputedStyle(document.documentElement).getPropertyValue('--cream').trim()`),
    '#FBF7EE');
  // manga.css 的標題字是 Impact 系（只覆蓋拉丁字母），純中文 deck 會 fallback 成醜字。
  check('標題字型以中文字型開頭，且完全不含 Impact',
    await evaluate(`
      const ff = getComputedStyle(document.querySelector('.h1')).fontFamily;
      return [ff.split(',')[0].replace(/"/g,'').trim(), /Impact/i.test(ff)];`),
    ['PingFang TC', false]);
  check('字幕條是方框對話框（無圓角）',
    await evaluate(`return getComputedStyle(document.getElementById('subtitleBar')).borderRadius`), '0px');
  check('頂欄退出液態玻璃（無 backdrop-filter）',
    await evaluate(`
      const s = getComputedStyle(document.querySelector('.topbar'));
      return [s.backdropFilter || s.webkitBackdropFilter, s.borderRadius];`),
    ['none', '0px']);

  console.log('— 12 張插圖 —');
  const imgs = await evaluate(`
    const out = [];
    document.querySelectorAll('img.story-img, img.hero-img, img.side-img').forEach(i =>
      out.push([i.getAttribute('src'), i.naturalWidth, i.naturalHeight]));
    return out;`);
  check('宣告了 12 張圖', imgs.length, 12);
  check('全部解碼成功（naturalWidth > 0）',
    imgs.filter(([, w]) => !(w > 0)).map(([s]) => s), []);

  console.log('— 74 顆旁白音檔 —');
  const audio = await evaluate(`
    const jobs = SUBS.filter(s => (s.text||'').trim()).map(s => new Promise(res => {
      const a = new Audio(audioUrl(s));
      a.addEventListener('loadedmetadata', () => res([s.id, a.duration]), {once:true});
      a.addEventListener('error', () => res([s.id, -1]), {once:true});
      setTimeout(() => res([s.id, a.duration || -1]), 10000);
    }));
    return Promise.all(jobs);`);
  check('宣告了 74 顆', audio.length, 74);
  check('全部載入且長度非零', audio.filter(([, d]) => !(d > 0)).map(([i]) => i), []);
  // Voai 曾經回傳 HTTP 200 但內容是 2KB 的空檔（本案 053 就中過）——
  // 只看「TTS 回報成功」抓不到，必須用秒數/字數比篩。
  const silent = await evaluate(`
    const byId = {}; SUBS.forEach(s => byId[s.id] = s);
    return ${JSON.stringify(audio)}
      .filter(([id, d]) => d / Math.max(byId[id].text.length, 1) < 0.10)
      .map(([id, d]) => [id, +d.toFixed(2), byId[id].text.length]);`);
  check('沒有空檔／截斷音檔（秒數與字數比例合理）', silent, []);
  // sync_durations.py 把真實秒數寫回 subs —— 對不上代表音檔改過但沒重跑同步。
  const drift = await evaluate(`
    const byId = {}; SUBS.forEach(s => byId[s.id] = s);
    return ${JSON.stringify(audio)}.filter(([id, d]) =>
      Math.abs((byId[id].dur || 0) - d) > 0.1).map(([id, d]) => [id, byId[id].dur, +d.toFixed(2)]);`);
  check('subs 的 dur 與實際音檔一致（誤差 <0.1s）', drift, []);

  console.log('— cue 覆蓋率（在真實 DOM 上驗，不是信建置報告）—');
  const cueMiss = await evaluate(`
    const EXEMPT = new Set(['s02','s06','s07','s11','s14','s15','s17']);  // storybook 滿版圖
    const miss = [];
    SUBS.filter(s => (s.text||'').trim()).forEach(s => {
      const sc = document.querySelector('.scene[data-id="' + s.scene + '"]');
      if (!sc.querySelector('[data-cue="' + s.id + '"]') && !EXEMPT.has(s.scene))
        miss.push([s.id, s.scene]);
    });
    return miss;`);
  check('每句非 storybook 旁白都有對應的 data-cue 元件', cueMiss, []);

  console.log('— 導購 CTA —');
  check('CTA 連結指向書籍網站',
    await evaluate(`const a = document.querySelector('.scene-outro .cta-link'); return a && a.href`),
    'https://q2050-book.vercel.app/');
  check('CTA 連結另開分頁且帶 noopener',
    await evaluate(`const a = document.querySelector('.scene-outro .cta-link');
      return [a.target, a.rel]`), ['_blank', 'noopener']);

  console.log('— 全片無真人照（作者一律以漫畫形象出現）—');
  // 2026-08 改版：拿掉 s01 / s19 的真人大頭照徽章，作者改由 Gemini 依真人照
  // 轉繪的漫畫角色出現在主視覺裡。這裡要驗的是「真人照真的消失了」——
  // 只刪 scenes.json 而忘了重建 HTML 是最容易漏掉的一步。
  const humanPhoto = await evaluate(`
    return Array.from(document.querySelectorAll('img'))
      .map(i => i.getAttribute('src') || '')
      .filter(s => /doctor|\\.webp$/.test(s));`);
  check('頁面上沒有任何真人大頭照', humanPhoto, []);
  check('沒有殘留的作者徽章 DOM',
    await evaluate(`return document.querySelectorAll('.author-badge').length`), 0);
  check('s01 / s19 的主視覺換成漫畫版李國憲且解碼成功',
    await evaluate(`
      return ['s01','s19'].map(id => {
        const img = document.querySelector('.scene[data-id="' + id + '"] img.hero-img');
        return [id, img && img.getAttribute('src'), !!img && img.naturalWidth > 0];
      });`),
    [['s01', 'images/s01-hero.jpg', true], ['s19', 'images/s19-hero.jpg', true]]);

  console.log('— BGM（交叉淡接循環 ＋ 片尾預留淡出）—');
  // BGM 比 deck 短就一定要循環。<audio loop> 在接縫會切斷，所以是 A/B 兩顆
  // 同源元素交叉淡接 —— 少一顆、或誰身上還掛著 loop，接縫就會露餡。
  const bgm = await evaluate(`
    const els = Array.from(document.querySelectorAll('.bgm'));
    return {
      count: els.length,
      srcs: [...new Set(els.map(e => e.getAttribute('src')))],
      loopAttr: els.some(e => e.hasAttribute('loop')),
      dur: els.map(e => Math.round(e.duration * 10) / 10),
      fade: typeof BGM_FADE === 'number' ? BGM_FADE : null,
      xfade: typeof BGM_XFADE === 'number' ? BGM_XFADE : null,
      vol: BGM_VOLUME,
      scheduler: typeof bgmScheduleFade === 'function',
    };`);
  check('兩顆同源 .bgm 元素（交叉淡接用）', [bgm.count, bgm.srcs], [2, ['BGM/BGM.mp3']]);
  check('沒有掛 loop 屬性（改由 JS 交叉淡接）', bgm.loopAttr, false);
  check('BGM 真的解碼出長度', bgm.dur.every(d => d > 1) && bgm.dur[0] === bgm.dur[1], true);
  check('片尾保留淡出長度且有排程器', [bgm.fade, bgm.xfade, bgm.scheduler], [3.5, 1.6, true]);
  // 淡出必須「結束在」最後一幀播完的瞬間，而不是播完才開始 ——
  // 直接驗排程算式：站在最後一句時，剩餘時間必須正好等於片尾靜默幀長度。
  const tail = await evaluate(`
    curIdx = SUBS.length - 1;
    let left = 0;
    for (let i = curIdx; i < SUBS.length; i++) left += durOf(SUBS[i]);
    curIdx = 0;
    return [Math.round(left * 10) / 10, SUBS[SUBS.length - 1].text === ''];`);
  check('片尾是 8 秒靜默幀，淡出（3.5s）收得進去', tail, [8, true]);
  check('BGM 比 deck 短 → 一定會走到循環', bgm.dur[0] < 276, true);

  console.log('— 逐場走訪（觸發每一場的 cue 邏輯，收集執行期錯誤）—');
  const visited = await evaluate(`
    let n = 0;
    SUBS.forEach(s => { showScene(s.scene); showSub(s); showCues(s); n++; });
    return n;`);
  check('走訪了全部 76 個 sub', visited, 76);

  console.log('— 版面幾何（每一場都要塞得進安全區）—');
  // 安全區用「實際量到的頂欄底緣 / 字幕條與 dock 上緣」界定，不用寫死的數字。
  const geo = await evaluate(`
    const bar  = document.getElementById('subtitleBar').getBoundingClientRect();
    const dock = document.querySelector('.controls').getBoundingClientRect();
    const top  = document.querySelector('.topbar').getBoundingClientRect();
    const floor = Math.min(bar.top, dock.top);
    const SKIP = /hero-img|hero-overlay|blob|story-img|speedlines/;
    const out = [];
    document.querySelectorAll('.scene').forEach(sc => {
      const prev = sc.className;
      sc.classList.add('active');
      let lo = Infinity, hi = -Infinity;
      sc.querySelectorAll('*').forEach(el => {
        if (SKIP.test(el.className) || !el.offsetParent && el.offsetHeight === 0) return;
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) return;
        lo = Math.min(lo, r.top); hi = Math.max(hi, r.bottom);
      });
      out.push([sc.getAttribute('data-id'), Math.round(lo), Math.round(hi)]);
      sc.className = prev;
    });
    return { floor: Math.round(floor), topbarBottom: Math.round(top.bottom), scenes: out };`);
  console.log(`      安全區：頂欄底緣 ${geo.topbarBottom}px ‧ 字幕/dock 上緣 ${geo.floor}px`);
  const tooLow = geo.scenes.filter(([, , hi]) => hi > geo.floor).map(([id, , hi]) => [id, hi]);
  check('沒有任何場景的內容掉進字幕條／控制列', tooLow, []);

  // 滿版圖場景的 caption 在右上角、頂欄在正上方置中 —— 兩者會不會撞上，
  // 只有量座標看得出來（純高度檢查看不到水平重疊）。
  const collide = await evaluate(`
    const top = document.querySelector('.topbar').getBoundingClientRect();
    const out = [];
    document.querySelectorAll('.scene-storybook').forEach(sc => {
      const prev = sc.className; sc.classList.add('active');
      sc.querySelectorAll('.story-caption, .story-eyebrow').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.left < top.right && r.right > top.left && r.top < top.bottom && r.bottom > top.top)
          out.push([sc.getAttribute('data-id'), el.className, Math.round(r.left), Math.round(top.right)]);
      });
      sc.className = prev;
    });
    return out;`);
  check('滿版圖的字幕 chip 不與頂欄重疊', collide, []);

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
