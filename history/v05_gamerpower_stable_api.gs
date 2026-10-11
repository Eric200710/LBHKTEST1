// v05: 改用 GamerPower API 避免被 CheapShark 封鎖
function getSteamFreeGamesText() {
  const url = 'https://www.gamerpower.com/api/giveaways?platform=steam';
  const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  if (response.getResponseCode() === 200) {
    const games = JSON.parse(response.getContentText());
    if (Array.isArray(games) && games.length > 0) {
      return games.slice(0, 3).map(g => `• ${g.title}\n  ${g.open_giveaway_url}`).join('\n');
    }
  }
  return '目前暫無限免活動';
}
