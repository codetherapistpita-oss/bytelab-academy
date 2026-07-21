# ByteLab Academy

A modern, responsive course-discovery and student-enrollment platform for ByteLab Uganda Ltd.

## What is included

- Public academy landing page
- Searchable and filterable course catalogue
- Detailed course view with modules, outcomes and requirements
- Email-and-password account creation and sign-in
- Email verification and password reset
- Sign-in-gated enrollment form
- Responsive layouts for desktop, tablet and mobile
- Google Apps Script API
- Google Sheets database setup and reports
- Firebase Authentication integration
- Duplicate-enrollment prevention, audit logging and server-side validation

## Architecture

```text
Student browser
    ├── ByteLab Academy frontend
    ├── Firebase Authentication (email/password)
    └── Google Apps Script API
            └── Private Google Sheets database
```

Passwords are never sent to Apps Script and are never stored in Google Sheets. Firebase Authentication manages account credentials. The Apps Script API verifies the student's Firebase session before accepting an enrollment.

## Project folders

```text
app/                 Website interface, course data and API clients
apps-script/         Google Apps Script backend and manifest
docs/                Setup and database documentation
public/              Public website assets
.env.example         Required frontend configuration
```

## Local development on Kali Linux

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add the real Firebase API key and Apps Script `/exec` URL to `.env.local` before testing accounts and enrollment.

## Production check

```bash
npm run build
```

The complete connection procedure is in [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md).

## GitHub

The repository is ready for GitHub. Environment files such as `.env.local` are ignored and must not be committed. Configure the two public build variables in the selected hosting platform.

## Brand

- Company: ByteLab Uganda Ltd
- Product: ByteLab Academy
- Company tagline: Beyond Code.
- Academy line: Practical skills. Intelligent futures.
- Primary: Deep blue
- Secondary: Modern red
- Background: White
