# 元大優質收益成長多重資產基金 — 商品結構說明 deck

素材來源：元大銀行活動頁 `bankwebIMG/event/Bank_Act2026/julyipo/index.html`
（頁面本身擋 bot UA，需帶瀏覽器 User-Agent 才抓得到；頁面數字全在 `asset/js/vue_main.js`）。

## 設計前提

| 項目 | 決定 |
| --- | --- |
| 客群 | 高資產／熟客說明會（假設具股債配置基礎） |
| 目的 | 理解商品結構 — 教育為主，**不設申購 CTA** |
| 手法 | 問題 → 解方 → 取捨 → 適配 |
| 主題 | `yuanta`（元大企業識別色，見下） |
| 語音 | Voai.ai 繁中 |
| 時效性 | **全篇不含日期** — 不提募集期間、成立日、首次配息月份、資料截止日，第二階段募集可直接沿用 |

## 色彩來源（未自創）

| Token | 色值 | 出處 |
| --- | --- | --- |
| `--primary` | `#004097` | `YTB-logo.svg` 標誌漸層深藍 |
| `--secondary` | `#009fe8` | `YTB-logo.svg` 標誌漸層亮藍 |
| `--accent` | `#f46300` | 官網 `main.css` 強調橘 |
| `--warn` | `#ffd300` | 官網 `main.css` `.yellow` |
| `--cream` | `#f2f7ff` | 官網淺藍白底 |
| `--ink` | `#001854` | 官網深藍黑 |
| `--dim` | `#2f4363` | 官網 `body` 內文色 |

兩處刻意偏離：`--glow` 用亮藍而非 `--warn`（半透明黃疊深藍會濁成橄欖綠）；
`--glass-rgb` 設為 `0, 24, 84`，把公版的懸浮玻璃面板染成元大深藍。

主題檔：`plugins/dynamic-deck/skills/dynamic-deck/themes/yuanta.css`

## 兩個版本

| | 打樣版（已完成配音） | 完整版（待確認方向後製作） |
| --- | --- | --- |
| 產物 | `sample.html` | `index.html` |
| 字幕 | `YTFS.subs.json` — 25 句 | `YTF.subs.json` — 116 句 |
| 視覺 | `scenes.sample.json` — 7 場 | `scenes.json` — 18 場 |
| 音檔 | `audio/YTFS-*.mp3`（1.6 MB） | 未產生 |
| 插圖 | `images/`（4 張，300 KB） | 未產生 |
| 長度 | **2:01** | 約 9 分半–10 分（估） |

**2:01 的打樣版就是交付版本** —— Matt 確認全片只要兩分鐘，完整版不製作，
`index.html` 那套檔案保留作為日後展開的素材。

打樣版取完整版的骨幹：問題 → 三支腳 → 掩護性買權比喻 → 債券取捨 → 三個風險 → 打樣結尾，
用來確認敘事節奏與視覺方向。完整版另外展開 TOP 選股、關注產業、ETF 衛星部位、
預計配置、商品規格、費用結構、適配對象。

## 插圖（Gemini）

4 張，`gemini-3.1-flash-image`，總成本 $0.30。風格由 `scenes.sample.json` 的
`meta.style` 統一：抽象幾何＋柔和光暈，元大深藍／亮藍為主、暖橘單點強調，
明令不得出現文字、標誌與真實人物臉孔。

| 場景 | slot | 內容 |
| --- | --- | --- |
| s01 封面 | hero 16:9 2K | 發光地球儀網格，光帶自一點向全球擴散 |
| s02 問題 | side 1:1 1K | 向上攀升但劇烈鋸齒震盪的光帶 |
| s04 掩護性買權 | side 1:1 1K | 房屋＋契約＋金幣（比喻三要素） |
| s07 結尾 | side 1:1 1K | 平衡中的天平：成長箭頭 vs 穩定基石 |

資料表（s05）、三卡（s03）、三風險（s06）刻意不配圖 —— `generic` 配圖會轉成
左文右圖兩欄，寬版資料元件擠成半寬會失去可讀性。

```bash
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py \
  scenes.sample.json --out images/ --skip-refs     # --estimate 先報價
```

改一張：編輯該場 `props.image.prompt` → `--only s04 --force`（約 $0.07）。

## 檔案

```
script.md             完整版旁白腳本（人看的版本，含設計註記）
YTF.subs.json         完整版字幕
scenes.json           完整版視覺層，cue 覆蓋率 116/116
YTFS.subs.json        打樣版字幕（dur 已由 sync_durations.py 校正為真實秒數）
scenes.sample.json    打樣版視覺層，cue 覆蓋率 25/25
sample.html           打樣版產物
index.html            完整版產物（無聲，待配音）
shot.mjs              版面驗收：headless Chrome 走完每場截圖 + 量測溢出
verify_audio.mjs      播放驗收：實際載入每顆 mp3，確認檔名對得上、長度非零
images/               Gemini 插圖
BGM/                  背景音樂（實際使用 北歐晴途.mp3，其餘為比稿備選）
shots/                驗收截圖
```

## 操作介面

用 plugin 的**公版液態玻璃 chrome**（頂欄／控制列／字幕條皆為懸浮玻璃膠囊），
玻璃底色由 `yuanta.css` 的 `--glass-rgb: 0, 24, 84` 染成元大深藍。
細節見 `references/themes.md` 的「公版操作介面」。

## 建置

打樣版（交付版本）：

```bash
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/build_html.py \
  --subs YTFS.subs.json --scenes scenes.sample.json \
  --theme yuanta --lang zh-Hant --out sample.html --require-cues \
  --bgm "BGM/北歐晴途.mp3" --bgm-volume 0.11
```

完整版（無聲素材，參數保持一致）：

```bash
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/build_html.py \
  --subs YTF.subs.json --scenes scenes.json \
  --theme yuanta --lang zh-Hant --out index.html --require-cues \
  --bgm "BGM/北歐晴途.mp3" --bgm-volume 0.11
```

### 背景音樂

`BGM/北歐晴途.mp3`（3:10，自動 loop，結尾淡出）。

**音量固定 `0.11`，不要調高。** plugin 預設是 `0.15`，但這是說明會用的商品解說 deck ——
旁白清晰度優先於氣氛，音樂只是墊底不能蓋過人聲。本片旁白由 Voai `佑希 / 穩重` 產生，
音壓偏平穩，0.15 在筆電喇叭上會咬到齒音，0.11 才退得乾淨。

BGM 只在使用者按下 Play 後才起（瀏覽器 autoplay 政策），暫停時同步停，最後一句結束時淡出。

## 配音

金鑰放在專案根目錄 `.env`（`VOAI_API_KEY=`），腳本自己會讀，指令不必帶前綴。

```bash
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/tts_voai.py \
  YTFS.subs.json --out audio/ --version Neo --speaker 佑希 --style 穩重

python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/sync_durations.py \
  YTFS.subs.json --audio audio/
```

**語者 `佑希` 的合法 style 只有：`預設` / `聊天` / `穩重` / `激昂`。**
清單依語者而異，送錯會 HTTP 500。本專案用 `穩重`。

試聽重點（都是預先為耳朵改寫過的寫法，確認 Voai 念對）：

| 音檔 | 檢查點 |
| --- | --- |
| `YTFS-009.mp3` | `ETF` — 若念錯，subs 改寫成 `E T F` 再 `--only 009 --force` |
| `YTFS-021.mp3` | `R R 三`（風險報酬等級 RR3） |
| `YTFS-023.mp3` | `百分之一點七五`（1.75%） |
| `YTFS-018.mp3` | `百分之二十一`（20.96% 口語化） |

## 驗收

```bash
node shot.mjs sample.html           # 版面：每場「內容高度 / 可用高度」，溢出即 exit 1
node verify_audio.mjs sample.html   # 播放：25 顆 mp3 + BGM 全載入、時間軸前進、無 JS 錯誤
```

`verify_audio.mjs` 的 BGM 檢查項：元素存在、`src` 對得上、`loop` 開啟、音量確實是 `0.11`、
檔案解得開且長度非零、播放中 `currentTime` 真的在走。中文檔名不必手動 encode ——
Chrome 會把 `src` 的 UTF-8 自動轉成 percent-encoding（驗收時會印出解析後的 `file://` URL 確認）。
JS 錯誤是用 CDP 的 `Runtime.exceptionThrown` / `console.error` 收的（頁面沒有 `window.__errs`）。

## 合規注意

- 全篇未出現「保本」「穩健」「保證」等字眼；掩護性買權的三種市況都同步講出代價。
- 基金全名一律帶「（本基金之配息來源可能為本金）」。
- 結尾固定警語頁停留 12 秒。
- 若要改成行銷用途（加申購 CTA），廣宣用語需另送法遵審閱。
