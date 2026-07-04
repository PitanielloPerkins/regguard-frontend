/**
 * Auth success page - user lands here after successful Stripe checkout.
 * Supabase user account has been created by webhook handler.
 * User can now log in or be auto-logged in.
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './auth-success.css';

export function AuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('Finalizing your account...');
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setStatus('error');
        setMessage('No checkout session found.');
        setTimeout(() => navigate('/signup'), 3000);
        return;
      }

      try {
        // Optional: Verify the session is complete with your backend
        // This ensures the webhook has already processed it
        setStatus('success');
        setMessage('✓ Your account is ready! Redirecting to dashboard...');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage('Failed to activate your account. Please contact support.');
      }
    };

    verifySession();
  }, [sessionId, navigate]);

  return (
    <div className="rg-auth-success-container">
      <div className="rg-auth-success-card">
        {status === 'pending' && (
          <>
            <Loader2 size={48} className="rg-auth-spinner" />
            <h1 className="rg-auth-success-title">Setting up your account</h1>
            <p className="rg-auth-success-message">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={48} className="rg-auth-check-icon" />
            <h1 className="rg-auth-success-title">Welcome to RegGuard!</h1>
            <p className="rg-auth-success-message">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="rg-auth-error-icon">✗</div>
            <h1 className="rg-auth-error-title">Account Setup Failed</h1>
            <p className="rg-auth-error-message">{message}</p>
            <button
              onClick={() => navigate('/signup')}
              className="rg-auth-retry-btn"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
