<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/build-passing-10b981?style=for-the-badge" alt="Build Status" />
  <img src="https://img.shields.io/badge/node-%3E%3D14.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/react-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge" alt="License" />
</p>

# 📧 Bulk Email Sender

**An intelligent, full-stack web application that extracts HR and institutional emails from Excel spreadsheets and sends personalized, automated job application emails with resume and recommendation letter attachments.**

Built for job seekers who want to streamline bulk applications to multiple institutions — simply upload an Excel file, let the system extract and prioritize the right email addresses, preview recipients, and send polished application emails in one click.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Smart Email Extraction** | Scans all columns across all sheets in an Excel workbook to find email addresses |
| **HR Email Priority** | Automatically prioritizes HR/recruitment emails (`hr@`, `recruitment@`, `careers@`, `job@`, `talent@`) over generic ones (`info@`, `contact@`, `admin@`) |
| **Junk Filtering** | Skips irrelevant emails like `support@`, `complaints@`, `sales@`, `media@` |
| **Multi-Sheet Support** | Automatically detects and selects the sheet with the most email data |
| **Intelligent Header Detection** | Finds the header row even when it's buried below summary rows |
| **Column Mapping** | Maps columns by name (Institution, HR Email, Other Email) for accurate extraction |
| **Email Validation** | Validates all email addresses with regex before sending |
| **Personalized Templates** | Auto-inserts institution name into each email body |
| **PDF Attachments** | Attaches resume and recommendation letter to every email |
| **Rate Limiting** | 2-second delay between emails to avoid Gmail throttling |
| **Real-time Progress** | Live send progress with success/failure tracking per recipient |
| **Modern UI** | Dark-themed, glassmorphism interface with 3-step guided wizard |

---

## 🏗️ Architecture

```
bulk-email-sender/
├── server.js                 # Express backend (API server)
├── fileProcessing.js         # Excel parsing, email extraction & validation
├── messaging.js              # Nodemailer SMTP email sending logic
├── package.json              # Dependencies & scripts
│
├── api/                      # Vercel-compatible serverless endpoints
│   ├── clean.js              # POST /api/clean — extract & download cleaned file
│   ├── process.js            # POST /api/process — validate recipients
│   └── send.js               # POST /api/send — bulk email dispatch
│
├── src/                      # React frontend
│   ├── App.js                # 3-step wizard UI component
│   ├── App.css               # Dark theme design system
│   └── index.js              # React entry point
│
├── public/
│   └── index.html            # HTML shell with SEO meta & Google Fonts
│
└── attachments/              # Resume & recommendation letter (PDF)
    └── README.md             # Instructions for placing attachment files
```

### Data Flow

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Raw Excel   │────▶│  fileProcessing   │────▶│  Cleaned Excel   │────▶│  Validated  │
│  (multi-col) │     │  • Find best sheet│     │  Institution |   │     │  Recipients │
│              │     │  • Detect headers │     │  Email           │     │  [{inst,     │
│              │     │  • Extract emails │     │                  │     │    email}]   │
│              │     │  • HR > info@     │     │                  │     │             │
└──────────────┘     └───────────────────┘     └──────────────────┘     └──────┬──────┘
                                                                                │
                                                                                ▼
                                                                     ┌──────────────────┐
                                                                     │   messaging.js   │
                                                                     │  • Gmail SMTP    │
                                                                     │  • Template fill │
                                                                     │  • Attach PDFs   │
                                                                     │  • Rate limiting │
                                                                     └──────────────────┘
```

---

## 📋 Prerequisites

- **Node.js** v14 or higher ([download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Gmail account** with [2-Step Verification](https://myaccount.google.com/security) enabled
- **Gmail App Password** ([generate one](https://myaccount.google.com/apppasswords))

> **Note:** Regular Gmail passwords will not work. You must generate a 16-character App Password from your Google Account settings. This requires 2-Step Verification to be enabled first.

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/CalKK/bulk-email-sender.git
cd bulk-email-sender
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Your Attachments

Place your resume and recommendation letter in the `attachments/` directory:

```
attachments/
├── Calvin_Kinyanjui_Resume.pdf
└── Recommendation_Letter.pdf
```

All `.pdf`, `.docx`, and `.doc` files in this folder are automatically attached to every outgoing email. Other file types are ignored.

### 4. Start the Application

Open **two terminal windows**:

```bash
# Terminal 1 — Backend API server (port 3001)
npm run server

# Terminal 2 — React frontend (port 3000)
npm start
```

### 5. Open in Browser

Navigate to **http://localhost:3000**

---

## 📖 Usage

The application follows a **3-step wizard workflow**:

### Step 1: Clean & Extract

Upload your raw Excel file containing institution data. The system will:

- Scan **all sheets** and select the one with the most email addresses
- Detect the **header row** (even if it's not on row 1)
- Map columns by name: `Institution`, `HR Email`, `Other Email`
- Extract and classify emails as **HR** or **Info**
- If both exist for an institution → select the **HR email**
- Filter out useless emails (`support@`, `complaints@`, `sales@`, etc.)
- Output a **cleaned Excel file** with 2 columns: `Institution | Email`

```
Input:  Multi-column spreadsheet with mixed data
Output: cleaned_emails.xlsx (Institution | Email)
```

### Step 2: Preview & Validate

Upload the cleaned file to:

- See a **data table** of all recipients with email type badges (HR / INFO)
- Review **validation errors** (missing emails, invalid formats)
- Preview the **email template** with institution name substitution

### Step 3: Send Emails

- Enter your Gmail address and **App Password**
- Customize the subject line (pre-filled with default)
- Click **Send All Emails** to dispatch personalized emails
- View **real-time results**: sent count, failed count, and per-recipient status

---

## 📧 Email Template

Each email is personalized with the institution name automatically inserted:

```
Dear Sir/Madam,

I trust this message finds you well.

I go by the name of Calvin Kinyanjui, 5th Year Electrical & Electronics Engineering
Student at Strathmore University awaiting graduation in August 2026. I write this
email with the view to lodge an application seeking a job opportunity at [Institution]

I also wanted to take this time to share with you my professional portfolio.

Kindly find attached below my resume and recommendation letter.

In case of any queries, don't hesitate to reach out.

Thank you & Kind Regards!
```

To customize the template, edit the `emailTemplate` constant in [`messaging.js`](messaging.js).

---

## 🔌 API Documentation

The Express backend exposes three RESTful endpoints. All accept `multipart/form-data` file uploads.

### `POST /api/clean`

Extracts HR/info emails from a raw Excel file and returns a cleaned 2-column file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ | Raw Excel file (.xls / .xlsx) |

**Success Response** (200): Downloads `cleaned_emails.xlsx` as a file attachment.

**Response Headers**:
| Header | Description |
|--------|-------------|
| `X-Stats` | JSON string with extraction statistics |

```bash
# Example
curl -X POST -F "file=@contacts.xlsx" http://localhost:3001/api/clean \
  --output cleaned_emails.xlsx
```

---

### `POST /api/process`

Validates a cleaned Excel file and returns the recipient list with any errors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ | Cleaned Excel file (Institution \| Email) |

**Success Response** (200):
```json
{
  "recipients": [
    { "institution": "KPMG", "email": "talentrecruit@kpmg.co.ke" },
    { "institution": "REREC", "email": "info@rerec.co.ke" }
  ],
  "summary": {
    "found": 31,
    "valid": 31,
    "errors": 0,
    "errorDetails": []
  }
}
```

```bash
# Example
curl -X POST -F "file=@cleaned_emails.xlsx" http://localhost:3001/api/process
```

---

### `POST /api/send`

Sends personalized bulk emails with attachments to all valid recipients.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ | Cleaned Excel file (Institution \| Email) |
| `senderEmail` | String | ✅ | Gmail address |
| `appPassword` | String | ✅ | Gmail App Password (16 characters) |
| `subject` | String | ❌ | Email subject line (has default) |

**Success Response** (200):
```json
{
  "success": true,
  "results": {
    "total": 31,
    "sent": [
      { "success": true, "email": "hr@ofgen.africa", "institution": "Ofgen", "messageId": "..." }
    ],
    "failed": [
      { "success": false, "email": "invalid@test", "institution": "Test", "error": "..." }
    ]
  },
  "validationErrors": []
}
```

**Error Responses**:
| Code | Condition |
|------|-----------|
| 400 | Missing credentials, invalid file, or no valid recipients |
| 401 | SMTP authentication failed (wrong App Password) |
| 500 | Internal server error |

```bash
# Example
curl -X POST \
  -F "file=@cleaned_emails.xlsx" \
  -F "senderEmail=calvinkinyanjui017@gmail.com" \
  -F "appPassword=abcdefghijklmnop" \
  -F "subject=Job Application — Calvin Kinyanjui" \
  http://localhost:3001/api/send
```

---

### `GET /`

Health check endpoint.

```json
{
  "message": "🚀 Bulk Email Sender API is running.",
  "hint": "Open http://localhost:3000 for the UI.",
  "endpoints": ["POST /api/clean", "POST /api/process", "POST /api/send"]
}
```

---

## ⚙️ Configuration

### Email Template

Edit the `emailTemplate` constant in [`messaging.js`](messaging.js):

```javascript
const emailTemplate = `Dear Sir/Madam,

Your custom email body here. Use [Institution] as the placeholder.

Best regards!`;
```

### Subject Line

Edit the `defaultSubject` constant in [`messaging.js`](messaging.js):

```javascript
const defaultSubject = 'Job Application — Your Name, Your Field';
```

### Sender Display Name

Edit the `from` field in the `sendEmail` function in [`messaging.js`](messaging.js):

```javascript
from: `Your Name <${senderEmail}>`,
```

### Send Delay

Adjust the delay between emails (in milliseconds) to manage rate limiting:

```javascript
// In messaging.js → sendBulkEmails()
const delayMs = 2000; // Default: 2 seconds between emails
```

### Email Classification

Add or remove email prefix patterns in [`fileProcessing.js`](fileProcessing.js):

```javascript
// Emails that get HR priority
const HR_PREFIXES = ['hr@', 'recruitment@', 'careers@', 'job@', ...];

// Emails accepted as fallback
const INFO_PREFIXES = ['info@', 'contact@', 'admin@', ...];

// Emails to skip entirely
const SKIP_PREFIXES = ['support@', 'complaints@', 'sales@', ...];
```

### Server Port

Set via environment variable:

```bash
PORT=4000 node server.js   # Backend on port 4000
```

### Attachments Directory

All `.pdf`, `.docx`, and `.doc` files in `attachments/` are auto-attached. To change the directory, edit the `getAttachments()` function in [`messaging.js`](messaging.js).

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:

### Development Setup

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/bulk-email-sender.git
   cd bulk-email-sender
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Run** both servers during development:
   ```bash
   npm run server  # Terminal 1
   npm start       # Terminal 2
   ```

### Guidelines

- **Code Style**: Follow existing patterns. Use `const`/`let` (no `var`), template literals, and async/await.
- **Commits**: Write clear commit messages (e.g., `Add phone number validation for international format`).
- **Testing**: Upload sample Excel files, test all 3 steps, and verify emails are sent correctly.
- **Documentation**: Update this README if your changes affect usage, configuration, or API endpoints.
- **No Secrets**: Never commit App Passwords, credentials, or personal email addresses.

### Pull Request Process

1. Ensure your code compiles without errors (`npm start` runs successfully)
2. Test the full workflow: Clean → Preview → Send
3. Update documentation if applicable
4. Submit a Pull Request with a clear description of changes
5. Reference any related issues

---

## 🐛 Troubleshooting

### SMTP Authentication Failed

```
SMTP authentication failed: 534-5.7.9 Application-specific password required
```

**Cause**: Using a regular Gmail password instead of an App Password.

**Fix**:
1. Enable [2-Step Verification](https://myaccount.google.com/security) on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the 16-character App Password (not your login password)

> For Google Workspace accounts (`@company.com`), your IT admin may need to enable App Passwords in the Google Admin console.

---

### No Emails Extracted (0 extracted)

**Cause**: The system couldn't find HR or info@ emails in your Excel file.

**Fix**:
- Ensure your Excel file has email addresses in the cells (not just URLs)
- Check that emails are of type `hr@`, `info@`, `contact@`, etc. — emails like `support@` and `complaints@` are filtered out by design
- Open the file in Excel and verify the data is on the correct sheet

---

### File Upload Fails

**Cause**: Invalid file format or corrupted file.

**Fix**:
- Use `.xlsx` or `.xls` format only
- Remove merged cells and complex formatting
- Try "Save As" → `.xlsx` from Excel to create a clean copy
- Check file size (very large files may timeout)

---

### "Cannot GET /" on localhost:3001

**Cause**: You're visiting the API server directly.

**Fix**: Open **http://localhost:3000** (the React frontend), not port 3001. The backend only serves API endpoints.

---

### Frontend Not Loading

**Cause**: Backend or frontend server not running.

**Fix**:
- Ensure **both** servers are running (two terminals)
- Terminal 1: `npm run server` (backend on port 3001)
- Terminal 2: `npm start` (frontend on port 3000)
- Check for port conflicts: `netstat -ano | findstr :3000`

---

### Emails Going to Spam

**Tips**:
- Use a professional subject line
- Avoid spam trigger words in the email body
- Ensure your Gmail account is in good standing
- Don't send more than ~100 emails per day to avoid Gmail flagging
- Consider sending in smaller batches across multiple days

---

### Gmail Sending Limits

| Account Type | Daily Limit |
|-------------|-------------|
| Personal Gmail | ~500 emails/day |
| Google Workspace | ~2,000 emails/day |

The app adds a 2-second delay between emails by default. For large lists, split across multiple days.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Calvin Kinyanjui

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---


