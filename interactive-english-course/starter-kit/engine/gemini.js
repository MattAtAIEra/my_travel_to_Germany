/* ==========================================================================
   gemini.js —— 跟 Google Gemini 要「聲音」和「圖」

   ‧ 語音：gemini-3.8-flash-tts（英語、台灣口音的國語都可以）
   ‧ 圖片：gemini-3.1-flash-image

   都走 Gemini 的 Interactions API（POST /v1beta/interactions）。
   這個 API 還在 beta，欄位偶爾會調整，所以每種請求都準備了幾個「備案寫法」：
   第一種被拒絕（HTTP 400）就自動換下一種，成功的那一種會記起來，下次直接用。

   同一支檔案在瀏覽器（studio.html）和 Node.js（tools/generate.mjs）都能用。
   ========================================================================== */
(function (root) {
  "use strict";

  const BASE = "https://generativelanguage.googleapis.com/v1beta";
  const MODELS = { tts: "gemini-3.8-flash-tts", image: "gemini-3.1-flash-image" };

  /* Gemini 的 30 個預設聲音。括號裡是官方給的一個字描述；高低、男女聲請用工作台試聽 */
  const VOICES = [
    ["Zephyr", "明亮"], ["Puck", "輕快"], ["Charon", "知性"], ["Kore", "堅定"], ["Fenrir", "興奮"],
    ["Leda", "年輕"], ["Orus", "堅定"], ["Aoede", "輕鬆"], ["Callirrhoe", "隨和"], ["Autonoe", "明亮"],
    ["Enceladus", "氣音"], ["Iapetus", "清晰"], ["Umbriel", "隨和"], ["Algieba", "圓潤"], ["Despina", "柔順"],
    ["Erinome", "清晰"], ["Algenib", "沙啞"], ["Rasalgethi", "知性"], ["Laomedeia", "輕快"], ["Achernar", "輕柔"],
    ["Alnilam", "沉穩"], ["Schedar", "平穩"], ["Gacrux", "成熟"], ["Pulcherrima", "直率"], ["Achird", "友善"],
    ["Zubenelgenubi", "隨性"], ["Vindemiatrix", "溫和"], ["Sadachbia", "活潑"], ["Sadaltager", "博學"], ["Sulafat", "溫暖"],
  ].map(([name, tone]) => ({ name, tone }));

  class GeminiError extends Error {
    constructor(status, message, detail) { super(message); this.status = status; this.detail = detail; }
  }

  /* ── 小工具：base64、WAV ─────────────────────────────────────── */
  function b64ToBytes(b64) {
    const bin = atob(b64.replace(/[\r\n\s]/g, ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToB64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  /* 原始的 PCM 聲音資料前面加上 44 個位元組的 WAV 檔頭，瀏覽器才播得出來 */
  function pcmToWav(pcm, sampleRate, channels) {
    sampleRate = sampleRate || 24000; channels = channels || 1;
    const h = new DataView(new ArrayBuffer(44));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
    str(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); str(8, "WAVE");
    str(12, "fmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, channels, true);
    h.setUint32(24, sampleRate, true); h.setUint32(28, sampleRate * channels * 2, true); h.setUint16(32, channels * 2, true); h.setUint16(34, 16, true);
    str(36, "data"); h.setUint32(40, pcm.length, true);
    const out = new Uint8Array(44 + pcm.length);
    out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44);
    return out;
  }

  /* 在回應裡找出聲音或圖片。
     Interactions API 放在 steps[] 裡 type 為 model_output 的 content[]（{ type: "audio", data, mime_type }），
     舊的 generateContent 放在 candidates[].content.parts[].inlineData。兩種都找。
     回應裡也可能附上我們送出去的 input（例如角色參考圖），那一部分要跳過，不然會把參考圖當成新圖。 */
  function findMedia(json, kind) {
    const walk = (x) => {
      let hit = null;
      (function go(y) {
        if (!y || typeof y !== "object") return;
        if (Array.isArray(y)) return y.forEach(go);
        if (y.type === "user_input") return;
        const mime = y.mime_type || y.mimeType || "";
        if ((y.type === kind || mime.indexOf(kind + "/") === 0) && (typeof y.data === "string" || typeof y.uri === "string")) {
          hit = { data: y.data, uri: y.uri, mime, sampleRate: y.sample_rate || y.sampleRate, channels: y.channels };
        }
        if (y.inlineData && (y.inlineData.mimeType || "").indexOf(kind + "/") === 0) hit = { data: y.inlineData.data, mime: y.inlineData.mimeType };
        Object.keys(y).forEach((k) => { if (k !== "inlineData" && k !== "input") go(y[k]); });
      })(x);
      return hit;
    };
    if (!json || typeof json !== "object") return null;
    const pools = [];
    if (Array.isArray(json.steps)) pools.push(json.steps.filter((st) => st && st.type === "model_output"));
    if (json.outputs) pools.push(json.outputs);
    if (json.candidates) pools.push(json.candidates);
    for (const pool of pools) { const hit = walk(pool); if (hit) return hit; }
    return walk(json);
  }

  function extOf(mime, kind) {
    const m = (mime || "").toLowerCase();
    if (kind === "image") return m.indexOf("png") >= 0 ? "png" : m.indexOf("webp") >= 0 ? "webp" : "jpg";
    if (m.indexOf("mp3") >= 0 || m.indexOf("mpeg") >= 0) return "mp3";
    if (m.indexOf("wav") >= 0) return "wav";
    if (m.indexOf("ogg") >= 0 || m.indexOf("opus") >= 0) return "ogg";
    return "pcm";
  }

  /* ── 送出請求（含重試）──────────────────────────────────────── */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function post(url, key, body, opts) {
    opts = opts || {};
    const fetcher = opts.fetch || root.fetch.bind(root);
    for (let attempt = 0; ; attempt++) {
      let res, text;
      try {
        // 金鑰是空的時候不帶標頭：例如雲端環境用 Network secret，由系統在送出時自動加上
        const headers = { "Content-Type": "application/json" };
        if (key) headers["x-goog-api-key"] = key;
        res = await fetcher(url, { method: "POST", headers, body: JSON.stringify(body) });
        text = await res.text();
      } catch (e) {
        if (attempt < 2) { await sleep(2000 * (attempt + 1)); continue; }
        throw new GeminiError(0, "連不上 Gemini（" + e.message + "）。請檢查網路。");
      }
      let json = null;
      try { json = JSON.parse(text); } catch (e) { /* 不是 JSON */ }
      if (res.ok) return json;
      const err = (json && (json.error || (Array.isArray(json) && json[0] && json[0].error))) || {};
      const msg = err.message || text.slice(0, 300);
      // 太頻繁（429）或伺服器忙（5xx）：等一下再試
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        if (opts.onWait) opts.onWait(res.status, attempt);
        await sleep((res.status === 429 ? 8000 : 3000) * Math.pow(2, attempt));
        continue;
      }
      throw new GeminiError(res.status, explain(res.status, msg), msg);
    }
  }

  function explain(status, msg) {
    if (status === 400 && /API key/i.test(msg)) return "API 金鑰不對。請到 Google AI Studio 重新複製一次（整串，不要多空格）。";
    if ((status === 401 || status === 403) && /unregistered callers|API key|API_KEY/i.test(msg)) return "Gemini 沒有收到金鑰（" + status + "）。請確認金鑰有設定好：工作台要貼上金鑰；指令工具要設定 GEMINI_API_KEY，或在雲端環境的 Network secret 加上 x-goog-api-key 標頭。原始訊息：" + msg;
    if (status === 401 || status === 403) return "這把金鑰沒有權限使用這個模型（" + status + "）。可能是金鑰被停用、專案沒開帳單，或這個模型在你的地區還不能用。原始訊息：" + msg;
    if (status === 404) return "找不到這個模型（404）。請確認模型名稱有沒有打錯。原始訊息：" + msg;
    if (status === 429) return "用量超過上限（429）。休息一分鐘再試，或檢查專案的額度。";
    return "Gemini 回應錯誤 " + status + "：" + msg;
  }

  /* 依序試每一種寫法；遇到 400/404（格式或端點不被接受）就換下一種 */
  const remembered = {};
  async function tryVariants(kind, variants, key, opts) {
    const order = remembered[kind] ? [variants.find((v) => v.name === remembered[kind])].concat(variants.filter((v) => v.name !== remembered[kind])) : variants;
    let lastErr = null;
    for (const v of order) {
      try {
        const json = await post(v.url, key, v.body, opts);
        const media = findMedia(json, kind === "tts" ? "audio" : "image");
        if (!media) { lastErr = new GeminiError(200, "Gemini 有回應，但裡面沒有" + (kind === "tts" ? "聲音" : "圖片") + "。可能是內容被安全規則擋下，請把描述改得溫和一點再試。", JSON.stringify(json).slice(0, 400)); continue; }
        remembered[kind] = v.name;
        return { media, variant: v.name };
      } catch (e) {
        lastErr = e;
        if (!(e instanceof GeminiError) || (e.status !== 400 && e.status !== 404) || /API 金鑰/.test(e.message)) throw e;
      }
    }
    throw lastErr;
  }

  async function mediaBytes(media, key, kind, opts) {
    if (media.data) return b64ToBytes(media.data);
    const fetcher = (opts && opts.fetch) || root.fetch.bind(root);
    const res = await fetcher(media.uri, { headers: key ? { "x-goog-api-key": key } : {} });
    if (!res.ok) throw new GeminiError(res.status, "下載" + (kind === "tts" ? "聲音" : "圖片") + "失敗（" + res.status + "）");
    return new Uint8Array(await res.arrayBuffer());
  }

  /* ── 語音 ────────────────────────────────────────────────────────
     text    要念的句子
     speaker 角色名字（例如 "Captain A"）
     voice   Gemini 聲音名稱（例如 "Puck"）
     style   語氣說明（例如 "cheerful and friendly"）
     回傳 { bytes, mime, ext }，ext 是 "mp3" 或 "wav" */
  async function tts(p, opts) {
    const model = p.model || MODELS.tts;
    const speaker = (p.speaker || "Speaker").replace(/[^\w\s\-]/g, "").trim() || "Speaker";
    const content = [{ type: "text", text: p.text, annotations: [{ type: "speech_metadata", speaker, style: p.style || "natural and clear" }] }];
    const input = [{ type: "user_input", content }];
    const one = [{ speaker, voice: p.voice || "Kore" }];
    const mp3 = { type: "audio", mime_type: "audio/mp3" };
    const variants = [
      // 1. 和官方範例同一種寫法（conversational 模式），要 mp3
      { name: "conversational-mp3", url: BASE + "/interactions", body: { model, input, response_format: mp3, generation_config: { speech_config: { mode: "conversational", speakers: one } } } },
      // 2. 同上，但讓 Gemini 用它預設的聲音格式
      { name: "conversational", url: BASE + "/interactions", body: { model, input, response_format: { type: "audio" }, generation_config: { speech_config: { mode: "conversational", speakers: one } } } },
      // 3. 單一說話者，不寫 mode
      { name: "speakers-mp3", url: BASE + "/interactions", body: { model, input, response_format: mp3, generation_config: { speech_config: { speakers: one } } } },
      // 4. 舊的 generateContent 寫法（風格寫進文字裡）
      { name: "generateContent", url: BASE + "/models/" + model + ":generateContent", body: {
        contents: [{ parts: [{ text: (p.style ? p.style + ": " : "") + p.text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: p.voice || "Kore" } } } },
      } },
    ];
    const { media, variant } = await tryVariants("tts", variants, p.key, opts);
    let bytes = await mediaBytes(media, p.key, "tts", opts);
    let ext = extOf(media.mime, "audio");
    let mime = media.mime;
    if (ext === "pcm") {
      const rate = media.sampleRate || Number(((media.mime || "").match(/rate=(\d+)/) || [])[1]) || 24000;
      bytes = pcmToWav(bytes, rate, media.channels || 1);
      ext = "wav"; mime = "audio/wav";
    }
    return { bytes, mime, ext, variant };
  }

  /* ── 圖片 ────────────────────────────────────────────────────────
     prompt  完整的畫面描述
     refs    參考圖 [{ bytes, mime }]：角色設定圖，讓每一張圖裡的角色長得一樣
     ratio   畫面比例，例如 "16:9" */
  async function image(p, opts) {
    const model = p.model || MODELS.image;
    const refs = p.refs || [];
    const content = [{ type: "text", text: p.prompt }].concat(refs.map((r) => ({ type: "image", data: bytesToB64(r.bytes), mime_type: r.mime || "image/jpeg" })));
    const input = [{ type: "user_input", content }];
    const variants = [
      { name: "interactions-image", url: BASE + "/interactions", body: { model, input, response_format: { type: "image", aspect_ratio: p.ratio || "16:9", image_size: p.size || "1K" } } },
      { name: "interactions-plain", url: BASE + "/interactions", body: { model, input } },
      { name: "generateContent", url: BASE + "/models/" + model + ":generateContent", body: {
        contents: [{ parts: [{ text: p.prompt }].concat(refs.map((r) => ({ inlineData: { mimeType: r.mime || "image/jpeg", data: bytesToB64(r.bytes) } }))) }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: p.ratio || "16:9" } },
      } },
    ];
    const { media, variant } = await tryVariants("image", variants, p.key, opts);
    const bytes = await mediaBytes(media, p.key, "image", opts);
    return { bytes, mime: media.mime || "image/jpeg", ext: extOf(media.mime, "image"), variant };
  }

  /* ── 把題庫裡的資料組成「語氣說明」與「畫面描述」──────────────── */
  function speechStyle(ep, line) {
    const c = line.char || {};
    const parts = [];
    if (c.style) parts.push(c.style);
    if (line.style) parts.push(line.style);
    if (line.lang === "zh-TW") parts.push("請用台灣口音的國語自然地說（Taiwanese Mandarin accent, Traditional Chinese）");
    if (ep.speech && ep.speech.note) parts.push(ep.speech.note);
    return parts.join(". ");
  }

  function imagePrompt(ep, item, hasRefs) {
    const looks = item.who.map((k) => ep.cast[k]).filter((c) => c && c.look).map((c) => "- " + c.name + ": " + c.look);
    return [
      ep.art.style,
      looks.length ? "Characters in this picture (keep them exactly like this):\n" + looks.join("\n") : "",
      hasRefs ? "The attached reference images show what the characters look like. Keep their faces, hair, clothes and colours the same." : "",
      "Scene: " + item.prompt,
      "Aspect ratio " + (ep.art.ratio || "16:9") + ".",
    ].filter(Boolean).join("\n\n");
  }

  function characterPrompt(ep, c) {
    return [
      ep.art.style,
      "Character design reference sheet of " + c.name + ": " + c.look,
      "Full body, front view, standing in a friendly neutral pose, plain light background. One single character only. No text.",
    ].join("\n\n");
  }

  const Gemini = { MODELS, VOICES, tts, image, speechStyle, imagePrompt, characterPrompt, pcmToWav, findMedia, b64ToBytes, bytesToB64, GeminiError, remembered };
  root.Gemini = Gemini;
  root.GEMINI_VOICES = VOICES;
  if (typeof module !== "undefined" && module.exports) module.exports = Gemini;
})(typeof window !== "undefined" ? window : globalThis);
