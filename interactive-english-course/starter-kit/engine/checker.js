/* ==========================================================================
   checker.js —— 題庫檢查員

   工程師寫程式會有「自動檢查」：存檔後由程式幫你找出錯字和漏洞，
   不必等到上線才被使用者發現。這支檔案就是我們的自動檢查員，分兩種：

   1. Checker.syntax(文字)  語法檢查：逗號、引號、括號、全形符號
   2. Checker.check(一集)   內容檢查：角色、選項、教學規則

   每個問題都有等級：
     error  一定要修，不修播放器不會播
     warn   建議修，通常是教學設計上的地雷
     tip    小提醒，可以之後再處理
   ========================================================================== */
(function (root) {
  "use strict";

  /* ── 1. 語法檢查 ────────────────────────────────────────────────── */
  const FULLWIDTH = { "，": ",", "：": ":", "“": "\"", "”": "\"", "‘": "'", "’": "'", "（": "(", "）": ")", "［": "[", "］": "]", "｛": "{", "｝": "}", "；": ";" };
  const PAIRS = { "{": "}", "[": "]", "(": ")" };

  function syntax(text) {
    const out = [];
    const stack = [];            // 還沒關上的括號 [{ ch, line }]
    let line = 1, col = 0;
    let str = null, strLine = 0; // 目前在哪一種引號裡
    let lastSig = "", lastSigLine = 0, lastWasValueEnd = false;
    const push = (ln, msg) => { if (!out.some((p) => p.line === ln && p.message === msg)) out.push({ line: ln, message: msg }); };

    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (c === "\n") { line++; col = 0; if (str && str !== "`") { push(strLine, `第 ${strLine} 行的字串沒有關上：引號 ${str} 要成對，開頭一個、結尾一個。`); str = null; } continue; }
      col++;
      if (str) {
        if (c === "\\") { i++; continue; }
        if (c === str) { str = null; lastSig = c; lastSigLine = line; lastWasValueEnd = true; }
        continue;
      }
      // 註解
      if (c === "/" && n === "/") { while (i < text.length && text[i + 1] !== "\n") i++; continue; }
      if (c === "/" && n === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) { if (text[i] === "\n") line++; i++; } i++; continue; }
      if (c === " " || c === "\t" || c === "\r") continue;

      if (FULLWIDTH[c]) { push(line, `第 ${line} 行在引號外面用了中文全形的「${c}」，請改成半形的「${FULLWIDTH[c]}」（切換成英文輸入法再打）。`); continue; }

      const inContainer = stack.length && (stack[stack.length - 1].ch === "{" || stack[stack.length - 1].ch === "[");
      const startsValue = c === "\"" || c === "'" || c === "`" || c === "{" || c === "[" || /[A-Za-z0-9_\-]/.test(c);
      // 新的一行開始了一個新的值，可是上一行的值後面沒有逗號
      if (inContainer && startsValue && lastWasValueEnd && line > lastSigLine) {
        push(lastSigLine, `第 ${lastSigLine} 行的結尾好像少了一個逗號「,」（下一行又開始了新的一項）。`);
      }

      if (c === "\"" || c === "'" || c === "`") { str = c; strLine = line; lastWasValueEnd = false; continue; }
      if (PAIRS[c]) { stack.push({ ch: c, line }); lastSig = c; lastSigLine = line; lastWasValueEnd = false; continue; }
      if (c === "}" || c === "]" || c === ")") {
        const top = stack.pop();
        if (!top) push(line, `第 ${line} 行多了一個「${c}」，前面沒有對應的開頭。`);
        else if (PAIRS[top.ch] !== c) push(line, `第 ${line} 行的「${c}」對不上第 ${top.line} 行的「${top.ch}」，應該要用「${PAIRS[top.ch]}」來關。`);
        lastSig = c; lastSigLine = line; lastWasValueEnd = true; continue;
      }
      if (/[A-Za-z0-9_\-.]/.test(c)) {
        // 讀完整個單字（例如 true、0.12、captain）
        let j = i; while (j + 1 < text.length && /[A-Za-z0-9_\-.$]/.test(text[j + 1])) j++;
        const word = text.slice(i, j + 1); col += j - i; i = j;
        // 後面接冒號的是「欄位名稱」，不是值
        let k = i + 1; while (k < text.length && (text[k] === " " || text[k] === "\t")) k++;
        lastSig = word; lastSigLine = line; lastWasValueEnd = text[k] !== ":" && text[k] !== "(";
        continue;
      }
      lastSig = c; lastSigLine = line; lastWasValueEnd = false;
    }
    if (str && str !== "`") push(strLine, `第 ${strLine} 行的字串沒有關上：引號 ${str} 要成對。`);
    stack.forEach((s) => push(s.line, `第 ${s.line} 行的「${s.ch}」一直沒有關上，檔案最後少了「${PAIRS[s.ch]}」。`));

    // 最後請 JavaScript 本人確認一次
    if (!out.length) {
      try { new Function("LESSON", text); } catch (e) { out.push({ line: 0, message: "JavaScript 讀不懂這個檔案：" + e.message + "。常見原因：欄位名稱後面少了冒號「:」，或兩個值之間少了逗號。" }); }
    }
    return out.sort((a, b) => a.line - b.line);
  }

  /* ── 2. 內容檢查 ────────────────────────────────────────────────── */
  const TYPES = ["story", "choice", "quiz", "recap", "words"];
  const hasCJK = (s) => /[㐀-鿿]/.test(s);
  const plain = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9㐀-鿿 ]+/g, " ").replace(/\s+/g, " ").trim();
  // 一句有多長：英文算「字數」，中文算「字」（中文 30 個字大約等於英文 18 個字）
  const cjkCount = (s) => (String(s).match(/[\u3400-\u9fff]/g) || []).length;
  const latinWords = (s) => (String(s).replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9']+/g) || []).length;
  const wordCount = (s) => cjkCount(s) * 0.6 + latinWords(s);

  function check(ep) {
    const out = [];
    const add = (level, where, message) => out.push({ level, where, message });
    const voices = root.GEMINI_VOICES ? root.GEMINI_VOICES.map((v) => v.name) : null;

    if (!ep.id) add("error", "id", "這一集還沒有代號 id。請取一個英文小寫加數字的代號，例如 kk02。");
    else if (!/^[a-z0-9][a-z0-9\-]*$/.test(ep.id)) add("error", "id", `代號「${ep.id}」只能用英文小寫、數字和 -（不能有空格、大寫或中文），因為它也是素材資料夾的名字。`);
    if (!ep.castKeys.length) add("error", "cast", "還沒有任何角色。請在 cast 裡至少放一個角色。");
    if (!ep.scenes.length) add("error", "scenes", "還沒有任何一場戲。請在 scenes 裡至少放一場。");

    // 角色
    const usedVoices = {};
    ep.castKeys.forEach((k) => {
      const c = ep.cast[k];
      if (!/^[a-z][a-z0-9_]*$/.test(k)) add("warn", "cast." + k, `角色代號「${k}」建議只用英文小寫，打台詞時比較不會打錯。`);
      if (!c.voice) add("warn", "cast." + k, `${c.name} 還沒有指定聲音 voice（例如 "Puck"、"Kore"）。沒有的話只能用電腦內建語音試聽。`);
      else if (voices && voices.indexOf(c.voice) < 0) add("warn", "cast." + k, `${c.name} 的聲音「${c.voice}」不在 Gemini 的聲音清單裡，請到工作台的「角色與聲音」挑一個。`);
      if (c.voice) { if (usedVoices[c.voice]) add("warn", "cast." + k, `${c.name} 和 ${usedVoices[c.voice]} 用了同一個聲音「${c.voice}」，學習者會分不出是誰在講話。`); usedVoices[c.voice] = c.name; }
      const prompts = ep.scenes.map((s) => s.image + " " + s.options.map((o) => o.image).join(" ")).join(" ").toLowerCase();
      if (!c.look && prompts.indexOf(c.name.toLowerCase()) >= 0) add("tip", "cast." + k, `${c.name} 會出現在圖裡，但還沒有外型描述 look。產生圖片時每一張都會帶上這段描述，角色的長相才會一致。`);
    });

    // 場次
    const ids = {};
    let choiceCount = 0;
    ep.scenes.forEach((s) => {
      const at = "第 " + (ep.scenes.indexOf(s) + 1) + " 場（" + s.id + "）";
      if (ids[s.id]) add("error", at, `場次代號「${s.id}」重複了，每一場的 id 都要不一樣。`);
      ids[s.id] = true;
      if (TYPES.indexOf(s.type) < 0) add("error", at, `type 寫成「${s.type}」，只能是 story、choice、quiz、recap、words 其中一個。`);
      checkLines(s.lines, at);

      if (s.type === "story" && !s.image) add("tip", at, "這一場沒有圖的描述 image，播放時會用色塊代替。");
      if (s.type === "story" && !s.lines.length) add("tip", at, "這一場沒有台詞，會停留 2.5 秒就換下一場。");

      if (s.type === "choice" || s.type === "quiz") {
        choiceCount++;
        if (!s.ask) add("warn", at, "選擇題沒有寫題目 ask，學習者會不知道要選什麼。");
        if (s.options.length < 2) add("error", at, "選擇題至少要有 2 個選項 options。");
        if (s.options.length > 4) add("warn", at, `有 ${s.options.length} 個選項，太多了，學習者讀不完。建議 3 個。`);
        s.options.forEach((o) => {
          const oat = at + " 選項 " + o.key.toUpperCase();
          if (!o.say) add("error", oat, "選項沒有 say（選了之後要說的那一句）。");
          checkLines(o.lines, oat);
          if (!o.image && s.type !== "quiz") add("tip", oat, "這個選項沒有自己的圖 image，播放時會沿用色塊。");
        });
        const correct = s.options.filter((o) => o.correct);
        if (s.type === "choice" && correct.length) add("warn", at, "劇情選擇（choice）的選項都算對，不需要標 correct。如果這一題要考，請把 type 改成 quiz。");
        if (s.type === "quiz") {
          if (correct.length !== 1) add("error", at, `測驗題要剛好標一個 correct: true，現在有 ${correct.length} 個。`);
          if (correct.length === 1 && correct[0].say) {
            const ans = plain(correct[0].say.say);
            const askText = plain(s.ask + " " + s.lines.map((l) => l.say).join(" "));
            if (ans && askText.indexOf(ans) >= 0) add("warn", at, `題目或前面的台詞裡已經出現正確答案「${correct[0].say.say}」，等於把答案寫在題目上了。`);
            s.options.forEach((o) => {
              if (o.correct) return;
              const said = plain(o.lines.slice(1).map((l) => l.say).join(" "));
              if (ans && said.indexOf(ans) < 0) add("warn", at + " 選項 " + o.key.toUpperCase(), `選錯的這一條分支裡，沒有人說出正確答案「${correct[0].say.say}」。答錯的學習者也要聽到正解。`);
            });
          }
        }
      }
      if (s.type === "words" && !s.words.length) add("warn", at, "單字卡 words 是空的。");
      if (s.type === "words" && s.voice && !ep.cast[s.voice]) add("error", at, `單字卡指定由「${s.voice}」來念，但 cast 裡沒有這個角色。`);
    });
    if (ep.scenes.some((s) => s.type === "recap") && !choiceCount) add("warn", "recap", "有「回顧」recap，但整集沒有任何選擇題，回顧時沒有句子可以重播。");
    if (!ep.scenes.some((s) => s.type === "words")) add("tip", "words", "建議最後加一場單字卡（type: \"words\"），幫學習者把今天的重點帶走。");
    if (!ep.bgm) add("tip", "bgm", "還沒有背景音樂 bgm。做好 Suno 音樂後再加上就好。");

    function checkLines(lines, at) {
      lines.forEach((l) => {
        const where = at + "「" + (l.say || "").slice(0, 24) + "」";
        if (l.noWho) add("error", where, "這句台詞沒有寫是誰說的。格式是 \"角色代號: 台詞\"，例如 \"captain: Hello!\"。");
        else if (l.unknownWho) add("error", where, `角色「${l.who}」不在 cast 裡。是不是打錯字了？目前的角色有：${ep.castKeys.join("、")}。`);
        if (!l.say) add("error", where, "這句台詞是空的。");
        const n = wordCount(l.say || "");
        if (n > 18) add("warn", where, "這句太長了。一句只放一個念頭，長的話拆成兩句（英文 6–18 個字，中文 30 個字以內）。");
        if (l.char && l.char.lang === "en" && hasCJK(l.say)) add("warn", where, `這句有中文，但 ${l.char.name} 設定成講英語（lang: "en"）。要講中文的角色請設成 lang: "zh-TW"。`);
      });
    }
    return out;
  }

  /* 估計長度（秒）：英文約每秒 2.6 個字，中文約每秒 4 個字，每句之間停 0.6 秒 */
  function estimateSeconds(text) {
    return 0.6 + cjkCount(text) / 4 + latinWords(text) / 2.6;
  }

  const Checker = { syntax, check, estimateSeconds, hasCJK };
  if (typeof module !== "undefined" && module.exports) module.exports = Checker;
  root.Checker = Checker;
})(typeof window !== "undefined" ? window : globalThis);
