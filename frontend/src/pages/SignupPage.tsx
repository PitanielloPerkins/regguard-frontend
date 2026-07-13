/**
 * RegGuard Signup & Payment Page
 * Stripe integration for free trial signup with credit card collection
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { backendUrl } from '../env';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

interface FormData {
  email: string;
  password: string;
  company_name: string;
  first_name: string;
  last_name: string;
}

function SignupFormContent() {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    company_name: '',
    first_name: '',
    last_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!stripe || !elements) {
      setError('Stripe not loaded. Please refresh and try again.');
      setLoading(false);
      return;
    }

    // Validate form
    if (!formData.email || !formData.password || !formData.company_name || !formData.first_name || !formData.last_name) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      // Get card token from Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card element not found');
        setLoading(false);
        return;
      }

      const { token, error: tokenError } = await stripe.createToken(cardElement);

      if (tokenError) {
        setError(tokenError.message || 'Card error occurred');
        setLoading(false);
        return;
      }

      if (!token) {
        setError('Failed to create payment token');
        setLoading(false);
        return;
      }

      // Send to backend to create user and start trial
      const response = await axios.post(
        backendUrl('/auth/create-checkout-session'),
        {
          email: formData.email,
          password: formData.password,
          company_name: formData.company_name,
          first_name: formData.first_name,
          last_name: formData.last_name,
          stripe_token: token.id,
          project_name: `${formData.company_name} - Initial Project`,
        }
      );

      if (response.data.success) {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/agent');
        }, 2000);
      } else {
        setError(response.data.message || 'Signup failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-400" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4">Welcome to RegGuard!</h1>
          <p className="text-gray-300 mb-8">
            Your free 14-day trial has been activated. Redirecting to dashboard...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-16">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Card */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-purple-500/20 rounded-3xl p-8">
          <h1 className="text-3xl font-black text-white mb-2">Start Free Trial</h1>
          <p className="text-gray-400 mb-8">14 days free. No credit card required after trial.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                placeholder="John"
                className="w-full px-4 py-2 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="Doe"
                className="w-full px-4 py-2 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                placeholder="Acme Solar"
                className="w-full px-4 py-2 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@company.com"
                className="w-full px-4 py-2 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            {/* Card Element */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Payment Method</label>
              <div className="p-4 bg-slate-900/50 border border-purple-500/20 rounded-lg">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#ffffff',
                        '::placeholder': {
                          color: '#6b7280',
                        },
                      },
                      invalid: {
                        color: '#ef4444',
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-400 text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !stripe}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Start Free Trial'}
            </button>
          </form>

          {/* Trial Info */}
          <div className="mt-6 pt-6 border-t border-purple-500/10">
            <div className="space-y-2 text-sm text-gray-400">
              <p>✓ 14 days free access</p>
              <p>✓ Full feature access</p>
              <p>✓ Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Elements stripe={stripePromise}>
      <SignupFormContent />
    </Elements>
  );
}
