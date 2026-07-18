/**
 * RegGuard Free Trial — Zero risk research
 * Submit address → Get research memo via email in 24 hours
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';

export default function FreeTrialPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    projectType: 'data-center',
    email: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (address: string, city: string, state: string, _lat: number, _lng: number) => {
    setFormData(prev => ({
      ...prev,
      address,
      city,
      state,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    if (!formData.address || !formData.city || !formData.state || !formData.email) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      // Call backend free trial endpoint
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_ORIGIN}/free-trial`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: `${formData.address}, ${formData.city}, ${formData.state}`,
            project_type: formData.projectType,
            email: formData.email,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit trial request');
      }

      setSubmitted(true);
    } catch (err) {
      setError('Error submitting request. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl font-black text-white mb-6">Try RegGuard Free</h1>
          <p className="text-xl text-gray-300 mb-4">
            No credit card required. No commitment. See what you get.
          </p>
          <p className="text-lg text-gray-400">
            Submit your site. We'll generate a research memo and email it within 24 hours. See the quality for yourself.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-2 border-emerald-500/30 rounded-2xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-white mb-4">Request Submitted!</h2>
              <p className="text-gray-300 mb-6">
                Thanks for submitting your site. We're generating your research memo now.
              </p>
              <p className="text-gray-400 mb-8">
                <strong>Check your email within 24 hours</strong> ({formData.email})
              </p>
              <p className="text-gray-300 mb-8">
                In the email, you'll get:
              </p>
              <div className="space-y-3 text-left mb-8 bg-slate-800/50 rounded-lg p-6">
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="text-gray-300"><strong>Research memo (PDF)</strong> — Permitting requirements, timeline, costs</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="text-gray-300"><strong>Cited sources</strong> — All findings linked to public sources</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="text-gray-300"><strong>CTA to upgrade</strong> — Want punch list + permits? Pay $15K for full package</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-2xl p-12">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Location Picker - Map + Auto-Detect */}
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  disabled={loading}
                />

                {/* Project Type */}
                <div>
                  <label htmlFor="projectType" className="block text-white font-bold mb-2">What type of project? *</label>
                  <select
                    id="projectType"
                    name="projectType"
                    value={formData.projectType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    disabled={loading}
                  >
                    <option value="data-center">Data Center</option>
                    <option value="renewable">Solar / Wind / Battery</option>
                    <option value="commercial">Commercial Building</option>
                    <option value="industrial">Industrial / Manufacturing</option>
                    <option value="utility">Utility / Substation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-white font-bold mb-2">Your Email *</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-slate-700 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    disabled={loading}
                  />
                  <p className="text-gray-400 text-sm mt-2">We'll send your research memo here</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-green-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Get Free Research Memo'}
                </button>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    <strong>What happens next:</strong> You'll get a plain-text research memo within 24 hours. See if RegGuard is useful before paying for the full package (punch list + permit PDFs).
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Why Try Free */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12">Why Try RegGuard Free?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-black text-green-400 mb-4">✓</div>
              <h3 className="text-lg font-bold text-white mb-3">No Risk</h3>
              <p className="text-gray-400 text-sm">Zero credit card required. See what you actually get before deciding.</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-black text-green-400 mb-4">✓</div>
              <h3 className="text-lg font-bold text-white mb-3">Real Quality</h3>
              <p className="text-gray-400 text-sm">Get an actual research memo from your site. See the depth and accuracy.</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/30 rounded-xl p-6">
              <div className="text-3xl font-black text-green-400 mb-4">✓</div>
              <h3 className="text-lg font-bold text-white mb-3">Personal ROI</h3>
              <p className="text-gray-400 text-sm">See if the findings save you money on YOUR project, not a generic example.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-purple-500/10 bg-slate-900/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Ready to see the difference?</h2>
          <p className="text-gray-400 mb-8">One research memo might save you $100K+. Worth 24 hours of your time?</p>
          <button
            onClick={() => document.querySelector('input[name="address"]')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-green-500/30 cursor-pointer"
          >
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}
