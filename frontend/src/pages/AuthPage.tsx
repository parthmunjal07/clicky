import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { SignupForm } from '../components/SignupForm';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AuthMode | null;
  const [mode, setMode] = useState<AuthMode>(tabParam === 'login' ? 'login' : 'signup');

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center relative nbr-dot-grid"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Auth card container — max-w-[480px], 24px horizontal padding on mobile */}
      <div className="relative z-10 w-full max-w  -[480px] px-6 sm:px-12 my-12">
        {/* Wordmark — mb-8 (32px) section gap before the card */}
        <div className="mb-8 flex items-center gap-3">
          <div
            className="nbr-card flex items-center justify-center"
            style={{
              width: '2.5rem',
              height: '2.5rem',
              background: 'var(--accent-coral)',
              borderRadius: '10px',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 3v8.5L10.5 9l2 4.5 1.5-.5-2-4.5L15 9V3H8Z"
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            className="nbr-display"
            style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}
          >
            Clicky
          </span>
        </div>

        {/* nbr-card shadow extends 4px right+down — card has enough clearance from viewport edge via px-6 */}
        <div className="nbr-card p-6">
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <LoginForm
                key="login"
                onSwitchToSignup={() => setMode('signup')}
              />
            ) : (
              <SignupForm
                key="signup"
                onSwitchToLogin={() => setMode('login')}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
