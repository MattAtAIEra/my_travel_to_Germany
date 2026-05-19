# ----------------------------------------------------------------------
# 杜塞道夫光影詩集 — 靜態網站容器
# 純靜態檔案（HTML／圖片／音訊／影片），以 nginx 提供服務，
# 供 Google Cloud Run 部署使用。
# ----------------------------------------------------------------------
FROM nginx:1.27-alpine

# 套用自訂設定：監聽 Cloud Run 的 8080 埠、首頁設為 index.htm
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製網站檔案（不需打包的項目見 .dockerignore）
COPY . /usr/share/nginx/html

# 移除一併被複製進網站根目錄的設定檔，避免對外可讀
RUN rm -f /usr/share/nginx/html/nginx.conf

# 僅作說明用途；Cloud Run 實際以 PORT 環境變數（預設 8080）為準
EXPOSE 8080
