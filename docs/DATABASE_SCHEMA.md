# ByteLab Academy Database

## Courses

Public course catalogue. Only rows whose `status` is `Open` are returned by the API.

Primary key: `courseId`

## Students

One profile per Firebase account. The Firebase `userId` is the primary key. Passwords are not stored here.

Primary key: `userId`

## Enrollments

Connects one student account to one course application.

Primary key: `enrollmentId`

Foreign references:

- `userId` → Students.userId
- `courseId` → Courses.courseId

The API prevents more than one active enrollment for the same user and course. A new application is allowed after an earlier record is marked `Rejected` or `Cancelled`.

## Audit_Log

Records important successful actions such as creation of an enrollment. Do not manually delete audit rows during ordinary administration.

## Error_Log

Records backend failures that need investigation. Authentication tokens are never written to this sheet.

## Reports

Contains live formulas for student and enrollment totals. Additional pivot tables and charts can be added without changing the API.
