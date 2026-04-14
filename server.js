const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { cleanFile, validateEmails } = require('./fileProcessing');
const { sendBulkEmails, defaultSubject } = require('./messaging');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: os.tmpdir() });

// ===== Root route =====
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Bulk Email Sender API is running.',
    hint: 'Open http://localhost:3000 for the UI.',
    endpoints: ['POST /api/clean', 'POST /api/process', 'POST /api/send'],
  });
});

// ===== API: Clean File =====
app.post('/api/clean', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  try {
    const { cleanedFilePath, stats } = cleanFile(filePath);

    console.log('Cleaned file ready. Stats:', stats);
    const fileStream = fs.createReadStream(cleanedFilePath);
    res.setHeader('Content-Disposition', 'attachment; filename="cleaned_emails.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('X-Stats', JSON.stringify(stats));
    // Expose custom header to frontend
    res.setHeader('Access-Control-Expose-Headers', 'X-Stats');
    fileStream.pipe(res);

    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(cleanedFilePath)) fs.unlinkSync(cleanedFilePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 5000);
    });
  } catch (error) {
    console.error('Error in clean endpoint:', error.message || error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (error.message.includes('Failed to read Excel file')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error cleaning file: ' + (error.message || 'Unknown error') });
  }
});

// ===== API: Process / Validate =====
app.post('/api/process', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  try {
    const { cleanedRows } = cleanFile(filePath);
    const { validRecipients, errors } = validateEmails(cleanedRows);

    const summary = {
      found: cleanedRows.length - 1, // minus header
      valid: validRecipients.length,
      errors: errors.length,
      errorDetails: errors,
    };

    console.log(`Validation: Found ${summary.found}, Valid ${summary.valid}, Errors ${summary.errors}`);
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

// ===== API: Send Emails =====
app.post('/api/send', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const { senderEmail, appPassword, subject } = req.body;

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
    const results = await sendBulkEmails(validRecipients, senderEmail, appPassword, subject || defaultSubject);

    res.json({ success: true, results, validationErrors: errors });
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

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Bulk Email Sender server running on http://localhost:${PORT}`);
  console.log(`   Attachments directory: ${path.join(__dirname, 'attachments')}`);
  console.log(`   Temp directory: ${os.tmpdir()}\n`);
});
