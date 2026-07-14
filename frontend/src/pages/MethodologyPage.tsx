/**
 * RegGuard How It Works — Honest about what we deliver and how
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Clock } from 'lucide-react';

export default function MethodologyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Back Button */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-black text-white mb-6">How RegGuard Works</h1>
          <p className="text-xl text-gray-300">
            You place an order. We research. You get PDFs same-day. Here's exactly what happens inside.
          </p>
        </div>
      </section>

      {/* The Process */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">The Process (Behind the Scenes)</h2>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">You Submit an Order</h3>
                  <p className="text-gray-300">
                    Address. Project type. Any special details. Payment via Stripe. Instant confirmation email with order ID.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Automated Research Engine Starts</h3>
                  <p className="text-gray-300 mb-4">
                    Our system scans:
                  </p>
                  <ul className="text-gray-300 space-y-2 ml-4">
                    <li>• Local municipal databases (zoning, permitting history, ordinances)</li>
                    <li>• State regulatory databases</li>
                    <li>• Utility interconnection rules (if applicable)</li>
                    <li>• FERC filings and orders</li>
                    <li>• Recent permit applications in your jurisdiction</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">AI Synthesizes + Generates PDFs</h3>
                  <p className="text-gray-300 mb-4">
                    Three documents are auto-generated:
                  </p>
                  <ul className="text-gray-300 space-y-3 ml-4">
                    <li>
                      <strong className="text-white">Research Memo (PDF)</strong>
                      <p className="text-sm mt-1">Executive summary, permitting roadmap, timeline, preliminary costs, key contacts</p>
                    </li>
                    <li>
                      <strong className="text-white">Contractor Punch List (PDF)</strong>
                      <p className="text-sm mt-1">Checkbox action items: who to call, what to submit, when, in what order</p>
                    </li>
                    <li>
                      <strong className="text-white">Permit Package (PDF)</strong>
                      <p className="text-sm mt-1">Pre-filled forms, checklists, required documents for your municipality/utility</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">4</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Quality Check (Optional)</h3>
                  <p className="text-gray-300">
                    By default, we hold reports for 2–4 hours for a human review: Do the findings make sense? Are citations complete? Then we email you.
                    <br /><br />
                    <strong>Want it instantly?</strong> Select "instant delivery" in the order form and skip the hold.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">5</div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">You Receive Email + Portal Access</h3>
                  <p className="text-gray-300">
                    Email with download links to all three PDFs. Account portal where you can view all your orders and re-download anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">Expected Timeline</h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white mb-2">Order to research</p>
              <p className="text-2xl font-black text-blue-400">5–15 min</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white mb-2">PDF generation</p>
              <p className="text-2xl font-black text-green-400">1–3 min</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white mb-2">Quality check</p>
              <p className="text-2xl font-black text-purple-400">2–4 hrs</p>
              <p className="text-xs text-gray-400 mt-2">(skip with instant delivery)</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6 text-center">
              <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white mb-2">Total</p>
              <p className="text-2xl font-black text-green-400">&lt; 24 hrs</p>
              <p className="text-xs text-gray-400 mt-2">(most same-day)</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-gray-300">
              <strong>Reality check:</strong> Most reports generate in 10–20 minutes total. We hold for quality check to give you confidence. If you're in a hurry, request instant delivery and skip the hold.
            </p>
          </div>
        </div>
      </section>

      {/* What We Guarantee */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">What We Guarantee (and What We Don't)</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                We Guarantee
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>All findings cited to public sources (you can verify)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>PDFs are formatted and professional</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>Punch list is actionable (step-by-step next moves)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>Same-day delivery (or instant if requested)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>7-day refund if unsatisfied</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-red-400 text-xl">✕</span>
                We Don't Guarantee
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Permitting approval (only your municipality decides)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Exact costs (estimates only; actual quotes from utilities vary)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>That you won't need a lawyer (you should have counsel review)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>100% accuracy (we use AI; errors are rare but possible)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Real-time RTO queue tracking (no access to proprietary systems)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/30 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Important: RegGuard is a Research Tool, Not Legal Advice</h3>
                <p className="text-gray-300 mb-4">
                  RegGuard reports are research summaries and preliminary analysis. They are not legal opinions, engineering reviews, or professional advice.
                </p>
                <p className="text-gray-300 mb-4">
                  <strong>Before you act on a RegGuard report:</strong>
                </p>
                <ul className="space-y-2 text-gray-300 mb-4">
                  <li>• Have your attorney review all findings</li>
                  <li>• Have your engineer review all technical recommendations</li>
                  <li>• Verify key facts independently with municipalities/utilities</li>
                  <li>• Get professional counsel before filing applications</li>
                </ul>
                <p className="text-gray-300 text-sm italic">
                  By ordering a RegGuard report, you acknowledge that it is a starting point for due diligence, not a substitute for professional legal/engineering review. RegGuard is not liable for decisions you make based on our research.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Ready to Get Started?</h2>
          <p className="text-gray-300 mb-8">
            Order a report and see exactly what you get. Fast, transparent, no surprises.
          </p>
          <button
            onClick={() => navigate('/order')}
            className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-green-500/30 cursor-pointer mx-auto block"
          >
            Order a Report
          </button>
        </div>
      </section>
    </div>
  );
}
