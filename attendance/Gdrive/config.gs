// ============================================================
// CONFIGURATION
// ============================================================

var SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1PAFVJikqdhM7u5Cd6Jv89m_uURquVX8w6rEjXRxn7u8/";
var CONFIG_SHEET_NAME = "Config";
var MYGROUPS_SHEET_NAME = "MyGroups";
var TEMPLATE_SHEET_NAME = "Template";
var LOG_SHEET_NAME = "Logs";

var TIME_ZONE = "Asia/Kolkata";
var DATE_FORMAT = "dd_MM_yyyy";


// Config sheet columns
var CONFIG_DATE_COLUMN = 1;
var CONFIG_GROUP_COLUMN = 2;
var CONFIG_IMAGE_URL_COLUMN = 3;
var CONFIG_MAX_SERIAL_COLUMN = 4;

// MyGroups sheet columns
var MYGROUPS_ROLL_COLUMN = 5;

// Attendance sheet
var ATTENDANCE_START_ROW = 2;
var ATTENDANCE_COLUMN_COUNT = 4;

var ATTENDANCE_HEADERS = [
  "Timestamp",
  "Email",
  "Roll Number",
  "Serial Number"
];
var ENABLE_LOGGING = true;
var ATTENDANCE_SHEET_SEPARATOR = "_";
