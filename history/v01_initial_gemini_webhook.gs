// v01: 最初 Gemini + LINE Webhook 基礎版本 (含 503 自動重試)
const CONFIG = {
  LINE_ACCESS_TOKEN: 'YOUR_LINE_ACCESS_TOKEN',
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
  GEMINI_MODEL: 'gemini-1.5-flash'
};

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.type === 'message' && event.message.type === 'text') {
        const userPrompt = event.message.text.trim();
        const replyToken = event.replyToken;
        const aiResponse = callGemini(userPrompt);
        replyMessage(replyToken, aiResponse);
      }
    }
  } catch (err) {
    console.error("處理 Webhook 錯誤: " + err.toString());
  }
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
