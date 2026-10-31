# BiliAnalysis VR

以 [mmyo456/BiliAnalysis](https://github.com/mmyo456/BiliAnalysis) 穩定版為基礎的介面整合版。保留原版解析方法、服務網址、設定與複製提示，另外加上：

- 影片頁右側邊緣的半透明複製圖示本身就是解析主按鈕，點一下即可解析並複製，沒有額外的展開佔位。啟用 ya 時優先使用 ya；否則沿用其他已選方式。收合時點擊範圍 44×44px，移上後顯示文字與次要解析按鈕，離開約半秒後收起。移回可取消收起倒數，鍵盤可操作，Escape 可收起。
- BewlyCat 卡片在滑鼠移上時顯示「複製圖示＋解析連結」，點擊範圍至少 44px；不用先開影片頁。鍵盤焦點進入按鈕時也會顯示，滑鼠移走後隱藏。
- 依原版設定顯示解析方式。選取 ya 雲端與本地時，卡片上以較大的「複製圖示＋解析連結」作為 ya 主按鈕，旁邊以 44×44px 的複製圖示作為本地按鈕；移上圖示會提示解析方式。兩者並排，避開收藏及稍後再看。
- 動態載入、卡片換片、分 P、延遲掛載 Shadow Root 與鍵盤操作。

這是**完整整合腳本**，不是與原版同時啟用的補丁。產生檔案不會自動安裝到瀏覽器；已有舊整合版時，重新匯入同名腳本即可更新。

## 安裝

1. 在 Tampermonkey 停用原版 BiliAnalysis，保留它以便回復。
2. [安裝 BiliAnalysis VR](https://raw.githubusercontent.com/TW527E/BiliAnalysis/main/vr/BiliAnalysis-VR.user.js)。已有本地整合版時，安裝同名腳本以更新；也可以透過 Tampermonkey 控制台 → 工具程式 → 匯入檔案，選擇本資料夾的 `BiliAnalysis-VR.user.js`。
3. 重新整理 Bilibili；在油猴的此腳本選單中開啟「设置」，選擇你使用的解析方式。

整合版使用獨立名稱與儲存空間，**不會自動匯入原版設定**。原版預設為本地解析；如果你原本使用雲端方式或 CDN 替換，請在此版本重新設定。其他解析腳本如果也加入按鈕，需要自行避免重複啟用。

同時勾選 **云端解析ya** 和 **本地解析**，即可取得 ya 主按鈕與本地小按鈕。影片頁改用單一右側入口；原設定若關閉所有按鈕位置，入口也會隱藏。

停用 BiliAnalysis VR、重新啟用原版並重新整理，即可回復。

## 跟上上游更新

需要 Node.js 22+ 和 Git。在本資料夾開啟終端機：

```sh
node build.mjs
node --test tests/build.test.mjs
BROWSER=/opt/vivaldi/vivaldi-bin node tests/browser.test.mjs
```

測試通過後，把產生的整合檔及來源紀錄推送到此 fork 的 `vr/`。油猴可依其更新設定，從你的 fork 更新已安裝的客製版；本地版本也可以重新匯入更新。

`build.mjs` 從 GitHub 取得 main 的 commit，再下載該 commit 的穩定版腳本；`upstream.json` 記錄版本、commit、來源雜湊與建置時間。它只調整 userscript 識別／更新欄位，並在原版初始化後接上 `src/interface.js`，**不另寫或替換解析器**。

上游沒有公開解析 API，因此仍需依賴三個內部函式與初始化結尾。函式改名、結尾結構改變或語法錯誤時，產生工具會停止並保留舊檔。其他語意或行為變更需由瀏覽器測試確認；測試目前也檢查上游 0.3.4 的連結格式，若上游正式改格式，需更新相應預期值。

**上游同步仍是手動重新產生，未設定排程自動同步。** 整合版的 `@updateURL`、`@downloadURL` 指向你的 fork，不會被原版安裝檔覆蓋。大規模重構仍可能需要調整接點；BewlyCat 更名封面元件時，則只需調整 `src/interface.js` 的封面選擇器。GitHub 的「Sync fork」只能更新上游原檔，仍需執行產生工具才能更新客製安裝檔。

## 預覽與驗證

`preview-desktop.png`、`preview-mobile.png` 是 Vivaldi 渲染的**測試頁**截圖，展示 BewlyCat 卡片操作。`preview-dock-closed-*.png`、`preview-dock-open-*.png` 展示影片頁入口收合與展開的狀態。實際首頁只會顯示卡片快捷鍵。封面為測試圖，剪貼簿和本地 API 在測試頁中使用替代資料。

`validation.json` 記錄 Vivaldi 的桌面、小畫面與延遲 Shadow Root 測試結果。自動測試涵蓋收合延遲、取消倒數、Escape、設定／縮放後不重複產生入口、換片、分 P、本地／雲端解析、剪貼簿後備、複製失敗提示、窄封面避讓和 observer 迴圈；兩個 Node 測試檢查整合及重構拒絕條件。執行瀏覽器測試需要 Chromium 系瀏覽器；可以透過 `BROWSER` 指定執行檔。

Taste Skill 的整頁量測工具無法深入卡片的 Shadow DOM，會將卡片誤判為留白。因此沒有把整頁檢測宣稱為通過；卡片尺寸和遮擋由真實瀏覽器直接量測，截圖另行目視確認。

尚未驗證使用者油猴環境、真實本地 API／雲端服務可用性，以及 VRChat 世界中的實際播放；世界的 URL 白名單與服務可用性仍沿用上游限制。

## 來源與授權

原作者與解析服務資訊保留於整合腳本。原專案與此衍生版本依 GPL-3.0 授權，見 `LICENSE`。公共雲端服務的使用請遵循[原專案說明](https://github.com/mmyo456/BiliAnalysis#readme)，保留專案資訊。
