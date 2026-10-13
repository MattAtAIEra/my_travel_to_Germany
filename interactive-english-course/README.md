# 從 0 到 1：互動語言教材課程（給老師）

帶沒有軟體開發經驗的大學生，一步一步做出像 `kk-kidsEnglishLearning`（Captain A 兒童英語）和
`morning-english`（晨間職場英語）那樣的互動教材：

- 角色、分支劇情、測驗題
- Gemini 產生插圖與配音（英語、台灣口音的國語），Suno 產生背景音樂
- 放上 Netlify，用 HTML 表單（Netlify Forms）收回學習成果

學生不寫程式。引擎已經寫好，學生做的是教學設計、說故事，和把內容整理成「題庫檔」。
整個流程會用淺白的方式講解軟體工程的概念：需求、規格、資料與程式分離、自動檢查、API、建置、測試、部署、迭代。

## 資料夾內容

| 檔案 | 給誰 | 是什麼 |
| --- | --- | --- |
| `index.html` | 學生 | **課程手冊**：12 課、53 個打勾步驟，每一步都有「你會看到」「卡住了？」「工程師的說法」 |
| `assignments.html` | 學生 | **作業說明**：三種組隊方式、題材清單（兒童英語／晨間英語／華語／旅行英語）、全班共同建構一季、時程、驗收清單、評分規準 |
| `submit.html`、`thanks.html` | 學生 | 作業繳交表單（純 HTML 的 Netlify 表單 `homework-submissions`） |
| `starter-kit/` | 學生 | 學生的起始專案：播放器、製作工作台、兩個範例、空白範本 |
| `starter-kit.zip` | 學生 | 手冊上「下載 starter kit」的那一包，由 `make-zip.py` 產生 |
| `course.css` | — | 手冊與作業頁共用的外觀（沿用 `../netlify-github/` 操作手冊的版型） |
| `make-zip.py` | 老師 | 重新打包 `starter-kit.zip` |
| `tests/verify.mjs` | 老師 | 自動驗收，共 90 項 |

### starter kit 的結構

```
starter-kit/
├── index.html        播放器＋學習成果表單（Netlify Forms：learning-results）
├── studio.html       製作工作台：檢查題庫、試聽與產生語音、產生圖片、Suno 提示詞、音量測試
├── content/          題庫：每一集一個 .js 檔（episodes.js 是清單）
├── assets/<集>/      圖與聲音，檔名由代號自動決定（s01.jpg、s01-1.mp3）
├── engine/           lesson.js（登記與整理）、checker.js（檢查）、player.js、studio.js、gemini.js
└── tools/generate.mjs  用指令批次產生（金鑰從環境變數 GEMINI_API_KEY 讀）
```

## 開課前準備

### 1. 先讓學生做完《GitHub ＋ Netlify 操作手冊》

課程手冊第 10 課（上線）直接引用 `../netlify-github/` 的步驟編號。

### 2. 把課程網站放上 Netlify（為了收作業）

`submit.html` 的表單只有放在 Netlify 上才收得到。建議把**整個 repo** 部署成一個 Netlify 專案，
這樣手冊裡連到 `../netlify-github/`、範例作品的連結都不會斷：

1. Netlify → Add new project → Import from Git → 選這個 repo。
2. Base directory、Build command、Publish directory 都留空 → Deploy。
3. 專案頁 → **Forms** → **Enable form detection** → 回 **Deploys** 按 **Trigger deploy**（新專案預設不偵測表單，開啟後要再部署一次）。
4. 部署完成後，Forms 頁會出現 `homework-submissions`（作業）和 `learning-results`（範例作品的學習成果）。
5. 自己交一份測試作業；在 Forms 設定 **Form notifications** → Email，收到作業就會寄信。

課程網址會是 `https://<專案名>.netlify.app/interactive-english-course/`。
（這個 repo 原本部署在 Cloud Run，那邊的頁面照常可以看，只是表單送不出去。）

Netlify 在 2026 年 4 月調整計價後，新計價方案的表單送出是免費、沒有上限的；
2025 年 9 月以前建立的舊帳號可能還在舊方案（每個專案每月 100 筆），請到帳單頁確認。

### 3. Gemini API 金鑰的發放方式（擇一）

| 方案 | 做法 | 適合 |
| --- | --- | --- |
| A. 學生自備 | 學生到 `aistudio.google.com/apikey` 自己建立 | 免費額度夠用時。**課前請先用工作台的「測試連線」實測** TTS 和圖片模型，免費方案不一定涵蓋 |
| B. 課堂專案（建議） | 老師在 Google Cloud 建一個課程專案、開帳單、設定預算警示，在 AI Studio 為每組建一把金鑰（金鑰名稱寫組名），期末全部刪除 | 費用可控、可以個別停用、不會有學生卡在帳單設定 |

發金鑰時用私訊，不要投影、不要貼在群組。學生的 repo 是公開的，手冊與驗收清單都要求在 GitHub 搜尋 `AIza` 確認沒有外流。

### 4.（選做）產生範例的正式素材

範例兩集目前沒有附素材：沒有聲音的句子用瀏覽器內建語音，沒有圖的場次用色塊。這也是課程的第一個示範：素材還沒做，作品就已經能玩。
想讓學生先看到「完成品」，可以用老師的金鑰產生一次：

```bash
cd interactive-english-course/starter-kit
export GEMINI_API_KEY="..."
node tools/generate.mjs content/kk01-two-apples.js --dry   # 先看清單：61 句、3 張角色設定圖＋13 張圖
node tools/generate.mjs content/kk01-two-apples.js
node tools/generate.mjs content/me01-elevator.js
```

背景音樂用工作台「⑥ 背景音樂」的提示詞到 Suno 做，存成 `assets/bgm/kk01.mp3`、`assets/bgm/me01.mp3`。
`starter-kit.zip` 不會打包 `assets/` 裡的圖與聲音（學生要自己產生，也避開 GitHub 網頁一次只能上傳 100 個檔案的限制）。

原本用 ElevenLabs 配音的完整版仍在 `../kk-kidsEnglishLearning/` 和 `../morning-english/`，可以當成「專業版」展示。

## 時程

建議 9 週（每週一次、約 3 小時）。對照表在 `assignments.html#milestones`。

- **6 週**：第 2–3 週合併、第 5–6 週合併、第 7–8 週合併。
- **兩天工作坊**：第一天做到「可玩版」（第 0–5 課，用電腦語音玩完自己的一集）；第二天做素材（第 6–8 課）、上線收成果（第 9–10 課）。

## 每一課的帶課提醒

| 課 | 現場示範 | 最常卡住的地方 |
| --- | --- | --- |
| 0 | 雙擊 index.html；`?dev=1` 跳場次 | 檔案被別的程式打開（請用 Chrome 開） |
| 1 | 把「學會水果」改成「兩個以上加 s」 | 一集想教太多；「怎樣算成功」寫不出來 |
| 2 | Funky 的角色卡怎麼對到語音與圖片 | 外型寫了表情和動作（那是每一場的事） |
| 3 | ME01 主線過場的修改故事 | 旁白和台詞寫在同一句；分支接不回主線 |
| 4 | KK01「答案寫在題目上」的修改 | 錯誤選項太荒謬；答錯的分支沒說出正解 |
| 5 | 故意刪一個逗號，用「檢查語法」找出來 | 全形符號；episodes.js 忘了加檔名 |
| 6 | 先畫一張再全部畫 | 金鑰權限（403）；Safari 不能連接資料夾 |
| 7 | 帶大家看懂官方的 curl 範例（手冊 7-1） | 兩個角色同一個聲音；華語破音字 |
| 8 | 同一首音樂開兩種音量給大家聽 | 音樂蓋過人聲；檔名和 `bgm.file` 不一樣 |
| 9 | 三輪測試表 | 改了台詞沒有重新產生那一句 |
| 10 | 開啟表單偵測後重新部署 | 忘了重新部署；一次上傳超過 100 個檔案 |
| 11 | 用 CSV 找出最多人選的錯誤選項 | 只有一版、沒有看資料 |

## 評分

依 `assignments.html#rubric`。老師評分時：用手機玩三輪（每個選項至少選一次）、送出一筆學習成果、
看 GitHub 的題庫檔與 README、用工作台跑一次「檢查題庫」。作業繳交資料可以從 Netlify Forms 匯出 CSV。

## 技術設計（給想了解架構的人）

- **不需要建置、不需要伺服器**：全部是靜態檔。學生雙擊 `index.html` 就能跑，放上 Netlify 也不用設定 build。
- **題庫用 `.js` 而不是 `.json`**：雙擊打開時網址是 `file://`，瀏覽器不准 `fetch` 本機檔案，也不准載入 ES module；
  但一般的 `<script>` 可以。所以題庫檔呼叫 `LESSON.add({...})` 把自己登記進來（類似 JSONP）。
- **一個一個載入題庫**：`file://` 下語法錯誤只會顯示「Script error.」，看不到行號。逐一載入才知道是哪個檔案沒登記成功；
  行號則由工作台的 `Checker.syntax()` 找（逗號、引號、括號、全形符號）。
- **約定優於設定**：素材路徑全部由代號決定（`assets/<集>/audio/<場>-<句>.mp3`、選項是 `<場>-<a|b|c>-<句>`），題庫裡不寫檔名。
- **播放器**：依序播放，用「執行編號」取消舊的流程（跳場次、重玩時）。聲音依序找 `.mp3` → `.wav` → 瀏覽器內建語音 → 依字數計時；
  圖依序找 `.jpg` → `.png` → `.webp` → 色塊。所以素材缺什麼都還能玩。
- **Netlify Forms**：`index.html` 裡有靜態的 `<form name="learning-results" data-netlify="true">`，部署時 Netlify 掃描得到；
  播完時用 JavaScript 以網址編碼（`application/x-www-form-urlencoded`）POST 到目前頁面的路徑，並帶上 `form-name`。
  `file://` 時不送出，只顯示說明。`submit.html` 則是純 HTML 表單，不需要 JavaScript。
- **Gemini（`engine/gemini.js`）**：走 Interactions API（`POST /v1beta/interactions`），語音用 `gemini-3.8-flash-tts`、圖片用 `gemini-3.1-flash-image`
  （模型名稱在工作台「① 準備」可以改）。語音請求的格式照官方範例：`user_input` ＋ `speech_metadata`（speaker、style）＋
  `speech_config.mode: "conversational"` 與 `speakers`，並要求 `audio/mp3`。API 還在 beta，所以準備了備案寫法：
  HTTP 400／404 時依序改用「不指定格式」「不寫 mode」「舊的 generateContent」，成功的寫法會記住。429／5xx 會等一下再試。
  回傳的 PCM 會自動加上 WAV 檔頭。找輸出時只看 `model_output`，避免把回應裡附上的參考圖當成新圖。
- **工作台寫檔**：Chrome／Edge 用 File System Access API 直接寫進專案資料夾（資料夾權限記在 IndexedDB，下次一鍵重新連接）；
  其他瀏覽器用「下載模式」，最後打包成照資料夾結構排好的 zip。
- **角色一致**：先產生角色設定圖（`cast-<角色>.jpg`），之後每張場次圖都把畫面裡角色的設定圖當參考圖送出。
  畫面裡有誰，從描述中提到的角色名字判斷（也可以用 `people` 指定）。
- **金鑰**：只存在瀏覽器（預設 sessionStorage，勾「記住」才放 localStorage），不寫進任何檔案；指令工具只從環境變數讀。

### 已知限制

- 撰寫時還沒有用真的金鑰跑過 Gemini（只用模擬回應驗證過請求格式、備案寫法與存檔流程）。
  第一次使用請先按工作台的「測試連線」，畫面會顯示用的是哪一種寫法。
- Safari、Firefox 不支援直接寫入資料夾，只能用下載模式。
- GitHub 網頁一次最多上傳 100 個檔案，素材多的組要分批上傳（手冊 10-2 有寫）。

## 維護

```bash
# 改了 starter-kit 裡的任何檔案之後
python3 make-zip.py            # 重新打包 starter-kit.zip（內容沒變時 zip 也不會變）
node tests/verify.mjs          # 90 項自動驗收（需要 playwright；或設定 PLAYWRIGHT_MODULE 指到已安裝的位置）
```

驗收的範圍：題庫檢查員抓不抓得到常見錯誤、播放器在 `file://` 與網站上都能玩完、缺素材與有素材的行為、
回顧重播正確答案、手機版面、學習成果表單欄位與送出格式、工作台的 Gemini 請求格式與備案寫法、下載 zip、參考圖、
課程頁面的站內連結、用詞規範（不出現大陸用語），以及 `starter-kit.zip` 是不是最新的。
