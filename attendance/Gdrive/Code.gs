SPREADSHEET_URL="https://docs.google.com/spreadsheets/d/1PAFVJikqdhM7u5Cd6Jv89m_uURquVX8w6rEjXRxn7u8/"

// Global cached spreadsheet variable to avoid repeating openByUrl calls
var CACHED_SS = null;

// Helper function to safely get the target spreadsheet
function getTargetSpreadsheet() {
  if (CACHED_SS) {
    return CACHED_SS;
  }
  if (SPREADSHEET_URL) {
    CACHED_SS = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  } else {
    CACHED_SS = SpreadsheetApp.getActiveSpreadsheet();
  }  
  return CACHED_SS;
}

// Health-check endpoint for browser GET requests
function doGet(e) {
  var logBuffer = ["|=== [doGet] Request Received ===|\n"];
  var result = { status: "success", data: {} };
  
  try {
    var ss = getTargetSpreadsheet();
    var sheet = ss.getSheetByName("Config");
    
    if (!sheet) {
      logBuffer.push("❌ [doGet] Error: Sheet 'Config' not found.");
      logToSheet(logBuffer.join(" \n "));
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Sheet 'Config' not found." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var values = sheet.getDataRange().getValues();
    logBuffer.push("Retrieved " + values.length + " rows from 'Config' sheet.");
    
    var availableData = {};
    
    // Skip row 0 (Headers: Date, Group, ImageUrl, MaxSerial)
    for (var i = 1; i < values.length; i++) {
      var date = String(values[i][0]).trim();
      var group = String(values[i][1]).trim();
      var imageUrl = String(values[i][2]).trim();
      var maxSerial = parseInt(String(values[i][3]).trim(), 10);
      
      if (date && group && date !== "Date") {
        if (!availableData[date]) {
          availableData[date] = [];
        }
        availableData[date].push({
          group: group,
          imageUrl: imageUrl,
          maxSerial: isNaN(maxSerial) ? null : maxSerial
        });
      }
    }
    
    result.data = availableData;
    logBuffer.push("✅ Processed dates: " + Object.keys(availableData).join(", "));
  } catch (err) {
    logBuffer.push("❌ Exception: " + err.toString());
    result = { status: "error", message: err.toString() };
  }
  
  // Single write call for all collated logs
  logToSheet(logBuffer.join(" \n "));

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Attendance processing endpoint for POST requests
function doPost(e) {
  var logBuffer = ["|=== [doPost] Request Received ===|\n"];
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      logBuffer.push("❌ Error: No post contents received.");
      logToSheet(logBuffer.join(" \n "));
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "No post contents received." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    logBuffer.push("Raw Payload: " + e.postData.contents);
    var data = JSON.parse(e.postData.contents);
    
    var date = String(data.date || "").trim();
    var group = String(data.group || "").trim();
    var email = String(data.email || "").trim().toLowerCase();
    var rollNumber = String(data.rollNumber || "").trim();
    var serialNumberNum = parseInt(String(data.serialNumber || "").trim(), 10);

    logBuffer.push("Parsed Parameters -> Date: '" + date + "', Group: '" + group + "', Email: '" + email + "', Roll: '" + rollNumber + "', Serial: " + serialNumberNum);

    if (!date || !group || !rollNumber || isNaN(serialNumberNum)) {
      logBuffer.push("❌ Validation Failed: Missing or invalid required fields.");
      logToSheet(logBuffer.join(" \n "));
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Missing or invalid required fields." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getTargetSpreadsheet();

    // 0. Verify Roll Number exists in MyGroups tab (Column E)
    var myGroupsSheet = ss.getSheetByName("MyGroups");
    if (!myGroupsSheet) {
      logBuffer.push("❌ Error: Sheet 'MyGroups' not found.");
      logToSheet(logBuffer.join(" \n "));
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Sheet 'MyGroups' not found." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRowMyGroups = myGroupsSheet.getLastRow();
    logBuffer.push("'MyGroups' last row: " + lastRowMyGroups);
    var isRollNumberValid = false;

    if (lastRowMyGroups >= 1) {
      var rollNumberList = myGroupsSheet.getRange(1, 5, lastRowMyGroups, 1).getValues();
      for (var j = 0; j < rollNumberList.length; j++) {
        if (String(rollNumberList[j][0]).trim().toLowerCase() === rollNumber.toLowerCase()) {
          isRollNumberValid = true;
          break;
        }
      }
    }

    if (!isRollNumberValid) {
      logBuffer.push("⚠️ Roll Number validation failed: '" + rollNumber + "' not found in Column E of MyGroups.");
      logToSheet(logBuffer.join(" \n "));
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "error",
          message: "Roll Number not in list"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    logBuffer.push("✅ Roll Number '" + rollNumber + "' verified in MyGroups.");

    // 1. Validate maxSerial limit from 'Config' Sheet
    var configSheet = ss.getSheetByName("Config");
    var maxSerialLimit = null;

    if (configSheet) {
      var configValues = configSheet.getDataRange().getValues();
      for (var k = 1; k < configValues.length; k++) {
        var cDate = String(configValues[k][0]).trim();
        var cGroup = String(configValues[k][1]).trim();
        if (cDate === date && cGroup === group) {
          var parsedMax = parseInt(String(configValues[k][3]).trim(), 10);
          if (!isNaN(parsedMax)) {
            maxSerialLimit = parsedMax;
          }
          break;
        }
      }
    }
    logBuffer.push("Max serial limit for date '" + date + "' and group '" + group + "': " + maxSerialLimit);

    if (maxSerialLimit !== null && serialNumberNum > maxSerialLimit) {
      logBuffer.push("⚠️ Conflict: Serial Number " + serialNumberNum + " exceeds maxSerialLimit (" + maxSerialLimit + ").");
      logToSheet(logBuffer.join(" \n "));
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "conflict",
          message: "Serial Number " + serialNumberNum + " exceeds the maximum allowed seat limit (" + maxSerialLimit + ") for this class."
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Target Class Sheet Setup (Copy from Template if sheet doesn't exist)
    var sheetName = date + "_" + group;
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      logBuffer.push("Sheet '" + sheetName + "' does not exist. Creating new sheet...");
      var templateSheet = ss.getSheetByName("Template");
      if (templateSheet) {
        logBuffer.push("Copying from 'Template' sheet.");
        sheet = templateSheet.copyTo(ss);
        sheet.setName(sheetName);
        
        var templateLastRow = sheet.getLastRow();
        if (templateLastRow > 1) {
          sheet.getRange(2, 1, templateLastRow - 1, sheet.getLastColumn()).clearContent();
        }
      } else {
        logBuffer.push("'Template' sheet not found. Creating a blank sheet with default headers.");
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Timestamp", "Email", "Roll Number", "Serial Number"]);
      }
    } else {
      logBuffer.push("Found existing sheet: '" + sheetName + "'.");
    }

    // 3. Duplicate Checking (Roll Number & Seat Number)
    var lastRow = sheet.getLastRow();
    logBuffer.push("Sheet '" + sheetName + "' last row: " + lastRow);
    
    if (lastRow > 1) {
      var existingEntries = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      
      for (var r = 0; r < existingEntries.length; r++) {
        var existingRoll = String(existingEntries[r][2]).trim();
        var existingSerial = parseInt(String(existingEntries[r][3]).trim(), 10);

        if (existingRoll.toLowerCase() === rollNumber.toLowerCase()) {
          logBuffer.push("⚠️ Conflict: Duplicate Roll Number detected (" + rollNumber + ").");
          logToSheet(logBuffer.join(" \n "));
          return ContentService
            .createTextOutput(JSON.stringify({
              status: "conflict",
              message: "Roll Number " + rollNumber + " has already submitted attendance for this class."
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        if (existingSerial === serialNumberNum) {
          logBuffer.push("⚠️ Conflict: Duplicate Seat #" + serialNumberNum + " already claimed by Roll Number " + existingRoll + ".");
          logToSheet(logBuffer.join(" \n "));
          return ContentService
            .createTextOutput(JSON.stringify({
              status: "conflict",
              message: "Seat #" + serialNumberNum + " has already been claimed by Roll Number " + existingRoll + "."
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 4. Save Entry
    //var timestamp = new Date();
    var timestamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([timestamp, email, rollNumber, serialNumberNum]);
    logBuffer.push("✅ Successfully appended attendance entry for Roll: " + rollNumber + ", Seat #" + serialNumberNum);

    // Write all collated logs on success
    logToSheet(logBuffer.join(" \n "));

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Attendance marked successfully for Seat #" + serialNumberNum + "!"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logBuffer.push("❌ Exception: " + error.toString());
    logToSheet(logBuffer.join(" \n "));
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
