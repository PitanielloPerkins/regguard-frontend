/**
 * RegGuard Platform Dashboard - Professional Design
 * Targets: Data Center Contractors Who Hate Red Tape
 * Styling: Premium SaaS with contractor-focused messaging
 * Tailwind CSS: Configured and enabled ✅
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  BookOpen,
  Gauge,
  CheckCircle,
  ArrowRight,
  Play,
} from 'lucide-react';
import axios from 'axios';
import { backendUrl } from '../env';

interface DashboardStats {
  formsCompleted?: number;
  queuePositions?: number;
  projectsAnalyzed?: number;
}

export function PlatformDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    formsCompleted: 0,
    queuePositions: 0,
    projectsAnalyzed: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const url = backendUrl('/roi-stats');
      const response = await axios.get(url, { timeout: 5000 });
      if (response.data && typeof response.data === 'object') {
        setStats(prevStats => ({
          ...prevStats,
          ...response.data
        }));
      }
    } catch (error) {
      console.log('Stats unavailable, using defaults');
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'RegGuard Agent',
      badge: 'CORE',
      description: 'Autonomous domain orchestration framework for analyzing regulatory requirements and compliance data',
      cta: 'Get Started',
      color: 'blue',
    },
    {
      icon: Zap,
      title: 'Queue Center',
      badge: 'NEW',
      description: 'Auto-fill FERC 556/557, PJM NextGen, and MISO forms. Manage RTO queues 10x faster with AI',
      cta: 'Get Started',
      color: 'purple',
    },
    {
      icon: BookOpen,
      title: 'Study Translator',
      badge: '',
      description: 'Extract key metrics, timelines, and constraints from interconnection study PDFs automatically',
      cta: 'Get Started',
      color: 'green',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-600',
      gradient: 'from-blue-600 to-blue-400',
      text: 'text-blue-400',
    },
    purple: {
      bg: 'bg-purple-600',
      gradient: 'from-purple-600 to-purple-400',
      text: 'text-purple-400',
    },
    green: {
      bg: 'bg-emerald-600',
      gradient: 'from-emerald-600 to-emerald-400',
      text: 'text-emerald-400',
    },
  };

  // Button handlers
  const handleStartAnalysis = () => {
    navigate('/data-center');
  };

  const handleVoiceCommands = () => {
    // Trigger the voice command system (global listener is already active)
    // Just log to confirm it's being called
    console.log('🎙️ Voice Commands activated - speak now!');
    alert('🎙️ Listening... Try saying: "help", "research", or "analyze"');
  };

  const handleStartTrial = () => {
    // Navigate to Stripe checkout/signup page
    navigate('/signup');
  };

  const handleFeatureClick = (title: string) => {
    if (title === 'RegGuard Agent') {
      navigate('/agent');
    } else if (title === 'Queue Center') {
      navigate('/queue');
    } else if (title === 'Study Translator') {
      navigate('/queue/translator');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* ===== HERO SECTION ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero Card */}
          <div className="bg-gradient-to-br from-slate-800/50 via-purple-800/30 to-slate-800/50 border border-purple-500/20 rounded-3xl p-12 mb-16 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 pointer-events-none"></div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-purple-500/30 border border-purple-500/50 rounded-full">
                <Zap className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">Data Center Interconnection</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Cut Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Red Tape</span>
              </h1>
              
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Interconnection studies that would take 18 months? We do them in 90 days. Auto-generate compliant permits for 50+ jurisdictions. No more waiting. No more guessing.
              </p>

              <button 
                onClick={handleStartAnalysis}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 cursor-pointer"
              >
                <Play className="w-5 h-5" />
                Start Analysis Now
              </button>
            </div>
          </div>

          {/* Stats Grid - Only show if we have real data */}
          {(stats.formsCompleted || stats.queuePositions || stats.projectsAnalyzed) && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Forms Completed */}
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-500/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">Forms Completed</p>
                  <div className="text-4xl font-black text-blue-300">{stats.formsCompleted?.toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Queue Positions */}
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8 hover:border-purple-500/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Queue Positions Tracked</p>
                  <div className="text-4xl font-black text-purple-300">{stats.queuePositions?.toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-500/30 flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Projects Analyzed */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-8 hover:border-emerald-500/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">Projects Analyzed</p>
                  <div className="text-4xl font-black text-emerald-300">{stats.projectsAnalyzed?.toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-2">Platform Features</h2>
          <p className="text-gray-400 mb-12 text-lg">Choose your starting point</p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              const colors = colorClasses[feature.color as keyof typeof colorClasses];
              return (
                <div
                  key={idx}
                  className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-8 transition hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-full"
                >
                  {/* Badge */}
                  {feature.badge && (
                    <div className="inline-block mb-6 px-3 py-1 bg-blue-500/30 border border-blue-500/50 rounded-full text-xs font-bold text-blue-300 uppercase tracking-wider w-fit">
                      {feature.badge}
                    </div>
                  )}

                  {/* Icon Circle */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl font-black text-white mb-4 h-14 flex items-start">{feature.title}</h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed flex-grow">{feature.description}</p>

                  {/* CTA Link */}
                  <button 
                    onClick={() => handleFeatureClick(feature.title)}
                    className={`inline-flex items-center gap-2 text-sm font-bold ${colors.text} hover:opacity-80 transition mt-auto cursor-pointer`}
                  >
                    {feature.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Voice Commands CTA */}
          <div className="bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/30 border border-purple-500/30 rounded-2xl p-8 flex items-center justify-between hover:border-purple-500/50 transition">
            <div>
              <h3 className="text-2xl font-black text-white mb-2">Try Voice Commands</h3>
              <p className="text-gray-300 text-lg">Use natural voice to navigate, submit forms, and analyze data hands-free</p>
            </div>
            <button 
              onClick={handleVoiceCommands}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              🎙️ Voice Commands
            </button>
          </div>
        </div>
      </section>

      {/* ===== CTA FOOTER ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">Ready to Skip the Red Tape?</h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            Join 1,200+ contractors cutting permitting timelines from 18 months to 90 days. Start your free trial today—no credit card required.
          </p>
          <button 
            onClick={handleStartTrial}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 cursor-pointer"
          >
            Start Free Trial (14 Days)
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center text-white max-w-md">
          <h1 className="text-4xl font-black mb-4">Dashboard Loading Error</h1>
          <p className="text-gray-300 mb-8">{String(error)}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
