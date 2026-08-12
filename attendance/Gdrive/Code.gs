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
  if (/^\d{2}_\d{2}_\d{4}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  var match = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (match) return match[1] + "_" + match[2] + "_" + match[3];

  var d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, TIME_ZONE, DATE_FORMAT);
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
// GET CONFIGURATION DATA
// ============================================================

function getClassConfigurations() {
  var ss = getTargetSpreadsheet();
  var sheet = getRequiredSheet(ss, CONFIG_SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var data = {};

  for (var i = 1; i < values.length; i++) {
    var date = normalizeDate(values[i][CONFIG_DATE_COLUMN - 1]);
    var group = String(values[i][CONFIG_GROUP_COLUMN - 1] || "").trim();
    var imageUrl = String(values[i][CONFIG_IMAGE_URL_COLUMN - 1] || "").trim();
    var maxSerial = parseInt(values[i][CONFIG_MAX_SERIAL_COLUMN - 1], 10);

    if (!date || !group || date === "Date") continue;
    if (!data[date]) data[date] = [];

    data[date].push({
      group: group,
      imageUrl: imageUrl,
      maxSerial: isNaN(maxSerial) ? null : maxSerial
    });
  }

  return data;
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
    var sheet = getOrCreateAttendanceSheet(ss,request.date,request.group);
    // --------------------------------------------------------
    // Duplicate check
    // --------------------------------------------------------
    var conflict = checkDuplicate(sheet,request.roll,request.serial);

    if (conflict) {
      logs.push("⚠️ " + conflict.message);
      logToSheet(logs.join(" \n "));
      return json({status: "conflict",message: conflict.message});
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

// ============================================================
// REQUEST PARSING
// ============================================================

function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("No post contents received.");
  }

  var data;

  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error("Invalid JSON payload.");
  }

  return {
    date: normalizeDate(data.date),
    group: String(data.group || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    roll: String(data.rollNumber || "").trim(),
    serial: parseInt(data.serialNumber, 10)
  };
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

function validateRequest(request) {
  if (!request.date) {
    return { valid: false, message: "Date is required." };
  }

  if (!request.group) {
    return { valid: false, message: "Group is required." };
  }

  if (!request.email) {
    return { valid: false, message: "Email is required." };
  }

  if (!request.roll) {
    return { valid: false, message: "Roll Number is required." };
  }

  if (isNaN(request.serial) || request.serial <= 0) {
    return {
      valid: false,
      message: "Serial Number must be a positive number."
    };
  }

  return { valid: true, message: "" };
}

// ============================================================
// SHEET ACCESS
// ============================================================

function getRequiredSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("Sheet '" + sheetName + "' not found.");
  }

  return sheet;
}

// ============================================================
// ROLL NUMBER VALIDATION
// ============================================================

function verifyRollNumber(ss, roll) {
  var sheet = getRequiredSheet(ss, MYGROUPS_SHEET_NAME);
  var lastRow = sheet.getLastRow();

  if (lastRow < 1) return false;

  var values = sheet.getRange(
    1,
    MYGROUPS_ROLL_COLUMN,
    lastRow,
    1
  ).getValues();

  var target = roll.toLowerCase();

  for (var i = 0; i < values.length; i++) {
    var current = String(values[i][0] || "").trim().toLowerCase();

    if (current === target) return true;
  }

  return false;
}

// ============================================================
// CLASS CONFIGURATION
// ============================================================

function getClassConfig(ss, date, group) {
  var sheet = getRequiredSheet(ss, CONFIG_SHEET_NAME);
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    var configDate = normalizeDate(
      values[i][CONFIG_DATE_COLUMN - 1]
    );

    var configGroup = String(
      values[i][CONFIG_GROUP_COLUMN - 1] || ""
    ).trim();

    if (configDate !== date || configGroup !== group) continue;

    var maxSerial = parseInt(
      values[i][CONFIG_MAX_SERIAL_COLUMN - 1],
      10
    );

    if (isNaN(maxSerial)) return null;

    return {
      date: configDate,
      group: configGroup,
      imageUrl: String(
        values[i][CONFIG_IMAGE_URL_COLUMN - 1] || ""
      ).trim(),
      maxSerial: maxSerial
    };
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

  sheet.getRange(ATTENDANCE_START_ROW,1,rowCount,sheet.getLastColumn()).clearContent();
}

// ============================================================
// DUPLICATE CHECK
// ============================================================
function checkDuplicate(sheet, roll, serial) {
  var lastRow = sheet.getLastRow();
  if (lastRow < ATTENDANCE_START_ROW) return null;
  var rowCount = lastRow - ATTENDANCE_START_ROW + 1;
  var rows = sheet.getRange(
    ATTENDANCE_START_ROW,
    1,
    rowCount,
    ATTENDANCE_COLUMN_COUNT
  ).getValues();

  for (var i = 0; i < rows.length; i++) {
    // Column B = Email
    var oldEmail = String(rows[i][1] || "").trim();

    // Column C = Roll Number
    var oldRoll = String(rows[i][2] || "").trim();

    // Column D = Serial Number
    var oldSerial = parseInt(rows[i][3], 10);

    // --------------------------------------------------------
    // Duplicate Roll
    // --------------------------------------------------------

    if (oldRoll.toLowerCase() === roll.toLowerCase()) {
      return {
        type: "roll",
        message:
          "Roll Number " + roll +
          " has already submitted attendance. " +
          "Email ID: " + oldEmail
      };
    }

    // --------------------------------------------------------
    // Duplicate Seat
    // --------------------------------------------------------

    if (oldSerial === serial) {
      return {
        type: "seat",
        message:
          "Seat #" + serial +
          " has already been claimed by Roll Number " +
          oldRoll + ". Email ID: " + oldEmail
      };
    }
  }

  return null;
}
// ============================================================
// SAVE ATTENDANCE
// ============================================================
function saveAttendance(sheet, request) {
  var timestamp = Utilities.formatDate(new Date(),TIME_ZONE,"yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([timestamp,request.email,request.roll,request.serial]);
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
