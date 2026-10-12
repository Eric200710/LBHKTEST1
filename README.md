# LBHKTEST1 - LINE Bot 智慧助理 🤖

一個基於 **Google Apps Script (GAS)** 打造的輕量高擴充性 LINE 聊天機器人，整合 Google Gemini AI 與多種台灣即時生活實用 API。

---

## 🚀 主要功能

1. **生活即時指令**
   - `⛅ 天氣`：查詢花蓮當地即時氣溫、體感、天氣狀況與相對濕度（Open-Meteo 免金鑰 API）。
   - `🌋 地震`：查詢台灣最近一次顯著地震速報（中央氣象署 OpenData 與 USGS 雙備援）。
   - `⛽ 油價`：查詢中油最新牌價（92/95/98/超級柴油）與下週油價預測。
   - `🎮 免費遊戲`：即時抓取 Steam 最新限免遊戲領取連結。
   - `🔮 運勢`：今日運勢靈籤與幸運色。
   - `ℹ️ /help`：列出完整的實用指令清單。
2. **AI 智慧大腦 (雙引擎支援)**
   - **本地端模型 (Local LLM)**：支援 **Ollama (`qwen2`)**，搭配即時 **DuckDuckGo 聯網搜尋 (RAG)**，直接獲取即時網路資訊！
   - **雲端模型 (Cloud LLM)**：無縫切換 **Google Gemini AI (`gemini-1.5-flash`)** 進行極速解答。

---

## ⚡ 本地 Ollama (Qwen2) + Ngrok 一鍵啟動

本專案提供自動化部署腳本 [`start_ollama_ngrok.ps1`](start_ollama_ngrok.ps1)，執行後會自動完成：
1. 自動設定 `OLLAMA_ORIGINS="*"` 與 `OLLAMA_HOST="0.0.0.0:11434"`，徹底避免外部呼叫時發生 **403 Forbidden** 錯誤。
2. 檢查並自動下載/安裝 Ollama（若尚未安裝）。
3. 自動啟動 Ollama 服務並下載 `qwen2` 模型。
4. 檢查 Ngrok、提示輸入 Authtoken 登入，並開啟公開隧道 (`ngrok http 11434`)。

**執行方式 (Windows PowerShell)：**
```powershell
.\start_ollama_ngrok.ps1
```
啟動後將 Ngrok 提供的公開 HTTPS 網址複製至 `Code.gs` 的 `CONFIG.OLLAMA_URL` 即可！

---

## 🛠️ 安裝與部署步驟

1. 進入 [Google Apps Script](https://script.google.com/) 建立新專案。
2. 將 `Code.gs` 的內容完整複製並貼上到編輯器中。
3. 在 `CONFIG` 區塊填入您的金鑰：
   - `LINE_ACCESS_TOKEN`：前往 [LINE Developers Console](https://developers.line.biz/) 取得 Messaging API Channel Access Token。
   - `GEMINI_API_KEY`：前往 [Google AI Studio](https://aistudio.google.com/) 取得免費 API Key。
4. 點擊右上角 **「部署」➔「新增部署作業」**：
   - 類型：**網頁應用程式 (Web App)**
   - 執行身分：**我**
   - 誰可以存取：**所有人 (Anyone)**
5. 複製生成的 **網頁應用程式網址 (結尾為 /exec)**。
6. 前往 LINE Developers Console，在 **Messaging API ➔ Webhook URL** 貼上該網址，並開啟 **Use webhook**。

---

## 📁 檔案結構說明

```text
LBHKTEST1/
├── Code.gs                   # 主程式 (最新完整穩定版)
├── README.md                 # 專案說明與部署指南
├── .gitignore                # Git 忽略設定
└── history/                  # 開發歷程與歷史版本 (20+ 個演進階段)
    ├── v01_initial_gemini_webhook.gs
    ├── v02_task_scheduler_system/
    ├── v03_free_games_module.gs
    ├── v04_simplified_chat_games.gs
    ├── v05_echo_hi_only.gs
    ├── v06_steam_games_integration.gs
    ├── v07_fixed_cheapshark_api.gs
    ├── v08_gamerpower_stable_api.gs
    ├── v09_gemini_routing_integration.gs
    ├── v10_gemini_15_flash_fix.gs
    ├── v11_utility_commands_added.gs
    ├── v12_timer_prototype.gs
    ├── v13_cpc_oil_xml_attempt.gs
    ├── v14_cpc_oil_opendata_csv.gs
    ├── v15_goodlife_oil_api_testing.gs
    ├── v16_goodlife_oil_fields_fixed.gs
    ├── v17_timer_order_bugfix.gs
    ├── v18_timer_removal_stabilization.gs
    └── v19_final_production.gs
```

---

## 🔒 資安防護說明

本儲存庫中所有歷史版本與主程式之敏感憑證（`LINE Channel Access Token` 與 `Gemini API Key`）已於提交前全數脫敏為預留值，防止憑證外洩。
