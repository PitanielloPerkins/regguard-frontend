/**
 * RegGuard Pricing - Hybrid ($15K first + $20K/yr) + Enterprise ($60K/yr)
 * Positioning: Undercut law firms (60-80% cheaper), faster, defensible
 */

import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, DollarSign } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const handleOrderReport = () => {
    window.location.href = 'mailto:hello@regguard.com?subject=Order%20Site%20Diligence%20Report';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Back Button */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <h1 className="text-xl font-black text-white">RegGuard Pricing</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-black text-white mb-6">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-300 mb-4">
            60–80% cheaper than law firms. Delivered in 48 hours instead of 6 weeks.
          </p>
          <p className="text-gray-400">
            One-time report + optional monitoring, or annual enterprise pricing for portfolios.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Hybrid: Primary for regional developers */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-purple-500/50 hover:border-purple-500 rounded-2xl p-8 flex flex-col h-full relative">
              {/* Recommended ribbon */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white uppercase">
                ⭐ Recommended
              </div>

              <h2 className="text-2xl font-black text-white mb-2 mt-4">Hybrid Plan</h2>
              <p className="text-gray-400 text-sm mb-8">Best for regional DC developers & EPCs</p>

              <div className="mb-8">
                <div className="text-4xl font-black text-white mb-2">$15,000</div>
                <p className="text-gray-400 text-sm">First site diligence report</p>
                <div className="text-2xl font-black text-white mt-4 mb-2">$20,000/yr</div>
                <p className="text-gray-400 text-sm">Monitoring + 2–3 additional reports</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Comprehensive regulatory research memo (8–12 pages)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">RTO application worksheets (PJM, MISO, ERCOT, ISO-NE)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Cited sources (FERC, tariffs, state law)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Moratorium & political risk flags</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Interconnection process roadmap & timelines</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Quarterly regulatory updates (annual plan)</span>
                </div>
              </div>

              <button
                onClick={handleOrderReport}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                Order First Report
              </button>

              <p className="text-center text-gray-400 text-xs mt-4">
                Typically 48-hour turnaround
              </p>
            </div>

            {/* Enterprise: For PE, consultants, hyperscalers */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-8 flex flex-col h-full">
              <h2 className="text-2xl font-black text-white mb-2">Enterprise Plan</h2>
              <p className="text-gray-400 text-sm mb-8">For PE, consulting firms, large portfolios</p>

              <div className="mb-8">
                <div className="text-4xl font-black text-white mb-2">$60,000/yr</div>
                <p className="text-gray-400 text-sm">Unlimited annual reports + monitoring</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Everything in Hybrid plan +</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Unlimited site diligence reports</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Priority 24-hour turnaround</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Real-time regulatory alert feed</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Monthly strategic review calls</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">API access for integration</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Custom integrations & consulting</span>
                </div>
              </div>

              <button
                onClick={handleOrderReport}
                className="w-full px-6 py-3 border border-purple-500/50 hover:border-purple-500 text-white font-bold rounded-lg transition bg-slate-900/50 hover:bg-slate-900 cursor-pointer"
              >
                Contact Sales
              </button>

              <p className="text-center text-gray-400 text-xs mt-4">
                Best for 5+ annual reports
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Comparison */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">How RegGuard Compares</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Law firms */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Law Firms (Stoel Rives, VNF)</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <span className="font-bold text-red-400">Cost:</span> $75K–$150K
                </li>
                <li>
                  <span className="font-bold text-red-400">Timeline:</span> 2–4 weeks
                </li>
                <li>
                  <span className="font-bold text-red-400">Deliverable:</span> Legal opinion memo
                </li>
                <li>
                  <span className="font-bold text-red-400">Best for:</span> Final due diligence before binding agreements
                </li>
              </ul>
            </div>

            {/* RegGuard */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-green-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">RegGuard</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li>
                  <span className="font-bold text-green-400">Cost:</span> $15K (first report)
                </li>
                <li>
                  <span className="font-bold text-green-400">Timeline:</span> 48 hours
                </li>
                <li>
                  <span className="font-bold text-green-400">Deliverable:</span> Research memo + worksheets
                </li>
                <li>
                  <span className="font-bold text-green-400">Best for:</span> Early-stage screening before counsel
                </li>
              </ul>
            </div>

            {/* DIY */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-gray-500/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">DIY (ChatGPT + Google)</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <span className="font-bold text-gray-400">Cost:</span> $0–$500
                </li>
                <li>
                  <span className="font-bold text-gray-400">Timeline:</span> Hours
                </li>
                <li>
                  <span className="font-bold text-gray-400">Deliverable:</span> Unverified AI output
                </li>
                <li>
                  <span className="font-bold text-gray-400">Best for:</span> Quick research only
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">What's the difference between Hybrid and Enterprise?</h3>
              <p className="text-gray-400">
                **Hybrid** is perfect if you screen 1–3 sites per year. You pay per report ($15K) + annual monitoring ($20K). 
                **Enterprise** is for teams with continuous pipelines (5+ sites/year, portfolios, or IC firms who resell). 
                You get unlimited reports, priority 24-hour turnaround, and API access for $60K/year.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Can I use RegGuard reports for official filings?</h3>
              <p className="text-gray-400">
                RegGuard reports are drafted research and worksheets, not legal documents or official applications. 
                Always have your attorney and engineer review before filing with RTOs or utilities. 
                We're designed to accelerate your *intake* work, not replace professional counsel.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">What if the report shows a site is not viable?</h3>
              <p className="text-gray-400">
                That's exactly the point—kill bad sites before spending $100K on interconnection counsel. 
                If a site has fatal flaws (moratoriums, no capacity, etc.), you'll know in 48 hours instead of 6 weeks.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Do you cover all RTOs?</h3>
              <p className="text-gray-400">
                RegGuard covers PJM, MISO, ERCOT, ISO-NE, and SPP. We specialize in large-load interconnection (data centers, BESS, renewable clusters). 
                If your site falls outside these RTOs, contact us—we can expand.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">What about confidentiality?</h3>
              <p className="text-gray-400">
                All RegGuard reports are confidential. We never share site data, project details, or customer information. 
                Your research memo is yours alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Ready to Get Started?</h2>
          <p className="text-gray-300 mb-8">
            Order your first RegGuard Site Diligence Report today. 48-hour turnaround, fully cited, ready for your team.
          </p>
          <button
            onClick={handleOrderReport}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 cursor-pointer mx-auto block"
          >
            Order Report — $15,000
          </button>
          <p className="text-gray-400 text-sm mt-6">
            Questions? Email <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300">hello@regguard.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}
