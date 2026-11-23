# 學園偶像大師支援卡收藏

`index.html` 的卡表包含 213 張卡（SSR 117、SR 84、R 12）。日文名稱與稀有度已逐筆對照[學マス徹底攻略的支援卡列表](https://sakigames.jp/gakuen-idolmaster/support-card/)。`sc-001` 至 `sc-213` 是本站收藏 ID，新增卡片時請配置新 ID，既有 ID 會用於讀取收藏和匯入舊版 JSON。

## 卡圖清單

`card-images.json` 以收藏 ID 為索引，`cards` 只收錄可在本站公開使用的卡圖。第一階段目前登錄 0 張，待補 213 張。原有 6 個圖檔直連已停用，因為[學マス徹底攻略的利用規約](https://sakigames.jp/terms/)請讀者避免直連圖檔，也限制未經許可的轉載和大量自動取得。[Game8 的條款](https://game8.jp/terms)限制超出站內預定用途的使用。[萬代南夢宮的遊戲實況政策](https://www.bandainamcoent.co.jp/info/videopolicy/)說明玩家分享遊戲畫面的條件，目前查得的條款沒有涵蓋此站的公開卡圖資料庫用途。

取得可公開使用的圖檔後，放入 `images/support/`，並在清單的 `cards` 新增對應的項目：

| 欄位 | 內容 |
| --- | --- |
| ID | `cards` 物件的鍵，與卡表的 `sc-…` 相同 |
| `name`、`rarity` | 與卡表完全相同的日文名稱及稀有度 |
| `path` | 相對網址，例如 `images/support/sc-001.png`，支援 PNG、JPEG、WebP |
| `sourcePage`、`usageTerms` | 圖片原始頁面及公開使用許可或條款的查核紀錄 |
| `variant`、`width`、`height` | 圖片類型和實際像素尺寸。遊戲列表橫向卡面使用 `support-list` |

優先收錄與遊戲支援卡列表相同的橫向圖，保留原始比例。未來的卡面比對可用 `variant` 選出列表圖，以 `width`、`height` 校對尺寸，並用穩定的 ID 將辨識結果套用到收藏。以相對路徑部署於同一網站，也可由瀏覽器讀入 Canvas 取樣。

GitHub Pages 可直接提供 HTML、JSON 和圖檔。收藏繼續使用原本的 localStorage 鍵和第 1 版 JSON 格式，圖檔資料獨立維護。
