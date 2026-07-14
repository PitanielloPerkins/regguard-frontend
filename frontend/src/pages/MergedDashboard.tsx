/**
 * RegGuard Landing Page — Site Diligence Reports
 * REWRITTEN using StoryBrand framework:
 * Character (contractor) → Problem (site research takes forever + costs fortune) → Guide (RegGuard accelerates) → Plan (pay $15K, get results same-day) → CTA (order) → Failure (site disasters) → Success (fast, clear, confident sites)
 */

import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  Download,
} from 'lucide-react';

export function PlatformDashboard() {
  const navigate = useNavigate();

  const handleOrderReport = () => {
    navigate('/order');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* ===== HEADER (NO HAMBURGER) ===== */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black text-white">RegGuard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/how-it-works')}
              className="text-gray-300 hover:text-white transition text-sm font-semibold"
            >
              How it works
            </button>
            <button
              onClick={handleOrderReport}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition shadow-lg shadow-green-500/20 cursor-pointer"
            >
              Order Report
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO: THE CHARACTER & PROBLEM ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Problem statement (StoryBrand: "The customer is the hero") */}
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Permitting research shouldn't take <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-300">6 weeks</span> and cost <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-300">$100K</span>
          </h1>

          {/* Subheadline: The Challenge */}
          <p className="text-lg text-gray-300 mb-10">
            You're a contractor or developer. You screen a new site. Immediately, you need to know: What are the permitting requirements? Any moratoriums? What forms do I need? Usually, this takes weeks and costs a fortune.
          </p>

          {/* The solution (what RegGuard does) */}
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-8 mb-12">
            <p className="text-xl text-white font-bold mb-4">RegGuard cuts your research time from weeks to same-day. Here's what you get:</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Research memo (PDF)</p>
                  <p className="text-gray-300 text-sm">Local permitting requirements, interconnection process, timeline, costs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Download className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Contractor punch list (PDF)</p>
                  <p className="text-gray-300 text-sm">Action items. Who to call. What to submit. Step-by-step next steps.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Download className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Permit application package (PDF)</p>
                  <p className="text-gray-300 text-sm">Forms, checklists, required docs. Ready to submit to municipalities/utilities.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA: What to do now (StoryBrand clear call) */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleOrderReport}
              className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black text-lg rounded-xl transition shadow-lg shadow-green-500/30 hover:shadow-green-500/50 cursor-pointer"
            >
              Order Report — $15,000
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className="px-10 py-4 border border-purple-500/50 hover:border-purple-500 text-white font-bold text-lg rounded-xl transition bg-slate-900/50 hover:bg-slate-900 cursor-pointer"
            >
              See how it works
            </button>
          </div>

          {/* Subtext: Instant delivery, automatic */}
          <p className="text-gray-400 text-sm mt-6">
            <strong>Reports delivered same-day.</strong> Fill out order form. Pay. Get research memo + punch list + permit package PDF instantly via email.
          </p>
        </div>
      </section>

      {/* ===== THE FAILURE: WHAT GOES WRONG WITHOUT US ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">The Cost of Slow Research:</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Scenario 1: Current path (slow) */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-8">
              <h3 className="text-lg font-bold text-white mb-6">Without RegGuard</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-red-400 text-2xl font-bold">❌</span>
                  <div>
                    <p className="font-bold text-white">Weeks of research</p>
                    <p className="text-gray-400 text-sm">You're burning capital while waiting for answers.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-400 text-2xl font-bold">❌</span>
                  <div>
                    <p className="font-bold text-white">High upfront costs</p>
                    <p className="text-gray-400 text-sm">Significant money before you know if the site works.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-400 text-2xl font-bold">❌</span>
                  <div>
                    <p className="font-bold text-white">Bad sites discovered late</p>
                    <p className="text-gray-400 text-sm">You're already deep into due diligence when you find fatal flaws.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-400 text-2xl font-bold">❌</span>
                  <div>
                    <p className="font-bold text-white">Unclear next steps</p>
                    <p className="text-gray-400 text-sm">You still have to figure out what to do with the research.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario 2: RegGuard path */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border-2 border-green-500/30 rounded-xl p-8">
              <h3 className="text-lg font-bold text-white mb-6">With RegGuard</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-green-400 text-2xl font-bold">✓</span>
                  <div>
                    <p className="font-bold text-white">Same-day answers</p>
                    <p className="text-gray-400 text-sm">From question to decision in one business day.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-400 text-2xl font-bold">✓</span>
                  <div>
                    <p className="font-bold text-white">Clear pricing</p>
                    <p className="text-gray-400 text-sm">$15K per report. No surprises. Repeatable process.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-400 text-2xl font-bold">✓</span>
                  <div>
                    <p className="font-bold text-white">Kill bad sites fast</p>
                    <p className="text-gray-400 text-sm">Discover fatal flaws early. Move on with confidence.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-400 text-2xl font-bold">✓</span>
                  <div>
                    <p className="font-bold text-white">Actionable punch list</p>
                    <p className="text-gray-400 text-sm">Not just analysis—here's exactly what you do next.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THE ROI: SUCCESS ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">One report pays for itself if it kills just one bad site.</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8 text-center">
              <p className="text-4xl font-black text-white mb-2">$15K</p>
              <p className="text-gray-400">RegGuard report</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8 text-center">
              <p className="text-4xl font-black text-white mb-2">$100K+</p>
              <p className="text-gray-400">Saved by killing one bad site early</p>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-8 text-center">
              <p className="text-4xl font-black text-white mb-2">+$85K</p>
              <p className="text-gray-400">Net ROI on first report</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OBJECTIONS: FAQ ===== */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">Common questions</h2>

          <div className="space-y-8">
            <div>
              <p className="font-bold text-white mb-2">Can I trust AI-generated research?</p>
              <p className="text-gray-400">
                Yes. Every finding is sourced: FERC orders, state laws, municipal databases. You can verify independently. Plus, your attorney should review before filing anyway—RegGuard accelerates research, your counsel makes final calls.
              </p>
            </div>

            <div>
              <p className="font-bold text-white mb-2">Why same-day instead of instant?</p>
              <p className="text-gray-400">
                Most reports generate in 5–15 minutes. "Same-day" means: we generate instantly, but hold for quality check. Want it instantly? We can do that too—just tell us in the order form.
              </p>
            </div>

            <div>
              <p className="font-bold text-white mb-2">What if I have follow-up questions?</p>
              <p className="text-gray-400">
                Email us anytime: hello@regguard.com. We answer within 24 hours. (Better yet: order multiple reports and we prioritize your account.)
              </p>
            </div>

            <div>
              <p className="font-bold text-white mb-2">What if the site is not permittable?</p>
              <p className="text-gray-400">
                Our job is to tell you. If moratoriums, zoning conflicts, or infrastructure gaps kill the site—you'll know that in the first report. Then you move on. That's the ROI.
              </p>
            </div>

            <div>
              <p className="font-bold text-white mb-2">Can I use RegGuard for multiple sites?</p>
              <p className="text-gray-400">
                Yes. Each site is $15,000. Bulk orders? Email us for volume discounts (3+ reports: $12K each).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA: URGENCY ===== */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-gradient-to-br from-green-600/20 to-emerald-600/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">
            How many sites are you screening this month?
          </h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed">
            Every day you wait is money burning. Order a report today. Get your answer same-day. Move fast with confidence.
          </p>
          <button
            onClick={handleOrderReport}
            className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black text-lg rounded-xl transition shadow-lg shadow-green-500/30 hover:shadow-green-500/50 cursor-pointer mx-auto block mb-6"
          >
            Order Your Report — $15,000
          </button>
          <p className="text-gray-400 text-sm">
            Same-day delivery. Instant download. No setup required.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-purple-500/10 text-center text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto mb-8 space-y-2">
          <div className="flex justify-center gap-6 flex-wrap">
            <button onClick={() => navigate('/how-it-works')} className="text-purple-400 hover:text-purple-300 transition">How it works</button>
            <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300 transition">Contact</a>
          </div>
          <p className="text-xs">
            RegGuard © 2026 • Permitting research intelligence • 
            <a href="#" className="text-purple-400 hover:text-purple-300 ml-2">Privacy</a> • 
            <a href="#" className="text-purple-400 hover:text-purple-300 ml-2">Terms</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PlatformDashboard;
