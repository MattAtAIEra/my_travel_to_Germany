# KK01 — Two Apples（Captain A 互動英語 EP.01）

6–10 歲台灣小朋友 ‧ **全英文沉浸** ‧ 三個選擇點 ‧ 三顆聲音 ‧ 彩色卡通畫風

> 資料夾名稱 `kk-adultEnglishLearning` 是誤植（內容是兒童向），Matt 會另行改名。

## 規格

| | |
| --- | --- |
| 語言 | **全英語**（旁白與畫面文字皆是；`--lang en`） |
| 單次遊玩 | **1:24–1:44**（27 條路徑，中位 1:32）；含選擇思考約 1:50 |
| 重玩性 | 3 個選擇點 × 3 選項 = 27 種組合 |
| 語音 | 三顆 ElevenLabs 聲音（`eleven_multilingual_v2`），57 顆 mp3、1.9 MB |
| ├ Captain A | `hd5CZt9EmlupFYXziBnV` × 14 句 |
| ├ Funky | `cgSgspJ2msm6clMCkdW9` × 27 句 |
| └ Rex | `iHiL14jSTiWXy4nzDtbq` × 16 句 |
| 圖 | Gemini `gemini-3.1-flash-image`，13 張滿版場景圖 |
| BGM | `BGM/Marimba Smile.mp3`（2:04，循環，音量 **0.11**） |
| 主題 | `kkfun`（為此案新建） |
| 場景 | 18（主線 6 + choice 3 + 分支 9） |
| 句數 | 60（57 句錄音 + 3 句 RECAP 重播） |
| 已花成本 | 圖 **$2.12**（含兩輪連戲與表情修正）＋ 語音 ~1,050 字元 |

## 結構

```
WARM-UP  s01 s02              悄悄話 → Funky 衝進來（她聽到了）
ROUND 1  s03 → s04a/b/c       Captain A 怎麼回      劇情，三個都對
ROUND 2  s05 → s06a/b/c       Rex 怎麼秀一手        劇情，三個都對
QUIZ     s07 s08 → s09a/b/c   幫 Funky 說對          測驗，有標準答案
         s10                  結局：三個人一起洗蘋果
RECAP    s11                  重播你選過的三句
         s12                  今日單字卡
```

一人主持一關：**Captain A → Rex → Funky**。孩子會感覺每個角色都需要他幫忙，
RECAP 重播的三句也自然來自三顆不同的聲音。

教學設計、逐句台詞與換一集的骨架在 `script.md`，那裡也寫了**五條硬約束** ——
全篇英語、三條測驗分支都要念到正解、測驗出在 Funky 身上不出在孩子身上、
題目與鋪陳不可包含正解、Captain A 不糾正只示範。

## 畫風：用客戶的真圖鎖，不用文字重生

`CaptionA.jpg` / `Funky.jpg` 是客戶給的畫風基準。角色參考**直接餵原圖**：

```
images/characters/CAPTAIN_A.jpg   ← CaptionA.jpg 原檔
images/characters/FUNKY.jpg       ← Funky.jpg 原檔
images/characters/REX.jpg         ← 從 CaptionA.jpg 裁出肩上的小恐龍
```

Rex 只存在於 Captain A 那張圖的右肩上，裁出來他才能單獨出現在構圖裡。

**生圖一定要帶 `--skip-refs`** —— 不加的話腳本會照文字描述生成角色表，
把這三張真圖覆蓋掉。`--skip-refs` 只關掉「產生」，不影響「使用」。

## 主題 `kkfun`

色值全部取自那兩張圖（遮罩白底與膚色後統計色相，再分區定點取樣），未自創：

| Token | 色值 | 出處 |
| --- | --- | --- |
| `--primary` | `#2060b0` | Captain A 的 POLO ＋ Rex 的帽子，全圖 16.7% 最主色 |
| `--secondary` | `#2050a0` | 深一階的藍：書本、衣褶陰影，11.0% |
| `--accent` | `#d04830` | Rex 的領巾紅 —— 兩張圖裡唯一的強暖紅 |
| `--warn` | `#f8b040` | Funky 花冠上的琥珀黃 |
| `--cream` | `#fdebd5` | CaptionA 的背景奶油，39.8% |
| `--ink` | `#332a20` | 描邊墨（暖黑，非純黑） |
| `--kk-pink` | `#f09090` | Funky 花冠的珊瑚粉 —— 她的代表色 |

**頁面底色就是插圖的底色。** 沒有配圖的場景（choice／recap／單字卡）因此跟滿版
插圖無縫接續，換場不會有「插圖區」和「介面區」兩塊的斷裂感。

`kkfun` 自帶完整的 choice／recap 版面 —— base template 沒有這套 CSS，只有
`manga` 和 `kkfun` 各有一份。細節見 `references/themes.md`。

## 說話者角標

三個角色講英文，字幕上分不出誰在講話對兒童是致命的。字幕條左側的角色膠囊
用 `subs.json` 的 `speaker` 欄位驅動，顏色直接對應圖裡看得到的東西：

| 角色 | 顏色 | 來源 |
| --- | --- | --- |
| Captain A | 寶藍 | 他的衣服 |
| Funky | 珊瑚粉 | 她的花 |
| Rex | 領巾紅 | 他的領巾 |

不用教就認得。`speaker` 只給眼睛看、不進 TTS。

## 重建

```bash
# 1. 圖（13 張，$1.31 全新生成）—— 先報價
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py \
  scenes.json --out images/ --skip-refs --estimate
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py \
  scenes.json --out images/ --skip-refs

# 2. 語音（57 顆三聲道）—— 聲音表在 KK01.subs.json 的 voices 欄位
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/tts_elevenlabs.py \
  KK01.subs.json --out audio/ --model eleven_multilingual_v2
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/sync_durations.py \
  KK01.subs.json --audio audio/

# 3. 組裝
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/build_html.py \
  --subs KK01.subs.json --scenes scenes.json --theme kkfun --lang en \
  --out index.html --require-cues --scene-gap 2 \
  --bgm "BGM/Marimba Smile.mp3" --bgm-volume 0.11
```

### 背景音樂

`--bgm-volume 0.11`（預設是 0.15）。馬林巴是明亮的敲擊音色，比環境墊音更會穿透
人聲 —— 而這份的學習內容就是那些英文單字，**清晰度優先於氣氛**。BGM 循環播放，
結尾隨旁白一起淡出。

**這個數字還沒有經過耳朵驗證** —— 程式只能確認音量確實套用到元素上，蓋不蓋得過
人聲要真的聽。先聽 `KK01-012.mp3`（拼字那句，最怕被蓋掉）。改音量只要重跑 build，
不必重錄。

檔名有空格，`file://` 下由瀏覽器自行 percent-encode（驗收會印出解析後的 URL 存證）。

金鑰放在專案根目錄 `.env`，腳本自己會讀，指令不必帶前綴。

**`--lang en`** —— 全篇英語，`lang` 屬性要正確（螢幕閱讀器與斷行）。`en` 會在
theme 之後注入 Inter/Helvetica 的字型 stack，所以 `kkfun` 的 `--display-font`
標了 `!important` 把 Chalkboard 圓體保下來 —— 那個字型是兒童教材的品牌本身。

## 驗收

```bash
node verify.mjs        # 44 項：旁白音檔、：互動分支、說話者角標、BGM、圖片載入、版面溢出、零 JS 錯誤
```

**版面數字要配截圖看。** 第一版驗收「全數通過」但 choice 場景只量到 136px ——
數字是對的，錯的是版面：三張選項卡被排成一列小膠囊擠在畫面上緣。截圖才看得出來。
修好後同一個量測是 383px。

## 待辦

1. **試聽重點**（程式驗不到的部分）

   | 音檔 | 檢查點 |
   | --- | --- |
   | `KK01-012.mp3` | `A - P - P - L - E` 的拼字速度與 BGM 的平衡 |
   | `KK01-004.mp3` | `Captain A~~~~!` 的波浪號會不會變成怪停頓 |
   | `KK01-024.mp3` | `Super... Big Smart!` 接 `Very smart, Funky.` 的笑點有沒有成立 |

## 已知取捨

- **`s04b` 那張 Captain A 胸前的 A 字補丁掉了。** 這張是為了修 Funky 的兇臉重生的
  第二版，重生第三次有機會把兇臉帶回來 —— 一個補丁不值得冒這個險。真要修：
  `--only s04b --force`，約 $0.10。
- **圖花了 $2.12 而不是報價的 $1.31。** 多的是兩輪修正：7 張場景漂移到戶外
  （同一段對話中間換到公園，孩子會出戲）＋ 1 張 Funky 被畫成皺眉瞇眼吐舌的兇臉。
  兩者都是會被客戶當場指出來的問題，不是我加戲。
- **`--scene-gap 2` 沿用公版。** 兒童注意力短，配音後若覺得拖沓可降到 1.5 再重建
  （不必重錄）。
- **音檔與圖不進 git**（`audio/` 已在 `.gitignore`；`images/` 3.8MB）。
