// v14: 對齊 Goodlife JSON 真實欄位名稱
function getFuelPriceText() {
  const data = JSON.parse(res.getContentText());
  const p92 = data.gas_92;
  const p95 = data.gas_95;
  const p98 = data.gas_98;
  const pDiesel = data.diesel;
  const notice = data.share_text;
}
