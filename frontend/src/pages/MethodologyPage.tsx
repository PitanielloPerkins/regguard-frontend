/**
 * RegGuard Trust & Methodology
 * What we do, what we don't, and why you can trust us
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
            Transparency about what RegGuard can and cannot do, and why you can trust our research.
          </p>
        </div>
      </section>

      {/* What RegGuard Does */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">RegGuard Agent: What It Does</h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Regulatory Research</h3>
                  <p className="text-gray-300">
                    Searches public sources (FERC, RTO tariffs, municipal ordinances, utility interconnection guides) and synthesizes findings into a coherent research memo. Includes citations so you can verify sources.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Interconnection Process Mapping</h3>
                  <p className="text-gray-300">
                    Identifies which RTO your site falls under (PJM, MISO, ERCOT, ISO-NE, SPP) and maps the large-load interconnection process steps, typical timelines, and required documents for your capacity range.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Application Worksheet Drafting</h3>
                  <p className="text-gray-300">
                    Uses your project narrative to auto-populate standard interconnection application fields (applicant info, project specs, one-line diagram checklist, study request data). Outputs are drafts needing attorney/engineer review.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Risk & Regulatory Flagging</h3>
                  <p className="text-gray-300">
                    Highlights known interconnection risks (transmission constraints, environmental reviews, cost allocation disputes) and recent regulatory changes (FERC Orders, state legislation) relevant to your site and MW range.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Preliminary Cost & Timeline Estimates</h3>
                  <p className="text-gray-300">
                    Based on historical data for your RTO, capacity, and location, provides rough order-of-magnitude interconnection cost and timeline ranges. Not a commitment—actual costs/timelines depend on system conditions and RTO study findings.
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
                  <h3 className="text-lg font-bold text-white mb-2">Execute RTO Interconnection Studies</h3>
                  <p className="text-gray-300">
                    Only the RTO (utility) can perform Phase 1, 2, and 3 studies. RegGuard accelerates your preparation and initial application; you still go through the official RTO process, which takes 18–36+ months.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Guarantee Timelines or Outcomes</h3>
                  <p className="text-gray-300">
                    Interconnection delays are driven by RTO queue depth, network conditions, equipment lead times, and utility availability—not form-filling speed. RegGuard saves you weeks on *preparation*; it cannot compress the utility study itself.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Provide Legal or Engineering Advice</h3>
                  <p className="text-gray-300">
                    RegGuard outputs are research summaries and drafts. Have your attorney, engineer, and interconnection consultant review before filing with the RTO. We do not replace professional expertise.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Replace Interconnection Consultants</h3>
                  <p className="text-gray-300">
                    We accelerate intake and diligence. Interconnection consultants bring relationships, expertise, and accountability that RegGuard cannot. Use RegGuard to prepare; engage consultants for study management and negotiation.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Access Proprietary RTO Queue Data</h3>
                  <p className="text-gray-300">
                    Queue positions and study statuses are tracked by each RTO. RegGuard can help you navigate the process, but cannot access internal utility systems. Always verify with the RTO directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data & Sources */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">Where Our Data Comes From</h2>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-white mb-2">Primary Sources (Public & Authoritative)</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• FERC orders, standards, and interconnection rules</li>
                  <li>• RTO tariffs and interconnection procedures (PJM, MISO, ERCOT, ISO-NE, SPP)</li>
                  <li>• State PUC interconnection standards and regulations</li>
                  <li>• Municipal and county zoning/permitting requirements</li>
                  <li>• Utility interconnection guides (where public)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white mb-2">Secondary Sources (Curated)</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Industry publications and regulatory filings</li>
                  <li>• Historical project data (anonymized, aggregated)</li>
                  <li>• RTO queue statistics and trends</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-purple-500/20">
                <h3 className="font-bold text-white mb-2">What We DON'T Use</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Proprietary utility data (internal studies, cost models)</li>
                  <li>• Confidential project information</li>
                  <li>• Unverified rumors or anecdotal evidence</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-purple-500/20">
                <p className="text-sm text-gray-400 italic">
                  Every recommendation in a RegGuard report includes citations so you can verify sources independently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quality & Accuracy */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-8">Quality & Accuracy Standards</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">RegGuard Agent (Research)</h3>
              <p className="text-gray-300 mb-4">
                <strong>Accuracy target:</strong> 90%+ on factual regulatory requirements; 70%+ on interpretations.
              </p>
              <p className="text-gray-300 text-sm">
                We cite sources so you can verify. Where we identify ambiguity or disagreement among sources, we flag it explicitly and recommend consulting your attorney.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">Application Worksheets</h3>
              <p className="text-gray-300 mb-4">
                <strong>Status:</strong> AI-assisted drafts. Require attorney/engineer review before filing.
              </p>
              <p className="text-gray-300 text-sm">
                We flag missing fields and required attachments. Do not submit RegGuard worksheets without professional review and sign-off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* E&O & Liability */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-500/30 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Important Legal Disclaimer</h3>
                <p className="text-gray-300 mb-4">
                  RegGuard provides research summaries and drafts <strong>AS-IS</strong>, without warranty of accuracy or fitness for a particular purpose. 
                  RegGuard does not provide legal advice, engineering advice, or professional consulting services.
                </p>
                <p className="text-gray-300 mb-4">
                  <strong>You are responsible for:</strong>
                </p>
                <ul className="space-y-2 text-gray-300 mb-4">
                  <li>• Having your attorney review all legal outputs before relying on them</li>
                  <li>• Having your engineer review all technical outputs before filing with RTOs/utilities</li>
                  <li>• Verifying regulatory information independently with the relevant authority</li>
                  <li>• Making business decisions based on professional advice, not RegGuard outputs alone</li>
                </ul>
                <p className="text-gray-300 text-sm italic">
                  By using RegGuard, you agree that RegGuard is not liable for damages arising from your reliance on our outputs without professional review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Still Have Questions?</h2>
          <p className="text-gray-300 mb-8">
            Email us at <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300">hello@regguard.com</a> or start a 14-day trial to see RegGuard in action.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 cursor-pointer"
          >
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}
