SPREADSHEET_URL="https://docs.google.com/spreadsheets/d/1oq-2rCEReb0AbDkTo-iDSxSh1OtY-200dhsQhj1iEuw/"

// Helper function to safely get the target spreadsheet
function getTargetSpreadsheet() {
  if (SPREADSHEET_URL) {
    return SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Health-check endpoint for browser GET requests
function doGet(e) {
  var result = { status: "success", data: {} };
  
  try {
    var ss = getTargetSpreadsheet();
    var sheet = ss.getSheetByName("Config");
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Sheet 'Config' not found." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var values = sheet.getDataRange().getValues();
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
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Attendance processing endpoint for POST requests
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var date = String(data.date || "").trim();
    var group = String(data.group || "").trim();
    var email = String(data.email || "").trim().toLowerCase();
    var rollNumber = String(data.rollNumber || "").trim();
    var serialNumberNum = parseInt(String(data.serialNumber || "").trim(), 10);

    if (!date || !group || !rollNumber || isNaN(serialNumberNum)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Missing or invalid required fields." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getTargetSpreadsheet();

    // 0. Verify Roll Number exists in MyGroups tab (Column E)
    var myGroupsSheet = ss.getSheetByName("MyGroups");
    if (!myGroupsSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Sheet 'MyGroups' not found." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRowMyGroups = myGroupsSheet.getLastRow();
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
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "error",
          message: "Roll Number not in list"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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

    if (maxSerialLimit !== null && serialNumberNum > maxSerialLimit) {
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
      var templateSheet = ss.getSheetByName("Template");
      if (templateSheet) {
        sheet = templateSheet.copyTo(ss);
        sheet.setName(sheetName);
        
        var templateLastRow = sheet.getLastRow();
        if (templateLastRow > 1) {
          sheet.getRange(2, 1, templateLastRow - 1, sheet.getLastColumn()).clearContent();
        }
      } else {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Timestamp", "Email", "Roll Number", "Serial Number"]);
      }
    }

    // 3. Duplicate Checking (Roll Number & Seat Number)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingEntries = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      
      for (var r = 0; r < existingEntries.length; r++) {
        var existingRoll = String(existingEntries[r][2]).trim();
        var existingSerial = parseInt(String(existingEntries[r][3]).trim(), 10);

        if (existingRoll.toLowerCase() === rollNumber.toLowerCase()) {
          return ContentService
            .createTextOutput(JSON.stringify({
              status: "conflict",
              message: "Roll Number " + rollNumber + " has already submitted attendance for this class."
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        if (existingSerial === serialNumberNum) {
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
    var timestamp = new Date();
    sheet.appendRow([timestamp, email, rollNumber, serialNumberNum]);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Attendance marked successfully for Seat #" + serialNumberNum + "!"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
