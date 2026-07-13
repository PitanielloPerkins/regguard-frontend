/**
 * RegGuard Pricing - Honest, consistent
 * Pilot / Monthly / Enterprise options
 */

import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate('/signup');
  };

  const handleContact = () => {
    window.location.href = 'mailto:hello@regguard.com?subject=Enterprise%20Inquiry';
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
          <h1 className="text-5xl font-black text-white mb-6">Pricing Built for Your Project</h1>
          <p className="text-xl text-gray-300 mb-4">
            Whether you're screening a single site or managing a portfolio, RegGuard scales with you.
          </p>
          <p className="text-gray-400">
            All plans include RegGuard Agent with full regulatory research, roadmapping, and application worksheet generation.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Pilot: Per-site */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-2xl p-8 flex flex-col h-full hover:border-purple-500/40 transition">
              <h2 className="text-2xl font-black text-white mb-2">Pilot</h2>
              <p className="text-gray-400 text-sm mb-6">Per-site research</p>
              
              <div className="mb-8">
                <div className="text-4xl font-black text-white">$5K–$15K</div>
                <p className="text-gray-400 text-sm">per site assessment</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">1 complete regulatory research report</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">RTO interconnection process mapping</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Draft application worksheets (PJM/MISO/ERCOT)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Preliminary cost estimates & timeline</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Risk & regulatory flagging</span>
                </div>
              </div>

              <button
                onClick={handleStartTrial}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                Start 14-Day Trial
              </button>
            </div>

            {/* Monthly: Per-project */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-purple-500/50 rounded-2xl p-8 flex flex-col h-full relative">
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white uppercase">
                Most Popular
              </div>

              <h2 className="text-2xl font-black text-white mb-2">Monthly</h2>
              <p className="text-gray-400 text-sm mb-6">Active project engagement</p>
              
              <div className="mb-8">
                <div className="text-4xl font-black text-white">$500–$2K</div>
                <p className="text-gray-400 text-sm">per project per month</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Everything in Pilot +</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Ongoing regulatory monitoring</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Monthly project status updates</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">RTO queue & milestone tracking</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Updated worksheets & timelines</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Study Translator (when available)</span>
                </div>
              </div>

              <button
                onClick={handleStartTrial}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                Start 14-Day Trial
              </button>
            </div>

            {/* Enterprise: Portfolio */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-2xl p-8 flex flex-col h-full hover:border-purple-500/40 transition">
              <h2 className="text-2xl font-black text-white mb-2">Enterprise</h2>
              <p className="text-gray-400 text-sm mb-6">Portfolio management</p>
              
              <div className="mb-8">
                <div className="text-4xl font-black text-white">$25K–$75K</div>
                <p className="text-gray-400 text-sm">per year</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Everything in Monthly +</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">3+ concurrent projects</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Portfolio dashboard & reporting</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Quarterly regulatory updates</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Priority support & integration</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">Custom workflows & automation</span>
                </div>
              </div>

              <button
                onClick={handleContact}
                className="w-full px-6 py-3 border border-purple-500/50 hover:border-purple-500 text-white font-bold rounded-lg transition bg-slate-900/50 hover:bg-slate-900 cursor-pointer"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">What You Need to Know</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">What RegGuard Does</h3>
              <ul className="space-y-2 text-gray-300">
                <li>✓ Research interconnection requirements by site</li>
                <li>✓ Generate regulatory roadmaps & timelines</li>
                <li>✓ Draft application worksheets (Large-load RTO forms)</li>
                <li>✓ Flag risks & regulatory changes</li>
                <li>✓ Provide citations & research sources</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-4">What RegGuard Doesn't Do</h3>
              <ul className="space-y-2 text-gray-300">
                <li>✗ Execute RTO interconnection studies (utilities do)</li>
                <li>✗ Guarantee project timelines (depends on RTO/utility)</li>
                <li>✗ Serve as legal/engineering advice (use your counsel)</li>
                <li>✗ Replace interconnection consultants</li>
                <li>✗ Track positions in utility internal systems</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 p-8 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-3">Important: Attorney/Engineer Review Required</h3>
            <p className="text-gray-300">
              All RegGuard outputs—research summaries, application drafts, timelines—are starting points only. 
              Have your legal counsel, engineers, and interconnection specialists review before filing with the RTO or utility. 
              RegGuard accelerates intake, not replace expertise.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Ready to Get Started?</h2>
          <p className="text-gray-300 mb-8">
            Start with our 14-day trial. Includes 2 complete site research reports. No credit card required.
          </p>
          <button
            onClick={handleStartTrial}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-purple-500/30 cursor-pointer"
          >
            Start Free Trial
          </button>
          <p className="text-gray-400 text-sm mt-6">
            Questions? Email <a href="mailto:hello@regguard.com" className="text-purple-400 hover:text-purple-300">hello@regguard.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}
