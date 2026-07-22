# lapland-winter — 夢幻祕境・芬蘭拉普蘭 7 天遊

`glass` 主題（液態玻璃 + 滿版照片 + Ken Burns）的旗艦示範。
內容取材自 Nordic Unique Travels 的冬季多天遊行程頁：
<https://nordictravels.eu/zh/activities-zh/winter-land-finnish-lapland-in-7-days/>

- 12 個場景（title + 10 storybook + outro）、29 段字幕（27 段配音）
- 照片為 Bokun 行程相簿實拍圖（`images/`，共 11 張入選；相簿裡的夏季港口照
  為維持冬季調性未使用）
- 設計重點：無邊框滿版照片、懸浮玻璃頂欄／dock／字幕膠囊、四方向輪替 Ken Burns
- 節奏：場景換場後旁白靜默 2 秒（build 預設 `--scene-gap 2`，skill 全域行為）——
  新照片先看兩秒、字幕與旁白再同步進場，避免緊迫壓迫感

## 重建

```bash
SK=../../plugins/dynamic-deck/skills/dynamic-deck
python3 $SK/scripts/build_html.py \
  --subs LAP.subs.json --scenes scenes.json \
  --theme glass --lang zh-Hant \
  --bgm BGM/BGM.mp3 --bgm-volume 0.15 \
  --out index.html
```

## 配音（已完成：Voai 立安）

27 段 mp3 已在 `audio/`（Neo ‧ 立安 ‧ 預設 —— 這類聲音在 Neo 下只有「預設」style），
時長已用 sync_durations 回寫。改字重生單句：

```bash
VOAI_API_KEY=iq-xxx python3 $SK/scripts/tts_voai.py LAP.subs.json \
  --out audio/ --version Neo --speaker 立安 --style 預設 --only 015 --force
python3 $SK/scripts/sync_durations.py LAP.subs.json --audio audio/
# 之後重跑上面的 build 即可
```

## 本地預覽注意

`python3 -m http.server` **不支援 HTTP Range**，Chrome 的媒體載入會卡住
（畫面會走、聲音不出）。直接 `open index.html`（file:// 可播）或用任何支援
Range 的靜態伺服器（nginx、`npx serve` 等）。另外 Claude in Chrome 擴充套件
接管的分頁其媒體請求會停滯 —— 要聽聲音請用一般分頁開。

## 版權注意

照片版權屬 Nordic Unique Travels／原攝影師，僅供內部 demo 展示，
不要對外發佈或商用。
