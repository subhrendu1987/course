// ============================================================
// GET CONFIGURATION DATA CACHED
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

  cache.put(cacheKey, JSON.stringify(data), 600);

  return data;
}
// ============================================================
// ROLL NUMBER VALIDATION CACHED
// ============================================================
function verifyRollNumber(ss, roll) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("VALID_ROLLS");
  var rolls;
  if (cached) {
    rolls = JSON.parse(cached);
  } else {
    var sheet = getRequiredSheet(ss, MYGROUPS_SHEET_NAME);
    var lastRow = sheet.getLastRow();
    if (lastRow < 1) return false;
    var values = sheet.getRange(1,MYGROUPS_ROLL_COLUMN,lastRow,1).getValues();
    rolls = values
      .map(function(row) {
        return String(row[0] || "").trim().toLowerCase();
      })
      .filter(function(value) {
        return value !== "";
      });
    cache.put("VALID_ROLLS",JSON.stringify(rolls),600);
  }
  return rolls.indexOf(roll.toLowerCase()) !== -1;
}
// ============================================================
// CLASS CONFIGURATION CACHE
// ============================================================
function getClassConfig(ss, date, group) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("CLASS_CONFIG");
  var configs;
  if (cached) {
    configs = JSON.parse(cached);
  } else {
    configs = loadClassConfigurations(ss);
    cache.put("CLASS_CONFIG", JSON.stringify(configs), 600);
  }
  var key = date + "|" + group;
  return configs[key] || null;
}
function loadClassConfigurations(ss) {
  var sheet = getRequiredSheet(ss, CONFIG_SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var configs = {};
  for (var i = 1; i < values.length; i++) {
    var date = normalizeDate(values[i][CONFIG_DATE_COLUMN - 1]);
    var group = String(values[i][CONFIG_GROUP_COLUMN - 1] || "").trim();
    if (!date || !group || date === "Date") continue;
    var maxSerial = parseInt(values[i][CONFIG_MAX_SERIAL_COLUMN - 1], 10);
    if (isNaN(maxSerial)) continue;
    configs[date + "|" + group] = {
      date: date,
      group: group,
      imageUrl: String(values[i][CONFIG_IMAGE_URL_COLUMN - 1] || "").trim(),
      maxSerial: maxSerial
    };
  }
  return configs;
}

