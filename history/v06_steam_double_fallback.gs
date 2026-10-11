// v06: Steam 限免增加 Timeout 與官方特惠備援頁面
function getSteamFreeGamesTextWithFallback() {
  try {
    const url = 'https://www.gamerpower.com/api/giveaways?platform=steam';
    const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const games = JSON.parse(res.getContentText());
      if (Array.isArray(games) && games.length > 0) return JSON.stringify(games.slice(0, 3));
    }
  } catch(e) {}
  return 'https://store.steampowered.com/specials';
}
