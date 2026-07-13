/**
 * RegGuard Landing Page - Clean, focused conversion
 * Targets: Data center contractors cutting permitting delays
 * Strategy: One promise, one primary CTA, one recommended starting tool
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Play,
  HelpCircle,
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
    window.scrollTo(0, 0);
  }, []);

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

  // Button handlers
  const handleStartTrial = () => {
    window.scrollTo(0, 0);
    navigate('/signup');
  };

  const handleToolClick = (tool: string) => {
    window.scrollTo(0, 0);
    if (tool === 'agent') {
      navigate('/agent');
    } else if (tool === 'queue') {
      navigate('/queue');
    } else if (tool === 'translator') {
      navigate('/queue/translator');
    }
  };

  const handleDemo = () => {
    alert('📊 Demo feature: See how RegGuard works in 2 minutes.\n\nSchedule at: regguard.com/demo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* ===== HEADER / NAV ===== */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-xl font-black text-white">RegGuard</div>
          <button
            onClick={handleStartTrial}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg shadow-purple-500/20 cursor-pointer"
          >
            Sign In / Try Free
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Category Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-purple-500/30 border border-purple-500/50 rounded-full">
            <Zap className="w-4 h-4 text-purple-300" />
            <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">
              AI Compliance Platform
            </span>
          </div>

          {/* Hero Headline - Clear category + promise */}
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
            Cut Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Red Tape</span>
          </h1>

          {/* Subheadline - Explain what RegGuard is */}
          <p className="text-lg text-gray-300 mb-4">
            RegGuard helps data center contractors automate interconnection studies, FERC form filings, and regulatory research—turning 18-month permitting delays into 90-day projects.
          </p>

          {/* Value Props as bullets */}
          <div className="space-y-3 mb-10 text-gray-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Auto-fill FERC 556/557 forms in minutes (not weeks)</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Analyze interconnection studies faster with AI extraction</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Navigate RTO queues (PJM, MISO, ERCOT) with real-time tracking</span>
            </div>
          </div>

          {/* Primary CTA - Single, clear call to action */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartTrial}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Free Trial (14 Days)
            </button>
            <button
              onClick={handleDemo}
              className="px-8 py-4 border border-purple-500/50 hover:border-purple-500 text-white font-bold text-lg rounded-xl transition bg-slate-900/50 hover:bg-slate-900 cursor-pointer"
            >
              Watch 2-Min Demo
            </button>
          </div>

          {/* Trial Info */}
          <p className="text-gray-400 text-sm mt-6">
            ✓ No credit card required for trial • ✓ Full access to all features • ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">How RegGuard Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center mx-auto mb-4 text-white font-black text-2xl">1</div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Your Project</h3>
              <p className="text-gray-400">Enter your site details, MW capacity, and interconnection goals</p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center mx-auto mb-4 text-white font-black text-2xl">2</div>
              <h3 className="text-xl font-bold text-white mb-2">AI Analyzes Regulations</h3>
              <p className="text-gray-400">RegGuard extracts requirements from 50+ jurisdictions and RTO rules</p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center mx-auto mb-4 text-white font-black text-2xl">3</div>
              <h3 className="text-xl font-bold text-white mb-2">Generate Ready-to-File Docs</h3>
              <p className="text-gray-400">Get compliant FERC forms, permits, and risk reports ready to submit</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES / TOOLS ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">RegGuard Tools</h2>
          <p className="text-gray-400 mb-12">Start with RegGuard Agent (recommended) or pick your specific need:</p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* RegGuard Agent - CORE (recommended, larger) */}
            <div className="md:col-span-1 group">
              <button
                onClick={() => handleToolClick('agent')}
                className="w-full text-left bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-purple-500/50 hover:border-purple-500 rounded-2xl p-8 transition hover:shadow-xl hover:shadow-purple-500/20 flex flex-col h-full"
              >
                {/* Recommended ribbon */}
                <div className="inline-block mb-6 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white uppercase tracking-wider w-fit">
                  ⭐ Recommended
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-black text-white mb-4">RegGuard Agent</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed flex-grow">
                  <strong>The fastest way to start.</strong> Enter your project details and get a compliance roadmap, permit checklist, and FERC form recommendations in 5 minutes.
                </p>

                {/* CTA Link */}
                <div className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition mt-auto cursor-pointer group-hover:gap-3">
                  Start Here <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Queue Center - NEW */}
            <div className="group">
              <button
                onClick={() => handleToolClick('queue')}
                className="w-full text-left bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-8 transition hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-full"
              >
                <div className="inline-block mb-6 px-3 py-1 bg-purple-500/30 border border-purple-500/50 rounded-full text-xs font-bold text-purple-300 uppercase tracking-wider w-fit">
                  For Form Experts
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-black text-white mb-4">Queue Center</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed flex-grow">
                  Auto-fill FERC 556/557 and queue forms. Track your position in real-time. Skip manual data entry—submit in hours, not days.
                </p>

                <div className="inline-flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition mt-auto cursor-pointer group-hover:gap-3">
                  Explore <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Study Translator - PRO */}
            <div className="group">
              <button
                onClick={() => handleToolClick('translator')}
                className="w-full text-left bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-8 transition hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-full"
              >
                <div className="inline-block mb-6 px-3 py-1 bg-green-500/30 border border-green-500/50 rounded-full text-xs font-bold text-green-300 uppercase tracking-wider w-fit">
                  Pro Feature
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-black text-white mb-4">Study Translator</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed flex-grow">
                  Extract timelines, costs, and constraints from interconnection study PDFs automatically. AI-powered analysis cuts study review time in half.
                </p>

                <div className="inline-flex items-center gap-2 text-sm font-bold text-green-400 hover:text-green-300 transition mt-auto cursor-pointer group-hover:gap-3">
                  Try Now <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ TEASER ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8">
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-6 h-6" />
              Common Questions?
            </h3>
            <p className="text-gray-300 mb-6">
              <strong>Is this really "no credit card"?</strong> Yes—your 14-day trial includes full access. Card is collected at signup but won't be charged unless you choose to continue after the trial ends.
            </p>
            <p className="text-gray-300 mb-6">
              <strong>Can I use RegGuard for my specific RTO?</strong> RegGuard covers FERC, PJM, MISO, ERCOT, and ISO-NE. All major interconnection processes are supported.
            </p>
            <p className="text-gray-300">
              <strong>What happens after 14 days?</strong> We'll email you. You choose: continue ($250K per project), or cancel. No surprises.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">
            Ready to Skip 12+ Months of Delays?
          </h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            Join data center contractors accelerating interconnection timelines with RegGuard. Start your 14-day trial today.
          </p>
          <button
            onClick={handleStartTrial}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 cursor-pointer mx-auto block"
          >
            Start Free Trial (14 Days)
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-purple-500/10 text-center text-gray-400 text-sm">
        <p>RegGuard © 2026 • Compliant interconnection, faster. • <a href="#" className="text-purple-400 hover:text-purple-300">Privacy</a> • <a href="#" className="text-purple-400 hover:text-purple-300">Terms</a></p>
      </footer>
    </div>
  );
}

export default PlatformDashboard;
