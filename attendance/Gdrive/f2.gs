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
  return {date: normalizeDate(data.date),group: String(data.group || "").trim(),email: String(data.email || "").trim().toLowerCase(),roll: String(data.rollNumber || "").trim(),serial: parseInt(data.serialNumber, 10)};
}
// ============================================================
// REQUEST VALIDATION
// ============================================================
function validateRequest(request) {
  if (!request.date) {
    return {valid: false,message: "Date is required."};
  }
  if (!request.group) {
    return {valid: false,message: "Group is required."};
  }
  if (!request.email) {
    return {valid: false,message: "Email is required."};
  }
  if (!request.roll) {
    return {valid: false,message: "Roll Number is required."};
  }
  if (isNaN(request.serial) || request.serial <= 0) {
    return {valid: false,message: "Serial Number must be a positive number."};
  }
  return {valid: true,message: ""};
}
