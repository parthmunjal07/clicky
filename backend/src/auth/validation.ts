import { z } from 'zod';

// ─── Password Policy ────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

// ─── Schemas ────────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username may only contain letters, numbers, and underscores',
      ),
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must be at most 255 characters')
      .transform((e) => e.toLowerCase().trim()),
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .transform((e) => e.toLowerCase().trim()),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  })
  .strict();

// ─── Type Exports ───────────────────────────────────────────────────────────

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
