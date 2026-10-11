// v07: 指令分支整合 - 免費遊戲跳過 Gemini，其餘對話由 Gemini 回覆
if (userPrompt === '免費遊戲' || userPrompt === '限免') {
  replyMessageText = getSteamFreeGamesText();
} else {
  replyMessageText = callGemini(userPrompt);
}
