/* ==========================================================================
   範例二：ME01 The Elevator（晨間職場英語，B1–B2）

   三十秒的電梯偶遇：你是上班第六天的新人 Leo，電梯裡只有你和執行長 Diane。
   三個選擇點對應職場英語的三段：開口（small talk）→ 介紹自己在做什麼（pitch）
   → 收尾（follow-up）。三個選項都是「對的」，解說講的是代價與時機，不講對錯。

   這一集示範「雙語」：故事和對話是英語，選完之後由 Mia 老師用台灣口音的國語解說。
   （角色的 lang 寫 "zh-TW"，產生語音時就會用台灣口音的國語念。）

   角色設定的硬規則：Diane 不可以是刻薄嚴厲的主管。學習者每天早上都要面對她，
   令人害怕的角色會讓人不想打開這一集。很有經驗不代表要刻薄。
   ========================================================================== */
LESSON.add({
  id: "me01",
  title: "The Elevator",
  subtitle: "Morning English ‧ EP.01",
  learner: "上班族、大學生（B1–B2）",
  goal: "small talk → pitch → follow-up：三十秒內說對的話",
  lang: "en",
  ui: "zh-TW",

  theme: { main: "#22324a", accent: "#e0902f", paper: "#eef1f5", ink: "#151b24", font: "sans" },

  bgm: {
    file: "assets/bgm/me01.mp3",
    volume: 0.1,
    suno: {
      style: "soft lo-fi morning jazz, mellow electric piano, brushed drums, warm upright bass, calm office morning, 80 bpm, unobtrusive background, instrumental, no vocals",
      title: "Eleven Floors",
    },
  },

  art: {
    ratio: "16:9",
    style: "Black-and-white Japanese manga panel art, confident ink linework, screentone shading, dramatic camera angles, high contrast, monochrome. No text, no speech bubbles, no captions, no lettering anywhere in the image.",
  },

  speech: { note: "Natural, clear spoken English at a relaxed pace." },

  cast: {
    narrator: {
      name: "Narrator", emoji: "🎙️", color: "#5b6b82",
      voice: "Iapetus", lang: "en",
      style: "a calm storyteller with a hint of suspense",
      look: "",
    },
    leo: {
      name: "Leo", emoji: "🧑‍💼", color: "#2f6fb0",
      voice: "Achird", lang: "en",
      style: "a 23-year-old new employee; earnest, a little nervous but friendly",
      look: "A 23-year-old man, slim and tall, neat short black hair with slightly messy bangs, light dress shirt with sleeves rolled to the elbow, a brand-new employee badge on a lanyard, a laptop bag over one shoulder.",
    },
    diane: {
      name: "Diane", emoji: "👩🏻‍💼", color: "#9a5b2e",
      voice: "Sulafat", lang: "en",
      style: "a warm, kind CEO in her fifties; calm, generous and a little playful, never cold",
      look: "A warm, kind-faced woman in her early fifties: chin-length bob with silver streaks, softly rounded jawline and full cheeks, gentle laugh lines, an easy genuine smile, silver-rimmed glasses, a dark blazer over a high-necked blouse, holding a paper coffee cup. Approachable and motherly, never stern.",
    },
    mia: {
      name: "Mia 老師", emoji: "👩‍🏫", color: "#e0902f",
      voice: "Aoede", lang: "zh-TW",
      style: "親切、有精神的英文老師，像在跟學生聊天，不說教",
      look: "",
    },
  },

  scenes: [
    // ── 開場：先給危機，再給身分 ─────────────────────────────
    {
      id: "s01", title: "8:52", caption: "8:52 A.M.",
      image: "Leo sprinting across a glass office lobby toward a closing elevator, seen from a low dramatic angle, motion speed lines behind him, morning light through tall windows, his laptop bag flying.",
      lines: [
        "narrator: It's 8:52. You're late.",
        "narrator: Six days into your first real job, Leo, and you're already late.",
        "narrator: The elevator doors are closing. You run.",
      ],
    },
    {
      id: "s02", title: "Not alone", caption: "Eleven floors.",
      image: "Inside an elevator, a tight two-shot: Leo on the left frozen with wide eyes and a bead of sweat; Diane on the right standing calmly with her coffee cup, both facing forward.",
      lines: [
        "narrator: You make it. Perfect.",
        "narrator: Except, you're not alone.",
        "narrator: Standing next to you is Diane Ward. She runs the whole company.",
        "narrator: Eleven floors. About thirty seconds.",
      ],
    },

    // ── 選擇一：怎麼開口 ─────────────────────────────────────
    {
      id: "q1", type: "choice", title: "Beat 1 ‧ Small talk",
      ask: "The doors close. What do you say?",
      lines: ["narrator: The doors close. What do you say?"],
      options: [
        {
          say: { who: "leo", say: "Morning! Big day for the team, huh?", hint: "早安！今天對團隊來說是大日子吧？" }, tag: "CASUAL",
          image: "Close-up of Diane turning her head slightly toward Leo with a small amused smile, Leo's shoulder blurred in the foreground.",
          then: [
            { who: "diane", say: "It is. And you must be the new one.", hint: "是啊。你一定是新來的吧。" },
            "mia: 最後那個「huh?」很厲害，它把話題交回給對方，招呼就變成了對話。",
            "mia: 對第一次見面的執行長有點隨興，算是小賭一把。這一次，賭贏了。",
          ],
        },
        {
          say: { who: "leo", say: "Good morning, Ms. Ward. It's a pleasure to finally meet you.", hint: "早安，Ward 女士。終於見到您了，很榮幸。" }, tag: "FORMAL",
          image: "Diane facing forward with a warm polite smile and one eyebrow raised in friendly surprise; Leo standing very straight beside her, hands at his sides, a stiff symmetrical composition.",
          then: [
            { who: "diane", say: "Diane, please. Ms. Ward is my mother.", hint: "叫我 Diane 就好。Ward 女士是我媽媽。" },
            "mia: 有禮貌、不會出錯。注意「finally」這個字，它偷偷說出你一直很想見她。",
            "mia: 只是太正式會拉開距離，接下來你得花時間把距離拉回來。",
          ],
        },
        {
          say: { who: "leo", say: "Good morning.", hint: "早安。" }, tag: "SAFE",
          image: "Wide shot of the elevator: Leo and Diane both facing forward in silence with a large empty space between them, the floor indicator glowing above the doors.",
          then: [
            "diane: Good morning.",
            "mia: 兩個字，沒有錯，但也讓人記不住。",
            "mia: 三十秒的空檔，你把自己的回合用掉了，換來的是更安靜的電梯。",
          ],
        },
      ],
    },

    // ── 主線過場：要對三條分支都說得通 ───────────────────────
    {
      id: "s04", title: "The door",
      image: "Dramatic low-angle close-up of Diane turning to look directly at the viewer, one eyebrow raised in genuine curiosity, focus lines converging on her face.",
      lines: [
        "narrator: Floor six. Seven.",
        "narrator: Then she does something she doesn't have to do.",
        { who: "diane", say: "So, what are you working on?", hint: "所以，你最近在忙什麼？" },
      ],
    },

    // ── 選擇二：要不要介紹自己的工作 ─────────────────────────
    {
      id: "q2", type: "choice", title: "Beat 2 ‧ The pitch",
      ask: "She asked. Twenty seconds. What do you do with them?",
      lines: ["narrator: She asked. You have about twenty seconds."],
      options: [
        {
          say: { who: "leo", say: "I'm building a tool that cuts our campaign copy from three days to three hours.", hint: "我在做一個工具，把行銷文案從三天縮短成三小時。" }, tag: "BOLD",
          image: "Leo speaking with sudden confidence, one hand raised mid-gesture, intense focus lines behind him; Diane in profile, listening with her head slightly tilted.",
          then: [
            { who: "diane", say: "Three hours. Say that again in the meeting on Thursday.", hint: "三小時。星期四開會時再說一次。" },
            "mia: 一口氣講完：先說它做什麼，再給一個數字。",
            "mia: 她可能忘了你的名字，但會記得「三天變三小時」。前提是，數字要是真的。",
          ],
        },
        {
          say: { who: "leo", say: "Can I ask you something first? What slows your marketing team down the most?", hint: "可以先請教您一件事嗎？您的行銷團隊最常卡在哪裡？" }, tag: "STRATEGIC",
          image: "Leo asking a careful question with an open, calm expression; Diane looking at him with new attention and a slight nod, quiet composition.",
          then: [
            { who: "diane", say: "Huh. Nobody's asked me that in a while.", hint: "嗯，好久沒有人問我這個了。" },
            "mia: 你把自己的二十秒讓出去，換到更有用的資訊。",
            "mia: 先問一句「Can I ask you something first?」，資深的人會注意到這份體貼。",
          ],
        },
        {
          say: { who: "leo", say: "Honestly? I'm still learning where the coffee machine is.", hint: "老實說？我還在學咖啡機在哪裡。" }, tag: "HUMAN",
          image: "Diane laughing openly, her coffee cup tilted; Leo grinning sheepishly and rubbing the back of his neck, light airy screentone with small sparkles.",
          then: [
            { who: "diane", say: "Second floor, past the printers. The good one.", hint: "二樓，經過印表機那台。比較好喝的那台。" },
            "mia: 你沒有推銷，而是讓執行長在早上八點五十二分笑了出來。",
            "mia: 生意不會在電梯裡談成，但人會在這裡決定，想不想跟你有下一次對話。",
          ],
        },
      ],
    },

    {
      id: "s06", title: "Floor ten", caption: "Nine. Ten.",
      image: "Close-up of the elevator floor indicator lighting up nine and ten, Leo and Diane reflected in the polished metal doors below, tense vertical composition.",
      lines: [
        "narrator: Floor nine. Ten.",
        "narrator: The doors are about to open. This is the last thing she'll remember.",
      ],
    },

    // ── 選擇三：怎麼收尾 ─────────────────────────────────────
    {
      id: "q3", type: "choice", title: "Beat 3 ‧ Follow-up",
      ask: "Floor eleven. The doors open. Last words?",
      lines: ["narrator: Floor eleven. The doors open."],
      options: [
        {
          say: { who: "leo", say: "Could I get fifteen minutes with you next week?", hint: "下週可以跟您約十五分鐘嗎？" }, tag: "DIRECT",
          image: "The elevator doors sliding open with bright light pouring in; Leo turning to face Diane squarely and asking; Diane pausing mid-step to consider him.",
          then: [
            { who: "diane", say: "Fifteen. Tuesday. Email my assistant.", hint: "十五分鐘。星期二。寫信給我的助理。" },
            "mia: 直接又具體。「十五分鐘」小到讓人很容易答應，「開個會」就不一定了。",
            "mia: 提出請求時，記得說出它有多大。模糊的請求，只會得到模糊的回答。",
          ],
        },
        {
          say: { who: "leo", say: "I'll send you one page. If it's boring, you'll never hear from me again.", hint: "我寄一頁給您。如果很無聊，您就不會再聽到我的消息。" }, tag: "LIGHT",
          image: "Leo smiling easily with a small shrug as Diane steps out of the elevator and glances back over her shoulder with an amused expression.",
          then: [
            { who: "diane", say: "One page. I'll read it. And I'll tell you if it's boring.", hint: "一頁。我會看。無聊的話我會告訴你。" },
            "mia: 有自信，也留了退路：你答應只寫一頁，也允許她不理你。",
            "mia: 壓力小、印象深。忙碌的人最喜歡這種隨時可以取消的小請求。",
          ],
        },
        {
          say: { who: "leo", say: "Thanks for the chat, Diane. Have a good one.", hint: "謝謝您跟我聊天，Diane。祝您有美好的一天。" }, tag: "WARM",
          image: "Diane walking away down a bright corridor with her back to the viewer; Leo still standing inside the elevator watching her go, the doors beginning to close.",
          then: [
            { who: "diane", say: "You too, Leo. My door's not as far as it looks.", hint: "你也是，Leo。我的辦公室沒有看起來那麼遠。" },
            "mia: 乾淨、溫暖，完全沒有提出請求。才上班一週，這樣也很好。",
            "mia: 只是什麼都還沒約。門是開著的，但還是要有人去敲。",
          ],
        },
      ],
    },

    // ── 結局：三條分支共用 ───────────────────────────────────
    {
      id: "s08", title: "Aftermath", caption: "Thirty seconds.",
      image: "Leo standing alone facing the just-closed elevator doors, seen from behind over his shoulder, his faint reflection in the metal, an empty office corridor stretching to the side, quiet stillness.",
      lines: [
        "narrator: The doors close behind her.",
        "narrator: Whatever happens next, it started in those thirty seconds.",
      ],
    },

    {
      id: "recap", type: "recap", title: "你今天說的三句話",
      lines: [
        "narrator: Same elevator. Same thirty seconds. Three different versions of you.",
        "mia: 三個選項都沒有錯，只是代價不一樣。知道每一句的代價，就是今天的重點。",
      ],
    },

    {
      id: "words", type: "words", title: "今天帶走的三句", voice: "leo",
      words: [
        { word: "Big day, huh?", note: "small talk", hint: "今天是大日子吧？" },
        { word: "Can I ask you something first?", note: "pitch", hint: "可以先請教您一件事嗎？" },
        { word: "Could I get fifteen minutes?", note: "follow-up", hint: "可以跟您約十五分鐘嗎？" },
      ],
      lines: [
        "mia: 今天的挑戰：找一個小空檔，走廊、排咖啡的時候、會議開始前都可以。",
        "mia: 把你這次沒有選的那一句，說出口。",
        "narrator: See you tomorrow.",
      ],
    },
  ],
});
