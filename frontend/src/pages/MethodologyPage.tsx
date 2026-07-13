/**
 * RegGuard How It Works — Site Diligence Reports
 * Transparency about research quality, sources, and limitations
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

export default function MethodologyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Back Button */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-black text-white mb-6">How RegGuard Works</h1>
          <p className="text-xl text-gray-300">
            Transparency about what RegGuard delivers, where our data comes from, and what it's designed to do (and not do).
          </p>
        </div>
      </section>

      {/* What RegGuard Does */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">What RegGuard Delivers</h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Regulatory Research Memo (8–12 pages)</h3>
                  <p className="text-gray-300">
                    AHJ (Authority Having Jurisdiction) identification, interconnection process roadmap, timelines, moratorium risk flags, environmental constraints, local zoning/permitting, state-level restrictions, FERC compliance checklist.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">RTO Application Worksheets (Drafts)</h3>
                  <p className="text-gray-300">
                    Pre-populated interconnection application forms specific to your RTO (PJM, MISO, ERCOT, ISO-NE, SPP) and capacity range. Includes FERC 556/557 frameworks, one-line diagram checklists, equipment specification templates, protective relay coordination requirements.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Fully Cited Sources</h3>
                  <p className="text-gray-300">
                    Every finding includes direct links to the public source (FERC orders, RTO tariffs, state law, utility interconnection guides, municipal zoning databases). You can verify independently; we're not a black box.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Action Items & Milestones</h3>
                  <p className="text-gray-300">
                    Next steps (pre-application meeting with utility, formal queue entry, Phase 1 study scope), estimated timeline, key decision points, and items to review with your attorney, engineer, or interconnection consultant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What RegGuard Does NOT Do */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">What RegGuard Does NOT Do</h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">NOT Legal Advice</h3>
                  <p className="text-gray-300">
                    RegGuard reports are research summaries, not legal documents or opinions. Always have your attorney review before filing with RTOs, utilities, or regulatory bodies. We accelerate research; counsel makes final decisions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">NOT Engineering Analysis</h3>
                  <p className="text-gray-300">
                    We do not perform load flow studies, network impact analyses, or protective relay coordination design. Utilities (RTOs) do Phase 1, 2, and 3 studies. RegGuard research accelerates your *preparation* for those studies, not the studies themselves.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">NOT a Guarantee of Approval</h3>
                  <p className="text-gray-300">
                    RegGuard cannot guarantee interconnection approval, timeline, or cost. RTOs ultimately make those decisions based on system conditions, queue depth, and study results. We can flag risks and estimate timelines, but outcomes depend on the utility.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">NOT a Replacement for IC Consultants</h3>
                  <p className="text-gray-300">
                    IC consultants bring relationships, negotiation expertise, and accountability that RegGuard does not. RegGuard accelerates intake; consultants manage Phase 1–3 and negotiate with utilities. Use both; they're complementary.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">NOT Real-Time Queue Tracking</h3>
                  <p className="text-gray-300">
                    RegGuard does not have access to internal RTO queue systems. We can help you understand the interconnection process, but you must verify queue positions directly with the RTO and your utility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">Where Our Data Comes From</h2>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-white mb-3">Primary Sources (Authoritative & Public)</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• **FERC Orders** (Order 2023, Order 888, Order 889): www.ferc.gov</li>
                  <li>• **RTO Tariffs & Procedures** (PJM, MISO, ERCOT, ISO-NE, SPP): Public filings available on each RTO's website</li>
                  <li>• **State PUC Regulations:** State-specific interconnection standards and timelines</li>
                  <li>• **Utility Interconnection Guides:** Published by Oncor, Duke, NextEra, PG&E, etc.</li>
                  <li>• **Municipal Zoning & Permitting:** County/city planning departments, online databases</li>
                  <li>• **Environmental Databases:** USGS Wetlands, EPA superfund, state environmental agencies</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-purple-500/20">
                <h3 className="font-bold text-white mb-3">Secondary Sources (Curated)</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Industry publications and regulatory tracking databases</li>
                  <li>• Historical project data (anonymized, aggregated, trend analysis)</li>
                  <li>• RTO queue statistics and interconnection timelines</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-purple-500/20">
                <h3 className="font-bold text-white mb-3">What We DON'T Use</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Proprietary utility data or internal studies</li>
                  <li>• Confidential customer or project information</li>
                  <li>• Unverified rumors, anecdotes, or speculative claims</li>
                  <li>• Internal RTO queue positions (only public data)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quality & Accuracy */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">Research Quality & Accuracy Standards</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">Regulatory Research (Factual)</h3>
              <p className="text-gray-300 mb-4">
                <strong>Accuracy target: 90%+</strong> on factual regulatory requirements (FERC orders, RTO procedures, state law, interconnection timelines).
              </p>
              <p className="text-gray-300 text-sm">
                We cite sources so you can verify independently. If we identify ambiguity or disagreement among sources (e.g., conflicting RTO tariff interpretations), we flag it explicitly and recommend consulting your attorney.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">RTO Worksheets (Drafts)</h3>
              <p className="text-gray-300 mb-4">
                <strong>Status: AI-assisted drafts.</strong> These are starting points for your attorney/engineer review. Do NOT submit directly to RTOs without professional review and sign-off.
              </p>
              <p className="text-gray-300 text-sm">
                We auto-populate common fields based on your project info. We flag missing sections and required attachments. Your attorney/engineer must complete legal/technical sections before filing.
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-gray-300 text-sm">
              <strong>Limitations:</strong> RegGuard research accuracy depends on the recency and completeness of public sources. 
              RTO tariffs, FERC orders, and state laws change frequently. RegGuard reports are valid for ~3 months; regulatory updates require re-verification with primary sources.
            </p>
          </div>
        </div>
      </section>

      {/* ROI & Comparison */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">The RegGuard Model: Intake Acceleration</h2>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
            <p className="text-gray-300 mb-6">
              RegGuard is not a replacement for law firms, engineers, or IC consultants. It's a **research acceleration layer** that makes them more efficient.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-bold text-white mb-3">Before RegGuard</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>1. Hire counsel</li>
                  <li>2. Wait 2–4 weeks</li>
                  <li>3. Pay $75K–$150K</li>
                  <li>4. Get research memo</li>
                  <li>5. Decide to proceed</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-3">With RegGuard</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>1. Order RegGuard report</li>
                  <li>2. Wait 48 hours</li>
                  <li>3. Pay $15K</li>
                  <li>4. Get research + worksheets</li>
                  <li>5. **Kill bad sites early**</li>
                  <li>6. For good sites: engage counsel for final review</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-3">Impact</h4>
                <ul className="text-sm text-green-300 space-y-2">
                  <li>✓ 88% cost savings ($15K vs $150K)</li>
                  <li>✓ 97% faster (48 hrs vs 4 weeks)</li>
                  <li>✓ Kill bad sites early</li>
                  <li>✓ Counsel focuses on final review, not intake</li>
                </ul>
              </div>
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
                <h3 className="text-lg font-bold text-white mb-4">Important Legal Disclaimer</h3>
                <p className="text-gray-300 mb-4">
                  RegGuard provides research summaries and preliminary worksheets **AS-IS**, without warranty of accuracy or fitness for any particular purpose. 
                  RegGuard does not provide legal advice, engineering advice, or professional consulting services.
                </p>
                <p className="text-gray-300 mb-4">
                  <strong>You are responsible for:</strong>
                </p>
                <ul className="space-y-2 text-gray-300 mb-4">
                  <li>• Having your attorney review all regulatory findings and draft worksheets before relying on them</li>
                  <li>• Having your engineer review all technical outputs before filing with utilities/RTOs</li>
                  <li>• Verifying interconnection timelines and cost estimates independently with your IC consultant</li>
                  <li>• Making business decisions based on professional advice from counsel/engineers, not RegGuard outputs alone</li>
                </ul>
                <p className="text-gray-300 text-sm italic">
                  By using RegGuard, you acknowledge that you have read this disclaimer and understand that RegGuard is not liable for damages arising from your reliance on our research without professional review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Ready to Accelerate Your Site Diligence?</h2>
          <p className="text-gray-300 mb-8">
            Order a RegGuard Site Diligence Report for your next site. $15,000. 48-hour turnaround. Fully cited. Ready for your team.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 cursor-pointer mx-auto block"
          >
            Order Site Diligence Report
          </button>
          <p className="text-gray-400 text-sm mt-6">
            Questions? Email <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300">hello@regguard.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}
