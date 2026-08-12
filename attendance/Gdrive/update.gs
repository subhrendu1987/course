function clearApplicationCache() {
  CacheService.getScriptCache().removeAll([
    "VALID_ROLLS",
    "CLASS_CONFIG",
    "CLASS_CONFIGURATIONS"
  ]);
}
