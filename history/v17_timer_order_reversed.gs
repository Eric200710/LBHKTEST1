// v17: 計時器初版 (發現先 sleep 後 reply 導致順序相反)
function handleTimerCommand_V1(num, unit, task) {
  Utilities.sleep(num * 1000);
  pushMessage(userId, '時間到囉');
  return '設定成功'; // 導致順序顛倒
}
