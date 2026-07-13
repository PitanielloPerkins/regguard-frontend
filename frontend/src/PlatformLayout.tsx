import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Zap,
  Database,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Gauge,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import './platform-layout.css';

export interface PlatformUser {
  id?: string;
  name?: string;
  email?: string;
  tier?: 'free' | 'pro' | 'enterprise';
}

interface PlatformLayoutProps {
  children: React.ReactNode;
  user?: PlatformUser;
  onLogout?: () => void;
}

const PLATFORM_ROUTES = [
  {
    name: 'Home',
    path: '/',
    icon: Home,
    category: 'Main',
    description: 'RegGuard Agent - Compliance Intelligence',
  },
  {
    name: 'Queue Center',
    path: '/queue',
    icon: Zap,
    category: 'Interconnection',
    description: 'Auto-fill FERC forms & manage RTO queues',
  },
  {
    name: 'Form Upload',
    path: '/queue/upload',
    icon: BookOpen,
    category: 'Interconnection',
    description: 'Upload interconnection studies',
  },
  {
    name: 'Queue Monitor',
    path: '/queue/monitor',
    icon: Gauge,
    category: 'Interconnection',
    description: 'Track RTO queue positions',
  },
  {
    name: 'Study Translator',
    path: '/queue/translator',
    icon: BookOpen,
    category: 'Interconnection',
    description: 'Extract key study metrics',
  },
  {
    name: 'Timeline Predictor',
    path: '/queue/timeline',
    icon: Gauge,
    category: 'Interconnection',
    description: 'Estimate project timelines',
  },
  {
    name: 'Data Center Analysis',
    path: '/data-center',
    icon: Database,
    category: 'Industry',
    description: 'Permitting & compliance analysis',
  },
  {
    name: 'Sales Pipeline',
    path: '/admin/leads',
    icon: Users,
    category: 'Admin',
    description: 'Lead management & analytics',
  },
];

export function PlatformLayout({
  children,
  user,
  onLogout,
}: PlatformLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide sidebar on public marketing pages for unauthenticated users
  const isPublicPage = location.pathname === '/';
  const isAuthenticated = user?.email && user.email !== 'contractor@regguard.com'; // Default user = not authenticated
  const shouldShowSidebar = !isPublicPage || isAuthenticated;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  const routesByCategory = PLATFORM_ROUTES.reduce(
    (acc, route) => {
      if (!acc[route.category]) {
        acc[route.category] = [];
      }
      acc[route.category].push(route);
      return acc;
    },
    {} as Record<string, typeof PLATFORM_ROUTES>
  );

  return (
    <div className="platform-layout">
      {/* Mobile Hamburger */}
      <div className="mobile-menu-trigger">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="hamburger-btn"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation - Hidden on public pages for unauthenticated users */}
      {shouldShowSidebar && (
      <aside className={`platform-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="platform-logo">
            <div className="logo-mark">RG</div>
            <div className="logo-text">
              <h1>RegGuard</h1>
              <p>Platform</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sidebar-toggle"
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(routesByCategory).map(([category, routes]) => (
            <div key={category} className="nav-section">
              <div className="nav-section-title">{category}</div>
              {routes.map((route) => {
                const Icon = route.icon;
                const active = isActive(route.path);
                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`nav-item ${active ? 'active' : ''}`}
                    title={route.description}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    {sidebarOpen && (
                      <>
                        <span className="nav-label">{route.name}</span>
                        {active && (
                          <span className="nav-indicator">
                            <div className="dot" />
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user?.email && sidebarOpen && (
            <div className="user-info">
              <div className="user-avatar">
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="user-name">{user.name || 'User'}</p>
                <p className="user-email">{user.email}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main className={`platform-main ${sidebarOpen ? '' : 'full-width'}`}>
        <div className="platform-content">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
