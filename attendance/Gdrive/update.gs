// ============================================================
// CALL THIS FUNCTION MANUALLY AFTER EDITING CONFIG/STUDENT LIST
// ============================================================
function clearApplicationCache() {
  var cache = CacheService.getScriptCache();
  var keys = [
    "VALID_ROLLS",
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
