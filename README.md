# 單字大作戰（wordgame）

給小朋友練英文單字的波次生存遊戲，玩法參考 Brotato：每波撐過倒數就進商店結算，用材料買武器和道具。
商店的「重骰」要先答一題英文單字，題目越難，重骰保證出現的裝備越好。

打開網頁就能玩，手機、平板、電腦都可以，不用安裝。也可以「加到主畫面」當成 App，離線也能玩。

## 玩法

- **移動**：按住畫面任意處拖曳（虛擬搖桿），電腦也可以用 WASD 或方向鍵。武器會自動瞄準最近的敵人。
- **每一波**：倒數結束就過關，撐過 10 波就勝利。敵人掉的 💎 材料同時是經驗值和金錢。
- **升級**：經驗滿了會升級，波次結束時從 4 個能力中選 1 個。
- **商店**：4 個商品，可以 🔒 鎖定留到下一波。武器最多同時帶 2 把、各自自動攻擊；買到同名同稀有度的武器會直接「合成」升一階，武器欄滿了也可以選一把替換（退回賣價）。
- **答題重骰**（每波第一次免費）：
  - 簡單：看圖選英文單字，一般重骰
  - 中等：看中文選出正確拼字，答對保證出現 1 個藍裝
  - 困難：用字母方塊拼出單字，答對保證出現 1 個紫裝
  - 答錯照樣重骰（不保證稀有度），那個字會進入「複習清單」，之後更常出現
- **單字圖鑑**：答對過的單字會被收集起來，紀錄存在這台裝置的瀏覽器裡。

## 在自己電腦上執行

需要用本機伺服器開（直接雙擊 index.html 不能載入程式模組）：

```bash
npx http-server -c-1 .
# 或
python3 -m http.server 8080
```

然後用瀏覽器打開顯示的網址。

## 上線到 GitHub Pages

這個專案不需要編譯。`.github/workflows/pages.yml` 會在每次 push 時把檔案發布到 `gh-pages` 分支：

- `main` → 網站根目錄 `https://<你的帳號>.github.io/wordgame/`
- 其他分支 → 預覽網址 `https://<你的帳號>.github.io/wordgame/preview/<分支名>/`（分支名裡的 `/` 會換成 `-`），所有預覽列在 `.../wordgame/preview/`
- 分支刪掉時，它的預覽也會一起移除

第一次設定：到 repo 的 **Settings → Pages**，**Source** 選 **Deploy from a branch**，Branch 選 `gh-pages`、資料夾選 `/ (root)`，按 Save。

改了檔案記得把 `sw.js` 裡的 `VERSION` 加 1，玩家才會拿到新版。預覽網址不會安裝離線快取，所以一定是最新版；預覽和正式版共用同一份存檔（圖鑑、複習清單）。

## 專案結構

```
index.html              頁面與 HUD
css/style.css           所有介面樣式
lib/                    Phaser 3 遊戲引擎（已內附，不需要網路）
src/main.js             遊戲流程：主選單 → 波次 → 升級 → 商店 → 結算
src/scenes/ArenaScene.js  戰鬥場景：移動、出怪、武器、子彈、材料
src/scenes/BootScene.js   用程式畫出所有圖形（不需要圖片檔）
src/art/pixel.js        原創像素圖（角色、敵人、武器）和草地／石牆地圖
fonts/                  像素字型 Pixelify Sans（OFL 授權，倒數計時和材料數用）
src/input/joystick.js   浮動虛擬搖桿
src/ui/shop.js          商店、合成、鎖定、答題重骰
src/ui/quiz.js          三種難度的英文題目
src/ui/screens.js       主選單、升級、暫停、結算、圖鑑
src/data/words.js       單字庫，約 260 字、16 個主題、3 個程度（照格式加一行就能新增單字）
src/data/weapons.js     武器數值
src/data/items.js       道具數值
src/data/enemies.js     敵人數值與出怪比例
src/progress.js         複習清單與圖鑑的儲存
src/speech.js           用瀏覽器內建語音唸單字
sw.js                   離線快取（PWA）
```
