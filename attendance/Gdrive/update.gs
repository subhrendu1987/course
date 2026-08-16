// ============================================================
// CALL THIS FUNCTION MANUALLY AFTER EDITING STUDENT LIST
// ============================================================
function clearApplicationCache() {
  var cache = CacheService.getScriptCache();
  var keys = [,
    "CLASS_CONFIG",
    "CLASS_CONFIGURATIONS"
  ];

  var cached = cache.getAll(keys);

  logToSheet(
    "|=== [clearApplicationCache] Cached Data Before Clearing ===|\n" +
    JSON.stringify(cached, null, 2)
  );

  cache.removeAll(keys);

  logToSheet(
    "✅ [clearApplicationCache] Cache cleared: " +
    keys.join(", ")
  );
}
// ============================================================
// CALL THIS FUNCTION MANUALLY AFTER EDITING STUDENT LIST
// ============================================================
function clearRollCache() {
  var cache = CacheService.getScriptCache();
  var keys = [
    "VALID_ROLLS",
    "ROLL_EMAIL_MAP"
  ];

  var cached = cache.getAll(keys);

  logToSheet(
    "|=== [clearApplicationCache] Cached Data Before Clearing ===|\n" +
    JSON.stringify(cached, null, 2)
  );

  cache.removeAll(keys);

  logToSheet(
    "✅ [clearApplicationCache] Cache cleared: " +
    keys.join(", ")
  );
}
