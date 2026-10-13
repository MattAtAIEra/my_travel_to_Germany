# assets：素材放這裡

每一集一個資料夾，資料夾名稱就是題庫裡的 `id`：

```
assets/
├── kk01/
│   ├── images/   s01.jpg、q1-a.jpg、cast-captain.jpg……（工作台會自動取名）
│   └── audio/    s01-1.mp3、q1-a-1.mp3……（工作台會自動取名）
└── bgm/          背景音樂，例如 kk01.mp3（自己從 Suno 下載後改名放進來）
```

檔名是「約定」好的：播放器看到第 `s01` 場，就會去找 `assets/kk01/images/s01.jpg`；
看到 `s01` 的第 1 句，就會去找 `assets/kk01/audio/s01-1.mp3`。所以檔名不要自己改。

- 圖可以是 `.jpg`、`.png`、`.webp`；聲音可以是 `.mp3`、`.wav`。
- 自己畫的圖、自己錄的聲音也可以，照同樣的檔名放進來就會被用到。
- 檔名大小寫要一模一樣（Netlify 上 `S01.JPG` 和 `s01.jpg` 是不同的檔案）。
