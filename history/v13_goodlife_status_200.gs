// v13: 改用 Goodlife API 成功取得 HTTP 200
function getFuelPriceText_Attempt3() {
  const url = 'https://gas.goodlife.tw/gas.json';
  const res = UrlFetchApp.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log('Status: ' + res.getResponseCode());
}
