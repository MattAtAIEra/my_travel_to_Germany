// 互動語言教材課程：自動驗收
//
// 用法（在 interactive-english-course 資料夾裡）：
//   npm i -D playwright            # 第一次；或用 PLAYWRIGHT_MODULE 指到已安裝的 playwright
//   node tests/verify.mjs
//
// 驗的是「學生照手冊做會不會卡住」的那些地方：
//   1. 題庫檢查員抓得到常見錯誤（含行號）
//   2. 播放器：雙擊打開就能玩完、分支與回顧正確、缺素材時有替代、有素材時會用
//   3. 學習成果：Netlify 表單欄位齊全，送出的內容格式正確（網址編碼＋form-name）
//   4. 工作台：Gemini 請求格式、備案寫法、下載 zip、參考圖
//   5. 課程頁面：連結都存在、沒有大陸用語、starter-kit.zip 是最新的
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURSE = path.resolve(HERE, "..");
const KIT = path.join(COURSE, "starter-kit");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? "  →  " + detail : "")); }
};
const section = (t) => console.log("\n■ " + t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 複製一份 starter kit 到暫存資料夾，測試可以放素材、弄壞題庫而不影響原檔
function tempKit() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kit-"));
  fs.cpSync(KIT, dir, { recursive: true });
  return dir;
}

/* ───────────────────────── 1. 題庫檢查員 ───────────────────────── */
section("題庫檢查員");
const LESSON = require(path.join(KIT, "engine/lesson.js"));
const Checker = require(path.join(KIT, "engine/checker.js"));
const Gemini = require(path.join(KIT, "engine/gemini.js"));
globalThis.LESSON = LESSON;

const syn = (t) => Checker.syntax(t);
{
  const r = syn('LESSON.add({\n  id: "a1",\n  title: "x"\n  lang: "en",\n});');
  check("少了逗號：指出第 3 行", r.some((p) => p.line === 3 && /逗號/.test(p.message)), JSON.stringify(r));
  const r2 = syn('LESSON.add({\n  id: "a1"，\n});');
  check("全形逗號：指出第 2 行", r2.some((p) => p.line === 2 && /全形/.test(p.message)), JSON.stringify(r2));
  const r3 = syn('LESSON.add({\n  id: "a1,\n  lang: "en",\n});');
  check("引號沒關：指出第 2 行", r3.some((p) => p.line === 2 && /引號/.test(p.message)), JSON.stringify(r3));
  const r4 = syn('LESSON.add({\n  lines: ["a", "b"},\n});');
  check("括號對不上：指出第 2 行", r4.some((p) => p.line === 2 && /對不上/.test(p.message)), JSON.stringify(r4));
  const r5 = syn('LESSON.add({\n  scenes: [\n    { id: "s01" },\n');
  check("括號沒關：指出開頭那一行", r5.some((p) => /沒有關上/.test(p.message)), JSON.stringify(r5));
}
const episodes = {};
for (const f of ["kk01-two-apples.js", "me01-elevator.js", "template.js"]) {
  const text = fs.readFileSync(path.join(KIT, "content", f), "utf8");
  check(`${f} 語法正確`, syn(text).length === 0, JSON.stringify(syn(text)));
  const n = LESSON.registered.length;
  vm.runInThisContext(text, { filename: f });
  const ep = LESSON.build(LESSON.registered[n].raw, f);
  episodes[ep.id] = ep;
  const errs = Checker.check(ep).filter((p) => p.level !== "tip");
  check(`${f} 內容檢查沒有錯誤與警告`, errs.length === 0, JSON.stringify(errs));
}
{
  const bad = LESSON.build({
    id: "Bad 1", cast: { a: { name: "A", voice: "Puck" }, b: { name: "B", voice: "Puck" } },
    scenes: [
      { id: "q1", type: "quiz", ask: "Say two apples", lines: ["a: hi", "zz: who?"],
        options: [{ say: "a: two apple", then: ["b: nice"] }, { say: "a: two apples", correct: true }] },
      { id: "q1", type: "choise" },
    ],
  });
  const msgs = Checker.check(bad).map((p) => p.message).join("\n");
  check("抓到：集代號格式錯誤", /只能用英文小寫/.test(msgs));
  check("抓到：角色代號打錯", /不在 cast 裡/.test(msgs));
  check("抓到：兩個角色同一個聲音", /同一個聲音/.test(msgs));
  check("抓到：題目裡有答案", /答案寫在題目上/.test(msgs));
  check("抓到：答錯分支沒說出正解", /答錯的學習者也要聽到正解/.test(msgs));
  check("抓到：場次代號重複", /重複/.test(msgs));
  check("抓到：type 拼錯", /只能是 story/.test(msgs));
}
{
  const ep = episodes.kk01;
  const lines = LESSON.allLines(ep);
  check("KK01 的檔名約定：s01 第 1 句 → assets/kk01/audio/s01-1", lines[0].line.audio === "assets/kk01/audio/s01-1");
  check("KK01 選項的檔名：q1 選項 A 第 1 句 → q1-a-1", lines.some((x) => x.line.audio === "assets/kk01/audio/q1-a-1"));
  const imgs = LESSON.allImages(ep);
  check("KK01 圖的檔名：q3 選項 B → assets/kk01/images/q3-b", imgs.some((x) => x.file === "assets/kk01/images/q3-b"));
  check("圖片描述裡提到的角色會帶上外型", imgs.find((x) => x.id === "s01").who.join() === "captain,rex");
  const me = episodes.me01;
  check("ME01 的中文解說角色是台灣口音", Gemini.speechStyle(me, LESSON.allLines(me).find((x) => x.line.who === "mia").line).includes("台灣口音"));
}
{
  // Gemini 回應裡會附上我們送出的參考圖，不能把它當成新圖
  const r = { steps: [{ type: "user_input", content: [{ type: "image", data: "UkVG", mime_type: "image/jpeg" }] }, { type: "model_output", content: [{ type: "image", data: "TkVX", mime_type: "image/png" }] }], input: [{ type: "user_input", content: [{ type: "image", data: "UkVG" }] }] };
  check("找圖時跳過送出去的參考圖", Gemini.findMedia(r, "image").data === "TkVX");
  const pcm = { candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;codec=pcm;rate=24000", data: "AAAA" } }] } }] };
  check("舊格式的 PCM 聲音也找得到", Gemini.findMedia(pcm, "audio").mime.startsWith("audio/L16"));
  const wav = Gemini.pcmToWav(new Uint8Array(4800), 24000, 1);
  check("PCM 轉 WAV 的檔頭正確", String.fromCharCode(...wav.slice(0, 4)) === "RIFF" && wav.length === 4844);
}

/* ───────────────────────── 準備：本機伺服器（模擬 Netlify 收表單）───────────────────────── */
const posts = [];
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".zip": "application/zip", ".md": "text/plain; charset=utf-8" };
function serve(root) {
  const server = http.createServer((req, res) => {
    if (req.method === "POST") {
      let body = ""; req.on("data", (c) => (body += c));
      req.on("end", () => { posts.push({ path: req.url, type: req.headers["content-type"], body }); res.writeHead(200, { "Content-Type": "text/html" }); res.end("ok"); });
      return;
    }
    const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}
const server = await serve(COURSE);
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
async function page(opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  return p;
}

// 從頭玩到成果畫面：picks 是每個選擇點要按的數字
async function playThrough(p, picks) {
  let k = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (await p.$(".overlay.result:not([hidden])")) return true;
    if (await p.$(".overlay.choice:not([hidden]) .option")) { await p.keyboard.press(String(picks[k++] || 1)); await sleep(120); continue; }
    const cont = await p.$(".overlay.words:not([hidden]) .big-btn");
    if (cont) { await cont.click(); await sleep(120); continue; }
    await p.click("#btn-next").catch(() => {});
    await sleep(90);
  }
  return false;
}

/* ───────────────────────── 2. 播放器（雙擊打開）───────────────────────── */
section("播放器：雙擊打開（file://）");
{
  const kit = tempKit();
  // 放一句聲音和一張圖，確認「有素材就用素材」
  fs.mkdirSync(path.join(kit, "assets/kk01/audio"), { recursive: true });
  fs.mkdirSync(path.join(kit, "assets/kk01/images"), { recursive: true });
  fs.copyFileSync(path.join(HERE, "fixtures/tone.mp3"), path.join(kit, "assets/kk01/audio/s01-1.mp3"));
  fs.copyFileSync(path.join(HERE, "fixtures/pic.jpg"), path.join(kit, "assets/kk01/images/s01.jpg"));
  const url = pathToFileURL(path.join(kit, "index.html")).href;
  const p = await page();
  await p.goto(url);
  await p.waitForSelector(".ep-card");
  const cards = await p.$$eval(".ep-card strong", (els) => els.map((e) => e.textContent));
  check("目錄列出兩集", cards.join("|") === "Two Apples|The Elevator", cards.join("|"));
  check("沒有題庫錯誤框", await p.$eval("#problems", (e) => e.hidden));

  await p.goto(url + "?ep=kk01&dev=1");
  await p.click(".overlay.cover .big-btn");
  await p.waitForFunction(() => document.querySelector("#sub-text").textContent.length > 0);
  check("第一句字幕與說話者", (await p.textContent("#sub-text")) === "Pssst... Rex. Come here." && (await p.textContent("#sub-who")).includes("Captain A"));
  await p.waitForSelector("#picture img", { timeout: 4000 }).catch(() => {});
  check("有圖檔時顯示圖（s01.jpg）", !!(await p.$("#picture img[src$='s01.jpg']")));
  await p.waitForFunction(() => /s01-1\.mp3/.test(document.querySelector("#dev-line").textContent), null, { timeout: 4000 }).catch(() => {});
  check("有聲音檔時播放聲音檔（開發者模式顯示 s01-1.mp3）", /s01-1\.mp3/.test(await p.textContent("#dev-line")), await p.textContent("#dev-line"));
  await p.click("#btn-next"); await sleep(400);
  await p.waitForFunction(() => /電腦語音/.test(document.querySelector("#dev-line").textContent), null, { timeout: 4000 }).catch(() => {});
  check("缺聲音檔時改用電腦語音並提示檔名", /電腦語音.*s01-2\.mp3/.test(await p.textContent("#dev-line")), await p.textContent("#dev-line"));
  await p.click("#dev button[data-id=s02]");
  await p.waitForSelector("#picture .placeholder", { timeout: 4000 }).catch(() => {});
  check("缺圖時用色塊代替（s02 還沒有圖）", !!(await p.$("#picture .placeholder")) && /She heard that/.test(await p.textContent("#picture")));
  await p.click("#dev button[data-id=s01]");

  // 第一輪：1、2、2（q3 選 2 = 正確答案）
  const done = await playThrough(p, [1, 2, 2]);
  check("從頭玩到成果畫面", done);
  const f = await p.evaluate(() => Object.fromEntries(new FormData(document.querySelector("#result-form"))));
  check("成果：集代號", f.episode === "kk01", f.episode);
  check("成果：測驗答對 1/1", f.score === "1/1", f.score);
  check("成果：每一題的選擇", /q1=A.*q2=B.*q3=B/.test(f.choices), f.choices);
  check("成果：測驗明細", f.quiz_detail === "q3:B✓", f.quiz_detail);
  check("成果：form-name 是 learning-results", f["form-name"] === "learning-results");
  await p.fill("input[name=nickname]", "小明");
  await p.click("#btn-send");
  check("本機測試模式：不送出並說明原因", /本機測試模式|Test mode/.test(await p.textContent("#send-status")));

  // 第二輪：答錯，回顧要重播「正確答案」而不是錯的那一句
  await p.click(".overlay.result .after .big-btn");
  let k = 0, recap = null;
  for (let g = 0; g < 400 && !recap; g++) {
    if (await p.$(".overlay.recap:not([hidden])")) recap = await p.$$eval(".recap-list li", (els) => els.map((e) => e.textContent));
    else if (await p.$(".overlay.choice:not([hidden]) .option")) { await p.keyboard.press(String([3, 3, 1][k++])); await sleep(120); }
    else { await p.click("#btn-next").catch(() => {}); await sleep(90); }
  }
  check("回顧：三句", recap && recap.length === 3, JSON.stringify(recap));
  check("回顧：測驗題重播正確答案 Two apples! ✓", recap && /Two apples! ✓/.test(recap[2]), recap && recap[2]);
  check("沒有 JavaScript 錯誤", p.errors.length === 0, p.errors.join("; "));

  // 手機直拿：選項不可以超出畫面
  const m = await page({ viewport: { width: 390, height: 844 } });
  await m.goto(url + "?ep=me01");
  await m.click(".overlay.cover .big-btn");
  for (let g = 0; g < 60 && !(await m.$(".overlay.choice:not([hidden]) .option")); g++) { await m.click("#btn-next").catch(() => {}); await sleep(90); }
  const fit = await m.evaluate(() => {
    const opts = [...document.querySelectorAll(".option")].map((o) => o.getBoundingClientRect());
    return { n: opts.length, maxRight: Math.max(...opts.map((r) => r.right)), w: innerWidth, scrollW: document.documentElement.scrollWidth };
  });
  check("手機：三個選項都在畫面裡、沒有橫向捲動", fit.n === 3 && fit.maxRight <= fit.w && fit.scrollW <= fit.w, JSON.stringify(fit));
  await m.screenshot({ path: path.join(os.tmpdir(), "mobile-choice.png") });

  // 題庫寫壞了：要說出是哪個檔案
  fs.writeFileSync(path.join(kit, "content/template.js"), 'LESSON.add({\n  id: "xx01"\n  title: "x",\n});');
  fs.writeFileSync(path.join(kit, "content/episodes.js"), 'window.EPISODES = ["kk01-two-apples.js", "template.js", "nope.js"];');
  const b = await page();
  await b.goto(url);
  await b.waitForSelector("#problems:not([hidden])");
  const prob = await b.textContent("#problems");
  check("壞掉的題庫：指出 template.js 有語法錯誤", /template\.js.*語法錯誤/.test(prob), prob);
  check("找不到的題庫：指出 nope.js 找不到", /nope\.js.*找不到/.test(prob), prob);
  check("其他集照樣能玩", (await b.$$(".ep-card")).length === 1);
}

/* ───────────────────────── 3. 學習成果送到 Netlify ───────────────────────── */
section("學習成果：放上網站後送出（模擬 Netlify）");
{
  const html = fs.readFileSync(path.join(KIT, "index.html"), "utf8");
  check("index.html 有 Netlify 表單（data-netlify）", /<form[^>]+name="learning-results"[^>]+data-netlify="true"/.test(html));
  const fields = ["form-name", "bot-field", "episode", "episode_title", "score", "quiz_detail", "choices", "duration_sec", "finished_at", "page", "nickname", "class_code", "stars", "comment"];
  const missing = fields.filter((n) => !new RegExp(`name="${n}"`).test(html));
  check("表單裡有全部欄位（Netlify 只收 HTML 裡出現過的欄位）", missing.length === 0, missing.join(","));

  const p = await page();
  await p.goto(BASE + "/starter-kit/index.html?ep=kk01&class=A01");
  await p.click(".overlay.cover .big-btn");
  check("在網站上也能玩到最後", await playThrough(p, [2, 3, 1]));
  check("網址的 ?class=A01 自動填入班級代號", (await p.inputValue("input[name=class_code]")) === "A01");
  await p.fill("input[name=nickname]", "Mimi");
  await p.check("input[name=stars][value='4']", { force: true });
  await p.fill("textarea[name=comment]", "好玩！");
  await p.click("#btn-send");
  await p.waitForFunction(() => /Sent|送出了/.test(document.querySelector("#send-status").textContent), null, { timeout: 5000 }).catch(() => {});
  check("畫面顯示已送出", /Sent|送出了/.test(await p.textContent("#send-status")), await p.textContent("#send-status"));
  const post = posts.at(-1) || {};
  const body = new URLSearchParams(post.body || "");
  check("用網址編碼送出（不是 JSON）", /application\/x-www-form-urlencoded/.test(post.type || ""), post.type);
  check("送到目前這一頁的路徑", post.path === "/starter-kit/index.html", post.path);
  check("內容：form-name、暱稱、班級、星星、分數", body.get("form-name") === "learning-results" && body.get("nickname") === "Mimi" && body.get("class_code") === "A01" && body.get("stars") === "4" && body.get("score") === "0/1", post.body);
  check("內容：答錯的明細 q3:A✗", body.get("quiz_detail") === "q3:A✗", body.get("quiz_detail"));
  check("沒有 JavaScript 錯誤", p.errors.length === 0, p.errors.join("; "));
}

/* ───────────────────────── 4. 工作台（模擬 Gemini）───────────────────────── */
section("工作台：Gemini 語音與圖片（模擬 API）");
{
  const mp3 = fs.readFileSync(path.join(HERE, "fixtures/tone.mp3")).toString("base64");
  const jpg = fs.readFileSync(path.join(HERE, "fixtures/pic.jpg")).toString("base64");
  const kit = tempKit();
  const p = await page();
  const reqs = [];
  let mode = "ok";
  await p.route("https://generativelanguage.googleapis.com/**", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    reqs.push({ url: route.request().url(), body });
    const cors = { "access-control-allow-origin": "*" };
    if (mode === "403") return route.fulfill({ status: 403, headers: cors, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "Permission denied", status: "PERMISSION_DENIED" } }) });
    if (mode === "no-mode" && body.generation_config && body.generation_config.speech_config && body.generation_config.speech_config.mode)
      return route.fulfill({ status: 400, headers: cors, contentType: "application/json", body: JSON.stringify({ error: { code: 400, message: "Invalid JSON payload received. Unknown name \"mode\"", status: "INVALID_ARGUMENT" } }) });
    const isImg = /image/.test(body.model || route.request().url());
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({
      id: "i1", status: "completed", input: body.input,
      steps: [{ type: "user_input", content: (body.input && body.input[0] && body.input[0].content) || [] },
        { type: "model_output", content: [isImg ? { type: "image", data: jpg, mime_type: "image/jpeg" } : { type: "audio", data: mp3, mime_type: "audio/mp3" }] }] }) });
  });
  await p.goto(pathToFileURL(path.join(kit, "studio.html")).href);
  await p.waitForSelector("#ep-select option", { state: "attached" });
  await p.fill("#key", "TEST-KEY");
  await p.click("#btn-test");
  await p.waitForFunction(() => /成功|失敗/.test(document.querySelector("#test-result").textContent));
  check("測試連線成功", /成功/.test(await p.textContent("#test-result")), await p.textContent("#test-result"));
  const first = reqs[0];
  check("送到 /v1beta/interactions", first.url.endsWith("/v1beta/interactions"), first.url);
  check("金鑰放在 x-goog-api-key 標頭，不在網址", !/key=/.test(first.url));
  const b0 = first.body;
  check("請求格式與官方範例一致（user_input、speech_metadata、speakers）",
    b0.model === "gemini-3.8-flash-tts" && b0.input[0].type === "user_input" && b0.input[0].content[0].annotations[0].type === "speech_metadata" &&
    b0.generation_config.speech_config.mode === "conversational" && b0.generation_config.speech_config.speakers[0].voice === "Kore" && b0.response_format.type === "audio", JSON.stringify(b0).slice(0, 300));

  // 備案寫法：如果 API 不接受 mode，要自動換
  mode = "no-mode";
  await p.evaluate(() => { delete Gemini.remembered.tts; });
  await p.click("#btn-test");
  await p.waitForFunction(() => /speakers-mp3|失敗/.test(document.querySelector("#test-result").textContent), null, { timeout: 8000 }).catch(() => {});
  check("第一種寫法被拒絕時，自動改用備案寫法", /speakers-mp3/.test(await p.textContent("#test-result")), await p.textContent("#test-result"));

  mode = "403";
  await p.evaluate(() => { delete Gemini.remembered.tts; });
  await p.click("#btn-test");
  await p.waitForFunction(() => /失敗/.test(document.querySelector("#test-result").textContent), null, { timeout: 8000 }).catch(() => {});
  check("金鑰沒權限：顯示看得懂的說明", /權限/.test(await p.textContent("#test-result")), await p.textContent("#test-result"));
  mode = "ok";

  // 檢查題庫
  await p.click(".tabs button[data-tab=check]");
  const meters = await p.$$eval(".meter", (els) => els.map((e) => e.textContent));
  check("完成度：題庫沒有錯誤、61 句、13 張圖", /沒有錯誤/.test(meters[0]) && /0 \/ 61/.test(meters[1]) && /0 \/ 13/.test(meters[2]), meters.join(" | "));
  check("劇本總覽列出每一場", (await p.$$(".sp-scene")).length === 9);

  // 語音：全部產生（下載模式）
  await p.click(".tabs button[data-tab=voice]");
  reqs.length = 0;
  await p.click("#voice-all");
  await p.waitForFunction(() => /全部跑完了|已停止/.test(document.querySelector("#voice-progress").textContent), null, { timeout: 60000 });
  check("61 句全部產生", /完成 61 \/ 61/.test(await p.textContent("#voice-progress")), await p.textContent("#voice-progress"));
  const funky = reqs.find((r) => r.body.input[0].content[0].text === "Captain A~~~~!");
  check("每句帶上角色的聲音與語氣（Funky = Laomedeia）", funky && funky.body.generation_config.speech_config.speakers[0].voice === "Laomedeia" && /calling out loudly/.test(funky.body.input[0].content[0].annotations[0].style));
  const dl = p.waitForEvent("download");
  await p.click("#tab-voice .zip");
  const zipPath = path.join(os.tmpdir(), "voice.zip");
  await (await dl).saveAs(zipPath);
  const list = execFileSync("unzip", ["-l", zipPath]).toString();
  check("下載的 zip 照資料夾結構放好（assets/kk01/audio/q3-b-1.mp3）", /assets\/kk01\/audio\/q3-b-1\.mp3/.test(list) && /61 files/.test(list), list.split("\n").slice(-2).join(" "));
  execFileSync("unzip", ["-tq", zipPath]);
  check("zip 檔本身是完整的", true);

  // 角色設定圖 → 場次圖會帶參考圖
  await p.click(".tabs button[data-tab=cast]");
  await p.click(".cast[data-key=captain] .ref");
  await p.waitForFunction(() => /完成|失敗/.test(document.querySelector(".cast[data-key=captain] .ref-out").textContent));
  check("產生角色設定圖", /完成/.test(await p.textContent(".cast[data-key=captain] .ref-out")));
  await p.click(".tabs button[data-tab=image]");
  reqs.length = 0;
  await p.click(".img[data-id=s01] .gen");
  await p.waitForFunction(() => /✅|❌/.test(document.querySelector(".img[data-id=s01] .st").textContent));
  const imgReq = reqs.at(-1).body;
  check("場次圖：用 gemini-3.1-flash-image，比例 16:9", imgReq.model === "gemini-3.1-flash-image" && imgReq.response_format.aspect_ratio === "16:9");
  check("場次圖：附上 Captain A 的設定圖當參考", imgReq.input[0].content.filter((c) => c.type === "image").length === 1);
  check("場次圖：描述含畫風句與角色外型", /storybook style/.test(imgReq.input[0].content[0].text) && /royal-blue polo shirt/.test(imgReq.input[0].content[0].text));
  check("產生後顯示縮圖", !!(await p.$(".img[data-id=s01] .pic img")));

  // Suno
  await p.click(".tabs button[data-tab=music]");
  const style = await p.textContent("#suno-out-style");
  check("Suno 提示詞一定是純音樂", /instrumental/.test(style) && /no vocals/.test(style), style);
  const sdl = p.waitForEvent("download");
  await p.click("#suno-save");
  const sunoFile = path.join(os.tmpdir(), "suno.txt");
  const sd = await sdl; await sd.saveAs(sunoFile);
  const sunoTxt = fs.readFileSync(sunoFile, "utf8");
  check("Suno 提示詞可以存成檔案（kk01-suno.txt）", sd.suggestedFilename() === "kk01-suno.txt" && sunoTxt.includes(style) && /kk01\.mp3/.test(sunoTxt), sd.suggestedFilename());
  check("沒有 JavaScript 錯誤", p.errors.length === 0, p.errors.join("; "));
}

/* ───────────────────────── 4b. 指令工具 ───────────────────────── */
section("指令工具 tools/generate.mjs");
{
  const kit = tempKit();
  fs.rmSync(path.join(kit, "assets/bgm/me01-suno.txt"), { force: true });
  const env = { ...process.env, GEMINI_API_KEY: "" };
  const out = execFileSync("node", [path.join(kit, "tools/generate.mjs"), path.join(kit, "content/me01-elevator.js"), "--suno"], { env }).toString();
  const txt = fs.readFileSync(path.join(kit, "assets/bgm/me01-suno.txt"), "utf8");
  check("--suno 不需要金鑰，存出提示詞檔", /me01-suno\.txt/.test(out) && /lo-fi morning jazz/.test(txt) && /me01\.mp3/.test(txt));
  const sample = fs.readFileSync(path.join(KIT, "assets/bgm/me01-suno.txt"), "utf8");
  check("範例的 Suno 提示詞檔是最新的", sample === txt);
  const dry = execFileSync("node", [path.join(kit, "tools/generate.mjs"), path.join(kit, "content/kk01-two-apples.js"), "--dry"], { env }).toString();
  check("--dry 列出 61 句、3 張角色設定圖、13 張圖", /要產生 61 句/.test(dry) && /角色設定圖 3 張、場次圖 13 張/.test(dry), dry.split("\n").filter((l) => /要產生|角色設定圖/.test(l)).join(" / "));
  let failed = false;
  try { execFileSync("node", [path.join(kit, "tools/generate.mjs"), path.join(kit, "content/kk01-two-apples.js"), "--test"], { env, stdio: "pipe" }); } catch (e) { failed = /GEMINI_API_KEY/.test(String(e.stderr)); }
  check("沒有金鑰時 --test 會明確拒絕", failed);
}

/* ───────────────────────── 5. 課程頁面 ───────────────────────── */
section("課程頁面");
{
  const pages = ["index.html", "assignments.html", "submit.html", "thanks.html"];
  for (const f of pages) {
    const p = await page();
    await p.goto(BASE + "/" + f);
    check(`${f} 打開沒有錯誤`, p.errors.length === 0, p.errors.join("; "));
    const links = await p.$$eval("a[href], link[href], script[src]", (els) => els.map((e) => e.getAttribute("href") || e.getAttribute("src")));
    const local = links.filter((h) => h && !/^(https?:|mailto:|#)/.test(h)).map((h) => h.split(/[?#]/)[0]);
    const broken = local.filter((h) => !fs.existsSync(path.resolve(COURSE, h)));
    check(`${f} 的站內連結都存在`, broken.length === 0, broken.join(", "));
    if (f === "index.html") {
      const boxes = await p.$$eval(".check input", (els) => els.length);
      check("手冊有打勾進度（" + boxes + " 個步驟）", boxes >= 40);
      await p.check(".check input[data-step='0-1']");
      await p.reload();
      check("打勾會被記住", await p.isChecked(".check input[data-step='0-1']"));
    }
    if (f === "submit.html") {
      const html = fs.readFileSync(path.join(COURSE, f), "utf8");
      check("繳交頁是 Netlify 表單（純 HTML 也能送出）", /<form[^>]+name="homework-submissions"[^>]+method="POST"[^>]+data-netlify="true"/.test(html) && /name="form-name" value="homework-submissions"/.test(html));
      check("送出後跳到 thanks.html（以 / 開頭的路徑）", (await p.$eval("form.hw", (f) => f.getAttribute("action"))) === "/thanks.html");
    }
  }

  // 用詞：不要出現大陸用語（使用者規範）
  const BANNED = ["口徑", "去重", "時延", "子集", "交集", "鏈路", "增量", "存量", "節點", "對齊", "歸屬", "顆粒度", "抓手", "賦能", "沉澱", "復盤", "拉通", "閉環", "打法", "心智", "場景", "下沉", "鏈接", "斷言", "信息", "視頻", "屏幕", "默認", "優化", "質量", "性能", "兼容", "網絡", "軟件", "數據庫", "服務器", "用戶", "代碼", "文件夾", "加載", "點擊", "反饋", "界面"];
  const files = [];
  (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { if (n !== "tests" && n !== "node_modules") walk(p); } else if (/\.(html|js|mjs|md|css|py)$/.test(n)) files.push(p); } })(COURSE);
  const hits = [];
  files.forEach((p) => { const t = fs.readFileSync(p, "utf8"); BANNED.forEach((w) => { if (t.includes(w)) hits.push(path.relative(COURSE, p) + "：" + w); }); });
  check("沒有大陸用語", hits.length === 0, hits.join("、"));

  // starter-kit.zip 要跟 starter-kit 資料夾一致
  const fresh = path.join(os.tmpdir(), "fresh-kit.zip");
  execFileSync("python3", [path.join(COURSE, "make-zip.py"), fresh]);
  check("starter-kit.zip 是最新的（改了 starter-kit 記得 python3 make-zip.py）", Buffer.compare(fs.readFileSync(fresh), fs.readFileSync(path.join(COURSE, "starter-kit.zip"))) === 0);
}

await browser.close();
server.close();
console.log(`\n${fail ? "❌" : "✅"} 通過 ${pass} 項${fail ? `，失敗 ${fail} 項` : ""}`);
process.exit(fail ? 1 : 0);
