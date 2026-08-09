function logToSheet(message) {
  try {
    var safeMessage = (typeof message === 'object') ? JSON.stringify(message) : String(message);
    var ss = getTargetSpreadsheet();
    if (!ss) return;
    var logSheet = ss.getSheetByName("Logs");
    if (!logSheet) {
      logSheet = ss.insertSheet("Logs");
      logSheet.appendRow(["Timestamp", "Log Message"]);
      logSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#f3f3f3");
      logSheet.setColumnWidth(1, 150);
      logSheet.setColumnWidth(2, 600);
    }
    logSheet.appendRow([new Date(), safeMessage]);
  } catch (err) {
    console.error("🚨 logToSheet Failed: " + err.toString());
  }
}
