# 互動語言教材 starter kit

這個資料夾就是你的作品。整個資料夾放上 GitHub、接上 Netlify，就是一個可以玩、會收集學習成果的網站。

## 先玩玩看（不用安裝任何東西）

1. 用 Chrome 打開 `index.html`（直接雙擊就可以）。
2. 選一集，按「Start ▶」。還沒有聲音檔的句子會用電腦內建語音代替，還沒有圖的地方會用色塊代替。
3. 網址後面加上 `?dev=1`，會打開「開發者模式」：可以跳到任何一場，也看得到每一句用的是哪個聲音檔。

## 資料夾裡有什麼

```
starter-kit/
├── index.html          播放器（學習者看到的網站），裡面有 Netlify 學習成果表單
├── studio.html         製作工作台：檢查題庫、產生語音和圖片、Suno 音樂提示詞
├── content/            ← 你主要改這裡：題庫（每一集一個檔案）
│   ├── episodes.js         這個作品有哪幾集
│   ├── kk01-two-apples.js  範例一：兒童英語
│   ├── me01-elevator.js    範例二：晨間職場英語（英語對話＋中文解說）
│   └── template.js         空白範本，複製它開始寫
├── assets/             ← 素材：工作台會自動放進來
│   ├── <集代號>/images/    每一場的圖，例如 assets/kk01/images/s01.jpg
│   ├── <集代號>/audio/     每一句的聲音，例如 assets/kk01/audio/s01-1.mp3
│   └── bgm/                Suno 做的背景音樂
├── engine/             播放器和工作台的程式（不用改也能完成作品）
└── tools/generate.mjs  （選用）用指令一次產生整集的素材
```

工程師把這種分法叫做「關注點分離」：**引擎**（engine）負責怎麼播，**題庫**（content）負責播什麼，**素材**（assets）是聲音和圖。
要換一集、改題目，只要動 content，引擎一行都不用改。

## 做一集新的

1. 複製 `content/template.js`，改名成例如 `ab01-my-story.js`。
2. 打開 `content/episodes.js`，把新的檔名加進清單。
3. 照著範本裡的 ✏️ 改內容，存檔，重新整理 `index.html` 試玩。
4. 打開 `studio.html` →「② 檢查題庫」，把紅色的錯誤修掉。
5. 在工作台貼上 Gemini API 金鑰，產生語音、圖片；到 Suno 做背景音樂。

## 題庫檔的格式（速查）

```js
LESSON.add({
  id: "ab01",                         // 集代號：英文小寫＋數字（也是素材資料夾的名字）
  title: "標題", subtitle: "副標", learner: "給誰學", goal: "學什麼",
  lang: "en",                         // 主要語言："en" 或 "zh-TW"
  ui: "zh-TW",                        // 按鈕文字的語言
  theme: { main: "#2060b0", accent: "#d04830", paper: "#fdebd5", ink: "#332a20", font: "rounded" },
  bgm: { file: "assets/bgm/ab01.mp3", volume: 0.12, suno: { style: "...", title: "..." } },
  art: { ratio: "16:9", style: "整集共用的畫風描述（英文）" },
  speech: { note: "所有台詞共用的語音要求" },
  cast: {
    mimi: { name: "Mimi", emoji: "🐱", color: "#e0703a", voice: "Leda", lang: "en",
            style: "語氣與個性（給語音）", look: "外型（給圖片）" },
  },
  scenes: [
    { id: "s01", title: "標題", caption: "圖上的小字", image: "這一場的畫面描述",
      lines: ["mimi: Hello!", { who: "mimi", say: "Hi!", hint: "嗨！", style: "whispering" }] },
    { id: "q1", type: "choice", ask: "題目", lines: ["…選項出現前的台詞…"],
      options: [{ say: "mimi: 選項一", tag: "標籤", image: "…", then: ["…選了之後的台詞…"] }] },
    { id: "q2", type: "quiz", ask: "題目", options: [{ say: "…", correct: true, then: ["…"] }] },
    { id: "recap", type: "recap", lines: ["…"] },
    { id: "words", type: "words", voice: "mimi", words: [{ word: "apple", note: "說明", hint: "蘋果" }] },
  ],
});
```

台詞的寫法：`"角色代號: 台詞"`。冒號前面是 cast 裡的代號（不是名字），冒號用半形或全形都可以。

| type | 是什麼 | 規則 |
| --- | --- | --- |
| （不寫） | 一般的戲 | 顯示圖，一句一句播 |
| `choice` | 劇情選擇 | 選項都算對，選了播那條分支，然後回到主線 |
| `quiz` | 測驗題 | 剛好一個 `correct: true`；答錯的分支也要有人說出正確答案 |
| `recap` | 回顧 | 重播學習者選過的句子（測驗題重播正確答案） |
| `words` | 單字卡 | 每個字都可以點來聽 |

## 學習成果（Netlify Forms）

`index.html` 裡有一個 `<form name="learning-results" data-netlify="true">`。放上 Netlify 之後：

1. Netlify 後台 → 你的專案 → **Forms** → **Enable form detection**（新專案預設是關的）。
2. 回到 **Deploys** → **Trigger deploy** → **Deploy project**，讓 Netlify 重新掃描一次。
3. 打開網站玩完一集、送出，再回 Forms 頁就會看到 `learning-results` 和那一筆資料，可以匯出成 CSV。

在自己電腦上雙擊打開時，送出按鈕只會顯示「本機測試模式」，不會真的送出。

## 金鑰安全

Gemini API 金鑰只貼在 `studio.html` 裡，它只存在你的瀏覽器。**不要把金鑰寫進任何檔案**，這個資料夾會公開在 GitHub 上。
