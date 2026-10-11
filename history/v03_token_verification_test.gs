// v03: LINE 官方 Channel 連線與 Token 驗證函式
function testSend() {
  const url = 'https://api.line.me/v2/bot/info';
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + CONFIG.LINE_ACCESS_TOKEN.trim() },
    muteHttpExceptions: true
  });
  console.log('LINE 機器人狀態碼: ' + response.getResponseCode());
  console.log('LINE 機器人資訊: ' + response.getContentText());
}
