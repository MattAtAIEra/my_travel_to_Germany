# Q2050 —《2050自主智慧時代》書籍介紹 deck

李國憲博士著，`AI × Data × ESG × Human` 框架。**書籍介紹 + 導購**，結尾帶購書 CTA。
素材：`書摘.txt`（21 章 + 序章／後記／附錄）。

## 規格

| | |
| --- | --- |
| 長度 | **4:36**（線性，無分支） |
| 語音 | Voai `佑希` ‧ **聊天**（繁中），74 顆 mp3、4.3 MB |
| 圖 | Gemini `gemini-3.1-flash-image`，12 張，5.0 MB。**全片無真人照**：作者以漫畫形象出現在 s01／s19 主視覺 |
| 配樂 | `BGM/BGM.mp3`（2:26）＜ 片長 4:36 → 交叉淡接循環；片尾預留 3.5 秒淡出 |
| 主題 | `manga-color`（為此案新建） |
| 場景 | 19（title 1 ‧ painpoint 1 ‧ storybook 7 ‧ generic 5 ‧ callout-stack 4 ‧ outro 1） |
| 句數 | 76（74 句口白 + 2 個靜默幀） |
| 成本 | 圖 **$2.36**（含三輪修正）＋ 語音 1,569 字 |

## 結構

```
鉤子      s01 s02        「如果一覺醒來，我們已經到了二零五零年」
核心框架  s03            Q2050 乘法公式 AI × Data × ESG × Human
弧線一    s04–s07        工具 → 助手 → 代理人 → 自主智慧；精準達成錯誤目標
弧線二    s08–s11        數據是組織記憶不是石油；智慧資產 vs 智慧負債
弧線三    s12–s15        國家競爭、主權是保有選擇權、人的價值超越市場產值
收束      s16 s17        科技把時間與選擇還給人
答案      —              「問、選、創、責」貫穿全篇
CTA       s18 s19        關於這本書 → 立即入手
```

**是乘法不是加法** —— 任一構面歸零，整體就歸零。這是全書骨幹，s03 整場在講這件事。

首尾兩場（s01／s19）掛作者照，用 `props.author`（見 `references/scene_types.md`）。
**照片保留真人樣貌、不重畫成漫畫** —— 作者照的作用就是「這是一個真的人」，
生成成插畫會同時失去真人感與辨識度。風格融合交給外框：照片與姓名牌合成一張
3px 墨線 + 6px 硬陰影的卡片，跟全站分鏡框同一種語言，等同日漫單行本書衣的作者欄。

CTA 連 `https://q2050-book.vercel.app/`（`target=_blank` + `rel=noopener`，驗收有檢查）。
文案只用書摘既有的說法，**未杜撰價格、優惠、銷量或推薦人**。

## 主題 `manga-color`

與黑白 `manga` **色彩策略完全相反**：

| | `manga` | `manga-color` |
| --- | --- | --- |
| 策略 | 全篇黑白，唯一的紅本身就是強調 | 彩色插圖是主角，版面用有限高飽和印刷色承接 |
| 主色 | 墨黑 + 少年漫畫紅 | 深群青 `#1F3A93` ‧ 青碧 `#00A39B` ‧ 漫畫紅 `#E4002B` ‧ 琥珀 `#FFB020` |

兩者**不可互換** —— `manga` 的 `meta.style` 寫死 monochrome，套到彩圖上會打架。

共通的是分鏡語言：粗墨線外框、硬陰影、方框對話框、退出公版的液態玻璃 chrome。

**字型刻意不用 Impact。** `manga` 的標題字是 Impact 系（只覆蓋拉丁字母），
純中文內容會 fallback 成混排的醜字。這裡兩層字型 stack 一律中文優先，
漫畫的字重由 `font-weight: 900` 提供。

線稿用帶藍的深墨 `#16181D` 而非純黑 —— 純黑在彩頁上會顯得髒。

## 重建

```bash
# 1. 圖（12 張，$1.11 全新生成）—— 先報價
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py \
  scenes.json --out images/ --skip-refs --estimate
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py \
  scenes.json --out images/ --skip-refs

# 2. 語音
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/tts_voai.py \
  Q2050.subs.json --out audio/ --version Neo --speaker 佑希 --style 聊天
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/sync_durations.py \
  Q2050.subs.json --audio audio/

# 3. 組裝
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/build_html.py \
  --subs Q2050.subs.json --scenes scenes.json --theme manga-color --lang zh-Hant \
  --out index.html --require-cues --scene-gap 2 \
  --bgm BGM/BGM.mp3 --bgm-fade 3.5
```

金鑰在專案根目錄 `.env`，腳本自己會讀，指令不必帶前綴。

**`--style` 只能是 `佑希` 支援的四個之一**（`預設`／`聊天`／`穩重`／`激昂`）。
送錯會 HTTP 500 且**整批每一句都失敗**。這份用 `聊天`（有朝氣）。

## 驗收

```bash
node verify.mjs        # 31 項，走 headless Chrome + CDP（本機沒裝 playwright）
```

驗的東西：主題色值與字型（不含 Impact）、12 張圖解碼成功、74 顆 mp3 長度非零且
`dur` 與實際音檔一致、cue 覆蓋率在真實 DOM 上驗、CTA 連結與 `noopener`、
**s01／s19 的作者照解碼成功且不壓到文字／字幕條／頂欄／控制列**、
逐場走訪觸發所有 cue、每場版面塞得進安全區、零 JS 錯誤。

**量文字碰撞要逐個「文字節點」量。** 對 `.display` 下 `selectNodeContents`
拿到的是整個 block 的滿寬方框（`.t-sub` 是 block 子元素），不是真正畫出字的
地方 —— 那樣寫會永遠回報重疊。

**JS 錯誤是用 CDP 的 `Runtime.exceptionThrown` 收的。** 不要改成讀
`window.__errs` —— 模板從來沒定義過那個變數，讀它會永遠回 0、永遠通過。

**版面數字要配截圖看。** 純數字看不出「內容都在安全區內但擠成一團」。
`shots/` 是驗收時的截圖。

## 生圖踩過的三輪坑

| 輪次 | 症狀 | 根因 | 處置 |
| --- | --- | --- | --- |
| 1 | 圖裡有可讀英文（`confirm`／`Engineer`／`Recyclee`） | scene prompt 描述了「介面」「螢幕」「文件」 | 改寫成「抽象發光的幾何面板」 |
| 1 | 白色分鏡外框 + 底部空白帶（9 張中 5 張） | `meta.style` 寫「彩頁**印刷**風格」＝有頁邊距的印刷頁；style 排在 prompt 最前面會壓過構圖提示 | 改成描述「原稿／單一畫面」，並逐項否定帶狀構圖 |
| 2 | 仍有 4 張底部分割 | 共用的 `COMPOSITION_HINTS["full"]` 寫「the lower third is simple background scenery only」，模型讀成「下三分之一是另一條帶子」 | 改成明講「同一個連續畫面、只是安靜一點」（已回饋到 plugin） |
| 3 | s06/s14/s17 仍是兩格 | s06 是 prompt 自己要求的前後對比分鏡；s14/s17 的第二格裡是**延續的景物**不是空白 | **不修** —— 在漫畫主題裡這是成立的構圖，見下 |

**刻意保留的分格**：s06 的斜向對開正是「生成內容 → 生成行動」的前後對比，
配上角標效果很好；s14／s17 底部那格是延續的景物且大半被字幕條蓋住，讀起來
就是漫畫的第二格。與第一輪那種**純白空帶**是兩回事 —— 那個才是壞掉。

## 已知取捨

- **圖花了 $2.36 而不是報價的 $1.11。** 多的是上面那三輪修正。烙字與空白帶
  都是客戶會當場指出來的問題，不是加戲。
- **成本可以更低。** 改 `meta.style` 會讓整份 deck 的圖全部重生；只改個別
  scene prompt 只重生那幾張。第一輪我判斷是系統性問題（5/9）才動 style。
- **音檔與圖不進 git**（`audio/` 已在 `.gitignore`；`images/` 5 MB）。
