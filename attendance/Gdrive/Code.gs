// ============================================================
// Code.gs
// Attendance Web App
//
// Configuration : config.gs
// Logger        : logger.js
// ============================================================
var CACHED_SS = null;
// ============================================================
// SPREADSHEET
// ============================================================
function getTargetSpreadsheet() {
  if (CACHED_SS) return CACHED_SS;
  CACHED_SS = SPREADSHEET_URL
    ? SpreadsheetApp.openByUrl(SPREADSHEET_URL)
    : SpreadsheetApp.getActiveSpreadsheet();
  return CACHED_SS;
}
// ============================================================
// GET
// ============================================================
function doGet() {
  var logs = ["|=== [doGet] Request Received ===|"];
  try {
    var data = getClassConfigurations();
    logs.push("✅ Processed dates: " + Object.keys(data).join(", "));
    logToSheet(logs.join(" \n "));
    return json({ status: "success", data: data });
  } catch (err) {
    logs.push("❌ " + err.toString());
    logToSheet(logs.join(" \n "));
    return json({
      status: "error",
      message: err.toString()
    });
  }
}
// ============================================================
// POST
// ============================================================
function doPost(e) {
  var logs = ["|=== [doPost] Request Received ===|"];
  var lock = null;
  try {
    // --------------------------------------------------------
    // Parse request
    // --------------------------------------------------------
    var request = parseRequest(e);
    logs.push(
      "Date='" + request.date +
      "', Group='" + request.group +
      "', Email='" + request.email +
      "', Roll='" + request.roll +
      "', Serial=" + request.serial
    );
    // --------------------------------------------------------
    // Validate request
    // --------------------------------------------------------
    var validation = validateRequest(request);
    if (!validation.valid) {
      logs.push("❌ " + validation.message);
      logToSheet(logs.join(" \n "));
      return json({ status: "error", message: validation.message });
    }
    var ss = getTargetSpreadsheet();
    // --------------------------------------------------------
    // Verify roll number
    // --------------------------------------------------------
    if (!verifyRollNumber(ss, request.roll)) {
      logs.push("⚠️ Roll Number not found: " + request.roll);
      logToSheet(logs.join(" \n "));
      return json({
        status: "error",
        message: "Roll Number not in list"
      });
    }
    logs.push("✅ Roll Number '" + request.roll + "' verified.");
    // --------------------------------------------------------
    // Get class configuration
    // --------------------------------------------------------
    var classConfig = getClassConfig(ss, request.date, request.group);
    if (!classConfig) {
      var configMessage =
        "No valid class configuration found for " +
        request.date + " / " + request.group;
      logs.push("❌ " + configMessage);
      logToSheet(logs.join(" \n "));
      return json({
        status: "error",
        message: configMessage
      });
    }
    // --------------------------------------------------------
    // Check maximum seat
    // --------------------------------------------------------
    if (request.serial > classConfig.maxSerial) {
      var seatMessage =
        "Serial Number " + request.serial +
        " exceeds the maximum allowed seat limit (" +
        classConfig.maxSerial + ").";
      logs.push("⚠️ " + seatMessage);
      logToSheet(logs.join(" \n "));
      return json({
        status: "conflict",
        message: seatMessage
      });
    }
    // --------------------------------------------------------
    // Lock before sheet creation and duplicate check
    // --------------------------------------------------------
    lock = LockService.getScriptLock();
    lock.waitLock(30000);
    // --------------------------------------------------------
    // Get or create attendance sheet
    // --------------------------------------------------------
    var sheet = getOrCreateAttendanceSheet(ss, request.date, request.group);
    // --------------------------------------------------------
    // Duplicate check
    // --------------------------------------------------------
    var conflict = checkDuplicate(sheet, request.roll, request.serial);
    if (conflict) {
      logs.push("⚠️ " + conflict.message);
      logToSheet(logs.join(" \n "));
      return json({ status: "conflict", message: conflict.message });
    }
    // --------------------------------------------------------
    // Save attendance
    // --------------------------------------------------------
    saveAttendance(sheet, request);
    logs.push(
      "✅ Attendance saved: Roll=" +
      request.roll + ", Seat=" + request.serial
    );
    logToSheet(logs.join(" \n "));
    return json({
      status: "success",
      message:
        "Attendance marked successfully for Seat #" +
        request.serial + "!"
    });
  } catch (err) {
    logs.push("❌ Exception: " + err.toString());
    logToSheet(logs.join(" \n "));
    return json({
      status: "error",
      message: err.toString()
    });
  } finally {
    releaseLock(lock);
  }
}
