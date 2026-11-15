# Byte Soma Setup Guide

Follow these steps in order. Complete Firebase first, Apps Script second, and the website configuration last.

## 1. Create the Firebase Authentication project

1. Open the Firebase Console and create a project named `Byte Soma`.
2. Open **Build → Authentication → Get started**.
3. Under **Sign-in method**, enable **Email/Password**.
4. Open **Project settings → General**.
5. Under **Your apps**, create a Web app named `Byte Soma Web`.
6. Copy the value named `apiKey` from the Firebase configuration.
7. Under **Authentication → Settings → Authorized domains**, add every domain that will host the academy website.

The web API key identifies the Firebase project. Account security still depends on Firebase Authentication configuration and authorized domains.

## 2. Create the Google Apps Script backend

### Browser method

1. Open `https://script.google.com` using the official ByteLab Google account.
2. Create a new standalone project named `Byte Soma API`.
3. Replace the default code with the contents of `apps-script/Code.gs`.
4. Open **Project settings** and enable **Show appsscript.json manifest file in editor**.
5. Replace the manifest with `apps-script/appsscript.json`.
6. In **Script properties**, add:

   - `FIREBASE_WEB_API_KEY`: the Firebase `apiKey`
   - `ACADEMY_ADMIN_EMAIL`: `official.bytelab.ug@gmail.com`

7. Select `setupAcademy` from the function list and click **Run**.
8. Accept the requested Google permissions.
9. Open the execution log. It contains the new Byte Soma database URL.

The setup function creates and formats these sheets:

- Courses
- Students
- Enrollments
- Audit_Log
- Error_Log
- Reports

It also stores the spreadsheet ID privately in Script Properties and inserts six starter courses.

### Kali Linux method with clasp

Install Node.js 20 or later before installing clasp.

```bash
npm install -g @google/clasp
clasp login
cd apps-script
clasp create --type standalone --title "Byte Soma API"
clasp push
```

After pushing, complete the Script Properties, run `setupAcademy`, and deploy using the Apps Script browser editor.

## 3. Deploy the Apps Script API

1. In Apps Script, click **Deploy → New deployment**.
2. Select **Web app**.
3. Description: `Byte Soma API v1`.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Click **Deploy**.
7. Copy the production URL ending in `/exec`.

Use the `/exec` address on the public website. The `/dev` address is only for editors testing the latest saved code.

After modifying the backend later, create a new version under **Manage deployments** and keep the same production deployment URL.

## 4. Connect the frontend

In the project root, copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your_real_firebase_api_key
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/your_deployment_id/exec
```

Never commit `.env.local` to GitHub. It is already ignored by the project.

## 5. Test the complete workflow

Run the website:

```bash
npm run dev
```

Test in this order:

1. Search and filter the course catalogue.
2. Open each course and inspect its details.
3. Click **Enroll** while signed out.
4. Create a student account.
5. Open the verification link sent by Firebase.
6. Return to the site and confirm verification.
7. Complete the enrollment form.
8. Confirm that the student appears in the `Students` sheet.
9. Confirm that the application appears in `Enrollments` with `Pending review` status.
10. Confirm that an audit entry was created.
11. Try enrolling in the same course again and confirm that it is rejected as a duplicate.

## 6. Manage courses

The website contains a bundled course list so that the catalogue remains visible during setup. Once the Apps Script URL is connected, the website loads open courses from the `Courses` sheet.

Important rules:

- Keep `courseId` unique.
- Keep `slug` unique and lowercase.
- Separate list items in `modules`, `outcomes`, and `requirements` using `|`.
- Set `status` to `Open` for public enrollment.
- Set `status` to `Closed` or `Archived` to remove a course from public enrollment.
- Use only `blue`, `red`, `violet`, or `cyan` in the `accent` column.
- Use `TRUE` or `FALSE` in the `featured` column.

## 7. Review applications

The administrator works from the private Google Sheet in the first release.

Recommended enrollment statuses:

- Pending review
- Contacted
- Approved
- Rejected
- Enrolled
- Completed
- Cancelled

Do not share the Sheets database publicly. Share it only with authorized academy staff.

## 8. Upload the project to GitHub

Create an empty GitHub repository, then run from the project folder:

```bash
git init
git add .
git commit -m "Build Byte Soma enrollment platform"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

If the folder is already a Git repository, do not run `git init` again. Add the remote and push the existing branch.

## 9. Publish the website

The source can be deployed on a Node-compatible website platform. In the hosting settings, create these build variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_APPS_SCRIPT_URL`

After publishing, add the final website domain to Firebase Authentication's authorized domains.

## 10. Security checklist before accepting real students

- Keep the Google Sheet private.
- Require email verification.
- Never store passwords in Sheets or Apps Script.
- Restrict Firebase authorized domains.
- Test password reset.
- Review the Error_Log regularly.
- Review Apps Script execution failures and email quotas.
- Use a privacy notice and collect only information the academy needs.
- Create periodic protected backups of the Sheets database.
- Remove former staff members from Sheet access immediately.
