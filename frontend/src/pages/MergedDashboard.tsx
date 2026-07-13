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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/pricing')}
              className="text-gray-300 hover:text-white transition text-sm font-semibold"
            >
              Pricing
            </button>
            <button
              onClick={handleStartTrial}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              Sign In / Try Free
            </button>
          </div>
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

          {/* Hero Headline - Honest value prop */}
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
            Get Interconnection <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Diligence Done Fast</span>
          </h1>

          {/* Subheadline - Clear and credible */}
          <p className="text-lg text-gray-300 mb-4">
            RegGuard accelerates site diligence and interconnection application prep for data center projects. Cut weeks of research and form-drafting into days with AI-powered analysis and PJM/MISO/ERCOT focused workflows.
          </p>

          {/* Value Props as bullets - Honest, large-load focused */}
          <div className="space-y-3 mb-10 text-gray-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong>Site diligence research</strong> — Identify AHJs, interconnection process type, and preliminary requirements in hours (not weeks)</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong>Large-load worksheets</strong> — Draft interconnection application fields for PJM, MISO, ERCOT, and ISO-NE (attorney/engineer review required)</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong>Regulatory roadmap</strong> — Identify milestones, key risks, and next steps before engaging interconnection consultant</span>
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
            ✓ 14-day full access to RegGuard Agent • ✓ Includes 2 site research reports • ✓ Cancel anytime
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

      {/* ===== CORE FEATURE: AGENT ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">RegGuard Agent</h2>
          <p className="text-gray-400 mb-12">Your interconnection diligence copilot. Powered by AI research + regulatory expertise.</p>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-purple-500/50 hover:border-purple-500 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* What it does */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">What Agent Does</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Identify applicable AHJs and interconnection process</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Research preliminary interconnection requirements</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Generate project roadmap with key milestones</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Draft application worksheets (PJM, MISO, ERCOT)</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Flag regulatory risks and timelines</span>
                  </li>
                </ul>
              </div>

              {/* What it doesn't do */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">What Agent Doesn't Do</h3>
                <p className="text-gray-400 mb-4">Be clear about scope to build trust:</p>
                <ul className="space-y-3 text-gray-400">
                  <li className="flex gap-2">
                    <span className="text-red-400">✗</span>
                    <span>Guarantee timelines (RTO studies take 18–36+ months)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">✗</span>
                    <span>Execute interconnection studies (utilities do)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">✗</span>
                    <span>Serve as legal/engineering advice (use your counsel)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400">✗</span>
                    <span>Replace interconnection consultants (we accelerate intake)</span>
                  </li>
                </ul>
                <p className="text-gray-400 text-sm mt-6 italic">All recommendations require attorney/engineer review before filing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ROADMAP: COMING SOON ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">What's Coming Next</h2>
          <p className="text-gray-400 mb-8">We're building these features. Want early access?</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Study Translator */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Study Translator</h3>
                <span className="px-2 py-1 bg-blue-500/30 border border-blue-500/50 rounded text-xs font-bold text-blue-300 uppercase">Q3 2026</span>
              </div>
              <p className="text-gray-400 mb-4">Upload interconnection study PDF → AI extracts timelines, constraints, and upgrade costs. (In development)</p>
              <p className="text-sm text-gray-500">Note: Requires attorney review; AI accuracy ~70–85% on structured fields.</p>
            </div>

            {/* Queue Alerts */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Queue Alerts</h3>
                <span className="px-2 py-1 bg-purple-500/30 border border-purple-500/50 rounded text-xs font-bold text-purple-300 uppercase">Q4 2026</span>
              </div>
              <p className="text-gray-400 mb-4">Real-time alerts for RTO queue milestones (data request, study release, deposit due). (In development)</p>
              <p className="text-sm text-gray-500">Note: Integrates with PJM, MISO, ERCOT public data; no proprietary queue access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ TEASER ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <HelpCircle className="w-6 h-6" />
              Common Questions
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="font-bold text-white mb-2">What's included in the 14-day trial?</p>
                <p className="text-gray-300 text-sm">Full access to RegGuard Agent, including 2 complete site research reports with regulatory roadmaps and application worksheets.</p>
              </div>
              
              <div>
                <p className="font-bold text-white mb-2">Does RegGuard speed up RTO studies?</p>
                <p className="text-gray-300 text-sm">No. RTO interconnection studies take 18–36+ months based on utility queue depth and grid requirements. RegGuard accelerates your <strong>preparation</strong> (weeks → days), not the utility study itself. We save time before and alongside the official process.</p>
              </div>
              
              <div>
                <p className="font-bold text-white mb-2">Which RTOs does RegGuard support?</p>
                <p className="text-gray-300 text-sm">PJM, MISO, ERCOT, ISO-NE, and SPP. We focus on large-load and data center interconnection processes, not small-generator forms.</p>
              </div>
              
              <div>
                <p className="font-bold text-white mb-2">Can I rely on RegGuard recommendations for my project?</p>
                <p className="text-gray-300 text-sm">RegGuard outputs are <strong>research summaries and drafts</strong>, not legal or engineering advice. Always have your attorney, engineer, and interconnection consultant review before filing. We accelerate intake, not replace expertise.</p>
              </div>
              
              <div>
                <p className="font-bold text-white mb-2">What about pricing after trial?</p>
                <p className="text-gray-300 text-sm">
                  <strong>Pilot:</strong> $5K–15K per site research<br/>
                  <strong>Monthly:</strong> $500–2K/project (typical engagement)<br/>
                  <strong>Enterprise:</strong> $25K–75K/year for portfolio management<br/>
                  Contact our team for custom pricing on your scope.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">
            Accelerate Your Site Diligence
          </h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            RegGuard Agent gets your interconnection research and application prep done in days, not weeks. Start your 14-day trial today.
          </p>
          <button
            onClick={handleStartTrial}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 cursor-pointer mx-auto block"
          >
            Start Free Trial (14 Days)
          </button>
          <p className="text-gray-400 text-sm mt-6">Includes 2 site research reports. No credit card required.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-purple-500/10 text-center text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto mb-8 space-y-2">
          <div className="flex justify-center gap-6 flex-wrap">
            <button onClick={() => navigate('/pricing')} className="text-purple-400 hover:text-purple-300 transition">Pricing</button>
            <button onClick={() => navigate('/methodology')} className="text-purple-400 hover:text-purple-300 transition">How It Works</button>
            <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300 transition">Contact</a>
          </div>
          <p className="text-xs">
            RegGuard © 2026 • Accelerating data center interconnection diligence • 
            <a href="#" className="text-purple-400 hover:text-purple-300 ml-2">Privacy</a> • 
            <a href="#" className="text-purple-400 hover:text-purple-300 ml-2">Terms</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PlatformDashboard;
