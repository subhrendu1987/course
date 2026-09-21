function onEdit(e) {
  const range = e.range;

  if (range.getSheet().getName() === CONFIG_SHEET_NAME &&
      range.getA1Notation() === "C3") {
    restoreC2Formula();
    Logger.log("Array Formula for Picture URL generation Updated");
  }
}


function restoreC2Formula() {
  const sheet=getTargetSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) return;
  const formula = `=ARRAYFORMULA(IF((A3:A<>"")*(B3:B<>""),"https://raw.githubusercontent.com/"&INDEX(REGEXEXTRACT($C$1,"https://([^./]+)\\.github\\.io/([^/]+)"),1,1)&"/"&INDEX(REGEXEXTRACT($C$1,"https://([^./]+)\\.github\\.io/([^/]+)"),1,2)&"/main/attendance/Dataset/Preview/"&A3:A&"_"&B3:B&".jpg",""))`;
  sheet.getRange("C3:C").clearContent();
  sheet.getRange("C3").setFormula(formula);
  
}

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

