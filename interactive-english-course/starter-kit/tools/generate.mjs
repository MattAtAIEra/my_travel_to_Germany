#!/usr/bin/env node
/* ==========================================================================
   tools/generate.mjs —— 用一行指令產生整集的語音與圖片（給老師或進階同學）

   一般同學用 studio.html 就好；這支是給「想一次做完很多集」的人。
   需要 Node.js 18 以上，不用安裝任何套件。

   用法（在 starter-kit 資料夾裡執行）：
     export GEMINI_API_KEY="你的金鑰"            # Windows PowerShell：$env:GEMINI_API_KEY="你的金鑰"
     node tools/generate.mjs content/kk01-two-apples.js            # 補齊還沒有的語音與圖片
     node tools/generate.mjs content/kk01-two-apples.js --audio    # 只做語音
     node tools/generate.mjs content/kk01-two-apples.js --images   # 只做圖片（會先做角色設定圖）
     node tools/generate.mjs content/kk01-two-apples.js --only s01,q1-a-1 --force   # 指定幾個重做
     node tools/generate.mjs content/kk01-two-apples.js --dry      # 只列出要做什麼，不花錢

   金鑰只從環境變數讀，不要寫進任何檔案。
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LESSON = require(path.join(KIT, "engine/lesson.js"));
const Checker = require(path.join(KIT, "engine/checker.js"));
const Gemini = require(path.join(KIT, "engine/gemini.js"));

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (n) => args.includes("--" + n);
const value = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
if (!file) { console.log("用法：node tools/generate.mjs content/某一集.js [--audio|--images] [--only id1,id2] [--force] [--dry]"); process.exit(1); }

const key = process.env.GEMINI_API_KEY;
if (!key && !flag("dry")) { console.error("找不到環境變數 GEMINI_API_KEY。請先 export GEMINI_API_KEY=\"你的金鑰\"。"); process.exit(1); }

// 讀題庫：題庫檔會呼叫 LESSON.add(...)
global.LESSON = LESSON;
const text = fs.readFileSync(path.resolve(file), "utf8");
const syntax = Checker.syntax(text);
if (syntax.length) { console.error("題庫有語法問題：\n" + syntax.map((s) => "  ‧ " + s.message).join("\n")); process.exit(1); }
vm.runInThisContext(text, { filename: file });
const ep = LESSON.build(LESSON.registered.at(-1).raw, path.basename(file));
const errors = Checker.check(ep).filter((p) => p.level === "error");
if (errors.length) { console.error("題庫有錯誤，先修好再產生：\n" + errors.map((p) => "  ‧ " + p.where + "：" + p.message).join("\n")); process.exit(1); }

const only = value("only") ? value("only").split(",").map((s) => s.trim()) : null;
const force = flag("force");
const doAudio = !flag("images") || flag("audio");
const doImages = !flag("audio") || flag("images");
const abs = (p) => path.join(KIT, p);
const findExisting = (base, exts) => exts.map((e) => base + "." + e).find((p) => fs.existsSync(abs(p))) || null;
const wanted = (id, base, exts) => (!only || only.includes(id)) && (force || !findExisting(base, exts));

function write(base, exts, r) {
  const p = base + "." + r.ext;
  fs.mkdirSync(path.dirname(abs(p)), { recursive: true });
  fs.writeFileSync(abs(p), r.bytes);
  exts.filter((e) => e !== r.ext).forEach((e) => fs.rmSync(abs(base + "." + e), { force: true }));
  return p;
}

async function pool(items, worker, size = 2) {
  let i = 0, ok = 0, bad = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const x = items[i++];
      try { await worker(x); ok++; } catch (e) { bad++; console.error("  ✗ " + x.id + "：" + e.message); if (e.status === 401 || e.status === 403) process.exit(1); }
    }
  }));
  return { ok, bad };
}

const dry = flag("dry");
const models = { tts: process.env.GEMINI_TTS_MODEL || Gemini.MODELS.tts, image: process.env.GEMINI_IMAGE_MODEL || Gemini.MODELS.image };
console.log(`📚 ${ep.id}　${ep.title}　（語音：${models.tts}，圖片：${models.image}）`);

if (doAudio) {
  const todo = LESSON.allLines(ep).filter((x) => wanted(x.line.id, x.line.audio, ["mp3", "wav"])).map((x) => ({ id: x.line.id, ...x }));
  console.log(`\n🎙  語音：要產生 ${todo.length} 句`);
  if (dry) todo.forEach((x) => console.log(`  ‧ ${x.id}  [${x.line.char ? x.line.char.voice : "?"}]  ${x.line.say}`));
  else {
    const r = await pool(todo, async (x) => {
      const res = await Gemini.tts({ key, model: models.tts, text: x.line.say, speaker: x.line.char ? x.line.char.name : "Speaker", voice: x.line.char ? x.line.char.voice : "Kore", style: Gemini.speechStyle(ep, x.line) });
      console.log("  ✓ " + write(x.line.audio, ["mp3", "wav"], res));
    });
    console.log(`  完成 ${r.ok} 句${r.bad ? `，失敗 ${r.bad} 句（再跑一次會只補失敗的）` : ""}`);
  }
}

if (doImages) {
  const IMG = ["jpg", "png", "webp"];
  const castTodo = ep.castKeys.filter((k) => ep.cast[k].look).map((k) => ({ id: "cast-" + k, k, base: ep.assets + "images/cast-" + k }))
    .filter((x) => wanted(x.id, x.base, IMG));
  const imgTodo = LESSON.allImages(ep).filter((x) => wanted(x.id, x.file, IMG));
  console.log(`\n🎨 圖片：角色設定圖 ${castTodo.length} 張、場次圖 ${imgTodo.length} 張`);
  if (dry) { castTodo.forEach((x) => console.log("  ‧ " + x.id)); imgTodo.forEach((x) => console.log(`  ‧ ${x.id}  ${x.prompt.slice(0, 70)}…`)); }
  else {
    // 先做角色設定圖，之後每一張場次圖都拿它當參考
    await pool(castTodo, async (x) => {
      const res = await Gemini.image({ key, model: models.image, prompt: Gemini.characterPrompt(ep, ep.cast[x.k]), ratio: "3:4" });
      console.log("  ✓ " + write(x.base, IMG, res));
    });
    const r = await pool(imgTodo, async (x) => {
      const refs = x.who.map((k) => findExisting(ep.assets + "images/cast-" + k, IMG)).filter(Boolean)
        .map((p) => ({ bytes: new Uint8Array(fs.readFileSync(abs(p))), mime: p.endsWith("png") ? "image/png" : p.endsWith("webp") ? "image/webp" : "image/jpeg" }));
      const res = await Gemini.image({ key, model: models.image, prompt: Gemini.imagePrompt(ep, x, refs.length > 0), refs, ratio: ep.art.ratio });
      console.log("  ✓ " + write(x.file, IMG, res));
    });
    console.log(`  完成 ${r.ok} 張${r.bad ? `，失敗 ${r.bad} 張` : ""}`);
  }
}
console.log("\n下一步：打開 index.html?ep=" + ep.id + "&dev=1 從頭聽一次、看一次。");
