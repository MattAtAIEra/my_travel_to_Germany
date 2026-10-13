/* ==========================================================================
   player.js —— 互動播放引擎

   引擎不認識任何一集的內容。它只會照「題庫檔」的規格一場一場播：
     story   一般的戲：顯示圖、一句一句播台詞
     choice  劇情選擇：先播台詞，再出選項；選了就播那條分支，然後回到主線
     quiz    測驗題：跟 choice 一樣，但有正確答案，會計分
     recap   回顧：重播學習者自己選過的那幾句
     words   單字卡：今天的重點字，每個字都可以點來聽
   播完自動進入「學習成果」畫面，透過 Netlify Forms 送出。

   所以換一集、改題目，都只要改 content/ 裡的題庫檔，這支程式不用動。
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, el) => (el || document).querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
  const params = new URLSearchParams(location.search);
  const DEV = params.get("dev") === "1";

  /* ── 畫面上的文字（兩種語言）────────────────────────────────────── */
  const UI = {
    en: {
      start: "Start ▶", replay: "Again", pause: "Pause", resume: "Play", next: "Next", music: "Music", exit: "Exit",
      choose: "Choose one", correct: "Correct! 🎉", wrong: "Nice try! Listen… 👂", recap: "Your lines", words: "Today's words",
      cont: "Continue ▶", done: "You did it!", score: "Quiz: {n} / {t} correct", time: "Time: {m} min {s} sec",
      picks: "Your choices", nickname: "Your nickname", nickHint: "A nickname is fine. No full names, please.",
      klass: "Class code (optional)", stars: "Did you like it?", comment: "Anything to tell us? (optional)",
      send: "Send my result 💌", sending: "Sending…", sent: "Sent! Thank you 💌",
      local: "Test mode: this page is opened from your own computer, so nothing is sent. Results are collected after it is on Netlify.",
      failed: "Couldn't send it ({why}). Please try again.", again: "Play again (try other choices)", home: "All episodes",
      episodes: "Episodes", minutes: "about {m} min", noEpisodes: "No episodes yet.",
    },
    "zh-TW": {
      start: "開始 ▶", replay: "重聽", pause: "暫停", resume: "繼續", next: "下一句", music: "音樂", exit: "離開",
      choose: "選一個", correct: "答對了！🎉", wrong: "差一點！仔細聽… 👂", recap: "你選的句子", words: "今天學的字",
      cont: "繼續 ▶", done: "完成了！", score: "測驗答對 {n} / {t} 題", time: "花了 {m} 分 {s} 秒",
      picks: "你的選擇", nickname: "你的暱稱", nickHint: "填暱稱就好，請不要寫全名。",
      klass: "班級代號（選填）", stars: "喜歡這一集嗎？", comment: "想說的話（選填）",
      send: "送出學習成果 💌", sending: "送出中…", sent: "送出了，謝謝你 💌",
      local: "本機測試模式：這個頁面是從你自己的電腦打開的，所以不會真的送出。放上 Netlify 之後才會收到學習成果。",
      failed: "沒有送出成功（{why}），請再試一次。", again: "再玩一次（試試別的選項）", home: "回到目錄",
      episodes: "這一季的每一集", minutes: "大約 {m} 分鐘", noEpisodes: "還沒有任何一集。",
    },
  };
  let T = UI.en;
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

  /* ── 狀態 ─────────────────────────────────────────────────────────
     播放器同一時間只會在「一個狀態」：播台詞、等選擇、看單字卡、填成果……
     把狀態集中放在一個地方，是避免程式打結的老方法。 */
  const state = {
    ep: null, run: 0, paused: false, interrupt: null, bgmOn: true,
    picks: [], quiz: { right: 0, total: 0, detail: [] }, startedAt: 0,
    sceneIndex: 0, lineInfo: "", found: {},
  };
  class Aborted extends Error {}
  const voice = new Audio();
  const bgm = new Audio();
  bgm.loop = true;

  /* ── 起點：讀取所有題庫，顯示目錄或直接播某一集 ─────────────── */
  window.addEventListener("DOMContentLoaded", () => {
    const files = window.EPISODES || [];
    LESSON.load(files).then(({ episodes, problems }) => {
      window.__lesson = { episodes, problems };
      const wanted = params.get("ep");
      const ep = episodes.find((e) => e.id === wanted);
      if (ep) openEpisode(ep, episodes, problems);
      else showHome(episodes, problems);
    });
    bindKeys();
  });

  function showHome(episodes, problems) {
    stopAll();
    const lang = (episodes[0] && episodes[0].ui) || "zh-TW";
    T = UI[lang] || UI.en;
    document.body.className = "home-mode" + (DEV ? " dev" : "");
    applyTheme(episodes[0] ? episodes[0].theme : null);
    const home = $("#home");
    home.hidden = false; $("#stage").hidden = true;
    const list = $("#episode-list", home);
    $("#home-title").textContent = document.title;
    $("#home-sub").textContent = T.episodes;
    list.innerHTML = "";
    if (!episodes.length) list.appendChild(el("p", "empty", T.noEpisodes));
    episodes.forEach((ep) => {
      const issues = Checker.check(ep).filter((p) => p.level === "error");
      const mins = Math.max(1, Math.round(estimate(ep) / 60));
      const card = el("a", "ep-card" + (issues.length ? " broken" : ""));
      card.href = "?ep=" + encodeURIComponent(ep.id) + (DEV ? "&dev=1" : "");
      card.style.setProperty("--main", ep.theme.main);
      card.style.setProperty("--accent", ep.theme.accent);
      card.innerHTML = `<span class="ep-emoji">${ep.castKeys.map((k) => ep.cast[k].emoji).join("")}</span>
        <span class="ep-id">${esc(ep.id.toUpperCase())}</span>
        <strong>${esc(ep.title)}</strong><span class="ep-sub">${esc(ep.subtitle)}</span>
        <span class="ep-meta">${esc(ep.learner)}${ep.learner ? " ・ " : ""}${esc(fmt((UI[ep.ui] || UI.en).minutes, { m: mins }))}</span>
        ${issues.length ? `<span class="ep-broken">⚠ 題庫有 ${issues.length} 個錯誤</span>` : ""}`;
      list.appendChild(card);
    });
    renderProblems(problems, episodes);
  }

  /* 題庫有錯的時候，直接在畫面上講清楚哪裡錯 */
  function renderProblems(problems, episodes) {
    const box = $("#problems");
    const rows = problems.map((p) => `<li><b>${esc(p.file)}</b>：${esc(p.message)}</li>`);
    (episodes || []).forEach((ep) => {
      Checker.check(ep).filter((p) => p.level === "error").forEach((p) => rows.push(`<li><b>${esc(ep.id || ep.file)}</b> ${esc(p.where)}：${esc(p.message)}</li>`));
    });
    box.hidden = !rows.length;
    box.innerHTML = rows.length ? `<h3>題庫需要修正的地方</h3><ul>${rows.join("")}</ul><p>修好之後存檔，重新整理這一頁。打開 <a href="studio.html">studio.html</a> 可以看到更完整的檢查。</p>` : "";
  }

  function openEpisode(ep, episodes, problems) {
    state.ep = ep;
    T = UI[ep.ui] || UI.en;
    document.documentElement.lang = ep.ui === "zh-TW" ? "zh-Hant-TW" : "en";
    document.title = ep.title;
    document.body.className = "stage-mode font-" + ep.theme.font + (DEV ? " dev" : "");
    applyTheme(ep.theme);
    $("#home").hidden = true;
    $("#stage").hidden = false;
    const errors = Checker.check(ep).filter((p) => p.level === "error");
    renderProblems(problems.filter((p) => p.file === ep.file), errors.length ? [ep] : []);
    $("#ep-title").textContent = ep.title;
    setLabels();
    buildDevPanel(ep);
    showCover(ep, errors.length > 0);
  }

  function applyTheme(t) {
    if (!t) return;
    const r = document.documentElement.style;
    r.setProperty("--main", t.main); r.setProperty("--accent", t.accent);
    r.setProperty("--paper", t.paper); r.setProperty("--ink", t.ink);
  }

  function setLabels() {
    $("#btn-replay").lastChild.textContent = T.replay;
    $("#btn-pause").lastChild.textContent = state.paused ? T.resume : T.pause;
    $("#btn-next").lastChild.textContent = T.next;
    $("#btn-music").lastChild.textContent = T.music;
    $("#btn-exit").lastChild.textContent = T.exit;
  }

  /* 封面：一定要學習者按一下「開始」，瀏覽器才允許播放聲音 */
  function showCover(ep, broken) {
    setPicture(null, ep.title);
    subtitle(null);
    const o = overlay("cover");
    o.innerHTML = `<div class="cover-cast">${ep.castKeys.map((k) => `<span title="${esc(ep.cast[k].name)}">${ep.cast[k].emoji}</span>`).join("")}</div>
      <h1>${esc(ep.title)}</h1><p class="cover-sub">${esc(ep.subtitle)}</p>
      ${ep.goal ? `<p class="cover-goal">${esc(ep.goal)}</p>` : ""}`;
    const b = el("button", "big-btn", T.start);
    b.disabled = broken;
    b.onclick = () => start(0);
    o.appendChild(b);
    b.focus();
  }

  /* ── 主流程：從第 from 場開始，一場一場播 ─────────────────────── */
  async function start(from) {
    const ep = state.ep;
    const myRun = ++state.run;
    stopVoice();
    if (from === 0) { state.picks = []; state.quiz = { right: 0, total: 0, detail: [] }; state.startedAt = Date.now(); }
    startBgm();
    try {
      for (let i = from; i < ep.scenes.length; i++) {
        state.sceneIndex = i;
        progress(i);
        preload(ep.scenes[i + 1]);
        const s = ep.scenes[i];
        markDev(s.id);
        if (s.type === "choice" || s.type === "quiz") await playChoice(s, myRun);
        else if (s.type === "recap") await playRecap(s, myRun);
        else if (s.type === "words") await playWords(s, myRun);
        else await playStory(s, myRun);
      }
      progress(ep.scenes.length);
      showResult();
    } catch (e) {
      if (!(e instanceof Aborted)) throw e;
    }
  }

  function guard(myRun) { if (myRun !== state.run) throw new Aborted(); }

  async function playStory(s, myRun) {
    closeOverlay();
    setPicture(s.image ? s.imageFile : null, s.title, s, s.lines);
    caption(s.caption);
    if (!s.lines.length) await wait(2500, myRun);
    for (const line of s.lines) await speak(line, myRun);
  }

  async function playChoice(s, myRun) {
    closeOverlay();
    setPicture(s.image ? s.imageFile : null, s.title, s, s.lines);
    caption(s.caption);
    for (const line of s.lines) await speak(line, myRun);
    subtitle(null);
    const opt = await choose(s, myRun);
    const isQuiz = s.type === "quiz";
    state.picks.push({ scene: s, option: opt });
    if (isQuiz) {
      state.quiz.total++;
      if (opt.correct) state.quiz.right++;
      state.quiz.detail.push(`${s.id}:${opt.key.toUpperCase()}${opt.correct ? "✓" : "✗"}`);
      toast(opt.correct ? T.correct : T.wrong, opt.correct ? "good" : "soft");
    }
    closeOverlay();
    setPicture(opt.image ? opt.imageFile : (s.image ? s.imageFile : null), opt.label, s, opt.lines);
    caption(opt.caption);
    for (const line of opt.lines) await speak(line, myRun);
  }

  function choose(s, myRun) {
    return new Promise((resolve) => {
      const o = overlay("choice");
      o.innerHTML = `<p class="ask">${esc(s.ask || T.choose)}</p>`;
      const grid = el("div", "options");
      s.options.forEach((opt, i) => {
        const b = el("button", "option");
        // 測驗題不顯示 tag：tag 等於把答案寫在旁邊
        b.innerHTML = `<span class="num">${i + 1}</span><span class="label">${esc(opt.label)}</span>${opt.tag && s.type !== "quiz" ? `<span class="tag">${esc(opt.tag)}</span>` : ""}`;
        b.onclick = () => { if (myRun === state.run) { state.chooser = null; resolve(opt); } };
        grid.appendChild(b);
      });
      o.appendChild(grid);
      state.chooser = (n) => { const opt = s.options[n]; if (opt) { state.chooser = null; resolve(opt); } };
      grid.firstChild && grid.firstChild.focus();
    });
  }

  async function playRecap(s, myRun) {
    setPicture(null, T.recap, s, []);
    caption("");
    const o = overlay("recap");
    o.innerHTML = `<p class="ask">${esc(s.title || T.recap)}</p>`;
    // 劇情選擇重播「你選的那一句」；測驗題重播「正確答案」，不把講錯的句子再念一次
    const lines = state.picks.map((p) => (p.scene.type === "quiz" ? p.scene.options.find((x) => x.correct) || p.option : p.option));
    const list = el("ol", "recap-list");
    lines.forEach((opt) => {
      const li = el("li");
      const c = opt.say && opt.say.char;
      li.innerHTML = `<span class="who" style="--c:${c ? c.color : "var(--main)"}">${c ? c.emoji + " " + esc(c.name) : ""}</span> ${esc(opt.label)}${opt.correct ? " ✓" : ""}`;
      list.appendChild(li);
    });
    o.appendChild(list);
    const items = [...list.children];
    for (let i = 0; i < lines.length; i++) {
      items.forEach((li, j) => li.classList.toggle("now", i === j));
      if (lines[i].say) await speak(lines[i].say, myRun);
    }
    items.forEach((li) => li.classList.remove("now"));
    for (const line of s.lines) await speak(line, myRun);
  }

  async function playWords(s, myRun) {
    setPicture(null, T.words, s, []);
    caption("");
    const o = overlay("words");
    o.innerHTML = `<p class="ask">${esc(s.title || T.words)}</p>`;
    const grid = el("div", "word-cards");
    s.words.forEach((w) => {
      const b = el("button", "word-card");
      b.innerHTML = `<span class="w">${esc(w.word)}</span>${w.note ? `<span class="n">${esc(w.note)}</span>` : ""}${w.hint ? `<span class="h">${esc(w.hint)}</span>` : ""}<span class="ear">🔊</span>`;
      b.onclick = () => sayWord(w, s);
      grid.appendChild(b);
    });
    o.appendChild(grid);
    for (const line of s.lines) await speak(line, myRun);
    subtitle(null);
    await new Promise((resolve) => {
      const b = el("button", "big-btn", T.cont);
      b.onclick = resolve;
      o.appendChild(b);
      state.chooser = (n) => { if (n === -1) resolve(); };
      b.focus();
    });
    state.chooser = null;
    guard(myRun);
  }

  function sayWord(w, s) {
    const ch = state.ep.cast[s.voice];
    const line = { id: w.id, who: s.voice, char: ch, say: w.word, text: w.word, hint: w.hint, lang: ch ? ch.lang : state.ep.lang, audio: w.audio };
    if (state.interrupt) return;          // 台詞還在播，先不打斷
    speak(line, state.run).catch(() => {});
  }

  /* ── 播一句台詞 ───────────────────────────────────────────────────
     先找正式的聲音檔（.mp3 → .wav）；找不到就用電腦內建語音念，
     再不行就只顯示字幕、依字數停留。所以還沒做聲音也能先試玩。 */
  async function speak(line, myRun) {
    guard(myRun);
    for (;;) {
      subtitle(line);
      const outcome = await sayOnce(line, myRun);
      guard(myRun);
      if (outcome !== "replay") break;
    }
    await wait(350, myRun);
  }

  function sayOnce(line, myRun) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (why) => { if (settled) return; settled = true; state.interrupt = null; resolve(why); };
      state.interrupt = (why) => { stopVoice(); finish(why); };
      if (myRun !== state.run) return finish("abort");
      playFile(line).then((ok) => {
        if (ok === "ended") return finish("done");
        if (settled) return;
        devAudio(line, "computer");
        fallbackSpeak(line, myRun).then(() => finish("done"));
      });
    });
  }

  function playFile(line) {
    const tryUrl = (url) => new Promise((resolve) => {
      if (state.found[url] === false) return resolve("missing");
      const cleanup = () => { voice.onended = voice.onerror = null; };
      voice.onended = () => { cleanup(); resolve("ended"); };
      voice.onerror = () => { cleanup(); state.found[url] = false; resolve("missing"); };
      voice.src = url;
      voice.playbackRate = 1;
      const p = voice.play();
      if (p) p.then(() => { state.found[url] = true; devAudio(line, url); if (state.paused) voice.pause(); })
        .catch((e) => { if (e && e.name === "NotAllowedError") { cleanup(); resolve("missing"); } });
    });
    return tryUrl(line.audio + ".mp3").then((r) => (r === "missing" ? tryUrl(line.audio + ".wav") : r));
  }

  function fallbackSpeak(line, myRun) {
    const text = line.say || line.text || "";
    const ms = Checker.estimateSeconds(text) * 1000;
    const synth = window.speechSynthesis;
    const hasVoice = synth && synth.getVoices && synth.getVoices().length > 0;
    if (!hasVoice) return wait(ms, myRun).catch(() => {});
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text.replace(/~+/g, ""));
      u.lang = line.lang === "zh-TW" ? "zh-TW" : "en-US";
      u.rate = line.lang === "zh-TW" ? 1 : 0.92;
      // 有些瀏覽器念完不會通知，保險起見給一個最長等待時間
      const safety = setTimeout(resolve, ms * 2.5 + 2000);
      u.onend = u.onerror = () => { clearTimeout(safety); resolve(); };
      synth.cancel();
      synth.speak(u);
      if (state.paused) synth.pause();
    });
  }

  /* 會尊重「暫停」的等待：暫停時不計時 */
  function wait(ms, myRun) {
    return new Promise((resolve, reject) => {
      let left = ms;
      const tick = () => {
        if (myRun !== state.run) return reject(new Aborted());
        if (state.skipWait) { state.skipWait = false; return resolve(); }
        if (!state.paused) left -= 100;
        if (left <= 0) return resolve();
        setTimeout(tick, 100);
      };
      setTimeout(tick, 100);
    });
  }

  function stopVoice() {
    voice.onended = voice.onerror = null;
    try { voice.pause(); } catch (e) { /* 沒有在播 */ }
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function stopAll() {
    state.run++;
    stopVoice();
    bgm.pause();
    state.interrupt = null;
    state.chooser = null;
  }

  /* ── 背景音樂 ─────────────────────────────────────────────────── */
  function startBgm() {
    const b = state.ep.bgm;
    if (!b || !b.file || !state.bgmOn) return;
    if (!bgm.src || bgm.dataset.file !== b.file) { bgm.src = b.file; bgm.dataset.file = b.file; }
    bgm.volume = Math.max(0, Math.min(1, Number(b.volume) || 0.12));
    bgm.play().catch(() => { /* 還沒有音樂檔也沒關係 */ });
  }

  /* ── 畫面：圖、字幕、提示 ─────────────────────────────────────── */
  const IMG_EXT = [".jpg", ".png", ".webp"];
  const imgFound = {};
  function findImage(base) {
    if (imgFound[base] !== undefined) return Promise.resolve(imgFound[base]);
    return IMG_EXT.reduce((p, ext) => p.then((hit) => hit || new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(base + ext);
      im.onerror = () => resolve(null);
      im.src = base + ext;
    })), Promise.resolve(null)).then((hit) => (imgFound[base] = hit));
  }
  function preload(scene) {
    if (!scene) return;
    if (scene.image) findImage(scene.imageFile);
    scene.options.forEach((o) => o.image && findImage(o.imageFile));
  }

  function setPicture(base, title, scene, lines) {
    const pic = $("#picture");
    const token = (pic.dataset.token = String(Math.random()));
    const showPlaceholder = () => {
      if (pic.dataset.token !== token) return;
      const who = [];
      (lines || []).forEach((l) => { if (l.char && who.indexOf(l.char) < 0) who.push(l.char); });
      pic.innerHTML = `<div class="placeholder"><div class="ph-cast">${who.map((c) => `<span>${c.emoji}</span>`).join("")}</div>
        <div class="ph-title">${esc(title || "")}</div>
        ${DEV && scene && (scene.image || "") ? `<div class="ph-prompt">🖼 還沒有圖：${esc(base || "")}.jpg<br>${esc(scene.image)}</div>` : ""}</div>`;
    };
    if (!base) return showPlaceholder();
    findImage(base).then((src) => {
      if (pic.dataset.token !== token) return;
      if (!src) return showPlaceholder();
      pic.innerHTML = "";
      const im = new Image();
      im.src = src; im.alt = title || "";
      pic.appendChild(im);
    });
  }

  function caption(text) {
    const c = $("#caption");
    c.textContent = text || "";
    c.hidden = !text;
  }

  function subtitle(line) {
    const box = $("#subtitle");
    if (!line) { box.classList.add("empty"); $("#sub-who").textContent = ""; $("#sub-text").textContent = ""; $("#sub-hint").textContent = ""; return; }
    box.classList.remove("empty");
    const c = line.char;
    const who = $("#sub-who");
    who.textContent = c ? c.emoji + " " + c.name : "";
    who.style.setProperty("--c", c ? c.color : "var(--main)");
    $("#sub-text").textContent = line.text || line.say;
    $("#sub-hint").textContent = line.hint || "";
    state.lineInfo = line.id;
  }

  function overlay(kind) {
    const o = $("#overlay");
    o.className = "overlay " + kind;
    o.hidden = false;
    o.innerHTML = "";
    $("#screen").classList.add("has-overlay");
    return o;
  }
  function closeOverlay() {
    $("#overlay").hidden = true;
    $("#screen").classList.remove("has-overlay");
    state.chooser = null;
  }

  function toast(text, kind) {
    const t = el("div", "toast " + (kind || ""), esc(text));
    $("#screen").appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function progress(i) {
    const n = state.ep.scenes.length;
    $("#progress i").style.width = Math.round((i / n) * 100) + "%";
  }

  function estimate(ep) {
    let sec = 0;
    ep.scenes.forEach((s) => {
      s.lines.forEach((l) => (sec += Checker.estimateSeconds(l.say)));
      if (s.options.length) sec += s.options[0].lines.reduce((a, l) => a + Checker.estimateSeconds(l.say), 0) + 6;
      if (s.type === "recap") sec += 3 * 3;
      if (s.type === "words") sec += 8;
    });
    return sec;
  }

  /* ── 學習成果：用 Netlify Forms 收 ───────────────────────────────
     index.html 裡有一個真的 <form data-netlify="true">，Netlify 部署時
     會掃描到它，之後每一筆送出都會出現在 Netlify 後台的 Forms 頁面。 */
  function showResult() {
    stopVoice();
    subtitle(null);
    caption("");
    setPicture(null, T.done, null, []);
    const ep = state.ep;
    const secs = Math.round((Date.now() - state.startedAt) / 1000);
    const o = overlay("result");
    const q = state.quiz;
    o.innerHTML = `<p class="ask">${esc(T.done)} 🎉</p>
      <ul class="facts">
        ${q.total ? `<li>${esc(fmt(T.score, { n: q.right, t: q.total }))}</li>` : ""}
        <li>${esc(fmt(T.time, { m: Math.floor(secs / 60), s: secs % 60 }))}</li>
      </ul>
      ${state.picks.length ? `<p class="picks-title">${esc(T.picks)}</p><ol class="picks">${state.picks.map((p) => `<li>${esc(p.option.label)}${p.scene.type === "quiz" ? (p.option.correct ? " ✓" : " ✗") : ""}</li>`).join("")}</ol>` : ""}`;

    const form = $("#result-form");
    form.hidden = false;
    o.appendChild(form);
    $("#lbl-nickname").textContent = T.nickname;
    $("#hint-nickname").textContent = T.nickHint;
    $("#lbl-class").textContent = T.klass;
    $("#lbl-stars").textContent = T.stars;
    $("#lbl-comment").textContent = T.comment;
    $("#btn-send").textContent = T.send;
    $("#btn-send").disabled = false;
    $("#send-status").textContent = "";
    if (params.get("class")) form.elements.class_code.value = params.get("class");
    const fill = {
      episode: ep.id, episode_title: ep.title, score: q.total ? q.right + "/" + q.total : "",
      quiz_detail: q.detail.join(" "),
      choices: state.picks.map((p) => p.scene.id + "=" + p.option.key.toUpperCase() + "「" + p.option.label + "」").join(" | "),
      duration_sec: secs, finished_at: new Date().toISOString(), page: location.href.split("?")[0],
    };
    Object.keys(fill).forEach((k) => { if (form.elements[k]) form.elements[k].value = fill[k]; });
    form.onsubmit = (e) => { e.preventDefault(); sendResult(form); };

    const row = el("div", "after");
    const again = el("button", "big-btn ghost", T.again);
    again.onclick = () => { $("#form-home").appendChild(form); form.hidden = true; start(0); };
    const home = el("button", "big-btn ghost", T.home);
    home.onclick = () => { location.href = location.pathname + (DEV ? "?dev=1" : ""); };
    row.append(again, home);
    o.appendChild(row);
  }

  function sendResult(form) {
    const status = $("#send-status");
    const btn = $("#btn-send");
    const body = new URLSearchParams(new FormData(form)).toString();
    if (location.protocol === "file:") {
      status.textContent = T.local;
      status.className = "send-status local";
      console.info("[學習成果] 本機測試模式，會送出的內容：", Object.fromEntries(new URLSearchParams(body)));
      return;
    }
    btn.disabled = true;
    btn.textContent = T.sending;
    // Netlify 規定：要用網址編碼（不是 JSON），而且要帶 form-name
    fetch(location.pathname, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        status.textContent = T.sent;
        status.className = "send-status ok";
        btn.textContent = T.sent;
      })
      .catch((err) => {
        btn.disabled = false;
        btn.textContent = T.send;
        status.textContent = fmt(T.failed, { why: err.message });
        status.className = "send-status bad";
      });
  }

  /* ── 按鈕與鍵盤 ─────────────────────────────────────────────────
     空白鍵：暫停／繼續　→：下一句　R：重聽　1–4：選選項　Enter：繼續 */
  function bindKeys() {
    $("#btn-pause").onclick = togglePause;
    $("#btn-next").onclick = () => { if (state.interrupt) state.interrupt("skip"); else state.skipWait = true; };
    $("#btn-replay").onclick = () => state.interrupt && state.interrupt("replay");
    $("#btn-music").onclick = () => {
      state.bgmOn = !state.bgmOn;
      $("#btn-music").classList.toggle("off", !state.bgmOn);
      if (state.bgmOn) startBgm(); else bgm.pause();
    };
    $("#btn-exit").onclick = () => { stopAll(); location.href = location.pathname + (DEV ? "?dev=1" : ""); };
    document.addEventListener("keydown", (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if ($("#stage").hidden) return;
      if (state.chooser && /^[1-9]$/.test(e.key)) { state.chooser(Number(e.key) - 1); e.preventDefault(); }
      else if (state.chooser && e.key === "Enter") { state.chooser(-1); }
      else if (e.key === " ") { togglePause(); e.preventDefault(); }
      else if (e.key === "ArrowRight") $("#btn-next").click();
      else if (e.key === "r" || e.key === "R") $("#btn-replay").click();
    });
  }

  function togglePause() {
    state.paused = !state.paused;
    if (state.paused) { voice.pause(); bgm.pause(); if (window.speechSynthesis) speechSynthesis.pause(); }
    else { if (voice.src && !voice.ended && voice.currentTime > 0) voice.play().catch(() => {}); if (state.bgmOn) startBgm(); if (window.speechSynthesis) speechSynthesis.resume(); }
    $("#btn-pause").classList.toggle("on", state.paused);
    setLabels();
  }

  /* ── 開發者模式（網址加 ?dev=1）：跳場次、看每一句用的是哪個檔案 ── */
  function buildDevPanel(ep) {
    const p = $("#dev");
    if (!DEV) { p.hidden = true; return; }
    p.hidden = false;
    const warn = Checker.check(ep).filter((x) => x.level !== "tip");
    p.innerHTML = `<b>開發者模式</b><div id="dev-line">—</div><ol>${ep.scenes.map((s, i) => `<li><button data-i="${i}" data-id="${esc(s.id)}">${esc(s.id)} <small>${esc(s.type)}</small> ${esc(s.title || s.ask || "")}</button></li>`).join("")}</ol>
      ${warn.length ? `<details><summary>題庫提醒 ${warn.length} 則</summary><ul>${warn.map((w) => `<li>${esc(w.where)}：${esc(w.message)}</li>`).join("")}</ul></details>` : ""}`;
    p.querySelectorAll("button[data-i]").forEach((b) => (b.onclick = () => { closeOverlay(); start(Number(b.dataset.i)); }));
  }
  function markDev(id) {
    if (!DEV) return;
    document.querySelectorAll("#dev button[data-id]").forEach((b) => b.classList.toggle("now", b.dataset.id === id));
  }
  function devAudio(line, src) {
    if (!DEV) return;
    const d = $("#dev-line");
    if (!d) return;
    d.textContent = line.id + "　" + (src === "computer" ? "🔈 還沒有聲音檔，用電腦語音代替（" + line.audio + ".mp3）" : "🎧 " + src);
  }

  // 給自動測試用的小窗口
  window.__player = { state, start, showResult };
})();
