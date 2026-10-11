// v09: 花蓮即時氣象 (Open-Meteo 免金鑰 API)
function getHualienWeatherText() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=23.987&longitude=121.601&current=temperature_2m,apparent_temperature,precipitation,weather_code&timezone=Asia%2FTaipei';
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  // 解析氣溫與天氣代碼
}
