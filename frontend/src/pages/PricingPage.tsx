/**
 * RegGuard Pricing — Simple, transparent
 * Per-report model + optional annual monitoring
 * No confusing bundles. Just tell people what it costs.
 */

import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const handleOrderReport = () => {
    navigate('/order');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Back Button */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-xl font-black text-white">Pricing</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-black text-white mb-6">Transparent Pricing</h1>
          <p className="text-xl text-gray-300">
            No hidden fees. No setup charges. No contracts.
          </p>
        </div>
      </section>

      {/* Pricing Options */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Per-Report */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-green-500/50 rounded-2xl p-8 flex flex-col h-full">
              <h2 className="text-2xl font-black text-white mb-2">Per-Report</h2>
              <p className="text-gray-400 text-sm mb-8">Order what you need, when you need it.</p>

              <div className="mb-8">
                <div className="text-5xl font-black text-white">$15,000</div>
                <p className="text-gray-400 text-sm">one complete report</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Research memo (PDF)</strong> — Permitting requirements, interconnection process, timeline, costs</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Contractor punch list (PDF)</strong> — Action items, next steps, who to call</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Permit application package (PDF)</strong> — Forms, checklists, docs ready to file</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Delivered same-day</strong> — Email within 24 hours</span>
                </div>
              </div>

              <button
                onClick={handleOrderReport}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition shadow-lg shadow-green-500/20 cursor-pointer"
              >
                Order Report
              </button>

              <p className="text-center text-gray-400 text-xs mt-4">
                Bulk discount: 3+ reports = $12K each
              </p>
            </div>

            {/* Annual Monitoring */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-2xl p-8 flex flex-col h-full hover:border-purple-500/40 transition">
              <h2 className="text-2xl font-black text-white mb-2">Annual Monitoring</h2>
              <p className="text-gray-400 text-sm mb-8">Stay on top of regulatory changes (optional)</p>

              <div className="mb-8">
                <div className="text-5xl font-black text-white">$20,000</div>
                <p className="text-gray-400 text-sm">per year (add-on)</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Quarterly regulatory updates</strong> — We rescan your jurisdictions for new laws/changes</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Up to 3 new reports</strong> — Included during the year (additional ones available)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Alert email</strong> — We notify you of major regulatory changes</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300"><strong>Best for active portfolios</strong> — Multiple sites or continuous screening</span>
                </div>
              </div>

              <button
                onClick={handleOrderReport}
                className="w-full px-6 py-3 border border-purple-500/50 hover:border-purple-500 text-white font-bold rounded-lg transition bg-slate-900/50 hover:bg-slate-900 cursor-pointer"
              >
                Learn More
              </button>

              <p className="text-center text-gray-400 text-xs mt-4">
                Billed annually, cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">What You Get with RegGuard</h2>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Every report includes:</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">✓</span>
                    <span><strong>Research memo (PDF)</strong> — Permitting requirements, timeline, preliminary costs</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">✓</span>
                    <span><strong>Contractor punch list (PDF)</strong> — Step-by-step action items</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">✓</span>
                    <span><strong>Permit package (PDF)</strong> — Forms and checklists ready to file</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">✓</span>
                    <span><strong>Same-day delivery</strong> — All PDFs emailed within 24 hours</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-purple-500/20">
                <h3 className="text-lg font-bold text-white mb-4">Why RegGuard works:</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">→</span>
                    <span>Fast decisions (same-day, not weeks)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">→</span>
                    <span>Clear costs ($15K, no surprises)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">→</span>
                    <span>Actionable output (not just analysis)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-400 font-bold">→</span>
                    <span>Kill bad sites early, save money</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accuracy Guarantee */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-2 border-emerald-500/30 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Our Accuracy Guarantee</h3>
            <p className="text-gray-300">
              <strong>If a critical finding is wrong, we refund 100% of your payment.</strong> No questions asked. We stand behind our research and cite all sources so you can verify independently. Every report is backed by this guarantee.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Can I get a volume discount?</h3>
              <p className="text-gray-400">
                Yes. 3+ reports in one order: $12K each. Let us know your volume needs: hello@regguard.com
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">What's included in "same-day"?</h3>
              <p className="text-gray-400">
                Your order is processed. Research memo, punch list, and permit package are generated automatically. You get a download link + email within 24 hours. Most reports complete in 5–15 minutes; we hold them for final check before sending.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Can I get instant delivery instead?</h3>
              <p className="text-gray-400">
                Yes. Request "instant delivery" in the order notes. Research will be emailed immediately after generation (no quality hold). Same price.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">What if I need multiple reports across states?</h3>
              <p className="text-gray-400">
                Each report is independent. Order one for Texas, one for California, one for New York—we handle all jurisdictions. Use our annual monitoring plan to track multiple sites.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Do you offer refunds?</h3>
              <p className="text-gray-400">
                Yes. 7-day refund if you're unsatisfied. We stand behind the quality. (But read our sample report first—you'll see exactly what you're getting.)
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">What if my site is not permittable?</h3>
              <p className="text-gray-400">
                We'll tell you. If moratoriums, zoning issues, or infrastructure gaps exist, your report will flag them prominently. That's the value—kill bad sites for $15K instead of $100K.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Ready to Order?</h2>
          <p className="text-gray-300 mb-8">
            No credit card required to browse. No contracts. Just fill the form, pay, and get your report same-day.
          </p>
          <button
            onClick={handleOrderReport}
            className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-green-500/30 cursor-pointer mx-auto block"
          >
            Order Your Report
          </button>
          <p className="text-gray-400 text-sm mt-6">
            Questions? <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300">hello@regguard.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}
