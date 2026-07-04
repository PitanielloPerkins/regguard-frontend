import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import App from './App';
import { DataCenterRequestForm } from './DataCenterRequestForm';
import { SalesLeadsDashboard } from './SalesLeadsDashboard';
import { QueueLanding } from './Queue/QueueLanding';
import { QueueUploadForm } from './Queue/QueueUploadForm';
import QueueMonitorDashboard from './Queue/QueueMonitorDashboard';
import StudyTranslator from './Queue/StudyTranslator';
import TimelinePredictor from './Queue/TimelinePredictor';
import { backendUrl } from './env';
import './router-layout.css';

export function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* RegGuard Queue Routes (NEW) */}
        <Route path="/queue" element={<QueueLandingPage />} />
        <Route path="/queue/upload" element={<QueueUploadPage />} />
        <Route path="/queue/monitor" element={<QueueMonitorPage />} />
        <Route path="/queue/translator" element={<TranslatorPage />} />
        <Route path="/queue/timeline" element={<TimelinePage />} />

        {/* Data Center B2B Routes */}
        <Route path="/data-center" element={<DataCenterPage />} />
        <Route path="/admin/leads" element={<AdminLeadsPage />} />

        {/* Existing Compliance Routes */}
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/auth/success" element={<App />} />
        <Route path="/signup" element={<App />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function DataCenterPage() {
  return (
    <div className="router-page">
      <header className="dc-page-header">
        <div className="dc-header-container">
          <Link to="/" className="dc-logo">
            ← Back to RegGuard
          </Link>
          <nav className="dc-nav">
            <a href="mailto:sales@regguard.com?subject=Data%20Center%20Analysis" className="dc-nav-link">
              Questions?
            </a>
          </nav>
        </div>
      </header>
      <DataCenterRequestForm />
    </div>
  );
}

function QueueUploadPage() {
  return (
    <div className="router-page">
      <header className="queue-page-header">
        <div className="queue-header-container">
          <Link to="/queue" className="queue-logo">
            ← Back to Queue
          </Link>
          <nav className="queue-nav">
            <a href="https://docs.regguard.io/queue" className="queue-nav-link">
              Docs
            </a>
            <a href="mailto:support@regguard.com" className="queue-nav-link">
              Support
            </a>
          </nav>
        </div>
      </header>
      <QueueUploadForm />
    </div>
  );
}

function AdminLeadsPage() {
  return (
    <div className="router-page">
      <header className="admin-page-header">
        <div className="admin-header-container">
          <Link to="/" className="admin-logo">
            ← Back to RegGuard
          </Link>
          <div className="admin-title">
            <h1>Sales Pipeline</h1>
            <p>Data Center Analysis Leads</p>
          </div>
        </div>
      </header>
      <SalesLeadsDashboard backendUrl={backendUrl('')} />
    </div>
  );
}

function QueueLandingPage() {
  return (
    <div className="router-page">
      <QueueLanding />
    </div>
  );
}

function QueueMonitorPage() {
  return (
    <div className="router-page">
      <header className="queue-page-header">
        <div className="queue-header-container">
          <Link to="/queue" className="queue-logo">
            ← Back to Queue
          </Link>
        </div>
      </header>
      <QueueMonitorDashboard />
    </div>
  );
}

function TranslatorPage() {
  return (
    <div className="router-page">
      <header className="queue-page-header">
        <div className="queue-header-container">
          <Link to="/queue" className="queue-logo">
            ← Back to Queue
          </Link>
        </div>
      </header>
      <StudyTranslator />
    </div>
  );
}

function TimelinePage() {
  return (
    <div className="router-page">
      <header className="queue-page-header">
        <div className="queue-header-container">
          <Link to="/queue" className="queue-logo">
            ← Back to Queue
          </Link>
        </div>
      </header>
      <TimelinePredictor />
    </div>
  );
}