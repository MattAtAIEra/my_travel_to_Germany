/* ==========================================================================
   lesson.js —— 題庫登記處＋整理器

   每一集的內容檔（content/*.js）都只做一件事：呼叫 LESSON.add({...})
   把自己登記進來。播放器（index.html）與工作台（studio.html）再從這裡
   拿到「整理好的」那一集來用。

   這支檔案同時可以在瀏覽器和 Node.js 裡跑（tools/generate.mjs 會用到）。
   ========================================================================== */
(function (root) {
  "use strict";

  const registered = [];   // [{ raw, file }]
  const problems = [];     // 讀檔時的問題：[{ file, message }]
  let currentFile = "";

  /* 內容檔呼叫這個函式登記自己 */
  function add(raw) {
    registered.push({ raw, file: currentFile });
  }

  /* ── 依序載入內容檔 ──────────────────────────────────────────────
     用 <script> 一個一個載入，而不是 fetch：雙擊打開 index.html 時
     （網址是 file://），瀏覽器不准 fetch 讀本機檔案，但 <script> 可以。
     一個一個載入才知道「哪個檔案」沒有成功登記。 */
  function load(files, base) {
    base = base || "content/";
    return files.reduce((chain, name) => chain.then(() => new Promise((resolve) => {
      const before = registered.length;
      currentFile = name;
      let detail = "";
      const onError = (e) => {
        // 放上網站後瀏覽器會告訴我們第幾行；雙擊打開時只會說「Script error.」
        if (e.filename && e.filename.indexOf(name) >= 0) detail = `第 ${e.lineno} 行：${e.message}`;
      };
      root.addEventListener && root.addEventListener("error", onError);
      const s = document.createElement("script");
      s.src = base + name + (location.protocol === "file:" ? "" : "?v=" + Date.now());
      s.onload = () => {
        root.removeEventListener("error", onError);
        if (registered.length === before) {
          problems.push({ file: name, message: "這個檔案讀進來了，但裡面有語法錯誤，所以沒有登記成功。" +
            (detail ? "（" + detail + "）" : "最常見的原因：少了逗號、引號沒有成對、括號沒有關上，或用了中文全形的「，」「“”」。打開 studio.html 的「檢查題庫」可以找出是第幾行。") });
        }
        resolve();
      };
      s.onerror = () => {
        root.removeEventListener("error", onError);
        problems.push({ file: name, message: "找不到這個檔案。請確認 content/ 資料夾裡真的有它，而且檔名（含大小寫）和 content/episodes.js 裡寫的一模一樣。" });
        resolve();
      };
      document.head.appendChild(s);
    })), Promise.resolve()).then(() => ({ episodes: registered.map((r) => build(r.raw, r.file)), problems }));
  }

  /* ── 把一句台詞整理成固定格式 ───────────────────────────────────
     可以寫成字串 "captain: It's an apple."（像劇本一樣）
     也可以寫成物件 { who: "captain", say: "It's an apple.", hint: "這是一顆蘋果。" } */
  function parseLine(item, castKeys) {
    if (typeof item === "string") {
      const m = item.match(/^\s*([A-Za-z0-9_\-]+)\s*[:：]\s*([\s\S]*)$/);
      if (m && castKeys.indexOf(m[1]) >= 0) return { who: m[1], say: m[2].trim() };
      if (m) return { who: m[1], say: m[2].trim(), unknownWho: true };
      return { who: "", say: item.trim(), noWho: true };
    }
    if (item && typeof item === "object") {
      return {
        who: item.who || "", say: String(item.say || "").trim(), hint: item.hint || "",
        style: item.style || "", show: item.show || "", unknownWho: item.who && castKeys.indexOf(item.who) < 0,
      };
    }
    return { who: "", say: "", noWho: true };
  }

  /* ── 整理一整集 ─────────────────────────────────────────────────
     依照「約定」幫每一張圖、每一句聲音算出檔名，學生不必自己取：
       圖：assets/<集代號>/images/<場次代號>.jpg
       聲：assets/<集代號>/audio/<場次代號>-<第幾句>.mp3
     （檔案也可以是 .png／.webp、.wav，播放器會自己找） */
  function build(raw, file) {
    raw = raw || {};
    const id = String(raw.id || "").trim();
    const lang = raw.lang || "en";
    const castIn = raw.cast || {};
    const castKeys = Object.keys(castIn);
    const cast = {};
    castKeys.forEach((k, i) => {
      const c = castIn[k] || {};
      cast[k] = {
        key: k, name: c.name || k, emoji: c.emoji || "🙂", color: c.color || PALETTE[i % PALETTE.length],
        voice: c.voice || "", lang: c.lang || lang, style: c.style || "", look: c.look || "",
      };
    });
    const assets = "assets/" + id + "/";
    const mkLine = (item, lineId) => {
      const p = parseLine(item, castKeys);
      const ch = cast[p.who];
      return Object.assign(p, {
        id: lineId, char: ch || null, lang: (ch && ch.lang) || lang,
        text: p.show || p.say, audio: assets + "audio/" + lineId,
      });
    };
    const scenes = (raw.scenes || []).map((s, si) => {
      s = s || {};
      const sid = String(s.id || "s" + (si + 1));
      const type = s.type || "story";
      const scene = {
        id: sid, type, title: s.title || "", caption: s.caption || "", image: s.image || "",
        imageFile: assets + "images/" + sid, ask: s.ask || "", voice: s.voice || castKeys[0] || "",
        raw: s,
      };
      scene.lines = (s.lines || []).map((l, li) => mkLine(l, sid + "-" + (li + 1)));
      scene.options = (s.options || []).map((o, oi) => {
        o = o || {};
        const key = "abcdefgh"[oi] || String(oi + 1);
        const oid = sid + "-" + key;
        const all = [o.say].concat(o.then || []).filter((x) => x !== undefined && x !== null);
        const lines = all.map((l, li) => mkLine(l, oid + "-" + (li + 1)));
        return {
          key, id: oid, label: o.label || (lines[0] ? lines[0].text : ""), tag: o.tag || "", caption: o.caption || "",
          correct: !!o.correct, image: o.image || "", imageFile: assets + "images/" + oid,
          say: lines[0] || null, lines, raw: o,
        };
      });
      scene.words = (s.words || []).map((w, wi) => {
        w = typeof w === "string" ? { word: w } : (w || {});
        return {
          word: w.word || "", note: w.note || "", hint: w.hint || "",
          audio: assets + "audio/" + sid + "-w" + (wi + 1), id: sid + "-w" + (wi + 1),
        };
      });
      return scene;
    });
    const bgm = raw.bgm ? Object.assign({ volume: 0.12 }, raw.bgm) : null;
    return {
      file, raw, id, title: raw.title || id, subtitle: raw.subtitle || "", learner: raw.learner || "",
      goal: raw.goal || "", lang, ui: raw.ui || (lang === "zh-TW" ? "zh-TW" : "en"),
      theme: Object.assign({ main: "#2f5d8a", accent: "#d0563b", paper: "#f6efe4", ink: "#2a2420", font: "sans" }, raw.theme || {}),
      art: Object.assign({ style: "", ratio: "16:9" }, raw.art || {}),
      speech: Object.assign({ note: "" }, raw.speech || {}),
      bgm, cast, castKeys, scenes, assets,
    };
  }

  /* 列出一集裡「所有要配音的句子」（工作台和批次工具用） */
  function allLines(ep) {
    const out = [];
    ep.scenes.forEach((s) => {
      s.lines.forEach((l) => out.push({ scene: s, line: l }));
      s.options.forEach((o) => o.lines.forEach((l) => out.push({ scene: s, option: o, line: l })));
      s.words.forEach((w) => {
        const ch = ep.cast[s.voice] || null;
        out.push({ scene: s, word: w, line: {
          id: w.id, who: s.voice, char: ch, say: w.word, text: w.word, hint: w.hint, style: "Say the word slowly and clearly, like a teacher.",
          lang: (ch && ch.lang) || ep.lang, audio: w.audio,
        } });
      });
    });
    return out;
  }

  /* 列出一集裡「所有要畫的圖」 */
  function allImages(ep) {
    const out = [];
    ep.scenes.forEach((s) => {
      // 畫面裡有誰：寫了 people 就照寫的；沒寫就找「圖的描述裡提到名字的角色」
      const people = (x, lines) => (Array.isArray(x.people) ? x.people : namedIn(ep, x.image || "") || whoIn(lines));
      if (s.image) out.push({ id: s.id, scene: s, prompt: s.image, file: s.imageFile, who: people(s.raw, s.lines) });
      s.options.forEach((o) => {
        if (o.image) out.push({ id: o.id, scene: s, option: o, prompt: o.image, file: o.imageFile, who: people(o.raw, o.lines.concat(s.lines)) });
      });
    });
    return out;
  }
  /* 圖的描述裡提到誰的名字（不分大小寫），就把誰的外型描述一起帶上 */
  function namedIn(ep, prompt) {
    const low = prompt.toLowerCase();
    const hit = ep.castKeys.filter((k) => low.indexOf(ep.cast[k].name.toLowerCase()) >= 0);
    return hit.length ? hit : null;
  }
  function whoIn(lines) {
    const seen = [];
    lines.forEach((l) => { if (l.who && seen.indexOf(l.who) < 0) seen.push(l.who); });
    return seen;
  }

  const PALETTE = ["#2060b0", "#d04830", "#2f8f5b", "#8a4fbf", "#c98a12", "#1b8a9a"];

  const LESSON = { add, load, build, parseLine, allLines, allImages, whoIn, namedIn, registered, problems };
  if (typeof module !== "undefined" && module.exports) module.exports = LESSON;
  root.LESSON = LESSON;
})(typeof window !== "undefined" ? window : globalThis);
