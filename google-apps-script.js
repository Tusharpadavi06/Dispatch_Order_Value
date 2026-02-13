
/**
 * Google Apps Script for Ginza Industries Dispatch Tracker
 * VERSION: 5.1 (Renamed KNITTING DISPATCH CIRCULAR)
 */

const SHEET_ID = "1j7zhkwKZYAufxkwsEUBHnauqMowQ_IPaQT5sVYFpT2w";
const UNITS = [
  "KNITTING DISPATCH CIRCULAR",
  "CROCHET",
  "DAMAN ELASTIC",
  "DIGITAL PRINTING FABRIC",
  "DIGITAL PRINTING UNIT",
  "EMBROIDERY",
  "EYE HOOK UNIT",
  "HEKTOR",
  "MOLDING",
  "SACHIN KNITTING",
  "SUNSILK",
  "TAPE DYEING",
  "TORCHAN LACE",
  "UDHNA",
  "VALUE ADDITION",
  "WARP WEFT FABRICS"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0];
    
    let data;
    try {
      if (e.postData && e.postData.contents) {
        data = JSON.parse(e.postData.contents);
      } else {
        data = JSON.parse(e.parameter.payload);
      }
    } catch (parseErr) {
      return ContentService.createTextOutput("JSON Parse Fail").setMimeType(ContentService.MimeType.TEXT);
    }

    // Handle Update Action
    if (data.action === 'UPDATE') {
      const idToUpdate = data.id;
      const rows = sheet.getDataRange().getValues();
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0].toString() === idToUpdate.toString()) {
          const updatedRow = [data.id, data.date];
          UNITS.forEach(function(u) {
            const unitInfo = (data.units && data.units[u]) ? data.units[u] : { orderValue: 0, dispatchValue: 0 };
            updatedRow.push(parseFloat(unitInfo.orderValue) || 0);
            updatedRow.push(parseFloat(unitInfo.dispatchValue) || 0);
          });
          updatedRow.push(parseFloat(data.totalOrder) || 0);
          updatedRow.push(parseFloat(data.totalDispatch) || 0);
          
          sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
          return ContentService.createTextOutput("Updated").setMimeType(ContentService.MimeType.TEXT);
        }
      }
    }

    // Default: Append New Row
    const row = [data.id || "N/A", data.date || "N/A"];
    UNITS.forEach(function(u) {
      const unitInfo = (data.units && data.units[u]) ? data.units[u] : { orderValue: 0, dispatchValue: 0 };
      row.push(parseFloat(unitInfo.orderValue) || 0);
      row.push(parseFloat(unitInfo.dispatchValue) || 0);
    });
    row.push(parseFloat(data.totalOrder) || 0);
    row.push(parseFloat(data.totalDispatch) || 0);
    
    sheet.appendRow(row);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0];
    const range = sheet.getDataRange();
    if (range.getLastRow() < 1) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
    
    const rows = range.getValues();
    const resultData = [];
    
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0] || r[0].toString().toLowerCase().includes("id")) continue;
      try {
        let dateVal = r[1];
        if (dateVal instanceof Date) { dateVal = dateVal.toISOString().split('T')[0]; }
        else { dateVal = dateVal.toString(); }

        const payload = {
          id: r[0].toString(),
          date: dateVal,
          units: {},
          totalOrder: 0,
          totalDispatch: 0
        };
        let col = 2;
        UNITS.forEach(u => {
          const o = parseFloat(r[col]) || 0;
          const d = parseFloat(r[col+1]) || 0;
          payload.units[u] = { orderValue: o, dispatchValue: d };
          col += 2;
        });
        payload.totalOrder = parseFloat(r[col]) || 0;
        payload.totalDispatch = parseFloat(r[col+1]) || 0;
        resultData.push(payload);
      } catch (rowErr) {}
    }
    return ContentService.createTextOutput(JSON.stringify(resultData)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
