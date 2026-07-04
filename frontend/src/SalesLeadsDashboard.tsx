import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, TrendingUp, MapPin, Zap, Users } from 'lucide-react';
import './sales-leads-dashboard.css';

interface Lead {
  id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  company_name: string;
  role: string;
  project_address: string;
  project_city: string;
  project_state: string;
  projected_mw: number;
  risk_score: number;
  risk_level: string;
  estimated_timeline_months: number;
  status: string;
  created_at: string;
}

interface SalesLeadsDashboardProps {
  backendUrl?: string;
}

export function SalesLeadsDashboard({ backendUrl: baseUrl }: SalesLeadsDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'low' | 'medium' | 'high'>('all');

  const backendUrl = baseUrl || 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/api/data-center-analysis/leads`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leads (HTTP ${response.status})`);
      }
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch leads';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (filter === 'all') return true;
    if (filter === 'new') return lead.status === 'new';
    if (filter === 'low') return lead.risk_level === 'low';
    if (filter === 'medium') return lead.risk_level === 'medium';
    if (filter === 'high') return lead.risk_level === 'high';
    return true;
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return '#22c55e';
      case 'medium':
        return '#eab308';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'low':
        return '#dcfce7';
      case 'medium':
        return '#fef3c7';
      case 'high':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    highRisk: leads.filter(l => l.risk_level === 'high').length,
    avgMW: Math.round(leads.reduce((sum, l) => sum + (l.projected_mw || 0), 0) / Math.max(leads.length, 1)),
  };

  if (loading) {
    return (
      <div className="leads-dashboard">
        <div className="leads-loading">
          <Loader2 size={48} className="spinner" />
          <p>Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leads-dashboard">
      <div className="leads-header">
        <h1>Data Center Sales Pipeline</h1>
        <button onClick={fetchLeads} className="leads-refresh-btn">
          ⟳ Refresh
        </button>
      </div>

      {error && (
        <div className="leads-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="leads-stats">
        <div className="stat-card">
          <Users size={24} />
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Leads</div>
          </div>
        </div>

        <div className="stat-card">
          <Zap size={24} />
          <div>
            <div className="stat-value">{stats.new}</div>
            <div className="stat-label">New Leads</div>
          </div>
        </div>

        <div className="stat-card">
          <TrendingUp size={24} />
          <div>
            <div className="stat-value">{stats.highRisk}</div>
            <div className="stat-label">High Risk</div>
          </div>
        </div>

        <div className="stat-card">
          <MapPin size={24} />
          <div>
            <div className="stat-value">{stats.avgMW} MW</div>
            <div className="stat-label">Avg Project Size</div>
          </div>
        </div>
      </div>

      <div className="leads-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({leads.length})
        </button>
        <button
          className={`filter-btn ${filter === 'new' ? 'active' : ''}`}
          onClick={() => setFilter('new')}
        >
          New ({leads.filter(l => l.status === 'new').length})
        </button>
        <button
          className={`filter-btn ${filter === 'low' ? 'active' : ''}`}
          onClick={() => setFilter('low')}
          style={{ borderColor: '#22c55e' }}
        >
          Low Risk ({leads.filter(l => l.risk_level === 'low').length})
        </button>
        <button
          className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
          onClick={() => setFilter('medium')}
          style={{ borderColor: '#eab308' }}
        >
          Medium ({leads.filter(l => l.risk_level === 'medium').length})
        </button>
        <button
          className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
          style={{ borderColor: '#ef4444' }}
        >
          High Risk ({leads.filter(l => l.risk_level === 'high').length})
        </button>
      </div>

      <div className="leads-table-container">
        {filteredLeads.length === 0 ? (
          <div className="leads-empty">
            <p>No leads found</p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Project</th>
                <th>Size (MW)</th>
                <th>Risk</th>
                <th>Timeline</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr key={lead.id}>
                  <td className="company-cell">
                    <div className="company-info">
                      <div className="company-name">{lead.company_name}</div>
                      <div className="company-role">{lead.role}</div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div>{lead.requester_name}</div>
                      <div className="contact-email">{lead.requester_email}</div>
                    </div>
                  </td>
                  <td>
                    <div className="project-info">
                      <div>{lead.project_address}</div>
                      <div className="project-location">
                        {lead.project_city}, {lead.project_state}
                      </div>
                    </div>
                  </td>
                  <td className="mw-cell">{lead.projected_mw}</td>
                  <td>
                    <div
                      className="risk-badge"
                      style={{
                        color: getRiskColor(lead.risk_level),
                        backgroundColor: getRiskBgColor(lead.risk_level),
                      }}
                    >
                      {lead.risk_score}/100
                      <br />
                      <span style={{ fontSize: '12px' }}>
                        ({lead.risk_level?.toUpperCase() || 'N/A'})
                      </span>
                    </div>
                  </td>
                  <td className="timeline-cell">{lead.estimated_timeline_months} mo</td>
                  <td>
                    <div className="status-badge">
                      {lead.status === 'new' && '🆕 New'}
                      {lead.status === 'contacted' && '📞 Contacted'}
                      {lead.status === 'analysis_sent' && '📧 Sent'}
                      {lead.status === 'qualified' && '✅ Qualified'}
                      {lead.status === 'converted' && '🎉 Converted'}
                    </div>
                  </td>
                  <td className="date-cell">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
