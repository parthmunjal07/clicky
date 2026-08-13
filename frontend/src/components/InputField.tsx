import { motion } from 'motion/react';
import { useId } from 'react';

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  name?: string;
  spellCheck?: boolean;
}

export function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  autoComplete,
  name,
  spellCheck,
}: InputFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-sm font-700 uppercase tracking-wider"
        style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        name={name || autoComplete}
        spellCheck={spellCheck}
        className={`nbr-input ${error ? 'input-error' : ''}`}
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold"
          style={{ color: 'var(--accent-coral)' }}
          aria-live="polite"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
