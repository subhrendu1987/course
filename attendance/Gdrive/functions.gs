function MATCHING_SHEETS(section) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pattern = new RegExp("^\\d{2}_\\d{2}_2026_" + section + "$");

  return [ss.getSheets().map(sheet => sheet.getName()).filter(name => pattern.test(name))];
}

// ------------------------------------------------------------
// JSON response helper
// ------------------------------------------------------------

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
