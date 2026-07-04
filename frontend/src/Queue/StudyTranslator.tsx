import React, { useState } from 'react';
import './study-translator.css';

interface StudyExtraction {
  extraction_id: string;
  rto: string;
  network_upgrade_cost: number;
  network_upgrades: NetworkUpgrade[];
  study_deposit_required?: number;
  commercial_readiness_deposit?: number;
  estimated_energization_date?: string;
  developer_actions: string[];
  summary_document: string;
}

interface NetworkUpgrade {
  description: string;
  cost: number;
  lead_time_months?: number;
}

export const StudyTranslator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rto, setRto] = useState('PJM');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<StudyExtraction | null>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8000';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    setExtraction(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('rto', rto);
      formData.append('project_name', projectName || 'Unknown');

      const response = await fetch(`${BACKEND_URL}/queue/translate-study`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to translate study');
      }

      const data: StudyExtraction = await response.json();
      setExtraction(data);
      setFile(null);
      setProjectName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadSummary = () => {
    if (!extraction) return;
    const element = document.createElement('a');
    const file = new Blob([extraction.summary_document], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `study-summary-${extraction.extraction_id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="study-translator">
      <div className="translator-container">
        <h1>Interconnection Study Translator</h1>
        <p className="subtitle">Upload an RTO study PDF and extract key costs, timelines, and constraints</p>

        <div className="translator-content">
          {/* Upload Section */}
          <div className="upload-section">
            <h2>Upload Study PDF</h2>

            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-group">
                <label htmlFor="project_name">Project Name (Optional)</label>
                <input
                  id="project_name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Acme Solar Farm Phase 1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="rto">RTO/ISO</label>
                <select value={rto} onChange={(e) => setRto(e.target.value)}>
                  <option value="PJM">PJM</option>
                  <option value="MISO">MISO</option>
                  <option value="ERCOT">ERCOT</option>
                  <option value="CAISO">CAISO</option>
                  <option value="SPP">SPP</option>
                </select>
              </div>

              <div className="file-upload-group">
                <label htmlFor="pdf_file">PDF File</label>
                <div className="file-input-wrapper">
                  <input
                    id="pdf_file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                  <div className="file-label">
                    {file ? (
                      <>
                        <span className="file-icon">📄</span>
                        <span>{file.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="file-icon">📥</span>
                        <span>Click to upload or drag and drop</span>
                        <span className="file-hint">PDF files only</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading || !file} className="btn-primary">
                {loading ? 'Translating Study...' : 'Translate Study'}
              </button>
            </form>

            {error && <div className="alert alert-error">{error}</div>}
          </div>

          {/* Results Section */}
          {extraction && (
            <div className="results-section">
              <h2>Study Analysis Results</h2>

              <div className="key-findings">
                <div className="finding-card">
                  <h3>Network Upgrade Costs</h3>
                  <div className="cost-display">
                    <span className="cost-amount">${(extraction.network_upgrade_cost / 1_000_000).toFixed(1)}M</span>
                  </div>
                </div>

                {extraction.study_deposit_required && (
                  <div className="finding-card">
                    <h3>Study Deposit Required</h3>
                    <div className="cost-display">
                      <span className="cost-amount">${(extraction.study_deposit_required / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                )}

                {extraction.commercial_readiness_deposit && (
                  <div className="finding-card">
                    <h3>Commercial Readiness Deposit</h3>
                    <div className="cost-display">
                      <span className="cost-amount">${(extraction.commercial_readiness_deposit / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                )}

                {extraction.estimated_energization_date && (
                  <div className="finding-card">
                    <h3>Estimated Energization</h3>
                    <div className="date-display">
                      <span>{new Date(extraction.estimated_energization_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Network Upgrades */}
              {extraction.network_upgrades.length > 0 && (
                <div className="upgrades-section">
                  <h3>Network Upgrades</h3>
                  <div className="upgrades-list">
                    {extraction.network_upgrades.map((upgrade, idx) => (
                      <div key={idx} className="upgrade-item">
                        <div className="upgrade-header">
                          <span className="upgrade-name">{upgrade.description}</span>
                          <span className="upgrade-cost">${(upgrade.cost / 1_000_000).toFixed(1)}M</span>
                        </div>
                        {upgrade.lead_time_months && (
                          <div className="upgrade-detail">
                            Lead Time: {upgrade.lead_time_months} months
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Developer Actions */}
              {extraction.developer_actions.length > 0 && (
                <div className="actions-section">
                  <h3>Developer Actions Required</h3>
                  <ul className="actions-list">
                    {extraction.developer_actions.map((action, idx) => (
                      <li key={idx}>
                        <input type="checkbox" id={`action_${idx}`} />
                        <label htmlFor={`action_${idx}`}>{action}</label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary Document */}
              <div className="summary-section">
                <h3>Full Analysis Summary</h3>
                <div className="summary-box">
                  <pre>{extraction.summary_document}</pre>
                </div>
                <button onClick={downloadSummary} className="btn-secondary">
                  📥 Download Summary
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyTranslator;
