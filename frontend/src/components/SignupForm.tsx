import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { InputField } from './InputField';
import { authApi } from '../lib/auth-api';
import { useAuthStore } from '../store/auth-store';
import { ApiError } from '../lib/api';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

/** Maps score (1–4) to accent tokens from the neobrutalism palette */
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Mapped to the neobrutalism accent palette
  if (score <= 1) return { score: 1, label: 'Weak',   color: 'var(--accent-coral)'  };
  if (score <= 2) return { score: 2, label: 'Fair',   color: 'var(--accent-yellow)' };
  if (score <= 3) return { score: 3, label: 'Good',   color: 'var(--accent-teal)'   };
  return           { score: 4, label: 'Strong', color: 'var(--accent-blue)'   };
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = 'Username is required';
    else if (username.length < 3)
      errs.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      errs.username = 'Only letters, numbers, and underscores';

    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Invalid email format';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 8)
      errs.password = 'Password must be at least 8 characters';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await authApi.signup({
        username: username.trim(),
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/*
        Form gap-4 (16px) between all direct children.
        No child carries mt-* or mb-* — all spacing sourced from this gap.
        Nested sub-groups use their own tighter gap when needed.
      */}
      <motion.form
        onSubmit={handleSubmit}
        animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4"
      >
        {/* Header — nested gap-1 for tight heading→subtitle, then pb-2 to breathe before first field */}
        <div className="flex flex-col gap-1 pb-2">
          <h1
            className="nbr-display"
            style={{ fontSize: '2rem' }}
          >
            Create your account
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Set up your details to start clicking
          </p>
        </div>

        {/* Global error — slots into the gap-4 flow when present */}
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
          label="Username"
          name="username"
          placeholder="coolclicker42"
          value={username}
          onChange={(v) => {
            setUsername(v);
            setErrors((prev) => ({ ...prev, username: '' }));
          }}
          error={errors.username}
          disabled={isSubmitting}
          autoComplete="username"
          spellCheck={false}
        />

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

        {/*
          Password + strength meter as a unit.
          Inner gap-2 separates the InputField from the strength bar row.
          No mt-* on the strength bar — gap-2 from this wrapper handles it.
        */}
        <div className="flex flex-col gap-2">
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
            autoComplete="new-password"
          />

          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3"
            >
              {/* Strength bar — 4 segments, hard borders, no blur */}
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-2 flex-1 transition-colors duration-200"
                    style={{
                      background: level <= strength.score ? strength.color : 'rgba(26, 26, 26, 0.1)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '3px',
                    }}
                  />
                ))}
              </div>
              <span
                className="text-xs font-700 uppercase tracking-wider"
                style={{ color: strength.color, minWidth: '3.5rem', letterSpacing: '0.08em' }}
              >
                {strength.label}
              </span>
            </motion.div>
          )}
        </div>

        {/* nbr-btn has 4px hard shadow — gap-4 from above provides clearance */}
        <button
          type="submit"
          id="signup-submit"
          disabled={isSubmitting}
          className="nbr-btn w-full flex items-center justify-center gap-3"
          style={{ fontSize: '1rem', paddingTop: '1rem', paddingBottom: '1rem' }}
        >
          {isSubmitting ? (
            <>
              <span className="nbr-spinner" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>

        {/* Footer link — no mt-*, gap-4 from above provides spacing */}
        <p className="text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="nbr-link"
          >
            Log in
          </button>
        </p>
      </motion.form>
    </motion.div>
  );
}
