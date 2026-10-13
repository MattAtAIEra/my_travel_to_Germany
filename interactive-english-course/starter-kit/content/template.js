/* ==========================================================================
   空白範本：複製這個檔案，開始寫你自己的一集

   步驟：
     1. 複製這個檔案，改成新的檔名，例如 xx01-my-story.js
     2. 打開 content/episodes.js，把新檔名加進清單
     3. 從上到下，把每個「✏️」的地方換成你的內容
     4. 存檔，重新整理 index.html 就能試玩（還沒做聲音時會用電腦語音代替）

   寫的時候記得三件事：
     ‧ 英文的標點符號都用「半形」：逗號 ,  冒號 :  引號 "
     ‧ 每一項後面都要有逗號（最後一項可以有、也可以沒有）
     ‧ 括號要成對：{ 和 }、[ 和 ]
   有錯的話，打開 studio.html 的「檢查題庫」，它會告訴你是第幾行。
   ========================================================================== */
LESSON.add({
  // ✏️ 這一集的代號：英文小寫＋數字，不能有空格。素材會放在 assets/這個代號/ 裡
  id: "xx01",
  // ✏️ 標題與副標題
  title: "My First Episode",
  subtitle: "我的系列 ‧ EP.01",
  // ✏️ 學習者是誰？這一集學完會什麼？（一集只教一件事）
  learner: "國小三年級",
  goal: "學會用 I like... 說出喜歡的東西",
  // 主要語言："en"（英語）或 "zh-TW"（華語）
  lang: "en",
  // 畫面按鈕的語言："en" 或 "zh-TW"
  ui: "zh-TW",

  // ✏️ 顏色：main 主色、accent 強調色、paper 底色、ink 文字色；font 可選 "rounded"、"sans"、"serif"
  theme: { main: "#2f8f5b", accent: "#e0703a", paper: "#f3f7ee", ink: "#1f2a22", font: "rounded" },

  // ✏️ 背景音樂（Suno 做好後放進 assets/bgm/，檔名要一樣）
  bgm: {
    file: "assets/bgm/xx01.mp3",
    volume: 0.12,
    suno: { style: "playful acoustic guitar and glockenspiel, sunny park, 105 bpm, instrumental, no vocals", title: "My First Theme" },
  },

  // ✏️ 畫風：每一張圖都會帶上這段描述
  art: {
    ratio: "16:9",
    style: "Soft watercolor children's book illustration, gentle pastel colours, rounded friendly shapes, warm afternoon light. No words, letters or speech bubbles anywhere in the image.",
  },

  speech: { note: "Clear and friendly, a little slower than normal." },

  // ✏️ 角色：左邊的代號（mimi、bobo）是寫台詞時用的，只能用英文小寫
  cast: {
    mimi: {
      name: "Mimi", emoji: "🐱", color: "#e0703a",
      voice: "Leda", lang: "en",
      style: "a curious, cheerful little cat who loves asking questions",
      look: "A small round orange tabby cat with big green eyes, a yellow raincoat and red boots.",
    },
    bobo: {
      name: "Bobo", emoji: "🐻", color: "#2f8f5b",
      voice: "Charon", lang: "en",
      style: "a calm, kind big bear who explains things slowly",
      look: "A big gentle brown bear with round glasses and a green knitted scarf.",
    },
  },

  // ✏️ 每一場戲，從上到下依序播放
  scenes: [
    {
      id: "s01", title: "Hello",
      image: "Mimi waves happily at Bobo in a sunny park with a picnic blanket.",
      lines: [
        "mimi: Hi, Bobo! What do you like?",
        "bobo: Hmm. I like honey.",
      ],
    },

    // 劇情選擇：三個選項都對，只是故事不一樣
    {
      id: "q1", type: "choice", title: "Your turn",
      ask: "What does Mimi like?",
      lines: ["bobo: And you, Mimi? What do you like?"],
      options: [
        { say: "mimi: I like fish!", tag: "YUMMY", then: ["bobo: Fish! Of course you do."] },
        { say: "mimi: I like the rain!", tag: "SPLASH", then: ["bobo: That's why you have boots!"] },
        { say: "mimi: I like you, Bobo!", tag: "SWEET", then: ["bobo: Aww. I like you too."] },
      ],
    },

    // 測驗題：只有一個 correct: true；答錯的分支裡也要有人說出正確答案
    {
      id: "q2", type: "quiz", title: "Quiz",
      ask: "Bobo loves cake. What does he say?",
      lines: ["mimi: Look, Bobo! Cake!"],
      options: [
        { say: "bobo: I likes cake.", then: ["mimi: Almost! I like cake. No s after I."] },
        { say: "bobo: I like cake.", correct: true, then: ["mimi: Yes! I like cake!"] },
        { say: "bobo: Like I cake.", then: ["mimi: Oops! I comes first. I like cake."] },
      ],
    },

    // 回顧：自動重播學習者選過的句子
    { id: "recap", type: "recap", title: "Your lines", lines: ["mimi: Say them with me!"] },

    // 單字卡：今天的重點
    {
      id: "words", type: "words", title: "Today's words", voice: "bobo",
      words: [
        { word: "I like honey.", hint: "我喜歡蜂蜜。" },
        { word: "I like cake.", hint: "我喜歡蛋糕。" },
      ],
      lines: ["mimi: Bye, Bobo! See you tomorrow!"],
    },
  ],
});
