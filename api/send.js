const multer = require('multer');
const { cleanFile, validateEmails } = require('../fileProcessing.js');
const { sendBulkEmails, defaultSubject } = require('../messaging.js');
const os = require('os');
const fs = require('fs');

const upload = multer({ dest: os.tmpdir() });

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      res.status(500).json({ error: 'File upload failed' });
      return;
    }

    const filePath = req.file.path;
    const senderEmail = req.body.senderEmail;
    const appPassword = req.body.appPassword;
    const subject = req.body.subject || defaultSubject;

    if (!senderEmail || !appPassword) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Sender email and app password are required.' });
    }

    try {
      const { cleanedRows } = cleanFile(filePath);
      const { validRecipients, errors } = validateEmails(cleanedRows);

      if (validRecipients.length === 0) {
        return res.status(400).json({
          error: 'No valid email recipients found in the file.',
          validationErrors: errors,
        });
      }

      console.log(`Sending bulk emails: ${validRecipients.length} recipients`);

      const results = await sendBulkEmails(validRecipients, senderEmail, appPassword, subject);

      res.json({
        success: true,
        results,
        validationErrors: errors,
      });
    } catch (error) {
      console.error('Error in send endpoint:', error);
      if (error.message.includes('SMTP authentication failed')) {
        return res.status(401).json({ error: error.message });
      }
      if (error.message.includes('Failed to read Excel file')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error sending emails: ' + (error.message || 'Unknown error') });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
}
