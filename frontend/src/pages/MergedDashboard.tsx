/**
 * RegGuard Platform Dashboard - Merged Design
 * Targets: Data Center Contractors Who Hate Red Tape
 * Value Prop: "Cut Through Red Tape. Get Permits 10x Faster."
 */

import { useEffect, useState } from 'react';
import {
  Zap,
  Clock,
  MapPin,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Zap as Lightning,
  Shield,
  FileText,
  Users,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { backendUrl } from '../env';

interface DashboardStats {
  projectsAnalyzed: number;
  averageTimeSaved: string;
  complianceRate: number;
  jurisdictionsCovered: number;
}

export function PlatformDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    projectsAnalyzed: 1204,
    averageTimeSaved: '47%',
    complianceRate: 90,
    jurisdictionsCovered: 50,
  });

  const [selectedTab, setSelectedTab] = useState<'datacenter' | 'all'>('datacenter');

  useEffect(() => {
    // Fetch real stats from backend
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const url = backendUrl('/roi-stats');
      console.log('Fetching stats from:', url);
      const response = await axios.get(url, { timeout: 5000 });
      console.log('Stats response:', response.data);
      if (response.data && typeof response.data === 'object') {
        setStats(prevStats => ({
          ...prevStats,
          ...response.data
        }));
      }
    } catch (error) {
      console.log('Stats unavailable, using defaults', error);
      // Silently fail - use default stats
    }
  };

  // === PRIMARY: Data Center Pain Points & Solutions ===
  const dataCenterSolutions = [
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Beat the Timeline',
      subtitle: 'From 18 months to 90 days',
      description: 'Skip the back-and-forth. AI generates compliant interconnection studies automatically.',
      cta: 'Analyze Project',
      color: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-500/30',
      ctaColor: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: 'No More Surprises',
      subtitle: 'Catch compliance issues before submission',
      description: 'Real-time regulatory alerts across 50+ jurisdictions. Know your roadblocks before regulators do.',
      cta: 'Check Compliance',
      color: 'from-orange-500/20 to-red-500/20',
      borderColor: 'border-orange-500/30',
      ctaColor: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Forms Auto-Fill',
      subtitle: 'Your data, not their forms',
      description: 'FERC 556, PJM, MISO, NERC... all pre-populated. No more manual data entry hell.',
      cta: 'Upload Study',
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/30',
      ctaColor: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Know the Cost Upfront',
      subtitle: 'No hidden interconnection fees',
      description: 'Capital readiness modeling shows exact costs before you commit. Plan your budget with confidence.',
      cta: 'Model Costs',
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-500/30',
      ctaColor: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  // === SECONDARY: Other Platform Features ===
  const platformFeatures = [
    { icon: <Users className="w-5 h-5" />, title: 'Contractor Queue', desc: 'Track 10x faster' },
    { icon: <Shield className="w-5 h-5" />, title: 'Compliance Guaranteed', desc: '90%+ pass rate' },
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Analytics Dashboard', desc: '1,000+ projects' },
    { icon: <Zap className="w-5 h-5" />, title: 'Instant Research', desc: 'Fed, state, local regs' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27]">
      {/* ===== HERO/VALUE SECTION ===== */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Main Hero Card */}
          <div className="bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-indigo-900/30 border border-indigo-500/30 rounded-2xl p-8 mb-8 overflow-hidden relative">
            {/* Decorative gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                <Lightning className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-semibold text-indigo-300">Data Center Interconnection</span>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                    Cut Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Red Tape</span>
                  </h1>
                  <p className="text-lg text-gray-300 mb-6">
                    Interconnection studies that would take 18 months? We do them in 90 days. Auto-generate compliant permits for 50+ jurisdictions. No more waiting. No more guessing.
                  </p>
                  <div className="flex gap-3">
                    <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-lg transition flex items-center gap-2">
                      Start Analysis <ArrowRight className="w-4 h-4" />
                    </button>
                    <button className="px-6 py-3 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 font-semibold rounded-lg transition">
                      Watch Demo
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-400 mb-1">{stats.averageTimeSaved}</div>
                    <div className="text-sm text-gray-400">Faster Permitting</div>
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                    <div className="text-3xl font-bold text-indigo-400 mb-1">{stats.projectsAnalyzed.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Projects Analyzed</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-400 mb-1">{stats.complianceRate}%</div>
                    <div className="text-sm text-gray-400">Compliance Rate</div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <div className="text-3xl font-bold text-emerald-400 mb-1">{stats.jurisdictionsCovered}+</div>
                    <div className="text-sm text-gray-400">Jurisdictions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setSelectedTab('datacenter')}
              className={`px-6 py-2 font-semibold rounded-lg transition ${
                selectedTab === 'datacenter'
                  ? 'bg-indigo-500/30 border border-indigo-400 text-indigo-300'
                  : 'bg-indigo-900/20 border border-indigo-500/20 text-gray-400 hover:text-indigo-300'
              }`}
            >
              🔌 Data Center Solutions
            </button>
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-6 py-2 font-semibold rounded-lg transition ${
                selectedTab === 'all'
                  ? 'bg-indigo-500/30 border border-indigo-400 text-indigo-300'
                  : 'bg-indigo-900/20 border border-indigo-500/20 text-gray-400 hover:text-indigo-300'
              }`}
            >
              ⚙️ All Features
            </button>
          </div>
        </div>
      </section>

      {/* ===== SOLUTIONS GRID ===== */}
      {selectedTab === 'datacenter' && (
        <section className="px-4 py-12 sm:px-6 lg:px-8 bg-indigo-500/5 border-t border-b border-indigo-500/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-2">What Contractors Love</h2>
            <p className="text-gray-400 mb-8">Stop fighting bureaucracy. Let AI handle compliance.</p>

            <div className="grid md:grid-cols-2 gap-6">
              {dataCenterSolutions.map((solution, idx) => (
                <div
                  key={idx}
                  className={`group relative bg-gradient-to-br ${solution.color} border ${solution.borderColor} rounded-xl p-8 transition hover:border-opacity-80 hover:shadow-lg hover:shadow-indigo-500/10`}
                >
                  {/* Icon */}
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-4 text-white group-hover:bg-white/20 transition">
                    {solution.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-1">{solution.title}</h3>
                  <p className="text-sm font-semibold text-green-400 mb-3">{solution.subtitle}</p>
                  <p className="text-gray-300 text-sm mb-6">{solution.description}</p>

                  {/* CTA Button */}
                  <button
                    className={`w-full ${solution.ctaColor} text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2`}
                  >
                    {solution.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Trust Section */}
            <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-6">
                <Shield className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <h4 className="font-bold text-white mb-2">Enterprise Security</h4>
                <p className="text-sm text-gray-400">SOC 2 Type II. Your data is safe.</p>
              </div>
              <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-6">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h4 className="font-bold text-white mb-2">Compliance Guaranteed</h4>
                <p className="text-sm text-gray-400">90%+ audit pass rate guaranteed.</p>
              </div>
              <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-6">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h4 className="font-bold text-white mb-2">Expert Support</h4>
                <p className="text-sm text-gray-400">Dedicated compliance team. Always here.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== ALL FEATURES ===== */}
      {selectedTab === 'all' && (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">Your Complete Interconnection Command Center</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {platformFeatures.map((feature, idx) => (
                <div key={idx} className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-6 hover:bg-indigo-900/30 transition cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="text-indigo-400 mt-1">{feature.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm mb-1">{feature.title}</h4>
                      <p className="text-gray-400 text-xs">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coming Soon Features */}
            <div className="mt-12">
              <h3 className="text-xl font-bold text-white mb-4">🚀 Coming Soon</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 opacity-60">
                  <h4 className="font-bold text-white mb-2">Capital Modeling</h4>
                  <p className="text-sm text-gray-400">Exact interconnection costs, no surprises</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 opacity-60">
                  <h4 className="font-bold text-white mb-2">BIM Integration</h4>
                  <p className="text-sm text-gray-400">Extract specs directly from Revit</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 opacity-60">
                  <h4 className="font-bold text-white mb-2">Utility API</h4>
                  <p className="text-sm text-gray-400">Real-time utility coordination</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA FOOTER ===== */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 border-t border-indigo-500/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Skip the Red Tape?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            First 14 days free. No credit card required. Just your project details.
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-lg transition shadow-lg shadow-indigo-500/20">
            Start Free Trial Now
          </button>
        </div>
      </section>
    </div>
  );
}

export default function PlatformDashboardWrapper() {
  try {
    return <PlatformDashboard />;
  } catch (error) {
    console.error('Dashboard Error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Dashboard Loading Error</h1>
          <p className="text-gray-300">{String(error)}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
