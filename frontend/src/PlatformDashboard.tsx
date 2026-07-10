import { Link } from 'react-router-dom';
import {
  Zap,
  Database,
  BookOpen,
  Gauge,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Shield,
  Compass,
} from 'lucide-react';
import './PlatformDashboard.css';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    id: 'agent',
    name: 'RegGuard Agent',
    description:
      'Autonomous domain orchestration framework for gathering regulatory intelligence and compliance data',
    icon: <Shield size={24} />,
    path: '/agent',
    badge: 'Core',
    color: 'blue',
  },
  {
    id: 'queue',
    name: 'Queue Center',
    description:
      'Auto-fill FERC 556/557, PJM NextGen, and MISO forms. Manage your RTO queue 10x faster with AI',
    icon: <Zap size={24} />,
    path: '/queue',
    badge: 'New',
    color: 'purple',
  },
  {
    id: 'translator',
    name: 'Study Translator',
    description: 'Extract key metrics, timelines, and constraints from interconnection study PDFs automatically',
    icon: <BookOpen size={24} />,
    path: '/queue/translator',
    color: 'green',
  },
  {
    id: 'timeline',
    name: 'Timeline Predictor',
    description: 'Predict your project energization date based on RTO, capacity, and queue position',
    icon: <Gauge size={24} />,
    path: '/queue/timeline',
    color: 'orange',
  },
  {
    id: 'monitor',
    name: 'Queue Monitor',
    description: 'Track real-time RTO queue positions and receive alerts on key milestones',
    icon: <TrendingUp size={24} />,
    path: '/queue/monitor',
    color: 'red',
  },
  {
    id: 'data-center',
    name: 'Data Center Analysis',
    description: 'Get comprehensive permitting risk assessments for your data center projects in minutes',
    icon: <Database size={24} />,
    path: '/data-center',
    badge: 'B2B',
    color: 'indigo',
  },
];

export function PlatformDashboard() {
  return (
    <div className="platform-dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Unified Compliance Platform</span>
          </div>
          <h1>Welcome to RegGuard Platform</h1>
          <p>
            Agentic compliance intelligence for contractors. Auto-fill forms, track RTO queues,
            analyze permitting requirements—all in one place.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe' }}>
            <Zap size={20} style={{ color: '#0284c7' }} />
          </div>
          <div>
            <p className="stat-label">Forms Completed</p>
            <p className="stat-value">10,247</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <TrendingUp size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className="stat-label">Queue Positions Tracked</p>
            <p className="stat-value">3,891</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ddd6fe' }}>
            <Database size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <p className="stat-label">Projects Analyzed</p>
            <p className="stat-value">1,204</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Platform Features</h2>
          <p>Choose your starting point</p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <Link
              key={feature.id}
              to={feature.path}
              className={`feature-card color-${feature.color}`}
            >
              <div className="feature-header">
                <div className="feature-icon">{feature.icon}</div>
                {feature.badge && (
                  <span className={`feature-badge badge-${feature.color}`}>
                    {feature.badge}
                  </span>
                )}
              </div>

              <div className="feature-content">
                <h3>{feature.name}</h3>
                <p>{feature.description}</p>
              </div>

              <div className="feature-footer">
                <div className="feature-link">
                  Get Started
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Integration Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Connected Integrations</h2>
          <p>Seamlessly integrated with your workflow</p>
        </div>

        <div className="integrations-grid">
          <div className="integration-item">
            <div className="integration-icon">
              <Compass size={20} />
            </div>
            <h4>FERC, PJM, MISO</h4>
            <p>Direct form generation and submission</p>
          </div>
          <div className="integration-item">
            <div className="integration-icon">
              <Database size={20} />
            </div>
            <h4>RTO Databases</h4>
            <p>Real-time queue tracking and monitoring</p>
          </div>
          <div className="integration-item">
            <div className="integration-icon">
              <Shield size={20} />
            </div>
            <h4>Regulatory Data</h4>
            <p>Up-to-date compliance requirements</p>
          </div>
          <div className="integration-item">
            <div className="integration-icon">
              <Sparkles size={20} />
            </div>
            <h4>AI Intelligence</h4>
            <p>Powered by agentic compliance AI</p>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="dashboard-section">
        <div className="cta-card">
          <div className="cta-content">
            <h3>New to RegGuard? Get Started in 3 Steps</h3>
            <ol className="cta-steps">
              <li>
                <span className="step-number">1</span>
                <div>
                  <strong>Explore the Agent</strong>
                  <p>Start with RegGuard Agent to gather compliance data</p>
                </div>
              </li>
              <li>
                <span className="step-number">2</span>
                <div>
                  <strong>Fill Your Forms</strong>
                  <p>Use Queue Center to auto-fill FERC forms in seconds</p>
                </div>
              </li>
              <li>
                <span className="step-number">3</span>
                <div>
                  <strong>Track & Monitor</strong>
                  <p>Monitor your RTO queue and get timeline predictions</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
