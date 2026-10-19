# LBHKTEST1 - LINE Bot 智慧助理 🤖

一個基於 **Google Apps Script (GAS)** 打造的輕量高擴充性 LINE 聊天機器人，整合本地端 **Ollama (Qwen2 / Gemma)**、雲端 **Google Gemini AI (gemini-3.8-flash)**，具備**免金鑰多引擎即時連網搜尋**、**自動斷線/404 容錯備援**與多種台灣生活實用 API。

---

## 🚀 主要特色與功能

### 1. 🔍 強韌多引擎即時連網搜尋 (免 API Key)
整合 [`line-bot-lite`](https://github.com/Eric200710/line-bot-lite) 的多引擎連網技術，當使用者詢問最新時事或問題時，GAS 會自動進行網路檢索，並注入至模型 Context：
- **首選引擎**：DuckDuckGo HTML 版搜尋（透過 POST 表單解析真實摘要與來源網址，防止防爬阻擋）。
- **雙重備援**：自動搭配 **中文維基百科 API (MediaWiki Search API)** 與 **DuckDuckGo Instant Answer API**。
- **自動標註來源**：回答生成後自動在文末整齊附上參考網址來源清單（`📌 參考資料來源：...`）。

### 2. 🧠 AI 智慧大腦雙引擎與自動容錯切換 (Ollama ➔ Gemini)
- **本地模型 (Local LLM)**：搭配本機執行 [`start_ollama_ngrok.ps1`](start_ollama_ngrok.ps1)，透過 Ngrok 隧道調用本地 Ollama (`qwen2` 或 `gemma4:e2b` / `gemma:2b`)。
- **雲端模型 (Cloud LLM)**：全面升級支援 Google 最新官方模型 **`gemini-3.8-flash`**（備援輪詢 `gemini-3.8-pro`、`gemini-2.5-flash`）。
- **⚡ 自動斷線/404 容錯備援**：當預設使用本地 Ollama 時，若遇 **404 Not Found**、Ngrok 網址過期、電腦關機或連線逾時，系統會**自動無縫切換至 Gemini 備援回答**，使用者完全不會遭遇斷線錯誤！

### 3. ⛅ 台灣生活即時實用指令
- `⛅ 天氣`：查詢花蓮當地即時氣溫、體感溫度、天氣狀況與相對濕度（Open-Meteo 免金鑰 API）。
- `🌋 地震`：查詢台灣最近一次顯著地震速報（中央氣象署 OpenData 與 USGS 雙備援）。
- `⛽ 油價`：查詢中油最新牌價（92 / 95 / 98 / 超級柴油）與下週油價漲跌預測。
- `🎮 免費遊戲`：即時抓取 Steam 最新限免遊戲領取連結（GamerPower API）。
- `🔮 運勢`：抽取今日運勢靈籤與幸運色。
- `ℹ️ /help`：列出完整的實用指令清單。

---

## ⚡ 本地 Ollama (Qwen2) + Ngrok 一鍵啟動

本專案提供自動化部署腳本 [`start_ollama_ngrok.ps1`](start_ollama_ngrok.ps1)，在本地 Windows 電腦執行後會自動完成：
1. 自動設定 `OLLAMA_ORIGINS="*"` 與 `OLLAMA_HOST="0.0.0.0:11434"`，徹底避免外部呼叫時發生 **403 Forbidden** 錯誤。
2. 檢查並自動下載/安裝 Ollama（若尚未安裝）。
3. 啟動 Ollama 服務背景行程並下載預載 `qwen2` 模型。
4. 檢查 Ngrok、提示輸入 Authtoken 登入，並開啟公開轉發隧道 (`ngrok http 11434`)。

**執行方式 (Windows PowerShell)：**
```powershell
.\start_ollama_ngrok.ps1
```
啟動後複製 Ngrok 終端機顯示的 Forwarding HTTPS 網址（例如 `https://xxxx.ngrok-free.dev/api/generate`），填入 `Code.gs` 的 `CONFIG.OLLAMA_URL` 即可！

---

## 🛠️ 安裝與部署步驟 (Google Apps Script)

1. 前往 [Google Apps Script](https://script.google.com/) 建立或開啟既有專案。
2. 將本專案最新版 [`Code.gs`](Code.gs) 內容完整複製貼上至 GAS 編輯器。
3. 在頂部的 `CONFIG` 區塊填入您的金鑰與設定：
   ```javascript
   const CONFIG = {
     // LINE Channel Access Token (請至 LINE Developers 後台取得)
     LINE_ACCESS_TOKEN: 'YOUR_LINE_ACCESS_TOKEN',

     // AI 預設引擎模式: 'ollama' (優先本地模型) 或 'gemini' (直接使用雲端模型)
     AI_ENGINE: 'ollama',

     // 是否自動啟動即時聯網搜尋加強 (免 API Key，多引擎備援)
     ENABLE_WEB_SEARCH: true,

     // 是否在回覆文末附上參考網址來源
     APPEND_SOURCES: true,

     // 本地 Ollama Ngrok 公開轉發 API 端點 (執行 start_ollama_ngrok.ps1 取得)
     OLLAMA_URL: 'https://xxxx.ngrok-free.dev/api/generate',

     // 本地 Ollama 模型名稱 (例如 qwen2, gemma4:e2b)
     OLLAMA_MODEL: 'qwen2',

     // Google Gemini API Key (前往 Google AI Studio 免費取得)
     GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',

     // Gemini 模型 (建議使用最新官方模型 gemini-3.8-flash)
     GEMINI_MODEL: 'gemini-3.8-flash'
   };
   ```
4. **測試驗證 (選填)**：
   - 在 GAS 頂部函式選單中選擇 `testGeminiDirect` 或 `testWebSearch`，點選「執行」，即可在執行紀錄中直接除錯並確認連線狀態！
5. **發布部署作業**：
   - 點擊右上角 **「部署」➔「管理部署作業」**（或「新增部署作業」）。
   - 點擊鉛筆圖示進行編輯，建立 **「新版本」**。
   - **執行身分**：選擇 **我 (Me)**。
   - **誰可以存取**：務必選擇 **所有人 (Anyone)**（避免 LINE 驗證時出現 `403 Forbidden`）。
   - 複製生成的 **網頁應用程式網址 (結尾必須為 `/exec`)**。
6. 前往 [LINE Developers Console](https://developers.line.biz/)：
   - 進入 **Messaging API ➔ Webhook settings**。
   - 貼上剛才複製的網址到 **Webhook URL**，開啟 **Use webhook**。
   - 點擊 **Verify**，顯示 **Success (200)** 即代表串接成功！

---

## 📁 檔案結構說明

```text
LBHKTEST1/
├── Code.gs                   # GAS 主程式 (最新版：多引擎搜尋 + Ollama/Gemini 容錯切換)
├── README.md                 # 專案說明、架構與完整部署指南
├── start_ollama_ngrok.ps1    # 本地端 Ollama + Ngrok 一鍵環境配置與啟動腳本
├── .gitignore                # Git 忽略設定
└── history/                  # 開發歷程與歷史版本 (20+ 個演進階段)
```

---

## 🔒 資安防護說明

本儲存庫中所有主程式與歷史版本之敏感憑證（`LINE Channel Access Token` 與 `Gemini API Key`）於提交至 GitHub 前均已進行脫敏為預留字串處理，保護個人私密金鑰安全。
