// ============================================================
// CALL THIS FUNCTION MANUALLY AFTER EDITING CONFIG/STUDENT LIST
// ============================================================
function clearApplicationCache() {
  CacheService.getScriptCache().removeAll([
    "VALID_ROLLS",
    "CLASS_CONFIG",
    "CLASS_CONFIGURATIONS"
  ]);
}
