SPREADSHEET_URL="https://docs.google.com/spreadsheets/d/1PAFVJikqdhM7u5Cd6Jv89m_uURquVX8w6rEjXRxn7u8/"
var CACHED_SS = null;

function getTargetSpreadsheet() {
  if (CACHED_SS) return CACHED_SS;

  CACHED_SS = SPREADSHEET_URL
    ? SpreadsheetApp.openByUrl(SPREADSHEET_URL)
    : SpreadsheetApp.getActiveSpreadsheet();

  return CACHED_SS;
}


// Convert Sheets Date / string to yyyy-MM-dd
function normalizeDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      "Asia/Kolkata",
      "yyyy-MM-dd"
    );
  }

  var s = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var d = new Date(s);

  return isNaN(d.getTime())
    ? s
    : Utilities.formatDate(
        d,
        "Asia/Kolkata",
        "yyyy-MM-dd"
      );
}


// ------------------------------------------------------------
// GET
// ------------------------------------------------------------

function doGet() {
  var logs = ["|=== [doGet] Request Received ===|"];

  try {
    var ss = getTargetSpreadsheet();
    var sheet = ss.getSheetByName("Config");

    if (!sheet)
      throw new Error("Sheet 'Config' not found.");

    var values = sheet.getDataRange().getValues();
    var data = {};

    for (var i = 1; i < values.length; i++) {

      var date = normalizeDate(values[i][0]);
      var group = String(values[i][1] || "").trim();
      var imageUrl = String(values[i][2] || "").trim();
      var maxSerial = parseInt(values[i][3], 10);

      if (!date || !group || date === "Date") continue;

      if (!data[date]) data[date] = [];

      data[date].push({
        group: group,
        imageUrl: imageUrl,
        maxSerial: isNaN(maxSerial) ? null : maxSerial
      });
    }

    logs.push(
      "✅ Processed dates: " +
      Object.keys(data).join(", ")
    );

    logToSheet(logs.join(" \n "));

    return json({
      status: "success",
      data: data
    });

  } catch (err) {

    logs.push("❌ " + err.toString());
    logToSheet(logs.join(" \n "));

    return json({
      status: "error",
      message: err.toString()
    });
  }
}


// ------------------------------------------------------------
// POST
// ------------------------------------------------------------

function doPost(e) {
  var logs = ["|=== [doPost] Request Received ===|"];
  var lock;

  try {

    if (!e || !e.postData || !e.postData.contents)
      return json({
        status: "error",
        message: "No post contents received."
      });


    var data;

    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return json({
        status: "error",
        message: "Invalid JSON payload."
      });
    }


    var date = normalizeDate(data.date);
    var group = String(data.group || "").trim();
    var email = String(data.email || "").trim().toLowerCase();
    var roll = String(data.rollNumber || "").trim();
    var serial = parseInt(data.serialNumber, 10);


    logs.push(
      "Date='" + date +
      "', Group='" + group +
      "', Email='" + email +
      "', Roll='" + roll +
      "', Serial=" + serial
    );


    // Basic validation
    if (
      !date ||
      !group ||
      !email ||
      !roll ||
      isNaN(serial) ||
      serial <= 0
    ) {
      return json({
        status: "error",
        message: "Missing or invalid required fields."
      });
    }


    var ss = getTargetSpreadsheet();


    // --------------------------------------------------------
    // Verify Roll Number in MyGroups Column E
    // --------------------------------------------------------

    var myGroups = ss.getSheetByName("MyGroups");

    if (!myGroups)
      throw new Error("Sheet 'MyGroups' not found.");

    var rolls = myGroups
      .getRange(1, 5, myGroups.getLastRow(), 1)
      .getValues();

    var validRoll = rolls.some(function (r) {
      return String(r[0] || "").trim().toLowerCase() ===
             roll.toLowerCase();
    });

    if (!validRoll) {
      return json({
        status: "error",
        message: "Roll Number not in list"
      });
    }


    // --------------------------------------------------------
    // Get Config
    // --------------------------------------------------------

    var config = ss.getSheetByName("Config");

    if (!config)
      throw new Error("Sheet 'Config' not found.");

    var configValues = config.getDataRange().getValues();
    var maxSerial = null;

    for (var i = 1; i < configValues.length; i++) {

      if (
        normalizeDate(configValues[i][0]) === date &&
        String(configValues[i][1] || "").trim() === group
      ) {
        maxSerial = parseInt(configValues[i][3], 10);
        break;
      }
    }


    if (isNaN(maxSerial)) {
      return json({
        status: "error",
        message:
          "No valid class configuration found for " +
          date + " / " + group
      });
    }


    if (serial > maxSerial) {
      return json({
        status: "conflict",
        message:
          "Serial Number " + serial +
          " exceeds the maximum allowed seat limit (" +
          maxSerial + ")."
      });
    }


    // --------------------------------------------------------
    // Target class sheet
    // --------------------------------------------------------

    var sheetName = date + "_" + group;
    var sheet = ss.getSheetByName(sheetName);


    if (!sheet) {

      var template = ss.getSheetByName("Template");

      if (template) {

        sheet = template.copyTo(ss);
        sheet.setName(sheetName);

        if (sheet.getLastRow() > 1) {
          sheet
            .getRange(
              2,
              1,
              sheet.getLastRow() - 1,
              sheet.getLastColumn()
            )
            .clearContent();
        }

      } else {

        sheet = ss.insertSheet(sheetName);

        sheet.appendRow([
          "Timestamp",
          "Email",
          "Roll Number",
          "Serial Number"
        ]);
      }
    }


    // --------------------------------------------------------
    // Lock + duplicate check + save
    // --------------------------------------------------------

    lock = LockService.getScriptLock();
    lock.waitLock(30000);


    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {

      var rows = sheet
        .getRange(2, 1, lastRow - 1, 4)
        .getValues();


      for (var r = 0; r < rows.length; r++) {

        var oldEmail = String(rows[r][1] || "").trim();
        var oldRoll = String(rows[r][2] || "").trim();
        var oldSerial = parseInt(rows[r][3], 10);


        // Duplicate Roll Number
        if (
          oldRoll.toLowerCase() ===
          roll.toLowerCase()
        ) {

          logs.push(
            "⚠️ Duplicate Roll: " +
            roll +
            " / " +
            oldEmail
          );

          logToSheet(logs.join(" \n "));

          return json({
            status: "conflict",
            message:
              "Roll Number " + roll +
              " has already submitted attendance. " +
              "Email ID: " + oldEmail
          });
        }


        // Duplicate Seat
        if (oldSerial === serial) {

          logs.push(
            "⚠️ Duplicate Seat: " +
            serial +
            " / " +
            oldRoll +
            " / " +
            oldEmail
          );

          logToSheet(logs.join(" \n "));

          return json({
            status: "conflict",
            message:
              "Seat #" + serial +
              " has already been claimed by Roll Number " +
              oldRoll +
              ". Email ID: " +
              oldEmail
          });
        }
      }
    }


    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    var timestamp = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd HH:mm:ss"
    );

    sheet.appendRow([
      timestamp,
      email,
      roll,
      serial
    ]);


    logs.push(
      "✅ Attendance saved: Roll=" +
      roll +
      ", Seat=" +
      serial
    );

    logToSheet(logs.join(" \n "));


    return json({
      status: "success",
      message:
        "Attendance marked successfully for Seat #" +
        serial + "!"
    });


  } catch (err) {

    logs.push("❌ Exception: " + err.toString());
    logToSheet(logs.join(" \n "));

    return json({
      status: "error",
      message: err.toString()
    });


  } finally {

    if (lock) {
      try {
        lock.releaseLock();
      } catch (e) {}
    }
  }
}

