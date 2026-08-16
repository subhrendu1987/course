// ============================================================
// CONFIGURATION DATA CACHE
// ============================================================
function getClassConfigurations() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "CLASS_CONFIGURATIONS";
  var cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }
  
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

  cache.put(cacheKey, JSON.stringify(data), 3600);
  return data;
}

function getClassConfig(ss, date, group) {
  var configs = getClassConfigurations();
  if (!configs[date]) return null;

  for (var i = 0; i < configs[date].length; i++) {
    if (configs[date][i].group === group) {
      return configs[date][i];
    }
  }
  return null;
}

// ============================================================
// ROLL NUMBER & EMAIL CACHE LOOKUPS
// ============================================================
// ============================================================
// ROLL NUMBER VALIDATION
// ============================================================
function verifyRollNumber(ss, roll) {
  if (!roll) return false;

  var cleanRoll = String(roll).trim().toLowerCase();
  var map = getRollEmailMap(ss);

  // Checks if the roll key exists in the cached object map
  return Object.prototype.hasOwnProperty.call(map, cleanRoll);
}

function getRollEmailMap(ss) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("ROLL_EMAIL_MAP");
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = getRequiredSheet(ss, MYGROUPS_SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return {};

  var emailCol = (typeof MYGROUPS_EMAIL_COLUMN !== "undefined") ? MYGROUPS_EMAIL_COLUMN : MYGROUPS_ROLL_COLUMN + 1;
  var maxCol = Math.max(MYGROUPS_ROLL_COLUMN, emailCol);
  var values = sheet.getRange(1, 1, lastRow, maxCol).getValues();

  var map = {};
  values.forEach(function(row) {
    var r = String(row[MYGROUPS_ROLL_COLUMN - 1] || "").trim().toLowerCase();
    var e = String(row[emailCol - 1] || "").trim().toLowerCase();
    if (r) {
      map[r] = e; // Stores mapped email or empty string if unmapped
    }
  });

  cache.put("ROLL_EMAIL_MAP", JSON.stringify(map), 3600);
  return map;
}

function verifyRollAndEmail(ss, roll, email) {
  logToSheet("ss:"+ss+"r:"+roll+",email:"+email);
  // Guard against null/undefined inputs
  if (!roll || !email) return false;
  var cleanRoll = String(roll).trim().toLowerCase();
  var cleanEmail = String(email).trim().toLowerCase();
  var map = getRollEmailMap(ss);
  if (!map) return false;
  // 1. Check if roll exists in map
  if (!Object.prototype.hasOwnProperty.call(map, cleanRoll)) {
    return false;
  }
  // 2. Exact email match check
  if (map[cleanRoll] && map[cleanRoll] === cleanEmail) {
    return true;
  }
  // 3. Fallback substring check
  return cleanEmail.indexOf(cleanRoll) !== -1;
}
