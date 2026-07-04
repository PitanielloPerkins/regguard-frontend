import React, { useState } from 'react';
import { toast } from 'react-toastify';
import './queue-upload-form.css';

interface AutoFillResult {
  submission_id: string;
  form_type: string;
  filled_form: Record<string, any>;
  accuracy_report: Record<string, any>;
  pdf_url?: string;
  ready_for_export: boolean;
}

export const QueueUploadForm: React.FC = () => {
  const [formType, setFormType] = useState<string>('ferc_556');
  const [projectText, setProjectText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AutoFillResult | null>(null);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [file, setFile] = useState<File | null>(null);

  const FORM_TYPES = [
    { id: 'ferc_556', label: 'FERC Form 556 (Large Generator)', description: '>20 MW' },
    { id: 'ferc_557', label: 'FERC Form 557 (Small Generator)', description: '<20 MW' },
    { id: 'pjm_nextgen', label: 'PJM NextGen Interconnection', description: 'PJM Region' },
    { id: 'miso', label: 'MISO Interconnection Application', description: 'MISO Region' },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setProjectText(content);
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectText.trim()) {
      toast.error('Please enter project information or upload a file');
      return;
    }

    setIsLoading(true);

    try {
      // Use environment variable for backend, fallback to localhost for development
      const backendUrl = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/queue/auto-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: formType,
          project_text: projectText,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: AutoFillResult = await response.json();
      setResult(data);
      toast.success(
        `Form auto-filled with ${Math.round(data.accuracy_report.overall_confidence * 100)}% confidence!`
      );
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result?.pdf_url) return;
    const link = document.createElement('a');
    link.href = result.pdf_url;
    link.download = `${result.form_type}-${result.submission_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('PDF downloaded!');
  };

  if (result) {
    return (
      <div className="queue-result-container">
        <div className="result-header">
          <h2>Form Auto-Filled Successfully!</h2>
          <button className="btn-reset" onClick={() => setResult(null)}>
            ← Start Over
          </button>
        </div>

        <div className="result-grid">
          <div className="result-card">
            <h3>Accuracy Report</h3>
            <div className="accuracy-score">
              <div className="score-circle">
                {Math.round(result.accuracy_report.overall_confidence * 100)}%
              </div>
              <div className="score-details">
                <p>
                  <strong>{result.accuracy_report.required_fields_filled}</strong> of{' '}
                  <strong>{result.accuracy_report.total_required_fields}</strong> required fields filled
                </p>
                <p className={result.ready_for_export ? 'status-ready' : 'status-review'}>
                  {result.ready_for_export
                    ? '✓ Ready to export and submit'
                    : '⚠ Please review before submission'}
                </p>
              </div>
            </div>

            {result.accuracy_report.fields_with_errors && result.accuracy_report.fields_with_errors.length > 0 && (
              <div className="errors-list">
                <h4>Issues Found:</h4>
                <ul>
                  {result.accuracy_report.fields_with_errors.map((error: string, i: number) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="result-card">
            <h3>Filled Form Preview</h3>
            <div className="form-preview">
              {Object.entries(result.filled_form).slice(0, 5).map(([key, value]) => (
                <div key={key} className="preview-row">
                  <span className="preview-label">{key}:</span>
                  <span className="preview-value">{String(value || '—')}</span>
                </div>
              ))}
              {Object.keys(result.filled_form).length > 5 && (
                <p className="preview-more">
                  +{Object.keys(result.filled_form).length - 5} more fields
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button
            className="btn-primary btn-large"
            onClick={handleDownloadPDF}
            disabled={!result.pdf_url}
          >
            📥 Download PDF
          </button>
          <button className="btn-secondary btn-large">
            ☁ Submit to RTO
          </button>
          <button className="btn-secondary btn-large">
            💾 Save Draft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-upload-form">
      <div className="form-container">
        <div className="form-header">
          <h2>⚡ RegGuard Queue: Interconnection Forms</h2>
          <p>Auto-fill FERC/interconnection forms in seconds with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-section">
            <h3>Step 1: Select Form Type</h3>
            <div className="form-type-grid">
              {FORM_TYPES.map((ft) => (
                <label key={ft.id} className="form-type-option">
                  <input
                    type="radio"
                    name="formType"
                    value={ft.id}
                    checked={formType === ft.id}
                    onChange={(e) => setFormType(e.target.value)}
                  />
                  <div className="option-content">
                    <div className="option-label">{ft.label}</div>
                    <div className="option-description">{ft.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Step 2: Upload Project Information</h3>

            <div className="upload-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${uploadMode === 'text' ? 'active' : ''}`}
                onClick={() => setUploadMode('text')}
              >
                📝 Paste Text
              </button>
              <button
                type="button"
                className={`mode-btn ${uploadMode === 'file' ? 'active' : ''}`}
                onClick={() => setUploadMode('file')}
              >
                📎 Upload File
              </button>
            </div>

            {uploadMode === 'text' && (
              <textarea
                className="project-input"
                placeholder="Paste project information here...&#10;&#10;Example:&#10;Project: Acme Solar Farm Phase 1&#10;Location: Denver, Colorado&#10;Capacity: 10 MW&#10;Facility Type: Solar PV&#10;Contact: contact@acmesolar.com"
                value={projectText}
                onChange={(e) => setProjectText(e.target.value)}
                rows={8}
              />
            )}

            {uploadMode === 'file' && (
              <div className="file-upload-area">
                <input
                  type="file"
                  id="fileInput"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.doc,.docx"
                  className="file-input"
                />
                <label htmlFor="fileInput" className="file-upload-label">
                  <div className="upload-icon">📁</div>
                  <p>Click to upload or drag and drop</p>
                  <p className="file-hint">PDF, TXT, or DOCX (Max 10MB)</p>
                  {file && <p className="file-name">✓ {file.name}</p>}
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary btn-submit"
            disabled={isLoading || !projectText.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner">⏳</span> Processing...
              </>
            ) : (
              <>
                ⚡ Auto-Fill Form
              </>
            )}
          </button>
        </form>

        <div className="form-info">
          <p>💡 Tip: The more detailed your project information, the more accurate the auto-fill will be.</p>
        </div>
      </div>
    </div>
  );
};
