const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// HR-related email prefixes (prioritized over info@)
const HR_PREFIXES = ['hr@', 'recruitment@', 'careers@', 'career@', 'humanresource@', 'humanresources@', 'talent@', 'hiring@', 'jobs@', 'job@', 'staffing@', 'people@', 'vacancies@', 'vacancy@', 'employ@', 'employment@'];
const INFO_PREFIXES = ['info@', 'information@', 'enquiries@', 'enquiry@', 'contact@', 'general@', 'admin@', 'office@'];

// Prefixes to SKIP — not useful for job applications
const SKIP_PREFIXES = ['support@', 'customercare@', 'complaints@', 'complaint@', 'help@', 'helpdesk@', 'sales@', 'marketing@', 'media@', 'press@', 'noreply@', 'no-reply@', 'billing@', 'accounts@', 'finance@', 'webmaster@', 'postmaster@', 'abuse@', 'security@'];

/**
 * Classify an email address by type
 * @param {string} email 
 * @returns {'hr' | 'info' | 'skip' | 'other'}
 */
function classifyEmail(email) {
  const lower = email.toLowerCase().trim();
  for (const prefix of HR_PREFIXES) {
    if (lower.startsWith(prefix)) return 'hr';
  }
  for (const prefix of INFO_PREFIXES) {
    if (lower.startsWith(prefix)) return 'info';
  }
  for (const prefix of SKIP_PREFIXES) {
    if (lower.startsWith(prefix)) return 'skip';
  }
  return 'other';
}

/**
 * Extract all emails from a single cell string (handles pipe/semicolon/comma separated)
 * @param {string} cellValue 
 * @returns {Array<string>}
 */
function extractEmailsFromCell(cellValue) {
  if (!cellValue) return [];
  const str = String(cellValue).trim();
  const matches = str.match(EMAIL_REGEX);
  return matches ? matches.map(e => e.toLowerCase().trim()) : [];
}

/**
 * Find the best sheet in a workbook — the one with the most email addresses
 * @param {object} workbook 
 * @returns {string} sheet name
 */
function findDataSheet(workbook) {
  let bestSheet = workbook.SheetNames[0];
  let bestEmailCount = 0;

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    let emailCount = 0;
    for (const row of rows) {
      for (const cell of row) {
        const emails = extractEmailsFromCell(cell);
        emailCount += emails.length;
      }
    }
    console.log(`Sheet "${name}": ${rows.length} rows, ${emailCount} emails`);
    if (emailCount > bestEmailCount) {
      bestEmailCount = emailCount;
      bestSheet = name;
    }
  }

  console.log(`Selected sheet: "${bestSheet}" (${bestEmailCount} emails)`);
  return bestSheet;
}

/**
 * Detect the actual header row — looks for a row containing email-related column names
 * @param {Array} rows - all rows
 * @returns {number} index of the header row, or -1 if none found
 */
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
    // Look for column headers like "institution", "email", "hr", "recruiting", "contact"
    const hasInstitution = rowStr.includes('institution') || rowStr.includes('company') || rowStr.includes('organization') || rowStr.includes('entity');
    const hasEmail = rowStr.includes('email') || rowStr.includes('recruiting') || rowStr.includes('hr') || rowStr.includes('contact');
    if (hasInstitution && hasEmail) {
      console.log(`Found header row at index ${i}:`, row.map(c => String(c || '')).slice(0, 4));
      return i;
    }
  }
  return -1;
}

/**
 * Clean an Excel file: extract institution names and best emails
 * Handles multi-sheet workbooks, finds the data sheet automatically,
 * detects header rows even if they're not on row 1.
 * 
 * @param {string} filePath 
 * @returns {{ cleanedRows: Array, cleanedFilePath: string, stats: object }}
 */
function cleanFile(filePath) {
  try {
    console.log('Starting email extraction for file:', filePath);

    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (readError) {
      console.error('XLSX read error:', readError.message || readError);
      throw new Error('Failed to read Excel file. Ensure it is a valid .xlsx/.xls file, saved without merged cells or complex formatting.');
    }

    // Find the sheet with the most email data
    const sheetName = findDataSheet(workbook);
    const worksheet = workbook.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Processing sheet "${sheetName}" with ${rows.length} rows`);

    // Find the header row (may not be row 0)
    const headerIndex = findHeaderRow(rows);
    const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;
    console.log(`Data starts at row index ${startIndex}`);

    // Try to detect column mapping from header row
    let colMapping = { institution: 0, hrEmail: -1, otherEmail: -1 };
    if (headerIndex >= 0) {
      const headerRow = rows[headerIndex];
      headerRow.forEach((cell, idx) => {
        const lower = String(cell || '').toLowerCase();
        if (lower.includes('input institution') || lower.includes('institution') || lower.includes('company')) {
          colMapping.institution = idx;
        }
        if (lower.includes('recruiting') || lower.includes('hr email') || lower.includes('role-based')) {
          colMapping.hrEmail = idx;
        }
        if (lower.includes('other') || lower.includes('non-hr') || lower.includes('official email') || lower.includes('public email')) {
          colMapping.otherEmail = idx;
        }
      });
      console.log('Column mapping:', colMapping);
    }

    const cleanedRows = [['Institution', 'Email']]; // Header row
    let stats = { total: 0, extracted: 0, skippedNoEmail: 0, skippedNoInstitution: 0, hrSelected: 0, infoSelected: 0 };

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }

      stats.total++;

      // Get institution name from the known column
      const institution = String(row[colMapping.institution] || '').trim().replace(/\s+/g, ' ');
      if (!institution) {
        console.log(`Row ${i + 1}: Skipped — no institution name`);
        stats.skippedNoInstitution++;
        continue;
      }

      // Collect HR emails from column C (if mapped)
      let hrEmails = [];
      if (colMapping.hrEmail >= 0 && row[colMapping.hrEmail]) {
        const found = extractEmailsFromCell(row[colMapping.hrEmail]);
        hrEmails = found.filter(e => {
          const type = classifyEmail(e);
          return type === 'hr' || type === 'info' || type === 'other'; // Accept any non-skip email from the HR column
        });
      }

      // Collect other emails from column D (if mapped)
      let otherEmails = [];
      if (colMapping.otherEmail >= 0 && row[colMapping.otherEmail]) {
        const found = extractEmailsFromCell(row[colMapping.otherEmail]);
        otherEmails = found.filter(e => {
          const type = classifyEmail(e);
          return type === 'hr' || type === 'info'; // Only accept HR or info@ from the "other" column
        });
      }

      // If no column mapping worked, fall back to scanning all cells
      if (colMapping.hrEmail < 0 && colMapping.otherEmail < 0) {
        for (const cell of row) {
          const found = extractEmailsFromCell(cell);
          for (const email of found) {
            const type = classifyEmail(email);
            if (type === 'hr') hrEmails.push(email);
            else if (type === 'info') otherEmails.push(email);
          }
        }
      }

      // Priority selection: HR email > info@ email
      let selectedEmail = null;
      let selectedType = '';

      if (hrEmails.length > 0) {
        selectedEmail = hrEmails[0];
        selectedType = 'hr';
        stats.hrSelected++;
      } else if (otherEmails.length > 0) {
        selectedEmail = otherEmails[0];
        selectedType = 'info';
        stats.infoSelected++;
      }

      if (!selectedEmail) {
        console.log(`Row ${i + 1}: Skipped — no usable email for "${institution}"`);
        stats.skippedNoEmail++;
        continue;
      }

      console.log(`Row ${i + 1}: ✓ ${institution} → ${selectedEmail} (${selectedType})`);
      cleanedRows.push([institution, selectedEmail]);
      stats.extracted++;
    }

    console.log(`\nExtraction complete:`, stats);

    // Write cleaned file
    const cleanedWorkbook = XLSX.utils.book_new();
    const cleanedSheet = XLSX.utils.aoa_to_sheet(cleanedRows);

    // Auto-size columns
    cleanedSheet['!cols'] = [
      { wch: Math.max(...cleanedRows.map(r => String(r[0]).length)) + 2 },
      { wch: Math.max(...cleanedRows.map(r => String(r[1]).length)) + 2 }
    ];

    XLSX.utils.book_append_sheet(cleanedWorkbook, cleanedSheet, 'Cleaned Emails');

    const cleanedFilePath = path.join(require('os').tmpdir(), `cleaned_emails_${Date.now()}.xlsx`);
    XLSX.writeFile(cleanedWorkbook, cleanedFilePath);
    console.log(`Cleaned file generated: ${cleanedFilePath}`);

    if (!fs.existsSync(cleanedFilePath)) {
      throw new Error('Failed to write cleaned file');
    }

    return { cleanedRows, cleanedFilePath, stats };
  } catch (error) {
    console.error('Error in cleanFile:', error.message || error);
    throw error;
  }
}

/**
 * Detect if a row is a header row (for already-cleaned files)
 * @param {Array} row 
 * @returns {boolean}
 */
function detectHeader(row) {
  if (!row || row.length < 1) return false;
  const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
  return rowStr.includes('institution') || rowStr.includes('company') || rowStr.includes('organization') ||
         rowStr.includes('organisation') || rowStr.includes('email') || rowStr.includes('contact');
}

/**
 * Validate cleaned email data (Institution in Col A, Email in Col B)
 * @param {Array} cleanedRows - 2D array with [Institution, Email] rows
 * @returns {{ validRecipients: Array, errors: Array }}
 */
function validateEmails(cleanedRows) {
  const validRecipients = [];
  const errors = [];
  let startIndex = 0;

  // Skip header row
  if (cleanedRows.length > 0 && detectHeader(cleanedRows[0])) {
    startIndex = 1;
  }

  const emailValidationRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  for (let i = startIndex; i < cleanedRows.length; i++) {
    const rowIndex = i + 1;
    const row = cleanedRows[i];

    if (!row || row.length < 2) {
      errors.push({ rowIndex, institution: '', email: '', error: 'Row too short (needs at least 2 columns)' });
      continue;
    }

    const institution = String(row[0] || '').trim();
    const email = String(row[1] || '').trim().toLowerCase();

    if (!institution) {
      errors.push({ rowIndex, institution: '', email, error: 'Institution name is empty' });
      continue;
    }

    if (!email) {
      errors.push({ rowIndex, institution, email: '', error: 'Email is empty' });
      continue;
    }

    if (!emailValidationRegex.test(email)) {
      errors.push({ rowIndex, institution, email, error: `Invalid email format: "${email}"` });
      continue;
    }

    validRecipients.push({ institution, email });
  }

  return { validRecipients, errors };
}

module.exports = { cleanFile, validateEmails, detectHeader, classifyEmail };
