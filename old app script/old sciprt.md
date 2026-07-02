const SS = SpreadsheetApp.getActiveSpreadsheet();

// ================= ฟังก์ชันช่วยเหลือ =================
function getThaiDay(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return ""; 
  const cleanDate = dateStr.replace(/'/g, "").trim(); 
  const parts = cleanDate.split('/');
  if(parts.length !== 3) return "";
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  if (isNaN(d.getTime())) return ""; 
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  return days[d.getDay()];
}

function normalizeDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val).replace(/'/g, "").trim(); 
}

function toYMD(val) {
  const normal = normalizeDateStr(val);
  if (!normal) return "";
  const parts = normal.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return normal.substring(0, 10);
}

function formatTimeStr(timeVal) {
  if (!timeVal) return "";
  if (timeVal instanceof Date) {
    return timeVal.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) + " น.";
  }
  return String(timeVal);
}

function saveImageToDrive(base64Data, fileName, targetFolderStr) {
  if(!base64Data) return "";
  try {
    const folderName = targetFolderStr || "Attendance_Photos"; 
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) { folder = folders.next(); } 
    else { folder = DriveApp.createFolder(folderName); } 

    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', fileName + ".jpg");
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl(); 
  } catch(e) { return ""; }
}

// ================= API แบบ GET =================
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "login") {
      const sheet = SS.getSheetByName("ฐานข้อมูลพนักงาน");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][4] === e.parameter.email && data[i][5] === e.parameter.password) {
          return ContentService.createTextOutput(JSON.stringify({
            ok: true, 
            user: { firstName: data[i][0], lastName: data[i][1], name: `${data[i][0]} ${data[i][1]}`, dept: data[i][2], position: data[i][3], email: data[i][4], role: data[i][6] }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ok: false, message: "Email หรือ รหัสผ่านไม่ถูกต้อง"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getAttendance") {
      const email = e.parameter.email;
      const date = normalizeDateStr(e.parameter.date);
      
      let isOffsiteApproved = false;
      const offSheet = SS.getSheetByName("OffsiteRequests");
      if(offSheet) {
        const offData = offSheet.getDataRange().getValues();
        for(let i = 1; i < offData.length; i++) {
          if(offData[i][1] === email && normalizeDateStr(offData[i][3]) === date && offData[i][5] === "Approved") {
            if(String(offData[i][4]).includes("ออกหน้างาน")) isOffsiteApproved = true; 
            break;
          }
        }
      }

      let checkInTime = null, checkOutTime = null, statusIn = "none";
      const attSheet = SS.getSheetByName("บันทึกลงเวลา");
      if(attSheet) {
        const attData = attSheet.getDataRange().getValues();
        for(let i = 1; i < attData.length; i++) {
          if(attData[i][2] === email && normalizeDateStr(attData[i][0]) === date) { 
            if(attData[i][3]) { checkInTime = formatTimeStr(attData[i][3]); statusIn = attData[i][7]; } 
            if(attData[i][4]) { checkOutTime = formatTimeStr(attData[i][4]); } 
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ok: true, checkInTime, checkOutTime, statusIn, isOffsiteApproved})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getHolidays") {
        const holidaySheet = SS.getSheetByName("Holidays");
        let holidaysObj = {};
        if (holidaySheet) {
            const holData = holidaySheet.getDataRange().getValues();
            for (let i = 1; i < holData.length; i++) {
                if (holData[i][0] && holData[i][1]) {
                    let rawDate = holData[i][0];
                    let daysCount = holData[i][2] !== "" ? Number(holData[i][2]) : 1; 
                    if (isNaN(daysCount) || daysCount < 1) daysCount = 1;

                    let startDate;
                    if (rawDate instanceof Date) { startDate = new Date(rawDate); } 
                    else {
                        const parts = String(rawDate).replace(/'/g, "").trim().split('/');
                        if (parts.length === 3) startDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    }

                    if (startDate && !isNaN(startDate.getTime())) {
                        for (let dCount = 0; dCount < daysCount; dCount++) {
                            let currentD = new Date(startDate);
                            currentD.setDate(currentD.getDate() + dCount);
                            const y = currentD.getFullYear();
                            const m = String(currentD.getMonth() + 1).padStart(2, '0');
                            const d = String(currentD.getDate()).padStart(2, '0');
                            const curDateKey = `${y}-${m}-${d}`;
                            holidaysObj[curDateKey] = { name: String(holData[i][1]), days: daysCount, isStart: dCount === 0 };
                        }
                    }
                }
            }
        }
        return ContentService.createTextOutput(JSON.stringify({ok: true, holidays: holidaysObj})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getMyRequests") {
      const email = e.parameter.email;
      let requests = [];
      
      const offSheet = SS.getSheetByName("OffsiteRequests");
      if(offSheet) {
        const data = offSheet.getDataRange().getValues();
        for(let i = 1; i < data.length; i++) {
          if(data[i][1] === email) {
            requests.push({ date: normalizeDateStr(data[i][3]), reason: "[ออกหน้างาน] " + String(data[i][4]), status: String(data[i][5]), timestamp: new Date(data[i][0]).getTime() });
          }
        }
      }
      
      const leaveSheet = SS.getSheetByName("ใบลาพนักงาน");
      if(leaveSheet) {
        const data = leaveSheet.getDataRange().getValues();
        for(let i = 1; i < data.length; i++) {
          if(data[i][1] === email || data[i][4] === email || data[i][5] === email) { 
            requests.push({ date: normalizeDateStr(data[i][2]), reason: "[" + data[i][3] + "] " + (data[i][7] || ""), status: data[i][6], timestamp: new Date(data[i][0]).getTime() });
          }
        }
      }
      
      requests.sort((a,b) => b.timestamp - a.timestamp);
      return ContentService.createTextOutput(JSON.stringify({ok: true, requests: requests})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "sync") {
      const empSheet = SS.getSheetByName("ฐานข้อมูลพนักงาน");
      const attSheet = SS.getSheetByName("บันทึกลงเวลา");
      const leaveSheet = SS.getSheetByName("ใบลาพนักงาน");
      const offSheet = SS.getSheetByName("OffsiteRequests");

      let employees = [];
      if (empSheet) {
        const empData = empSheet.getDataRange().getValues();
        for (let i = 1; i < empData.length; i++) {
          if (empData[i][0]) { employees.push({ name: empData[i][0] + " " + (empData[i][1] || ""), dept: empData[i][2], role: empData[i][3] }); }
        }
      }

      let history = [];
      if (attSheet) {
        const attData = attSheet.getDataRange().getValues();
        for (let i = 1; i < attData.length; i++) {
          if (attData[i][0] && attData[i][7]) { history.push({ date: toYMD(attData[i][0]), name: attData[i][5], type: attData[i][7], reason: "" }); }
        }
      }
      if (leaveSheet) {
        const leaveData = leaveSheet.getDataRange().getValues();
        for (let i = 1; i < leaveData.length; i++) {
          if (leaveData[i][2] && leaveData[i][6] === "Approved") { 
            history.push({ date: toYMD(leaveData[i][2]), name: leaveData[i][1], type: leaveData[i][3], reason: leaveData[i][7] || "" }); 
          }
        }
      }
      if (offSheet) {
        const offData = offSheet.getDataRange().getValues();
        for (let i = 1; i < offData.length; i++) {
          if (offData[i][5] === "Approved") {
             let cleanReason = String(offData[i][4]).replace("[ออกหน้างาน]", "").trim();
             history.push({ date: toYMD(offData[i][3]), name: offData[i][2], type: "ออกหน้างาน", reason: cleanReason });
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, employees: employees, history: history })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getPendingRequests") {
      let requests = [];
      const offSheet = SS.getSheetByName("OffsiteRequests");
      if(offSheet) {
        const rows = offSheet.getDataRange().getValues();
        for(let i = 1; i < rows.length; i++) {
          if(rows[i][5] === "Pending") {
            requests.push({ source: "Offsite", row: i+1, timestamp: rows[i][0], email: rows[i][1], name: rows[i][2], date: normalizeDateStr(rows[i][3]), reason: "[ออกหน้างาน] " + rows[i][4] });
          }
        }
      }

      const leaveSheet = SS.getSheetByName("ใบลาพนักงาน");
      if(leaveSheet) {
        const rows = leaveSheet.getDataRange().getValues();
        for(let i = 1; i < rows.length; i++) {
          if(rows[i][6] === "Pending") { 
            requests.push({ source: "Leave", row: i+1, timestamp: rows[i][0], email: rows[i][5], name: rows[i][1], date: normalizeDateStr(rows[i][2]), reason: "[" + rows[i][3] + "] " + (rows[i][7] || ""), certUrl: rows[i][8] || "" });
          }
        }
      }

      requests.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      return ContentService.createTextOutput(JSON.stringify({ok: true, requests})).setMimeType(ContentService.MimeType.JSON);
    }

    // 🌟 ระบบอนุมัติใหม่ (ผ่าน GET ชัวร์ 100%)
    if (action === "updateRequestStatus") {
      const row = parseInt(e.parameter.row);
      const status = e.parameter.status;
      const source = e.parameter.source;

      if (source === "Offsite") {
          const sheet = SS.getSheetByName("OffsiteRequests");
          sheet.getRange(row, 6).setValue(status); // คอลัมน์ F
      } else if (source === "Leave") {
          const sheet = SS.getSheetByName("ใบลาพนักงาน");
          sheet.getRange(row, 7).setValue(status); // คอลัมน์ G
      }
      return ContentService.createTextOutput(JSON.stringify({ok: true, message: "บันทึกสถานะสำเร็จ"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getFaceData") {
      const sheet = SS.getSheetByName("ฐานข้อมูลพนักงาน");
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][4] === e.parameter.email && data[i][7]) { 
          return ContentService.createTextOutput(JSON.stringify({ok: true, descriptor: JSON.parse(data[i][7])})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ok: false})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ok: false, message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ================= API แบบ POST =================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "submitRequest") {
      const type = data.type; 
      let certUrl = "";
      
      if (data.certBase64) {
        certUrl = saveImageToDrive(data.certBase64, `MedicalCert_${data.email}_${data.date.replace(/\//g,'-')}`, "Medical_Certificates");
      }

      if (type === "ออกหน้างาน") {
        const sheet = SS.getSheetByName("OffsiteRequests");
        sheet.appendRow([new Date(), data.email, data.name, "'" + data.date, data.reason, "Pending"]);
      } else {
        const sheet = SS.getSheetByName("ใบลาพนักงาน");
        let leaveTypeStr = type;
        if (data.duration && data.duration !== "เต็มวัน") leaveTypeStr += " - " + data.duration;
        sheet.appendRow([new Date(), data.name, "'" + data.date, leaveTypeStr, "'" + (data.swapDate || ""), data.email, "Pending", data.reason, certUrl]);
      }
      return ContentService.createTextOutput(JSON.stringify({ok: true, message: "ส่งคำขอเรียบร้อย รอแอดมินอนุมัติ"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "saveFaceData") {
      const sheet = SS.getSheetByName("ฐานข้อมูลพนักงาน");
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][4] === data.email) {
          sheet.getRange(i + 1, 8).setValue(JSON.stringify(data.descriptor)); 
          return ContentService.createTextOutput(JSON.stringify({ok: true})).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (action === "logAttendance") {
      const sheet = SS.getSheetByName("บันทึกลงเวลา");
      const thaiDay = getThaiDay(data.date);

      if (data.type === "checkin") {
        const rows = sheet.getDataRange().getValues();
        let found = false;
        for (let i = rows.length - 1; i > 0; i--) {
          if (rows[i][2] === data.email && normalizeDateStr(rows[i][0]) === normalizeDateStr(data.date)) { found = true; break; }
        }
        
        if (!found) {
          const photoUrl = saveImageToDrive(data.photoBase64, `${data.email}_${data.date.replace(/\//g,'-')}_${data.type}`, "Attendance_Photos");
          sheet.appendRow([ "'" + data.date, thaiDay, data.email, data.time, "", data.name, data.dept, data.statusIn, data.position, photoUrl, "", data.lat, data.lng ]);
        }
      } else {
        const rows = sheet.getDataRange().getValues();
        let found = false;
        for (let i = rows.length - 1; i > 0; i--) {
          if (rows[i][2] === data.email && normalizeDateStr(rows[i][0]) === normalizeDateStr(data.date)) {
            if (!rows[i][4]) {
              const photoUrl = saveImageToDrive(data.photoBase64, `${data.email}_${data.date.replace(/\//g,'-')}_${data.type}`, "Attendance_Photos");
              sheet.getRange(i + 1, 5).setValue(data.time); 
              sheet.getRange(i + 1, 11).setValue(photoUrl); 
            }
            found = true; break;
          }
        }
        if(!found) { 
          const photoUrl = saveImageToDrive(data.photoBase64, `${data.email}_${data.date.replace(/\//g,'-')}_${data.type}`, "Attendance_Photos");
          sheet.appendRow(["'" + data.date, thaiDay, data.email, "", data.time, data.name, data.dept, "ไม่มีบันทึกเข้า", data.position, "", photoUrl, data.lat, data.lng]); 
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ok: true})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "adminSaveAttendance") {
        const attSheet = SS.getSheetByName("บันทึกลงเวลา");
        const thaiDay = getThaiDay(data.date);
        data.updates.forEach(upd => {
            if (upd.status === 'ไม่มีบันทึกเข้างาน' || !upd.status) return; 
            const rows = attSheet.getDataRange().getValues();
            let found = false;
            for (let i = rows.length - 1; i > 0; i--) {
                if (rows[i][5] === upd.name && normalizeDateStr(rows[i][0]) === normalizeDateStr(data.date)) {
                    attSheet.getRange(i + 1, 8).setValue(upd.status); 
                    found = true; break;
                }
            }
            if (!found) { attSheet.appendRow(["'" + data.date, thaiDay, "-", "-", "-", upd.name, upd.dept, upd.status, upd.position, "-", "-", "", ""]); }
        });
        return ContentService.createTextOutput(JSON.stringify({ok: true})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ok: false, message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}