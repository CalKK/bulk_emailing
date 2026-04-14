const multer = require('multer');
const { cleanFile, validateEmails, detectHeader } = require('../fileProcessing.js');
const os = require('os');
const fs = require('fs');

const upload = multer({ dest: os.tmpdir() });

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(500).json({ error: 'File upload failed' });
      return;
    }

    const filePath = req.file.path;

    try {
      const { cleanedRows } = cleanFile(filePath);
      const { validRecipients, errors } = validateEmails(cleanedRows);

      // Calculate stats
      let startIndex = 0;
      if (cleanedRows.length > 0 && detectHeader(cleanedRows[0])) {
        startIndex = 1;
      }
      const totalDataRows = cleanedRows.length - startIndex;

      const summary = {
        found: totalDataRows,
        valid: validRecipients.length,
        errors: errors.length,
        errorDetails: errors,
      };

      console.log(`Validation summary - Found: ${summary.found}, Valid: ${summary.valid}, Errors: ${summary.errors}`);

      res.json({ recipients: validRecipients, summary });
    } catch (error) {
      console.error('Error in process endpoint:', error);
      if (error.message.includes('Failed to read Excel file')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error processing file: ' + (error.message || 'Unknown error') });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
}
