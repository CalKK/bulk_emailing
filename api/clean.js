const multer = require('multer');
const { cleanFile } = require('../fileProcessing.js');
const fs = require('fs');
const os = require('os');

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
      const { cleanedFilePath, stats } = cleanFile(filePath);

      console.log('Cleaned file ready, sending download. Stats:', stats);
      const fileStream = fs.createReadStream(cleanedFilePath);
      res.setHeader('Content-Disposition', 'attachment; filename="cleaned_emails.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('X-Stats', JSON.stringify(stats));
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
}
