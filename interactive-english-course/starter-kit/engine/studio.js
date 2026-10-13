/* ==========================================================================
   studio.js —— 製作工作台

   把題庫檔變成真正的素材：
     ① 準備     貼上 Gemini API 金鑰、連接專案資料夾
     ② 檢查題庫  語法、內容、教學規則，還有劇本總覽
     ③ 角色      試聽聲音、產生角色設定圖
     ④ 語音      一句一個聲音檔：assets/<集>/audio/<句>.mp3
     ⑤ 圖片      一場一張圖：assets/<集>/images/<場>.jpg
     ⑥ 音樂      產生 Suno 的提示詞、測試音量

   金鑰只存在這個瀏覽器裡，不會寫進任何檔案。
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => [...(el || document).querySelectorAll(sel)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
  const AUDIO_EXT = ["mp3", "wav"];
  const IMAGE_EXT = ["jpg", "png", "webp"];

  const S = {
    eps: [], problems: [], ep: null, dir: null, key: "",
    made: {},       // 這次產生的檔案：路徑 → { bytes, mime, url }
    found: {},      // 素材找到了沒：base → 實際路徑 或 null
    busy: false, stop: false,
  };

  /* ── 啟動 ─────────────────────────────────────────────────────── */
  window.addEventListener("DOMContentLoaded", async () => {
    loadSettings();
    bindSetup();
    bindTabs();
    const { episodes, problems } = await LESSON.load(window.EPISODES || []);
    S.eps = episodes; S.problems = problems;
    const sel = $("#ep-select");
    sel.innerHTML = episodes.map((e) => `<option value="${esc(e.id)}">${esc(e.id)}　${esc(e.title)}</option>`).join("") || "<option>（還沒有任何一集）</option>";
    const last = safeGet("studio-ep");
    sel.value = episodes.some((e) => e.id === last) ? last : (episodes[0] && episodes[0].id) || "";
    sel.onchange = () => { safeSet("studio-ep", sel.value); pickEpisode(); };
    await restoreFolder();
    pickEpisode();
    showTab(safeGet("studio-tab") || "setup");
  });

  function pickEpisode() {
    S.ep = S.eps.find((e) => e.id === $("#ep-select").value) || null;
    S.found = {};
    renderAll();
    scanAssets().then(renderAll);
  }

  function renderAll() {
    renderCheck(); renderCast(); renderVoice(); renderImages(); renderMusic(); renderStatus();
  }

  /* ── 設定（金鑰、模型）────────────────────────────────────────── */
  function safeGet(k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* 私密模式 */ } }
  function safeDel(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* 私密模式 */ } }

  function loadSettings() {
    S.key = safeGet("gemini-key") || "";
    $("#key").value = S.key;
    $("#remember").checked = (() => { try { return !!localStorage.getItem("gemini-key"); } catch (e) { return false; } })();
    $("#model-tts").value = safeGet("model-tts") || Gemini.MODELS.tts;
    $("#model-image").value = safeGet("model-image") || Gemini.MODELS.image;
  }

  function bindSetup() {
    const saveKey = () => {
      S.key = $("#key").value.trim();
      safeDel("gemini-key");
      if (S.key) safeSet("gemini-key", S.key, !$("#remember").checked);
      renderStatus();
    };
    $("#key").addEventListener("input", saveKey);
    $("#remember").addEventListener("change", saveKey);
    $("#model-tts").addEventListener("change", (e) => safeSet("model-tts", e.target.value.trim()));
    $("#model-image").addEventListener("change", (e) => safeSet("model-image", e.target.value.trim()));
    $("#btn-folder").onclick = connectFolder;
    $("#btn-test").onclick = testConnection;
  }
  const models = () => ({ tts: $("#model-tts").value.trim() || Gemini.MODELS.tts, image: $("#model-image").value.trim() || Gemini.MODELS.image });

  function needKey() {
    if (S.key) return false;
    alert("請先到「① 準備」貼上 Gemini API 金鑰。");
    showTab("setup");
    return true;
  }

  async function testConnection() {
    if (needKey()) return;
    const out = $("#test-result");
    out.className = "note"; out.textContent = "測試中……（第一次大約 5–15 秒）";
    try {
      const r = await Gemini.tts({ key: S.key, model: models().tts, text: "Hello! 你好，我是你的語音小幫手。", speaker: "Helper", voice: "Kore", style: "friendly and clear. 中文的部分請用台灣口音的國語" });
      playBytes(r.bytes, r.mime);
      out.className = "note ok";
      out.textContent = `成功！聽到聲音了嗎？（格式：${r.ext}，用的寫法：${r.variant}）`;
    } catch (e) {
      out.className = "note bad";
      out.textContent = "失敗：" + e.message;
    }
  }

  function renderStatus() {
    $("#key-status").textContent = S.key ? "🔑 金鑰已貼上" : "🔑 還沒有金鑰";
    $("#key-status").className = "pill " + (S.key ? "ok" : "");
    $("#folder-status").textContent = S.dir ? "📁 已連接：" + S.dir.name : "📁 還沒連接資料夾（下載模式）";
    $("#folder-status").className = "pill " + (S.dir ? "ok" : "");
    $$(".zip-row").forEach((z) => {
      const n = Object.keys(S.made).length;
      z.hidden = !!S.dir || !n;
      const b = $("button", z); if (b) b.textContent = `⬇ 下載這次產生的 ${n} 個檔案（zip）`;
    });
  }

  /* ── 分頁 ─────────────────────────────────────────────────────── */
  function bindTabs() { $$(".tabs button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab))); }
  function showTab(name) {
    $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    $$("main > section").forEach((s) => (s.hidden = s.id !== "tab-" + name));
    if (name === "check" && S.ep) renderCheck();   // 完成度要用最新的狀態
    safeSet("studio-tab", name);
  }

  /* ── 專案資料夾（File System Access API，Chrome／Edge 才有）────── */
  async function connectFolder() {
    if (!window.showDirectoryPicker) {
      alert("這個瀏覽器不能直接寫入資料夾。請改用 Chrome 或 Edge；或者繼續用「下載模式」，產生完再把 zip 解壓縮到 starter-kit 資料夾。");
      return;
    }
    try {
      const h = await showDirectoryPicker({ id: "lesson-kit", mode: "readwrite" });
      if (!(await exists(h, "index.html")) || !(await exists(h, "content/episodes.js"))) {
        alert("這個資料夾裡沒有 index.html 和 content/episodes.js。請選「starter-kit」那一層（打開後會看到 index.html、studio.html、content、assets 的那一層）。");
        return;
      }
      S.dir = h;
      await idbSet("dir", h);
      S.found = {};
      await scanAssets();
      renderAll();
    } catch (e) {
      if (e.name !== "AbortError") alert("沒有連接成功：" + e.message);
    }
  }

  async function restoreFolder() {
    const h = await idbGet("dir").catch(() => null);
    if (!h) return;
    const btn = $("#btn-reconnect");
    const ok = await h.queryPermission({ mode: "readwrite" }).catch(() => "denied");
    if (ok === "granted") { S.dir = h; return; }
    btn.hidden = false;
    btn.textContent = "重新連接上次的資料夾「" + h.name + "」";
    btn.onclick = async () => {
      if ((await h.requestPermission({ mode: "readwrite" })) === "granted") { S.dir = h; btn.hidden = true; S.found = {}; await scanAssets(); renderAll(); }
    };
  }

  async function dirOf(root, parts, create) {
    let d = root;
    for (const p of parts) d = await d.getDirectoryHandle(p, { create });
    return d;
  }
  async function exists(root, path) {
    try { const parts = path.split("/"); const name = parts.pop(); await (await dirOf(root, parts, false)).getFileHandle(name); return true; } catch (e) { return false; }
  }
  async function readFile(path) {
    const parts = path.split("/"); const name = parts.pop();
    return (await (await dirOf(S.dir, parts, false)).getFileHandle(name)).getFile();
  }
  async function writeFile(path, bytes) {
    const parts = path.split("/"); const name = parts.pop();
    const fh = await (await dirOf(S.dir, parts, true)).getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(bytes); await w.close();
  }
  async function removeFile(path) {
    try { const parts = path.split("/"); const name = parts.pop(); await (await dirOf(S.dir, parts, false)).removeEntry(name); } catch (e) { /* 本來就沒有 */ }
  }

  /* 小小的資料庫，只用來記住「上次連接的資料夾」 */
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open("lesson-studio", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbGet(k) { const db = await idb(); return new Promise((res, rej) => { const r = db.transaction("kv").objectStore("kv").get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbSet(k, v) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }

  /* ── 找素材：哪些檔案已經有了 ─────────────────────────────────── */
  async function findAsset(base, exts) {
    if (S.found[base] !== undefined) return S.found[base];
    for (const ext of exts) {
      const path = base + "." + ext;
      if (S.made[path]) return (S.found[base] = path);
      if (S.dir ? await exists(S.dir, path) : await probe(path, exts === IMAGE_EXT)) return (S.found[base] = path);
    }
    return (S.found[base] = null);
  }
  function probe(path, isImage) {
    return new Promise((resolve) => {
      const m = isImage ? new Image() : new Audio();
      const done = (ok) => { m.onload = m.onerror = m.onloadedmetadata = null; resolve(ok); };
      if (isImage) m.onload = () => done(true); else { m.preload = "metadata"; m.onloadedmetadata = () => done(true); }
      m.onerror = () => done(false);
      setTimeout(() => done(false), 4000);
      m.src = path;
    });
  }
  async function scanAssets() {
    if (!S.ep) return;
    const jobs = LESSON.allLines(S.ep).map((x) => findAsset(x.line.audio, AUDIO_EXT))
      .concat(LESSON.allImages(S.ep).map((x) => findAsset(x.file, IMAGE_EXT)))
      .concat(S.ep.castKeys.map((k) => findAsset(castFile(k), IMAGE_EXT)));
    if (S.ep.bgm && S.ep.bgm.file) jobs.push(findAsset(S.ep.bgm.file.replace(/\.[^.]+$/, ""), [S.ep.bgm.file.split(".").pop()]));
    await Promise.all(jobs);
  }
  const castFile = (k) => S.ep.assets + "images/cast-" + k;

  async function urlOf(path) {
    if (!path) return null;
    if (S.made[path]) return S.made[path].url;
    if (S.dir) { try { return URL.createObjectURL(await readFile(path)); } catch (e) { return null; } }
    return path;
  }

  /* 存檔：有連接資料夾就直接寫進去；沒有的話先留在記憶體，最後打包成 zip 下載 */
  async function save(base, exts, result) {
    const path = base + "." + result.ext;
    const url = URL.createObjectURL(new Blob([result.bytes], { type: result.mime }));
    S.made[path] = { bytes: result.bytes, mime: result.mime, url };
    if (S.dir) {
      await writeFile(path, result.bytes);
      for (const e of exts) if (e !== result.ext) await removeFile(base + "." + e);   // 刪掉舊的其他格式，免得播放器讀到舊檔
    }
    S.found[base] = path;
    renderStatus();
    return path;
  }

  /* ── ② 檢查題庫 ──────────────────────────────────────────────── */
  function renderCheck() {
    const box = $("#tab-check");
    const ep = S.ep;
    const files = window.EPISODES || [];
    const loadRows = files.map((f) => {
      const p = S.problems.find((x) => x.file === f);
      return `<li class="${p ? "bad" : ""}"><code>content/${esc(f)}</code> ${p ? "❌ " + esc(p.message) : "✅ 讀取成功"} <button class="small" data-syntax="${esc(f)}">檢查語法</button><div class="syntax-out" data-for="${esc(f)}"></div></li>`;
    }).join("");
    let html = `<h2>② 檢查題庫</h2>
      <div class="card"><h3>每個題庫檔讀得進來嗎？</h3><ul class="files">${loadRows || "<li>content/episodes.js 裡還沒有列出任何檔案。</li>"}</ul>
      <p class="hint">「檢查語法」會找出少了逗號、引號不成對、括號沒關、用了全形符號的地方，並告訴你是第幾行。${S.dir || location.protocol !== "file:" ? "" : "還沒連接資料夾的話，按下去會請你選擇那個檔案。"}</p></div>`;
    if (ep) {
      const probs = Checker.check(ep);
      const lines = LESSON.allLines(ep);
      const imgs = LESSON.allImages(ep);
      const haveA = lines.filter((x) => S.found[x.line.audio]).length;
      const haveI = imgs.filter((x) => S.found[x.file]).length;
      const bgmOk = ep.bgm && ep.bgm.file && S.found[ep.bgm.file.replace(/\.[^.]+$/, "")];
      const errors = probs.filter((p) => p.level === "error").length;
      const paths = ep.scenes.filter((s) => s.options.length).reduce((a, s) => a * s.options.length, 1);
      const byWho = {};
      lines.forEach((x) => { byWho[x.line.who] = (byWho[x.line.who] || 0) + 1; });
      const chars = lines.reduce((a, x) => a + (x.line.say || "").length, 0);
      html += `<div class="card"><h3>${esc(ep.id)}　${esc(ep.title)} 的完成度</h3>
        <div class="meters">
          ${meter("題庫錯誤", errors ? errors + " 個要修" : "沒有錯誤", !errors)}
          ${meter("語音", haveA + " / " + lines.length + " 句", haveA === lines.length)}
          ${meter("圖片", haveI + " / " + imgs.length + " 張", haveI === imgs.length)}
          ${meter("背景音樂", ep.bgm ? (bgmOk ? "有了" : "還沒放進 " + ep.bgm.file) : "還沒設定", !!bgmOk)}
        </div>
        <p class="hint">共 ${ep.scenes.length} 場、${lines.length} 句要配音（${chars} 個字元）、${imgs.length} 張圖；選擇題的組合一共有 ${paths} 種走法。
        每個角色的句數：${ep.castKeys.map((k) => esc(ep.cast[k].name) + " " + (byWho[k] || 0) + " 句").join("、")}。</p></div>`;
      const group = (lv, title) => {
        const rows = probs.filter((p) => p.level === lv);
        if (!rows.length) return "";
        return `<div class="card level-${lv}"><h3>${title}（${rows.length}）</h3><ul>${rows.map((p) => `<li><b>${esc(p.where)}</b>：${esc(p.message)}</li>`).join("")}</ul></div>`;
      };
      html += group("error", "❌ 一定要修") + group("warn", "⚠️ 建議修") + group("tip", "💡 小提醒");
      if (!probs.length) html += `<div class="card level-ok"><h3>✅ 內容檢查全部通過</h3></div>`;
      html += `<div class="card"><h3>劇本總覽（可以印出來給組員審稿）</h3>${screenplay(ep)}</div>`;
    }
    box.innerHTML = html;
    $$("[data-syntax]", box).forEach((b) => (b.onclick = () => syntaxCheck(b.dataset.syntax)));
  }
  const meter = (k, v, ok) => `<div class="meter ${ok ? "ok" : ""}"><span>${k}</span><b>${esc(v)}</b></div>`;

  function screenplay(ep) {
    const who = (l) => (l.char ? `<span class="chip" style="--c:${l.char.color}">${l.char.emoji} ${esc(l.char.name)}</span>` : `<span class="chip bad">？${esc(l.who)}</span>`);
    const lines = (ls) => ls.map((l) => `<div class="sp-line">${who(l)} ${esc(l.say)}${l.hint ? `<small>${esc(l.hint)}</small>` : ""}</div>`).join("");
    return ep.scenes.map((s) => `<div class="sp-scene"><div class="sp-head"><code>${esc(s.id)}</code> <b>${esc(s.type)}</b> ${esc(s.title)}${s.ask ? "　❓ " + esc(s.ask) : ""}</div>
      ${s.image ? `<div class="sp-img">🖼 ${esc(s.image)}</div>` : ""}${lines(s.lines)}
      ${s.options.map((o) => `<div class="sp-branch"><div class="sp-head">${o.key.toUpperCase()}. ${esc(o.label)} ${o.tag ? `<small>${esc(o.tag)}</small>` : ""}${o.correct ? " ✅ 正確答案" : ""}</div>${lines(o.lines)}</div>`).join("")}
      ${s.words.length ? `<div class="sp-line">📇 ${s.words.map((w) => esc(w.word)).join("　／　")}</div>` : ""}</div>`).join("");
  }

  async function syntaxCheck(file) {
    const out = $(`.syntax-out[data-for="${CSS.escape(file)}"]`);
    let text = null;
    try {
      if (S.dir) text = await (await readFile("content/" + file)).text();
      else if (location.protocol !== "file:") text = await (await fetch("content/" + file, { cache: "no-store" })).text();
      else text = await pickTextFile(file);
    } catch (e) { out.innerHTML = `<p class="bad">讀不到這個檔案：${esc(e.message)}</p>`; return; }
    if (text == null) return;
    const res = Checker.syntax(text);
    const src = text.split("\n");
    out.innerHTML = res.length
      ? `<ul class="bad">${res.map((r) => `<li>${esc(r.message)}${r.line ? `<pre>${esc(r.line - 1 > 0 ? (r.line - 1) + "│ " + src[r.line - 2] + "\n" : "")}${esc(r.line + "│ " + src[r.line - 1])}</pre>` : ""}</li>`).join("")}</ul>`
      : `<p class="ok">✅ 語法沒有問題。</p>`;
  }
  function pickTextFile(name) {
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".js";
      inp.onchange = () => { const f = inp.files[0]; if (!f) return resolve(null); if (f.name !== name && !confirm(`你選的是 ${f.name}，不是 ${name}，還是要檢查嗎？`)) return resolve(null); f.text().then(resolve); };
      inp.click();
    });
  }

  /* ── ③ 角色 ──────────────────────────────────────────────────── */
  function renderCast() {
    const box = $("#tab-cast");
    const ep = S.ep;
    if (!ep) { box.innerHTML = "<h2>③ 角色與聲音</h2><p>還沒有可以用的題庫。</p>"; return; }
    const opts = (cur) => Gemini.VOICES.map((v) => `<option value="${v.name}" ${v.name === cur ? "selected" : ""}>${v.name}（${v.tone}）</option>`).join("");
    box.innerHTML = `<h2>③ 角色與聲音</h2>
      <p class="hint">先幫每個角色挑聲音：選一個 → 按「試聽」。滿意之後，把題庫檔裡那個角色的 <code>voice</code> 改成那個名字，存檔、重新整理這一頁。
      角色設定圖會存成 <code>${esc(ep.assets)}images/cast-角色代號.jpg</code>，之後產生每一張圖時都會拿它當參考，讓角色長得一樣。</p>
      <div class="cast-grid">${ep.castKeys.map((k) => { const c = ep.cast[k]; return `<div class="card cast" data-key="${k}">
        <div class="cast-head"><span class="big-emoji">${c.emoji}</span><div><h3 style="color:${c.color}">${esc(c.name)}</h3><code>${k}</code>　${c.lang === "zh-TW" ? "台灣口音的國語" : "英語"}</div></div>
        <p><b>個性／語氣：</b>${esc(c.style) || "（還沒寫 style）"}</p>
        <label>聲音 <select class="voice">${opts(c.voice)}</select></label>
        <div class="row"><button class="try">▶ 試聽</button><span class="out"></span></div>
        ${c.look ? `<p><b>外型：</b>${esc(c.look)}</p><div class="cast-pic"></div><div class="row"><button class="ref">🎨 產生角色設定圖</button><span class="ref-out"></span></div>` : `<p class="hint">沒有外型描述 look，所以不會出現在圖裡（例如旁白、解說老師）。</p>`}
      </div>`; }).join("")}</div>`;
    $$(".cast", box).forEach((card) => {
      const k = card.dataset.key, c = ep.cast[k];
      $(".try", card).onclick = async () => {
        if (needKey()) return;
        const voice = $(".voice", card).value;
        const sample = LESSON.allLines(ep).find((x) => x.line.who === k);
        const line = sample ? sample.line : { say: c.lang === "zh-TW" ? "大家好，很高興認識你。" : "Hi! Nice to meet you.", char: c, lang: c.lang };
        const out = $(".out", card);
        out.textContent = "產生中……";
        try {
          const r = await Gemini.tts({ key: S.key, model: models().tts, text: line.say, speaker: c.name, voice, style: Gemini.speechStyle(ep, line) });
          playBytes(r.bytes, r.mime);
          out.innerHTML = voice === c.voice ? "這就是目前的聲音。" : `喜歡的話，把題庫檔裡的 <code>voice: "${esc(c.voice)}"</code> 改成 <code>voice: "${voice}"</code>`;
        } catch (e) { out.textContent = "失敗：" + e.message; }
      };
      const ref = $(".ref", card);
      if (ref) {
        showPic($(".cast-pic", card), castFile(k));
        ref.onclick = async () => {
          if (needKey()) return;
          const out = $(".ref-out", card);
          out.textContent = "產生中……（大約 10–30 秒）";
          try {
            const r = await Gemini.image({ key: S.key, model: models().image, prompt: Gemini.characterPrompt(ep, c), ratio: "3:4" });
            await save(castFile(k), IMAGE_EXT, r);
            out.textContent = "完成！不喜歡可以再按一次。";
            showPic($(".cast-pic", card), castFile(k));
          } catch (e) { out.textContent = "失敗：" + e.message; }
        };
      }
    });
  }

  async function showPic(holder, base) {
    const path = await findAsset(base, IMAGE_EXT);
    const url = await urlOf(path);
    holder.innerHTML = url ? `<img src="${esc(url)}" alt="">` : "";
  }

  /* ── ④ 語音 ──────────────────────────────────────────────────── */
  function renderVoice() {
    const box = $("#tab-voice");
    const ep = S.ep;
    if (!ep) { box.innerHTML = "<h2>④ 語音</h2>"; return; }
    const items = LESSON.allLines(ep);
    const missing = items.filter((x) => !S.found[x.line.audio]);
    box.innerHTML = `<h2>④ 語音（Gemini ${esc(models().tts)}）</h2>
      <p class="hint">一句台詞一個聲音檔，檔名是自動決定的（例如 <code>${esc(items[0] ? items[0].line.audio : "")}.mp3</code>）。
      改了某一句台詞，就只要按那一句的「重新產生」。中文的句子會自動要求「台灣口音的國語」。</p>
      <div class="toolbar"><button class="primary" id="voice-all">產生所有還沒有聲音的句子（${missing.length} 句）</button>
        <button id="voice-stop" hidden>停止</button><span id="voice-progress"></span></div>
      <div class="zip-row" hidden><button class="zip">⬇ 下載</button> <span class="hint">解壓縮後，把裡面的 assets 資料夾合併到 starter-kit 資料夾裡。</span></div>
      <table class="lines"><thead><tr><th>句子代號</th><th>誰</th><th>台詞</th><th>狀態</th><th></th></tr></thead><tbody>
      ${items.map((x) => { const l = x.line; return `<tr data-id="${esc(l.id)}">
        <td><code>${esc(l.id)}</code></td><td>${l.char ? `<span class="chip" style="--c:${l.char.color}">${l.char.emoji} ${esc(l.char.name)}</span>` : "？"}</td>
        <td>${esc(l.say)}${l.hint ? `<small>${esc(l.hint)}</small>` : ""}<small class="style" title="送給 Gemini 的語氣說明">🎭 ${esc(Gemini.speechStyle(ep, l))}</small></td>
        <td class="st">${S.found[l.audio] ? "✅ " + esc(S.found[l.audio].split(".").pop()) : "—"}</td>
        <td class="act"><button class="small play" ${S.found[l.audio] ? "" : "disabled"}>▶</button> <button class="small gen">${S.found[l.audio] ? "重新產生" : "產生"}</button></td></tr>`; }).join("")}
      </tbody></table>`;
    const rowOf = (id) => $(`tr[data-id="${CSS.escape(id)}"]`, box);
    const genOne = async (x) => {
      const row = rowOf(x.line.id);
      $(".st", row).textContent = "⏳";
      try {
        const r = await Gemini.tts({ key: S.key, model: models().tts, text: x.line.say, speaker: x.line.char ? x.line.char.name : "Speaker", voice: x.line.char ? x.line.char.voice : "Kore", style: Gemini.speechStyle(ep, x.line) },
          { onWait: () => { $(".st", row).textContent = "⏳ 排隊中"; } });
        const path = await save(x.line.audio, AUDIO_EXT, r);
        $(".st", row).textContent = "✅ " + path.split(".").pop();
        $(".play", row).disabled = false;
        $(".gen", row).textContent = "重新產生";
        return true;
      } catch (e) {
        $(".st", row).innerHTML = `<span class="bad" title="${esc(e.detail || "")}">❌ ${esc(e.message)}</span>`;
        throw e;
      }
    };
    items.forEach((x) => {
      const row = rowOf(x.line.id);
      $(".play", row).onclick = async () => playUrl(await urlOf(S.found[x.line.audio]));
      $(".gen", row).onclick = () => { if (!needKey()) genOne(x).then(() => playUrl(S.made[S.found[x.line.audio]].url)).catch(() => {}); };
    });
    $("#voice-all").onclick = () => { if (!needKey()) runBatch(items.filter((x) => !S.found[x.line.audio]), genOne, "#voice-progress", "#voice-stop"); };
    bindZip(box);
    renderStatus();
  }

  /* 一次做很多個：同時送 2 個請求，可以中途停止；金鑰錯了就整批停下來 */
  async function runBatch(list, worker, progressSel, stopSel) {
    if (S.busy || !list.length) return;
    S.busy = true; S.stop = false;
    const prog = $(progressSel), stop = $(stopSel);
    stop.hidden = false; stop.onclick = () => { S.stop = true; stop.textContent = "停止中……"; };
    let done = 0, failed = 0, i = 0;
    const show = () => { prog.textContent = `完成 ${done} / ${list.length}${failed ? `，失敗 ${failed}` : ""}`; };
    show();
    const lane = async () => {
      while (!S.stop && i < list.length) {
        const x = list[i++];
        try { await worker(x); done++; } catch (e) { failed++; if (e.status === 401 || e.status === 403 || /金鑰/.test(e.message)) { S.stop = true; alert(e.message); } }
        show();
      }
    };
    await Promise.all([lane(), lane()]);
    S.busy = false; stop.hidden = true; stop.textContent = "停止";
    prog.textContent += S.stop ? "（已停止）" : "，全部跑完了 🎉";
    renderCheck();
  }

  /* ── ⑤ 圖片 ──────────────────────────────────────────────────── */
  function renderImages() {
    const box = $("#tab-image");
    const ep = S.ep;
    if (!ep) { box.innerHTML = "<h2>⑤ 圖片</h2>"; return; }
    const items = LESSON.allImages(ep);
    const missing = items.filter((x) => !S.found[x.file]);
    box.innerHTML = `<h2>⑤ 圖片（Gemini ${esc(models().image)}）</h2>
      <p class="hint">每張圖的描述 =「畫風」＋「出現角色的外型」＋「這一場的動作」。有角色設定圖的話也會一起送出當參考。
      <b>建議先只產生第一張</b>，確認畫風和角色長相都對了，再按「產生全部」，不然畫風錯了就要整批重來。</p>
      <div class="toolbar"><button class="primary" id="img-all">產生所有還沒有的圖（${missing.length} 張）</button>
        <button id="img-stop" hidden>停止</button><span id="img-progress"></span></div>
      <div class="zip-row" hidden><button class="zip">⬇ 下載</button> <span class="hint">解壓縮後，把裡面的 assets 資料夾合併到 starter-kit 資料夾裡。</span></div>
      <div class="img-grid">${items.map((x) => `<div class="card img" data-id="${esc(x.id)}">
        <div class="pic"><span>${esc(x.id)}</span></div>
        <div class="row"><code>${esc(x.id)}</code> <span class="st">${S.found[x.file] ? "✅" : "—"}</span> <button class="small gen">${S.found[x.file] ? "重新產生" : "產生"}</button></div>
        <p>${esc(x.prompt)}</p>
        <details><summary>完整送出的描述</summary><pre>${esc(Gemini.imagePrompt(ep, x, true))}</pre></details></div>`).join("")}</div>`;
    const cardOf = (id) => $(`.img[data-id="${CSS.escape(id)}"]`, box);
    items.forEach((x) => { if (S.found[x.file]) showPic($(".pic", cardOf(x.id)), x.file); });
    const genOne = async (x) => {
      const card = cardOf(x.id);
      $(".st", card).textContent = "⏳ 產生中…";
      try {
        const refs = [];
        for (const k of x.who) {
          const p = await findAsset(castFile(k), IMAGE_EXT);
          if (!p) continue;
          try {
            const bytes = S.made[p] ? S.made[p].bytes : new Uint8Array(await (await readAny(p)).arrayBuffer());
            refs.push({ bytes, mime: "image/" + (p.endsWith("png") ? "png" : p.endsWith("webp") ? "webp" : "jpeg") });
          } catch (e) { /* 雙擊打開又沒連接資料夾時讀不到舊檔，就不帶參考圖 */ }
        }
        const r = await Gemini.image({ key: S.key, model: models().image, prompt: Gemini.imagePrompt(ep, x, refs.length > 0), refs, ratio: ep.art.ratio },
          { onWait: () => { $(".st", card).textContent = "⏳ 排隊中"; } });
        await save(x.file, IMAGE_EXT, r);
        $(".st", card).textContent = "✅";
        $(".gen", card).textContent = "重新產生";
        showPic($(".pic", card), x.file);
      } catch (e) {
        $(".st", card).innerHTML = `<span class="bad" title="${esc(e.detail || "")}">❌ ${esc(e.message)}</span>`;
        throw e;
      }
    };
    items.forEach((x) => { $(".gen", cardOf(x.id)).onclick = () => { if (!needKey()) genOne(x).catch(() => {}); }; });
    $("#img-all").onclick = () => { if (!needKey()) runBatch(items.filter((x) => !S.found[x.file]), genOne, "#img-progress", "#img-stop"); };
    bindZip(box);
    renderStatus();
  }
  async function readAny(path) {
    if (S.dir) return readFile(path);
    const res = await fetch(path);
    return res.blob();
  }

  /* ── ⑥ 背景音樂（Suno）──────────────────────────────────────── */
  const MOODS = ["cheerful", "playful", "calm", "warm", "curious", "gentle", "upbeat", "lo-fi", "marimba", "ukulele", "acoustic guitar", "soft piano", "glockenspiel", "light strings", "80 bpm", "100 bpm", "120 bpm"];

  function renderMusic() {
    const box = $("#tab-music");
    const ep = S.ep;
    if (!ep) { box.innerHTML = "<h2>⑥ 背景音樂</h2>"; return; }
    const b = ep.bgm || {};
    const sn = b.suno || {};
    const style = sn.style || "gentle playful background music for a language-learning cartoon, light percussion, simple melody, instrumental, no vocals";
    const file = b.file || "assets/bgm/" + ep.id + ".mp3";
    box.innerHTML = `<h2>⑥ 背景音樂（Suno）</h2>
      <div class="card"><h3>1. 調整提示詞</h3>
        <label><span>音樂風格（貼到 Suno 的 <b>Style of Music</b>）</span><textarea id="suno-style" rows="3">${esc(style)}</textarea></label>
        <div class="chips">${MOODS.map((m) => `<button class="chip-btn" data-m="${m}">+ ${m}</button>`).join("")}</div>
        <label><span>歌名（貼到 <b>Title</b>）</span><input id="suno-title" value="${esc(sn.title || ep.title + " Theme")}"></label>
        <p class="hint">背景音樂的原則：<b>不能蓋過人聲</b>。所以一定要純音樂（instrumental、no vocals），節奏穩定、旋律簡單，不要有突然的大鼓或高音。</p>
      </div>
      <div class="card"><h3>2. 複製到 Suno</h3>
        <div class="copy-box"><span>Style of Music</span><pre id="suno-out-style"></pre><button data-copy="suno-out-style">複製</button></div>
        <div class="copy-box"><span>Title</span><pre id="suno-out-title"></pre><button data-copy="suno-out-title">複製</button></div>
        <div class="copy-box"><span>如果用簡單模式（Song Description）</span><pre id="suno-out-desc"></pre><button data-copy="suno-out-desc">複製</button></div>
        <ol class="steps">
          <li>登入 <a href="https://suno.com" target="_blank" rel="noopener">suno.com</a>，按左邊的 <b>Create</b>。</li>
          <li>切到 <b>Custom</b>（自訂模式），打開 <b>Instrumental</b>（純音樂，沒有人聲）。</li>
          <li>把上面的 Style of Music 和 Title 貼進去，按 <b>Create</b>。Suno 一次會給兩首。</li>
          <li>兩首都聽聽看，挑「最不搶戲」的那一首。按 ⋯ → <b>Download</b> → <b>MP3 Audio</b>。</li>
          <li>把下載的檔案改名成 <code>${esc(file.split("/").pop())}</code>，放進 <code>${esc(file.split("/").slice(0, -1).join("/"))}/</code> 資料夾。</li>
          <li>回到這裡按「重新檢查」，再到下面調音量。</li>
        </ol>
        <p class="hint">授權提醒：Suno 免費方案做的音樂通常只能用在非商業用途（例如課堂作業）。要拿去賣或商用，請先看 Suno 最新的使用條款。</p>
      </div>
      <div class="card"><h3>3. 測試音量</h3>
        <p>題庫裡寫的檔案：<code>${esc(file)}</code>　<span id="bgm-st"></span> <button class="small" id="bgm-rescan">重新檢查</button></p>
        <div class="row"><button id="bgm-play">▶ 播放音樂</button> <button id="bgm-voice">▶ 加一句台詞一起聽</button>
          <label class="inline">音量 <input type="range" id="bgm-vol" min="0" max="0.4" step="0.01" value="${Number(b.volume) || 0.12}"> <b id="bgm-vol-out"></b></label></div>
        <p class="hint">一邊放音樂一邊聽台詞：台詞要「完全聽得清楚」，音樂只是墊在下面。調好之後，把題庫檔 bgm 裡的 <code>volume</code> 改成上面顯示的數字。</p>
      </div>`;
    const update = () => {
      let st = $("#suno-style", box).value.trim();
      if (!/instrumental/i.test(st)) st += ", instrumental";
      if (!/no vocals/i.test(st)) st += ", no vocals";
      $("#suno-out-style", box).textContent = st;
      $("#suno-out-title", box).textContent = $("#suno-title", box).value.trim();
      // Suno 看得懂英文就好，所以學習者如果是用中文寫的，就改成通稱
      const who = !ep.learner || /[\u3400-\u9fff]/.test(ep.learner) ? "language learners" : ep.learner;
      $("#suno-out-desc", box).textContent = `A loopable instrumental background track for "${ep.title}", ${ep.lang === "zh-TW" ? "a Mandarin" : "an English"} learning episode for ${who}. Style: ${st}. Keep it steady and soft so spoken voices stay clear.`;
    };
    $("#suno-style", box).oninput = update; $("#suno-title", box).oninput = update; update();
    $$(".chip-btn", box).forEach((c) => (c.onclick = () => { const t = $("#suno-style", box); t.value = t.value.trim().replace(/,?\s*$/, "") + ", " + c.dataset.m; update(); }));
    $$("[data-copy]", box).forEach((btn) => (btn.onclick = () => { navigator.clipboard.writeText($("#" + btn.dataset.copy, box).textContent).then(() => { btn.textContent = "已複製 ✓"; setTimeout(() => (btn.textContent = "複製"), 1500); }); }));

    const base = file.replace(/\.[^.]+$/, ""), ext = file.split(".").pop();
    const music = new Audio(); music.loop = true;
    const vol = $("#bgm-vol", box);
    const showVol = () => { $("#bgm-vol-out", box).textContent = "volume: " + Number(vol.value).toFixed(2); music.volume = Number(vol.value); };
    vol.oninput = showVol; showVol();
    const refresh = async () => { delete S.found[base]; const p = await findAsset(base, [ext]); $("#bgm-st", box).textContent = p ? "✅ 找到了" : "❌ 還沒有這個檔案"; return p; };
    refresh();
    $("#bgm-rescan", box).onclick = refresh;
    $("#bgm-play", box).onclick = async () => {
      if (!music.paused) { music.pause(); $("#bgm-play", box).textContent = "▶ 播放音樂"; return; }
      const p = await refresh(); if (!p) return;
      music.src = await urlOf(p); showVol(); music.play(); $("#bgm-play", box).textContent = "⏸ 停止音樂";
    };
    $("#bgm-voice", box).onclick = async () => {
      const first = LESSON.allLines(ep).find((x) => S.found[x.line.audio]);
      if (!first) { alert("還沒有任何一句的聲音檔。先到「④ 語音」產生幾句。"); return; }
      if (music.paused) $("#bgm-play", box).click();
      playUrl(await urlOf(S.found[first.line.audio]));
    };
  }

  /* ── 播放、zip ─────────────────────────────────────────────────── */
  const player = new Audio();
  function playUrl(url) { if (!url) return; player.src = url; player.play().catch(() => {}); }
  function playBytes(bytes, mime) { playUrl(URL.createObjectURL(new Blob([bytes], { type: mime }))); }

  function bindZip(box) {
    $$(".zip", box).forEach((b) => (b.onclick = () => {
      const files = Object.keys(S.made).map((p) => ({ path: p, bytes: S.made[p].bytes }));
      const blob = new Blob([makeZip(files)], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = (S.ep ? S.ep.id : "assets") + "-素材.zip";
      a.click();
    }));
  }

  /* 最簡單的 zip（不壓縮，只打包）：mp3、jpg 本來就壓縮過了，再壓也不會變小 */
  function makeZip(files) {
    const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    const now = new Date();   // zip 用的是 DOS 格式的日期與時間
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    files.forEach((f) => {
      const name = enc.encode(f.path), crc = crc32(f.bytes), size = f.bytes.length;
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true); local.setUint32(18, size, true); local.setUint32(22, size, true); local.setUint16(26, name.length, true);
      parts.push(new Uint8Array(local.buffer), name, f.bytes);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, size, true); cen.setUint32(24, size, true); cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + size;
    });
    const cenSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
    const all = parts.concat(central, [new Uint8Array(end.buffer)]);
    const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
    let p = 0; all.forEach((b) => { out.set(b, p); p += b.length; });
    return out;
  }

  // 給自動測試用
  window.__studio = { S, makeZip, scanAssets, renderAll };
})();
