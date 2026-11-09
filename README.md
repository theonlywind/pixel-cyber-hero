# 網絡安全小勇者（P3–P6 像素風網絡安全課程）

純靜態網頁，無後端、無需安裝套件。進度只存在瀏覽器 localStorage。

## 啟動

    node serve.js          # 然後開 http://localhost:8123
    （或直接開 index.html；字體需上網載入）

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 入口，載入字體及其他檔案 |
| `content.js` | 全部課程內容：4 個關卡（對話、翻牌、分類、選擇題、閃避）及黑客熊題庫 |
| `game.js` | 遊戲引擎：畫面、對話、題目、閃避小遊戲、證書 |
| `audio.js` | 原創 8-bit 背景音樂及音效（WebAudio 即時合成，無音檔） |
| `sprites.js` | 像素角色及子彈圖（字串陣列） |
| `style.css` | 像素風格 |
| `serve.js` | 本地預覽用小伺服器 |

## 老師後台

老師開課堂產生代號，學生輸入「課堂代號」就會上報；詳見 [`backend/README.md`](backend/README.md)（Google Apps Script，免費）。`config.js` 留空就唔上報。

## 改內容

- 步驟類型：`say` 對話、`cards` 翻牌、`sort` 二選一分類、`ask` 單選題、`dodge` 閃避、
  `build` 造密碼（即時強度計）、`spot` 找可疑位置（`parts: [[文字, 0|1, 解釋]]`）、`match` 連連看（`p: [[左, 右]]`）。
- 故事：`story.prologue` / `story.epilogue`，每行 `[誰, 文字, 換圖(key|boss), 名稱]`，`{name}` 會換成玩家名字。
- 每關的 `tips` 會在「知識圖鑑」顯示（通關後解鎖）。
- 過場動畫在 `scenes.js`（canvas 即時繪畫）：`night`、`shatter`、`gather`、`fireworks`（放入 `story` 陣列，格式 `{ scene: '名稱' }`）、`encounter`（每關開場）、`shard`（得碎片）。按空白鍵或點擊可跳過。
- 戰鬥背景同世界地圖在 `maps.js`：`Maps.backdrop(名)` 畫各關場地（castle / pond / forest / house / lair / kingdom）；`Maps.world()` 畫選關地圖，關卡位置在 `Maps.nodes`。
- 戰鬥動畫：答對 → 主角衝前攻擊、怪獸閃爍、怪獸 HP 條減少；答錯 → 怪獸反擊、主角 -3 HP；通關 → 怪獸消失。
- 步驟加 `min: 5` 即只在 P5–P6 出現。
- 題目選項格式：`[文字, 1=正確/0=錯誤, 解釋]`，選項次序每次隨機。
- 最終關題庫在 `pool`；通過條件在 `boss`（抽 8 題，答對 7 題）。
- 閃避難度：`game.js` 內 `sp`（速度）、`gap`（出現間隔）。

## 課程結構

開始 → 序章（安全之鑰被打碎成五塊）→ 第 1 關密碼城堡 → 第 2 關釣魚池塘 → 第 3 關個人資料森林 → 第 4 關網絡禮儀廣場 → 第 5 關 AI 與資訊小屋（每關得一塊碎片）→ 最終關黑客熊 → 終章 → 證書

內容參考：`../參考資料/學生培訓_完整內容.md`。角色及圖像均為原創。
