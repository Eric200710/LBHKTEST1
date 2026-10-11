// ==========================================
// LBHKTEST1 - LINE Bot 智慧助理主程式 (最新穩定版)
// 功能特色：
// 1. 實用指令：/help、天氣 (花蓮)、地震速報、中油即時油價、Steam 限免遊戲、每日運勢
// 2. 智慧大腦：其餘對話自動交由 Google Gemini AI (gemini-1.5-flash) 進行智慧對答
// ==========================================

// ==========================================
// 1. 金鑰與核心設定
// 請在此填入您的 LINE Channel Access Token 與 Gemini API Key
// ==========================================
const CONFIG = {
  // LINE Channel Access Token (請至 LINE Developers 後台取得)
  LINE_ACCESS_TOKEN: 'YOUR_LINE_ACCESS_TOKEN',

  // Google Gemini API Key (請至 Google AI Studio 取得)
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',

  // Gemini 官方推薦極速模型
  GEMINI_MODEL: 'gemini-1.5-flash'
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

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (event.type === 'message' && event.message.type === 'text') {
        const userPrompt = event.message.text.trim();
        const replyToken = event.replyToken;

        let replyMessageText = "";

        // 【生活實用指令庫】
        if (userPrompt.toLowerCase() === '/help' || userPrompt === '說明' || userPrompt === '指令' || userPrompt === '幫助') {
          replyMessageText = getHelpText();
        } else if (userPrompt === '天氣' || userPrompt === '花蓮天氣') {
          replyMessageText = getHualienWeatherText();
        } else if (userPrompt === '地震' || userPrompt === '地震報告') {
          replyMessageText = getLatestEarthquakeText();
        } else if (userPrompt === '油價' || userPrompt === '今日油價') {
          replyMessageText = getFuelPriceText();
        } else if (userPrompt === '免費遊戲' || userPrompt === '限免' || userPrompt.toLowerCase() === 'free game') {
          replyMessageText = getSteamFreeGamesText();
        } else if (userPrompt === '運勢' || userPrompt === '今日運勢') {
          replyMessageText = getFortuneText();
        } else {
          // 其餘對話交給 Gemini AI
          replyMessageText = callGemini(userPrompt);
        }

        // 即時免費回覆給使用者
        replyMessage(replyToken, replyMessageText);
      }
    }
  } catch (err) {
    console.error("處理 Webhook 錯誤: " + err.toString());
  }

  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

// ==========================================
// 3. 生活實用功能函式庫
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
    '💬 其它任何文字直接打，Gemini AI 會即時回答喔！'
  ].join('\n');
}

// 花蓮即時氣象 (Open-Meteo 免金鑰 API)
function getHualienWeatherText() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=23.987&longitude=121.601&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FTaipei';
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText()).current;
      const codeMap = {
        0: '晴朗 ☀️', 1: '大致晴朗 🌤️', 2: '局部多雲 ⛅', 3: '多雲陰天 ☁️',
        45: '起霧 🌫️', 48: '有濃霧 🌫️', 51: '微毛毛雨 🌦️', 61: '小雨 🌧️',
        63: '中雨 🌧️', 65: '大雨 ⛈️', 80: '局部陣雨 🌦️', 95: '雷陣雨 ⛈️'
      };
      const condition = codeMap[data.weather_code] || '多雲 🌥️';

      return [
        '⛅ 【花蓮即時氣象資訊】',
        '-------------------------',
        `🌡️ 即時氣溫：${data.temperature_2m} °C`,
        `👕 體感溫度：${data.apparent_temperature} °C`,
        `🌤️ 天氣狀況：${condition}`,
        `💧 相對濕度：${data.relative_humidity_2m} %`,
        `🌧️ 目前降雨量：${data.precipitation} mm`,
        `💨 風速：${data.wind_speed_10m} km/h`,
        '-------------------------',
        '※ 出門記得攜帶雨具，注意安全喔！'
      ].join('\n');
    }
  } catch (e) {
    console.error('查詢天氣失敗: ' + e.toString());
  }
  return '⚠️ 目前無法取得花蓮天氣資訊，請稍後再試。';
}

// 台灣最新地震報告 (中央氣象署 OpenData + USGS 雙備援)
function getLatestEarthquakeText() {
  try {
    const url = 'https://exp.api.cwb.gov.tw/api/v1/rest/datastore/E-A0015-001?Authorization=rdec-key-123-45678-011121314&format=JSON';
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      const eq = json.records.Earthquake[0];
      const info = eq.EarthquakeInfo;
      return [
        '🌋 【台灣最新地震速報】',
        '-------------------------',
        `📅 時間：${info.OriginTime}`,
        `📍 震央位置：${info.Epicenter.Location}`,
        `💥 地震規模：M(L) ${info.EarthquakeMagnitude.MagnitudeValue}`,
        `📏 震源深度：${info.FocalDepth} 公里`,
        '-------------------------',
        `🔗 完整報告：${eq.Web}`
      ].join('\n');
    }
  } catch (e) {}

  // 備援：USGS 台灣周邊顯著地震
  try {
    const url2 = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=23.7&longitude=121&maxradiuskm=350&minmagnitude=3.5&limit=1';
    const res2 = UrlFetchApp.fetch(url2, { muteHttpExceptions: true });
    if (res2.getResponseCode() === 200) {
      const data = JSON.parse(res2.getContentText());
      if (data.features && data.features.length > 0) {
        const prop = data.features[0].properties;
        const timeStr = Utilities.formatDate(new Date(prop.time), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
        return [
          '🌋 【最新顯著地震 (USGS)】',
          '-------------------------',
          `📅 時間：${timeStr}`,
          `📍 區域：${prop.place}`,
          `💥 規模：M ${prop.mag}`,
          '-------------------------',
          `🔗 詳細資料：${prop.url}`
        ].join('\n');
      }
    }
  } catch (e2) {}

  return '📢 最近台灣周邊暫無規模 3.5 以上顯著有感地震報告。';
}

// 今日台灣中油即時油價 (Goodlife API 穩定版)
function getFuelPriceText() {
  try {
    const url = 'https://gas.goodlife.tw/gas.json';
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      const p92 = data.gas_92 || '--';
      const p95 = data.gas_95 || '--';
      const p98 = data.gas_98 || '--';
      const pDiesel = data.diesel || '--';
      const notice = data.share_text || '下週油價預測持平';

      return [
        '⛽ 【中油最新即時油價】',
        '-------------------------',
        `🚗 92 無鉛汽油：${p92} 元/公升`,
        `🚗 95 無鉛汽油：${p95} 元/公升`,
        `🚗 98 無鉛汽油：${p98} 元/公升`,
        `🚛 超級柴油：${pDiesel} 元/公升`,
        '-------------------------',
        `📢 公告資訊：${notice}`
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
    const url = 'https://www.gamerpower.com/api/giveaways?platform=steam';
    const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });

    if (response.getResponseCode() === 200) {
      const games = JSON.parse(response.getContentText());
      if (Array.isArray(games) && games.length > 0) {
        let text = '🎮 【Steam 限免好康】\n-------------------------';
        const topGames = games.slice(0, 3);
        topGames.forEach(game => {
          text += `\n📌 ${game.title}\n🔗 領取網址：${game.open_giveaway_url || game.gamerpower_url}\n`;
        });
        return text.trim();
      }
    }
  } catch (e) {}
  return '🎮 目前 Steam 上暫無限免活動，你可以逛逛 Steam 特惠專區：\nhttps://store.steampowered.com/specials';
}

// 今日運勢
function getFortuneText() {
  const fortunes = [
    { title: '大吉 🌟', desc: '今天好運連連，不管是工作還是生活都能順風順水，出門會有小驚喜！' },
    { title: '中吉 ☀️', desc: '今天充滿正面能量，適合開啟新計畫，合作順利。' },
    { title: '吉 😊', desc: '平淡中自帶小確幸，適合喝杯好咖啡犒賞自己。' },
    { title: '小吉 🍀', desc: '凡事循序漸進，不急躁便能穩妥達成目標。多走動、多喝水！' }
  ];
  const luckyColors = ['米白色', '天藍色', '森林綠', '琥珀黃', '櫻花粉'];
  const randomF = fortunes[Math.floor(Math.random() * fortunes.length)];
  const color = luckyColors[Math.floor(Math.random() * luckyColors.length)];

  return [
    `🔮 【今日運勢靈籤】`,
    '-------------------------',
    `✨ 運勢：${randomF.title}`,
    `💬 解曰：${randomF.desc}`,
    `🎨 幸運色：${color}`
  ].join('\n');
}

// ==========================================
// 4. 呼叫 Google Gemini API
// ==========================================
function callGemini(prompt) {
  const apiKey = CONFIG.GEMINI_API_KEY.trim();
  const models = [CONFIG.GEMINI_MODEL, 'gemini-1.5-flash', 'gemini-2.0-flash'];

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  for (let m = 0; m < models.length; m++) {
    const modelName = models[m];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const result = JSON.parse(response.getContentText());

      if (statusCode === 200 && result.candidates && result.candidates.length > 0) {
        return result.candidates[0].content.parts[0].text;
      }
    } catch (err) {}
  }

  return "【Gemini 目前連線繁忙，請稍候片刻再試】";
}

// ==========================================
// 5. 回傳訊息至 LINE (免費 Reply API)
// ==========================================
function replyMessage(replyToken, messageText) {
  const url = 'https://api.line.me/v2/bot/message/reply';
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
