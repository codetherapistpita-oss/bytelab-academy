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
    generatedAt: new Date(),
  };
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

