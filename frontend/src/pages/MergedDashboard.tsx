/**
 * RegGuard Platform Dashboard - Merged Design
 * Targets: Data Center Contractors Who Hate Red Tape
 * Value Prop: "Cut Through Red Tape. Get Permits 10x Faster."
 * Design: Original layout + color scheme + new contractor messaging
 */

import { useEffect, useState } from 'react';
import {
  Shield,
  Zap,
  BookOpen,
  Gauge,
  Database,
  Users,
  Play,
  ArrowRight,
} from 'lucide-react';
import axios from 'axios';
import { backendUrl } from '../env';

interface DashboardStats {
  projectsAnalyzed: number;
  averageTimeSaved: string;
  complianceRate: number;
  jurisdictionsCovered: number;
  formsCompleted?: number;
  queuePositions?: number;
}

export function PlatformDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    projectsAnalyzed: 1204,
    averageTimeSaved: '47%',
    complianceRate: 90,
    jurisdictionsCovered: 50,
    formsCompleted: 10247,
    queuePositions: 3891,
  });

  useEffect(() => {
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
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'RegGuard Agent',
      subtitle: 'CORE',
      description: 'Autonomous domain orchestration framework for analyzing regulatory requirements and compliance data',
      cta: 'Get Started',
      color: 'from-blue-600 to-blue-400',
    },
    {
      icon: Zap,
      title: 'Queue Center',
      subtitle: 'NEW',
      description: 'Auto-fill FERC 556/557, PJM NextGen, and MISO forms. Manage RTO queues 10x faster with AI',
      cta: 'Get Started',
      color: 'from-purple-600 to-purple-400',
    },
    {
      icon: BookOpen,
      title: 'Study Translator',
      subtitle: '',
      description: 'Extract key metrics, timelines, and constraints from interconnection study PDFs automatically',
      cta: 'Get Started',
      color: 'from-green-600 to-green-400',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero Card */}
          <div className="bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-blue-600/30 border border-purple-500/30 rounded-3xl p-12 mb-12 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full">
                <Zap className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-semibold text-purple-300">Data Center Interconnection</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
                Cut Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Red Tape</span>
              </h1>
              
              <p className="text-xl text-gray-200 max-w-3xl mb-8">
                Interconnection studies that would take 18 months? We do them in 90 days. Auto-generate compliant permits for 50+ jurisdictions. No more waiting. No more guessing.
              </p>

              <button className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg">
                <Play className="w-5 h-5" />
                Start Analysis Now
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-400/10 border border-blue-500/30 rounded-xl p-6">
              <div className="text-4xl font-bold text-blue-300 mb-2">{stats.formsCompleted?.toLocaleString()}</div>
              <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Forms Completed</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-400/10 border border-purple-500/30 rounded-xl p-6">
              <div className="text-4xl font-bold text-purple-300 mb-2">{stats.queuePositions?.toLocaleString()}</div>
              <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Queue Positions Tracked</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 rounded-xl p-6">
              <div className="text-4xl font-bold text-emerald-300 mb-2">{stats.projectsAnalyzed?.toLocaleString()}</div>
              <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Projects Analyzed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 bg-purple-500/5 border-t border-b border-purple-500/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-2">Platform Features</h2>
          <p className="text-gray-300 mb-12">Choose your starting point</p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-8 transition hover:shadow-xl hover:shadow-purple-500/10"
                >
                  {/* Subtitle Badge */}
                  {feature.subtitle && (
                    <div className="inline-block mb-4 px-3 py-1 bg-purple-500/30 border border-purple-500/50 rounded-full text-xs font-bold text-purple-300 uppercase tracking-wider">
                      {feature.subtitle}
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">{feature.description}</p>

                  {/* CTA */}
                  <button className={`inline-flex items-center gap-2 text-sm font-semibold text-${feature.color.split('-')[1]}-400 hover:text-${feature.color.split('-')[1]}-300 transition`}>
                    {feature.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Voice Commands Highlight */}
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-8 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Try Voice Commands</h3>
              <p className="text-gray-300">Use natural voice to navigate, submit forms, and analyze data hands-free</p>
            </div>
            <button className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg transition flex items-center gap-2 whitespace-nowrap">
              🎙️ Voice Commands
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Skip the Red Tape?</h2>
          <p className="text-lg text-gray-300 mb-8">
            Join 1,200+ contractors who are cutting permitting timelines from 18 months to 90 days. Start your free trial today.
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-lg transition shadow-lg shadow-purple-500/30">
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
