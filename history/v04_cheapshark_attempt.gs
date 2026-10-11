// v04: 嘗試以 CheapShark API 抓取 Steam 限免
function getSteamFreeGamesText() {
  const url = 'https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=0&sortBy=Recent&pageSize=5';
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return 'API 忙碌中';
  const deals = JSON.parse(response.getContentText());
  return deals.map(d => `• ${d.title} (省下 ${Math.round(parseFloat(d.savings))}%)`).join('\n');
}
