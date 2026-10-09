# 操作手冊：GitHub ＋ Netlify 連動（給第一次做的學生）

`index.html` 是一份可以直接在瀏覽器打開、也可以列印成 PDF 的操作手冊。主要步驟有 23 步，其中畫面比較多的幾步再拆成小步驟（5-1、10-1、10-2、14-1），一共 27 個打勾格。每一步一張圖（步驟 19 有兩張）、一句「你會看到」、一個「卡住了？」。學生每做完一步可以打勾，進度存在他自己的瀏覽器裡；左側目錄下方的「n/27」會依手冊裡的打勾格數量自動計算。

## 截圖怎麼補

手冊裡每一步都有一個固定檔名的圖片位置。`images/` 裡有那個檔名的截圖，就顯示真實畫面；沒有的，先用程式畫的示意圖（灰底、紅框標出要按的地方）頂著。

把截圖**用下面的檔名**存進 `images/`，重新整理頁面就會自動換成真實畫面，示意圖消失。建議用 Chrome 視窗寬 1440px、不要截到個人資料（email、recovery codes 打碼）。

打開 `index.html?teacher=1`，每一張還沒有真實截圖的位置右上角會顯示黃色標籤寫出檔名，方便對照。

### 每一步對應的檔名

小步驟的檔名沿用前一步的編號再加 `-1`。步驟 12～16 的檔名編號比步驟多 1（12 號是手冊沒用到的 `12-netlify-home.png`）；步驟 17 以後多 2（18 號原本是「選 Git provider」的畫面，這個畫面已經包含在步驟 15 的首頁裡，所以拿掉了）。照表存就不會錯。

| 步驟 | 檔名 | 要截的畫面 | 狀態 |
| --- | --- | --- | --- |
| 1 | `01-github-home.png` | GitHub 首頁，右上角 Sign up | 已有 |
| 2 | `02-github-signup.png` | 註冊表單（同一頁填 Email／Password／Username／Country） | 已有 |
| 3 | `03-github-code.png` | Confirm your email address，輸入 8 位數 launch code | 已有 |
| 4 | `04-github-plan.png` | 選 Free 方案 | 待補 |
| 5 | `05-github-2fa-settings.png` | Password and authentication 頁的 Two-factor authentication 區塊 | 已有 |
| 5-1（選做） | `05-github-passkey-settings.png` | 頭像選單 Settings → Password and authentication → Passkeys 的路徑 | 已有 |
| 6 | `06-github-2fa-qr.png` | Setup authenticator app，掃 QR code、輸入 6 位數（QR 已打碼） | 已有 |
| 7 | `07-github-recovery.png` | Recovery codes 頁（碼要打碼） | 待補 |
| 8 | `08-github-login-2fa.png` | 登入時要求 6 位數的畫面 | 待補 |
| 9 | `09-github-new-repo.png` | New repository 表單 | 已有 |
| 10 | `10-github-new-file.png` | repo 首頁 Add file 選單 → Create new file | 已有 |
| 10-1 | `10-1-github-paste-content.png` | 檔名 index.html、貼上網頁內容、Commit changes… | 已有 |
| 10-2 | `10-1-github-commit.png` | Commit changes 視窗 | 已有 |
| 11 | `11-github-repo-files.png` | repo 首頁，兩個檔案 | 已有 |
| 12 | `13-netlify-signup.png` | Netlify 註冊頁，Sign up with GitHub | 已有 |
| 13 | `14-github-authorize.png` | GitHub 的 Authorize Netlify Auth | 已有 |
| 14 | `15-netlify-team.png` | What is the name of your team?，Continue to deploy | 已有 |
| 14-1 | `15-1-netlify-ignore-notfound.png` | 取完團隊名稱後過渡用的 Page not found，按 Back to home | 已有 |
| 15 | `16-netlify-overview.png` | Projects 首頁 Add your project to Netlify，Import a Git repository 的 GitHub | 已有 |
| 16 | `17-import-from-github.png` | 按 GitHub 後跳出的授權視窗（Netlify by Netlify wants access…） | 已有 |
| 17 | `19-github-install-netlify.png` | Install Netlify，Only select repositories | 已有 |
| 18 | `20-netlify-pick-repo.png` | repo 清單 | 已有 |
| 19 | `21-change-project-name.png` | Review configuration 上半部，改 Project name | 已有 |
| 19 | `21-1-netlify-deploy.png` | Review configuration 最下面，Deploy 按鈕 | 已有 |
| 20 | `22-netlify-published.png` | 專案首頁，Published 與網址 | 待補 |
| 21 | `23-netlify-rename.png` | Project details → Change project name | 待補 |
| 22 | `24-github-edit.png` | GitHub 線上編輯 index.html | 待補 |
| 23 | `25-netlify-deploys.png` | Deploys 頁，新的一筆 Published | 待補 |

另外 `12-netlify-home.png`（Netlify 首頁）與 `03-github-login.png`（GitHub 登入頁）已抓到但手冊目前沒用到，留著備用。

`21-1-netlify-deploy.png` 原本存成 `22-netlify-published.png`，但畫面內容是設定頁最下面的 Deploy 按鈕，屬於步驟 19，所以改了檔名。`22-netlify-published.png` 留給步驟 20 的「部署完成、看到網址」畫面。

### 截圖的顯示方式與標註

真實截圖照它自己的長寬比顯示，不會被裁切；直式截圖（例如 `17-import-from-github.png`）會限制高度、置中顯示。所以截圖不必剛好 16:10，截你要講的那一塊就好。

要標示「按這裡」有兩種做法：

1. **直接畫在截圖上**：例如目前的黃框、黃字（步驟 5、5-1、6、10-1、14-1、15、19）。手冊不會再疊紅框。
2. **讓手冊疊紅框**：在 `index.html` 對應的 `<figure>` 的 `<div class="frame">` 裡加一個 `<div class="mark" data-label="按這裡" style="left:…%;top:…%;width:…%;height:…%">`。座標是「佔截圖寬、高的百分比」，從截圖的像素位置換算（例如按鈕左上角在寬 2000px 截圖的 x=1000，就是 `left:50%`）。標籤文字預設出現在框的左下方；加 `class="mark up"` 移到框的上方，加 `class="mark left"` 改成靠框的右邊對齊。步驟 1、9、10、10-2、11、12、13、14、16、17、18 都有範例。

## 介面改版時

GitHub 與 Netlify 的介面會改。手冊的文字已經盡量用「功能」而不是「位置」描述（找有 Sign up、Add new project、Import、Deploy 這些字的按鈕）。Netlify 在 2025 年把 Sites 改名為 Projects，手冊兩個名字都寫了。

2026 年 10 月重新截圖時，和舊版手冊不一樣、已經改進手冊的地方：

- GitHub 註冊表單改成同一頁填完 Email、Password、Username、Your Country/Region，最後按 Create account（舊版是一次問一格）。
- GitHub 建立 repo 的表單分成 General、Configuration 兩段；Add README 從勾選框改成開關，預設是 Off，要切到 On。
- GitHub 存檔視窗的 Commit message 會由 Copilot 先填一句英文建議，所以步驟 11 的 commit 說明不一定是 `Create index.html`。
- GitHub 的兩階段驗證設定頁列出的 app 是 1Password、Authy、Microsoft Authenticator；手冊改成建議 Google Authenticator（老師在截圖上的註記）。
- Netlify 取完團隊名稱的按鈕是 Continue to deploy，按完可能先出現一個過渡用的 Page not found，按 Back to home 就好（新增步驟 14-1）。
- Netlify 第一次進首頁時，直接顯示 Add your project to Netlify，上面是 AI agent，中間是 Import a Git repository；按 GitHub 會先跳出 GitHub App 的授權視窗（步驟 16），再到 Install Netlify（步驟 17）。舊版手冊的「Add new project → Import an existing project」與「選 Git provider」兩個步驟，現在都包含在步驟 15 的首頁裡，所以拿掉了。
- GitHub 的 Install Netlify 預設選的是 All repositories，手冊提醒要改選 Only select repositories。
- Netlify 的 Review configuration 頁可以直接改 Project name（也就是網址），所以步驟 19 就請學生取好名字；步驟 21 改成「之後想換網址時」才需要做。設定頁最下面多了 Functions directory（預設 `netlify/functions`）與 Environment variables，都不用動。

## 檔案

```
操作手冊/netlify-github/
  index.html      手冊本體（含示意圖產生器與打勾進度）
  images/         截圖（依上表檔名）
  README.md       這份說明
```
