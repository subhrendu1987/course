// ============================================================
// SPREADSHEET
// ============================================================
function getTargetSpreadsheet() {
  if (CACHED_SS) {
    return CACHED_SS;
  }
  CACHED_SS = SPREADSHEET_URL
    ? SpreadsheetApp.openByUrl(SPREADSHEET_URL)
    : SpreadsheetApp.getActiveSpreadsheet();
  return CACHED_SS;
}
// ============================================================
// RESPONSE
// ============================================================
function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
// ============================================================
// DATE
// ============================================================
function normalizeDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, TIME_ZONE, DATE_FORMAT);
  }
  var s = String(value || "").trim();
  // DD_MM_YYYY
  if (/^\d{2}_\d{2}_\d{4}$/.test(s)) {
    return s;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  var match = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (match) {
    return match[1] + "_" + match[2] + "_" + match[3];
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, TIME_ZONE, DATE_FORMAT);
}
// ============================================================
// DUPLICATE CHECK
// ============================================================
function checkDuplicate(sheet, roll, serial) {
  var lastRow = sheet.getLastRow();
  if (lastRow < ATTENDANCE_START_ROW) return null;
  var rowCount = lastRow - ATTENDANCE_START_ROW + 1;
  var rows = sheet.getRange(ATTENDANCE_START_ROW, 1, rowCount, ATTENDANCE_COLUMN_COUNT).getValues();
  for (var i = 0; i < rows.length; i++) {
    // Column B = Email
    var oldEmail = String(rows[i][1] || "").trim();
    // Column C = Roll Number
    var oldRoll = String(rows[i][2] || "").trim();
    // Column D = Serial Number
    var oldSerial = parseInt(rows[i][3], 10);
    // Duplicate Roll
    if (oldRoll.toLowerCase() === roll.toLowerCase()) {
      return {
        type: "roll",
        message: "Roll Number " + roll + " has already submitted attendance. Email ID: " + oldEmail
      };
    }
    // Duplicate Seat
    if (oldSerial === serial) {
      return {
        type: "seat",
        message: "Seat #" + serial + " has already been claimed by Roll Number " + oldRoll + ". Email ID: " + oldEmail
      };
    }
  }
  return null;
}
// ============================================================
// ATTENDANCE SHEET
// ============================================================
function getAttendanceSheetName(date, group) {
  return date + ATTENDANCE_SHEET_SEPARATOR + group;
}
function getOrCreateAttendanceSheet(ss, date, group) {
  var sheetName = getAttendanceSheetName(date, group);
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;
  var template = ss.getSheetByName(TEMPLATE_SHEET_NAME);
  if (template) {
    sheet = template.copyTo(ss);
    sheet.setName(sheetName);
    clearAttendanceData(sheet);
  } else {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(ATTENDANCE_HEADERS);
  }
  return sheet;
}
function clearAttendanceData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < ATTENDANCE_START_ROW) return;
  var rowCount = lastRow - ATTENDANCE_START_ROW + 1;
  sheet.getRange(ATTENDANCE_START_ROW, 1, rowCount, sheet.getLastColumn()).clearContent();
}
// ============================================================
// SAVE ATTENDANCE
// ============================================================
function saveAttendance(sheet, request) {
  var timestamp = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([timestamp, request.email, request.roll, request.serial]);
}
// ============================================================
// LOCK
// ============================================================
function releaseLock(lock) {
  if (!lock) return;
  try {
    lock.releaseLock();
  } catch (err) {
    // Ignore lock release errors
  }
}
