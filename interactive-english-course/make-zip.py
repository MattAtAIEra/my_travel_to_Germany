#!/usr/bin/env python3
"""把 starter-kit/ 打包成 starter-kit.zip（學生從課程手冊下載的那一包）。

每次改了 starter-kit 裡的任何檔案，都要重新執行一次：
    python3 make-zip.py

打包時固定每個檔案的時間戳記，內容沒變的話 zip 也一模一樣，git 不會出現假的修改。
assets/ 裡產生出來的聲音和圖片不打包（學生要自己產生），只保留說明檔。
"""
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "starter-kit")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "starter-kit.zip")
SKIP_NAMES = {".DS_Store", "Thumbs.db"}
MEDIA = (".mp3", ".wav", ".ogg", ".jpg", ".jpeg", ".png", ".webp")


def files():
    for root, dirs, names in os.walk(SRC):
        dirs[:] = sorted(d for d in dirs if d not in {"node_modules", ".git"})
        for name in sorted(names):
            if name in SKIP_NAMES:
                continue
            rel = os.path.relpath(os.path.join(root, name), SRC).replace(os.sep, "/")
            if rel.startswith("assets/") and name.lower().endswith(MEDIA):
                continue
            yield rel


with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for rel in files():
        info = zipfile.ZipInfo("starter-kit/" + rel, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        with open(os.path.join(SRC, rel), "rb") as f:
            z.writestr(info, f.read())
print("已產生", os.path.relpath(OUT, HERE))
