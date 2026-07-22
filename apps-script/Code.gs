/**
 * ByteLab Academy API
 * Google Apps Script V8 runtime
 *
 * Required Script Properties:
 *   FIREBASE_WEB_API_KEY  - Firebase project's web API key
 * Optional Script Properties:
 *   SPREADSHEET_ID        - created automatically by setupAcademy()
 *   ACADEMY_ADMIN_EMAIL   - address that receives enrollment alerts
 */

const SHEETS = {
  COURSES: "Courses",
  STUDENTS: "Students",
  ENROLLMENTS: "Enrollments",
  AUDIT: "Audit_Log",
  ERRORS: "Error_Log",
  REPORTS: "Reports",
  ADMINS: "Admins",
};

const HEADERS = {
  Courses: [
    "courseId", "slug", "title", "category", "duration", "delivery",
    "level", "schedule", "fee", "summary", "description", "modules",
    "outcomes", "requirements", "accent", "featured", "status", "updatedAt",
  ],
  Students: [
    "userId", "email", "fullName", "age", "phone", "whatsapp", "district",
    "education", "occupation", "createdAt", "updatedAt", "studentId",
    "photoFileId", "status", "invitedBy",
  ],
  Enrollments: [
    "enrollmentId", "userId", "email", "courseId", "courseTitle",
    "learningMode", "experience", "goals", "status", "createdAt", "updatedAt",
    "fullName", "age", "phone", "whatsapp", "district", "education", "occupation", "photoFileId", "studentId",
  ],
  Admins: ["email", "role", "status", "createdAt", "updatedAt"],
  Audit_Log: ["timestamp", "userId", "email", "action", "reference", "details"],
  Error_Log: ["timestamp", "action", "message", "details"],
};

function setupAcademy() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty("SPREADSHEET_ID");
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create("ByteLab Academy Database");
    spreadsheetId = spreadsheet.getId();
    properties.setProperty("SPREADSHEET_ID", spreadsheetId);
  }

  Object.keys(HEADERS).forEach(function (name) {
    ensureSheet_(spreadsheet, name, HEADERS[name]);
  });
  ensureReportsSheet_(spreadsheet);
  seedCourses_(spreadsheet.getSheetByName(SHEETS.COURSES));
  seedAdmin_(spreadsheet.getSheetByName(SHEETS.ADMINS));

  const firstSheet = spreadsheet.getSheets()[0];
  if (firstSheet && !Object.values(SHEETS).includes(firstSheet.getName())) {
    spreadsheet.deleteSheet(firstSheet);
  }

  Logger.log("ByteLab Academy database: " + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "health");
    if (action === "courses") return json_({ ok: true, data: listCourses_() });
    return json_({
      ok: true,
      data: { service: "ByteLab Academy API", status: "online", version: "1.0.0" },
    });
  } catch (error) {
    logError_("GET", error, e && e.parameter ? e.parameter : {});
    return json_({ ok: false, error: publicError_(error) });
  }
}

function doPost(e) {
  let request = {};
  try {
    request = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = requiredText_(request.action, "Action", 40);

    if (action === "enroll") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: enroll_(user, request.payload || {}) });
    }
    if (action === "myAccount") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: getMyAccount_(user) });
    }
    if (action === "adminDashboard") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: getAdminDashboard_(user) });
    }
    if (action === "adminUpdateEnrollment") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: updateEnrollmentStatus_(user, request.payload || {}) });
    }
    if (action === "adminSaveStudent") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: adminSaveStudent_(user, request.payload || {}) });
    }
    if (action === "adminUpdateStudentStatus") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: adminUpdateStudentStatus_(user, request.payload || {}) });
    }
    if (action === "adminSaveCourse") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: adminSaveCourse_(user, request.payload || {}) });
    }
    if (action === "adminManualEnrollment") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: adminManualEnrollment_(user, request.payload || {}) });
    }
    if (action === "adminGetPhoto") {
      const user = verifyFirebaseUser_(request.idToken, true);
      return json_({ ok: true, data: adminGetPhoto_(user, request.payload || {}) });
    }
    throw new Error("Unsupported request action.");
  } catch (error) {
    logError_(String(request.action || "POST"), error, { hasToken: Boolean(request.idToken) });
    return json_({ ok: false, error: publicError_(error) });
  }
}

function enroll_(user, payload) {
  if (payload.consent !== true) throw new Error("Consent is required before enrollment.");

  const courseId = requiredText_(payload.courseId, "Course", 40);
  const fullName = requiredText_(payload.fullName, "Full name", 100);
  const age = Number(payload.age);
  if (!Number.isInteger(age) || age < 13 || age > 100) {
    throw new Error("Enter an age between 13 and 100.");
  }

  const phone = validPhone_(payload.phone, "Primary phone number", true);
  const whatsapp = validPhone_(payload.whatsapp, "WhatsApp number", false);
  const district = requiredText_(payload.district, "District", 60);
  const education = allowed_(payload.education, "Education level", [
    "Primary", "O-Level", "A-Level", "Certificate", "Diploma",
    "Bachelor's degree", "Postgraduate", "Other",
  ]);
  const occupation = allowed_(payload.occupation, "Occupation", [
    "Secondary school student", "University student", "Employed",
    "Self-employed", "Looking for work", "Other",
  ]);
  const learningMode = allowed_(payload.learningMode, "Learning mode", ["Online", "Physical", "Hybrid"]);
  const experience = allowed_(payload.experience, "Experience", [
    "Complete beginner", "Some basic knowledge", "Have completed small projects",
    "Already working in the field",
  ]);
  const goals = requiredText_(payload.goals, "Learning goal", 800);
  if (goals.length < 20) throw new Error("Tell us a little more about what you want to achieve.");

  const spreadsheet = getSpreadsheet_();
  const studentsSheet = spreadsheet.getSheetByName(SHEETS.STUDENTS);
  const currentStudent = rowsAsObjects_(studentsSheet).find(function (record) {
    return String(record.userId) === user.uid || String(record.email).trim().toLowerCase() === user.email;
  });
  if (currentStudent && String(currentStudent.status).toLowerCase() === "suspended") {
    throw new Error("This student account is suspended. Contact the academy for assistance.");
  }
  const coursesSheet = spreadsheet.getSheetByName(SHEETS.COURSES);
  const course = findRecord_(coursesSheet, "courseId", courseId);
  if (!course || String(course.status).toLowerCase() !== "open") {
    throw new Error("This course is not currently open for enrollment.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const enrollmentSheet = spreadsheet.getSheetByName(SHEETS.ENROLLMENTS);
    const existing = rowsAsObjects_(enrollmentSheet).find(function (record) {
      return record.userId === user.uid && record.courseId === courseId &&
        !["Rejected", "Cancelled"].includes(String(record.status));
    });
    if (existing) {
      throw new Error("You already have an active application for this course.");
    }

    const photoFileId = savePhoto_(payload.photo, currentStudent && currentStudent.photoFileId, user.email);
    const savedStudent = upsertStudent_(studentsSheet, user, {
      fullName: fullName,
      age: age,
      phone: phone,
      whatsapp: whatsapp,
      district: district,
      education: education,
      occupation: occupation,
      photoFileId: photoFileId,
    });
    linkStudentEnrollments_(spreadsheet.getSheetByName(SHEETS.ENROLLMENTS), savedStudent);

    const now = new Date();
    const enrollmentId = "BLA-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd") + "-" +
      Utilities.getUuid().replace(/-/g, "").slice(0, 6).toUpperCase();
    appendObject_(enrollmentSheet, {
      enrollmentId: enrollmentId,
      userId: user.uid,
      email: user.email,
      courseId: courseId,
      courseTitle: safeText_(course.title),
      learningMode: learningMode,
      experience: experience,
      goals: goals,
      status: "Pending review",
      createdAt: now,
      updatedAt: now,
      fullName: fullName,
      age: age,
      phone: phone,
      whatsapp: whatsapp,
      district: district,
      education: education,
      occupation: occupation,
      photoFileId: photoFileId,
      studentId: savedStudent.studentId,
    });

    appendObject_(spreadsheet.getSheetByName(SHEETS.AUDIT), {
      timestamp: now,
      userId: user.uid,
      email: user.email,
      action: "ENROLLMENT_CREATED",
      reference: enrollmentId,
      details: courseId,
    });

    sendEnrollmentEmails_(user.email, fullName, String(course.title), enrollmentId);
    return { enrollmentId: enrollmentId, status: "Pending review" };
  } finally {
    lock.releaseLock();
  }
}

function getMyAccount_(user) {
  const spreadsheet = getSpreadsheet_();
  const student = rowsAsObjects_(spreadsheet.getSheetByName(SHEETS.STUDENTS)).find(function (record) {
    return record.userId === user.uid || String(record.email).trim().toLowerCase() === user.email;
  }) || null;
  const enrollments = rowsAsObjects_(spreadsheet.getSheetByName(SHEETS.ENROLLMENTS)).filter(function (record) {
    return record.userId === user.uid;
  });
  return { student: student, enrollments: enrollments };
}

function listCourses_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.COURSES);
  return rowsAsObjects_(sheet)
    .filter(function (record) { return String(record.status).toLowerCase() === "open"; })
    .map(function (record) {
      return {
        id: String(record.courseId),
        slug: String(record.slug),
        title: String(record.title),
        category: String(record.category),
        duration: String(record.duration),
        delivery: String(record.delivery),
        level: String(record.level),
        schedule: String(record.schedule),
        fee: String(record.fee),
        summary: String(record.summary),
        description: String(record.description),
        modules: splitList_(record.modules),
        outcomes: splitList_(record.outcomes),
        requirements: splitList_(record.requirements),
        accent: ["blue", "red", "violet", "cyan"].includes(String(record.accent)) ? String(record.accent) : "blue",
        featured: String(record.featured).toLowerCase() === "true",
      };
    });
}

function verifyFirebaseUser_(idToken, requireVerified) {
  const token = requiredText_(idToken, "Account session", 5000);
  const apiKey = PropertiesService.getScriptProperties().getProperty("FIREBASE_WEB_API_KEY");
  if (!apiKey) throw new Error("Account verification has not been configured.");

  const response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true,
    }
  );
  if (response.getResponseCode() !== 200) throw new Error("Your session has expired. Please sign in again.");
  const data = JSON.parse(response.getContentText());
  const account = data.users && data.users[0];
  if (!account || !account.localId || !account.email) throw new Error("Your account could not be verified.");
  if (requireVerified && account.emailVerified !== true) throw new Error("Verify your email before enrolling.");
  return { uid: String(account.localId), email: String(account.email).toLowerCase() };
}

function upsertStudent_(sheet, user, profile) {
  const headers = headerValues_(sheet);
  const records = rowsAsObjects_(sheet);
  const index = records.findIndex(function (record) {
    return record.userId === user.uid || String(record.email).trim().toLowerCase() === user.email;
  });
  const now = new Date();
  const existingCreatedAt = index >= 0 ? records[index].createdAt : now;
  const values = objectToRow_(headers, {
    userId: user.uid,
    email: user.email,
    fullName: profile.fullName,
    age: profile.age,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    district: profile.district,
    education: profile.education,
    occupation: profile.occupation,
    createdAt: existingCreatedAt,
    updatedAt: now,
    studentId: index >= 0 && records[index].studentId ? records[index].studentId : nextStudentId_(records),
    photoFileId: profile.photoFileId || (index >= 0 ? records[index].photoFileId : ""),
    status: index >= 0 && records[index].status && String(records[index].status) !== "Invited" ? records[index].status : "Active",
    invitedBy: index >= 0 ? records[index].invitedBy : "",
  });
  if (index >= 0) sheet.getRange(index + 2, 1, 1, headers.length).setValues([values]);
  else sheet.appendRow(values);
  return headers.reduce(function (record, header, position) { record[header] = values[position]; return record; }, {});
}

function linkStudentEnrollments_(sheet, student) {
  if (!sheet || !student) return;
  const headers = headerValues_(sheet);
  const records = rowsAsObjects_(sheet);
  let changed = false;
  records.forEach(function (record) {
    const sameEmail = String(record.email).trim().toLowerCase() === String(student.email).trim().toLowerCase();
    const sameUser = record.userId && String(record.userId) === String(student.userId);
    if (!sameEmail && !sameUser) return;
    if (!record.userId && student.userId) { record.userId = student.userId; changed = true; }
    if (!record.studentId && student.studentId) { record.studentId = student.studentId; changed = true; }
  });
  if (changed && records.length) sheet.getRange(2, 1, records.length, headers.length).setValues(records.map(function (record) { return objectToRow_(headers, record); }));
}

function nextStudentId_(records) {
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy");
  let highest = 0;
  records.forEach(function (record) {
    const match = String(record.studentId || "").match(/BL-\d{4}-(\d+)$/);
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return "BL-" + year + "-" + String(highest + 1).padStart(4, "0");
}

function savePhoto_(photo, existingFileId, reference) {
  if (!photo) {
    if (existingFileId) return String(existingFileId);
    throw new Error("A clear passport or profile photo is required.");
  }
  const mimeType = String(photo.mimeType || "").toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("Upload a JPG, PNG or WebP image.");
  }
  const base64 = String(photo.base64 || "");
  if (!base64 || base64.length > 3000000) throw new Error("The photo is too large. Choose a smaller image.");
  let bytes;
  try { bytes = Utilities.base64Decode(base64); } catch (_) { throw new Error("The photo could not be read."); }
  if (bytes.length > 2200000) throw new Error("The photo must be smaller than 2 MB after preparation.");

  const folder = getPhotoFolder_();
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const name = "student-" + String(reference || Utilities.getUuid()).replace(/[^a-z0-9_-]/gi, "-") + "-" + Date.now() + "." + extension;
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, name));
  if (existingFileId) {
    try { DriveApp.getFileById(String(existingFileId)).setTrashed(true); } catch (_) {}
  }
  return file.getId();
}

function getPhotoFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const stored = properties.getProperty("STUDENT_PHOTO_FOLDER_ID");
  if (stored) {
    try { return DriveApp.getFolderById(stored); } catch (_) {}
  }
  const folder = DriveApp.createFolder("ByteLab Academy Student Photos");
  properties.setProperty("STUDENT_PHOTO_FOLDER_ID", folder.getId());
  return folder;
}

function sendEnrollmentEmails_(email, name, course, enrollmentId) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: "ByteLab Academy enrollment received — " + enrollmentId,
      htmlBody:
        "<p>Hello " + html_(name) + ",</p>" +
        "<p>We received your application for <strong>" + html_(course) + "</strong>.</p>" +
        "<p>Your reference is <strong>" + html_(enrollmentId) + "</strong>. Our admissions team will review it and contact you.</p>" +
        "<p>ByteLab Academy<br><em>Practical skills. Intelligent futures.</em></p>",
    });
    const admin = PropertiesService.getScriptProperties().getProperty("ACADEMY_ADMIN_EMAIL");
    if (admin) {
      MailApp.sendEmail({
        to: admin,
        subject: "New academy enrollment — " + enrollmentId,
        htmlBody: "<p>New application from <strong>" + html_(name) + "</strong> for " + html_(course) + ".</p><p>Open the ByteLab Academy spreadsheet to review it.</p>",
      });
    }
  } catch (error) {
    logError_("SEND_ENROLLMENT_EMAIL", error, { email: email, enrollmentId: enrollmentId });
  }
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  else sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#092b67").setFontColor("#ffffff").setFontWeight("bold");
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function ensureReportsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEETS.REPORTS);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEETS.REPORTS);
  sheet.clear();
  sheet.getRange("A1:B1").setValues([["ByteLab Academy", "Live enrollment report"]]);
  sheet.getRange("A3:B7").setValues([
    ["Metric", "Value"],
    ["Registered students", "=MAX(COUNTA(Students!A:A)-1,0)"],
    ["Total enrollments", "=MAX(COUNTA(Enrollments!A:A)-1,0)"],
    ["Pending review", '=COUNTIF(Enrollments!I:I,"Pending review")'],
    ["Approved", '=COUNTIF(Enrollments!I:I,"Approved")'],
  ]);
  sheet.getRange("A1:B1").merge().setBackground("#092b67").setFontColor("#ffffff").setFontWeight("bold").setFontSize(16);
  sheet.getRange("A3:B3").setBackground("#e52a37").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setColumnWidths(1, 2, 220);
}

function seedCourses_(sheet) {
  if (sheet.getLastRow() > 1) return;
  const now = new Date();
  const seed = [
    ["BLAC-WEB-001", "full-stack-web-development", "Full-Stack Web Development", "Software Development", "12 weeks", "Online & practical", "Beginner friendly", "3 sessions per week", "Contact admissions", "Build responsive websites, connect APIs and publish complete web applications.", "A project-led programme that takes you from web-page structure to a complete deployed application.", "HTML structure and accessibility|Modern CSS and responsive layouts|JavaScript fundamentals and the DOM|Working with APIs and JSON|Git, GitHub and deployment|Final portfolio project", "Create mobile-first websites|Build interactive interfaces|Connect a frontend to an API|Publish and maintain projects with GitHub", "A laptop with internet access|Basic computer knowledge|Commitment to weekly practical work", "blue", true, "Open", now],
    ["BLAC-AI-002", "ai-automation", "AI & Intelligent Automation", "Artificial Intelligence", "10 weeks", "Online & practical", "Beginner to intermediate", "2 sessions per week", "Contact admissions", "Use AI responsibly, design reliable prompts and automate practical workflows.", "Learn how modern AI tools work and how to design useful automations for study, content and business.", "AI foundations and responsible use|Professional prompt engineering|Research and information workflows|Content and visual creation|Google Workspace automation|Practical automation project", "Design reusable prompt systems|Automate repeatable tasks|Evaluate AI output for quality|Build an applied AI portfolio project", "A smartphone or laptop|Reliable internet access|No previous AI experience required", "violet", true, "Open", now],
    ["BLAC-CYB-003", "cybersecurity-foundations", "Cybersecurity Foundations", "Cybersecurity", "12 weeks", "Online lab sessions", "Foundation", "3 sessions per week", "Contact admissions", "Understand digital threats, secure devices and practise defensive security safely.", "A responsible introduction focused on protection, safe testing and practical defensive skills.", "Security principles and digital safety|Linux and command-line foundations|Networking for security|Threats vulnerabilities and controls|Web security fundamentals|Defensive security lab project", "Recognise common cyber risks|Secure personal and organisational devices|Use Linux security tools responsibly|Document a basic security assessment", "A laptop that can run Linux tools|Basic computer knowledge|Agreement to the responsible-use policy", "red", true, "Open", now],
    ["BLAC-MOB-004", "mobile-app-development", "Mobile App Development", "Software Development", "14 weeks", "Online & practical", "Beginner to intermediate", "3 sessions per week", "Contact admissions", "Design and build modern Android applications with Flutter and Dart.", "Turn an app idea into a responsive Android product while learning design, local data and APIs.", "Dart programming foundations|Flutter layouts and navigation|Forms state and validation|Local storage and APIs|Authentication and app security|Final Android application", "Build responsive Flutter interfaces|Store and retrieve application data|Connect mobile apps to web APIs|Prepare an Android release build", "A development laptop|Android phone for testing|Basic programming is helpful but not required", "cyan", false, "Open", now],
    ["BLAC-NET-005", "computer-networks-configuration", "Computer Networks & Configuration", "Infrastructure", "8 weeks", "Hybrid practical", "Foundation", "2 sessions per week", "Contact admissions", "Configure small networks, diagnose connectivity and document infrastructure.", "Develop practical networking skills through addressing, cabling, device configuration and troubleshooting.", "Networking models and devices|IPv4 addressing and subnetting|Cabling and wireless foundations|Router and switch configuration|Troubleshooting and documentation|Small-office network project", "Plan a small computer network|Configure basic network devices|Diagnose common connection problems|Produce a professional network report", "Basic computer knowledge|A laptop for simulations|Availability for practical sessions", "blue", false, "Open", now],
    ["BLAC-DIG-006", "digital-business-skills", "Digital Skills for Business", "Business Technology", "6 weeks", "Online", "Beginner friendly", "2 sessions per week", "Contact admissions", "Organise work, communicate professionally and use digital tools confidently.", "A practical programme for learners and business owners who want stronger digital organisation skills.", "Digital organisation and file management|Professional email and communication|Documents spreadsheets and presentations|Online collaboration and cloud storage|Digital branding foundations|Personal productivity system", "Work confidently with productivity tools|Create clear professional documents|Organise files and cloud resources|Build a reliable digital workflow", "A smartphone or laptop|Basic ability to use a browser|No technical background required", "red", false, "Open", now],
  ];
  sheet.getRange(2, 1, seed.length, HEADERS.Courses.length).setValues(seed);
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("The academy database has not been set up.");
  return SpreadsheetApp.openById(id);
}

function rowsAsObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.map(function (row) {
    return headers.reduce(function (record, header, index) {
      record[header] = row[index];
      return record;
    }, {});
  });
}

function headerValues_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function objectToRow_(headers, record) {
  return headers.map(function (header) {
    const value = record[header];
    return typeof value === "string" ? safeText_(value) : (value == null ? "" : value);
  });
}

function appendObject_(sheet, record) {
  sheet.appendRow(objectToRow_(headerValues_(sheet), record));
}

function findRecord_(sheet, key, value) {
  return rowsAsObjects_(sheet).find(function (record) { return String(record[key]) === String(value); }) || null;
}

function splitList_(value) {
  return String(value || "").split("|").map(function (item) { return item.trim(); }).filter(Boolean);
}

function requiredText_(value, label, maxLength) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(label + " is required.");
  if (text.length > maxLength) throw new Error(label + " is too long.");
  return safeText_(text);
}

function validPhone_(value, label, required) {
  const text = String(value == null ? "" : value).trim();
  if (!text && !required) return "";
  if (!text) throw new Error(label + " is required.");
  if (!/^[+0-9 ()-]{9,20}$/.test(text)) throw new Error("Enter a valid " + label.toLowerCase() + ".");
  return safeText_(text);
}

function allowed_(value, label, choices) {
  const text = String(value || "");
  if (!choices.includes(text)) throw new Error("Select a valid " + label.toLowerCase() + ".");
  return text;
}

function safeText_(value) {
  const text = String(value == null ? "" : value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function html_(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function publicError_(error) {
  const message = error && error.message ? String(error.message) : "The request could not be completed.";
  return message.length <= 180 ? message : "The request could not be completed.";
}

function logError_(action, error, details) {
  try {
    const sheet = getSpreadsheet_().getSheetByName(SHEETS.ERRORS);
    appendObject_(sheet, {
      timestamp: new Date(),
      action: safeText_(action),
      message: safeText_(error && error.message ? error.message : String(error)),
      details: safeText_(JSON.stringify(details || {}).slice(0, 1000)),
    });
  } catch (_) {
    console.error(error);
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
