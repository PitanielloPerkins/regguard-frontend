import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import App from './App';
import { DataCenterRequestForm } from './DataCenterRequestForm';
import { SalesLeadsDashboard } from './SalesLeadsDashboard';
import { QueueLanding } from './Queue/QueueLanding';
import { QueueUploadForm } from './Queue/QueueUploadForm';
import QueueMonitorDashboard from './Queue/QueueMonitorDashboard';
import StudyTranslator from './Queue/StudyTranslator';
import TimelinePredictor from './Queue/TimelinePredictor';
import { PlatformLayout, PlatformUser } from './PlatformLayout';
import PlatformDashboard from './pages/MergedDashboard';
import SignupPage from './pages/SignupPage';
import VoiceCommandSystem from './VoiceCommandSystem';
import OnboardingSystem from './OnboardingSystem';
import { backendUrl } from './env';
import './router-layout.css';

export function AppRouter() {
  // Force rebuild - v4 with all critical UI/UX fixes
  console.log('✅ AppRouter rendering - Clean landing page, no sidebar on /');
  
  // Simulated user (in production, this comes from auth context)
  const [user] = useState<PlatformUser>({
    name: 'Contractor',
    email: 'contractor@regguard.com',
    tier: 'pro',
  });

  const handleLogout = () => {
    console.log('User logged out');
  };

  return (
    <Router>
      <PlatformLayout user={user} onLogout={handleLogout}>
        <OnboardingSystem />
        <VoiceCommandSystem />
        
        <Routes>
          {/* Home Dashboard - Merged Design Focused on Data Center Pain Points */}
          <Route path="/" element={<PlatformDashboard />} />

          {/* Signup/Stripe Payment Page */}
          <Route path="/signup" element={<SignupPage />} />

          {/* RegGuard Queue Routes */}
          <Route path="/queue" element={<QueueLandingPage />} />
          <Route path="/queue/upload" element={<QueueUploadPage />} />
          <Route path="/queue/monitor" element={<QueueMonitorPage />} />
          <Route path="/queue/translator" element={<TranslatorPage />} />
          <Route path="/queue/timeline" element={<TimelinePage />} />

          {/* Data Center B2B Routes */}
          <Route path="/data-center" element={<DataCenterPage />} />
          <Route path="/admin/leads" element={<AdminLeadsPage />} />

          {/* Existing Compliance Routes */}
          <Route path="/agent" element={<App />} />
          <Route path="/dashboard" element={<App />} />
          <Route path="/auth/success" element={<App />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlatformLayout>
    </Router>
  );
}

function DataCenterPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Data Center Permitting Analysis</h1>
          <p>Get comprehensive risk assessment in minutes</p>
        </div>
      </div>
      <DataCenterRequestForm />
    </div>
  );
}

function QueueUploadPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Upload Interconnection Study</h1>
          <p>Extract key metrics and auto-fill forms</p>
        </div>
      </div>
      <QueueUploadForm />
    </div>
  );
}

function AdminLeadsPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Sales Pipeline</h1>
          <p>Data Center Analysis Leads</p>
        </div>
      </div>
      <SalesLeadsDashboard backendUrl={backendUrl('')} />
    </div>
  );
}

function QueueLandingPage() {
  return <QueueLanding />;
}

function QueueMonitorPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Queue Monitor</h1>
          <p>Track your RTO queue position</p>
        </div>
      </div>
      <QueueMonitorDashboard />
    </div>
  );
}

function TranslatorPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Study Translator</h1>
          <p>Extract interconnection study metrics</p>
        </div>
      </div>
      <StudyTranslator />
    </div>
  );
}

function TimelinePage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h1>Timeline Predictor</h1>
          <p>Estimate your project energization date</p>
        </div>
      </div>
      <TimelinePredictor />
    </div>
  );
}