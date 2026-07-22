/**
 * ByteLab Academy Admin API
 *
 * Security model:
 * - Firebase verifies the identity token.
 * - This file checks the verified email against the Admins sheet.
 * - The frontend never decides who is an administrator.
 */

const ADMIN_ROLES = ["Super Admin", "Admissions", "Viewer"];
const ADMIN_STATUSES = ["Active", "Disabled"];
const ENROLLMENT_STATUSES = [
  "Pending review",
  "Under review",
  "Approved",
  "Waitlisted",
  "Rejected",
  "Cancelled",
];
const STUDENT_STATUSES = ["Invited", "Active", "Suspended", "Archived"];
const COURSE_STATUSES = ["Open", "Closed", "Archived"];

function seedAdmin_(sheet) {
  if (!sheet) return;

  const adminEmail = String(
    PropertiesService.getScriptProperties().getProperty("ACADEMY_ADMIN_EMAIL") || "",
  ).trim().toLowerCase();

  if (!adminEmail) return;

  const records = rowsAsObjects_(sheet);
  const existing = records.find(function (record) {
    return String(record.email).trim().toLowerCase() === adminEmail;
  });

  if (existing) return;

  const now = new Date();
  appendObject_(sheet, {
    email: adminEmail,
    role: "Super Admin",
    status: "Active",
    createdAt: now,
    updatedAt: now,
  });
}

function setupAdminDashboard() {
  const spreadsheet = getSpreadsheet_();
  const adminSheet = ensureSheet_(
    spreadsheet,
    SHEETS.ADMINS,
    HEADERS.Admins,
  );

  ensureEnrollmentSnapshotColumns_(
    spreadsheet.getSheetByName(SHEETS.ENROLLMENTS),
  );
  ensureColumns_(spreadsheet.getSheetByName(SHEETS.STUDENTS), ["studentId", "photoFileId", "status", "invitedBy"]);
  backfillStudentRecords_(spreadsheet.getSheetByName(SHEETS.STUDENTS));
  backfillEnrollmentStudentLinks_(spreadsheet);
  seedAdmin_(adminSheet);

  const activeAdmins = rowsAsObjects_(adminSheet).filter(function (record) {
    return String(record.status).toLowerCase() === "active";
  });

  if (!activeAdmins.length) {
    throw new Error(
      "No administrator was created. Add ACADEMY_ADMIN_EMAIL in Script Properties and run setupAdminDashboard again.",
    );
  }

  Logger.log("Admin dashboard ready for: " + activeAdmins.map(function (record) {
    return record.email;
  }).join(", "));

  return {
    spreadsheetUrl: spreadsheet.getUrl(),
    admins: activeAdmins.map(function (record) {
      return {
        email: String(record.email),
        role: String(record.role),
        status: String(record.status),
      };
    }),
  };
}

function ensureEnrollmentSnapshotColumns_(sheet) {
  if (!sheet) throw new Error("Enrollments sheet was not found.");

  const required = [
    "fullName",
    "age",
    "phone",
    "whatsapp",
    "district",
    "education",
    "occupation",
    "photoFileId",
    "studentId",
  ];

  const current = headerValues_(sheet);
  const missing = required.filter(function (header) {
    return current.indexOf(header) === -1;
  });

  if (!missing.length) return;

  sheet
    .getRange(1, current.length + 1, 1, missing.length)
    .setValues([missing])
    .setBackground("#092b67")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  sheet.autoResizeColumns(current.length + 1, missing.length);
}

function ensureColumns_(sheet, required) {
  if (!sheet) throw new Error("A required database sheet was not found.");
  const current = headerValues_(sheet);
  const missing = required.filter(function (header) { return current.indexOf(header) === -1; });
  if (!missing.length) return;
  sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing])
    .setBackground("#092b67").setFontColor("#ffffff").setFontWeight("bold");
  sheet.autoResizeColumns(current.length + 1, missing.length);
}

function backfillStudentRecords_(sheet) {
  const headers = headerValues_(sheet);
  const records = rowsAsObjects_(sheet);
  let changed = false;
  records.forEach(function (record) {
    if (!record.studentId) { record.studentId = nextStudentId_(records); changed = true; }
    if (!record.status) { record.status = record.userId ? "Active" : "Invited"; changed = true; }
  });
  if (changed && records.length) sheet.getRange(2, 1, records.length, headers.length).setValues(records.map(function (record) { return objectToRow_(headers, record); }));
}

function backfillEnrollmentStudentLinks_(spreadsheet) {
  const students = rowsAsObjects_(spreadsheet.getSheetByName(SHEETS.STUDENTS));
  const sheet = spreadsheet.getSheetByName(SHEETS.ENROLLMENTS);
  const headers = headerValues_(sheet);
  const records = rowsAsObjects_(sheet);
  let changed = false;
  records.forEach(function (enrollment) {
    const student = students.find(function (item) {
      return (enrollment.userId && String(item.userId) === String(enrollment.userId)) ||
        String(item.email).trim().toLowerCase() === String(enrollment.email).trim().toLowerCase();
    });
    if (!student) return;
    if (!enrollment.userId && student.userId) { enrollment.userId = student.userId; changed = true; }
    if (!enrollment.studentId && student.studentId) { enrollment.studentId = student.studentId; changed = true; }
  });
  if (changed && records.length) sheet.getRange(2, 1, records.length, headers.length).setValues(records.map(function (record) { return objectToRow_(headers, record); }));
}

function requireAdmin_(user) {
  if (!user || !user.email) {
    throw new Error("Administrator authentication is required.");
  }

  const sheet = getSpreadsheet_().getSheetByName(SHEETS.ADMINS);
  if (!sheet) throw new Error("Administrator access has not been configured.");

  const email = String(user.email).trim().toLowerCase();
  const admin = rowsAsObjects_(sheet).find(function (record) {
    return (
      String(record.email).trim().toLowerCase() === email &&
      String(record.status).trim().toLowerCase() === "active"
    );
  });

  if (!admin) {
    throw new Error("This account is not authorized to access the admin dashboard.");
  }

  return {
    uid: user.uid,
    email: email,
    role: String(admin.role || "Viewer"),
  };
}

function getAdminDashboard_(user) {
  const admin = requireAdmin_(user);
  const spreadsheet = getSpreadsheet_();

  ensureEnrollmentSnapshotColumns_(
    spreadsheet.getSheetByName(SHEETS.ENROLLMENTS),
  );
  ensureColumns_(spreadsheet.getSheetByName(SHEETS.STUDENTS), ["studentId", "photoFileId", "status", "invitedBy"]);
  backfillStudentRecords_(spreadsheet.getSheetByName(SHEETS.STUDENTS));
  backfillEnrollmentStudentLinks_(spreadsheet);

  const students = rowsAsObjects_(
    spreadsheet.getSheetByName(SHEETS.STUDENTS),
  );
  const enrollments = rowsAsObjects_(
    spreadsheet.getSheetByName(SHEETS.ENROLLMENTS),
  );
  const courses = rowsAsObjects_(
    spreadsheet.getSheetByName(SHEETS.COURSES),
  );

  const studentById = {};
  students.forEach(function (student) {
    studentById[String(student.userId)] = student;
  });

  const preparedEnrollments = enrollments.map(function (enrollment) {
    const currentStudent = studentById[String(enrollment.userId)] || {};

    return {
      enrollmentId: safeText_(enrollment.enrollmentId),
      userId: safeText_(enrollment.userId),
      email: safeText_(enrollment.email),
      courseId: safeText_(enrollment.courseId),
      courseTitle: safeText_(enrollment.courseTitle),
      learningMode: safeText_(enrollment.learningMode),
      experience: safeText_(enrollment.experience),
      goals: safeText_(enrollment.goals),
      status: safeText_(enrollment.status),
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
      fullName: safeText_(enrollment.fullName || currentStudent.fullName),
      age: enrollment.age || currentStudent.age || "",
      phone: safeText_(enrollment.phone || currentStudent.phone),
      whatsapp: safeText_(enrollment.whatsapp || currentStudent.whatsapp),
      district: safeText_(enrollment.district || currentStudent.district),
      education: safeText_(enrollment.education || currentStudent.education),
      occupation: safeText_(enrollment.occupation || currentStudent.occupation),
      photoFileId: safeText_(enrollment.photoFileId || currentStudent.photoFileId),
      studentId: safeText_(enrollment.studentId || currentStudent.studentId),
      historicalSnapshot: Boolean(enrollment.fullName),
    };
  }).reverse();

  const counts = {
    students: students.length,
    enrollments: enrollments.length,
    pending: enrollments.filter(function (record) {
      return String(record.status) === "Pending review";
    }).length,
    approved: enrollments.filter(function (record) {
      return String(record.status) === "Approved";
    }).length,
    rejected: enrollments.filter(function (record) {
      return String(record.status) === "Rejected";
    }).length,
    openCourses: courses.filter(function (record) {
      return String(record.status).toLowerCase() === "open";
    }).length,
  };

  appendObject_(spreadsheet.getSheetByName(SHEETS.AUDIT), {
    timestamp: new Date(),
    userId: admin.uid,
    email: admin.email,
    action: "ADMIN_DASHBOARD_VIEWED",
    reference: "",
    details: admin.role,
  });

  return {
    admin: admin,
    counts: counts,
    students: students.slice().reverse(),
    enrollments: preparedEnrollments,
    courses: courses,
    allowedStatuses: ENROLLMENT_STATUSES,
    studentStatuses: STUDENT_STATUSES,
    courseStatuses: COURSE_STATUSES,
    generatedAt: new Date(),
  };
}

function requireManager_(user) {
  const admin = requireAdmin_(user);
  if (!["Super Admin", "Admissions"].includes(admin.role)) {
    throw new Error("Your administrator role cannot make this change.");
  }
  return admin;
}

function adminSaveStudent_(user, payload) {
  const admin = requireManager_(user);
  const email = requiredText_(payload.email, "Email", 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid student email address.");
  const fullName = requiredText_(payload.fullName, "Full name", 100);
  const age = Number(payload.age);
  if (!Number.isInteger(age) || age < 13 || age > 100) throw new Error("Enter an age between 13 and 100.");
  const profile = {
    phone: validPhone_(payload.phone, "Primary phone number", true),
    whatsapp: validPhone_(payload.whatsapp, "WhatsApp number", false),
    district: requiredText_(payload.district, "District", 60),
    education: requiredText_(payload.education, "Education level", 60),
    occupation: requiredText_(payload.occupation, "Occupation", 80),
  };
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.STUDENTS);
  const records = rowsAsObjects_(sheet);
  const index = records.findIndex(function (record) {
    return String(record.email).trim().toLowerCase() === email ||
      (payload.studentId && String(record.studentId) === String(payload.studentId));
  });
  const existing = index >= 0 ? records[index] : {};
  const photoFileId = payload.photo ? savePhoto_(payload.photo, existing.photoFileId, email) : String(existing.photoFileId || "");
  const now = new Date();
  const record = {
    userId: existing.userId || "",
    email: email,
    fullName: fullName,
    age: age,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    district: profile.district,
    education: profile.education,
    occupation: profile.occupation,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    studentId: existing.studentId || nextStudentId_(records),
    photoFileId: photoFileId,
    status: existing.status || "Invited",
    invitedBy: existing.invitedBy || admin.email,
  };
  const headers = headerValues_(sheet);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, headers.length).setValues([objectToRow_(headers, record)]);
  else sheet.appendRow(objectToRow_(headers, record));
  auditAdmin_(admin, index >= 0 ? "ADMIN_STUDENT_UPDATED" : "ADMIN_STUDENT_INVITED", record.studentId, email);
  return { studentId: record.studentId, status: record.status };
}

function adminUpdateStudentStatus_(user, payload) {
  const admin = requireManager_(user);
  const studentId = requiredText_(payload.studentId, "Student ID", 40);
  const status = allowed_(payload.status, "Student status", STUDENT_STATUSES);
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.STUDENTS);
  const records = rowsAsObjects_(sheet);
  const index = records.findIndex(function (record) { return String(record.studentId) === studentId; });
  if (index < 0) throw new Error("The student could not be found.");
  records[index].status = status;
  records[index].updatedAt = new Date();
  sheet.getRange(index + 2, 1, 1, headerValues_(sheet).length).setValues([objectToRow_(headerValues_(sheet), records[index])]);
  auditAdmin_(admin, "ADMIN_STUDENT_STATUS_UPDATED", studentId, status);
  return { studentId: studentId, status: status };
}

function adminSaveCourse_(user, payload) {
  const admin = requireManager_(user);
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.COURSES);
  const records = rowsAsObjects_(sheet);
  const requestedId = String(payload.courseId || "").trim();
  const index = records.findIndex(function (record) { return String(record.courseId) === requestedId; });
  const existing = index >= 0 ? records[index] : {};
  const title = requiredText_(payload.title, "Course title", 120);
  const slug = requiredText_(payload.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), "Course slug", 120);
  const courseId = existing.courseId || requestedId || "BLAC-" + Utilities.getUuid().replace(/-/g, "").slice(0, 6).toUpperCase();
  const record = {
    courseId: courseId, slug: slug, title: title,
    category: requiredText_(payload.category, "Category", 80),
    duration: requiredText_(payload.duration, "Duration", 60),
    delivery: requiredText_(payload.delivery, "Delivery", 80),
    level: requiredText_(payload.level, "Level", 80),
    schedule: requiredText_(payload.schedule, "Schedule", 100),
    fee: requiredText_(payload.fee, "Fee", 80),
    summary: requiredText_(payload.summary, "Summary", 240),
    description: requiredText_(payload.description, "Description", 900),
    modules: requiredText_(payload.modules, "Modules", 1800).replace(/\r?\n+/g, "|"),
    outcomes: requiredText_(payload.outcomes, "Outcomes", 1800).replace(/\r?\n+/g, "|"),
    requirements: requiredText_(payload.requirements, "Requirements", 1800).replace(/\r?\n+/g, "|"),
    accent: ["blue", "red", "violet", "cyan"].includes(String(payload.accent)) ? String(payload.accent) : "blue",
    featured: payload.featured === true,
    status: allowed_(payload.status || "Open", "Course status", COURSE_STATUSES),
    updatedAt: new Date(),
  };
  const headers = headerValues_(sheet);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, headers.length).setValues([objectToRow_(headers, record)]);
  else sheet.appendRow(objectToRow_(headers, record));
  auditAdmin_(admin, index >= 0 ? "ADMIN_COURSE_UPDATED" : "ADMIN_COURSE_CREATED", courseId, title);
  return { courseId: courseId, status: record.status };
}

function adminManualEnrollment_(user, payload) {
  const admin = requireManager_(user);
  const studentId = requiredText_(payload.studentId, "Student ID", 40);
  const courseId = requiredText_(payload.courseId, "Course", 40);
  const spreadsheet = getSpreadsheet_();
  const student = findRecord_(spreadsheet.getSheetByName(SHEETS.STUDENTS), "studentId", studentId);
  const course = findRecord_(spreadsheet.getSheetByName(SHEETS.COURSES), "courseId", courseId);
  if (!student) throw new Error("The student could not be found.");
  if (!course) throw new Error("The course could not be found.");
  if (["Suspended", "Archived"].includes(String(student.status))) throw new Error("This student is not active.");
  const enrollmentSheet = spreadsheet.getSheetByName(SHEETS.ENROLLMENTS);
  const duplicate = rowsAsObjects_(enrollmentSheet).find(function (record) {
    return String(record.email).toLowerCase() === String(student.email).toLowerCase() && String(record.courseId) === courseId && !["Rejected", "Cancelled"].includes(String(record.status));
  });
  if (duplicate) throw new Error("The student already has an active application for this course.");
  const now = new Date();
  const enrollmentId = "BLA-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 6).toUpperCase();
  appendObject_(enrollmentSheet, {
    enrollmentId: enrollmentId, userId: student.userId, email: student.email,
    courseId: courseId, courseTitle: course.title,
    learningMode: String(payload.learningMode || "Online"), experience: "Added by administrator",
    goals: String(payload.notes || "Manual enrollment created by the academy administrator."),
    status: String(payload.status || "Approved"), createdAt: now, updatedAt: now,
    fullName: student.fullName, age: student.age, phone: student.phone,
    whatsapp: student.whatsapp, district: student.district, education: student.education,
    occupation: student.occupation, photoFileId: student.photoFileId, studentId: student.studentId,
  });
  auditAdmin_(admin, "ADMIN_MANUAL_ENROLLMENT_CREATED", enrollmentId, studentId + " | " + courseId);
  return { enrollmentId: enrollmentId, status: String(payload.status || "Approved") };
}

function adminGetPhoto_(user, payload) {
  requireAdmin_(user);
  const fileId = requiredText_(payload.fileId, "Photo", 200);
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  if (String(blob.getContentType()).indexOf("image/") !== 0) throw new Error("The stored file is not an image.");
  return { dataUrl: "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes()) };
}

function auditAdmin_(admin, action, reference, details) {
  appendObject_(getSpreadsheet_().getSheetByName(SHEETS.AUDIT), {
    timestamp: new Date(), userId: admin.uid, email: admin.email,
    action: action, reference: reference, details: details,
  });
}

function updateEnrollmentStatus_(user, payload) {
  const admin = requireAdmin_(user);

  if (!["Super Admin", "Admissions"].includes(admin.role)) {
    throw new Error("Your administrator role cannot change applications.");
  }

  const enrollmentId = requiredText_(
    payload.enrollmentId,
    "Enrollment reference",
    80,
  );
  const status = allowed_(
    payload.status,
    "Enrollment status",
    ENROLLMENT_STATUSES,
  );

  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ENROLLMENTS);
  const headers = headerValues_(sheet);
  const records = rowsAsObjects_(sheet);
  const index = records.findIndex(function (record) {
    return String(record.enrollmentId) === enrollmentId;
  });

  if (index < 0) throw new Error("The enrollment could not be found.");

  const record = records[index];
  record.status = status;
  record.updatedAt = new Date();

  sheet
    .getRange(index + 2, 1, 1, headers.length)
    .setValues([objectToRow_(headers, record)]);

  appendObject_(spreadsheet.getSheetByName(SHEETS.AUDIT), {
    timestamp: new Date(),
    userId: admin.uid,
    email: admin.email,
    action: "ADMIN_ENROLLMENT_STATUS_UPDATED",
    reference: enrollmentId,
    details: status,
  });

  return {
    enrollmentId: enrollmentId,
    status: status,
    updatedAt: record.updatedAt,
  };
}
