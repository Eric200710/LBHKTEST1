// v02: 基礎驗證版本 - 收到任何訊息只回覆 'hi'
const CONFIG = {
  LINE_ACCESS_TOKEN: 'YOUR_LINE_ACCESS_TOKEN'
};

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.type === 'message') {
        replyMessage(event.replyToken, "hi");
      }
    }
  } catch (err) {}
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
