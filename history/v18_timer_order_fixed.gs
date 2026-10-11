// v18: 計時器順序修正 (先立即 replyMessage，再背景 sleep 或設定 Trigger)
replyMessage(replyToken, `⏱️ 計時器已啟動！`);
if (totalSeconds <= 60) {
  Utilities.sleep(totalSeconds * 1000);
  pushMessage(userId, `⏰ 時間到囉！`);
}
