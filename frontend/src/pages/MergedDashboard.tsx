/**
 * RegGuard Landing Page - Site Diligence Reports
 * Positioning: AI-accelerated regulatory + interconnection intake for data center developers
 * Price: $15K first report + $20K/year (Hybrid model)
 */

import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export function PlatformDashboard() {
  const navigate = useNavigate();

  const handleOrderReport = () => {
    navigate('/pricing');
  };

  const handleDemo = () => {
    window.open('https://calendly.com/regguard/demo', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* ===== HEADER ===== */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black text-white">RegGuard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/methodology')}
              className="text-gray-300 hover:text-white transition text-sm font-semibold"
            >
              How It Works
            </button>
            <button
              onClick={handleOrderReport}
              className="text-gray-300 hover:text-white transition text-sm font-semibold"
            >
              Pricing
            </button>
            <button
              onClick={handleOrderReport}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              Order Report
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Category Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-purple-500/30 border border-purple-500/50 rounded-full">
            <Shield className="w-4 h-4 text-purple-300" />
            <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">
              Site Diligence Intelligence
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Data center site diligence in <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">48 hours</span>,<br />not 6 weeks
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-gray-300 mb-6">
            RegGuard produces cited regulatory research memos, moratorium intelligence, and draft RTO interconnection worksheets (PJM, MISO, ERCOT, ISO-NE) for developers screening data center sites. Know if a parcel is viable before spending $100K on interconnection counsel.
          </p>

          {/* Value Props */}
          <div className="space-y-3 mb-12 text-gray-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong>Regulatory research</strong> — AHJ requirements, interconnection process, moratorium risk in 48 hours</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong>RTO worksheets</strong> — Draft FERC 556/557, PJM, MISO application fields ready for counsel review</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong>Cited sources</strong> — Every finding linked to public sources (FERC, RTO tariffs, state law, utility guides)</span>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={handleOrderReport}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 cursor-pointer flex items-center justify-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              Order Site Diligence Report — $15,000
            </button>
            <button
              onClick={handleDemo}
              className="px-8 py-4 border border-purple-500/50 hover:border-purple-500 text-white font-bold text-lg rounded-xl transition bg-slate-900/50 hover:bg-slate-900 cursor-pointer"
            >
              Schedule Demo
            </button>
          </div>

          {/* Subtext */}
          <p className="text-gray-400 text-sm">
            <strong>$15,000</strong> per site report (includes full research memo + RTO worksheets)<br />
            <strong>$20,000/year</strong> monitoring (includes 2–3 additional reports + quarterly regulatory updates)<br />
            <strong>Enterprise pricing</strong> available for PE portfolios and IC consulting firms
          </p>
        </div>
      </section>

      {/* ===== THE GAP SECTION ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">The Problem RegGuard Solves</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Current approach */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
                Without RegGuard
              </h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Hire law firm for diligence: <strong>$75K–$150K</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Wait 2–4 weeks for research memo</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Bad site discovered mid-diligence = <strong>$2M–$5M sunk</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>No standardized RTO worksheet template</span>
                </li>
              </ul>
            </div>

            {/* Right: RegGuard approach */}
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                With RegGuard
              </h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex gap-3">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>Site diligence report: <strong>$15,000</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>Delivered in <strong>48 hours</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>Kill bad sites early = <strong>save $2M–$5M</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>Draft RTO worksheets + regulatory roadmap included</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ROI SECTION ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">ROI Pays for Itself Immediately</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-3xl font-black text-white mb-2">48 hrs</p>
              <p className="text-gray-400">vs. 2–4 weeks with law firm</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8 text-center">
              <DollarSign className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-3xl font-black text-white mb-2">$135K saved</p>
              <p className="text-gray-400">$150K counsel vs. $15K RegGuard</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8 text-center">
              <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-3xl font-black text-white mb-2">1 bad site</p>
              <p className="text-gray-400">= $5M saved (kills dead deals early)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT'S INCLUDED ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">What's Included in Every Report</h2>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8 space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Regulatory Research Memo (8–12 pages)</h3>
                <p className="text-gray-400">AHJ identification, interconnection process map, moratorium/political risk flags, FERC/RTO compliance checklist, state-specific requirements</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">RTO Application Worksheets (Drafts)</h3>
                <p className="text-gray-400">Pre-filled FERC 556/557, PJM, MISO, or ERCOT large-load fields based on your project. Ready for counsel/engineer review before filing.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Cited Sources</h3>
                <p className="text-gray-400">Every finding linked to public sources (FERC orders, RTO tariffs, state law, utility guides, legislative tracking). Auditable trail for lenders/investors.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Action Items & Milestones</h3>
                <p className="text-gray-400">Next steps, typical timeline, key decision points, and items for your IC consultant or legal team.</p>
              </div>
            </div>
          </div>

          {/* Important disclaimer */}
          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-gray-300 text-sm">
              <strong>Important:</strong> RegGuard reports are research summaries and draft worksheets designed to accelerate intake and preliminary diligence. 
              They are not legal advice, engineering advice, or guarantees. Have your attorney, engineer, and interconnection consultant review before filing with RTOs or utilities.
            </p>
          </div>
        </div>
      </section>

      {/* ===== CTA FOOTER ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">Get Site Diligence in 48 Hours</h2>
          <p className="text-gray-300 mb-10 text-lg">
            Order a RegGuard Site Diligence Report for your next parcel. Kill bad sites early. Start your first report today.
          </p>
          <button
            onClick={handleOrderReport}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 cursor-pointer mx-auto block"
          >
            Order Report — $15,000
          </button>
          <p className="text-gray-400 text-sm mt-6">
            Questions? Email <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300">hello@regguard.com</a> or <button onClick={handleDemo} className="text-purple-400 hover:text-purple-300 underline">schedule a demo</button>
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-purple-500/10 text-center text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto mb-8 space-y-2">
          <div className="flex justify-center gap-6 flex-wrap">
            <button onClick={handleOrderReport} className="text-purple-400 hover:text-purple-300 transition">Pricing</button>
            <button onClick={() => navigate('/methodology')} className="text-purple-400 hover:text-purple-300 transition">How It Works</button>
            <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300 transition">Contact</a>
          </div>
          <p className="text-xs">
            RegGuard © 2026 • AI site diligence for data center developers • 
            <a href="#" className="text-purple-400 hover:text-purple-300 ml-2">Privacy</a> • 
            <a href="#" className="text-purple-400 hover:text-purple-300 ml-2">Terms</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PlatformDashboard;
