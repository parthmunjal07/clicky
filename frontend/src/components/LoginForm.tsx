import { useState } from 'react';
import { motion } from 'motion/react';
import { InputField } from './InputField';
import { authApi } from '../lib/auth-api';
import { useAuthStore } from '../store/auth-store';
import { ApiError } from '../lib/api';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });
      setAuth(res.user, res.accessToken, res.refreshToken);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          const fieldErrors: Record<string, string> = {};
          for (const d of err.details) {
            fieldErrors[d.field] = d.message;
          }
          setErrors(fieldErrors);
        } else {
          setGlobalError(err.message);
        }
      } else {
        setGlobalError('Something went wrong. Please try again.');
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/*
        Form gap-4 (16px) between all direct children.
        No child carries mt-* or mb-* — all spacing sourced from this gap.
        Header text group is wrapped in its own nested flex-col gap-1
        for the tighter heading→subtitle relationship.
      */}
      <motion.form
        onSubmit={handleSubmit}
        animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4"
      >
        {/* Header — nested gap-1 so heading and subtitle are tighter than field spacing */}
        <div className="flex flex-col gap-1 pb-2">
          <h1
            className="nbr-display"
            style={{ fontSize: '2rem' }}
          >
            Welcome back
          </h1>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Log in to track your click speed
          </p>
        </div>

        {/* Global error — rendered only when present, slots into the gap-4 flow */}
        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="nbr-error-banner"
            aria-live="polite"
          >
            {globalError}
          </motion.div>
        )}

        <InputField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setErrors((prev) => ({ ...prev, email: '' }));
          }}
          error={errors.email}
          disabled={isSubmitting}
          autoComplete="email"
          spellCheck={false}
        />

        <InputField
          label="Password"
          type="password"
          name="password"
          placeholder="••••••••••"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={errors.password}
          disabled={isSubmitting}
          autoComplete="current-password"
        />

        {/* nbr-btn has a 4px hard shadow downward — gap-4 above ensures clearance */}
        <button
          type="submit"
          id="login-submit"
          disabled={isSubmitting}
          className="nbr-btn w-full flex items-center justify-center gap-3"
          style={{
            fontSize: '1rem',
            paddingTop: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {isSubmitting ? (
            <>
              <span className="nbr-spinner" />
              Logging in…
            </>
          ) : (
            'Log in'
          )}
        </button>

        {/* Footer link — no mt-*, gap-4 from above provides spacing */}
        <p
          className="text-center text-sm font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          No account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="nbr-link"
          >
            Create one
          </button>
        </p>
      </motion.form>
    </motion.div>
  );
}