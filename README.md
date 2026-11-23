# 學園偶像大師支援卡收藏

`index.html` 的卡表包含 213 張卡（SSR 117、SR 84、R 12）。日文名稱與稀有度已逐筆對照[學マス徹底攻略的支援卡列表](https://sakigames.jp/gakuen-idolmaster/support-card/)。`sc-001` 至 `sc-213` 是本站收藏 ID，新增卡片時請配置新 ID，既有 ID 會用於讀取收藏和匯入舊版 JSON。

## 卡圖清單

`card-images.js` 以收藏 ID 為索引，`cards` 只收錄可在本站公開使用的卡圖。第一階段目前登錄 0 張，待補 213 張。原有 6 個圖檔直連已停用，因為[學マス徹底攻略的利用規約](https://sakigames.jp/terms/)請讀者避免直連圖檔，也限制未經許可的轉載和大量自動取得。[Game8 的條款](https://game8.jp/terms)限制超出站內預定用途的使用。[萬代南夢宮的遊戲實況政策](https://www.bandainamcoent.co.jp/info/videopolicy/)說明玩家分享遊戲畫面的條件，目前查得的條款沒有涵蓋此站的公開卡圖資料庫用途。

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

## 免安裝預覽

在電腦上[下載 PR 分支的 ZIP](https://github.com/kujou0329/gakumas-support/archive/refs/heads/codex/support-card-image-catalog.zip)，解壓縮整個資料夾，再用 Chrome 或 Safari 開啟其中的 `index.html`。清單和圖檔會從同一資料夾以相對路徑載入。直接開啟本機檔案時，收藏儲存與正式網站各自獨立，且取決於瀏覽器的本機檔案儲存行為，可用收藏 JSON 在兩者之間轉移。iPhone 的「檔案」預覽通常停用 JavaScript，請使用 Safari 開啟已部署的網站。

## 卡圖查核進度

公開清單收錄 0 張，`sc-001` 至 `sc-213` 均待補。以下 5 張已在開發環境逐筆核對來源頁日文全名與 SSR 稀有度，下載的圖均為 1024 × 576，僅用於本機顯示測試。其餘 208 張尚未進行本機圖檔測試。

| ID | 日文卡名 | 本機測試圖來源 |
| --- | --- | --- |
| sc-001 | お嬢様、失礼いたします | [卡片頁](https://sakigames.jp/gakuen-idolmaster/support-card/ojousama-shitsureiitashimasu/) |
| sc-006 | 小悪魔になっちゃえ♪ | [卡片頁](https://sakigames.jp/gakuen-idolmaster/support-card/koakumaninatchae/) |
| sc-008 | もうすぐ本番ですね | [卡片頁](https://sakigames.jp/gakuen-idolmaster/support-card/mousuguhonbandesune/) |
| sc-040 | クールダウンが大切よ！ | [卡片頁](https://sakigames.jp/gakuen-idolmaster/support-card/kurudaungataisetsuyo/) |
| sc-054 | いつも頑張ってるね。 | [卡片頁](https://sakigames.jp/gakuen-idolmaster/support-card/itsumoganbatterune/) |

- [學マス徹底攻略條款](https://sakigames.jp/terms/)限制大量自動取得與未經許可的公開重刊，並請讀者避免直連圖檔。
- [學マス Wiki 卡表](https://wikiwiki.jp/gakumas/サポートカード一覧)可作為對照。[WIKIWIKI 條款](https://wikiwiki.jp/pp/policies)列明平台取得的授權，未提供本專案公開重刊遊戲素材的許可。
- [GameOmega 插圖列表](https://gameo.jp/gkmas/268)含早期卡面。[GameOmega 聲明](https://gameo.jp/about)將圖片權利歸於各權利人。
- [Anihonetwallpaper 卡圖索引](https://anihonetwallpaper.com/tag/gakuen-idolmaster_support-cards)提供壁紙下載，未查到公開重刊許可。從開發環境直接請求其頁面時收到 HTTP 403。
