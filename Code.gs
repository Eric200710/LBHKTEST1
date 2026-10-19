// ==========================================
// LBHKTEST1 - LINE Bot 智慧助理主程式 (含連網搜尋與 Ollama/Gemini 雙引擎容錯備援)
// 功能特色：
// 1. 實用生活指令：/help、天氣 (花蓮)、地震速報、中油即時油價、Steam 限免遊戲、每日運勢
// 2. 多引擎強韌連網搜尋：DuckDuckGo HTML + 中文維基百科 API + DDG Instant API 備援
// 3. 自動容錯切換：優先使用本地 Ollama (Ngrok 隧道)，若不可用 (404/連線失敗/逾時) 自動切換 Google Gemini
// 4. 自動標註來源：即時搜尋資料後，在回答文末附上參考網址
// ==========================================

// ==========================================
// 1. 金鑰與核心設定
// ==========================================
const CONFIG = {
  // LINE Channel Access Token (請至 LINE Developers 後台取得)
  LINE_ACCESS_TOKEN: 'YOUR_LINE_ACCESS_TOKEN',

  // AI 預設引擎模式: 'ollama' (優先本地模型) 或 'gemini' (直接使用雲端模型)
  AI_ENGINE: 'ollama',

  // 是否自動啟動即時聯網搜尋加強 (免 API Key，多引擎備援)
  ENABLE_WEB_SEARCH: true,

  // 是否在回覆文末附上參考網址來源
  APPEND_SOURCES: true,

  // 本地 Ollama Ngrok 公開轉發 API 端點 (例如 https://xxxx.ngrok-free.dev/api/generate)
  // 請執行 start_ollama_ngrok.ps1 後複製對應的 Forwarding 網址填入
  OLLAMA_URL: 'https://elsewhere-frosted-jalapeno.ngrok-free.dev/api/generate',

  // 本地 Ollama 模型名稱 (例如 qwen2, gemma4:e2b, gemma:2b)
  OLLAMA_MODEL: 'qwen2',

  // Google Gemini API Key (當 AI_ENGINE 為 gemini 或 Ollama 連線失敗備援時使用)
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',

  // Gemini 推薦模型 (最新模型為 gemini-3.8-flash)
  GEMINI_MODEL: 'gemini-3.8-flash'
};

// ==========================================
// 2. 接收 LINE 訊息 (Webhook 入口)
// ==========================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    const contents = JSON.parse(e.postData.contents);
    const events = contents.events;

    if (!events || !events.length) {
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (event.type === 'message' && event.message.type === 'text') {
        const userPrompt = event.message.text.trim();
        const replyToken = event.replyToken;

        let replyMessageText = "";

        // 【生活實用指令庫】
        const lowerPrompt = userPrompt.toLowerCase();
        if (lowerPrompt === '/help' || userPrompt === '說明' || userPrompt === '指令' || userPrompt === '幫助') {
          replyMessageText = getHelpText();
        } else if (userPrompt === '天氣' || userPrompt === '花蓮天氣') {
          replyMessageText = getHualienWeatherText();
        } else if (userPrompt === '地震' || userPrompt === '地震報告') {
          replyMessageText = getLatestEarthquakeText();
        } else if (userPrompt === '油價' || userPrompt === '今日油價') {
          replyMessageText = getFuelPriceText();
        } else if (userPrompt === '免費遊戲' || userPrompt === '限免' || lowerPrompt === 'free game') {
          replyMessageText = getSteamFreeGamesText();
        } else if (userPrompt === '運勢' || userPrompt === '今日運勢') {
          replyMessageText = getFortuneText();
        } else {
          // 其餘文字對話交由智慧大腦處理（內建連網搜尋與 Ollama -> Gemini 自動容錯切換）
          replyMessageText = handleSmartAnswer(userPrompt);
        }

        // 回覆給使用者
        replyMessage(replyToken, replyMessageText);
      }
    }
  } catch (err) {
    console.error("處理 Webhook 錯誤: " + err.toString());
  }

  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

// ==========================================
// 3. 智慧回答分流與 Ollama -> Gemini 自動備援
// ==========================================
function handleSmartAnswer(userPrompt) {
  let searchResult = { contextText: "", sources: [] };
  
  // 1. 若開啟連網搜尋，進行即時搜尋
  if (CONFIG.ENABLE_WEB_SEARCH) {
    searchResult = searchWebMulti(userPrompt, 3);
  }

  let answerText = "";
  let engineUsed = CONFIG.AI_ENGINE;

  // 2. 若預設為 ollama，嘗試呼叫本地模型；失敗 (404/連線錯誤) 則自動容錯切換至 Gemini
  if (CONFIG.AI_ENGINE === 'ollama') {
    try {
      answerText = callOllamaWithContext(userPrompt, searchResult.contextText);
    } catch (ollamaErr) {
      console.warn("⚠️ Ollama 連線失敗 (" + ollamaErr.message + ")，自動切換至 Gemini 備援...");
      engineUsed = 'gemini (備援)';
      try {
        answerText = callGeminiWithContext(userPrompt, searchResult.contextText);
      } catch (geminiErr) {
        return "【AI 系統暫時無法連線】\n本地 Ollama 連線失敗: " + ollamaErr.message + "\nGemini 備援失敗: " + geminiErr.message;
      }
    }
  } else {
    // 預設直接使用 Gemini
    try {
      answerText = callGeminiWithContext(userPrompt, searchResult.contextText);
    } catch (geminiErr) {
      return "【Gemini 目前連線繁忙，請稍候片刻再試】\n錯誤: " + geminiErr.message;
    }
  }

  // 3. 在文末附上參考來源網址 (如果有搜尋結果且開啟附註)
  if (CONFIG.APPEND_SOURCES && searchResult.sources && searchResult.sources.length > 0) {
    answerText += "\n\n📌 參考資料來源：\n" + searchResult.sources.map(function(url) { return "• " + url; }).join("\n");
  }

  return answerText;
}

// ==========================================
// 4. 多引擎強韌即時連網搜尋模組
// (DuckDuckGo HTML + 中文維基百科 API + DDG Instant API)
// ==========================================
function searchWebMulti(query, maxResults) {
  maxResults = maxResults || 3;
  var snippets = [];
  var sources = [];

  // 第 1 層：DuckDuckGo HTML 版搜尋 (POST 表單方式)
  try {
    var ddgUrl = "https://html.duckduckgo.com/html/";
    var options = {
      method: "post",
      payload: { q: query },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(ddgUrl, options);
    if (response.getResponseCode() === 200) {
      var html = response.getContentText();
      var snippetRegex = /class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      var urlRegex = /class="result__url"[^>]*>([\s\S]*?)<\/span>/g;
      var matchSnippet, matchUrl;
      var rawSnippets = [];
      var rawUrls = [];

      while ((matchSnippet = snippetRegex.exec(html)) !== null && rawSnippets.length < maxResults) {
        var cleanSnippet = matchSnippet[1].replace(/<[^>]+>/g, "").trim();
        if (cleanSnippet) rawSnippets.push(cleanSnippet);
      }
      while ((matchUrl = urlRegex.exec(html)) !== null && rawUrls.length < maxResults) {
        var cleanUrl = matchUrl[1].replace(/<[^>]+>/g, "").trim();
        if (cleanUrl) {
          if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            cleanUrl = "https://" + cleanUrl;
          }
          rawUrls.push(cleanUrl);
        }
      }

      for (var i = 0; i < rawSnippets.length; i++) {
        snippets.push("• " + rawSnippets[i]);
        if (i < rawUrls.length) {
          sources.push(rawUrls[i]);
        }
      }
    }
  } catch (e) {
    console.warn("DuckDuckGo 搜尋失敗: " + e.toString());
  }

  // 第 2 層備援：中文維基百科 API (MediaWiki Search API)
  if (snippets.length === 0) {
    try {
      var wikiUrl = "https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(query) + "&format=json&utf8=1";
      var wikiRes = UrlFetchApp.fetch(wikiUrl, {
        headers: { "User-Agent": "LINEBot-GAS/1.0 (https://line.me)" },
        muteHttpExceptions: true
      });
      if (wikiRes.getResponseCode() === 200) {
        var wikiData = JSON.parse(wikiRes.getContentText());
        var searchList = (wikiData.query && wikiData.query.search) ? wikiData.query.search : [];
        for (var w = 0; w < Math.min(searchList.length, maxResults); w++) {
          var item = searchList[w];
          var itemSnippet = item.snippet.replace(/<[^>]+>/g, "").trim();
          if (itemSnippet) {
            snippets.push("• [" + item.title + "] " + itemSnippet);
            sources.push("https://zh.wikipedia.org/wiki/" + encodeURIComponent(item.title));
          }
        }
      }
    } catch (e2) {
      console.warn("維基百科搜尋失敗: " + e2.toString());
    }
  }

  // 第 3 層備援：DuckDuckGo Instant Answer API
  if (snippets.length === 0) {
    try {
      var instantUrl = "https://api.duckduckgo.com/?q=" + encodeURIComponent(query) + "&format=json&no_html=1&skip_disambig=1";
      var instantRes = UrlFetchApp.fetch(instantUrl, { muteHttpExceptions: true });
      if (instantRes.getResponseCode() === 200) {
        var instantData = JSON.parse(instantRes.getContentText());
        if (instantData.AbstractText) {
          snippets.push("• " + instantData.AbstractText);
          if (instantData.AbstractURL) {
            sources.push(instantData.AbstractURL);
          }
        }
      }
    } catch (e3) {
      console.warn("DDG Instant API 失敗: " + e3.toString());
    }
  }

  return {
    contextText: snippets.join("\n"),
    sources: sources
  };
}

// ==========================================
// 5. 呼叫本地 Ollama API (透過 Ngrok 隧道)
// ==========================================
function callOllamaWithContext(userPrompt, searchContext) {
  var finalPrompt = "";
  if (searchContext && searchContext.trim() !== "") {
    finalPrompt = "你是 LINE 上的智慧助理。請閱讀以下即時檢索到的網路資訊，並結合你的知識以台灣繁體中文回答使用者的問題。\n\n" +
      "[最新網路搜尋結果]:\n" + searchContext + "\n\n" +
      "[使用者問題]:\n" + userPrompt + "\n\n" +
      "請使用繁體中文純文字格式回答，開門見山先講結論：";
  } else {
    finalPrompt = "你是 LINE 上的智慧助理。請使用台灣繁體中文純文字格式回答以下問題，開門見山先講結論：\n" + userPrompt;
  }

  var payload = {
    model: CONFIG.OLLAMA_MODEL || "qwen2",
    prompt: finalPrompt,
    stream: false,
    options: { num_ctx: 4096 }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "ngrok-skip-browser-warning": "true",
      "User-Agent": "LINEBot-GAS"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var res = UrlFetchApp.fetch(CONFIG.OLLAMA_URL, options);
  var statusCode = res.getResponseCode();

  // 若出現 404, 502, 503 等狀態碼，拋出異常以利觸發 Gemini 備援
  if (statusCode === 404) {
    throw new Error("404 Not Found (Ollama 服務或端點不存在)");
  }
  if (statusCode !== 200) {
    throw new Error("HTTP " + statusCode + ": " + res.getContentText().substring(0, 200));
  }

  var data = JSON.parse(res.getContentText());
  return data.response ? data.response.trim() : "（未取得回覆內容）";
}

// ==========================================
// 6. 呼叫 Google Gemini API (支援搜尋上下文注入與多模型/錯誤診斷)
// ==========================================
function callGeminiWithContext(userPrompt, searchContext) {
  var apiKey = CONFIG.GEMINI_API_KEY ? CONFIG.GEMINI_API_KEY.trim() : "";
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error("尚未設定 GEMINI_API_KEY，請至 CONFIG 填入有效的 Gemini API 金鑰。");
  }

  var promptText = "";
  if (searchContext && searchContext.trim() !== "") {
    promptText = "你是 LINE 上的智慧助理。請參考下列即時網路搜尋結果，以台灣繁體中文純文字回答使用者的提問。\n\n" +
      "[即時網路搜尋結果]:\n" + searchContext + "\n\n" +
      "[使用者問題]:\n" + userPrompt + "\n\n" +
      "回答要求：繁體中文、簡潔有力、純文字（避免使用 Markdown ** 或 # 字號）。";
  } else {
    promptText = "你是 LINE 上的智慧助理。請以台灣繁體中文純文字回答以下問題：\n" + userPrompt;
  }

  // 嘗試模型清單 (Google 最新官方推薦模型)
  var models = [CONFIG.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  // 去除重複
  var uniqueModels = [];
  for (var i = 0; i < models.length; i++) {
    if (models[i] && uniqueModels.indexOf(models[i]) === -1) {
      uniqueModels.push(models[i]);
    }
  }

  var payload = {
    contents: [{ parts: [{ text: promptText }] }]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var lastErrors = [];

  for (var m = 0; m < uniqueModels.length; m++) {
    var modelName = uniqueModels[m];
    // 同時在 URL 與 Header 帶入，確保相容性
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + encodeURIComponent(apiKey);

    try {
      var response = UrlFetchApp.fetch(url, options);
      var statusCode = response.getResponseCode();
      var respText = response.getContentText();

      if (statusCode === 200) {
        var result = JSON.parse(respText);
        if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts.length > 0) {
          return result.candidates[0].content.parts[0].text.trim();
        }
      } else {
        var errMsg = "模型 " + modelName + " (HTTP " + statusCode + "): ";
        try {
          var errJson = JSON.parse(respText);
          errMsg += (errJson.error && errJson.error.message) ? errJson.error.message : respText.substring(0, 150);
        } catch (je) {
          errMsg += respText.substring(0, 150);
        }
        console.warn(errMsg);
        lastErrors.push(errMsg);
      }
    } catch (err) {
      var fetchErr = "模型 " + modelName + " 連線異常: " + err.toString();
      console.warn(fetchErr);
      lastErrors.push(fetchErr);
    }
  }

  throw new Error("所有 Gemini 模型端點失敗：\n" + lastErrors.join("\n"));
}

// ==========================================
// 7. 生活實用功能函式庫
// ==========================================

// 指令選單 (/help)
function getHelpText() {
  return [
    '🤖 【實用指令小幫手】',
    '-------------------------',
    '⛅ 輸入「天氣」：查詢花蓮當地即時氣象',
    '🌋 輸入「地震」：查詢台灣最近一次地震報告',
    '⛽ 輸入「油價」：查詢今日中油牌價與下週預測',
    '🎮 輸入「免費遊戲」：查詢 Steam 限免好康',
    '🔮 輸入「運勢」：抽取今日運勢靈籤',
    '-------------------------',
    '💬 其它任何文字皆支援即時連網搜尋與 AI 智慧解答！'
  ].join('\n');
}

// 花蓮即時氣象 (Open-Meteo 免金鑰 API)
function getHualienWeatherText() {
  try {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=23.987&longitude=121.601&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FTaipei';
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText()).current;
      var codeMap = {
        0: '晴朗 ☀️', 1: '大致晴朗 🌤️', 2: '局部多雲 ⛅', 3: '多雲陰天 ☁️',
        45: '起霧 🌫️', 48: '有濃霧 🌫️', 51: '微毛毛雨 🌦️', 61: '小雨 🌧️',
        63: '中雨 🌧️', 65: '大雨 ⛈️', 80: '局部陣雨 🌦️', 95: '雷陣雨 ⛈️'
      };
      var condition = codeMap[data.weather_code] || '多雲 🌥️';

      return [
        '⛅ 【花蓮即時氣象資訊】',
        '-------------------------',
        '🌡️ 即時氣溫：' + data.temperature_2m + ' °C',
        '👕 體感溫度：' + data.apparent_temperature + ' °C',
        '🌤️ 天氣狀況：' + condition,
        '💧 相對濕度：' + data.relative_humidity_2m + ' %',
        '🌧️ 目前降雨量：' + data.precipitation + ' mm',
        '💨 風速：' + data.wind_speed_10m + ' km/h',
        '-------------------------',
        '※ 出門記得攜帶雨具，注意安全喔！'
      ].join('\n');
    }
  } catch (e) {
    console.error("氣象解析異常: " + e.toString());
  }
  return '⚠️ 暫時無法取得花蓮氣象資料，請稍候再試。';
}

// 台灣最新地震報告 (中央氣象署 OpenData + USGS 雙備援)
function getLatestEarthquakeText() {
  try {
    var url = 'https://exp.api.cwb.gov.tw/api/v1/rest/datastore/E-A0015-001?Authorization=rdec-key-123-45678-011121314&format=JSON';
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      var eq = json.records.Earthquake[0];
      var info = eq.EarthquakeInfo;
      return [
        '🌋 【台灣最新地震速報】',
        '-------------------------',
        '📅 時間：' + info.OriginTime,
        '📍 震央位置：' + info.Epicenter.Location,
        '💥 地震規模：M(L) ' + info.EarthquakeMagnitude.MagnitudeValue,
        '📏 震源深度：' + info.FocalDepth + ' 公里',
        '-------------------------',
        '🔗 完整報告：' + eq.Web
      ].join('\n');
    }
  } catch (e) {}

  // 備援：USGS 台灣周邊顯著地震
  try {
    var url2 = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=23.7&longitude=121&maxradiuskm=350&minmagnitude=3.5&limit=1';
    var res2 = UrlFetchApp.fetch(url2, { muteHttpExceptions: true });
    if (res2.getResponseCode() === 200) {
      var data = JSON.parse(res2.getContentText());
      if (data.features && data.features.length > 0) {
        var prop = data.features[0].properties;
        var timeStr = Utilities.formatDate(new Date(prop.time), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
        return [
          '🌋 【最新顯著地震 (USGS)】',
          '-------------------------',
          '📅 時間：' + timeStr,
          '📍 區域：' + prop.place,
          '💥 規模：M ' + prop.mag,
          '-------------------------',
          '🔗 詳細資料：' + prop.url
        ].join('\n');
      }
    }
  } catch (e2) {}

  return '📢 最近台灣周邊暫無規模 3.5 以上顯著有感地震報告。';
}

// 今日台灣中油即時油價 (Goodlife API 穩定版)
function getFuelPriceText() {
  try {
    var url = 'https://gas.goodlife.tw/gas.json';
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      var data = JSON.parse(res.getContentText());
      var p92 = data.gas_92 || '--';
      var p95 = data.gas_95 || '--';
      var p98 = data.gas_98 || '--';
      var pDiesel = data.diesel || '--';
      var notice = data.share_text || '下週油價預測持平';

      return [
        '⛽ 【中油最新即時油價】',
        '-------------------------',
        '🚗 92 無鉛汽油：' + p92 + ' 元/公升',
        '🚗 95 無鉛汽油：' + p95 + ' 元/公升',
        '🚗 98 無鉛汽油：' + p98 + ' 元/公升',
        '🚛 超級柴油：' + pDiesel + ' 元/公升',
        '-------------------------',
        '📢 公告資訊：' + notice
      ].join('\n');
    }
  } catch (e) {
    console.error("油價解析異常: " + e.toString());
  }
  return '⚠️ 目前油價伺服器連線維護中，請稍候再試。';
}

// Steam 限時免費遊戲 (GamerPower API)
function getSteamFreeGamesText() {
  try {
    var url = 'https://www.gamerpower.com/api/giveaways?platform=steam';
    var response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      var games = JSON.parse(response.getContentText());
      if (Array.isArray(games) && games.length > 0) {
        var text = '🎮 【Steam 限免好康】\n-------------------------';
        var topGames = games.slice(0, 3);
        topGames.forEach(function(game) {
          text += '\n📌 ' + game.title + '\n🔗 領取網址：' + (game.open_giveaway_url || game.gamerpower_url) + '\n';
        });
        return text.trim();
      }
    }
  } catch (e) {}
  return '🎮 目前 Steam 上暫無限免活動，你可以逛逛 Steam 特惠專區：\nhttps://store.steampowered.com/specials';
}

// 今日運勢
function getFortuneText() {
  var fortunes = [
    { title: '大吉 🌟', desc: '今天好運連連，不管是工作還是生活都能順風順水，出門會有小驚喜！' },
    { title: '中吉 ☀️', desc: '今天充滿正面能量，適合開啟新計畫，合作順利。' },
    { title: '吉 😊', desc: '平淡中自帶小確幸，適合喝杯好咖啡犒賞自己。' },
    { title: '小吉 🍀', desc: '凡事循序漸進，不急躁便能穩妥達成目標。多走動、多喝水！' }
  ];
  var luckyColors = ['米白色', '天藍色', '森林綠', '琥珀黃', '櫻花粉'];
  var randomF = fortunes[Math.floor(Math.random() * fortunes.length)];
  var color = luckyColors[Math.floor(Math.random() * luckyColors.length)];

  return [
    '🔮 【今日運勢靈籤】',
    '-------------------------',
    '✨ 運勢：' + randomF.title,
    '💬 解曰：' + randomF.desc,
    '🎨 幸運色：' + color
  ].join('\n');
}

// ==========================================
// 8. 回傳訊息至 LINE (免費 Reply API)
// ==========================================
function replyMessage(replyToken, messageText) {
  var url = 'https://api.line.me/v2/bot/message/reply';
  if (messageText.length > 4900) {
    messageText = messageText.substring(0, 4900) + "\n\n...(回覆文字過長已截斷)";
  }

  UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CONFIG.LINE_ACCESS_TOKEN.trim()
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: messageText }]
    }),
    muteHttpExceptions: true
  });
}

// ==========================================
// 9. 測試函式 (可在 GAS 編輯器中直接執行除錯)
// ==========================================
function testWebSearch() {
  var res = searchWebMulti("花蓮今天天氣", 3);
  Logger.log("搜尋摘要:\n" + res.contextText);
  Logger.log("來源網址:\n" + res.sources.join("\n"));
}

function testHandleSmartAnswer() {
  var ans = handleSmartAnswer("請告訴我花蓮名產是什麼？");
  Logger.log("回答結果:\n" + ans);
}

// 專門測試 Gemini API 連線與金鑰有效性
function testGeminiDirect() {
  try {
    Logger.log("正在測試 Gemini API 連線...");
    var ans = callGeminiWithContext("請用繁體中文說一句問候語", "");
    Logger.log("✅ Gemini 測試成功！回覆內容：\n" + ans);
  } catch (err) {
    Logger.log("❌ Gemini 測試失敗！詳細原因：\n" + err.message);
  }
}
