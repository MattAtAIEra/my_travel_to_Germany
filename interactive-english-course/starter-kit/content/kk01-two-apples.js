/* ==========================================================================
   範例一：KK01 Two Apples（兒童英語，6–10 歲）

   這一集只教一件事：「兩個以上要加 s」（two apples）。
   三個選擇點，一個角色負責一關：Captain A → Rex → Funky。
   最後一關是測驗，而且題目出在 Funky 阿姨身上——孩子是在「幫忙」，不是「被考」。

   五條規則（寫新的一集也要遵守）：
     1. 全篇英語，畫面上的字也是。
     2. 測驗題的三條分支，都要有人說出正確答案。
     3. 測驗題出在角色身上，不出在孩子身上。
     4. 題目和前面的台詞，不可以出現正確答案。
     5. Captain A 不糾正 Funky，他用「示範」代替「糾正」。
   ========================================================================== */
LESSON.add({
  id: "kk01",
  title: "Two Apples",
  subtitle: "Captain A ‧ EP.01",
  learner: "6–10 歲小朋友",
  goal: "apple ‧ an apple ‧ two apples",
  lang: "en",
  ui: "en",

  theme: { main: "#2060b0", accent: "#d04830", paper: "#fdebd5", ink: "#332a20", font: "rounded" },

  // 背景音樂：用 Suno 做好之後，存成 assets/bgm/kk01.mp3
  bgm: {
    file: "assets/bgm/kk01.mp3",
    volume: 0.11,
    suno: {
      style: "cheerful marimba and ukulele, light hand claps, bouncy children's cartoon, warm kitchen morning, 100 bpm, simple happy melody, instrumental, no vocals",
      title: "Two Apples Kitchen",
    },
  },

  // 畫風：每一張圖都會帶上這一段，整集的圖才會像同一本繪本
  art: {
    ratio: "16:9",
    style: "Bright full-colour cartoon illustration in a clean modern storybook style: bold uniform dark-brown outlines, flat colour fills with soft simple cel shading, warm cream background, friendly rounded shapes, wholesome and cheerful, expressive cartoon acting. Children's English-learning material for six to ten year olds. The scene takes place in the same bright cosy home kitchen: warm wood cabinets, a patterned tile backsplash, a sunny window and a wooden countertop. No written words, speech bubbles, captions or signage anywhere in the image.",
  },

  // 語音的共同要求（會加在每一句的語氣說明後面）
  speech: { note: "Clear, friendly English for young children, a little slower than normal." },

  cast: {
    captain: {
      name: "Captain A", emoji: "🧢", color: "#2060b0",
      voice: "Puck", lang: "en",
      style: "a gentle, shy and patient young man; warm and calm, never stern",
      look: "A gentle, handsome young Taiwanese man in his early twenties, tall and slim, soft messy black hair with spiky bangs, warm dark eyes, a shy kind smile, wearing a bright royal-blue polo shirt with a small white letter A patch on the chest.",
    },
    funky: {
      name: "Funky", emoji: "🌸", color: "#e0707a",
      voice: "Laomedeia", lang: "en",
      style: "an excited, funny and very enthusiastic auntie; great pronunciation but not confident, a bit hesitant",
      look: "A cheerful Taiwanese woman in her fifties, chin-length wavy auburn-brown hair with silver streaks, round rosy cheeks, warm smiling eyes with laugh lines, an enormous crown of colourful flowers and strawberries on her head, a cream cardigan over a small-floral blouse, colourful beaded necklaces. Always joyful and kind, never frowning.",
    },
    rex: {
      name: "Rex", emoji: "🦕", color: "#d04830",
      voice: "Fenrir", lang: "en",
      style: "a small clever cartoon dinosaur; bright, bouncy and a little bit of a show-off",
      look: "A small friendly cartoon dinosaur about the size of a house cat: a chubby grey-brown long-necked sauropod with cream spots, big round eyes, a wide happy smile, a little royal-blue baseball cap with a white letter A and a red bandana. He always rides on Captain A's shoulder.",
    },
  },

  scenes: [
    // ── 暖場 ────────────────────────────────────────────────
    {
      id: "s01", title: "The secret", caption: "Shhh...",
      image: "Captain A leans down with one hand cupped beside his mouth, whispering a secret; Rex sits on his shoulder and tilts his big head in close to listen. Playful, mischievous mood.",
      lines: [
        "captain: Pssst... Rex. Come here.",
        "captain: Funky is so crazy today!",
        "rex: Shhh! Don't let her hear!",
      ],
    },
    {
      id: "s02", title: "She heard that", caption: "She heard that.",
      image: "Funky bursts in from the left with both hands on her hips and sparkling eyes, holding one shiny red apple high above her head; Captain A jumps in fright; Rex topples backwards on his shoulder, laughing.",
      lines: [
        { who: "funky", say: "Captain A~~~~!", style: "calling out loudly and happily" },
        "funky: Quick, quick! Look what I have!",
      ],
    },

    // ── ROUND 1：Captain A 怎麼回？（劇情選擇，三個都對）──────
    {
      id: "q1", type: "choice", title: "Round 1",
      ask: "What does Captain A say?",
      lines: [
        "funky: Apple! Look! Apple!",
        "funky: Wait, no... how do you say it in English?",
      ],
      options: [
        {
          say: "captain: It's an apple.", tag: "FULL SENTENCE",
          image: "Captain A calmly holds up one finger with a patient smile; Funky leans in with a huge delighted 'aha!' face, hands up beside her cheeks; Rex nods on his shoulder. One red apple sits on the counter.",
          then: [
            "funky: It's an apple... Ohhh! You put an 'an' in front!",
            "rex: An apple. One apple.",
            "captain: Yes. One apple.",
          ],
        },
        {
          say: "captain: Apple. A - P - P - L - E.", tag: "SPELL IT",
          image: "Captain A counts five fingers one by one with an encouraging smile; Funky copies him on her own fingers, her face lit up with a huge happy grin; Rex bounces on his shoulder, unable to wait his turn.",
          then: [
            "funky: A - P - P - L - E... Oh! Slowly, I can do it!",
            "rex: A - P - P - L - E! Apple!",
            "funky: Rex! You are too fast!",
          ],
        },
        {
          say: "captain: You just said it, Funky.", tag: "CHEEKY", caption: "(Funky... you already said it.)",
          image: "Captain A gives a tiny shy amused smile, rubbing the back of his neck; Funky points at her own nose with a baffled, head-tilted look; Rex covers his mouth with both claws, giggling.",
          then: [
            "funky: I said it? ...Did I?",
            "captain: You did. Apple.",
            "funky: Oh! Then I am very good!",
          ],
        },
      ],
    },

    // ── ROUND 2：Rex 要怎麼秀一手？（劇情選擇，三個都對）──────
    {
      id: "q2", type: "choice", title: "Round 2",
      ask: "How does Rex show off?",
      lines: [
        "funky: And Rex? Rex, do you know it too?",
        "rex: Ask me! Ask me!",
      ],
      options: [
        {
          say: "rex: Of course! Apple!", tag: "PROUD",
          image: "Rex stands tall on Captain A's shoulder, puffing out his chest, chin high; Funky throws both arms up in amazement, her flower crown bouncing; Captain A laughs warmly with his eyes closed.",
          then: [
            "funky: Wow! Rex is so smart!",
            "funky: Super... Big Smart!",
            // 示範代替糾正：他沒有說「錯了」，只是把正確的說法自然地說一次
            "captain: Very smart, Funky. Very smart.",
          ],
        },
        {
          say: "rex: A - P - P - L - E! Very easy!", tag: "SPELLING STAR",
          image: "Rex spreads his little claws wide mid-performance, mouth open in a confident announcement; Funky covers her mouth with both hands, eyes huge with astonishment; Captain A smiles proudly at his small friend.",
          then: [
            "funky: Amazing! The little dinosaur can spell!",
            "captain: He practices every day.",
            "rex: Every day!",
          ],
        },
        {
          say: "rex: Apple, apple, apple!", tag: "CAN'T STOP",
          image: "Rex chatters nonstop with his mouth wide open and eyes squeezed shut; Funky holds up both palms in a laughing 'okay, okay!' gesture; Captain A presses his lips together, trying not to laugh.",
          then: [
            "funky: Okay, okay! I know, I know!",
            "captain: He gets excited.",
            "rex: ...Apple.",
          ],
        },
      ],
    },

    // ── 測驗：幫 Funky 說對（有標準答案）────────────────────
    {
      id: "s07", title: "Two of them", caption: "Two of them.",
      image: "Funky holds up two shiny red apples, one in each hand, toward Captain A with a delighted grin; Captain A accepts them with a resigned but gentle smile; Rex leans down to peer at the two apples. The two apples are clearly visible in the centre.",
      lines: [
        "funky: Captain A~~~! Quick, quick!",
        "funky: Go wash them for me and Rex! Now!",
        "captain: Yes, Funky...",
      ],
    },
    {
      id: "q3", type: "quiz", title: "Quiz",
      // 題目不可以出現正確答案：所以不寫 "How do you say two apples?"
      ask: "Funky has 2. What does she say?",
      lines: ["funky: Wait... I have 2. How do I say it?"],
      options: [
        {
          say: "funky: Two apple!",
          image: "Funky announces proudly with her chin up, holding the two red apples; Rex lifts one small claw with a kind encouraging face; Captain A smiles warmly. Nobody looks disappointed.",
          then: [
            "rex: Ooh! Almost! Two apples.",
            "rex: Two! So we add an s. Apples!",
            "funky: Ohhh! I need an s!",
          ],
        },
        {
          say: "funky: Two apples!", correct: true,
          image: "Funky beams with both fists raised in triumph, the two red apples tucked under one arm; Rex cheers with both claws in the air; Captain A claps softly with a proud smile. Celebratory confetti shapes.",
          then: [
            "rex: Yes! Two apples!",
            "captain: Perfect, Funky.",
            "funky: I did it! I said it right!",
          ],
        },
        {
          say: "funky: Apple two!",
          image: "Funky tilts her head with a puzzled but cheerful look; Rex gestures with both claws from left to right as if putting two things in order; the two red apples sit on the counter; Captain A watches fondly.",
          then: [
            "rex: Hmm! Number first. Two apples.",
            "rex: Two apples. With an s!",
            "funky: Oh! The number goes first!",
          ],
        },
      ],
    },

    // ── 結局 ────────────────────────────────────────────────
    {
      id: "s10", title: "Washing apples", caption: "Apple washing time!",
      image: "All three at a bright kitchen sink washing two red apples under running water, cheerful droplets and bubbles splashing; Funky laughs with her head back; Captain A holds an apple under the tap with a contented smile; Rex catches a droplet on his nose.",
      lines: [
        "funky: Captain A! Rex! Let's wash the apples!",
        "captain: Two apples, coming up.",
        "rex: Two apples! With an s!",
        "funky: What a wonderful day!",
      ],
    },

    // ── 回顧：重播孩子選過的句子（測驗題重播正確答案）──────────
    {
      id: "recap", type: "recap", title: "Your lines",
      lines: ["funky: Say them with me, one more time!"],
    },

    // ── 單字卡 ──────────────────────────────────────────────
    {
      id: "words", type: "words", title: "Today's words", voice: "captain",
      words: [
        { word: "apple", note: "just one" },
        { word: "an apple", note: "one apple" },
        { word: "two apples", note: "more than one: add an s!" },
      ],
      lines: [
        "captain: Today's words.",
        "rex: More than one? Add an s!",
        "funky: Apple... two apples! I remember!",
        "rex: See you tomorrow!",
      ],
    },
  ],
});
