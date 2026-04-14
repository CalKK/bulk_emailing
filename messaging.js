const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const emailTemplate = `Dear Sir/Madam,

I trust this message finds you well.

I go by the name of Calvin Kinyanjui, 5th Year Electrical & Electronics Engineering Student at Strathmore University awaiting graduation in August 2026. I write this email with the view to lodge an application seeking a job opportunity at [Institution]

I also wanted to take this time to share with you my professional portfolio.

Kindly find attached below my resume and recommendation letter.

In case of any queries, don't hesitate to reach out.

Thank you & Kind Regards!`;

const defaultSubject = 'Job Application — Calvin Kinyanjui, Electrical & Electronics Engineering';

/**
 * Create a Nodemailer transporter using Gmail SMTP
 * @param {string} senderEmail 
 * @param {string} appPassword 
 * @returns {object} Nodemailer transporter
 */
function createTransporter(senderEmail, appPassword) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmail,
      pass: appPassword,
    },
  });
}

/**
 * Get attachment files from the attachments directory
 * @returns {Array} Array of attachment objects for Nodemailer
 */
function getAttachments() {
  const attachmentsDir = path.join(__dirname, 'attachments');
  const attachments = [];

  if (!fs.existsSync(attachmentsDir)) {
    console.warn('Attachments directory not found:', attachmentsDir);
    return attachments;
  }

  const files = fs.readdirSync(attachmentsDir);
  for (const file of files) {
    // Only include PDF and DOCX files, skip README and hidden files
    const ext = path.extname(file).toLowerCase();
    if (['.pdf', '.docx', '.doc'].includes(ext)) {
      attachments.push({
        filename: file,
        path: path.join(attachmentsDir, file),
      });
      console.log(`Attachment found: ${file}`);
    }
  }

  return attachments;
}

/**
 * Generate personalized email body
 * @param {string} institutionName 
 * @returns {string}
 */
function generateEmailBody(institutionName) {
  return emailTemplate.replace('[Institution]', institutionName);
}

/**
 * Send a single email
 * @param {object} transporter - Nodemailer transporter
 * @param {string} senderEmail - Sender's email address
 * @param {string} recipientEmail - Recipient email
 * @param {string} institution - Institution name
 * @param {string} subject - Email subject line
 * @param {Array} attachments - Attachment objects
 * @returns {Promise<object>}
 */
async function sendEmail(transporter, senderEmail, recipientEmail, institution, subject, attachments) {
  const body = generateEmailBody(institution);

  const mailOptions = {
    from: `Calvin Kinyanjui <${senderEmail}>`,
    to: recipientEmail,
    subject: subject,
    text: body,
    attachments: attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Sent to ${recipientEmail} (${institution}): ${info.messageId}`);
    return { success: true, email: recipientEmail, institution, messageId: info.messageId };
  } catch (error) {
    console.error(`✗ Failed to send to ${recipientEmail} (${institution}):`, error.message);
    return { success: false, email: recipientEmail, institution, error: error.message };
  }
}

/**
 * Send bulk emails with delay between each
 * @param {Array} validRecipients - Array of { institution, email }
 * @param {string} senderEmail 
 * @param {string} appPassword 
 * @param {string} subject 
 * @param {number} delayMs - Delay between emails in milliseconds (default: 2000)
 * @returns {Promise<object>} Results summary
 */
async function sendBulkEmails(validRecipients, senderEmail, appPassword, subject, delayMs = 2000) {
  const transporter = createTransporter(senderEmail, appPassword);
  const attachments = getAttachments();
  const results = { sent: [], failed: [], total: validRecipients.length };

  console.log(`\nStarting bulk email send: ${validRecipients.length} recipients`);
  console.log(`Attachments: ${attachments.length} files`);
  console.log(`Delay between emails: ${delayMs}ms`);
  console.log(`Subject: ${subject}\n`);

  // Verify transporter connection first
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully.\n');
  } catch (error) {
    console.error('SMTP connection failed:', error.message);
    throw new Error(`SMTP authentication failed: ${error.message}. Check your email and app password.`);
  }

  for (let i = 0; i < validRecipients.length; i++) {
    const { institution, email } = validRecipients[i];
    console.log(`[${i + 1}/${validRecipients.length}] Sending to ${email} (${institution})...`);

    const result = await sendEmail(transporter, senderEmail, email, institution, subject, attachments);
    
    if (result.success) {
      results.sent.push(result);
    } else {
      results.failed.push(result);
    }

    // Delay between emails (except after the last one)
    if (i < validRecipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\nBulk send complete: ${results.sent.length} sent, ${results.failed.length} failed out of ${results.total}`);
  return results;
}

module.exports = { sendBulkEmails, generateEmailBody, getAttachments, emailTemplate, defaultSubject };
