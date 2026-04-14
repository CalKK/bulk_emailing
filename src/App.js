import React, { useState, useRef, useCallback } from 'react';
import './App.css';
import axios from 'axios';

const EMAIL_TEMPLATE = `Dear Sir/Madam,

I trust this message finds you well.

I go by the name of Calvin Kinyanjui, 5th Year Electrical & Electronics Engineering Student at Strathmore University awaiting graduation in August 2026. I write this email with the view to lodge an application seeking a job opportunity at [Institution]

I also wanted to take this time to share with you my professional portfolio.

Kindly find attached below my resume and recommendation letter.

In case of any queries, don't hesitate to reach out.

Thank you & Kind Regards!`;

const DEFAULT_SUBJECT = 'Job Application — Calvin Kinyanjui, Electrical & Electronics Engineering';
const DEFAULT_SENDER = 'calvinkinyanjui017@gmail.com';

function App() {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Step 1: Clean
  const [rawFile, setRawFile] = useState(null);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanStats, setCleanStats] = useState(null);

  // Step 2: Preview
  const [cleanedFile, setCleanedFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [validationSummary, setValidationSummary] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Step 3: Send
  const [senderEmail, setSenderEmail] = useState(DEFAULT_SENDER);
  const [appPassword, setAppPassword] = useState('');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  // Global
  const [error, setError] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const rawFileRef = useRef(null);
  const cleanedFileRef = useRef(null);

  // ========== HELPERS ==========
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const markStepCompleted = (step) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  const goToStep = (step) => {
    setError('');
    setCurrentStep(step);
  };

  // ========== STEP 1: CLEAN ==========
  const handleRawFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setRawFile(f);
      setError('');
      setCleanStats(null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setRawFile(f);
      setError('');
      setCleanStats(null);
    } else {
      setError('Please drop an Excel file (.xlsx or .xls)');
    }
  }, []);

  const handleClean = async () => {
    if (!rawFile) {
      setError('Please select an Excel file first.');
      return;
    }
    setCleanLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', rawFile);

    try {
      const response = await axios.post('/api/clean', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      // Try to get stats from response header
      const statsHeader = response.headers['x-stats'];
      if (statsHeader) {
        try {
          setCleanStats(JSON.parse(statsHeader));
        } catch (e) { /* ignore parse errors */ }
      }

      // Create download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cleaned_emails.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      markStepCompleted(1);
    } catch (err) {
      console.error('Error cleaning file:', err);
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          setError(json.error || 'An error occurred while cleaning the file.');
        } catch {
          setError('An error occurred while cleaning the file. Please try again.');
        }
      } else {
        setError(err.response?.data?.error || 'An error occurred while cleaning the file.');
      }
    } finally {
      setCleanLoading(false);
    }
  };

  // ========== STEP 2: PREVIEW ==========
  const handleCleanedFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setCleanedFile(f);
      setError('');
      setRecipients([]);
      setValidationSummary(null);
    }
  };

  const handlePreview = async () => {
    if (!cleanedFile) {
      setError('Please upload the cleaned Excel file.');
      return;
    }
    setPreviewLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', cleanedFile);

    try {
      const response = await axios.post('/api/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRecipients(response.data.recipients);
      setValidationSummary(response.data.summary);
      markStepCompleted(2);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.response?.data?.error || 'An error occurred while processing the file.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ========== STEP 3: SEND ==========
  const handleSend = async () => {
    if (!cleanedFile) {
      setError('Please upload the cleaned Excel file first.');
      return;
    }
    if (!senderEmail || !appPassword) {
      setError('Please provide both your email and app password.');
      return;
    }

    setSendLoading(true);
    setError('');
    setSendResults(null);

    const formData = new FormData();
    formData.append('file', cleanedFile);
    formData.append('senderEmail', senderEmail);
    formData.append('appPassword', appPassword);
    formData.append('subject', subject);

    try {
      const response = await axios.post('/api/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSendResults(response.data.results);
      markStepCompleted(3);
    } catch (err) {
      console.error('Error sending emails:', err);
      setError(err.response?.data?.error || 'An error occurred while sending emails.');
    } finally {
      setSendLoading(false);
    }
  };

  // ========== RENDER HELPERS ==========
  const renderEmailPreview = (institution) => {
    return EMAIL_TEMPLATE.replace('[Institution]', institution || '[Institution]');
  };

  const classifyEmailType = (email) => {
    const lower = email.toLowerCase();
    const hrPrefixes = ['hr@', 'recruitment@', 'careers@', 'career@', 'humanresource@', 'humanresources@', 'talent@', 'hiring@', 'jobs@'];
    for (const p of hrPrefixes) {
      if (lower.startsWith(p)) return 'hr';
    }
    return 'info';
  };

  // ========== RENDER ==========
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-icon">📧</div>
        <h1>Bulk Email Sender</h1>
        <p className="subtitle">Extract emails from Excel, clean data & send automated job applications</p>
      </header>

      {/* Stepper */}
      <nav className="stepper" aria-label="Workflow steps">
        <div
          className={`step ${currentStep === 1 ? 'active' : ''} ${completedSteps.includes(1) ? 'completed' : ''}`}
          onClick={() => goToStep(1)}
          role="button"
          tabIndex={0}
        >
          <span className="step-number">{completedSteps.includes(1) ? '✓' : '1'}</span>
          <span className="step-label">Clean File</span>
        </div>
        <div className={`step-connector ${completedSteps.includes(1) ? 'completed' : ''}`} />
        <div
          className={`step ${currentStep === 2 ? 'active' : ''} ${completedSteps.includes(2) ? 'completed' : ''}`}
          onClick={() => goToStep(2)}
          role="button"
          tabIndex={0}
        >
          <span className="step-number">{completedSteps.includes(2) ? '✓' : '2'}</span>
          <span className="step-label">Preview & Validate</span>
        </div>
        <div className={`step-connector ${completedSteps.includes(2) ? 'completed' : ''}`} />
        <div
          className={`step ${currentStep === 3 ? 'active' : ''} ${completedSteps.includes(3) ? 'completed' : ''}`}
          onClick={() => goToStep(3)}
          role="button"
          tabIndex={0}
        >
          <span className="step-number">{completedSteps.includes(3) ? '✓' : '3'}</span>
          <span className="step-label">Send Emails</span>
        </div>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ===== STEP 1: CLEAN ===== */}
      {currentStep === 1 && (
        <div className="card" key="step1">
          <h2 className="card-title">
            <span className="icon">🧹</span>
            Clean & Extract Emails
          </h2>
          <p className="card-description">
            Upload your raw Excel file containing institution data. The system will scan all columns,
            extract <strong>HR emails</strong> (hr@, recruitment@, careers@) and <strong>info@ emails</strong>,
            prioritize HR emails when both exist, and output a clean 2-column file: Institution | Email.
          </p>

          <div
            className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="upload-icon">📂</span>
            <p className="upload-text">
              {dragOver ? 'Drop your Excel file here' : 'Click to select or drag & drop your Excel file'}
            </p>
            <p className="upload-hint">Supports .xlsx and .xls formats</p>
            <input
              type="file"
              ref={rawFileRef}
              accept=".xls,.xlsx"
              onChange={handleRawFileChange}
              id="raw-file-input"
            />
          </div>

          {rawFile && (
            <div className="file-selected">
              <span className="file-icon">📄</span>
              <div className="file-info">
                <div className="file-name">{rawFile.name}</div>
                <div className="file-size">{formatFileSize(rawFile.size)}</div>
              </div>
              <button className="remove-file" onClick={() => { setRawFile(null); if (rawFileRef.current) rawFileRef.current.value = ''; }} title="Remove file">
                ✕
              </button>
            </div>
          )}

          <div className="btn-group">
            <button
              className="btn btn-primary btn-lg btn-w-full"
              onClick={handleClean}
              disabled={cleanLoading || !rawFile}
              id="clean-btn"
            >
              {cleanLoading ? (
                <><span className="spinner" /> Cleaning & Extracting...</>
              ) : (
                <>🧹 Clean & Download</>
              )}
            </button>
          </div>

          {cleanStats && (
            <div style={{ marginTop: 20 }}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value accent">{cleanStats.total}</div>
                  <div className="stat-label">Total Rows</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value success">{cleanStats.extracted}</div>
                  <div className="stat-label">Extracted</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value info">{cleanStats.hrSelected}</div>
                  <div className="stat-label">HR Emails</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{cleanStats.infoSelected}</div>
                  <div className="stat-label">Info Emails</div>
                </div>
              </div>
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                <span>
                  File cleaned and downloaded as <strong>"cleaned_emails.xlsx"</strong>.
                  Go to <strong>Step 2</strong> to upload it and preview the recipients.
                </span>
              </div>
            </div>
          )}

          {completedSteps.includes(1) && (
            <div className="btn-group" style={{ marginTop: 12 }}>
              <button className="btn btn-success" onClick={() => goToStep(2)}>
                Continue to Step 2 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 2: PREVIEW ===== */}
      {currentStep === 2 && (
        <div className="card" key="step2">
          <h2 className="card-title">
            <span className="icon">👁️</span>
            Preview & Validate Recipients
          </h2>
          <p className="card-description">
            Upload the cleaned Excel file (Institution in Column A, Email in Column B).
            The system will validate all email addresses and display the recipient list before sending.
          </p>

          <div className="file-upload-zone">
            <span className="upload-icon">📂</span>
            <p className="upload-text">Upload cleaned Excel file</p>
            <p className="upload-hint">(The file you downloaded from Step 1)</p>
            <input
              type="file"
              ref={cleanedFileRef}
              accept=".xls,.xlsx"
              onChange={handleCleanedFileChange}
              id="cleaned-file-input"
            />
          </div>

          {cleanedFile && (
            <div className="file-selected">
              <span className="file-icon">📄</span>
              <div className="file-info">
                <div className="file-name">{cleanedFile.name}</div>
                <div className="file-size">{formatFileSize(cleanedFile.size)}</div>
              </div>
              <button className="remove-file" onClick={() => { setCleanedFile(null); setRecipients([]); setValidationSummary(null); if (cleanedFileRef.current) cleanedFileRef.current.value = ''; }}>
                ✕
              </button>
            </div>
          )}

          <div className="btn-group">
            <button
              className="btn btn-primary btn-lg btn-w-full"
              onClick={handlePreview}
              disabled={previewLoading || !cleanedFile}
              id="preview-btn"
            >
              {previewLoading ? (
                <><span className="spinner" /> Processing...</>
              ) : (
                <>👁️ Preview Recipients</>
              )}
            </button>
          </div>

          {validationSummary && (
            <div style={{ marginTop: 20 }}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value accent">{validationSummary.found}</div>
                  <div className="stat-label">Total Rows</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value success">{validationSummary.valid}</div>
                  <div className="stat-label">Valid Emails</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value danger">{validationSummary.errors}</div>
                  <div className="stat-label">Errors</div>
                </div>
              </div>
            </div>
          )}

          {/* Recipient Table */}
          {recipients.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ fontSize: 15, marginBottom: 4 }}>
                📋 Recipients ({recipients.length})
              </h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Institution</th>
                      <th>Email</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r, i) => (
                      <tr key={i}>
                        <td className="row-number">{i + 1}</td>
                        <td>{r.institution}</td>
                        <td className="email-cell">{r.email}</td>
                        <td>
                          <span className={`email-type-badge ${classifyEmailType(r.email) === 'hr' ? 'badge-hr' : 'badge-info'}`}>
                            {classifyEmailType(r.email) === 'hr' ? 'HR' : 'INFO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationSummary?.errorDetails?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ fontSize: 15, marginBottom: 8, color: 'var(--danger)' }}>
                ⚠️ Validation Errors ({validationSummary.errorDetails.length})
              </h3>
              <ul className="results-list">
                {validationSummary.errorDetails.map((e, i) => (
                  <li key={i} className="result-item">
                    <span className="result-status">❌</span>
                    <div>
                      <div className="result-institution">Row {e.rowIndex}: {e.institution || 'N/A'}</div>
                      <div className="result-error">{e.error}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Email Template Preview */}
          <div style={{ marginTop: 20 }}>
            <button className="toggle-btn" onClick={() => setShowTemplate(!showTemplate)}>
              {showTemplate ? '▼ Hide' : '► Show'} Email Template Preview
            </button>
            {showTemplate && (
              <div className="template-preview">
                <div className="template-preview-header">
                  <span>📧 Email Preview</span>
                  <span>Subject: {subject}</span>
                </div>
                {renderEmailPreview(recipients[0]?.institution || 'Example Corp Ltd')}
              </div>
            )}
          </div>

          {recipients.length > 0 && (
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => goToStep(1)}>
                ← Back
              </button>
              <button className="btn btn-success" onClick={() => goToStep(3)}>
                Continue to Send →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 3: SEND ===== */}
      {currentStep === 3 && (
        <div className="card" key="step3">
          <h2 className="card-title">
            <span className="icon">🚀</span>
            Send Bulk Emails
          </h2>
          <p className="card-description">
            Enter your SMTP credentials to send personalized job application emails with
            your resume and recommendation letter attached.
            {recipients.length > 0 && (
              <strong> {recipients.length} recipients ready to send.</strong>
            )}
          </p>

          {/* Credentials */}
          <div className="credential-section">
            <div className="section-title">🔐 SMTP Credentials</div>
            <div className="form-group">
              <label className="form-label" htmlFor="sender-email">Sender Email</label>
              <input
                className="form-input"
                type="email"
                id="sender-email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="your.email@gmail.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="app-password">App Password</label>
              <input
                className="form-input"
                type="password"
                id="app-password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="Enter your Gmail App Password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email-subject">Subject Line</label>
              <input
                className="form-input"
                type="text"
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
              />
            </div>
          </div>

          {/* File check */}
          {!cleanedFile && (
            <div className="alert alert-warning" style={{ marginTop: 16 }}>
              <span className="alert-icon">⚠️</span>
              <span>
                No cleaned file uploaded. Please go to <strong>Step 2</strong> first to upload and
                validate your cleaned Excel file.
              </span>
            </div>
          )}

          {cleanedFile && (
            <div className="file-selected" style={{ marginTop: 16 }}>
              <span className="file-icon">📄</span>
              <div className="file-info">
                <div className="file-name">{cleanedFile.name}</div>
                <div className="file-size">{formatFileSize(cleanedFile.size)} — Ready to send</div>
              </div>
            </div>
          )}

          {/* Attachments Notice */}
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <span className="alert-icon">📎</span>
            <span>
              Attachments are loaded from the <code style={{ color: 'var(--text-accent)' }}>attachments/</code> folder 
              in the project root. Place your resume and recommendation letter (PDF) there.
            </span>
          </div>

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => goToStep(2)}>
              ← Back
            </button>
            <button
              className="btn btn-success btn-lg"
              onClick={handleSend}
              disabled={sendLoading || !cleanedFile || !senderEmail || !appPassword}
              id="send-btn"
              style={{ flex: 2 }}
            >
              {sendLoading ? (
                <><span className="spinner" /> Sending Emails...</>
              ) : (
                <>🚀 Send All Emails</>
              )}
            </button>
          </div>

          {/* Send Results */}
          {sendResults && (
            <div style={{ marginTop: 24 }}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value accent">{sendResults.total}</div>
                  <div className="stat-label">Total</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value success">{sendResults.sent.length}</div>
                  <div className="stat-label">Sent ✓</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value danger">{sendResults.failed.length}</div>
                  <div className="stat-label">Failed ✗</div>
                </div>
              </div>

              {/* Progress */}
              <div className="progress-container">
                <div className="progress-header">
                  <span className="progress-label">Delivery Progress</span>
                  <span className="progress-count">
                    {sendResults.sent.length}/{sendResults.total}
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(sendResults.sent.length / sendResults.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Success List */}
              {sendResults.sent.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 className="card-title" style={{ fontSize: 14, color: 'var(--success)' }}>
                    ✅ Successfully Sent ({sendResults.sent.length})
                  </h3>
                  <ul className="results-list">
                    {sendResults.sent.map((r, i) => (
                      <li key={i} className="result-item">
                        <span className="result-status">✅</span>
                        <span className="result-institution">{r.institution}</span>
                        <span className="result-email">{r.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Failed List */}
              {sendResults.failed.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 className="card-title" style={{ fontSize: 14, color: 'var(--danger)' }}>
                    ❌ Failed ({sendResults.failed.length})
                  </h3>
                  <ul className="results-list">
                    {sendResults.failed.map((r, i) => (
                      <li key={i} className="result-item">
                        <span className="result-status">❌</span>
                        <div>
                          <div className="result-institution">{r.institution}</div>
                          <div className="result-email">{r.email}</div>
                          <div className="result-error">{r.error}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)', fontSize: 12 }}>
        <p>Built by Calvin Kinyanjui • Strathmore University • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
