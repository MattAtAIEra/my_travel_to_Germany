# ME01 — The Elevator（晨間互動英語範本）

全英文沉浸、B1–B2 職場日常、日漫分鏡風。三十秒的電梯偶遇，三個選擇點，
選完收回主線，結尾重播**你自己選過的那三句話**。

這同時是 `dynamic-deck` 互動分支能力的首發範例。

## 規格

| | |
| --- | --- |
| 單次遊玩 | 3:05（純播放，27 條路徑落在 2:54–3:16）；含選擇思考約 3:35 |
| 重玩性 | 3 個選擇點 × 3 選項 = 27 種組合，台詞完全不同 |
| 語音 | **三顆聲音**（ElevenLabs `eleven_multilingual_v2`），77 顆 mp3 |
| ├ 旁白 | `0sGQQaD2G2X1s87kHM5b` × 58 句 |
| ├ LEO（你） | `hd5CZt9EmlupFYXziBnV` × 9 句 —— 九個選項的台詞 |
| └ DIANE（主管） | `YyqkX0AHv8W5D1vxG9lR` × 10 句 —— 每個分支都有她的回應 |
| 圖 | Gemini `gemini-3.1-flash-image`，15 張場景 + 2 張角色參考 |
| 主題 | `manga` |
| 場景 | 19（主線 7 + choice 3 + 分支 9） |
| 句數 | 80（77 句錄音 + 3 句 RECAP 重播） |
| 實際成本 | 語音 ~$0.75 + 圖 $1.65 = **~$2.40**（含改稿重錄） |

## 結構

```
COLD OPEN  s01 s02          8:52，你遲到了，衝進電梯 —— 裡面站著經營整間公司的人
BEAT 1     s03 → s04a/b/c   怎麼開口          small talk
BEAT 2     s05 s06 → s07a/b/c  要不要 pitch    AI 行銷工具 / 聊生活
BEAT 3     s08 s09 → s10a/b/c  怎麼收尾        follow-up
           s10z             結局（九條分支共用）
RECAP      s11              重播你選過的三句
OUTRO      s12              今日 challenge
```

三個選擇點對應職場英語三段式：**small talk → pitch → follow-up**。
三個選項都是「對的」答案 —— 解說講的是**代價與時機**，不是對錯。

## 重建

```bash
# 1. 語音（77 顆三聲道，~$0.75）—— 聲音表寫在 ME01.subs.json 的 voices 欄位
ELEVENLABS_API_KEY=... python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/tts_elevenlabs.py \
  ME01.subs.json --out audio/ --model eleven_multilingual_v2
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/sync_durations.py ME01.subs.json --audio audio/

# 2. 圖（17 張含角色參考，~$1.65）—— 先報價
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py scenes.json --out images/ --estimate
GEMINI_API_KEY=... python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/gen_images.py scenes.json --out images/

# 3. 圖片瘦身（黑白線稿 → 1600px 灰階，-40%）
for f in images/*.jpg images/characters/*.jpg; do
  magick "$f" -resize 1600x -colorspace Gray -quality 85 "$f.tmp" && mv "$f.tmp" "$f"
done

# 4. 組裝
python3 ../../plugins/dynamic-deck/skills/dynamic-deck/scripts/build_html.py \
  --subs ME01.subs.json --scenes scenes.json --theme manga --lang en \
  --out index.html --require-cues --scene-gap 2
```

**生圖順序有講究**：先只跑 `--only s02`（LEO 與 DIANE 同框那張），
`gen_images.py` 會先產出兩張角色參考圖再拿去鎖長相 —— 臉確認 OK 再燒其餘 14 張，
否則角色不對就是 15 張一起重來。

## 換一集

劇本結構就是模板（見 `script.md`）：換情境、換三個選擇點的題材，其餘骨架照抄 ——
`track` 命名（`b1a`–`b3c`）、每分支 5 句（LEO 台詞 → DIANE 回應 → 三句解說）、
主線過場必須對三條分支都成立、結局場景九條共用、RECAP 重播三句、OUTRO 一句 challenge。

**角色設定有一條硬約束**：DIANE 不可以是刻薄嚴厲的長輩。學習者每天早上要面對
這個角色，令人生畏的人設會讓人下意識不想打開這一集 —— 很有經驗不代表要刻薄。
這條同時約束畫風（圓下巴、笑紋、溫暖）與人設。

## 驗收

```bash
node verify.mjs            # 30 項互動驗收，需要 Chrome（走 CDP，不必裝 playwright）
```

驗證進入等待、數字鍵選擇、未選分支隱形、分支收回主線、RECAP 重播與實選一致、
重播清空、圖片載入、零 JS 錯誤。改劇本後這支腳本裡的期望值要一起更新。

## 已知取捨

- **長度 3:05，短於原訂的 5 分鐘**。ElevenLabs 這顆聲音語速偏快（實測 2.8 秒/句）。
  維持緊湊版是刻意的決定 —— 趕上班前更容易完成，重玩不同分支自然會超過五分鐘。
  要補到五分鐘的話：主線再加 ~15 句、每分支加 2 句，補錄約 $0.35，不必重新生圖。
- **每個分支都有 DIANE 的回應**（9 句），對話才像對話。她的回應**不引用其他分支
  發生過的事** —— hub-and-spoke 下 BEAT 3 可能接在任何 BEAT 2 之後，引用前文必穿幫。
- **音檔與圖不進 git**（`audio/` 已在 `.gitignore`；`images/` 7MB）。
  用上面的指令可完整重建。
