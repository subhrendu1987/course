function MATCHING_SHEETS(...sections) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ss.getSheets().map(sheet => sheet.getName());

  return [
    sections.flatMap(section => {
      const pattern = new RegExp(
        "^\\d{2}_\\d{2}.*2026.*" + section + "$"
      );
      Logger.log("pattern:"+pattern);
      return sheetNames.filter(name => pattern.test(name));
    })
  ];
}

function SORTBYDATE(data) {
  if (!data || !data.length) {
    return [[]];
  }

  // Flatten the input while preserving the values.
  const values = data.flat().filter(v => v !== "");

  values.sort((a, b) => {
    const dateA = parseDate_(a);
    const dateB = parseDate_(b);

    return dateA - dateB;
  });

  // Return horizontally.
  return [values];
}

/**
 * Extracts DD_MM_YYYY from DD_MM_YYYY_GroupNo
 */
function parseDate_(value) {
  const parts = String(value).split("_");

  if (parts.length < 3) {
    return new Date(8640000000000000);
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  return new Date(year, month, day);
}

