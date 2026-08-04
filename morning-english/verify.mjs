// 用 CDP 驅動 headless Chrome，實跑互動分支 deck 的驗收。
// 不用 playwright：本機沒裝，而 Chrome 二進位 + Node 內建 WebSocket 就夠了。
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
// 相對路徑要先解成絕對路徑 —— 'file://index.html' 會被當成主機名 index.html
const URL_ = pathToFileURL(resolve(process.argv[2] || 'index.html')).href;

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
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch {}
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
    expression: `(function(){${expr}})()`,
    returnByValue: true, awaitPromise: true,
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
  check('章節點渲染出 6 個',
    await evaluate(`return document.querySelectorAll('.chapter-dot').length`), 6);
  check('線性進度條在章節模式下隱藏',
    await evaluate(`return document.getElementById('progressBar').style.display`), 'none');
  check('3 個 choice 場景就位',
    await evaluate(`return Object.keys(choiceScenes).length`), 3);
  check('9 個選項按鈕',
    await evaluate(`return document.querySelectorAll('.choice-opt').length`), 9);
  check('尚未選擇時 chosen 是空的',
    await evaluate(`return Object.keys(chosen).length`), 0);
  check('未輪到的選項不可點（pointer-events 由 CSS 關閉）',
    await evaluate(`return getComputedStyle(document.querySelector('.choice-opt')).pointerEvents`), 'none');

  console.log('— 走到第一個選擇點 —');
  await evaluate(`isPlaying = true; goTo(SUBS.findIndex(s => s.id === '010'), false); advance(); return 1`);
  await sleep(300);
  check('進入等待選擇狀態', await evaluate(`return awaiting`), 's03');
  check('choice 場景掛上 awaiting（集中線浮出）',
    await evaluate(`return choiceScenes['s03'].classList.contains('awaiting')`), true);
  check('等待時播放鍵停用（不會空轉）',
    await evaluate(`const b=document.getElementById('playBtn'); b.click(); return awaiting`), 's03');
  check('等待時選項變成可點',
    await evaluate(`return getComputedStyle(document.querySelector('#s03opt') || document.querySelector('.scene-choice[data-id="s03"] .choice-opt')).pointerEvents`), 'auto');

  console.log('— 用數字鍵 2 選擇（b1b FORMAL）—');
  await evaluate(`
    document.dispatchEvent(new KeyboardEvent('keydown', {code:'Digit2', bubbles:true}));
    return 1`);
  await sleep(300);
  check('chosen 記錄 b1b', await evaluate(`return chosen['s03']`), 'b1b');
  check('awaiting 已解除', await evaluate(`return awaiting`), null);
  check('選中的卡片標記 picked',
    await evaluate(`return document.querySelector('.scene-choice[data-id="s03"] .choice-opt.picked').getAttribute('data-track')`), 'b1b');
  check('跳到 b1b 的第一句（015）', await evaluate(`return SUBS[curIdx].id`), '015');
  check('b1b 的句子變成 active',
    await evaluate(`return isActive(SUBS.findIndex(s=>s.id==='016'))`), true);
  check('沒選中的 b1a 仍然隱形',
    await evaluate(`return isActive(SUBS.findIndex(s=>s.id==='011'))`), false);

  console.log('— 分支播完要收回主線 —');
  check('b1b 最後一句(018)的下一個有效段落是主線 023',
    await evaluate(`return SUBS[nextActive(SUBS.findIndex(s=>s.id==='018')+1)].id`), '023');
  check('沒選中的 b1a/b1c 完全被跳過（不會誤播）',
    await evaluate(`
      const from = SUBS.findIndex(s=>s.id==='015');
      const seen = []; let i = from;
      while (i < SUBS.length && SUBS[i].scene !== 's05') { seen.push(SUBS[i].id); i = nextActive(i+1); }
      return seen`), ['015','068','016','017','018']);   // 068 = DIANE 接話

  console.log('— RECAP 重播使用者選過的句子 —');
  await evaluate(`chosen['s06']='b2c'; chosen['s09']='b3a';
    ['s06','s09'].forEach(sid => { const t = chosen[sid];
      choiceScenes[sid].querySelectorAll('.choice-opt').forEach(b =>
        b.classList.toggle('picked', b.getAttribute('data-track')===t)); });
    return 1`);
  check('replay 找回的三顆音檔 = 使用者選過的三句 signature',
    await evaluate(`return ['s03','s06','s09'].map(k => signatureFor(chosen[k]).id)`),
    ['015', '036', '045']);
  check('replay 字幕顯示被重播那句的原文',
    await evaluate(`
      goTo(SUBS.findIndex(s=>s.id==='058'), false);
      return document.getElementById('subtitleBar').textContent.includes('Ms. Ward')`), true);
  await evaluate(`['s03','s06','s09'].forEach(fillRecapRow); return 1`);
  check('recap 三列都填入文字',
    await evaluate(`return Array.from(document.querySelectorAll('.recap-row')).map(r => r.classList.contains('filled'))`),
    [true, true, true]);
  check('recap 第一列 = 使用者在 CHOICE 1 選的那句',
    await evaluate(`return document.querySelector('.recap-row[data-recap="s03"] .recap-line').textContent`),
    "Good morning, Ms. Ward. It's a pleasure to finally meet you.");
  check('recap 第二列的 tone 角標正確',
    await evaluate(`return document.querySelector('.recap-row[data-recap="s06"] .recap-tone').textContent`), 'HUMAN');

  console.log('— 重播要能走不同分支 —');
  await evaluate(`stop(); return 1`);
  await sleep(200);
  check('選擇全部清空', await evaluate(`return Object.keys(chosen).length`), 0);
  check('picked 標記全部移除',
    await evaluate(`return document.querySelectorAll('.choice-opt.picked').length`), 0);
  check('recap 三列清空',
    await evaluate(`return document.querySelectorAll('.recap-row.filled').length`), 0);
  check('回到第一句', await evaluate(`return SUBS[curIdx].id`), '001');
  check('清空後分支重新隱形',
    await evaluate(`return isActive(SUBS.findIndex(s=>s.id==='015'))`), false);

  console.log('— 圖與音檔真的載得到 —');
  check('15 張場景圖全部載入成功',
    await evaluate(`
      const imgs = Array.from(document.querySelectorAll('img')).filter(i => i.src.includes('images/'));
      return imgs.length && imgs.every(i => i.complete && i.naturalWidth > 0) ? imgs.length : imgs.map(i => [i.src.split('/').pop(), i.naturalWidth])`), 15);
  check('主控台沒有 JS 錯誤',
    await evaluate(`return window.__errs ? window.__errs.length : 0`), 0);

  console.log(`\n${ok} passed, ${fail} failed`);
} catch (e) {
  console.error('驗收腳本自己出錯:', e.message);
  fail++;
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill();
}
process.exit(fail ? 1 : 0);
