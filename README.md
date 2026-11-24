# 學園偶像大師支援卡收藏

本站卡表收錄 213 張支援卡及對應的本地插圖，包含 SSR 117 張、SR 84 張及 R 12 張。圖片待補 0 張。本站為個人非營利、非官方工具。遊戲名稱與素材的權利歸 Bandai Namco Entertainment Inc. 及各權利人所有。

## 卡片與圖片來源

卡表以[學マス徹底攻略](https://sakigames.jp/gakuen-idolmaster/support-card/)核對，日文名稱及稀有度另與[遊戲資料鏡像](https://github.com/vertesan/gakumasu-diff/blob/main/SupportCard.yaml)交叉比對。圖片取自[學マス サポートカード比較的卡圖索引](https://github.com/Aster-gkms/gakumasu-supportcard-comparison/blob/3bff0c2d5c5fee7fc0d2b03733d0398b39fbc481/data/images/index.json)，按日文名稱及稀有度唯一對應。原網站的權利聲明將遊戲圖片歸於各權利人，未明示圖檔再利用授權。[圖片來源的權利聲明](https://github.com/Aster-gkms/gakumasu-supportcard-comparison#連絡先権利表記)

學マス徹底攻略的第 1 條限制大量自動擷取及未經許可的公開重刊，第 4 條請讀者避免直接連結圖片。因此該站僅用於卡片資料交叉核對。已提交的圖檔來自上列獨立來源。[學マス徹底攻略規約](https://sakigames.jp/terms/)

## 維護卡圖

`card-images.json` 是網站正式使用的卡圖清單。每筆記錄以既有收藏 ID 為鍵，包含日文卡名、稀有度、相對路徑、像素尺寸及來源。圖檔存於 `images/support/`，皆為 16:9 WebP。211 張為 1024 × 576。兩張原圖較小，保留為 528 × 297，避免放大：

- `sc-001` お嬢様、失礼いたします
- `sc-118` どたばた、おそうじ

更新清單時，請同步更新供直接開檔預覽使用的 `card-images.js`。清單的 `name` 採遊戲表記，若圖片索引的表記有異，會在 `sourceName` 記錄。既有收藏 ID、localStorage 鍵及收藏 JSON 版本維持原值。舊版 JSON 即使只帶舊卡名，也可匯入更名的卡片。

## 免安裝預覽

在電腦上[下載 PR 分支 ZIP](https://github.com/kujou0329/gakumas-support/archive/refs/heads/codex/support-card-image-catalog.zip)，解壓縮整個資料夾，再以 Chrome 或 Safari 開啟其中的 `index.html`。本機檔案的收藏儲存取決於瀏覽器，可用收藏 JSON 備份或轉移。在 iPhone 上請使用 Safari 開啟已部署的網站。

## Lv 樣本收集

在 HTTPS 網站開啟「從遊戲截圖讀取」，上傳截圖並確認裁切框後，選擇「Lv 樣本收集模式」和「從目前裁切框取樣」。核對原始與去背預覽後，填入 1～60 的正確等級，再單筆加入或勾選批次加入。

樣本庫按來源截圖分組，可刪除錯誤樣本、匯出備份，或在另一個裝置匯入。匯入會合併樣本，原有標記和分組優先。瀏覽器只儲存數字裁切 PNG、等級和識別碼。可以為整張來源設定訓練或獨立測試，再比較完整等級模板、逐字模板與 Tesseract.js。用於比較的圖片與結果不會寫入收藏。 [實機截圖比較紀錄](tools/level-ocr-results.md)
