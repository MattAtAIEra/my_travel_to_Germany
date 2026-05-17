# 圖片與媒體壓縮指南

這份指南用來縮小網站的圖片／音訊／影片體積，改善載入速度與 SEO
（Core Web Vitals）。請在**本機、於專案資料夾內**用 Claude CLI 執行。

## 為什麼要做

目前媒體檔總和約 19 MB，其中單張 `20220911_162427.jpg` 就有 6.5 MB，
在手機上會明顯拖慢載入，也會壓低 Google 的頁面速度評分。

| 檔案 | 目前大小 | 壓縮後預估 |
|---|---|---|
| 20220911_162427.jpg | 6.5 MB | ~0.4 MB |
| IMG_0348.jpg | 2.1 MB | ~0.3 MB |
| IMG_8628.jpg | 1.0 MB | ~0.3 MB |
| 02_selfie.jpg | 0.9 MB | ~0.3 MB |
| IMG_0436.jpg | 0.5 MB | ~0.25 MB |
| bgm.mp3 | 5.5 MB | ~2.2 MB（選用） |
| IMG_0359.MOV | 3.2 MB | ~1.2 MB（選用） |

## 重要原則

- **檔名不可更動**：`index.htm` 與 `index_slideshow_v3.htm` 都以現有檔名引用，
  改名會導致圖片失效。以下指令都是「原地覆蓋、保留檔名」。
- **git 就是備份**：這些檔案都已被 git 追蹤。若壓縮結果不滿意，
  用 `git checkout -- <檔名>` 即可還原。請務必在 commit 前先檢視成果。

---

## 步驟一：安裝工具

需要 ImageMagick（圖片）。音訊／影片步驟另需 ffmpeg。

```bash
# macOS
brew install imagemagick ffmpeg

# Ubuntu / Debian
sudo apt-get install imagemagick ffmpeg
```

---

## 步驟二：壓縮 JPEG 圖片（主要步驟）

把所有 JPG 的長邊縮到最大 1920px（足夠微電影 1920×1080 滿版與相簿使用），
JPEG 品質設為 82，並移除 EXIF 等中繼資料。原地覆蓋、檔名不變。

```bash
# ImageMagick v7
magick mogrify -resize "1920x1920>" -quality 82 -strip *.jpg

# 若是 ImageMagick v6，指令改為：
# mogrify -resize "1920x1920>" -quality 82 -strip *.jpg
```

說明：
- `1920x1920>` 的 `>` 代表「只縮小、不放大」，已小於 1920 的圖片不會被放大。
- `-quality 82` 是品質與體積的平衡點；若覺得畫質不夠，改成 `88` 再跑一次
  （需先 `git checkout -- *.jpg` 還原再重壓）。
- `-strip` 移除中繼資料，可再省一些體積。

---

## 步驟三（選用）：壓縮背景音樂

`bgm.mp3` 目前約 5.5 MB，背景音樂用 128 kbps 已足夠。

```bash
ffmpeg -i bgm.mp3 -b:a 128k -map_metadata -1 bgm_compressed.mp3
# 確認 bgm_compressed.mp3 聽起來沒問題後，再覆蓋原檔：
mv bgm_compressed.mp3 bgm.mp3
```

---

## 步驟四（選用）：壓縮轉場影片

`IMG_0359.MOV`（微電影 scene 3 使用）可重新編碼縮小。
注意：若想改用 `.mp4`，**必須一併修改** `index_slideshow_v3.htm` 中
`movieScript.assets` 的 `video_03_transition` 檔名，否則影片會載入失敗。
最簡單的做法是維持 `.MOV` 副檔名、只重新編碼：

```bash
ffmpeg -i IMG_0359.MOV -vcodec libx264 -crf 26 -an IMG_0359_new.MOV
# 確認畫面沒問題後覆蓋：
mv IMG_0359_new.MOV IMG_0359.MOV
```

（`-an` 會移除影片聲音，因為微電影本來就用 `bgm.mp3` 當配樂。）

---

## 步驟五：驗證成果

```bash
# 比較壓縮後大小
ls -lah *.jpg *.mp3 *.MOV

# 確認 git 偵測到的變更
git status --short
```

接著用瀏覽器開啟 `index.htm` 與 `index_slideshow_v3.htm`，
檢查每張圖片與微電影畫質是否仍可接受。滿意後再 commit。

---

## 進階（選用）：WebP 格式

WebP 通常比 JPEG 再小 25–35%，但需要把 HTML 的 `<img>` 改寫成 `<picture>`
並提供 JPEG 後備。若想做，可另外提出，我再協助修改 HTML。
